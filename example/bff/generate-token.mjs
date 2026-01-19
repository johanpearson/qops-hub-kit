#!/usr/bin/env node

/**
 * Generate a test JWT token for development/testing
 * Usage: node generate-token.mjs [role]
 *
 * Examples:
 *   node generate-token.mjs         # Generates member token
 *   node generate-token.mjs admin   # Generates admin token
 */

import jwt from 'jsonwebtoken';

const role = process.argv[2] || 'member';
const validRoles = ['admin', 'member'];

if (!validRoles.includes(role)) {
  console.error(`Error: Invalid role "${role}". Valid roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

const payload = {
  sub: 'user-123',
  email: role === 'admin' ? 'admin@example.com' : 'user@example.com',
  name: role === 'admin' ? 'Admin User' : 'John Doe',
  role: role,
};

const secret = 'dev-secret-key-change-in-production';
const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('\n=== Test JWT Token ===');
console.log('\nRole:', role);
console.log('Expires:', '24 hours');
console.log('\nToken:');
console.log(token);
console.log('\nUse this token in the Authorization header:');
console.log(`Authorization: Bearer ${token}`);
console.log('\nOr in Swagger UI, click "Authorize" and paste this token:\n');
console.log(token);
console.log();
