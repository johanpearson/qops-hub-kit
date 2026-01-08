import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { z } from 'zod';
import { AppError, ErrorCode, ErrorStatusMap } from './errors';
import {
  getOrCreateCorrelationId,
  addCorrelationIdToContext,
  getCorrelationId,
  CORRELATION_ID_HEADER,
} from './correlation';
import {
  extractBearerToken,
  verifyToken,
  verifyRole,
  setAuthUser,
  JwtConfig,
  UserRole,
  JwtPayload,
} from './auth';

/**
 * Handler function type
 */
export type HandlerFunction = (
  request: HttpRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

/**
 * Handler configuration
 */
export interface HandlerConfig {
  /**
   * JWT configuration (if auth is required)
   */
  jwtConfig?: JwtConfig;
  /**
   * Required roles for this handler
   */
  requiredRoles?: UserRole[];
  /**
   * Request body validation schema
   */
  bodySchema?: z.ZodTypeAny;
  /**
   * Query parameters validation schema
   */
  querySchema?: z.ZodObject<any>;
  /**
   * Enable request/response logging
   */
  enableLogging?: boolean;
}

/**
 * Parsed and validated request data
 */
export interface ParsedRequest {
  /**
   * Parsed request body (if validated)
   */
  body?: any;
  /**
   * Parsed query parameters (if validated)
   */
  query?: any;
  /**
   * Authenticated user (if auth is enabled)
   */
  user?: JwtPayload;
  /**
   * Correlation ID
   */
  correlationId: string;
}

/**
 * Create a response with correlation ID header
 * 
 * @param context - The invocation context
 * @param response - The response object
 * @returns Response with correlation ID header
 */
function addCorrelationHeader(
  context: InvocationContext,
  response: HttpResponseInit
): HttpResponseInit {
  const correlationId = getCorrelationId(context);
  if (!correlationId) {
    return response;
  }

  return {
    ...response,
    headers: {
      ...response.headers,
      [CORRELATION_ID_HEADER]: correlationId,
    },
  };
}

/**
 * Handle errors and convert to HTTP response
 * 
 * @param error - The error
 * @param context - The invocation context
 * @returns HTTP response
 */
function handleError(
  error: unknown,
  context: InvocationContext
): HttpResponseInit {
  const correlationId = getCorrelationId(context);
  context.error(`Error occurred (correlationId: ${correlationId}):`, error);

  if (error instanceof AppError) {
    return addCorrelationHeader(context, {
      status: error.statusCode,
      jsonBody: error.toJSON(),
    });
  }

  if (error instanceof z.ZodError) {
    return addCorrelationHeader(context, {
      status: 422,
      jsonBody: {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: error.errors,
        },
      },
    });
  }

  // Unknown error - return 500
  return addCorrelationHeader(context, {
    status: 500,
    jsonBody: {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    },
  });
}

/**
 * Create an Azure Function handler with built-in middleware
 * 
 * This wrapper provides:
 * - Correlation ID generation and tracking
 * - JWT verification and role-based authorization
 * - Request validation using Zod schemas
 * - Error handling with consistent error responses
 * - Request/response logging
 * 
 * @param handler - The handler function
 * @param config - Handler configuration
 * @returns Azure Function handler
 * 
 * @example
 * ```typescript
 * import { createHandler, z, UserRole } from '@qops/hub-kit';
 * 
 * const bodySchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 * 
 * export default createHandler(
 *   async (request, context) => {
 *     const { body, user } = request.parsedData;
 *     
 *     return {
 *       status: 200,
 *       jsonBody: { message: 'Success', data: body },
 *     };
 *   },
 *   {
 *     jwtConfig: { secret: process.env.JWT_SECRET! },
 *     requiredRoles: [UserRole.MEMBER],
 *     bodySchema,
 *   }
 * );
 * ```
 */
export function createHandler(
  handler: (
    request: HttpRequest,
    context: InvocationContext,
    parsedData: ParsedRequest
  ) => Promise<HttpResponseInit>,
  config: HandlerConfig = {}
): HandlerFunction {
  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      // 1. Correlation ID
      const correlationId = getOrCreateCorrelationId(request, context);
      addCorrelationIdToContext(context, correlationId);

      if (config.enableLogging) {
        context.log(
          `[${correlationId}] ${request.method} ${request.url} - Started`
        );
      }

      const parsedData: ParsedRequest = { correlationId };

      // 2. JWT verification and authorization
      if (config.jwtConfig) {
        const token = extractBearerToken(request);
        if (!token) {
          throw new AppError(
            ErrorCode.UNAUTHORIZED,
            'Missing authorization header'
          );
        }

        const user = verifyToken(token, config.jwtConfig);
        setAuthUser(context, user);
        parsedData.user = user;

        // Check roles if required
        if (config.requiredRoles && config.requiredRoles.length > 0) {
          verifyRole(user, config.requiredRoles);
        }
      }

      // 3. Request validation
      if (config.bodySchema) {
        const body = await request.json().catch(() => ({}));
        parsedData.body = config.bodySchema.parse(body);
      }

      if (config.querySchema) {
        const queryParams: Record<string, string> = {};
        request.query.forEach((value, key) => {
          queryParams[key] = value;
        });
        parsedData.query = config.querySchema.parse(queryParams);
      }

      // 4. Call handler
      const response = await handler(request, context, parsedData);

      if (config.enableLogging) {
        context.log(
          `[${correlationId}] ${request.method} ${request.url} - Completed ${response.status}`
        );
      }

      // 5. Add correlation header to response
      return addCorrelationHeader(context, response);
    } catch (error) {
      return handleError(error, context);
    }
  };
}
