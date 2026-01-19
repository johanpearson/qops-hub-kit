# BFF (Backend for Frontend) Example

This example demonstrates how to use `@qops/hub-kit` to create a BFF (Backend for Frontend) API using Azure Functions. The BFF pattern aggregates data from multiple backend services and provides optimized endpoints for frontend applications.

## What is a BFF?

A Backend for Frontend (BFF) is a design pattern where you create a separate backend service for each frontend application. The BFF:

- **Aggregates data** from multiple backend services
- **Transforms data** to match frontend needs
- **Reduces API calls** from the frontend
- **Provides authentication** at the BFF layer
- **Optimizes responses** for specific UI requirements

## Features

- ✅ **JWT Authentication** - Secure endpoints with role-based access control
- ✅ **Data Aggregation** - Combine data from multiple backend services
- ✅ **Parallel API Calls** - Fetch from multiple services simultaneously for better performance
- ✅ **Data Transformation** - Shape responses for specific frontend needs
- ✅ **OpenAPI Documentation** - Auto-generated API documentation
- ✅ **Swagger UI** - Interactive API testing interface
- ✅ **Health Check** - Service health monitoring

## Architecture

```
Frontend App
     ↓
   BFF API (This Example)
     ↓
   ├─→ User Service (Azure Function)
   ├─→ Order Service (Azure Function)
   └─→ Notification Service (Azure Function)
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

3. Start the Azure Functions runtime:

```bash
npm start
```

## Testing

### Using Swagger UI

1. Open http://localhost:7071/swagger.html in your browser
2. Explore the available endpoints
3. Test authenticated endpoints by:
   - Click "Authorize" button
   - Enter a test JWT token (see below for generation)
   - Test the endpoints

### Using curl

#### Health Check

```bash
curl http://localhost:7071/api/health
```

#### Get Aggregated User Profile (requires auth)

```bash
curl http://localhost:7071/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Dashboard Data (requires auth)

```bash
curl http://localhost:7071/api/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generating Test JWT Token

For testing purposes, you can generate a JWT token using Node.js:

```javascript
// generate-token.mjs
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    sub: 'user-123',
    email: 'user@example.com',
    name: 'John Doe',
    role: 'member',
  },
  'dev-secret-key-change-in-production',
  { expiresIn: '1h' },
);

console.log('JWT Token:', token);
```

Run: `node generate-token.mjs`

## API Endpoints

### GET /api/health

Health check endpoint - no authentication required.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-19T10:00:00.000Z"
}
```

### GET /api/profile

Get aggregated user profile data by combining:

- User profile from User Service
- Recent orders from Order Service
- Unread notifications from Notification Service

**Authentication:** Required (JWT)

