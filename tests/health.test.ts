import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHealthHandler, healthCheckResponseSchema } from '../src/health';
import { HttpRequest, InvocationContext } from '@azure/functions';

describe('health', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:7071/api/health',
      headers: new Headers(),
      query: new URLSearchParams(),
    } as HttpRequest;

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

  describe('createHealthHandler', () => {
    it('should return healthy status', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toHaveProperty('status', 'healthy');
    });

    it('should include timestamp in ISO 8601 format', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.jsonBody).toHaveProperty('timestamp');
      const timestamp = response.jsonBody.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include uptime in seconds', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.jsonBody).toHaveProperty('uptime');
      expect(typeof response.jsonBody.uptime).toBe('number');
      expect(response.jsonBody.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include correlation ID header', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.headers).toHaveProperty('x-correlation-id');
      expect(typeof response.headers['x-correlation-id']).toBe('string');
    });

    it('should use provided correlation ID from request', async () => {
      const correlationId = 'test-correlation-id';
      mockRequest.headers.set('x-correlation-id', correlationId);

      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });

    it('should have correct content type', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should return response structure matching HealthCheckResponse interface', async () => {
      const handler = createHealthHandler();
      const response = await handler(mockRequest, mockContext);

      expect(response.jsonBody).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('healthCheckResponseSchema', () => {
    it('should validate a valid health check response', () => {
      const validResponse = {
        status: 'healthy',
        timestamp: '2024-01-08T19:00:00.000Z',
        uptime: 123.45,
      };

      const result = healthCheckResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidResponse = {
        status: 'unhealthy',
        timestamp: '2024-01-08T19:00:00.000Z',
        uptime: 123.45,
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const invalidResponse = {
        status: 'healthy',
        timestamp: '2024-01-08T19:00:00.000Z',
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject invalid types', () => {
      const invalidResponse = {
        status: 'healthy',
        timestamp: '2024-01-08T19:00:00.000Z',
        uptime: '123.45', // Should be number
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});
