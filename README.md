# @qops/hub-kit

A lightweight utility package for creating Azure Function v4 APIs with TypeScript. Eliminates boilerplate for JWT authentication, request validation, error handling, and more.

## Features

✅ **Simple Handler Wrapper** - Single function that handles all middleware  
✅ **JWT Authentication** - Built-in token verification with role-based access control  
✅ **Request Validation** - Type-safe validation using Zod schemas  
✅ **Error Handling** - Consistent error responses with HTTP status mapping  
✅ **Correlation IDs** - Automatic request tracking for distributed tracing  
✅ **OpenAPI Support** - Generate OpenAPI v3 documentation from Zod schemas

## Installation

```bash
npm install @qops/hub-kit zod jsonwebtoken
npm install -D @types/jsonwebtoken
```

## Quick Start

### 1. Basic Handler (No Auth)

```typescript
// functions/hello.ts
import { createHandler, z } from '@qops/hub-kit';

const schema = z.object({
  name: z.string().min(1),
});

export default createHandler(
  async (request, context, { body }) => {
    return { 
      status: 200, 
      jsonBody: { message: `Hello, ${body.name}!` } 
    };
  },
  {
    bodySchema: schema,
    enableLogging: true,
  }
);
```

### 2. Protected Handler (With JWT Auth)

```typescript
// functions/get-user.ts
import { createHandler, UserRole } from '@qops/hub-kit';

export default createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;
    // Fetch user from database
    const userData = await getUserById(userId);
    
    return { status: 200, jsonBody: userData };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER], // or [UserRole.ADMIN]
    enableLogging: true,
  }
);
```

### 3. Login Handler (Generate JWT)

```typescript
// functions/login.ts
import { createHandler, z } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default createHandler(
  async (request, context, { body }) => {
    // Verify credentials (from database)
    const user = await authenticateUser(body.email, body.password);
    
    // Generate JWT with required claims
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // 'admin' or 'member'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    return { status: 200, jsonBody: { token, user } };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  }
);
```

## Handler Options

```typescript
interface HandlerOptions {
  // Request validation
  bodySchema?: ZodSchema;           // Validate request body
  querySchema?: ZodSchema;          // Validate query parameters
  
  // Authentication
  jwtConfig?: {
    secret: string;                 // JWT secret key
    algorithms?: string[];          // Default: ['HS256']
  };
  requiredRoles?: UserRole[];       // Require specific roles
  
  // Other
  enableLogging?: boolean;          // Log requests/responses
}
```

## Handler Context

The handler function receives enriched context:

```typescript
async (request, context, enrichedContext) => {
  // enrichedContext includes:
  const {
    body,          // Validated request body (if bodySchema provided)
    query,         // Validated query params (if querySchema provided)
    user,          // JWT payload (if jwtConfig provided): { sub, email, name, role }
    correlationId, // Unique ID for request tracking
  } = enrichedContext;
}
```

## Error Handling

Use `AppError` for consistent error responses:

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

// Throw errors anywhere in your code
throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid input', { field: 'email' });

// Available error codes:
// - BAD_REQUEST (400)
// - UNAUTHORIZED (401)
// - FORBIDDEN (403)
// - NOT_FOUND (404)
// - CONFLICT (409)
// - VALIDATION_ERROR (422)
// - INTERNAL_ERROR (500)
```

## Integration Examples

### Azure Cosmos DB

```typescript
// services/user.service.ts
import { CosmosClient } from '@azure/cosmos';
import { AppError, ErrorCode } from '@qops/hub-kit';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const container = client.database('mydb').container('users');

export async function getUserById(id: string) {
  try {
    const { resource } = await container.item(id, id).read();
    return resource;
  } catch (error: any) {
    if (error.code === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database error');
  }
}
```

### Azure Blob Storage

```typescript
// services/file.service.ts
import { BlobServiceClient } from '@azure/storage-blob';
import { AppError, ErrorCode } from '@qops/hub-kit';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
const containerClient = blobServiceClient.getContainerClient('uploads');

export async function uploadFile(buffer: Buffer, fileName: string) {
  try {
    const blobClient = containerClient.getBlockBlobClient(fileName);
    await blobClient.upload(buffer, buffer.length);
    return blobClient.url;
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Upload failed');
  }
}

// Handler for file upload (no bodySchema for custom parsing)
export default createHandler(
  async (request, context, { user }) => {
    const body = await request.json();
    const fileBuffer = Buffer.from(body.data, 'base64');
    
    const url = await uploadFile(fileBuffer, body.filename);
    return { status: 201, jsonBody: { url } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    // No bodySchema - allows manual body parsing
  }
);
```

## OpenAPI Documentation

Generate OpenAPI v3 documentation:

```typescript
import { OpenApiBuilder, z } from '@qops/hub-kit';

const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  description: 'API documentation',
});

// Register routes
builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  requestBody: z.object({
    email: z.string().email(),
    name: z.string(),
  }),
  responses: {
    201: {
      description: 'User created',
      schema: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    },
  },
  requiresAuth: true,
});

// Generate OpenAPI document
const openApiDoc = builder.generateDocument();

// Serve it
export default createHandler(
  async () => ({ status: 200, jsonBody: openApiDoc }),
  { enableLogging: false }
);
```

## Environment Variables

Required environment variables:

```env
JWT_SECRET=your-secret-key-here
FUNCTIONS_WORKER_RUNTIME=node
```

Optional (for examples above):

```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

## Best Practices

1. **Service Layer**: Keep business logic in service files, separate from handlers
2. **Error Handling**: Use `AppError` for consistent error responses
3. **Environment Variables**: Store secrets in environment variables
4. **JWT Claims**: Always include `sub`, `email`, `name`, and `role` in JWT tokens
5. **Validation**: Use Zod schemas for all user input
6. **Testing**: Service functions are easy to unit test independently

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

## License

MIT
