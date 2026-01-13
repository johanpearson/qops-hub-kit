# Copilot Instructions for [Your Project Name]

> **Note**: This template is designed for migrating Express.js applications to Azure Functions v4 using @qops/hub-kit. Copy this to your project's `.github/copilot-instructions.md` and customize the "Project-Specific Services" section.

## Migration from Express to Azure Functions

This project uses **@qops/hub-kit** to migrate from Express.js to Azure Functions v4 with minimal code changes.

### Key Differences from Express

| Express Pattern                       | Azure Functions Pattern                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `app.get('/users', handler)`          | `app.http('getUsers', { methods: ['GET'], route: 'users', handler })` |
| `req.body`, `req.params`, `req.query` | `request.json()`, `request.params`, `request.query`                   |
| `res.status(200).json(data)`          | `return { status: 200, jsonBody: data }`                              |
| `next(error)` for errors              | `throw new AppError(ErrorCode.*, message)`                            |
| Express middleware                    | `createHandler` with options                                          |
| `routes/` directory                   | `functions/` directory                                                |
| `app.ts` or `server.ts`               | Individual function files + `openapi.ts`                              |

### Migration Checklist

- [ ] Set up Azure Functions project structure
- [ ] Configure package.json with required dependencies
- [ ] Set up tsconfig.json for ES modules
- [ ] Create host.json for Azure Functions runtime
- [ ] Move business logic from routes to services
- [ ] Convert route handlers to Azure Functions
- [ ] Implement JWT authentication with @qops/hub-kit
- [ ] Add request validation with Zod schemas
- [ ] Generate OpenAPI documentation
- [ ] Set up health check endpoint
- [ ] Configure environment variables
- [ ] Update tests for Azure Functions

## Project Setup

### Required Files

#### package.json

Critical fields for Azure Functions:

```json
{
  "name": "your-api-name",
  "version": "1.0.0",
  "type": "module", // ⚠️ REQUIRED for ES modules
  "main": "dist/functions/*.js", // ⚠️ REQUIRED - tells Azure Functions where to find handlers
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rm -rf dist",
    "start": "npm run build && func start",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --cache",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@qops/hub-kit": "^1.0.0", // ⚠️ REQUIRED
    "@azure/functions": "^4.0.0", // ⚠️ REQUIRED
    "jsonwebtoken": "^9.0.2", // For JWT auth
    "zod": "^3.22.4" // For validation
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

#### tsconfig.json

Required configuration for Azure Functions with ES modules:

```json
{
  "compilerOptions": {
    "target": "ES2022", // ⚠️ Modern target
    "module": "ES2022", // ⚠️ REQUIRED for ES modules
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "dist", // ⚠️ Must match Azure Functions expectations
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### host.json

Azure Functions runtime configuration:

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

#### local.settings.json

Local development environment variables (⚠️ DO NOT commit this file):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "JWT_SECRET": "your-secret-key-min-32-chars-replace-in-production"
  }
}
```

### Project Structure

**Old Express Structure:**

```
src/
├── routes/
│   ├── userRoutes.ts
│   └── authRoutes.ts
├── controllers/
│   ├── userController.ts
│   └── authController.ts
├── services/
│   └── userService.ts
├── middleware/
│   ├── auth.ts
│   └── validation.ts
└── app.ts or server.ts
```

**New Azure Functions Structure:**

```
src/
├── schemas/           # ⚠️ NEW - Shared Zod schemas
│   └── user.schemas.ts
├── services/          # ✅ KEEP - Business logic (same as Express)
│   └── user.service.ts
├── functions/         # ⚠️ NEW - Replaces routes/
│   ├── health.ts      # Health check endpoint
│   ├── openapi.ts     # OpenAPI documentation
│   ├── login.ts       # POST /auth/login
│   ├── get-user.ts    # GET /users/{id}
│   └── list-users.ts  # GET /users
└── types/             # Shared TypeScript types
    └── user.types.ts
