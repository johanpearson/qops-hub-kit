import { HttpRequest, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { createUnauthorizedError, createForbiddenError } from './errors';

/**
 * User roles for authorization
 */
export enum UserRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

/**
 * Decoded JWT token payload
 */
export interface JwtPayload {
  sub?: string;
  email?: string;
  roles?: UserRole[];
  [key: string]: any;
}

/**
 * Configuration for JWT verification
 */
export interface JwtConfig {
  /**
   * Secret or public key for verification
   */
  secret: string;
  /**
   * JWT algorithm (default: HS256)
   */
  algorithms?: jwt.Algorithm[];
  /**
   * Issuer to verify
   */
  issuer?: string;
  /**
   * Audience to verify
   */
  audience?: string;
}

/**
 * Extract Bearer token from Authorization header
 *
 * @param request - The HTTP request
 * @returns The token or undefined
 */
export function extractBearerToken(request: HttpRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return undefined;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return undefined;
  }

  return parts[1];
}

/**
 * Verify JWT token and return decoded payload
 *
 * @param token - The JWT token
 * @param config - JWT configuration
 * @returns The decoded payload
 * @throws AppError if token is invalid
 */
export function verifyToken(token: string, config: JwtConfig): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.secret, {
      algorithms: config.algorithms || ['HS256'],
      issuer: config.issuer,
      audience: config.audience,
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createUnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw createUnauthorizedError('Invalid token');
    }
    throw createUnauthorizedError('Token verification failed');
  }
}

/**
 * Verify user has required role
 *
 * @param payload - The JWT payload
 * @param requiredRoles - Required roles (at least one must match)
 * @throws AppError if user doesn't have required role
 */
export function verifyRole(payload: JwtPayload, requiredRoles: UserRole[]): void {
  if (!payload.roles || payload.roles.length === 0) {
    throw createForbiddenError('No roles assigned to user');
  }

  const hasRole = requiredRoles.some((role) => payload.roles?.includes(role));
  if (!hasRole) {
    throw createForbiddenError(`Required role not found. Required: ${requiredRoles.join(', ')}`);
  }
}

/**
 * Store authenticated user in context
 */
export const AUTH_USER_KEY = 'authUser';

/**
 * Add authenticated user to context
 *
 * @param context - The invocation context
 * @param user - The JWT payload
 */
export function setAuthUser(context: InvocationContext, user: JwtPayload): void {
  (context as any)[AUTH_USER_KEY] = user;
}

/**
 * Get authenticated user from context
 *
 * @param context - The invocation context
 * @returns The JWT payload or undefined
 */
export function getAuthUser(context: InvocationContext): JwtPayload | undefined {
  return (context as any)[AUTH_USER_KEY];
}
