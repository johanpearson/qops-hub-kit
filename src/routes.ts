import { z } from 'zod';
import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import { createHandler, HandlerConfig, ParsedRequest } from './handler';
import { OpenApiBuilder, RouteDefinition, HttpMethod } from './openapi';
import { UserRole } from './auth';

/**
 * Route handler function type - simplified handler that receives parsed data
 */
export type RouteHandler<TBody = any, TQuery = any> = (
  request: HttpRequest,
  context: InvocationContext,
  data: ParsedRequest & { body: TBody; query: TQuery }
) => Promise<HttpResponseInit>;

/**
 * Service function type - pure business logic
 */
export type ServiceFunction<TInput, TOutput> = (
  input: TInput,
  userId?: string
) => Promise<TOutput> | TOutput;

/**
 * Route configuration with schema and handler
 */
export interface Route<TBody = any, TQuery = any> {
  /**
   * HTTP method
   */
  method: HttpMethod;
  /**
   * Route path
   */
  path: string;
  /**
   * Summary for OpenAPI
   */
  summary: string;
  /**
   * Description for OpenAPI
   */
  description?: string;
  /**
   * Tags for OpenAPI grouping
   */
  tags?: string[];
  /**
   * Request body schema
   */
  bodySchema?: z.ZodType<TBody>;
  /**
   * Query parameters schema
   */
  querySchema?: z.ZodObject<any>;
  /**
   * Response schema for success (200/201)
   */
  responseSchema?: z.ZodTypeAny;
  /**
   * Success status code (default: 200)
   */
  successStatus?: number;
  /**
   * Whether authentication is required
   */
  requiresAuth?: boolean;
  /**
   * Required roles
   */
  requiredRoles?: UserRole[];
  /**
   * Route handler function
   */
  handler: RouteHandler<TBody, TQuery>;
}

/**
 * Route builder for easy route definition
 */
export class RouteBuilder {
  private routes: Map<string, Route> = new Map();
  private openApiBuilder?: OpenApiBuilder;

  /**
   * Create a route builder
   * 
   * @param openApiBuilder - Optional OpenAPI builder for automatic documentation
   */
  constructor(openApiBuilder?: OpenApiBuilder) {
    this.openApiBuilder = openApiBuilder;
  }

  /**
   * Define a route with schema and handler
   * 
   * @param route - Route configuration
   * @returns The route builder for chaining
   * 
   * @example
   * ```typescript
   * const builder = new RouteBuilder(openApiBuilder);
   * 
   * builder.route({
   *   method: 'POST',
   *   path: '/api/users',
   *   summary: 'Create user',
   *   bodySchema: createUserSchema,
   *   responseSchema: userResponseSchema,
   *   requiresAuth: true,
   *   requiredRoles: [UserRole.ADMIN],
   *   handler: async (req, ctx, { body, user }) => {
   *     const newUser = await createUser(body, user?.sub);
   *     return { status: 201, jsonBody: newUser };
   *   },
   * });
   * ```
   */
  route<TBody = any, TQuery = any>(route: Route<TBody, TQuery>): this {
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);

    // Auto-register with OpenAPI if builder is provided
    if (this.openApiBuilder) {
      this.registerOpenApi(route);
    }

    return this;
  }

  /**
   * Get a route by method and path
   * 
   * @param method - HTTP method
   * @param path - Route path
   * @returns The route or undefined
   */
  getRoute(method: HttpMethod, path: string): Route | undefined {
    return this.routes.get(`${method}:${path}`);
  }

  /**
   * Get all routes
   * 
   * @returns Array of all routes
   */
  getAllRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  /**
   * Create an Azure Function handler from a route
   * 
   * @param route - Route configuration
   * @returns Azure Function handler
   */
  createAzureHandler<TBody = any, TQuery = any>(
    route: Route<TBody, TQuery>
  ) {
    const config: HandlerConfig = {
      bodySchema: route.bodySchema,
      querySchema: route.querySchema,
      enableLogging: true,
    };

    if (route.requiresAuth && process.env.JWT_SECRET) {
      config.jwtConfig = {
        secret: process.env.JWT_SECRET,
      };
    }

    if (route.requiredRoles) {
      config.requiredRoles = route.requiredRoles;
    }

    return createHandler(route.handler as any, config);
  }

  /**
   * Register route with OpenAPI builder
   */
  private registerOpenApi(route: Route): void {
    if (!this.openApiBuilder) {
      return;
    }

    const responses: RouteDefinition['responses'] = {};

    // Success response
    const successStatus = route.successStatus || (route.method === 'POST' ? 201 : 200);
    responses[successStatus] = {
      description: 'Success',
      schema: route.responseSchema,
    };

    // Common error responses
    if (route.requiresAuth) {
      responses[401] = {
        description: 'Unauthorized - Authentication required',
      };
      if (route.requiredRoles && route.requiredRoles.length > 0) {
        responses[403] = {
          description: 'Forbidden - Insufficient permissions',
        };
      }
    }

    if (route.bodySchema) {
      responses[422] = {
        description: 'Validation error',
      };
    }

    this.openApiBuilder.registerRoute({
      method: route.method,
      path: route.path,
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      requestBody: route.bodySchema,
      queryParams: route.querySchema,
      responses,
      requiresAuth: route.requiresAuth,
    });
  }
}

/**
 * Create a service wrapper that handles errors consistently
 * 
 * @param serviceFn - Service function
 * @returns Wrapped service function
 * 
 * @example
 * ```typescript
 * export const createUser = createService(async (input: CreateUserInput, userId?: string) => {
 *   if (await userExists(input.email)) {
 *     throw new AppError(ErrorCode.CONFLICT, 'User already exists');
 *   }
 *   return await saveUser(input);
 * });
 * ```
 */
export function createService<TInput, TOutput>(
  serviceFn: ServiceFunction<TInput, TOutput>
): ServiceFunction<TInput, TOutput> {
  return async (input: TInput, userId?: string) => {
    return await serviceFn(input, userId);
  };
}

/**
 * Helper to create a simple route handler from a service function
 * 
 * @param serviceFn - Service function
 * @param options - Options for the handler
 * @returns Route handler
 * 
 * @example
 * ```typescript
 * builder.route({
 *   method: 'POST',
 *   path: '/api/users',
 *   bodySchema: createUserSchema,
 *   handler: createRouteHandler(createUserService, {
 *     successStatus: 201,
 *     passUser: true,
 *   }),
 * });
 * ```
 */
export function createRouteHandler<TInput, TOutput>(
  serviceFn: ServiceFunction<TInput, TOutput>,
  options: {
    successStatus?: number;
    passUser?: boolean;
  } = {}
): RouteHandler<TInput, any> {
  return async (request, context, { body, user }) => {
    const userId = options.passUser ? user?.sub : undefined;
    const result = await serviceFn(body, userId);
    
    return {
      status: options.successStatus || 200,
      jsonBody: result,
    };
  };
}
