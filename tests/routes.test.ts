import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { RouteBuilder, createRouteHandler, Route } from '../src/routes';
import { OpenApiBuilder } from '../src/openapi';
import { UserRole } from '../src/auth';

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
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  describe('RouteBuilder - basic functionality', () => {
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

    it('should register a simple route', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        handler: async () => ({ status: 200, jsonBody: { message: 'test' } }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/test');
      expect(route).toBeDefined();
      expect(route?.summary).toBe('Test endpoint');
    });

    it('should return undefined for non-existent route', () => {
      const builder = new RouteBuilder();
      const route = builder.getRoute('GET', '/api/nonexistent');
      expect(route).toBeUndefined();
    });

    it('should get all routes', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/route1',
        summary: 'Route 1',
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      builder.route({
        method: 'POST',
        path: '/api/route2',
        summary: 'Route 2',
        handler: async () => ({ status: 201, jsonBody: {} }),
        responses: { 201: { description: 'Created' } },
      });

      const routes = builder.getAllRoutes();
      expect(routes).toHaveLength(2);
    });
  });

  describe('RouteBuilder - route registration', () => {
    it('should register route with body schema', () => {
      const builder = new RouteBuilder();
      const bodySchema = z.object({
        name: z.string(),
      });

      builder.route({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        bodySchema,
        handler: async (req, ctx, { body }) => ({
          status: 201,
          jsonBody: { created: body },
        }),
        responses: { 201: { description: 'Created' } },
      });

      const route = builder.getRoute('POST', '/api/users');
      expect(route?.bodySchema).toBe(bodySchema);
    });

    it('should register route with query schema', () => {
      const builder = new RouteBuilder();
      const querySchema = z.object({
        page: z.string(),
      });

      builder.route({
        method: 'GET',
        path: '/api/items',
        summary: 'List items',
        querySchema,
        handler: async (req, ctx, { query }) => ({
          status: 200,
          jsonBody: { page: query.page },
        }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/items');
      expect(route?.querySchema).toBe(querySchema);
    });

    it('should register route with response schema', () => {
      const builder = new RouteBuilder();
      const responseSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      builder.route({
        method: 'GET',
        path: '/api/user',
        summary: 'Get user',
        responseSchema,
        handler: async () => ({
          status: 200,
          jsonBody: { id: '123', name: 'John' },
        }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/user');
      expect(route?.responseSchema).toBe(responseSchema);
    });

    it('should register route with authentication requirement', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/protected',
        summary: 'Protected endpoint',
        requiresAuth: true,
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/protected');
      expect(route?.requiresAuth).toBe(true);
    });

    it('should register route with required roles', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'DELETE',
        path: '/api/admin',
        summary: 'Admin endpoint',
        requiresAuth: true,
        requiredRoles: [UserRole.ADMIN],
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('DELETE', '/api/admin');
      expect(route?.requiredRoles).toEqual([UserRole.ADMIN]);
    });

    it('should register route with tags', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/items',
        summary: 'Get items',
        tags: ['Items', 'Public'],
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/items');
      expect(route?.tags).toEqual(['Items', 'Public']);
    });

    it('should register route with custom success status', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'POST',
        path: '/api/resource',
        summary: 'Create resource',
        successStatus: 201,
        handler: async () => ({ status: 201, jsonBody: {} }),
        responses: { 201: { description: 'Created' } },
      });

      const route = builder.getRoute('POST', '/api/resource');
      expect(route?.successStatus).toBe(201);
    });

    it('should support method chaining', () => {
      const builder = new RouteBuilder();

      const result = builder
        .route({
          method: 'GET',
          path: '/api/route1',
          summary: 'Route 1',
          handler: async () => ({ status: 200, jsonBody: {} }),
          responses: { 200: { description: 'Success' } },
        })
        .route({
          method: 'POST',
          path: '/api/route2',
          summary: 'Route 2',
          handler: async () => ({ status: 201, jsonBody: {} }),
          responses: { 201: { description: 'Created' } },
        });

      expect(result).toBe(builder);
      expect(builder.getAllRoutes()).toHaveLength(2);
    });
  });

  describe('RouteBuilder - OpenAPI integration', () => {
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
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths).toHaveProperty('/api/test');
      expect(doc.paths['/api/test'].get.summary).toBe('Test endpoint');
    });

    it('should register authenticated route with security in OpenAPI', () => {
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
        responses: { 200: { description: 'Success' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/protected'].get.security).toEqual([{ bearerAuth: [] }]);
    });

    it('should add 401 response for authenticated routes', () => {
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
        responses: { 200: { description: 'Success' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/protected'].get.responses).toHaveProperty('401');
    });

    it('should add 403 response for role-restricted routes', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });
      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'DELETE',
        path: '/api/admin',
        summary: 'Admin endpoint',
        requiresAuth: true,
        requiredRoles: [UserRole.ADMIN],
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/admin'].delete.responses).toHaveProperty('403');
    });

    it('should add 422 response for routes with body schema', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });
      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        bodySchema: z.object({ name: z.string() }),
        handler: async () => ({ status: 201, jsonBody: {} }),
        responses: { 201: { description: 'Created' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/users'].post.responses).toHaveProperty('422');
    });

    it('should use 201 for POST routes by default', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });
      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'POST',
        path: '/api/resource',
        summary: 'Create resource',
        handler: async () => ({ status: 201, jsonBody: {} }),
        responses: { 201: { description: 'Created' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/resource'].post.responses).toHaveProperty('201');
    });

    it('should use custom success status when provided', () => {
      const openApiBuilder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });
      const builder = new RouteBuilder(openApiBuilder);

      builder.route({
        method: 'DELETE',
        path: '/api/resource',
        summary: 'Delete resource',
        successStatus: 204,
        handler: async () => ({ status: 204 }),
        responses: { 204: { description: 'No content' } },
      });

      const doc = openApiBuilder.generateDocument();
      expect(doc.paths['/api/resource'].delete.responses).toHaveProperty('204');
    });
  });

  describe('RouteBuilder - createAzureHandler', () => {
    it('should create Azure handler from route', async () => {
      const builder = new RouteBuilder();

      const route: Route = {
        method: 'GET',
        path: '/api/test',
        summary: 'Test',
        handler: async () => ({ status: 200, jsonBody: { message: 'test' } }),
        responses: { 200: { description: 'Success' } },
      };

      builder.route(route);

      const azureHandler = builder.createAzureHandler(route);
      const response = await azureHandler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.message).toBe('test');
    });

    it('should create handler with validation', async () => {
      const builder = new RouteBuilder();
      const bodySchema = z.object({
        name: z.string(),
      });

      const route: Route = {
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        bodySchema,
        handler: async (req, ctx, { body }) => ({
          status: 201,
          jsonBody: { created: body },
        }),
        responses: { 201: { description: 'Created' } },
      };

      (mockRequest.json as any).mockResolvedValue({ name: 'John' });

      builder.route(route);
      const azureHandler = builder.createAzureHandler(route);
      const response = await azureHandler(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.created.name).toBe('John');
    });

    it('should create handler with authentication when JWT_SECRET is set', async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';

      try {
        const builder = new RouteBuilder();
        const route: Route = {
          method: 'GET',
          path: '/api/protected',
          summary: 'Protected',
          requiresAuth: true,
          handler: async (req, ctx, { user }) => ({
            status: 200,
            jsonBody: { userId: user?.sub },
          }),
          responses: { 200: { description: 'Success' } },
        };

        const token = jwt.sign({ sub: '123' }, 'test-secret');
        mockRequest.headers.set('authorization', `Bearer ${token}`);

        builder.route(route);
        const azureHandler = builder.createAzureHandler(route);
        const response = await azureHandler(mockRequest, mockContext);

        expect(response.status).toBe(200);
        expect(response.jsonBody.userId).toBe('123');
      } finally {
        if (originalEnv) {
          process.env.JWT_SECRET = originalEnv;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });

    it('should create handler with role checking', async () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';

      try {
        const builder = new RouteBuilder();
        const route: Route = {
          method: 'DELETE',
          path: '/api/admin',
          summary: 'Admin only',
          requiresAuth: true,
          requiredRoles: [UserRole.ADMIN],
          handler: async () => ({ status: 200, jsonBody: { message: 'deleted' } }),
          responses: { 200: { description: 'Success' } },
        };

        const token = jwt.sign({ sub: '123', roles: [UserRole.ADMIN] }, 'test-secret');
        mockRequest.headers.set('authorization', `Bearer ${token}`);

        builder.route(route);
        const azureHandler = builder.createAzureHandler(route);
        const response = await azureHandler(mockRequest, mockContext);

        expect(response.status).toBe(200);
      } finally {
        if (originalEnv) {
          process.env.JWT_SECRET = originalEnv;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });
  });

  describe('createRouteHandler', () => {
    it('should create handler from service function', async () => {
      const serviceFunction = async (input: { name: string }) => {
        return { id: '123', name: input.name };
      };

      const handler = createRouteHandler(serviceFunction);
      const response = await handler(mockRequest, mockContext, {
        body: { name: 'John' },
        correlationId: 'test-123',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody.id).toBe('123');
      expect(response.jsonBody.name).toBe('John');
    });

    it('should use custom success status', async () => {
      const serviceFunction = async (input: any) => input;

      const handler = createRouteHandler(serviceFunction, { successStatus: 201 });
      const response = await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        correlationId: 'test-123',
      } as any);

      expect(response.status).toBe(201);
    });

    it('should pass user ID when passUser is true', async () => {
      const serviceFunction = async (input: any, userId?: string) => {
        return { data: input, userId };
      };

      const handler = createRouteHandler(serviceFunction, { passUser: true });
      const response = await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        user: { sub: 'user-123' },
        correlationId: 'test-123',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody.userId).toBe('user-123');
    });

    it('should not pass user ID when passUser is false', async () => {
      const serviceFunction = async (input: any, userId?: string) => {
        return { data: input, userId };
      };

      const handler = createRouteHandler(serviceFunction, { passUser: false });
      const response = await handler(mockRequest, mockContext, {
        body: { test: 'data' },
        user: { sub: 'user-123' },
        correlationId: 'test-123',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody.userId).toBeUndefined();
    });

    it('should handle synchronous service function', async () => {
      const serviceFunction = (input: { value: number }) => {
        return { result: input.value * 2 };
      };

      const handler = createRouteHandler(serviceFunction);
      const response = await handler(mockRequest, mockContext, {
        body: { value: 5 },
        correlationId: 'test-123',
      } as any);

      expect(response.status).toBe(200);
      expect(response.jsonBody.result).toBe(10);
    });
  });

  describe('RouteBuilder - edge cases', () => {
    it('should handle multiple routes on same path with different methods', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/resource',
        summary: 'Get resource',
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      builder.route({
        method: 'POST',
        path: '/api/resource',
        summary: 'Create resource',
        handler: async () => ({ status: 201, jsonBody: {} }),
        responses: { 201: { description: 'Created' } },
      });

      const getRoute = builder.getRoute('GET', '/api/resource');
      const postRoute = builder.getRoute('POST', '/api/resource');

      expect(getRoute?.summary).toBe('Get resource');
      expect(postRoute?.summary).toBe('Create resource');
    });

    it('should handle empty route list', () => {
      const builder = new RouteBuilder();
      const routes = builder.getAllRoutes();
      expect(routes).toHaveLength(0);
    });

    it('should handle route with no optional fields', () => {
      const builder = new RouteBuilder();

      builder.route({
        method: 'GET',
        path: '/api/minimal',
        summary: 'Minimal',
        handler: async () => ({ status: 200, jsonBody: {} }),
        responses: { 200: { description: 'Success' } },
      });

      const route = builder.getRoute('GET', '/api/minimal');
      expect(route?.description).toBeUndefined();
      expect(route?.tags).toBeUndefined();
      expect(route?.requiresAuth).toBeUndefined();
      expect(route?.requiredRoles).toBeUndefined();
    });

    it('should handle handler returning null body', async () => {
      const builder = new RouteBuilder();
      const route: Route = {
        method: 'DELETE',
        path: '/api/resource',
        summary: 'Delete',
        handler: async () => ({ status: 204 }),
        responses: { 204: { description: 'No content' } },
      };

      builder.route(route);
      const azureHandler = builder.createAzureHandler(route);
      const response = await azureHandler(mockRequest, mockContext);

      expect(response.status).toBe(204);
      expect(response.jsonBody).toBeUndefined();
    });
  });
});