**Response:**

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "recentOrders": [
    {
      "id": "order-1",
      "userId": "user-123",
      "status": "completed",
      "total": 99.99,
      "items": [
        {
          "productId": "prod-1",
          "name": "Product 1",
          "quantity": 2,
          "price": 49.99
        }
      ],
      "createdAt": "2024-01-18T00:00:00.000Z"
    }
  ],
  "unreadNotifications": [
    {
      "id": "notif-1",
      "userId": "user-123",
      "type": "success",
      "message": "Your order has been shipped!",
      "read": false,
      "createdAt": "2024-01-19T09:00:00.000Z"
    }
  ]
}
```

### GET /api/dashboard

Get dashboard data optimized for the dashboard UI, including:

- User summary
- Order statistics
- Recent activity timeline

**Authentication:** Required (JWT)

**Response:**

```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "role": "member"
  },
  "stats": {
    "totalOrders": 10,
    "pendingOrders": 2,
    "completedOrders": 7,
    "unreadNotifications": 3
  },
  "recentActivity": [
    {
      "type": "order",
      "id": "order-2",
      "description": "Order processing: $149.99",
      "timestamp": "2024-01-19T10:00:00.000Z"
    },
    {
      "type": "notification",
      "id": "notif-1",
      "description": "Your order has been shipped!",
      "timestamp": "2024-01-19T09:00:00.000Z"
    }
  ]
}
```

### GET /api/openapi.json

Returns the OpenAPI 3.0 specification for the API.

## Key Implementation Details

### Service Layer Pattern

The BFF uses a service layer to communicate with backend services:

```typescript
// src/services/backend.service.ts
export async function getUserProfile(userId: string, context: InvocationContext) {
  // In production, make HTTP call to actual service:
  // const response = await fetch(`${process.env.USER_SERVICE_URL}/users/${userId}`);
  // return response.json();

  // Mock data for demonstration
  return { id: userId, email: 'user@example.com', name: 'John Doe' };
}
```

### Parallel API Calls

The BFF fetches data from multiple services in parallel for better performance:

```typescript
const [userProfile, recentOrders, unreadNotifications] = await Promise.all([
  getUserProfile(userId, context),
  getUserOrders(userId, context, 5),
  getUserNotifications(userId, context, true),
]);
```

### Data Transformation

The BFF transforms raw backend data into frontend-friendly formats:

```typescript
// Calculate statistics from raw order data
const stats = {
  totalOrders: allOrders.length,
  pendingOrders: allOrders.filter((o) => o.status === 'pending').length,
  completedOrders: allOrders.filter((o) => o.status === 'completed').length,
  unreadNotifications: allNotifications.filter((n) => !n.read).length,
};
```

### JWT Authentication

Protected endpoints require JWT authentication with role-based access control:

```typescript
const handler = createHandler(
  async (request, context, { user }) => {
    // user contains: { sub, email, name, role }
    return { status: 200, jsonBody: data };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET },
    requiredRoles: [UserRole.ADMIN, UserRole.MEMBER],
  },
);
```

## File Structure

```
example/bff/
├── src/
│   ├── schemas/
│   │   └── bff.schemas.ts          # Zod schemas for API contracts
│   ├── services/
│   │   └── backend.service.ts      # Backend service communication layer
│   └── functions/
│       ├── health.ts               # Health check endpoint
│       ├── get-user-profile.ts     # Aggregated user profile endpoint
│       ├── get-dashboard.ts        # Dashboard data endpoint
│       └── openapi.ts              # OpenAPI documentation
├── package.json
├── tsconfig.json
├── host.json
├── swagger.html                    # Swagger UI page
└── README.md
```

## Production Considerations

When deploying to production, you should:

### 1. Configure Backend Service URLs

Replace mock service calls with real HTTP calls:

```typescript
// .env or Azure App Settings
USER_SERVICE_URL=https://user-service.azurewebsites.net/api
ORDER_SERVICE_URL=https://order-service.azurewebsites.net/api
NOTIFICATION_SERVICE_URL=https://notification-service.azurewebsites.net/api
JWT_SECRET=your-production-secret-key
```

### 2. Add Error Handling

Handle backend service failures gracefully:

```typescript
try {
  const response = await fetch(`${process.env.USER_SERVICE_URL}/users/${userId}`);
  if (!response.ok) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user data');
  }
  return response.json();
} catch (error) {
  context.error('User service error:', error);
  throw new AppError(ErrorCode.INTERNAL_ERROR, 'User service unavailable');
}
```

### 3. Add Caching

Cache responses to reduce load on backend services:

```typescript
import { RedisCache } from './cache';

const cached = await cache.get(`user:${userId}`);
if (cached) return cached;

const data = await fetchFromService();
await cache.set(`user:${userId}`, data, { ttl: 300 }); // 5 minutes
return data;
```

### 4. Add Rate Limiting

Protect your BFF from abuse:

```typescript
import { RateLimiter } from './rate-limiter';

const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
if (!limiter.check(userId)) {
  throw new AppError(ErrorCode.TOO_MANY_REQUESTS, 'Rate limit exceeded');
}
```

### 5. Add Monitoring

Track performance and errors:

```typescript
import { ApplicationInsights } from '@azure/monitor-opentelemetry';

const startTime = Date.now();
const result = await getUserProfile(userId, context);
const duration = Date.now() - startTime;

context.log(`User profile fetch completed in ${duration}ms`);
```

### 6. Add Service-to-Service Authentication

Use managed identities or service principals for backend calls:

```typescript
const token = await getServiceToken();
const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 7. Add Request Validation

Validate all input data:

```typescript
const querySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
```

## Benefits of BFF Pattern

1. **Reduced Network Calls** - Frontend makes one call instead of three
2. **Data Transformation** - Backend handles data shaping, keeping frontend simple
3. **Single Authentication Point** - BFF handles auth for all backend services
4. **Optimized for UI** - Each frontend can have its own BFF with custom endpoints
5. **Better Performance** - Parallel backend calls and server-side aggregation
6. **Easier Frontend Development** - Simple, purpose-built API for each UI

## Resources

- [@qops/hub-kit Documentation](../../README.md)
- [BFF Pattern](https://samnewman.io/patterns/architectural/bff/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [OpenAPI Specification](https://swagger.io/specification/)