```

**Key Changes:**

- ✅ **services/** stays the same - no changes needed!
- ❌ **routes/** becomes **functions/** - each route becomes a function file
- ❌ **controllers/** logic moves into function handlers or services
- ❌ **middleware/** replaced by `createHandler` options
- ❌ **app.ts** replaced by individual function files
- ✅ **schemas/** - NEW directory for Zod validation schemas

## Code Style & Conventions

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes, types for unions/aliases
- Export types alongside implementations

### Naming Conventions

- **camelCase**: Variables, functions, parameters
- **PascalCase**: Classes, interfaces, types, enums
- **UPPER_CASE**: Constants, enum values
- **Leading underscore**: Allowed for unused parameters (e.g., `_request`)
- **No trailing underscores**

### Code Formatting

- **Prettier** is the final authority on formatting
- Line length: 120 characters
- Single quotes for strings
- Trailing commas: all
- Semicolons: always
- 2 spaces for indentation

### Import Statements

⚠️ **CRITICAL**: When using ES modules (`"type": "module"` in package.json), **always include `.js` extension** in relative imports:

```typescript
// ✅ CORRECT
import { createUserSchema } from '../schemas/user.schemas.js';
import { getUserById } from '../services/user.service.js';

// ❌ WRONG - will cause runtime errors
import { createUserSchema } from '../schemas/user.schemas';
import { getUserById } from '../services/user.service';
```

## @qops/hub-kit Package Usage

### Converting Express Routes to Azure Functions

#### Express Route Example (OLD):

```typescript
// routes/userRoutes.ts
import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import { getUserById } from '../services/userService';

const router = express.Router();

router.get('/users/:id', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await getUserById(userId);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Azure Function Equivalent (NEW):

```typescript
// functions/get-user.ts
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js'; // ⚠️ Note .js extension

const getUserHandler = createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id; // Same as req.params.id
    const userData = await getUserById(userId);
    return { status: 200, jsonBody: userData }; // Replaces res.status().json()
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! }, // Replaces authenticateJWT middleware
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

### Service Layer (No Changes Needed!)

The good news: **Your existing service layer code works as-is!**

```typescript
// services/user.service.ts - SAME CODE AS EXPRESS
import { AppError, ErrorCode } from '@qops/hub-kit';

export async function getUserById(id: string) {
  const user = await db.findUser(id);
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
  }
  return user;
}
```

### Health Check Endpoint

Every Azure Functions app should have a health check:

```typescript
// functions/health.ts
import { app } from '@azure/functions';
import { createHealthHandler } from '@qops/hub-kit';

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: createHealthHandler(), // Built-in health check - no code needed!
});
```

### Authentication: Express JWT Middleware → @qops/hub-kit

#### Express JWT Middleware (OLD):

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

export const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Azure Function with @qops/hub-kit (NEW):

```typescript
// functions/protected-endpoint.ts
import { createHandler, UserRole } from '@qops/hub-kit';

export default createHandler(
  async (request, context, { user }) => {
    // user is automatically populated from JWT!
    // user contains: { sub, email, name, role }
    return { status: 200, jsonBody: { userId: user.sub } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! }, // JWT auth configured here
    requiredRoles: [UserRole.MEMBER], // Role-based access control
  },
);
```

**Role Hierarchy**: Admin users automatically have all member permissions. An endpoint with `requiredRoles: [UserRole.MEMBER]` accepts both admin and member users.

### Request Validation: Express Validator → Zod Schemas

#### Express with express-validator (OLD):

```typescript
// routes/userRoutes.ts
import { body, validationResult } from 'express-validator';

router.post(
  '/users',
  [body('email').isEmail(), body('name').isString().isLength({ min: 1 })],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request...
  },
);
```

#### Azure Function with Zod (NEW):

```typescript
// schemas/user.schemas.ts - Define once
import { z } from '@qops/hub-kit';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// functions/create-user.ts - Use everywhere
import { createHandler } from '@qops/hub-kit';
import { createUserSchema } from '../schemas/user.schemas.js';

export default createHandler(
  async (request, context, { body }) => {
    // body is automatically validated and typed!
    return { status: 201, jsonBody: await createUser(body) };
  },
  { bodySchema: createUserSchema }, // Validation configured here
);
```

### Error Handling: Express next(error) → AppError

#### Express Error Handling (OLD):

```typescript
// In route handler
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}

// Or with next()
if (!user) {
  const error = new Error('User not found');
  error.statusCode = 404;
  return next(error);
}
```

#### Azure Function Error Handling (NEW):

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

// Anywhere in your code (service, handler, etc.)
if (!user) {
  throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
}

// With additional details
throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
  field: 'email',
  reason: 'Must be valid email address',
});
```

