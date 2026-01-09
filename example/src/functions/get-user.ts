import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserById } from '../services/user.service.js';

const getUserHandler = createHandler(
  async (request, context, { user }) => {
    const userId = request.params.id;
    const userData = await getUserById(userId);

    return {
      status: 200,
      jsonBody: userData,
    };
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
