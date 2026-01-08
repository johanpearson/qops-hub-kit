/**
 * Quick Start Example - Simple Azure Function with @qops/hub-kit
 */

import { app } from '@azure/functions';
import { createHandler, UserRole, z } from '@qops/hub-kit';

// Simple GET endpoint without auth
const helloHandler = createHandler(
  async (request, context, { correlationId }) => {
    return {
      status: 200,
      jsonBody: {
        message: 'Hello from Azure Functions!',
        correlationId,
      },
    };
  }
);

// POST endpoint with validation
const createItemSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
});

const createItemHandler = createHandler(
  async (request, context, { body }) => {
    // body is validated and typed
    return {
      status: 201,
      jsonBody: {
        id: crypto.randomUUID(),
        ...body,
        createdAt: new Date().toISOString(),
      },
    };
  },
  {
    bodySchema: createItemSchema,
    enableLogging: true,
  }
);

// Protected endpoint requiring JWT auth
const protectedHandler = createHandler(
  async (request, context, { user }) => {
    return {
      status: 200,
      jsonBody: {
        message: `Hello ${user?.email}!`,
        roles: user?.roles,
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  }
);

// Register functions
app.http('hello', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'hello',
  handler: helloHandler,
});

app.http('createItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler: createItemHandler,
});

app.http('protected', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'protected',
  handler: protectedHandler,
});