**Available Error Codes:**

- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `VALIDATION_ERROR` (422)
- `INTERNAL_ERROR` (500)

### OpenAPI Documentation

**Always generate OpenAPI documentation** for your API:

```typescript
// functions/openapi.ts
import { app } from '@azure/functions';
import { OpenApiBuilder, healthCheckResponseSchema } from '@qops/hub-kit';
import { createUserSchema, userResponseSchema } from '../schemas/user.schemas.js';

const builder = new OpenApiBuilder({
  title: 'Your API',
  version: '1.0.0',
  description: 'Migrated from Express to Azure Functions',
});

// Register all your routes
builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  tags: ['Users'],
  requestBody: createUserSchema, // Reuse Zod schema!
  responses: {
    201: {
      description: 'User created',
      schema: userResponseSchema,
    },
  },
  requiresAuth: true,
});

builder.registerRoute({
  method: 'GET',
  path: '/api/health',
  summary: 'Health check',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Service is healthy',
      schema: healthCheckResponseSchema,
    },
  },
  requiresAuth: false,
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

Access at: `http://localhost:7071/api/openapi.json`

## Testing Standards

### Test Framework

- Use **Vitest** for all tests
- Place tests in `tests/` directory with `.test.ts` extension
- Name test files matching source files (e.g., `user.service.ts` → `user.service.test.ts`)

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('moduleName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Coverage Requirements

- Minimum coverage: 80% for lines, functions, branches, and statements
- Run with: `npm run test:coverage`
- Coverage reports: text (console), HTML, JSON, LCOV

### Test Guidelines

- Test public APIs only
- Test error cases and edge cases
- Mock external dependencies (database, HTTP calls, Azure services)
- Keep tests simple and readable
- One assertion per test when possible

## Linting & Formatting

### Pre-commit Hooks

- Husky runs lint-staged on commit
- Prettier formats all staged files
- ESLint fixes issues automatically
- Commit fails if linting errors remain

### Running Locally

- Format code: `npm run format`
- Lint code: `npm run lint`
- Fix linting: `npm run lint:fix`
- Run tests: `npm test`
- Coverage: `npm run test:coverage`

## Development Workflow

### Making Changes

1. Create a feature branch
2. Write tests first (TDD when appropriate)
3. Implement changes in `src/`
4. Run tests: `npm test`
5. Check coverage: `npm run test:coverage`
6. Ensure coverage ≥ 80%
7. Format code: `npm run format`
8. Commit (pre-commit hooks will run automatically)

### Local Development

```bash
# Build TypeScript
npm run build

# Start Azure Functions runtime locally
func start

# Or use the combined command
npm start
```

Your API will be available at `http://localhost:7071/api/`

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Coverage ≥ 80%
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] Error handling follows patterns
- [ ] Services separated from handlers
- [ ] JWT auth configured correctly
- [ ] Zod schemas reused (no duplication)
- [ ] OpenAPI documentation updated
- [ ] Environment variables documented

## Best Practices

### DRY (Don't Repeat Yourself)

- Extract common logic into services
- **Reuse Zod schemas** - define once in `src/schemas/`, import everywhere
- Share services across multiple handlers

### KISS (Keep It Simple, Stupid)

- Prefer simple solutions over complex ones
- Avoid premature optimization
- Write self-documenting code
- Use clear, descriptive names

### Modularity

- Each file has single responsibility
- Functions do one thing well
- Avoid tight coupling between modules
- Export only what's needed

### Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate all user input with Zod schemas
- Always use JWT authentication for protected endpoints
- Apply principle of least privilege with role-based access

## Common Migration Patterns

### Pattern: Login/Authentication Endpoint

**Express (OLD):**

```typescript
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ token, user });
});
```

**Azure Functions (NEW):**

```typescript
import { app } from '@azure/functions';
import { createHandler } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../services/user.service.js';
import { loginSchema } from '../schemas/user.schemas.js';

const loginHandler = createHandler(
  async (request, context, { body }) => {
    const user = await authenticateUser(body.email, body.password);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // ⚠️ Must include all required claims
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' },
    );

    return { status: 200, jsonBody: { token, user } };
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

### Pattern: Protected GET Endpoint

**Express (OLD):**

```typescript
router.get('/users/:id', authenticateJWT, async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json(user);
});
```

**Azure Functions (NEW):**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js';

const getUserHandler = createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);
    return { status: 200, jsonBody: userData };
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

### Pattern: POST with Validation

**Express (OLD):**

```typescript
router.post('/users', [body('email').isEmail(), body('name').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const user = await createUser(req.body);
  res.status(201).json(user);
});
```

**Azure Functions (NEW):**

```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { createUser } from '../services/user.service.js';
import { createUserSchema } from '../schemas/user.schemas.js';

