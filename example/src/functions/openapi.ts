import { app } from '@azure/functions';
import { OpenApiBuilder, healthCheckResponseSchema, z } from '@qops/hub-kit';
import { loginSchema, loginResponseSchema, userResponseSchema, usersListSchema } from '../schemas/user.schemas.js';

// Build OpenAPI documentation
const builder = new OpenApiBuilder({
  title: 'Example API',
  version: '1.0.0',
  description: 'Example Azure Functions API using @qops/hub-kit with JWT authentication',
});

// Register all routes using shared schemas
builder.registerRoute({
  method: 'GET',
  path: '/api/health',
  summary: 'Health check',
  description: 'Check API health status',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      schema: healthCheckResponseSchema,
    },
  },
  requiresAuth: false,
});

builder.registerRoute({
  method: 'POST',
  path: '/api/auth/login',
  summary: 'User login',
  description: 'Authenticate user and return JWT token',
  tags: ['Authentication'],
  requestBody: loginSchema,
  responses: {
    200: {
      description: 'Login successful',
      schema: loginResponseSchema,
    },
    401: {
      description: 'Invalid credentials',
    },
  },
  requiresAuth: false,
});

builder.registerRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get user by ID',
  description: 'Retrieve a user by their ID',
  tags: ['Users'],
  pathParams: z.object({
    id: z.string().describe('User ID'),
  }),
  responses: {
    200: {
      description: 'User found',
      schema: userResponseSchema,
    },
    404: {
      description: 'User not found',
    },
  },
  requiresAuth: true,
});

builder.registerRoute({
  method: 'GET',
  path: '/api/users',
  summary: 'List all users',
  description: 'Retrieve all users',
  tags: ['Users'],
  responses: {
    200: {
      description: 'List of users',
      schema: usersListSchema,
    },
  },
  requiresAuth: true,
});

// Generate and serve OpenAPI document
app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: async (request, context) => {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: builder.generateDocument(),
    };
  },
});
