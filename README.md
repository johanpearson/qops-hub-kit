# @qops/hub-kit

A utility package for creating Azure Function v4 APIs with TypeScript, featuring automatic OpenAPI documentation, JWT authentication, error handling, and correlation IDs.

## Features

- 🚀 **Simple API Creation** - Remove boilerplate with the `createHandler` wrapper
- 📝 **OpenAPI Documentation** - Generate OpenAPI v3 docs from Zod schemas
- 🔐 **JWT Authentication** - Built-in JWT verification and role-based authorization
- 🛡️ **Error Handling** - Consistent error responses with custom error types
- 🔍 **Correlation IDs** - Automatic request tracking across services
- ✅ **Request Validation** - Type-safe validation using Zod schemas
- 📊 **Request Logging** - Optional structured logging

## Installation

```bash
npm install @qops/hub-kit
```

## Quick Start

### Basic Handler

```typescript
import { createHandler } from '@qops/hub-kit';
import { app } from '@azure/functions';

// Simple handler without authentication
export default createHandler(async (request, context, { correlationId }) => {
  return {
    status: 200,
    jsonBody: { 
      message: 'Hello World',
      correlationId 
    },
  };
});

// Register with Azure Functions
app.http('hello', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: helloHandler,
});
```

### Handler with Authentication

```typescript
import { createHandler, UserRole, z } from '@qops/hub-kit';

const handler = createHandler(
  async (request, context, { user, correlationId }) => {
    return {
      status: 200,
      jsonBody: { 
        message: `Hello ${user?.email}`,
        roles: user?.roles,
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET!,
      algorithms: ['HS256'],
    },
    requiredRoles: [UserRole.MEMBER], // Allow members and admins
    enableLogging: true,
  }
);
```

### Handler with Request Validation

```typescript
import { createHandler, UserRole, z } from '@qops/hub-kit';

// Define request schema
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
});

const handler = createHandler(
  async (request, context, { body, user }) => {
    // body is typed based on the schema
    const newUser = {
      id: generateId(),
      ...body,
      createdBy: user?.sub,
    };
    
    // Save to database...
    
    return {
      status: 201,
      jsonBody: newUser,
    };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN],
    bodySchema: createUserSchema,
    enableLogging: true,
  }
);
```

### Handler with Query Parameters

```typescript
import { createHandler, z } from '@qops/hub-kit';

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('10'),
  search: z.string().optional(),
});

const handler = createHandler(
  async (request, context, { query }) => {
    // query is typed and validated
    const results = await fetchUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    
    return {
      status: 200,
      jsonBody: results,
    };
  },
  {
    querySchema,
    enableLogging: true,
  }
);
```

## OpenAPI Documentation

Generate OpenAPI v3 documentation from your route definitions:

```typescript
import { OpenApiBuilder, z, UserRole } from '@qops/hub-kit';
import { app } from '@azure/functions';

// Create OpenAPI builder
const openApiBuilder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'API for managing users',
  servers: [
    { url: 'https://myapi.azurewebsites.net', description: 'Production' },
  ],
});

// Define schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// Register routes
openApiBuilder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create a new user',
  description: 'Creates a new user in the system',
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
  },
});

openApiBuilder.registerRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get user by ID',
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
  },
});

// Generate OpenAPI document
const openApiDoc = openApiBuilder.generateDocument();

// Serve OpenAPI documentation
const openApiHandler = createHandler(async () => {
  return {
    status: 200,
    jsonBody: openApiDoc,
  };
});

app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: openApiHandler,
});
```

## Error Handling

The package provides consistent error handling:

```typescript
import { 
  createHandler, 
  createNotFoundError, 
  createValidationError,
  AppError,
  ErrorCode,
} from '@qops/hub-kit';

const handler = createHandler(async (request, context, { body }) => {
  const user = await findUser(body.userId);
  
  if (!user) {
    // Throw a not found error
    throw createNotFoundError('User not found');
  }
  
  if (!isValidOperation(body)) {
    // Throw a validation error with details
    throw createValidationError('Invalid operation', {
      field: 'operation',
      reason: 'Operation not supported',
    });
  }
  
  // Or create custom errors
  throw new AppError(
    ErrorCode.CONFLICT,
    'User already exists',
    { userId: body.userId }
  );
});
```

