import { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CORRELATION_ID_HEADER } from '../src/correlation';
import { createHealthHandler, healthCheckResponseSchema } from '../src/health';

describe('health', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:7071/api/health',
      headers: new Headers(),
    } as HttpRequest;

    mockContext = {
      log: vi.fn(),
    } as unknown as InvocationContext;
  });

  describe('createHealthHandler', () => {
    it('should return healthy status', async () => {
      const handler = createHealthHandler();

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toHaveProperty('status', 'healthy');
      expect(response.jsonBody).toHaveProperty('timestamp');
      expect(response.jsonBody).toHaveProperty('uptime');
    });

    it('should return valid timestamp', async () => {
      const handler = createHealthHandler();
      const before = new Date();

      const response = await handler(mockRequest, mockContext);
      const after = new Date();

      const timestamp = new Date(response.jsonBody.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return process uptime', async () => {
      const handler = createHealthHandler();

      const response = await handler(mockRequest, mockContext);

      expect(response.jsonBody.uptime).toBeGreaterThan(0);
      expect(typeof response.jsonBody.uptime).toBe('number');
    });

    it('should include correlation ID header', async () => {
      const handler = createHealthHandler();

      const response = await handler(mockRequest, mockContext);

      expect(response.headers).toHaveProperty(CORRELATION_ID_HEADER);
      expect(typeof (response.headers as Record<string, string>)[CORRELATION_ID_HEADER]).toBe('string');
    });

    it('should use provided correlation ID', async () => {
      const correlationId = 'test-health-correlation';
      mockRequest.headers.set(CORRELATION_ID_HEADER, correlationId);
      const handler = createHealthHandler();

      const response = await handler(mockRequest, mockContext);

      expect((response.headers as Record<string, string>)[CORRELATION_ID_HEADER]).toBe(correlationId);
    });

    it('should set content-type header', async () => {
      const handler = createHealthHandler();

      const response = await handler(mockRequest, mockContext);

      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('healthCheckResponseSchema', () => {
    it('should validate correct health response', () => {
      const validResponse = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 123.45,
      };

      const result = healthCheckResponseSchema.safeParse(validResponse);

      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 123.45,
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const invalidResponse = {
        status: 'healthy',
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp type', () => {
      const invalidResponse = {
        status: 'healthy',
        timestamp: 123456,
        uptime: 123.45,
      };

      const result = healthCheckResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });
  });
});
