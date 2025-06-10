# Testing Guide

This project has multiple types of tests to ensure code quality and functionality.

## Test Types

### Unit Tests
- **Command**: `npm run test:unit` or `npm test`
- **Coverage**: Core business logic, API interactions, configuration management
- **CI Status**: ✅ Run automatically in CI
- **Location**: `src/__tests__/*.test.ts` (excluding e2e.test.ts and edge-cases.test.ts)

### E2E (End-to-End) Tests
- **Command**: `npm run test:e2e`
- **Coverage**: Full MCP server integration, tool interactions
- **CI Status**: ⚠️ Disabled in CI due to environment complexity
- **Location**: `src/__tests__/e2e.test.ts`, `src/__tests__/edge-cases.test.ts`
- **Note**: Should be run locally before submitting PRs

## Running Tests

### For Development
```bash
# Run all unit tests (recommended for CI)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### For Local Validation
```bash
# Run E2E tests (before submitting PR)
npm run test:e2e

# Run all tests locally
npm run test:unit && npm run test:e2e
```

## CI Configuration

The CI pipeline runs:
1. Linting (`npm run lint`)
2. Type checking (`npm run typecheck`)
3. Build verification (`npm run build`)
4. Unit tests (`npm run test:unit`)

E2E tests are intentionally skipped in CI because:
- They require spawning Node.js processes with complex environment setup
- They have different behavior across CI platforms (Ubuntu, macOS, Windows)
- They test integration scenarios that are better validated locally

## Before Submitting a PR

1. Ensure all unit tests pass: `npm test`
2. Run E2E tests locally: `npm run test:e2e`
3. Check linting: `npm run lint`
4. Verify types: `npm run typecheck`

## Troubleshooting

### E2E Tests Failing Locally
- Ensure the project is built: `npm run build`
- Check that `dist/index.js` exists
- Verify Node.js is in your PATH
- Try running tests with increased timeout

### Unit Tests Failing
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that NODE_ENV=test is set
- Verify all dependencies are installed