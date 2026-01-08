# Example API - @qops/hub-kit

This is a complete working example demonstrating the `@qops/hub-kit` package in action.

## Features Demonstrated

✅ **Login endpoint** - Unauthenticated endpoint with request validation  
✅ **Get user by ID** - Protected endpoint requiring JWT authentication  
✅ **List all users** - Protected endpoint with role-based access control  
✅ **File upload** - Multipart file upload with storage simulation  
✅ **File download** - Secure file download with access control  
✅ **List files** - List uploaded files with user filtering  
✅ **Database integration** - Examples for various databases (Cosmos DB, SQL, PostgreSQL, MongoDB)  
✅ **Blob storage integration** - Azure Blob Storage integration examples  
✅ **Pre-seeded users** - Admin and member users for testing  
✅ **Integration tests** - Automated tests validating all functionality

## Project Structure

```
example/
├── src/
│   ├── services/
│   │   ├── user.service.ts            # User business logic
│   │   ├── file.service.ts            # File upload/download logic
│   │   ├── database.example.ts        # Database integration examples
│   │   └── blob-storage.example.ts    # Blob storage integration examples
│   ├── functions/
│   │   ├── login.ts                   # POST /api/auth/login
│   │   ├── get-user.ts                # GET /api/users/{id}
│   │   ├── list-users.ts              # GET /api/users
│   │   ├── upload-file.ts             # POST /api/files/upload
│   │   ├── download-file.ts           # GET /api/files/{id}
│   │   └── list-files.ts              # GET /api/files
│   ├── index.ts                       # Function registration
│   └── test-integration.ts            # Integration tests
├── package.json
├── tsconfig.json
├── host.json                          # Azure Functions configuration
└── local.settings.json                # Local environment variables
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Run Integration Tests

```bash
npm run test:integration
```

This validates that:

- createHandler wrapper works correctly
- JWT authentication and authorization work
- Request body validation with Zod works
- Error handling is consistent
- Service layer integration works
- All middleware function properly

### 4. Start Azure Functions (Optional)

If you have Azure Functions Core Tools installed:

```bash
npm start
```

Then test with curl:

```bash
# Login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Get user (use token from login response)
export TOKEN="your-jwt-token-here"
curl http://localhost:7071/api/users/<user-id> \
  -H "Authorization: Bearer $TOKEN"

# List users
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer $TOKEN"

# Upload a file (JSON with base64)
curl -X POST http://localhost:7071/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.txt","fileData":"SGVsbG8gV29ybGQh","mimeType":"text/plain"}'

# List files
curl http://localhost:7071/api/files \
  -H "Authorization: Bearer $TOKEN"

# Download a file
curl http://localhost:7071/api/files/<file-id> \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-file.txt
```

## Pre-seeded Users

The example includes two pre-seeded users:

1. **Admin User**
   - Email: `admin@example.com`
   - Password: `admin_password`
   - Role: `admin`

2. **Member User**
   - Email: `member@example.com`
   - Password: `member_password`
   - Role: `member`

## What This Demonstrates

### 1. Simple Handler with Validation

```typescript
const loginHandler = createHandler(
  async (_request, _context, { body }) => {
    const user = await authenticateUser(body.email, body.password);
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '24h' });
    return { status: 200, jsonBody: { token, user } };
  },
  {
    bodySchema: loginSchema, // Automatic validation
    enableLogging: true, // Request/response logging
  },
);
```

### 2. Protected Endpoints with JWT

```typescript
const getUserHandler = createHandler(
  async (request, _context, { user }) => {
    // user is automatically extracted and verified
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

### 3. Service Layer Separation

Business logic is cleanly separated in service files:

```typescript
// services/user.service.ts
export async function authenticateUser(email: string, password: string) {
  const user = findUserByEmail(email);
  if (!user) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }
  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}
```

### 4. Error Handling

The package provides consistent error handling:

```typescript
throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
// Automatically returns: { status: 404, jsonBody: { error: { ... } } }
```

### 5. File Uploads

The package supports file uploads with flexible parsing:

```typescript
const uploadHandler = createHandler(
  async (request, _context, { user }) => {
    // Handle JSON with base64-encoded file
    const body = await request.json();
    const fileBuffer = Buffer.from(body.fileData, 'base64');

    // Upload to storage and save metadata
    const file = await uploadFile(fileBuffer, body.fileName, body.mimeType, user!.sub);

    return { status: 201, jsonBody: file };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET },
    requiredRoles: [UserRole.MEMBER],
    skipBodyParsing: true, // Important for file uploads
  },
);
```

### 6. Database Integration

The package works seamlessly with any database. Examples provided for:

- **Azure Cosmos DB** - NoSQL database
- **Azure SQL Database** - Relational database
- **PostgreSQL** - Open-source relational database
- **MongoDB** - Document database
- **MySQL** - Relational database

See `services/database.example.ts` for complete examples.

### 7. Blob Storage Integration

Azure Blob Storage integration example shows how to:

- Upload files to blob storage
- Download files from blob storage
- Generate SAS URLs for temporary access
- List blobs in a container
- Delete blobs

See `services/blob-storage.example.ts` for complete examples.

## Integration Test Results

Running `npm run test:integration` validates:

```
=== Test 1: Login Endpoint ===
✅ Login successful!
Token: eyJhbGciOiJIUzI1NiIs...
User: { sub: '...', email: 'admin@example.com', name: 'Admin User', role: 'admin' }

=== Test 2: Get User by ID (Authenticated) ===
✅ Get user successful!
User data: { id: '...', email: 'admin@example.com', name: 'Admin User', role: 'admin' }

=== Test 3: List All Users (Authenticated) ===
✅ List users successful!
Total users: 2

=== Test 4: Unauthenticated Request (Should Fail) ===
✅ Correctly rejected unauthenticated request!
Status: 401

=== Test 5: Invalid Credentials (Should Fail) ===
✅ Correctly rejected invalid credentials!
Status: 401

=== All Tests Passed! ✅ ===
```

## Key Benefits

1. **Minimal Boilerplate** - Single `createHandler` call handles everything
2. **Type-Safe** - Full TypeScript support with Zod validation
3. **Production-Ready** - JWT auth, error handling, logging, and tracing included
4. **Clean Architecture** - Service/handler separation keeps code organized
5. **Easy Testing** - Services can be tested independently

## Environment Variables

Configure these in `local.settings.json` or your deployment:

- `JWT_SECRET` - Secret key for signing JWT tokens (required for production)
- `FUNCTIONS_WORKER_RUNTIME` - Set to `node` (required by Azure Functions)