const createUserHandler = createHandler(
  async (request, context, { body, user }) => {
    const newUser = await createUser(body);
    return { status: 201, jsonBody: newUser };
  },
  {
    bodySchema: createUserSchema, // Validation happens automatically
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.ADMIN],
    enableLogging: true,
  },
);

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: createUserHandler,
});
```

---

## Project-Specific Services

> **CUSTOMIZE THIS SECTION** with your project's specific services, features, and patterns from your Express app.

### Example: User Management Service

**Purpose**: Handles user CRUD operations and authentication

**Location**: `src/services/user.service.ts`

**Key Functions**:

- `createUser(email, password, name, role)` - Creates a new user account
- `authenticateUser(email, password)` - Validates credentials and returns user
- `getUserById(id)` - Retrieves user by ID
- `getAllUsers()` - Returns all users (admin only)

**Database**: [Your database here - e.g., Azure Cosmos DB, SQL Server, etc.]

**Error Handling**:

- Throws `AppError` with `ErrorCode.NOT_FOUND` if user doesn't exist
- Throws `AppError` with `ErrorCode.UNAUTHORIZED` for invalid credentials
- Throws `AppError` with `ErrorCode.CONFLICT` for duplicate email

---

## Environment Variables

Document all required environment variables for your project:

| Variable                   | Required    | Description                     | Example                              |
| -------------------------- | ----------- | ------------------------------- | ------------------------------------ |
| `JWT_SECRET`               | Yes         | Secret for JWT token generation | `your-super-secret-key-min-32-chars` |
| `FUNCTIONS_WORKER_RUNTIME` | Yes         | Azure Functions runtime         | `node`                               |
| `AzureWebJobsStorage`      | Yes (local) | Storage for Azure Functions     | `UseDevelopmentStorage=true`         |

---

## Additional Resources

- [@qops/hub-kit Repository](https://github.com/johanpearson/qops-hub-kit)
- [@qops/hub-kit Example Project](https://github.com/johanpearson/qops-hub-kit/tree/main/example)
- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

## Questions?

When unsure about:

- **@qops/hub-kit usage**: Check the package README and example project
- **Express migration**: See "Common Migration Patterns" section above
- **Code style**: Follow existing patterns in the codebase
- **Testing**: Look at existing tests in `tests/`
- **Project-specific logic**: Check the "Project-Specific Services" section above

## Code Style & Conventions

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes, types for unions/aliases
- Export types alongside implementations

### Naming Conventions

- **camelCase**: Variables, functions, parameters
- **PascalCase**: Classes, interfaces, types, enums
- **UPPER_CASE**: Constants, enum values
- **Leading underscore**: Allowed for unused parameters (e.g., `_request`)
- **No trailing underscores**

### Code Formatting

- **Prettier** is the final authority on formatting
- Line length: 120 characters
- Single quotes for strings
- Trailing commas: all
- Semicolons: always
- 2 spaces for indentation

### Project Structure

```
src/
├── schemas/     # Shared Zod schemas (reused in functions & OpenAPI)
├── services/    # Business logic
├── functions/   # Azure Function handlers
└── types/       # Shared TypeScript types
tests/
├── *.test.ts    # Unit tests (same name as source file)
```

### Best Practices

- **Always generate OpenAPI documentation** for all endpoints
- **Reuse Zod schemas** - Define schemas once in a shared location (e.g., `src/schemas/` directory) and import them in both function handlers and OpenAPI documentation to avoid duplication
- This eliminates schema duplication and provides a single source of truth

## @qops/hub-kit Package Usage

This project uses **@qops/hub-kit** for Azure Function v4 handlers with built-in:

- JWT authentication with role-based access control
- Request validation using Zod schemas
- Consistent error handling
- Correlation ID tracking
- OpenAPI documentation generation

### Service Layer (Business Logic)

- Business logic goes in `src/services/`
- Services are pure async functions
- Throw `AppError` for business logic errors
- No Azure Function dependencies in services
- Keep services focused and testable

```typescript
// services/user.service.ts
import { AppError, ErrorCode } from '@qops/hub-kit';

