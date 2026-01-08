/**
 * Example: Service/Route Pattern with @qops/hub-kit
 * 
 * This example demonstrates the service/route pattern where:
 * - Services contain business logic
 * - Routes define schemas and wire up handlers
 * - OpenAPI documentation is auto-generated
 */

import { app } from '@azure/functions';
import {
  RouteBuilder,
  OpenApiBuilder,
  z,
  UserRole,
  AppError,
  ErrorCode,
  createService,
  createRouteHandler,
} from '@qops/hub-kit';

// ============================================================================
// 1. Define Types and Schemas
// ============================================================================

// User types
export type UserRoleType = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRoleType;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
}

// Schemas
const userRoleSchema = z.enum(['admin', 'member']);

const createUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: userRoleSchema,
});

const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
});

const userListResponseSchema = z.object({
  users: z.array(userResponseSchema),
  total: z.number(),
});

// ============================================================================
// 2. Service Layer (Business Logic)
// ============================================================================

// In-memory store (replace with real database)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

/**
 * Simple password hashing (use bcrypt in production)
 */
async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`;
}

/**
 * Create a new user
 */
export const createUser = createService(
  async (
    input: z.infer<typeof createUserRequestSchema>,
    createdBy?: string
  ): Promise<UserResponse> => {
    // Check if user already exists
    if (emailIndex.has(input.email)) {
      throw new AppError(
        ErrorCode.CONFLICT,
        `User with email ${input.email} already exists`
      );
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
    };

    // Store user
    users.set(user.id, user);
    emailIndex.set(user.email, user.id);

    // Return response (without password)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
);

/**
 * Find user by email
 */
export const findUserByEmail = createService(
  async (email: string): Promise<User | undefined> => {
    const userId = emailIndex.get(email);
    if (!userId) {
      return undefined;
    }
    return users.get(userId);
  }
);

/**
 * Find user by ID
 */
export const findUserById = createService(
  async (id: string): Promise<UserResponse | undefined> => {
    const user = users.get(id);
    if (!user) {
      return undefined;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
);

/**
 * List all users
 */
export const listUsers = createService(async (): Promise<{
  users: UserResponse[];
  total: number;
}> => {
  const userList = Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));

  return {
    users: userList,
    total: userList.length,
  };
});

// ============================================================================
// 3. Route Definitions (Schema + Handler)
// ============================================================================

// Setup OpenAPI builder
const openApiBuilder = new OpenApiBuilder({
  title: 'User Management API',
  version: '1.0.0',
  description: 'API for managing users with service/route pattern',
  servers: [
    {
      url: 'http://localhost:7071',
      description: 'Local development',
    },
  ],
});

// Create route builder
const routeBuilder = new RouteBuilder(openApiBuilder);

// Define routes
routeBuilder
  .route({
    method: 'POST',
    path: '/api/users',
    summary: 'Create a new user',
    description: 'Create a new user (admin only)',
    tags: ['Users'],
    bodySchema: createUserRequestSchema,
    responseSchema: userResponseSchema,
    requiresAuth: true,
    requiredRoles: [UserRole.ADMIN],
    successStatus: 201,
    handler: createRouteHandler(createUser, {
      successStatus: 201,
      passUser: true,
    }),
  })
  .route({
    method: 'GET',
    path: '/api/users',
    summary: 'List all users',
    description: 'Get a list of all users',
    tags: ['Users'],
    responseSchema: userListResponseSchema,
    requiresAuth: true,
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    handler: async (request, context, { user }) => {
      const result = await listUsers({}, user?.sub);
      return {
        status: 200,
        jsonBody: result,
      };
    },
  })
  .route({
    method: 'GET',
    path: '/api/users/{id}',
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
    tags: ['Users'],
    responseSchema: userResponseSchema,
    requiresAuth: true,
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    handler: async (request, context, { user }) => {
      const userId = request.params.id;
      const foundUser = await findUserById(userId, user?.sub);

      if (!foundUser) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
      }

      return {
        status: 200,
        jsonBody: foundUser,
      };
    },
  });

// ============================================================================
// 4. Register Azure Functions
// ============================================================================

// Register all routes as Azure Functions
for (const route of routeBuilder.getAllRoutes()) {
  const functionName = `${route.method.toLowerCase()}${route.path.replace(/\//g, '_').replace(/[{}]/g, '')}`;
  const azurePath = route.path.replace('/api/', '');

  app.http(functionName, {
    methods: [route.method],
    authLevel: 'anonymous',
    route: azurePath,
    handler: routeBuilder.createAzureHandler(route),
  });
}

// Serve OpenAPI documentation
app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: async () => {
    return {
      status: 200,
      jsonBody: openApiBuilder.generateDocument(),
    };
  },
});

// Health check
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => {
    return {
      status: 200,
      jsonBody: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    };
  },
});
