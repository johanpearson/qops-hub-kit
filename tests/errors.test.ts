import { describe, expect, it } from 'vitest';
import {
  AppError,
  ERROR_STATUS_MAP,
  ErrorCode,
  createForbiddenError,
  createNotFoundError,
  createUnauthorizedError,
  createValidationError,
} from '../src/errors';

describe('errors', () => {
  describe('AppError', () => {
    it('should create error with code and message', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Invalid input');

      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('AppError');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);

      expect(error.details).toEqual(details);
    });

    it('should map error codes to HTTP status codes', () => {
      const testCases = [
        { code: ErrorCode.BAD_REQUEST, expectedStatus: 400 },
        { code: ErrorCode.UNAUTHORIZED, expectedStatus: 401 },
        { code: ErrorCode.FORBIDDEN, expectedStatus: 403 },
        { code: ErrorCode.NOT_FOUND, expectedStatus: 404 },
        { code: ErrorCode.CONFLICT, expectedStatus: 409 },
        { code: ErrorCode.VALIDATION_ERROR, expectedStatus: 422 },
        { code: ErrorCode.INTERNAL_ERROR, expectedStatus: 500 },
      ];

      testCases.forEach(({ code, expectedStatus }) => {
        const error = new AppError(code, 'Test message');
        expect(error.statusCode).toBe(expectedStatus);
      });
    });

    it('should serialize to JSON without details', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found');
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Resource not found',
        },
      });
    });

    it('should serialize to JSON with details', () => {
      const details = { resourceId: '123' };
      const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found', details);
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Resource not found',
          details,
        },
      });
    });
  });

  describe('error factory functions', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid data', { field: 'name' });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid data');
      expect(error.details).toEqual({ field: 'name' });
      expect(error.statusCode).toBe(422);
    });

    it('should create unauthorized error with default message', () => {
      const error = createUnauthorizedError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should create unauthorized error with custom message', () => {
      const error = createUnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });

    it('should create forbidden error with default message', () => {
      const error = createForbiddenError();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });

    it('should create forbidden error with custom message', () => {
      const error = createForbiddenError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
    });

    it('should create not found error with default message', () => {
      const error = createNotFoundError();

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create not found error with custom message', () => {
      const error = createNotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });
  });

  describe('ERROR_STATUS_MAP', () => {
    it('should contain all error codes', () => {
      const errorCodes = Object.values(ErrorCode);
      const mappedCodes = Object.keys(ERROR_STATUS_MAP);

      expect(mappedCodes).toHaveLength(errorCodes.length);
      errorCodes.forEach((code) => {
        expect(ERROR_STATUS_MAP[code as ErrorCode]).toBeDefined();
      });
    });
  });
});
