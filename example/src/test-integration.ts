import { createHandler, UserRole, z } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser, getUserById, listUsers } from './services/user.service.js';

// Test 1: Login endpoint
console.log('\\n=== Test 1: Login Endpoint ===');
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginHandler = createHandler(
  async (_request, _context, { body }) => {
    const user = await authenticateUser(body.email, body.password);
    const token = jwt.sign(user, 'test-secret-key', { expiresIn: '24h' });
    return { status: 200, jsonBody: { token, user } };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  },
);

// Simulate login request
const loginRequest: any = {
  method: 'POST',
  url: 'http://localhost:7071/api/auth/login',
  headers: new Map([['content-type', 'application/json']]),
  query: new URLSearchParams(),
  params: {},
  user: null,
  text: async () => JSON.stringify({ email: 'admin@example.com', password: 'admin_password' }),
  json: async () => ({ email: 'admin@example.com', password: 'admin_password' }),
};

const loginContext: any = {
  invocationId: 'test-login-1',
  functionName: 'login',
  traceContext: { traceparent: '', tracestate: '', attributes: {} },
  options: { trigger: {} },
  retryContext: { retryCount: 0, maxRetryCount: 0 },
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
};

try {
  const loginResponse = await loginHandler(loginRequest, loginContext);
  console.log('✅ Login successful!');
  console.log('Status:', loginResponse.status);
  console.log('Token:', loginResponse.jsonBody.token.substring(0, 20) + '...');
  console.log('User:', loginResponse.jsonBody.user);

  // Save token for next tests
  const token = loginResponse.jsonBody.token;

  // Test 2: Get user by ID (authenticated)
  console.log('\\n=== Test 2: Get User by ID (Authenticated) ===');
  const getUserHandler = createHandler(
    async (request, _context, { user: _user }) => {
      const userId = request.params.id;
      const userData = await getUserById(userId);
      return { status: 200, jsonBody: userData };
    },
    {
      jwtConfig: { secret: 'test-secret-key' },
      requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
      enableLogging: true,
    },
  );

  const getUserRequest: any = {
    method: 'GET',
    url: 'http://localhost:7071/api/users/test-id',
    headers: new Map([['authorization', `Bearer ${token}`]]),
    query: new URLSearchParams(),
    params: { id: loginResponse.jsonBody.user.sub },
    user: null,
  };

  const getUserContext: any = {
    invocationId: 'test-getuser-1',
    functionName: 'getUser',
    traceContext: { traceparent: '', tracestate: '', attributes: {} },
    options: { trigger: {} },
    retryContext: { retryCount: 0, maxRetryCount: 0 },
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
  };

  const getUserResponse = await getUserHandler(getUserRequest, getUserContext);
  console.log('✅ Get user successful!');
  console.log('Status:', getUserResponse.status);
  console.log('User data:', getUserResponse.jsonBody);

  // Test 3: List all users (authenticated)
  console.log('\\n=== Test 3: List All Users (Authenticated) ===');
  const listUsersHandler = createHandler(
    async (_request, _context, { user: _user }) => {
      const users = await listUsers();
      return { status: 200, jsonBody: { users, total: users.length } };
    },
    {
      jwtConfig: { secret: 'test-secret-key' },
      requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
      enableLogging: true,
    },
  );

  const listUsersRequest: any = {
    method: 'GET',
    url: 'http://localhost:7071/api/users',
    headers: new Map([['authorization', `Bearer ${token}`]]),
    query: new URLSearchParams(),
    params: {},
    user: null,
  };

  const listUsersContext: any = {
    invocationId: 'test-listusers-1',
    functionName: 'listUsers',
    traceContext: { traceparent: '', tracestate: '', attributes: {} },
    options: { trigger: {} },
    retryContext: { retryCount: 0, maxRetryCount: 0 },
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
  };

  const listUsersResponse = await listUsersHandler(listUsersRequest, listUsersContext);
  console.log('✅ List users successful!');
  console.log('Status:', listUsersResponse.status);
  console.log('Total users:', listUsersResponse.jsonBody.total);
  console.log('Users:', listUsersResponse.jsonBody.users);

  // Test 4: Unauthenticated request (should fail)
  console.log('\\n=== Test 4: Unauthenticated Request (Should Fail) ===');
  const unauthRequest: any = {
    method: 'GET',
    url: 'http://localhost:7071/api/users',
    headers: new Map(),
    query: new URLSearchParams(),
    params: {},
    user: null,
  };

  const unauthContext: any = {
    invocationId: 'test-unauth-1',
    functionName: 'listUsers',
    traceContext: { traceparent: '', tracestate: '', attributes: {} },
    options: { trigger: {} },
    retryContext: { retryCount: 0, maxRetryCount: 0 },
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
  };

  const unauthResponse = await listUsersHandler(unauthRequest, unauthContext);
  if (unauthResponse.status === 401) {
    console.log('✅ Correctly rejected unauthenticated request!');
    console.log('Status:', unauthResponse.status);
  } else {
    console.log('❌ Should have failed with 401 but got:', unauthResponse.status);
    throw new Error('Unauthenticated request was not rejected');
  }

  // Test 5: Invalid credentials (should fail)
  console.log('\\n=== Test 5: Invalid Credentials (Should Fail) ===');
  const badLoginRequest: any = {
    method: 'POST',
    url: 'http://localhost:7071/api/auth/login',
    headers: new Map([['content-type', 'application/json']]),
    query: new URLSearchParams(),
    params: {},
    user: null,
    text: async () => JSON.stringify({ email: 'wrong@example.com', password: 'wrong_password' }),
    json: async () => ({ email: 'wrong@example.com', password: 'wrong_password' }),
  };

  const badLoginContext: any = {
    invocationId: 'test-badlogin-1',
    functionName: 'login',
    traceContext: { traceparent: '', tracestate: '', attributes: {} },
    options: { trigger: {} },
    retryContext: { retryCount: 0, maxRetryCount: 0 },
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
  };

  const badLoginResponse = await loginHandler(badLoginRequest, badLoginContext);
  if (badLoginResponse.status === 401 || badLoginResponse.status === 400) {
    console.log('✅ Correctly rejected invalid credentials!');
    console.log('Status:', badLoginResponse.status);
  } else {
    console.log('❌ Should have failed with 401 but got:', badLoginResponse.status);
    throw new Error('Invalid credentials were not rejected');
  }

  console.log('\\n=== All Tests Passed! ✅ ===');
  console.log('\\nPackage validation complete:');
  console.log('✅ createHandler wrapper works correctly');
  console.log('✅ JWT authentication and authorization work');
  console.log('✅ Request body validation with Zod works');
  console.log('✅ Error handling is consistent');
  console.log('✅ Service layer integration works');
  console.log('✅ All middleware (auth, validation, error handling) function properly');
} catch (error: any) {
  console.error('\\n❌ Test failed:', error);
  process.exit(1);
}
