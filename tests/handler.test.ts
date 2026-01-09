import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { createHandler } from '../src/handler';
import { UserRole } from '../src/auth';
import { AppError, ErrorCode } from '../src/errors';

describe('handler', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: 'http://localhost:7071/api/test',
      headers: new Headers(),
      query: new URLSearchParams(),
      json: vi.fn(),
    } as unknown as HttpRequest;

    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  describe('createHandler - basic functionality', () => {
    it('should handle simple request without config', async () => {
      const handler = createHandler(async (request, context, parsedData) => {
        return {
          status: 200,
          jsonBody: { message: 'success', correlationId: parsedData.correlationId },
        };
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toHaveProperty('message', 'success');
      expect(response.headers).toHaveProperty('x-correlation-id');
    });

    it('should add correlation ID to response headers', async () => {
      const handler = createHandler(async () => {
        return { status: 200, jsonBody: { message: 'success' } };
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.headers).toHaveProperty('x-correlation-id');
      expect(typeof response.headers['x-correlation-id']).toBe('string');
    });

    it('should use provided correlation ID from request', async () => {
      const correlationId = 'test-correlation-123';
      mockRequest.headers.set('x-correlation-id', correlationId);

      const handler = createHandler(async () => {
        return { status: 200, jsonBody: { message: 'success' } };
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });

  describe('createHandler - logging', () => {
    it('should log requests when enableLogging is true', async () => {
      const handler = createHandler(
        async () => {
          return { status: 200, jsonBody: { message: 'success' } };
        },
        { enableLogging: true },
      );

      await handler(mockRequest, mockContext);

      // Should log both correlation ID and request/response
      expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining('Started'));
      expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining('Completed'));
    });

    it('should not log request/response when enableLogging is false', async () => {
      const handler = createHandler(async () => {
        return { status: 200, jsonBody: { message: 'success' } };
      });

      await handler(mockRequest, mockContext);

      // Correlation ID may be logged, but request/response should not be
      const logCalls = (mockContext.log as any).mock.calls;
      const hasRequestLog = logCalls.some(
        (call: any[]) => call[0]?.includes('Started') || call[0]?.includes('Completed'),
      );
      expect(hasRequestLog).toBe(false);
    });
  });

  describe('createHandler - request body validation', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    it('should validate and parse valid request body', async () => {
      const validBody = { name: 'John Doe', email: 'john@example.com' };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual(validBody);
    });

    it('should return 422 for invalid request body', async () => {
      const invalidBody = { name: '', email: 'not-an-email' };
      (mockRequest.json as any).mockResolvedValue(invalidBody);

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.jsonBody.error.details).toBeDefined();
    });

    it('should return 400 for invalid JSON', async () => {
      (mockRequest.json as any).mockRejectedValue(new Error('Invalid JSON'));

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(response.jsonBody.error.message).toContain('Invalid JSON');
    });

    it('should handle missing fields in request body', async () => {
      const incompleteBody = { name: 'John' }; // missing email
      (mockRequest.json as any).mockResolvedValue(incompleteBody);

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle empty request body', async () => {
      (mockRequest.json as any).mockResolvedValue({});

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
    });
  });

  describe('createHandler - query parameters validation', () => {
    const querySchema = z.object({
      page: z.string().regex(/^\d+$/),
      limit: z.string().optional(),
    });

    it('should validate and parse valid query parameters', async () => {
      mockRequest.query.set('page', '1');
      mockRequest.query.set('limit', '10');

      const handler = createHandler(
        async (request, context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual({ page: '1', limit: '10' });
    });

    it('should return 422 for invalid query parameters', async () => {
      mockRequest.query.set('page', 'invalid');

      const handler = createHandler(
        async (request, context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle missing optional query parameters', async () => {
      mockRequest.query.set('page', '1');

      const handler = createHandler(
        async (request, context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual({ page: '1' });
    });
  });

  describe('createHandler - JWT authentication', () => {
    const secret = 'test-secret-key';

    it('should authenticate valid JWT token', async () => {
      const payload = { sub: '123', email: 'test@example.com', role: UserRole.MEMBER };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.user.sub).toBe('123');
      expect(response.jsonBody.user.email).toBe('test@example.com');
    });

    it('should return 401 for missing authorization header', async () => {
      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(response.jsonBody.error.message).toContain('Missing authorization header');
    });

    it('should return 401 for invalid JWT token', async () => {
      mockRequest.headers.set('authorization', 'Bearer invalid-token');

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(response.jsonBody.error.message).toContain('Invalid token');
    });

    it('should return 401 for malformed authorization header', async () => {
      mockRequest.headers.set('authorization', 'InvalidFormat');

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should return 401 for token with wrong secret', async () => {
      const token = jwt.sign({ sub: '123' }, 'wrong-secret');
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('createHandler - role-based authorization', () => {
    const secret = 'test-secret-key';

    it('should allow access for user with required role', async () => {
      const payload = { sub: '123', role: UserRole.ADMIN };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret }, requiredRoles: [UserRole.ADMIN] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.message).toBe('authorized');
    });

    it('should allow access for user with one of multiple required roles', async () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret }, requiredRoles: [UserRole.ADMIN, UserRole.MEMBER] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
    });

    it('should return 403 for user without required role', async () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret }, requiredRoles: [UserRole.ADMIN] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(response.jsonBody.error.message).toContain('Required role not found');
    });

    it('should return 403 for user with no roles', async () => {
      const payload = { sub: '123' }; // No roles field
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret }, requiredRoles: [UserRole.ADMIN] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(403);
      expect(response.jsonBody.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('should return 403 for user with no role', async () => {
      const payload = { sub: '123' };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (request, context, { user }) => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret }, requiredRoles: [UserRole.ADMIN] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(403);
    });
  });

  describe('createHandler - error handling', () => {
    it('should handle AppError thrown by handler', async () => {
      const handler = createHandler(async () => {
        throw new AppError(ErrorCode.NOT_FOUND, 'Resource not found', { resourceId: '123' });
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.jsonBody.error.message).toBe('Resource not found');
      expect(response.jsonBody.error.details).toEqual({ resourceId: '123' });
    });

    it('should handle unknown errors', async () => {
      const handler = createHandler(async () => {
        throw new Error('Unexpected error');
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(response.jsonBody.error.message).toBe('Internal server error');
    });

    it('should log errors to context', async () => {
      const handler = createHandler(async () => {
        throw new Error('Test error');
      });

      await handler(mockRequest, mockContext);

      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should include correlation ID in error response', async () => {
      const correlationId = 'error-correlation-123';
      mockRequest.headers.set('x-correlation-id', correlationId);

      const handler = createHandler(async () => {
        throw new AppError(ErrorCode.BAD_REQUEST, 'Bad request');
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });

  describe('createHandler - combined configurations', () => {
    const secret = 'test-secret-key';
    const bodySchema = z.object({
      name: z.string(),
      age: z.number().min(0),
    });

    it('should handle auth + validation + logging together', async () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      const token = jwt.sign(payload, secret);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const validBody = { name: 'John', age: 30 };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (request, context, { body, user }) => {
          return {
            status: 201,
            jsonBody: {
              user: user?.sub,
              data: body,
            },
          };
        },
        {
          jwtConfig: { secret },
          requiredRoles: [UserRole.MEMBER],
          bodySchema,
          enableLogging: true,
        },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.user).toBe('123');
      expect(response.jsonBody.data).toEqual(validBody);
      expect(mockContext.log).toHaveBeenCalled();
    });

    it('should fail early on auth before validation', async () => {
      // No auth header, but valid body
      const validBody = { name: 'John', age: 30 };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (request, context, { body, user }) => {
          return { status: 200, jsonBody: { data: body } };
        },
        {
          jwtConfig: { secret },
          bodySchema,
        },
      );

      const response = await handler(mockRequest, mockContext);

      // Should fail with 401 (auth) before attempting validation
      expect(response.status).toBe(401);
      expect(mockRequest.json).not.toHaveBeenCalled();
    });
  });

  describe('createHandler - edge cases', () => {
    it('should handle null values in response', async () => {
      const handler = createHandler(async () => {
        return { status: 200, jsonBody: { value: null } };
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.value).toBeNull();
    });

    it('should handle empty arrays in validation', async () => {
      const schema = z.object({
        items: z.array(z.string()),
      });
      (mockRequest.json as any).mockResolvedValue({ items: [] });

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema: schema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received.items).toEqual([]);
    });

    it('should handle undefined optional fields', async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      (mockRequest.json as any).mockResolvedValue({ required: 'value' });

      const handler = createHandler(
        async (request, context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema: schema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received.optional).toBeUndefined();
    });
  });
});