export async function getUserById(id: string) {
  const user = await db.findUser(id);
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
  }
  return user;
}
```

### Function Handlers

- Function handlers go in `src/functions/`
- Use `createHandler` wrapper from @qops/hub-kit for all Azure Functions
- Define Zod schemas for request validation
- Keep handlers thin - delegate to services
- Configure JWT auth and role requirements

```typescript
// functions/get-user.ts
import { createHandler, UserRole, z } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js';

export default createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);
    return { status: 200, jsonBody: userData };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  },
);
```

### Error Handling

- Use `AppError` from @qops/hub-kit for application errors
- Use predefined error codes from `ErrorCode` enum
- Include helpful error messages
- Add details object for complex errors

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
  field: 'email',
  reason: 'Must be valid email address',
});
```

### JWT Authentication

JWT tokens must include these claims:

- `sub`: User ID (string)
- `email`: User email (string)
- `name`: User name (string)
- `role`: User role ('admin' | 'member')

Configure authentication in handlers:

```typescript
{
  jwtConfig: { secret: process.env.JWT_SECRET! },
  requiredRoles: [UserRole.ADMIN],
}
```

User data is available in handler via `{ user }` destructuring.

### Request Validation with Shared Schemas

- **Always define schemas once** in `src/schemas/` directory
- **Import and reuse** schemas in both function handlers and OpenAPI documentation
- This prevents duplication and ensures consistency

```typescript
// src/schemas/user.schemas.ts - Define once
import { z } from '@qops/hub-kit';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).optional(),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
});
```

**Use in function handlers:**

```typescript
// src/functions/create-user.ts
import { createHandler } from '@qops/hub-kit';
import { createUserSchema } from '../schemas/user.schemas.js';

export default createHandler(
  async (request, context, { body }) => {
    // body is validated and typed
    return { status: 201, jsonBody: await createUser(body) };
  },
  { bodySchema: createUserSchema },
);
```

**Use in OpenAPI documentation:**

```typescript
// src/functions/openapi.ts
import { createUserSchema, userResponseSchema } from '../schemas/user.schemas.js';

builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  requestBody: createUserSchema, // No duplication!
  responses: { 201: { schema: userResponseSchema } },
});
```

### OpenAPI Documentation

**Always generate OpenAPI documentation** for your API endpoints:

```typescript
// functions/openapi.ts
import { createHandler, OpenApiBuilder } from '@qops/hub-kit';
import { createUserSchema, userResponseSchema } from '../schemas/user.schemas.js';

const builder = new OpenApiBuilder({
  title: 'Your API',
  version: '1.0.0',
  description: 'API description',
});

// Register routes
builder.registerRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  requestBody: createUserSchema,
  responses: {
    201: { schema: userResponseSchema, description: 'User created' },
  },
  requiresAuth: true,
});

export default createHandler(async () => {
  return { status: 200, jsonBody: builder.generateDocument() };
});
```

## Testing Standards

### Test Framework

- Use **Vitest** for all tests
- Place tests in `tests/` directory with `.test.ts` extension
- Name test files matching source files (e.g., `user.service.ts` → `user.service.test.ts`)

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('moduleName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Coverage Requirements

- Minimum coverage: 80% for lines, functions, branches, and statements
- Run with: `npm run test:coverage`
- Coverage reports: text (console), HTML, JSON, LCOV

### Test Guidelines

- Test public APIs only
- Test error cases and edge cases
- Mock external dependencies (database, HTTP calls, Azure services)
- Keep tests simple and readable
- One assertion per test when possible

## Linting & Formatting

### Pre-commit Hooks

- Husky runs lint-staged on commit
- Prettier formats all staged files
- ESLint fixes issues automatically
- Commit fails if linting errors remain

### Running Locally

- Format code: `npm run format`
- Lint code: `npm run lint`
- Fix linting: `npm run lint:fix`
- Run tests: `npm test`
- Coverage: `npm run test:coverage`

## Development Workflow

### Making Changes

1. Create a feature branch
2. Write tests first (TDD when appropriate)
3. Implement changes in `src/`
4. Run tests: `npm test`
5. Check coverage: `npm run test:coverage`
6. Ensure coverage ≥ 80%
7. Format code: `npm run format`
8. Commit (pre-commit hooks will run automatically)

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Coverage ≥ 80%
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] Error handling follows patterns
- [ ] Services separated from handlers
- [ ] JWT auth configured correctly
- [ ] Environment variables documented

