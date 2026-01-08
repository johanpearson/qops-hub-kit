# @qops/hub-kit

A utility package for creating Azure Function v4 APIs with TypeScript. Removes boilerplate for auth, validation, error handling, and OpenAPI docs.

## Installation

```bash
npm install @qops/hub-kit
```

## Quick Start

### Project Structure

```
my-api/
├── src/
│   ├── services/
│   │   └── user.service.ts      # Business logic
│   ├── functions/
│   │   ├── login.ts              # Login endpoint
│   │   ├── get-user.ts           # Get user by ID
│   │   └── list-users.ts         # List all users
│   └── index.ts                  # Register functions
├── package.json
└── host.json
```

### 1. Create Service Layer (Business Logic)

**`src/services/user.service.ts`**

```typescript
import { randomUUID } from 'crypto';
import { AppError, ErrorCode } from '@qops/hub-kit';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
}

// In-memory store (use database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

// Seed admin user
const adminId = randomUUID();
users.set(adminId, {
  id: adminId,
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed_admin_password', // Use bcrypt in production
  role: 'admin',
});
emailIndex.set('admin@example.com', adminId);

export async function authenticateUser(email: string, password: string) {
  const userId = emailIndex.get(email);
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  const user = users.get(userId);
  if (!user || user.passwordHash !== \`hashed_\${password}\`) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string) {
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

export async function listUsers() {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
```

### 2. Create Functions

**`src/functions/login.ts`**

```typescript
import { app } from '@azure/functions';
import { createHandler, z } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../services/user.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginHandler = createHandler(
  async (request, context, { body }) => {
    const user = await authenticateUser(body.email, body.password);

    const token = jwt.sign(user, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h',
    });

    return {
      status: 200,
      jsonBody: {
        token,
        user,
      },
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

**`src/functions/get-user.ts`**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service';

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
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
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

**`src/functions/list-users.ts`**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { listUsers } from '../services/user.service';

const listUsersHandler = createHandler(
  async (request, context, { user }) => {
    const users = await listUsers();

    return {
      status: 200,
      jsonBody: {
        users,
        total: users.length,
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
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

### 3. Test Your API

```bash
# Start the function app
npm start

# Login to get token
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Use the token from the response
export TOKEN="<your-token-here>"

# Get user by ID
curl http://localhost:7071/api/users/<user-id> \
  -H "Authorization: Bearer $TOKEN"

# List all users
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## JWT Claims

The JWT token includes these claims:

- `sub`: User ID
- `email`: User email
- `name`: User name
- `role`: User role ('admin' or 'member')

## API Reference

### `createHandler(handler, config)`

Creates an Azure Function handler with built-in middleware.

**Config options:**

- `bodySchema`: Zod schema for request body validation
- `querySchema`: Zod schema for query parameters validation
- `jwtConfig`: JWT configuration
  - `secret`: Secret for JWT verification
  - `algorithms`: Allowed algorithms (default: `['HS256']`)
- `requiredRoles`: Array of required roles (`UserRole.MEMBER` | `UserRole.ADMIN`)
- `enableLogging`: Enable request/response logging
- `skipBodyParsing`: Skip automatic JSON parsing (useful for file uploads)

**Handler receives:**

- `request`: Azure Functions `HttpRequest`
- `context`: Azure Functions `InvocationContext`
- `parsedData`: Object containing:
  - `body`: Validated request body
  - `query`: Validated query parameters
  - `user`: Authenticated user (contains `sub`, `email`, `name`, `role`)
  - `correlationId`: Request correlation ID

### File Uploads

Handle file uploads by skipping automatic body parsing:

```typescript
import { createHandler, UserRole } from '@qops/hub-kit';

export default createHandler(
  async (request, _context, { user }) => {
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    if (contentType.includes('application/json')) {
      // Handle JSON with base64-encoded file
      const body = await request.json();
      const fileBuffer = Buffer.from(body.fileData, 'base64');
      // Upload to storage...
    } else {
      // Handle raw binary upload
      const arrayBuffer = await request.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      // Upload to storage...
    }

    return { status: 201, jsonBody: { message: 'File uploaded' } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    skipBodyParsing: true, // Important for file uploads
  },
);
```

### Database Integration

The package works seamlessly with any database. Keep database logic in the service layer:

**PostgreSQL Example:**

```typescript
// services/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function getUserFromDb(id: string) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
```

**Azure Cosmos DB Example:**

```typescript
// services/database.ts
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const container = client.database('mydb').container('users');

export async function getUserFromCosmos(id: string) {
  const { resource } = await container.item(id, id).read();
  return resource;
}
```

See `example/src/services/database.example.ts` for more examples (MongoDB, Azure SQL, MySQL).

### Blob Storage Integration

**Azure Blob Storage Example:**

```typescript
// services/storage.ts
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
const containerClient = blobServiceClient.getContainerClient('uploads');

export async function uploadToBlob(fileBuffer: Buffer, fileName: string) {
  const blobClient = containerClient.getBlockBlobClient(fileName);
  await blobClient.upload(fileBuffer, fileBuffer.length);
  return blobClient.url;
}
```

See `example/src/services/blob-storage.example.ts` for complete integration examples.

### Error Handling

Use the provided error types for consistent responses:

```typescript
import { AppError, ErrorCode, createNotFoundError } from '@qops/hub-kit';

// Throw errors
throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
throw createNotFoundError('User not found');
```

**Error codes:**

- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `VALIDATION_ERROR` (422)
- `INTERNAL_ERROR` (500)

## License

MIT

## Development

### Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Coverage requirements: 80% for lines, functions, branches, and statements.

### Linting & Formatting

Format code:

```bash
npm run format
```

Lint code:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

### Pre-commit Hooks

Husky runs automatically on commit to:

- Format all staged files with Prettier
- Fix linting issues with ESLint
- Ensure code quality before commit
