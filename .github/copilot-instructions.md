# Copilot Instructions for @qops/hub-kit

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
├── *.ts           # Core library code
tests/
├── *.test.ts      # Unit tests (same name as source file)
```

### Best Practices

- **Always generate OpenAPI documentation** for all endpoints
- **Reuse Zod schemas** - Define schemas once in a shared location (e.g., `schemas/` directory) and import them in both function handlers and OpenAPI documentation to avoid duplication

## Testing Standards

### Test Framework

- Use **Vitest** for all tests
- Place tests in `tests/` directory with `.test.ts` extension
- Name test files matching source files (e.g., `auth.ts` → `auth.test.ts`)

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
- Mock external dependencies (database, HTTP calls)
- Keep tests simple and readable
- One assertion per test when possible

## Architecture Patterns

### Service Layer

- Business logic goes in services
- Services are pure async functions
- Throw `AppError` for business logic errors
- No Azure Function dependencies in services

```typescript
// services/user.service.ts
export async function getUserById(id: string) {
  const user = await db.findUser(id);
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
  }
  return user;
}
```

### Function Handlers

- Use `createHandler` wrapper for all Azure Functions
- Define schemas with Zod for validation
- Keep handlers thin - delegate to services

```typescript
// functions/get-user.ts
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
```

### Error Handling

- Use `AppError` for application errors
- Use predefined error codes from `ErrorCode` enum
- Include helpful error messages
- Add details object for complex errors

```typescript
throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', {
  field: 'email',
  reason: 'Must be valid email',
});
```

## JWT Standards

### Token Structure

JWT tokens must include these claims:

- `sub`: User ID (string)
- `email`: User email (string)
- `name`: User name (string)
- `role`: User role ('admin' | 'member')

### Authentication

- Use `jwtConfig` in `createHandler` for protected endpoints
- Use `requiredRoles` for role-based access control
- User data available in handler via `{ user }` destructuring

## Validation

### Request Validation

- Use Zod schemas for all input validation
- Define schemas inline or in separate files for reuse
- Validate body, query params, and path params as needed

```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).optional(),
});
```

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

## Development Workflow

### Making Changes

1. Run tests: `npm test`
2. Make changes to source code
3. Add/update tests for changes
4. Run tests with coverage: `npm run test:coverage`
5. Ensure coverage meets thresholds (80%)
6. Format code: `npm run format`
7. Commit (pre-commit hooks will run)

### Adding New Features

1. Start with test (TDD when appropriate)
2. Implement in `src/`
3. Add example usage in `example/`
4. Update README if public API changes
5. Ensure all tests pass
6. Check coverage hasn't dropped

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Coverage ≥ 80%
- [ ] No linting errors
- [ ] Code formatted with Prettier
- [ ] Public APIs have JSDoc comments
- [ ] Example updated if needed
- [ ] README updated if needed

## Best Practices

### DRY (Don't Repeat Yourself)

- Extract common logic into functions
- Reuse schemas, types, and utilities
- Share services across multiple handlers

### KISS (Keep It Simple, Stupid)

- Prefer simple solutions over complex ones
- Avoid premature optimization
- Write self-documenting code
- Use clear variable names

### Modularity

- Each file has single responsibility
- Functions do one thing well
- Avoid tight coupling between modules
- Export only what's needed

### Documentation

- JSDoc for all public APIs
- Keep comments concise and relevant
- Update docs when changing APIs
- Examples in README for common use cases

## Common Patterns

### Handler with Validation

```typescript
import { createHandler, z } from '@qops/hub-kit';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export default createHandler(
  async (request, context, { body }) => {
    // body is validated and typed
    const result = await createUser(body);
    return { status: 201, jsonBody: result };
  },
  { bodySchema: schema, enableLogging: true },
);
```

### Handler with Auth

```typescript
import { createHandler, UserRole } from '@qops/hub-kit';

export default createHandler(
  async (request, context, { user }) => {
    // user.sub, user.email, user.name, user.role available
    return { status: 200, jsonBody: { user } };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
  },
);
```

### Service with Error Handling

```typescript
import { AppError, ErrorCode } from '@qops/hub-kit';

export async function processData(id: string) {
  if (!isValid(id)) {
    throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid ID format');
  }

  const data = await fetchData(id);
  if (!data) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Data not found');
  }

  return processedData;
}
```

## Questions?

When unsure about:

- **Code style**: Follow existing patterns in the codebase
- **Testing**: Look at existing tests in `tests/`
- **Examples**: Check `example/` directory
- **Documentation**: Refer to README.md
