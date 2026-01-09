import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getAllUsers } from '../services/user.service.js';

const listUsersHandler = createHandler(
  async (request, context, { user }) => {
    const users = await getAllUsers();

    return {
      status: 200,
      jsonBody: { users, total: users.length },
    };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  },
);

app.http('listUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: listUsersHandler,
});
