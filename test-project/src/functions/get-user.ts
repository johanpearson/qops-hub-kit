import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js';

const getUserHandler = createHandler(
  async (request, _context, { user: _user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);

    return {
      status: 200,
      jsonBody: userData,
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'test-secret-key',
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
