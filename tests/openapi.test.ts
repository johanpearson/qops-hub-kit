import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OpenApiBuilder, HttpMethod } from '../src/openapi';

describe('openapi', () => {
  describe('OpenApiBuilder', () => {
    it('should create builder with basic config', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const doc = builder.generateDocument();

      expect(doc.info.title).toBe('Test API');
      expect(doc.info.version).toBe('1.0.0');
      expect(doc.openapi).toBe('3.0.0');
    });

    it('should include description in config', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'This is a test API',
      });

      const doc = builder.generateDocument();

      expect(doc.info.description).toBe('This is a test API');
    });

    it('should include servers in config', () => {
      const servers = [
        { url: 'https://api.example.com', description: 'Production' },
        { url: 'https://staging.example.com', description: 'Staging' },
      ];

      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
        servers,
      });

      const doc = builder.generateDocument();

      expect(doc.servers).toEqual(servers);
    });

    it('should register bearer auth security scheme', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const doc = builder.generateDocument();

      expect(doc.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(doc.components.securitySchemes.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });
  });

  describe('OpenApiBuilder - registerRoute', () => {
    let builder: OpenApiBuilder;

    beforeEach(() => {
      builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });
    });

    it('should register simple GET route', () => {
      const responseSchema = z.object({
        message: z.string(),
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/hello',
        summary: 'Say hello',
        responses: {
          200: {
            description: 'Success',
            schema: responseSchema,
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths).toHaveProperty('/api/hello');
      expect(doc.paths['/api/hello']).toHaveProperty('get');
      expect(doc.paths['/api/hello'].get.summary).toBe('Say hello');
    });

    it('should register POST route with request body', () => {
      const requestSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const responseSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        description: 'Create a new user',
        requestBody: requestSchema,
        responses: {
          201: {
            description: 'User created',
            schema: responseSchema,
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths).toHaveProperty('/api/users');
      expect(doc.paths['/api/users']).toHaveProperty('post');
      expect(doc.paths['/api/users'].post.summary).toBe('Create user');
      expect(doc.paths['/api/users'].post.description).toBe('Create a new user');
    });

    it('should register route with query parameters', () => {
      const querySchema = z.object({
        page: z.string(),
        limit: z.string().optional(),
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/users',
        summary: 'List users',
        queryParams: querySchema,
        responses: {
          200: {
            description: 'List of users',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users'].get).toBeDefined();
    });

    it('should register route with path parameters', () => {
      const pathSchema = z.object({
        id: z.string(),
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/users/{id}',
        summary: 'Get user by ID',
        pathParams: pathSchema,
        responses: {
          200: {
            description: 'User found',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users/{id}'].get).toBeDefined();
    });

    it('should register route with tags', () => {
      builder.registerRoute({
        method: 'GET',
        path: '/api/users',
        summary: 'List users',
        tags: ['Users', 'Admin'],
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users'].get.tags).toEqual(['Users', 'Admin']);
    });

    it('should register route requiring authentication', () => {
      builder.registerRoute({
        method: 'GET',
        path: '/api/protected',
        summary: 'Protected endpoint',
        requiresAuth: true,
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/protected'].get.security).toEqual([{ bearerAuth: [] }]);
    });

    it('should register route without authentication', () => {
      builder.registerRoute({
        method: 'GET',
        path: '/api/public',
        summary: 'Public endpoint',
        requiresAuth: false,
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/public'].get.security).toBeUndefined();
    });

    it('should register multiple response status codes', () => {
      builder.registerRoute({
        method: 'POST',
        path: '/api/resource',
        summary: 'Create resource',
        responses: {
          201: {
            description: 'Created',
            schema: z.object({ id: z.string() }),
          },
          400: {
            description: 'Bad request',
          },
          401: {
            description: 'Unauthorized',
          },
          422: {
            description: 'Validation error',
          },
        },
      });

      const doc = builder.generateDocument();

      const responses = doc.paths['/api/resource'].post.responses;
      expect(responses).toHaveProperty('201');
      expect(responses).toHaveProperty('400');
      expect(responses).toHaveProperty('401');
      expect(responses).toHaveProperty('422');
    });

    it('should register response without schema', () => {
      builder.registerRoute({
        method: 'DELETE',
        path: '/api/resource/{id}',
        summary: 'Delete resource',
        responses: {
          204: {
            description: 'No content',
          },
        },
      });

      const doc = builder.generateDocument();

      const response = doc.paths['/api/resource/{id}'].delete.responses['204'];
      expect(response.description).toBe('No content');
      expect(response.content).toBeUndefined();
    });

    it('should handle all HTTP methods', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      methods.forEach((method) => {
        builder.registerRoute({
          method,
          path: `/api/${method.toLowerCase()}`,
          summary: `Test ${method}`,
          responses: {
            200: {
              description: 'Success',
            },
          },
        });
      });

      const doc = builder.generateDocument();

      methods.forEach((method) => {
        const path = `/api/${method.toLowerCase()}`;
        expect(doc.paths[path][method.toLowerCase()]).toBeDefined();
      });
    });
  });

  describe('OpenApiBuilder - multiple routes', () => {
    it('should register multiple routes on same path', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/users',
        summary: 'List users',
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        responses: {
          201: {
            description: 'Created',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users']).toHaveProperty('get');
      expect(doc.paths['/api/users']).toHaveProperty('post');
    });

    it('should register multiple paths', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/users',
        summary: 'List users',
        responses: { 200: { description: 'Success' } },
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/posts',
        summary: 'List posts',
        responses: { 200: { description: 'Success' } },
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/comments',
        summary: 'List comments',
        responses: { 200: { description: 'Success' } },
      });

      const doc = builder.generateDocument();

      expect(Object.keys(doc.paths)).toHaveLength(3);
      expect(doc.paths).toHaveProperty('/api/users');
      expect(doc.paths).toHaveProperty('/api/posts');
      expect(doc.paths).toHaveProperty('/api/comments');
    });
  });

  describe('OpenApiBuilder - complex schemas', () => {
    it('should handle nested object schemas', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const nestedSchema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            name: z.string(),
            age: z.number(),
          }),
        }),
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/data',
        summary: 'Create data',
        requestBody: nestedSchema,
        responses: {
          201: {
            description: 'Created',
            schema: nestedSchema,
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/data'].post).toBeDefined();
    });

    it('should handle array schemas', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const arraySchema = z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      );

      builder.registerRoute({
        method: 'GET',
        path: '/api/items',
        summary: 'Get items',
        responses: {
          200: {
            description: 'List of items',
            schema: arraySchema,
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/items'].get).toBeDefined();
    });

    it('should handle enum schemas', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const enumSchema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/status',
        summary: 'Update status',
        requestBody: enumSchema,
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/status'].post).toBeDefined();
    });

    it('should handle optional fields', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/optional',
        summary: 'Test optional',
        requestBody: optionalSchema,
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/optional'].post).toBeDefined();
    });
  });

  describe('OpenApiBuilder - edge cases', () => {
    it('should handle empty servers array', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
        servers: [],
      });

      const doc = builder.generateDocument();

      expect(doc.servers).toEqual([]);
    });

    it('should handle missing optional fields', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/test',
        summary: 'Test endpoint',
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/test'].get.description).toBeUndefined();
      expect(doc.paths['/api/test'].get.tags).toBeUndefined();
    });

    it('should handle route with no request body or params', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/simple',
        summary: 'Simple endpoint',
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      const operation = doc.paths['/api/simple'].get;
      expect(operation.requestBody).toBeUndefined();
    });
  });
});
