import { app } from '@azure/functions';
import { OpenApiBuilder } from '@qops/hub-kit';
import { aggregatedUserProfileSchema, dashboardDataSchema } from '../schemas/bff.schemas.js';

/**
 * OpenAPI documentation endpoint
 */
const builder = new OpenApiBuilder({
  title: 'BFF (Backend for Frontend) API',
  version: '1.0.0',
  description:
    'Example BFF API that aggregates data from multiple backend services (User, Order, Notification) and provides optimized endpoints for frontend applications',
  servers: [
    {
      url: 'http://localhost:7071/api',
      description: 'Local development',
    },
  ],
});

// Add JWT security scheme
builder.addSecurityScheme('bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token from authentication service',
});

// Register health check endpoint
builder.registerRoute({
  method: 'GET',
  path: '/health',
  summary: 'Health check',
  description: 'Check if the BFF service is healthy and running',
  tags: ['System'],
  responses: {
    200: {
      description: 'Service is healthy',
    },
  },
});

// Register aggregated user profile endpoint
builder.registerRoute({
  method: 'GET',
  path: '/profile',
  summary: 'Get aggregated user profile',
  description:
    'Fetches and combines user profile data from multiple backend services: user profile, recent orders, and unread notifications',
  tags: ['User'],
  responses: {
    200: {
      description: 'Aggregated user profile data',
      schema: aggregatedUserProfileSchema,
    },
    401: {
      description: 'Unauthorized - Invalid or missing JWT token',
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
    },
  },
  requiresAuth: true,
});

// Register dashboard endpoint
builder.registerRoute({
  method: 'GET',
  path: '/dashboard',
  summary: 'Get dashboard data',
  description:
    'Fetches aggregated data from multiple backend services and transforms it for the dashboard UI. Includes user info, statistics, and recent activity',
  tags: ['Dashboard'],
  responses: {
    200: {
      description: 'Dashboard data with stats and recent activity',
      schema: dashboardDataSchema,
    },
    401: {
      description: 'Unauthorized - Invalid or missing JWT token',
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
    },
  },
  requiresAuth: true,
});

app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: async () => ({
    status: 200,
    jsonBody: builder.generateDocument(),
  }),
});
