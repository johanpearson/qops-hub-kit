/**
 * @qops/hub-kit - Azure Function v4 Utility Package
 *
 * A comprehensive utility package for building Azure Function v4 APIs with TypeScript.
 * Features include OpenAPI documentation, JWT authentication, error handling, and correlation IDs.
 *
 * @packageDocumentation
 */

// Core handler
export { createHandler, HandlerConfig, HandlerFunction, ParsedRequest } from './handler';

// Route builder (service/route pattern)
export { RouteBuilder, Route, RouteHandler, ServiceFunction, createRouteHandler } from './routes';

// Error handling
export {
  AppError,
  ErrorCode,
  ERROR_STATUS_MAP,
  createValidationError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
} from './errors';

// Authentication
export {
  UserRole,
  JwtPayload,
  JwtConfig,
  extractBearerToken,
  verifyToken,
  verifyRole,
  getAuthUser,
  setAuthUser,
} from './auth';

// Correlation ID
export {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
  addCorrelationIdToContext,
  getCorrelationId,
} from './correlation';

// OpenAPI documentation
export { OpenApiBuilder, OpenApiConfig, RouteDefinition, HttpMethod, z } from './openapi';
