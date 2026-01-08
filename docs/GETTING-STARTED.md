# Getting Started - Complete Setup Guide

This guide walks you through setting up a complete Azure Functions project using @qops/hub-kit from scratch.

## Prerequisites

- Node.js 18.x or later
- Azure Functions Core Tools v4
- An Azure account (for deployment)

## 1. Create .npmrc (if using private registry)

```ini
# .npmrc
@qops:registry=https://your-private-registry.com/
//your-private-registry.com/:_authToken=${NPM_TOKEN}
```

## 2. Install Dependencies

```bash
npm init -y
npm install @qops/hub-kit zod jsonwebtoken @azure/functions
npm install -D @types/node @types/jsonwebtoken typescript @azure/functions
```

## 3. Project Structure

Here's a recommended project structure:

```
my-api/
├── .npmrc                          # Private registry configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── host.json                       # Azure Functions configuration
├── local.settings.json             # Environment variables (local)
├── src/
│   ├── services/                   # Business logic
│   │   └── user.service.ts
│   └── functions/                  # Azure Function handlers
│       ├── openapi.ts              # OpenAPI documentation endpoint
│       ├── health.ts               # Health check endpoint
│       ├── login.ts                # Login handler
│       ├── get-user.ts             # Get user handler
│       └── list-users.ts           # List users handler
└── README.md
```

## 4. Configuration Files

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json (add these scripts)

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rimraf dist"
  }
}
```

### host.json

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

### local.settings.json

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "JWT_SECRET": "your-secret-key-change-this-in-production"
  }
}
```

## 5. Service Layer (Business Logic)

**src/services/user.service.ts**

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';
import { randomUUID } from 'node:crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

// In-memory storage (use a real database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

// Seed data
const adminUser: User = {
  id: randomUUID(),
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed_admin_password', // Use bcrypt in production
  role: 'admin',
};
users.set(adminUser.id, adminUser);
emailIndex.set(adminUser.email, adminUser.id);

export async function authenticateUser(email: string, password: string): Promise<UserResponse> {
  const userId = emailIndex.get(email);
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  const user = users.get(userId);
  if (!user || user.passwordHash !== `hashed_${password}`) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string): Promise<UserResponse> {
  const user = users.get(id);
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getAllUsers(): Promise<UserResponse[]> {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
```

## 6. Function Handlers

### Health Check Endpoint

**src/functions/health.ts**

```typescript
import { app } from '@azure/functions';
import { createHealthHandler } from '@qops/hub-kit';

// Simple health check endpoint - no configuration needed!
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: createHealthHandler(),
});
```

### Login Handler

**src/functions/login.ts**

```typescript
import { app } from '@azure/functions';
import { createHandler, z } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../services/user.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginHandler = createHandler(
  async (request, context, { body }) => {
    const user = await authenticateUser(body.email, body.password);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' },
    );

    return {
      status: 200,
      jsonBody: { token, user },
    };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  },
);

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: loginHandler,
});
```

### Protected Endpoints

**src/functions/get-user.ts**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js';

const getUserHandler = createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);

    return {
      status: 200,
      jsonBody: userData,
    };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  },
);

app.http('getUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: getUserHandler,
});
```

**src/functions/list-users.ts**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getAllUsers } from '../services/user.service.js';

const listUsersHandler = createHandler(
  async (request, context, { user }) => {
    const users = await getAllUsers();

    return {
      status: 200,
      jsonBody: { users, total: users.length },
    };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  },
);

app.http('listUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: listUsersHandler,
});
```

## 7. OpenAPI Documentation

Add an OpenAPI endpoint to document your API:

**src/functions/openapi.ts**

```typescript
import { app } from '@azure/functions';
import { OpenApiBuilder, healthCheckResponseSchema, z } from '@qops/hub-kit';

// Define your schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
});

const loginResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
});

const usersListSchema = z.object({
  users: z.array(userResponseSchema),
  total: z.number(),
});

// Build OpenAPI documentation
const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'Azure Functions API with JWT authentication',
});

// Register all routes
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
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: z.string(),
      description: 'User ID',
    },
  ],
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
```

## 8. Test Your API

```bash
# Build
npm run build

# Start Azure Functions locally
func start

# Test health endpoint (no auth required)
curl http://localhost:7071/api/health

# Response: { "status": "healthy", "timestamp": "2024-01-08T19:00:00.000Z", "uptime": 123.45 }

# View OpenAPI documentation
curl http://localhost:7071/api/openapi.json

# Test login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Response: { "token": "eyJhbGc...", "user": {...} }

# Test protected endpoint
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 9. View API Documentation

You can use Swagger UI to visualize your OpenAPI specification:

1. Copy the output from `http://localhost:7071/api/openapi.json`
2. Paste it into [Swagger Editor](https://editor.swagger.io/)
3. Or use a local Swagger UI instance

## Next Steps

- **Advanced Features**: See [Advanced Usage](./ADVANCED.md)
- **Azure Integrations**: See [Azure Integrations](./INTEGRATIONS.md)
- **API Reference**: See main [README.md](../README.md)
