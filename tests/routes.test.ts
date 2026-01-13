import { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UserRole } from '../src/auth';
import { OpenApiBuilder } from '../src/openapi';
import { createRouteHandler, Route, RouteBuilder } from '../src/routes';

describe('routes', () => {
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
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  describe('RouteBuilder', () => {
    it('should create route builder without OpenAPI', () => {
      const builder = new RouteBuilder();

      expect(builder).toBeDefined();
    });

    it('should create route builder with OpenAPI', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      expect(builder).toBeDefined();
    });

    it('should register route', () => {
      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        handler: async () => ({ status: 200, jsonBody: {} }),
      };

      builder.route(route);

      const retrieved = builder.getRoute('GET', '/api/test');
      expect(retrieved).toBe(route);
    });

    it('should return undefined for non-existent route', () => {
      const builder = new RouteBuilder();

      const retrieved = builder.getRoute('GET', '/api/nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('should support method chaining', () => {
      const builder = new RouteBuilder();

      const result = builder
        .route({
          method: 'GET',
          path: '/api/test1',
          summary: 'Test 1',
          handler: async () => ({ status: 200, jsonBody: {} }),
        })
        .route({
          method: 'POST',
          path: '/api/test2',
          summary: 'Test 2',
          handler: async () => ({ status: 201, jsonBody: {} }),
        });

      expect(result).toBe(builder);
      expect(builder.getAllRoutes()).toHaveLength(2);
    });

    it('should get all routes', () => {
      const builder = new RouteBuilder();

      builder
        .route({
          method: 'GET',
          path: '/api/users',
          summary: 'List users',
          handler: async () => ({ status: 200, jsonBody: [] }),
        })
        .route({
          method: 'POST',
          path: '/api/users',
          summary: 'Create user',
          handler: async () => ({ status: 201, jsonBody: {} }),
        })
        .route({
          method: 'GET',
          path: '/api/posts',
          summary: 'List posts',
          handler: async () => ({ status: 200, jsonBody: [] }),
        });

      const routes = builder.getAllRoutes();

      expect(routes).toHaveLength(3);
      expect(routes.map((r) => `${r.method}:${r.path}`)).toEqual([
        'GET:/api/users',
        'POST:/api/users',
        'GET:/api/posts',
      ]);
    });

    it('should distinguish routes by method and path', () => {
      const builder = new RouteBuilder();

      const getRoute: Route = {
        method: 'GET',
        path: '/api/users',
        summary: 'Get users',
        handler: async () => ({ status: 200, jsonBody: [] }),
      };

      const postRoute: Route = {
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        handler: async () => ({ status: 201, jsonBody: {} }),
      };

      builder.route(getRoute).route(postRoute);

      expect(builder.getRoute('GET', '/api/users')).toBe(getRoute);
      expect(builder.getRoute('POST', '/api/users')).toBe(postRoute);
    });

    it('should create Azure handler with basic config', async () => {
      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        handler: async (_request, _context, { correlationId }) => ({
          status: 200,
          jsonBody: { message: 'success', correlationId },
        }),
      };

      const handler = builder.createAzureHandler(route);
      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.message).toBe('success');
    });

    it('should create Azure handler with body schema', async () => {
      const builder = new RouteBuilder();

      const bodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const route: Route = {
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        bodySchema,
        handler: async (_request, _context, { body }) => ({
          status: 201,
          jsonBody: { user: body },
        }),
      };

      const validBody = { name: 'John', email: 'john@example.com' };
      (mockRequest.json as any).mockResolvedValue(validBody);

      const handler = builder.createAzureHandler(route);
      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.user).toEqual(validBody);
    });

    it('should auto-register route with OpenAPI builder', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        description: 'Test description',
        tags: ['Test'],
        handler: async () => ({ status: 200, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/test'].get).toBeDefined();
      expect(doc.paths['/api/test'].get.summary).toBe('Test endpoint');
      expect(doc.paths['/api/test'].get.tags).toEqual(['Test']);
    });

    it('should register route with response schema in OpenAPI', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      const responseSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      builder.route({
        method: 'GET',
        path: '/api/user',
        summary: 'Get user',
        responseSchema,
        handler: async () => ({ status: 200, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/user'].get.responses['200']).toBeDefined();
    });

    it('should add auth responses to OpenAPI when auth is required', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'GET',
        path: '/api/protected',
        summary: 'Protected endpoint',
        requiresAuth: true,
        requiredRoles: [UserRole.ADMIN],
        handler: async () => ({ status: 200, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/protected'].get.responses['401']).toBeDefined();
      expect(doc.paths['/api/protected'].get.responses['403']).toBeDefined();
    });

    it('should add 401 but not 403 when auth required without specific roles', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'GET',
        path: '/api/protected',
        summary: 'Protected endpoint',
        requiresAuth: true,
        handler: async () => ({ status: 200, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/protected'].get.responses['401']).toBeDefined();
      expect(doc.paths['/api/protected'].get.responses['403']).toBeUndefined();
    });

    it('should add validation error response when bodySchema is provided', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'POST',
        path: '/api/data',
        summary: 'Submit data',
        bodySchema: z.object({ value: z.string() }),
        handler: async () => ({ status: 200, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/data'].post.responses['422']).toBeDefined();
    });

    it('should create handler without JWT config when JWT_SECRET is not set', () => {
      const originalEnv = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        requiresAuth: true,
        handler: async () => ({ status: 200, jsonBody: {} }),
      };

      const handler = builder.createAzureHandler(route);

      expect(handler).toBeDefined();

      if (originalEnv) {
        process.env.JWT_SECRET = originalEnv;
      }
    });

    it('should create handler with required roles', async () => {
      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        requiredRoles: [UserRole.ADMIN],
        handler: async () => ({ status: 200, jsonBody: {} }),
      };

      const handler = builder.createAzureHandler(route);

      expect(handler).toBeDefined();
    });

    it('should create handler with auth and JWT_SECRET set', async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';

      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        requiresAuth: true,
        handler: async () => ({ status: 200, jsonBody: {} }),
      };

      const handler = builder.createAzureHandler(route);

      expect(handler).toBeDefined();

      if (originalEnv) {
        process.env.JWT_SECRET = originalEnv;
      } else {
        delete process.env.JWT_SECRET;
      }
    });

    it('should use custom success status', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'POST',
        path: '/api/resource',
        summary: 'Create resource',
        successStatus: 201,
        handler: async () => ({ status: 201, jsonBody: {} }),
      });

      const doc = openApiBuilder.generateDocument();

      expect(doc.paths['/api/resource'].post.responses['201']).toBeDefined();
    });
  });

  describe('createRouteHandler', () => {
    it('should create handler from service function', async () => {
      const serviceFunction = async (input: { name: string }) => {
        return { id: '123', name: input.name };
      };

      const handler = createRouteHandler(serviceFunction);

      const body = { name: 'Test' };
      const response = await handler(mockRequest, mockContext, {
        body,
        correlationId: 'test-id',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({ id: '123', name: 'Test' });
    });

    it('should use custom success status', async () => {
      const serviceFunction = async (input: any) => input;

      const handler = createRouteHandler(serviceFunction, { successStatus: 201 });

      const response = await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        correlationId: 'test-id',
      } as any);

      expect(response.status).toBe(201);
    });

    it('should pass user ID when configured', async () => {
      const serviceFunction = vi.fn(async (input: any, userId?: string) => {
        return { input, userId };
      });

      const handler = createRouteHandler(serviceFunction, { passUser: true });

      await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        user: { sub: 'user-123' },
        correlationId: 'test-id',
      } as any);

      expect(serviceFunction).toHaveBeenCalledWith({ test: 'data' }, 'user-123');
    });

    it('should not pass user ID when not configured', async () => {
      const serviceFunction = vi.fn(async (input: any, userId?: string) => {
        return { input, userId };
      });

      const handler = createRouteHandler(serviceFunction);

      await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        user: { sub: 'user-123' },
        correlationId: 'test-id',
      } as any);

      expect(serviceFunction).toHaveBeenCalledWith({ test: 'data' }, undefined);
    });

    it('should handle synchronous service function', async () => {
      const serviceFunction = (input: { value: number }) => {
        return { result: input.value * 2 };
      };

      const handler = createRouteHandler(serviceFunction);

      const response = await handler(mockRequest, mockContext, {
        body: { value: 5 },
        correlationId: 'test-id',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({ result: 10 });
    });
  });
});
