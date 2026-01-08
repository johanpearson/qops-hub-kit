/**
 * Core error types for consistent error handling across Azure Functions
 */

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Map error codes to HTTP status codes
 */
export const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 422,
};

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Get HTTP status code for this error
   */
  get statusCode(): number {
    return ErrorStatusMap[this.code];
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    const result: any = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    
    if (this.details) {
      result.error.details = this.details;
    }
    
    return result;
  }
}

/**
 * Create a validation error
 */
export function createValidationError(message: string, details?: unknown): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
}

/**
 * Create an unauthorized error
 */
export function createUnauthorizedError(message = 'Unauthorized'): AppError {
  return new AppError(ErrorCode.UNAUTHORIZED, message);
}

/**
 * Create a forbidden error
 */
export function createForbiddenError(message = 'Forbidden'): AppError {
  return new AppError(ErrorCode.FORBIDDEN, message);
}

/**
 * Create a not found error
 */
export function createNotFoundError(message = 'Resource not found'): AppError {
  return new AppError(ErrorCode.NOT_FOUND, message);
}
