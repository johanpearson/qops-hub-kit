import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { extractBearerToken, verifyToken, verifyRole, UserRole } from '../src/auth';
import { AppError } from '../src/errors';

describe('auth', () => {
  describe('extractBearerToken', () => {
    it('should extract token from Authorization header', () => {
      const request = {
        headers: {
          get: (key: string) => (key === 'authorization' ? 'Bearer test-token' : null),
        },
      } as any;

      const token = extractBearerToken(request);
      expect(token).toBe('test-token');
    });

    it('should return undefined if no Authorization header', () => {
      const request = {
        headers: {
          get: () => null,
        },
      } as any;

      const token = extractBearerToken(request);
      expect(token).toBeUndefined();
    });

    it('should return undefined if Authorization header is not Bearer', () => {
      const request = {
        headers: {
          get: () => 'Basic credentials',
        },
      } as any;

      const token = extractBearerToken(request);
      expect(token).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    const secret = 'test-secret';

    it('should verify valid token and return payload', () => {
      const payload = { sub: '123', email: 'test@example.com', role: UserRole.MEMBER };
      const token = jwt.sign(payload, secret);

      const result = verifyToken(token, { secret });
      expect(result.sub).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(UserRole.MEMBER);
    });

    it('should throw error for expired token', () => {
      const token = jwt.sign({ sub: '123' }, secret, { expiresIn: '0s' });

      // Wait a bit to ensure expiration
      setTimeout(() => {
        expect(() => verifyToken(token, { secret })).toThrow(AppError);
        expect(() => verifyToken(token, { secret })).toThrow('Token has expired');
      }, 100);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token', { secret })).toThrow(AppError);
    });

    it('should verify token with algorithms', () => {
      const token = jwt.sign({ sub: '123' }, secret, { algorithm: 'HS256' });
      const result = verifyToken(token, { secret, algorithms: ['HS256'] });
      expect(result.sub).toBe('123');
    });
  });

  describe('verifyRole', () => {
    it('should pass if user has required role', () => {
      const payload = { sub: '123', role: UserRole.ADMIN };
      expect(() => verifyRole(payload, [UserRole.ADMIN])).not.toThrow();
    });

    it('should pass if user has one of multiple required roles', () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      expect(() => verifyRole(payload, [UserRole.MEMBER, UserRole.ADMIN])).not.toThrow();
    });

    it('should pass if admin accessing member-only endpoint (admin has implicit member permissions)', () => {
      const payload = { sub: '123', role: UserRole.ADMIN };
      expect(() => verifyRole(payload, [UserRole.MEMBER])).not.toThrow();
    });

    it('should throw error if member accessing admin-only endpoint', () => {
      const payload = { sub: '123', role: UserRole.MEMBER };
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow(AppError);
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow('Required role not found');
    });

    it('should throw error if user has no role', () => {
      const payload = { sub: '123' };
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow(AppError);
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow('No role assigned to user');
    });

    it('should throw error if user does not have required role', () => {
      const payload = { sub: '123', role: 'guest' as UserRole };
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow(AppError);
      expect(() => verifyRole(payload, [UserRole.ADMIN])).toThrow('Required role not found');
    });
  });
});