## Best Practices

### DRY (Don't Repeat Yourself)

- Extract common logic into services
- Reuse Zod schemas, types, and utilities
- Share services across multiple handlers

### KISS (Keep It Simple, Stupid)

- Prefer simple solutions over complex ones
- Avoid premature optimization
- Write self-documenting code
- Use clear, descriptive names

### Modularity

- Each file has single responsibility
- Functions do one thing well
- Avoid tight coupling between modules
- Export only what's needed

### Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate all user input with Zod schemas
- Always use JWT authentication for protected endpoints
- Apply principle of least privilege with role-based access

---

## Project-Specific Services

> **CUSTOMIZE THIS SECTION** with your project's specific services, features, and patterns.

### Example: User Management Service

**Purpose**: Handles user CRUD operations and authentication

**Location**: `src/services/user.service.ts`

**Key Functions**:

- `createUser(email, password, name, role)` - Creates a new user account
- `authenticateUser(email, password)` - Validates credentials and returns user
- `getUserById(id)` - Retrieves user by ID
- `getAllUsers()` - Returns all users (admin only)

**Database**: Azure Cosmos DB (`users` container)

**Error Handling**:

- Throws `AppError` with `ErrorCode.NOT_FOUND` if user doesn't exist
- Throws `AppError` with `ErrorCode.UNAUTHORIZED` for invalid credentials
- Throws `AppError` with `ErrorCode.CONFLICT` for duplicate email

**Example Usage**:

```typescript
// In a function handler
import { authenticateUser } from '../services/user.service.js';

const user = await authenticateUser(body.email, body.password);
const token = generateJwt(
  {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  },
  process.env.JWT_SECRET!,
);
```

---

### Example: Notification Service

**Purpose**: Sends email and SMS notifications

**Location**: `src/services/notification.service.ts`

**Key Functions**:

- `sendEmail(to, subject, body)` - Sends email via SendGrid
- `sendSMS(phoneNumber, message)` - Sends SMS via Twilio

**Configuration**:

- Requires `SENDGRID_API_KEY` environment variable
- Requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

**Example Usage**:

```typescript
import { sendEmail } from '../services/notification.service.js';

await sendEmail(user.email, 'Welcome!', 'Thank you for signing up.');
```

---

### Example: Storage Service

**Purpose**: Manages file uploads to Azure Blob Storage

**Location**: `src/services/storage.service.ts`

**Key Functions**:

- `uploadFile(containerName, fileName, content)` - Uploads file to blob storage
- `downloadFile(containerName, fileName)` - Downloads file from blob storage
- `generateSasUrl(containerName, fileName, expiryMinutes)` - Generates temporary access URL

**Configuration**:

- Requires `AZURE_STORAGE_CONNECTION_STRING` environment variable

**Example Usage**:

```typescript
import { uploadFile } from '../services/storage.service.js';

const url = await uploadFile('uploads', 'document.pdf', fileBuffer);
```

---

## Environment Variables

Document all required environment variables for your project:

| Variable                          | Required | Description                           | Example                              |
| --------------------------------- | -------- | ------------------------------------- | ------------------------------------ |
| `JWT_SECRET`                      | Yes      | Secret for JWT token generation       | `your-super-secret-key-min-32-chars` |
| `COSMOS_CONNECTION_STRING`        | Yes      | Azure Cosmos DB connection string     | `AccountEndpoint=https://...`        |
| `AZURE_STORAGE_CONNECTION_STRING` | No       | Azure Blob Storage (for file uploads) | `DefaultEndpointsProtocol=https...`  |

---

## Additional Resources

- [@qops/hub-kit Documentation](../qops-hub-kit/README.md)
- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

## Questions?

When unsure about:

- **@qops/hub-kit usage**: Check the package README and examples
- **Code style**: Follow existing patterns in the codebase
- **Testing**: Look at existing tests in `tests/`
- **Project-specific logic**: Check the "Project-Specific Services" section above
