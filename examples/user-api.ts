/**
 * Example Azure Function using @qops/hub-kit
 * 
 * This example demonstrates:
 * - Creating a simple GET endpoint
 * - Using JWT authentication
 * - Request validation
 * - OpenAPI documentation
 */

import { app } from '@azure/functions';
import {
  createHandler,
  UserRole,
  z,
  OpenApiBuilder,
  createNotFoundError,
} from '@qops/hub-kit';

// ============================================================================
// 1. Define Schemas
// ============================================================================

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  createdAt: z.string().datetime(),
});

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const QuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('10'),
});

// ============================================================================
// 2. Create Handlers
// ============================================================================

// Health check endpoint (no auth required)
const healthHandler = createHandler(
  async (request, context, { correlationId }) => {
    return {
      status: 200,
      jsonBody: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        correlationId,
      },
    };
  },
  {
    enableLogging: true,
  }
);

// Create user endpoint (admin only)
const createUserHandler = createHandler(
  async (request, context, { body, user }) => {
    // Simulate user creation
    const newUser = {
      id: crypto.randomUUID(),
      ...body,
      role: UserRole.MEMBER,
      createdAt: new Date().toISOString(),
    };

    context.log(`User created by: ${user?.email}`);

    return {
      status: 201,
      jsonBody: newUser,
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      algorithms: ['HS256'],
    },
    requiredRoles: [UserRole.ADMIN],
    bodySchema: CreateUserSchema,
    enableLogging: true,
  }
);

// Get users endpoint (member or admin)
const getUsersHandler = createHandler(
  async (request, context, { query, user }) => {
    // Simulate fetching users
    const users = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.MEMBER,
        createdAt: new Date().toISOString(),
      },
    ];

    return {
      status: 200,
      jsonBody: {
        data: users,
        page: query.page,
        limit: query.limit,
        total: users.length,
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    querySchema: QuerySchema,
    enableLogging: true,
  }
);

// Get user by ID endpoint
const getUserByIdHandler = createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;

    // Simulate fetching user
    if (userId !== '123e4567-e89b-12d3-a456-426614174000') {
      throw createNotFoundError('User not found');
    }

    const foundUser = {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.MEMBER,
      createdAt: new Date().toISOString(),
    };

    return {
      status: 200,
      jsonBody: foundUser,
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    enableLogging: true,
  }
);

// ============================================================================
// 3. Setup OpenAPI Documentation
// ============================================================================

const openApiBuilder = new OpenApiBuilder({
  title: 'User Management API',
  version: '1.0.0',
  description: 'API for managing users with JWT authentication',
  servers: [
    {
      url: 'https://my-app.azurewebsites.net',
      description: 'Production',
    },
    {
      url: 'http://localhost:7071',
      description: 'Local development',
    },
  ],
});

// Register routes
openApiBuilder.registerRoute({
  method: 'GET',
  path: '/api/health',
  summary: 'Health check',
  description: 'Check if the API is running',
  tags: ['Health'],
  responses: {
    200: {
      description: 'API is healthy',
      schema: z.object({
        status: z.string(),
        timestamp: z.string(),
        correlationId: z.string(),
      }),
    },
  },
});

openApiBuilder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create a new user',
  description: 'Create a new user (admin only)',
  tags: ['Users'],
  requiresAuth: true,
  requestBody: CreateUserSchema,
  responses: {
    201: {
      description: 'User created successfully',
      schema: UserSchema,
    },
    400: {
      description: 'Invalid request',
    },
    401: {
      description: 'Unauthorized',
    },
    403: {
      description: 'Forbidden - Admin role required',
    },
  },
});

openApiBuilder.registerRoute({
  method: 'GET',
  path: '/api/users',
  summary: 'Get all users',
  description: 'Retrieve a paginated list of users',
  tags: ['Users'],
  requiresAuth: true,
  queryParams: QuerySchema,
  responses: {
    200: {
      description: 'List of users',
      schema: z.object({
        data: z.array(UserSchema),
        page: z.number(),
        limit: z.number(),
        total: z.number(),
      }),
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

openApiBuilder.registerRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get user by ID',
  description: 'Retrieve a specific user by their ID',
  tags: ['Users'],
  requiresAuth: true,
  pathParams: z.object({
    id: z.string().uuid(),
  }),
  responses: {
    200: {
      description: 'User found',
      schema: UserSchema,
    },
    404: {
      description: 'User not found',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// OpenAPI documentation endpoint
const openApiHandler = createHandler(async () => {
  const doc = openApiBuilder.generateDocument();
  return {
    status: 200,
    jsonBody: doc,
  };
});

// ============================================================================
// 4. Register Azure Functions
// ============================================================================

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler,
});

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: createUserHandler,
});

app.http('getUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: getUsersHandler,
});

app.http('getUserById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: getUserByIdHandler,
});

app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: openApiHandler,
});
