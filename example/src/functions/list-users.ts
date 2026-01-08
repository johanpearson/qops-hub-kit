import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { listUsers } from '../services/user.service';

const listUsersHandler = createHandler(
  async (_request, _context, { user: _user }) => {
    const users = await listUsers();

    return {
      status: 200,
      jsonBody: {
        users,
        total: users.length,
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    enableLogging: true,
  },
);

app.http('listUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: listUsersHandler,
});
