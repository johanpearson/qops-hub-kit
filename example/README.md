# Example Azure Functions Project

This is a complete, working example of an Azure Functions v4 API using `@qops/hub-kit`.

## Features Demonstrated

✅ **JWT Authentication** - Login endpoint that returns JWT tokens  
✅ **Protected Endpoints** - Role-based access control with JWT validation  
✅ **Request Validation** - Type-safe validation using Zod schemas  
✅ **OpenAPI Documentation** - Auto-generated API docs  
✅ **Health Check** - Ready-to-use health endpoint  
✅ **Error Handling** - Consistent error responses  
✅ **Service Layer Pattern** - Business logic separated from handlers

## Prerequisites

- Node.js 18.x or later
- Azure Functions Core Tools v4 (`npm install -g azure-functions-core-tools@4`)
- The parent `@qops/hub-kit` package built (run `npm run build` in parent directory)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Link to Local Package

Since this example uses the local `@qops/hub-kit` package:

```bash
# From the parent directory (qops-hub-kit root)
npm run build
npm link

# From this example directory
npm link @qops/hub-kit
```

### 3. Build and Run

```bash
npm run build
func start
```

You should see output like:

```
Functions:

        getUser: [GET] http://localhost:7071/api/users/{id}

        health: [GET] http://localhost:7071/api/health

        listUsers: [GET] http://localhost:7071/api/users

        login: [POST] http://localhost:7071/api/auth/login

        openapi: [GET] http://localhost:7071/api/openapi.json
```

## Testing the API

### 1. Health Check (No authentication required)

```bash
curl http://localhost:7071/api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-08T19:00:00.000Z",
  "uptime": 123.45
}
```

### 2. View OpenAPI Documentation

```bash
curl http://localhost:7071/api/openapi.json
```

Copy the output and paste it into [Swagger Editor](https://editor.swagger.io/) to visualize your API.

### 3. Login to Get JWT Token

**Admin User:**

```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'
```

**Member User:**

```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","password":"member_password"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Save the token** for the next requests!

### 4. List All Users (Protected - Requires JWT)

```bash
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**

```json
{
  "users": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "member@example.com",
      "name": "Member User",
      "role": "member"
    }
  ],
  "total": 2
}
```

### 5. Get User by ID (Protected - Requires JWT)

```bash
# Replace USER_ID with an actual user ID from the list above
curl http://localhost:7071/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "admin"
}
```

### 6. Test Error Handling

**Invalid credentials:**

```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrong"}'
```

**Missing JWT token:**

```bash
curl http://localhost:7071/api/users
```

**Invalid user ID:**

```bash
curl http://localhost:7071/api/users/invalid-id \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Project Structure

```
example/
├── src/
│   ├── schemas/               # Shared Zod schemas
│   │   └── user.schemas.ts    # User-related schemas (reused in functions & OpenAPI)
│   ├── services/              # Business logic
│   │   └── user.service.ts    # User service with in-memory storage
│   └── functions/             # Azure Function handlers
│       ├── health.ts          # Health check endpoint
│       ├── openapi.ts         # OpenAPI documentation
│       ├── login.ts           # Authentication endpoint
│       ├── get-user.ts        # Get user by ID (protected)
│       └── list-users.ts      # List all users (protected)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── host.json                  # Azure Functions runtime config
└── local.settings.json        # Environment variables (local dev)
```

## Key Concepts

### 1. Schema Reuse

Schemas are defined once in `src/schemas/` and reused in both function handlers and OpenAPI documentation:

```typescript
// Define once
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Use in handler
createHandler(async (req, ctx, { body }) => { ... }, { bodySchema: loginSchema });

// Use in OpenAPI
builder.registerRoute({ requestBody: loginSchema, ... });
```

### 2. Service Layer Pattern

Business logic is separated into service files (`src/services/`), keeping handlers thin:

```typescript
// Service handles business logic
export async function authenticateUser(email: string, password: string): Promise<UserResponse> {
  // Complex authentication logic here
}

// Handler delegates to service
const handler = createHandler(async (req, ctx, { body }) => {
  const user = await authenticateUser(body.email, body.password);
  return { status: 200, jsonBody: user };
});
```

### 3. JWT Authentication

Protected endpoints use `jwtConfig` and `requiredRoles`:

```typescript
createHandler(
  async (req, ctx, { user }) => {
    // user.sub, user.email, user.name, user.role available
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER], // or [UserRole.ADMIN]
  },
);
```

## Test Credentials

**Admin User:**

- Email: `admin@example.com`
- Password: `admin_password`

**Member User:**

- Email: `member@example.com`
- Password: `member_password`

## Development Tips

### Watch Mode

For faster development, use watch mode to rebuild on file changes:

```bash
npm run watch
```

Then in another terminal:

```bash
func start
```

### Environment Variables

Edit `local.settings.json` to change environment variables:

```json
{
  "Values": {
    "JWT_SECRET": "your-secret-key-here"
  }
}
```

### Debugging

To debug in VS Code, add this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Node Functions",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "preLaunchTask": "func: host start"
    }
  ]
}
```

## Next Steps

- **Customize**: Modify the functions to fit your needs
- **Add Database**: Replace in-memory storage with Cosmos DB, SQL, etc.
- **Add More Endpoints**: Follow the same patterns for new functionality
- **Deploy to Azure**: Use Azure CLI or Azure DevOps pipelines
- **Add Tests**: Write unit tests using Vitest (see parent project)

## Learn More

- **API Reference**: See parent [README.md](../README.md)
- **Advanced Usage**: See [docs/ADVANCED.md](../docs/ADVANCED.md)
- **Azure Integrations**: See [docs/INTEGRATIONS.md](../docs/INTEGRATIONS.md)

## Troubleshooting

### "Cannot find module '@qops/hub-kit'"

Run `npm link @qops/hub-kit` from this directory after building and linking the parent package.

### "0 functions found"

Make sure you ran `npm run build` to compile TypeScript to JavaScript. Azure Functions looks for `.js` files in the `dist/` directory.

### Port Already in Use

If port 7071 is in use, specify a different port:

```bash
func start --port 7072
```
