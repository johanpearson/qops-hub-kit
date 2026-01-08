# Test Project - Using @qops/hub-kit

This is a test project that demonstrates using the `@qops/hub-kit` package in a real Azure Functions application.

## Purpose

This project validates that the package works correctly when consumed as a dependency:

- ✅ Package can be installed and imported
- ✅ `createHandler` wrapper functions correctly
- ✅ JWT authentication and role-based authorization work
- ✅ Request validation with Zod schemas works
- ✅ Error handling and responses are consistent
- ✅ Correlation ID tracking functions
- ✅ Service layer separation pattern works
- ✅ All TypeScript types are properly exported

## Setup

Since this test project references the parent package with `file:..`, you need to:

1. **Build the parent package first:**

```bash
cd ..
npm install
npm run build
```

2. **Setup this test project:**

```bash
cd test-project

# Create node_modules structure
mkdir -p node_modules/@qops/hub-kit

# Copy the built package
cp -r ../dist ../package.json node_modules/@qops/hub-kit/

# Install Azure Functions and other dependencies manually
# (avoiding the parent's prepare script)
npm install --no-save @azure/functions jsonwebtoken @types/node typescript
```

3. **Build the test project:**

```bash
npm run build
```

## Project Structure

```
test-project/
├── src/
│   ├── services/
│   │   └── user.service.ts    # Business logic using package
│   ├── functions/
│   │   ├── login.ts            # Login endpoint
│   │   ├── get-user.ts         # Get user by ID
│   │   └── list-users.ts       # List users
│   └── index.ts                # Azure Functions registration
├── package.json
├── tsconfig.json
└── host.json
```

## What This Tests

### 1. Package Installation

The package is consumed via `devDependencies`:

```json
{
  "devDependencies": {
    "@qops/hub-kit": "file:.."
  }
}
```

### 2. Service Layer

Uses the package's error types and follows the recommended pattern:

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

export async function authenticateUser(email: string, password: string) {
  // Business logic
  if (!user) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }
  return user;
}
```

### 3. Function Handlers

Uses `createHandler` with all features:

```typescript
import { createHandler, UserRole, z } from '@qops/hub-kit';

const loginHandler = createHandler(
  async (_request, _context, { body }) => {
    const user = await authenticateUser(body.email, body.password);
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '24h' });
    return { status: 200, jsonBody: { token, user } };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  },
);
```

### 4. Protected Endpoints

Tests JWT auth with role-based access control:

```typescript
const getUserHandler = createHandler(
  async (request, _context, { user: _user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);
    return { status: 200, jsonBody: userData };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    enableLogging: true,
  },
);
```

## Pre-seeded Users

The service includes two test users:

1. **Admin User**

   - Email: `admin@example.com`
   - Password: `admin_password`
   - Role: `admin`

2. **Member User**
   - Email: `member@example.com`
   - Password: `member_password`
   - Role: `member`

## Testing the API (if running)

### 1. Login

```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'
```

### 2. Get User by ID

```bash
export TOKEN="<your-token>"
curl http://localhost:7071/api/users/<user-id> \
  -H "Authorization: ******"
```

### 3. List All Users

```bash
curl http://localhost:7071/api/users \
  -H "Authorization: ******"
```

## Validation

This test project demonstrates that:

- ✅ The package can be consumed as a dependency
- ✅ All public APIs are accessible
- ✅ TypeScript types work correctly
- ✅ The service/handler pattern is practical and clean
- ✅ Error handling is consistent
- ✅ JWT authentication integrates seamlessly
- ✅ Validation with Zod works as expected
