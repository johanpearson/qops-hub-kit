import { randomUUID } from 'crypto';
import { AppError, ErrorCode } from '@qops/hub-kit';

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
  role: 'admin' | 'member';
}

// In-memory store (replace with real database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

// Seed admin user
const adminId = randomUUID();
users.set(adminId, {
  id: adminId,
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: 'hashed_admin_password', // In production, use bcrypt
  role: 'admin',
});
emailIndex.set('admin@example.com', adminId);

// Seed a member user
const memberId = randomUUID();
users.set(memberId, {
  id: memberId,
  email: 'member@example.com',
  name: 'Member User',
  passwordHash: 'hashed_member_password',
  role: 'member',
});
emailIndex.set('member@example.com', memberId);

/**
 * Authenticate a user with email and password
 */
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

/**
 * Get user by ID
 */
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

/**
 * List all users
 */
export async function listUsers(): Promise<UserResponse[]> {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
