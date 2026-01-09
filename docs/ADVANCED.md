# Advanced Usage

This guide covers advanced features and patterns for using @qops/hub-kit in production applications.

## Custom Error Handling

### Creating Custom Errors

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

// Simple error
throw new AppError(ErrorCode.NOT_FOUND, 'User not found');

// Error with additional details
throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
  field: 'email',
  reason: 'Must be a valid email address',
  value: 'not-an-email',
});

// Error with custom properties
class DuplicateEmailError extends AppError {
  constructor(email: string) {
    super(ErrorCode.CONFLICT, 'Email already exists', { email });
  }
}
```

### Available Error Codes

```typescript
enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST', // 400
  UNAUTHORIZED = 'UNAUTHORIZED', // 401
  FORBIDDEN = 'FORBIDDEN', // 403
  NOT_FOUND = 'NOT_FOUND', // 404
  CONFLICT = 'CONFLICT', // 409
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 422
  INTERNAL_ERROR = 'INTERNAL_ERROR', // 500
}
```

## Advanced Validation

### Complex Zod Schemas

```typescript
import { z } from '@qops/hub-kit';

// Nested objects
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zipCode: z.string().regex(/^\d{5}$/),
  country: z.string().length(2), // ISO country code
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(120),
  address: addressSchema,
  tags: z.array(z.string()).min(1).max(10),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Conditional validation
const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(1).max(100).optional(),
    password: z.string().min(8).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If password is provided, confirmPassword must match
      if (data.password) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords must match',
      path: ['confirmPassword'],
    },
  );
```

### Query Parameter Validation

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'email', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

const listUsersHandler = createHandler(
  async (request, context, { query }) => {
    // query is typed and validated
    const { page, limit, sort, order, search } = query;

    // Implement pagination logic
    const users = await getUsersWithPagination({ page, limit, sort, order, search });

    return { status: 200, jsonBody: users };
  },
  {
    querySchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN],
  },
);
```

## Role-Based Access Control (RBAC)

### Custom Role Validation

```typescript
import { createHandler, UserRole, JwtPayload } from '@qops/hub-kit';

// Allow multiple roles
const handler = createHandler(
  async (request, context, { user }) => {
    // User has either ADMIN or MEMBER role
    return { status: 200, jsonBody: { message: 'Access granted' } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN, UserRole.MEMBER],
  },
);

// Admin-only access
const adminHandler = createHandler(
  async (request, context, { user }) => {
    return { status: 200, jsonBody: { message: 'Admin access' } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN],
  },
);
```

### Resource-Based Authorization

```typescript
const updateUserHandler = createHandler(
  async (request, context, { user, body }) => {
    const targetUserId = request.params.id;

    // Users can only update their own profile, unless they're admin
    if (user.sub !== targetUserId && user.role !== UserRole.ADMIN) {
      throw new AppError(ErrorCode.FORBIDDEN, 'You can only update your own profile');
    }

    const updatedUser = await updateUser(targetUserId, body);
    return { status: 200, jsonBody: updatedUser };
  },
  {
    bodySchema: updateUserSchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER], // Base requirement
  },
);
```

## OpenAPI Advanced Configuration

### Adding Security Definitions

```typescript
import { OpenApiBuilder } from '@qops/hub-kit';

const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'Complete API documentation',
  servers: [
    {
      url: 'http://localhost:7071',
      description: 'Local development',
    },
    {
      url: 'https://my-api.azurewebsites.net',
      description: 'Production',
    },
  ],
});

// Security is automatically configured for JWT Bearer tokens
```

### Documenting Query Parameters

```typescript
builder.registerRoute({
  method: 'GET',
  path: '/api/users',
  summary: 'List users with pagination',
  tags: ['Users'],
  queryParams: z.object({
    page: z.number().int().min(1).describe('Page number'),
    limit: z.number().int().min(1).max(100).describe('Items per page'),
    sort: z.enum(['name', 'email', 'createdAt']).describe('Sort field').optional(),
    order: z.enum(['asc', 'desc']).describe('Sort order').optional(),
  }),
  responses: {
    200: {
      description: 'Paginated list of users',
      schema: paginatedUsersSchema,
    },
  },
  requiresAuth: true,
});
```

### Documenting Error Responses

```typescript
const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
  correlationId: z.string(),
  timestamp: z.string(),
});

builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  requestBody: createUserSchema,
  responses: {
    201: {
      description: 'User created successfully',
      schema: userResponseSchema,
    },
    400: {
      description: 'Invalid request data',
      schema: errorResponseSchema,
    },
    401: {
      description: 'Authentication required',
      schema: errorResponseSchema,
    },
    409: {
      description: 'User already exists',
      schema: errorResponseSchema,
    },
  },
  requiresAuth: true,
});
```

## Correlation IDs

Correlation IDs are automatically added to all requests for distributed tracing.

### Accessing Correlation IDs

