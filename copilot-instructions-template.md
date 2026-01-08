# Copilot Instructions for [Your Project Name]

> **Note**: Copy this template to your project's `.github/copilot-instructions.md` and customize the "Project-Specific Services" section.

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
├── services/    # Business logic
├── functions/   # Azure Function handlers
└── types/       # Shared TypeScript types
tests/
├── *.test.ts    # Unit tests (same name as source file)
```

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

### Request Validation

- Use Zod schemas for all input validation
- Define schemas inline or in separate schema files for reuse
- Validate request body, query params, and path params

```typescript
import { z } from '@qops/hub-kit';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).optional(),
});
```

### OpenAPI Documentation

Generate OpenAPI v3 documentation for your API:

```typescript
// functions/openapi.ts
import { createHandler, OpenApiBuilder } from '@qops/hub-kit';

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
const token = generateJwt({
  sub: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
}, process.env.JWT_SECRET!);
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

await sendEmail(
  user.email,
  'Welcome!',
  'Thank you for signing up.'
);
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

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret for JWT token generation | `your-super-secret-key-min-32-chars` |
| `COSMOS_CONNECTION_STRING` | Yes | Azure Cosmos DB connection string | `AccountEndpoint=https://...` |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Azure Blob Storage (for file uploads) | `DefaultEndpointsProtocol=https...` |

---

## Additional Resources

- [@qops/hub-kit Documentation](link-to-package-readme)
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
