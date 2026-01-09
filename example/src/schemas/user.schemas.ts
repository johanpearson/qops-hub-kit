import { z } from '@qops/hub-kit';

// Login request schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// User response schema
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
});

// Login response schema
export const loginResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
});

// Users list schema
export const usersListSchema = z.object({
  users: z.array(userResponseSchema),
  total: z.number(),
});
