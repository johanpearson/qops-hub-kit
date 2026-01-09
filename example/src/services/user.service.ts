import { AppError, ErrorCode } from '@qops/hub-kit';
import { randomUUID } from 'node:crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

// In-memory storage (use a real database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

// Seed data
const adminUser: User = {
  id: randomUUID(),
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed_admin_password', // NOTE: Use bcrypt in production!
  role: 'admin',
};
users.set(adminUser.id, adminUser);
emailIndex.set(adminUser.email, adminUser.id);

const memberUser: User = {
  id: randomUUID(),
  email: 'member@example.com',
  name: 'Member User',
  passwordHash: 'hashed_member_password', // NOTE: Use bcrypt in production!
  role: 'member',
};
users.set(memberUser.id, memberUser);
emailIndex.set(memberUser.email, memberUser.id);

export async function authenticateUser(email: string, password: string): Promise<UserResponse> {
  const userId = emailIndex.get(email);
  if (!userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  const user = users.get(userId);
  // NOTE: This is a simple example. In production, use bcrypt or similar for password hashing!
  if (!user || user.passwordHash !== `hashed_${password}`) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string): Promise<UserResponse> {
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

export async function getAllUsers(): Promise<UserResponse[]> {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
