import { HttpRequest, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UserRole } from '../src/auth';
import { CORRELATION_ID_HEADER } from '../src/correlation';
import { ErrorCode } from '../src/errors';
import { createHandler } from '../src/handler';

describe('handler', () => {
  const SECRET = 'test-secret-key';
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
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  describe('basic functionality', () => {
    it('should handle simple request without config', async () => {
      const handler = createHandler(async (_request, _context, { correlationId }) => {
        return { status: 200, jsonBody: { message: 'success', correlationId } };
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.message).toBe('success');
      expect(response.jsonBody.correlationId).toBeTruthy();
    });

    it('should add correlation ID to response headers', async () => {
      const handler = createHandler(async () => ({ status: 200, jsonBody: {} }));

      const response = await handler(mockRequest, mockContext);

      const headers = response.headers as Record<string, string>;
      expect(headers[CORRELATION_ID_HEADER]).toBeTruthy();
    });

    it('should use provided correlation ID', async () => {
      const correlationId = 'test-correlation-123';
      mockRequest.headers.set(CORRELATION_ID_HEADER, correlationId);

      const handler = createHandler(async () => ({ status: 200, jsonBody: {} }));

      const response = await handler(mockRequest, mockContext);

      expect((response.headers as Record<string, string>)[CORRELATION_ID_HEADER]).toBe(correlationId);
    });
  });

  describe('logging', () => {
    it('should log when enabled', async () => {
      const handler = createHandler(async () => ({ status: 200, jsonBody: {} }), { enableLogging: true });

      await handler(mockRequest, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining('Started'));
      expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining('Completed'));
    });

    it('should not log when disabled', async () => {
      const handler = createHandler(async () => ({ status: 200, jsonBody: {} }));

      await handler(mockRequest, mockContext);

      const logCalls = (mockContext.log as any).mock.calls;
      const hasRequestLog = logCalls.some(
        (call: any[]) => call[0]?.includes('Started') || call[0]?.includes('Completed'),
      );
      expect(hasRequestLog).toBe(false);
    });
  });

  describe('request body validation', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).optional(),
    });

    it('should validate and parse valid body', async () => {
      const validBody = { name: 'John Doe', email: 'john@example.com', age: 30 };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (_request, _context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual(validBody);
    });

    it.each([
      { body: { name: '', email: 'test@example.com' }, description: 'empty name' },
      { body: { name: 'John', email: 'invalid-email' }, description: 'invalid email' },
      { body: { name: 'John' }, description: 'missing email' },
      { body: { email: 'test@example.com' }, description: 'missing name' },
      { body: {}, description: 'empty body' },
      { body: { name: 'John', email: 'test@example.com', age: -1 }, description: 'negative age' },
    ])('should return 422 for invalid body: $description', async ({ body }) => {
      (mockRequest.json as any).mockResolvedValue(body);

      const handler = createHandler(
        async (_request, _context, { body }) => {
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
        async (_request, _context, { body }) => {
          return { status: 200, jsonBody: { received: body } };
        },
        { bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error.code).toBe(ErrorCode.BAD_REQUEST);
    });
  });

  describe('query parameters validation', () => {
    const querySchema = z.object({
      page: z.string().regex(/^\d+$/),
      limit: z.string().optional(),
      sort: z.enum(['asc', 'desc']).optional(),
    });

    it('should validate and parse valid query parameters', async () => {
      mockRequest.query.set('page', '1');
      mockRequest.query.set('limit', '10');
      mockRequest.query.set('sort', 'asc');

      const handler = createHandler(
        async (_request, _context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual({ page: '1', limit: '10', sort: 'asc' });
    });

    it('should handle optional parameters', async () => {
      mockRequest.query.set('page', '1');

      const handler = createHandler(
        async (_request, _context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.received).toEqual({ page: '1' });
    });

    it.each([
      { page: 'invalid', description: 'non-numeric page' },
      { page: '', description: 'empty page' },
    ])('should return 422 for invalid query: $description', async ({ page }) => {
      mockRequest.query.set('page', page);

      const handler = createHandler(
        async (_request, _context, { query }) => {
          return { status: 200, jsonBody: { received: query } };
        },
        { querySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('JWT authentication', () => {
    it('should authenticate valid token', async () => {
      const payload = { sub: '123', email: 'test@example.com', role: UserRole.MEMBER };
      const token = jwt.sign(payload, SECRET);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (_request, _context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret: SECRET } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.user.sub).toBe('123');
      expect(response.jsonBody.user.email).toBe('test@example.com');
    });

    it.each([
      { auth: null, description: 'missing authorization header' },
      { auth: 'InvalidFormat', description: 'malformed authorization header' },
      { auth: 'Bearer invalid-token', description: 'invalid token' },
    ])('should return 401 for: $description', async ({ auth }) => {
      if (auth) {
        mockRequest.headers.set('authorization', auth);
      }

      const handler = createHandler(
        async (_request, _context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret: SECRET } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should return 401 for token with wrong secret', async () => {
      const token = jwt.sign({ sub: '123' }, 'wrong-secret');
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async (_request, _context, { user }) => {
          return { status: 200, jsonBody: { user } };
        },
        { jwtConfig: { secret: SECRET } },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
    });
  });

  describe('role-based authorization', () => {
    it.each([
      { userRole: UserRole.ADMIN, required: [UserRole.ADMIN], shouldPass: true },
      { userRole: UserRole.MEMBER, required: [UserRole.MEMBER], shouldPass: true },
      { userRole: UserRole.ADMIN, required: [UserRole.MEMBER], shouldPass: true }, // Admin has member access
      { userRole: UserRole.ADMIN, required: [UserRole.ADMIN, UserRole.MEMBER], shouldPass: true },
      { userRole: UserRole.MEMBER, required: [UserRole.ADMIN], shouldPass: false },
    ])('user=$userRole, required=$required, pass=$shouldPass', async ({ userRole, required, shouldPass }) => {
      const payload = { sub: '123', role: userRole };
      const token = jwt.sign(payload, SECRET);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async () => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret: SECRET }, requiredRoles: required },
      );

      const response = await handler(mockRequest, mockContext);

      if (shouldPass) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(403);
        expect(response.jsonBody.error.code).toBe(ErrorCode.FORBIDDEN);
      }
    });

    it('should return 403 for user with no role', async () => {
      const token = jwt.sign({ sub: '123' }, SECRET);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const handler = createHandler(
        async () => {
          return { status: 200, jsonBody: { message: 'authorized' } };
        },
        { jwtConfig: { secret: SECRET }, requiredRoles: [UserRole.ADMIN] },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(403);
    });
  });

  describe('error handling', () => {
    it('should handle AppError with details', async () => {
      const handler = createHandler(async () => {
        throw new (await import('../src/errors')).AppError(ErrorCode.NOT_FOUND, 'Resource not found', {
          resourceId: '123',
        });
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.jsonBody.error.message).toBe('Resource not found');
      expect(response.jsonBody.error.details).toEqual({ resourceId: '123' });
    });

    it('should handle unknown errors as 500', async () => {
      const handler = createHandler(async () => {
        throw new Error('Unexpected error');
      });

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should log errors', async () => {
      const handler = createHandler(async () => {
        throw new Error('Test error');
      });

      await handler(mockRequest, mockContext);

      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should include correlation ID in error response', async () => {
      const correlationId = 'error-correlation-123';
      mockRequest.headers.set(CORRELATION_ID_HEADER, correlationId);

      const handler = createHandler(async () => {
        throw new (await import('../src/errors')).AppError(ErrorCode.BAD_REQUEST, 'Bad request');
      });

      const response = await handler(mockRequest, mockContext);

      expect((response.headers as Record<string, string>)[CORRELATION_ID_HEADER]).toBe(correlationId);
    });
  });

  describe('combined configurations', () => {
    const bodySchema = z.object({
      name: z.string(),
      age: z.number().min(0),
    });

    it('should handle auth + validation + logging together', async () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      const token = jwt.sign(payload, SECRET);
      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const validBody = { name: 'John', age: 30 };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (_request, _context, { body, user }) => {
          return { status: 201, jsonBody: { user: user?.sub, data: body } };
        },
        {
          jwtConfig: { secret: SECRET },
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

    it('should fail on auth before validation', async () => {
      const validBody = { name: 'John', age: 30 };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = createHandler(
        async (_request, _context, { body }) => {
          return { status: 200, jsonBody: { data: body } };
        },
        { jwtConfig: { secret: SECRET }, bodySchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(mockRequest.json).not.toHaveBeenCalled();
    });
  });
});
