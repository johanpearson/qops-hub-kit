# @qops/hub-kit

A lightweight utility package for creating Azure Function v4 APIs with TypeScript. Eliminates boilerplate for JWT authentication, request validation, error handling, and OpenAPI documentation.

## Features

✅ **Simple Handler Wrapper** - Single function that handles all middleware  
✅ **JWT Authentication** - Built-in token verification with role-based access control  
✅ **Request Validation** - Type-safe validation using Zod schemas  
✅ **Error Handling** - Consistent error responses with HTTP status mapping  
✅ **Correlation IDs** - Automatic request tracking for distributed tracing  
✅ **OpenAPI Support** - Generate OpenAPI v3 documentation from Zod schemas  
✅ **Health Check Endpoint** - Ready-to-use health check handler

---

## Quick Start

### Installation

```bash
npm install @qops/hub-kit zod jsonwebtoken @azure/functions
npm install -D @types/jsonwebtoken typescript
```

### Basic Example with OpenAPI

Create a simple API with authentication and OpenAPI documentation:

**1. Create a handler with validation:**

```typescript
// functions/create-user.ts
import { app } from '@azure/functions';
import { createHandler, UserRole, z } from '@qops/hub-kit';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const handler = createHandler(
  async (request, context, { body, user }) => {
    // body is validated and typed
    const newUser = await createUser(body);
    return { status: 201, jsonBody: newUser };
  },
  {
    bodySchema: createUserSchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN],
    enableLogging: true,
  },
);

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler,
});
```

**2. Add OpenAPI documentation:**

```typescript
// functions/openapi.ts
import { app } from '@azure/functions';
import { OpenApiBuilder, z } from '@qops/hub-kit';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
});

const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'Azure Functions API with JWT authentication',
});

builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  tags: ['Users'],
  requestBody: createUserSchema,
  responses: {
    201: {
      description: 'User created',
      schema: userResponseSchema,
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
```

**3. Test your API:**

```bash
# Build and run
npm run build
func start

# View OpenAPI docs
curl http://localhost:7071/api/openapi.json

# Test endpoint
curl -X POST http://localhost:7071/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John Doe"}'
```

---

## Complete Setup Guide

For a complete step-by-step guide including project structure, configuration files, service layer patterns, and all function handlers, see:

👉 **[Getting Started Guide](./docs/GETTING-STARTED.md)**

---

## Core Features

### 1. Health Check (No Configuration Needed)

```typescript
import { app } from '@azure/functions';
import { createHealthHandler } from '@qops/hub-kit';

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: createHealthHandler(),
});
```

### 2. Request Validation with Zod

```typescript
import { createHandler, z } from '@qops/hub-kit';

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18),
});

const handler = createHandler(
  async (request, context, { body }) => {
    // body is fully validated and typed
    return { status: 200, jsonBody: body };
  },
  { bodySchema: schema },
);
```

### 3. JWT Authentication & Authorization

```typescript
import { createHandler, UserRole } from '@qops/hub-kit';

const handler = createHandler(
  async (request, context, { user }) => {
    // user contains: { sub, email, name, role }
    return { status: 200, jsonBody: { userId: user.sub } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN], // or [UserRole.MEMBER]
  },
);
```

### 4. OpenAPI Documentation

```typescript
import { OpenApiBuilder, z } from '@qops/hub-kit';

const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
});

builder.registerRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get user by ID',
  tags: ['Users'],
  responses: {
    200: { description: 'User found', schema: userSchema },
    404: { description: 'User not found' },
  },
  requiresAuth: true,
});

const openApiDoc = builder.generateDocument();
```

### 5. Error Handling

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

// Throw errors anywhere in your code
throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid email', { field: 'email' });

// Automatic HTTP status mapping:
// BAD_REQUEST → 400, UNAUTHORIZED → 401, FORBIDDEN → 403
// NOT_FOUND → 404, CONFLICT → 409, VALIDATION_ERROR → 422
// INTERNAL_ERROR → 500
```

### 6. Correlation IDs (Automatic)

Every request automatically gets a correlation ID for distributed tracing:

```typescript
const handler = createHandler(
  async (request, context, { correlationId }) => {
    console.log(`[${correlationId}] Processing request`);
    return { status: 200, jsonBody: { correlationId } };
  },
  { enableLogging: true },
);
// Response includes X-Correlation-ID header
```

---

## Documentation

### 📚 Detailed Guides

- **[Getting Started](./docs/GETTING-STARTED.md)** - Complete setup guide with all configuration files
- **[Advanced Usage](./docs/ADVANCED.md)** - Complex validation, RBAC, testing, and best practices
- **[Azure Integrations](./docs/INTEGRATIONS.md)** - Cosmos DB, Blob Storage, Service Bus, Key Vault, and more

### 📖 API Reference

#### Handler Options

```typescript
interface HandlerOptions {
  bodySchema?: ZodSchema; // Validate request body
  querySchema?: ZodSchema; // Validate query parameters
  jwtConfig?: {
    secret: string; // JWT secret key
    algorithms?: string[]; // Default: ['HS256']
  };
  requiredRoles?: UserRole[]; // Require specific roles
  enableLogging?: boolean; // Log requests/responses
}
```

#### Handler Context

```typescript
async (request, context, enrichedContext) => {
  const {
    body, // Validated body (if bodySchema provided)
    query, // Validated query params (if querySchema provided)
    user, // JWT payload (if jwtConfig provided)
    correlationId, // Unique request ID
  } = enrichedContext;
};
```

#### Error Codes

- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `VALIDATION_ERROR` (422)
- `INTERNAL_ERROR` (500)

---

## Best Practices

1. **Always use OpenAPI** - Document all endpoints for better API discoverability and testing
2. **Service Layer Pattern** - Keep business logic separate from handlers
3. **Input Validation** - Use Zod schemas for all user input
4. **Error Handling** - Use `AppError` for consistent error responses
5. **JWT Claims** - Always include `sub`, `email`, `name`, and `role` in tokens
6. **Environment Variables** - Store secrets in environment variables, never in code

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

---

## Environment Variables

Required for JWT authentication:

```env
JWT_SECRET=your-secret-key-here
FUNCTIONS_WORKER_RUNTIME=node
```

For Azure service integrations, see [Azure Integrations Guide](./docs/INTEGRATIONS.md).

---

## Contributing

Contributions are welcome! Please ensure:

- All tests pass (`npm test`)
- Code coverage ≥ 80% (`npm run test:coverage`)
- Code is formatted (`npm run format`)
- No linting errors (`npm run lint`)

---

## License

MIT

---

## Links

- **Repository**: [github.com/johanpearson/qops-hub-kit](https://github.com/johanpearson/qops-hub-kit)
- **Issues**: [Report bugs or request features](https://github.com/johanpearson/qops-hub-kit/issues)
- **Author**: Johan Pearson
