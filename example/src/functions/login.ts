import { app } from '@azure/functions';
import { createHandler } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../services/user.service.js';
import { loginSchema } from '../schemas/user.schemas.js';

const loginHandler = createHandler(
  async (request, context, { body }) => {
    const user = await authenticateUser(body.email, body.password);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' },
    );

    return {
      status: 200,
      jsonBody: { token, user },
    };
  },
  {
    bodySchema: loginSchema,
    enableLogging: true,
  },
);

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: loginHandler,
});
