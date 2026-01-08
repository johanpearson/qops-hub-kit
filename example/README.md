# Example API

This example demonstrates a complete user management API with login, get user by ID, and list users endpoints.

## Setup

```bash
# Install dependencies
npm install

# Set JWT secret (or use default)
export JWT_SECRET="your-secret-key"

# Start the function app
npm start
```

## Test

```bash
# Login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Use the token from response
export TOKEN="<your-token>"

# Get user by ID
curl http://localhost:7071/api/users/<user-id> \
  -H "Authorization: Bearer $TOKEN"

# List all users
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## Credentials

- Email: `admin@example.com`
- Password: `admin_password`
