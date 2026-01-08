# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-08

### Added
- Initial release of @qops/hub-kit
- `createHandler` - Main handler wrapper with built-in middleware
- JWT authentication with role-based authorization (member/admin roles)
- Request validation using Zod schemas
- Comprehensive error handling with custom error types
- Automatic correlation ID generation and tracking
- OpenAPI v3 documentation generator
- Full TypeScript support with type definitions
- Comprehensive README with usage examples
- Example files demonstrating common use cases

### Features
- Removes boilerplate code for Azure Function v4 APIs
- Type-safe request validation
- Consistent error responses
- Distributed tracing support via correlation IDs
- Automatic OpenAPI documentation from code
- Zero-config middleware setup
