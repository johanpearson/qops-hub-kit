import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HttpMethod, OpenApiBuilder } from '../src/openapi';

describe('openapi', () => {
  describe('OpenApiBuilder', () => {
    it('should create builder with basic config', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      expect(builder).toBeDefined();
    });

    it('should generate OpenAPI document', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API description',
      });

      const doc = builder.generateDocument();

      expect(doc.openapi).toBe('3.0.0');
      expect(doc.info.title).toBe('Test API');
      expect(doc.info.version).toBe('1.0.0');
      expect(doc.info.description).toBe('Test API description');
    });

    it('should include server URLs in document', () => {
      const servers = [
        { url: 'http://localhost:7071', description: 'Development' },
        { url: 'https://api.example.com', description: 'Production' },
      ];

      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
        servers,
      });

      const doc = builder.generateDocument();

      expect(doc.servers).toEqual(servers);
    });

    it('should register route with request body', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const bodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        description: 'Create a new user',
        requestBody: bodySchema,
        responses: {
          201: {
            description: 'User created',
            schema: z.object({ id: z.string(), name: z.string() }),
          },
        },
        tags: ['Users'],
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users'].post).toBeDefined();
      expect(doc.paths['/api/users'].post.summary).toBe('Create user');
      expect(doc.paths['/api/users'].post.tags).toEqual(['Users']);
    });

    it('should register route with query parameters', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

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
            description: 'User list',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users'].get).toBeDefined();
      expect(doc.paths['/api/users'].get.summary).toBe('List users');
    });

    it('should register route with path parameters', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

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
            description: 'User details',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users/{id}'].get).toBeDefined();
      expect(doc.paths['/api/users/{id}'].get.summary).toBe('Get user by ID');
    });

    it('should register route with authentication', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

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

      expect(doc.paths['/api/protected'].get.security).toBeDefined();
      expect(doc.paths['/api/protected'].get.security[0].bearerAuth).toBeDefined();
    });

    it.each<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('should register %s route', (method) => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method,
        path: '/api/test',
        summary: `Test ${method}`,
        responses: {
          200: {
            description: 'Success',
          },
        },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/test'][method.toLowerCase()]).toBeDefined();
    });

    it('should register multiple routes', () => {
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
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        responses: { 201: { description: 'Created' } },
      });

      builder.registerRoute({
        method: 'GET',
        path: '/api/posts',
        summary: 'List posts',
        responses: { 200: { description: 'Success' } },
      });

      const doc = builder.generateDocument();

      expect(doc.paths['/api/users'].get).toBeDefined();
      expect(doc.paths['/api/users'].post).toBeDefined();
      expect(doc.paths['/api/posts'].get).toBeDefined();
    });

    it('should include security schemes in document', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      const doc = builder.generateDocument();

      expect(doc.components.securitySchemes.bearerAuth).toBeDefined();
      expect(doc.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(doc.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
      expect(doc.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should register route with multiple response codes', () => {
      const builder = new OpenApiBuilder({
        title: 'Test API',
        version: '1.0.0',
      });

      builder.registerRoute({
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        requestBody: z.object({ name: z.string() }),
        responses: {
          201: { description: 'Created' },
          400: { description: 'Bad request' },
          422: { description: 'Validation error' },
          500: { description: 'Internal error' },
        },
      });

      const doc = builder.generateDocument();

      const post = doc.paths['/api/users'].post;
      expect(post.responses['201']).toBeDefined();
      expect(post.responses['400']).toBeDefined();
      expect(post.responses['422']).toBeDefined();
      expect(post.responses['500']).toBeDefined();
    });
  });
});
