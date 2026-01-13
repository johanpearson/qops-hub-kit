import { HttpRequest, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  extractBearerToken,
  getAuthUser,
  JwtPayload,
  setAuthUser,
  UserRole,
  verifyRole,
  verifyToken,
} from '../src/auth';
import { ErrorCode } from '../src/errors';

describe('auth', () => {
  const SECRET = 'test-secret-key';
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      headers: new Headers(),
    } as HttpRequest;

    mockContext = {} as InvocationContext;
  });

  describe('extractBearerToken', () => {
    it.each([
      { header: 'Bearer valid-token', expected: 'valid-token' },
      { header: 'Bearer token-with-dots.and.segments', expected: 'token-with-dots.and.segments' },
      { header: 'bearer lowercase-bearer', expected: 'lowercase-bearer' },
    ])('should extract token from valid authorization header: $header', ({ header, expected }) => {
      mockRequest.headers.set('authorization', header);

      const token = extractBearerToken(mockRequest);

      expect(token).toBe(expected);
    });

    it.each([
      { header: null, description: 'missing header' },
      { header: 'InvalidFormat', description: 'no Bearer prefix' },
      { header: 'Bearer', description: 'missing token' },
      { header: 'Basic dXNlcjpwYXNz', description: 'wrong auth type' },
      { header: 'Bearer token with spaces', description: 'multiple parts' },
    ])('should return undefined for invalid header: $description', ({ header }) => {
      if (header) {
        mockRequest.headers.set('authorization', header);
      }

      const token = extractBearerToken(mockRequest);

      expect(token).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const payload: JwtPayload = {
        sub: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.MEMBER,
      };
      const token = jwt.sign(payload, SECRET);

      const decoded = verifyToken(token, { secret: SECRET });

      expect(decoded.sub).toBe('123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.name).toBe('Test User');
      expect(decoded.role).toBe(UserRole.MEMBER);
    });

    it('should verify token with minimal payload', () => {
      const payload = { sub: 'user-id' };
      const token = jwt.sign(payload, SECRET);

      const decoded = verifyToken(token, { secret: SECRET });

      expect(decoded.sub).toBe('user-id');
    });

    it('should verify token with custom claims', () => {
      const payload = { sub: '123', customClaim: 'value' };
      const token = jwt.sign(payload, SECRET);

      const decoded = verifyToken(token, { secret: SECRET });

      expect(decoded.customClaim).toBe('value');
    });

    it.each([
      { token: 'invalid-token', description: 'malformed token' },
      { token: jwt.sign({ sub: '123' }, 'wrong-secret'), description: 'wrong secret' },
      { token: jwt.sign({ sub: '123' }, SECRET, { algorithm: 'HS512' }), description: 'wrong algorithm' },
    ])('should throw for invalid token: $description', ({ token }) => {
      expect(() => verifyToken(token, { secret: SECRET })).toThrow();

      try {
        verifyToken(token, { secret: SECRET });
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toContain('Invalid token');
      }
    });

    it('should throw for expired token', () => {
      const token = jwt.sign({ sub: '123' }, SECRET, { expiresIn: '0s' });

      expect(() => verifyToken(token, { secret: SECRET })).toThrow();

      try {
        verifyToken(token, { secret: SECRET });
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toContain('expired');
      }
    });

    it('should throw for unknown token verification error', () => {
      // Create a token that will fail verification in an unexpected way
      // by using a completely different algorithm or corrupted token
      const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.';

      expect(() => verifyToken(token, { secret: SECRET })).toThrow();

      try {
        verifyToken(token, { secret: SECRET });
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toBeTruthy();
      }
    });

    it('should verify token with issuer', () => {
      const payload = { sub: '123' };
      const token = jwt.sign(payload, SECRET, { issuer: 'test-issuer' });

      const decoded = verifyToken(token, { secret: SECRET, issuer: 'test-issuer' });

      expect(decoded.sub).toBe('123');
    });

    it('should throw for mismatched issuer', () => {
      const token = jwt.sign({ sub: '123' }, SECRET, { issuer: 'wrong-issuer' });

      expect(() => verifyToken(token, { secret: SECRET, issuer: 'expected-issuer' })).toThrow();
    });

    it('should verify token with audience', () => {
      const payload = { sub: '123' };
      const token = jwt.sign(payload, SECRET, { audience: 'test-audience' });

      const decoded = verifyToken(token, { secret: SECRET, audience: 'test-audience' });

      expect(decoded.sub).toBe('123');
    });
  });

  describe('verifyRole', () => {
    it.each([
      { userRole: UserRole.ADMIN, required: [UserRole.ADMIN], shouldPass: true },
      { userRole: UserRole.MEMBER, required: [UserRole.MEMBER], shouldPass: true },
      { userRole: UserRole.ADMIN, required: [UserRole.MEMBER], shouldPass: true }, // Admin has member permissions
      { userRole: UserRole.MEMBER, required: [UserRole.ADMIN], shouldPass: false },
      { userRole: UserRole.ADMIN, required: [UserRole.ADMIN, UserRole.MEMBER], shouldPass: true },
      { userRole: UserRole.MEMBER, required: [UserRole.ADMIN, UserRole.MEMBER], shouldPass: true },
    ])(
      'should verify role: user=$userRole, required=$required, pass=$shouldPass',
      ({ userRole, required, shouldPass }) => {
        const payload: JwtPayload = { sub: '123', role: userRole };

        if (shouldPass) {
          expect(() => verifyRole(payload, required)).not.toThrow();
        } else {
          expect(() => verifyRole(payload, required)).toThrow();
          try {
            verifyRole(payload, required);
          } catch (error: any) {
            expect(error.code).toBe(ErrorCode.FORBIDDEN);
            expect(error.message).toContain('Required role not found');
          }
        }
      },
    );

    it('should throw when user has no role', () => {
      const payload: JwtPayload = { sub: '123' };

      expect(() => verifyRole(payload, [UserRole.MEMBER])).toThrow();

      try {
        verifyRole(payload, [UserRole.MEMBER]);
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.FORBIDDEN);
        expect(error.message).toContain('No role assigned');
      }
    });
  });

  describe('setAuthUser and getAuthUser', () => {
    it('should store and retrieve user from context', () => {
      const user: JwtPayload = {
        sub: '123',
        email: 'test@example.com',
        role: UserRole.MEMBER,
      };

      setAuthUser(mockContext, user);
      const retrieved = getAuthUser(mockContext);

      expect(retrieved).toEqual(user);
    });

    it('should return undefined when no user is set', () => {
      const retrieved = getAuthUser(mockContext);

      expect(retrieved).toBeUndefined();
    });

    it('should overwrite existing user', () => {
      const user1: JwtPayload = { sub: '123', role: UserRole.MEMBER };
      const user2: JwtPayload = { sub: '456', role: UserRole.ADMIN };

      setAuthUser(mockContext, user1);
      setAuthUser(mockContext, user2);

      const retrieved = getAuthUser(mockContext);

      expect(retrieved).toEqual(user2);
    });
  });
});
