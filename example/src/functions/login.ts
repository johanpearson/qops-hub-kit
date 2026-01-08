import { app } from '@azure/functions';
import { createHandler, z } from '@qops/hub-kit';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../services/user.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginHandler = createHandler(
  async (request, context, { body }) => {
    const user = await authenticateUser(body.email, body.password);

    const token = jwt.sign(user, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h',
    });

    return {
      status: 200,
      jsonBody: {
        token,
        user,
      },
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
