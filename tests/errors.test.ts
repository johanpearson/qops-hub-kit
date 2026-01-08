import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode, ERROR_STATUS_MAP, createValidationError, createUnauthorizedError } from '../src/errors';

describe('errors', () => {
  describe('AppError', () => {
    it('should create an error with code and message', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('should include details if provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);
      expect(error.details).toEqual(details);
    });

    it('should convert to JSON format', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Bad request');
      const json = error.toJSON();
      expect(json).toEqual({
        error: {
          code: ErrorCode.BAD_REQUEST,
          message: 'Bad request',
        },
      });
    });

    it('should include details in JSON if present', () => {
      const details = { foo: 'bar' };
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Error', details);
      const json = error.toJSON();
      expect(json.error.details).toEqual(details);
    });
  });

  describe('ERROR_STATUS_MAP', () => {
    it('should map error codes to correct HTTP status codes', () => {
      expect(ERROR_STATUS_MAP[ErrorCode.BAD_REQUEST]).toBe(400);
      expect(ERROR_STATUS_MAP[ErrorCode.UNAUTHORIZED]).toBe(401);
      expect(ERROR_STATUS_MAP[ErrorCode.FORBIDDEN]).toBe(403);
      expect(ERROR_STATUS_MAP[ErrorCode.NOT_FOUND]).toBe(404);
      expect(ERROR_STATUS_MAP[ErrorCode.CONFLICT]).toBe(409);
      expect(ERROR_STATUS_MAP[ErrorCode.VALIDATION_ERROR]).toBe(422);
      expect(ERROR_STATUS_MAP[ErrorCode.INTERNAL_ERROR]).toBe(500);
    });
  });

  describe('helper functions', () => {
    it('createValidationError should create validation error', () => {
      const error = createValidationError('Invalid input', { field: 'email' });
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('createUnauthorizedError should create unauthorized error', () => {
      const error = createUnauthorizedError();
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('createUnauthorizedError should accept custom message', () => {
      const error = createUnauthorizedError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });
});
