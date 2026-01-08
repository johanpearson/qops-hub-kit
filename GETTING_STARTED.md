# Getting Started with @qops/hub-kit

This guide will help you get started with using @qops/hub-kit to build Azure Function v4 APIs.

## Prerequisites

- Node.js 18 or later
- Azure Functions Core Tools v4
- Basic understanding of TypeScript and Azure Functions

## Installation

Since this is a private npm package, you'll need to configure your npm registry or install from the repository.

```bash
npm install @qops/hub-kit
```

## Create Your First Function

### 1. Initialize an Azure Functions Project

```bash
func init my-api --typescript
cd my-api
npm install @qops/hub-kit
```

### 2. Create a Simple Function

Create `src/functions/hello.ts`:

```typescript
import { app } from '@azure/functions';
import { createHandler } from '@qops/hub-kit';

const helloHandler = createHandler(
  async (request, context, { correlationId }) => {
    return {
      status: 200,
      jsonBody: {
        message: 'Hello World!',
        correlationId,
      },
    };
  }
);

app.http('hello', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'hello',
  handler: helloHandler,
});
```

### 3. Run Locally

```bash
npm start
```

Visit `http://localhost:7071/api/hello`

## Add Authentication

### 1. Configure JWT Secret

Create a `.env` file or set environment variable:

```bash
JWT_SECRET=your-secret-key
```

### 2. Create Protected Endpoint

```typescript
import { createHandler, UserRole } from '@qops/hub-kit';

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
      secret: process.env.JWT_SECRET!,
    },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  }
);
```

### 3. Test with JWT Token

Generate a test token (use your JWT library of choice):

```bash
curl http://localhost:7071/api/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Add Request Validation

```typescript
import { createHandler, z } from '@qops/hub-kit';

const createItemSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
});

const createItemHandler = createHandler(
  async (request, context, { body }) => {
    // body is validated and typed
    const newItem = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
    };
    
    return {
      status: 201,
      jsonBody: newItem,
    };
  },
  {
    bodySchema: createItemSchema,
    enableLogging: true,
  }
);
```

## Generate OpenAPI Documentation

```typescript
import { OpenApiBuilder, z } from '@qops/hub-kit';

const openApiBuilder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'My awesome API',
});

openApiBuilder.registerRoute({
  method: 'POST',
  path: '/api/items',
  summary: 'Create a new item',
  tags: ['Items'],
  requestBody: createItemSchema,
  responses: {
    201: {
      description: 'Item created',
      schema: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        price: z.number(),
        createdAt: z.string(),
      }),
    },
  },
});

// Serve the OpenAPI document
const openApiHandler = createHandler(async () => {
  return {
    status: 200,
    jsonBody: openApiBuilder.generateDocument(),
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

The package handles errors automatically:

```typescript
import { createHandler, createNotFoundError } from '@qops/hub-kit';

const getUserHandler = createHandler(async (request, context) => {
  const userId = request.params.id;
  const user = await findUser(userId);
  
  if (!user) {
    throw createNotFoundError('User not found');
  }
  
  return {
    status: 200,
    jsonBody: user,
  };
});
```

Errors are automatically converted to proper HTTP responses with consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

## Next Steps

- Check out the [examples](./examples) directory for more complete examples
- Read the [API Reference](./README.md#api-reference) for detailed documentation
- See [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to contribute

## Common Patterns

### Middleware Composition

You can create reusable handler configurations:

```typescript
const authConfig = {
  jwtConfig: {
    secret: process.env.JWT_SECRET!,
  },
  enableLogging: true,
};

const adminConfig = {
  ...authConfig,
  requiredRoles: [UserRole.ADMIN],
};

// Use in multiple handlers
const handler1 = createHandler(async () => { ... }, adminConfig);
const handler2 = createHandler(async () => { ... }, adminConfig);
```

### Correlation ID Tracking

Pass correlation IDs to downstream services:

```typescript
const handler = createHandler(
  async (request, context, { correlationId }) => {
    const result = await fetch('https://api.example.com/data', {
      headers: {
        'x-correlation-id': correlationId,
      },
    });
    
    return {
      status: 200,
      jsonBody: await result.json(),
    };
  }
);
```

## Troubleshooting

### JWT Token Invalid

- Ensure your secret matches between token generation and verification
- Check token expiration
- Verify token format is `Bearer <token>`

### Validation Errors

- Check request body matches the schema
- Ensure proper content-type header (`application/json`)
- Review Zod schema definitions

### Build Errors

```bash
npm run clean
npm install
npm run build
```

## Support

For issues and questions, please open an issue on GitHub.