Errors are automatically converted to HTTP responses:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

## Correlation IDs

Correlation IDs are automatically generated for each request or extracted from the `x-correlation-id` header:

```typescript
import { createHandler, getCorrelationId } from '@qops/hub-kit';

const handler = createHandler(async (request, context, { correlationId }) => {
  // Use correlation ID in logs
  context.log(`Processing request ${correlationId}`);
  
  // Or get it from context
  const id = getCorrelationId(context);
  
  // Pass to downstream services
  await callDownstreamService({
    headers: { 'x-correlation-id': correlationId },
  });
  
  return {
    status: 200,
    jsonBody: { correlationId },
  };
});
```

The correlation ID is automatically added to response headers.

## Authentication Utilities

Access authenticated user data:

```typescript
import { createHandler, getAuthUser, UserRole } from '@qops/hub-kit';

const handler = createHandler(
  async (request, context, { user }) => {
    // User is available in parsedData
    console.log('User ID:', user?.sub);
    console.log('User email:', user?.email);
    console.log('User roles:', user?.roles);
    
    // Or get from context
    const authUser = getAuthUser(context);
    
    return {
      status: 200,
      jsonBody: { user },
    };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
  }
);
```

## API Reference

### `createHandler(handler, config)`

Creates an Azure Function handler with built-in middleware.

**Parameters:**

- `handler`: Function that handles the request
  - `request`: Azure Functions `HttpRequest`
  - `context`: Azure Functions `InvocationContext`
  - `parsedData`: Parsed and validated request data
    - `body`: Validated request body (if `bodySchema` is provided)
    - `query`: Validated query parameters (if `querySchema` is provided)
    - `user`: Authenticated user (if `jwtConfig` is provided)
    - `correlationId`: Request correlation ID
- `config`: Handler configuration
  - `jwtConfig`: JWT configuration object
    - `secret`: Secret or public key for verification
    - `algorithms`: Array of allowed algorithms (default: `['HS256']`)
    - `issuer`: Expected issuer
    - `audience`: Expected audience
  - `requiredRoles`: Array of required roles (at least one must match)
  - `bodySchema`: Zod schema for request body validation
  - `querySchema`: Zod schema for query parameters validation
  - `enableLogging`: Enable request/response logging (default: `false`)

**Returns:** Azure Function handler

### Error Types

- `AppError`: Base application error
- `ErrorCode`: Enum of standard error codes
- `createValidationError(message, details)`: Create validation error
- `createUnauthorizedError(message)`: Create unauthorized error
- `createForbiddenError(message)`: Create forbidden error
- `createNotFoundError(message)`: Create not found error

### Auth Types

- `UserRole`: Enum with `MEMBER` and `ADMIN` roles
- `JwtPayload`: Interface for decoded JWT token
- `getAuthUser(context)`: Get authenticated user from context

### Correlation ID

- `getCorrelationId(context)`: Get correlation ID from context
- `CORRELATION_ID_HEADER`: Header name (`'x-correlation-id'`)

## Best Practices

1. **Environment Variables**: Store JWT secrets in environment variables
2. **Error Handling**: Use provided error types for consistent responses
3. **Validation**: Define Zod schemas for all inputs
4. **Logging**: Enable logging in development, consider disabling in production for performance
5. **Correlation IDs**: Pass correlation IDs to downstream services for distributed tracing
6. **OpenAPI**: Keep OpenAPI definitions in sync with your handlers

## Example Project Structure

```
my-api/
├── src/
│   ├── functions/
│   │   ├── users/
│   │   │   ├── create.ts
│   │   │   ├── get.ts
│   │   │   └── list.ts
│   │   └── health.ts
│   ├── schemas/
│   │   └── user.ts
│   └── openapi.ts
├── package.json
└── host.json
```

## License

MIT