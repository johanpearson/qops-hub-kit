import { randomUUID } from 'crypto';
import { AppError, ErrorCode } from '@qops/hub-kit';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
}

// In-memory store (use database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

// Seed admin user
const adminId = randomUUID();
users.set(adminId, {
  id: adminId,
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed_admin_password', // Use bcrypt in production
  role: 'admin',
});
emailIndex.set('admin@example.com', adminId);

export async function authenticateUser(email: string, password: string) {
  const userId = emailIndex.get(email);
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  const user = users.get(userId);
  if (!user || user.passwordHash !== `hashed_${password}`) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string) {
  const user = users.get(id);
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function listUsers() {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
