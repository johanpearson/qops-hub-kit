# @qops/hub-kit

A lightweight utility package for creating Azure Function v4 APIs with TypeScript. Eliminates boilerplate for JWT authentication, request validation, error handling, and more.

## Features

✅ **Simple Handler Wrapper** - Single function that handles all middleware  
✅ **JWT Authentication** - Built-in token verification with role-based access control  
✅ **Request Validation** - Type-safe validation using Zod schemas  
✅ **Error Handling** - Consistent error responses with HTTP status mapping  
✅ **Correlation IDs** - Automatic request tracking for distributed tracing  
✅ **OpenAPI Support** - Generate OpenAPI v3 documentation from Zod schemas

---

## Getting Started - Complete Example

This section shows you how to set up a complete Azure Functions project using @qops/hub-kit from scratch.

### 1. Create .npmrc (if using private registry)

```ini
# .npmrc
@qops:registry=https://your-private-registry.com/
//your-private-registry.com/:_authToken=${NPM_TOKEN}
```

### 2. Install Dependencies

```bash
npm init -y
npm install @qops/hub-kit zod jsonwebtoken @azure/functions
npm install -D @types/node @types/jsonwebtoken typescript @azure/functions
```

### 3. Project Structure

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
│       ├── login.ts
│       ├── get-user.ts
│       └── list-users.ts
└── README.md
```

### 4. Configuration Files

**tsconfig.json**
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

**package.json** (add these scripts)
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

**host.json**
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

**local.settings.json**
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

### 5. Service Layer (Business Logic)

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
  return Array.from(users.values()).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
```

### 6. Function Handlers

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
      { expiresIn: '24h' }
    );

    return {
      status: 200,
      jsonBody: { token, user },
    };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  }
);

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: loginHandler,
});
```

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
  }
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
  }
);

app.http('listUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: listUsersHandler,
});
```

### 7. OpenAPI Documentation (Optional)

Add an OpenAPI endpoint to document your API:

**src/functions/openapi.ts**
```typescript
import { app } from '@azure/functions';
import { OpenApiBuilder } from '@qops/hub-kit';
import { z } from 'zod';

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

You can now access your API documentation at `http://localhost:7071/api/openapi.json` and use it with tools like Swagger UI or Postman.

### 8. Test Your API

```bash
# Build
npm run build

# Start Azure Functions locally
func start

# Test login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Response: { "token": "eyJhbGc...", "user": {...} }

# Test protected endpoint
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

That's it! You now have a working Azure Functions API with authentication, validation, and error handling.

---

## Configuring Base URL and Route Prefix

The base URL for Azure Functions is controlled by the Azure Functions runtime, not by this package.

### Local Development

- **Default**: `http://localhost:7071/api/{function-name}`
- **Port**: Configure in `local.settings.json` via `Host.LocalHttpPort` (defaults to 7071)
- **Route Prefix**: The `/api` prefix is set in `host.json`

### Azure (Production)

- **Default**: `https://{function-app-name}.azurewebsites.net/api/{function-name}`
- **Custom Domains**: Configure in Azure Portal under Custom domains

### Customizing the Route Prefix

To change the `/api` prefix (or remove it entirely), add this to your `host.json`:

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "v1"  // Changes /api to /v1
      // or use "" to remove the prefix entirely
    }
  }
}
```

**Examples:**
- `"routePrefix": "v1"` → `http://localhost:7071/v1/auth/login`
- `"routePrefix": ""` → `http://localhost:7071/auth/login`
- `"routePrefix": "api/v2"` → `http://localhost:7071/api/v2/auth/login`

The function route paths (e.g., `auth/login`, `users/{id}`) are defined when you register handlers in your function configuration using the `route` property.

---

## Installation

```bash
npm install @qops/hub-kit zod jsonwebtoken
npm install -D @types/jsonwebtoken
```

## API Reference

### Basic Handler (No Auth)

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

### Protected Handler (With JWT Auth)

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

### Login Handler (Generate JWT)

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
