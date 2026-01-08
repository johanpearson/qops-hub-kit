# Contributing to @qops/hub-kit

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/johanpearson/qops-hub-kit.git
cd qops-hub-kit
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Project Structure

```
qops-hub-kit/
├── src/                    # Source files
│   ├── handler.ts         # Main handler wrapper
│   ├── auth.ts            # JWT authentication
│   ├── errors.ts          # Error types
│   ├── correlation.ts     # Correlation ID utilities
│   ├── openapi.ts         # OpenAPI documentation
│   └── index.ts           # Public API exports
├── examples/              # Usage examples
├── dist/                  # Compiled JavaScript (generated)
└── README.md              # Documentation
```

## Code Style

- Follow TypeScript best practices
- Use JSDoc comments for all public APIs
- Keep functions small and focused (KISS principle)
- Avoid code duplication (DRY principle)
- Write clear, self-documenting code

## Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the code style guidelines

3. Build and verify your changes:
```bash
npm run build
```

4. Commit your changes:
```bash
git commit -m "Description of your changes"
```

5. Push to your branch:
```bash
git push origin feature/your-feature-name
```

6. Open a Pull Request

## Guidelines

### Adding New Features

- Ensure the feature aligns with the package goals
- Add JSDoc comments for all public APIs
- Update README.md with usage examples
- Keep the API simple and intuitive
- Consider backward compatibility

### Bug Fixes

- Include a clear description of the bug
- Add test cases if applicable
- Ensure the fix doesn't break existing functionality

### Documentation

- Keep documentation up to date
- Include code examples
- Use clear, concise language
- Update CHANGELOG.md

## Code Review Process

All submissions require review. We use GitHub pull requests for this purpose.

## Security

If you discover a security vulnerability, please email the maintainer directly instead of using the issue tracker.

## Questions?

Feel free to open an issue for any questions or concerns.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