```typescript
import { createHandler, getCorrelationId } from '@qops/hub-kit';

const handler = createHandler(
  async (request, context, { correlationId }) => {
    // Use correlation ID for logging
    console.log(`[${correlationId}] Processing request`);

    // Pass to external services
    const response = await fetch('https://external-api.com/data', {
      headers: {
        'X-Correlation-ID': correlationId,
      },
    });

    return { status: 200, jsonBody: { correlationId } };
  },
  { enableLogging: true },
);
```

### Custom Correlation ID Header

By default, the correlation ID is returned in the `X-Correlation-ID` response header. This is automatically handled by `createHandler`.

## Request Logging

### Structured Logging

```typescript
import { createHandler } from '@qops/hub-kit';

const handler = createHandler(
  async (request, context, { correlationId, user }) => {
    // Structured log with context
    context.log('Processing user request', {
      correlationId,
      userId: user?.sub,
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await processRequest();

      context.log('Request completed successfully', {
        correlationId,
        duration: Date.now() - startTime,
      });

      return { status: 200, jsonBody: result };
    } catch (error) {
      context.log.error('Request failed', {
        correlationId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  },
  {
    enableLogging: true, // Enables automatic request/response logging
    jwtConfig: { secret: process.env.JWT_SECRET! },
  },
);
```

## Performance Optimization

### Lazy Loading Services

```typescript
// services/user.service.ts
let dbClient: CosmosClient | null = null;

function getDbClient(): CosmosClient {
  if (!dbClient) {
    dbClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    });
  }
  return dbClient;
}

export async function getUserById(id: string) {
  const client = getDbClient();
  // ... rest of the code
}
```

### Response Caching

```typescript
const cache = new Map<string, { data: any; expiry: number }>();

const getCachedDataHandler = createHandler(
  async (request, context) => {
    const cacheKey = `data-${request.params.id}`;
    const now = Date.now();

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return {
        status: 200,
        jsonBody: cached.data,
        headers: { 'X-Cache': 'HIT' },
      };
    }

    // Fetch fresh data
    const data = await fetchData(request.params.id);

    // Update cache (5 minute TTL)
    cache.set(cacheKey, {
      data,
      expiry: now + 5 * 60 * 1000,
    });

    return {
      status: 200,
      jsonBody: data,
      headers: { 'X-Cache': 'MISS' },
    };
  },
  { enableLogging: true },
);
```

## Testing Handlers

### Unit Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createHandler } from '@qops/hub-kit';

describe('User Handler', () => {
  it('should return user data', async () => {
    const handler = createHandler(
      async (request, context, { user }) => {
        return { status: 200, jsonBody: { userId: user.sub } };
      },
      {
        jwtConfig: { secret: 'test-secret' },
        requiredRoles: [UserRole.MEMBER],
      },
    );

    const mockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as any;

    const mockContext = {
      log: vi.fn(),
    } as any;

    const response = await handler(mockRequest, mockContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toHaveProperty('userId');
  });
});
```

## Configuring Base URL and Route Prefix

The base URL for Azure Functions is controlled by the Azure Functions runtime.

### Local Development

- **Default**: `http://localhost:7071/api/{function-name}`
- **Port**: Configure in `local.settings.json` via `Host.LocalHttpPort`
- **Route Prefix**: The `/api` prefix is set in `host.json`

### Production

- **Default**: `https://{function-app-name}.azurewebsites.net/api/{function-name}`
- **Custom Domains**: Configure in Azure Portal

### Customizing Route Prefix

Add this to your `host.json`:

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "v1"
    }
  }
}
```

**Examples:**

- `"routePrefix": "v1"` → `http://localhost:7071/v1/auth/login`
- `"routePrefix": ""` → `http://localhost:7071/auth/login`
- `"routePrefix": "api/v2"` → `http://localhost:7071/api/v2/auth/login`

## Environment Variables

### Required Variables

```env
JWT_SECRET=your-secret-key-here
FUNCTIONS_WORKER_RUNTIME=node
```

### Best Practices

1. **Never commit secrets** - Use `.env` files (gitignored) for local development
2. **Use Azure Key Vault** - For production secrets
3. **Validate at startup** - Check required variables exist

```typescript
// Validate environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'COSMOS_ENDPOINT', 'COSMOS_KEY'];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

## Best Practices

1. **Service Layer Pattern** - Keep business logic separate from handlers
2. **Input Validation** - Always validate user input with Zod schemas
3. **Error Handling** - Use AppError for consistent error responses
4. **OpenAPI Documentation** - Document all endpoints for better API discoverability
5. **Correlation IDs** - Use for distributed tracing and debugging
6. **Role-Based Access** - Implement proper authorization
7. **Testing** - Write unit tests for services, integration tests for handlers
8. **Logging** - Use structured logging with correlation IDs
9. **Environment Variables** - Store sensitive data securely
10. **Type Safety** - Leverage TypeScript's type system

## Next Steps

- **Azure Integrations**: See [Azure Integrations](./INTEGRATIONS.md)
- **Getting Started**: See [Getting Started Guide](./GETTING-STARTED.md)
- **API Reference**: See main [README.md](../README.md)
