# End-to-End Testing for claude-code-github

This document describes the comprehensive testing strategy for the `claude-code-github` MCP server, including unit tests, end-to-end tests, and edge case handling.

## Testing Architecture Overview

The testing suite uses **Vitest** as the primary testing framework with a sophisticated multi-configuration approach that supports both unit and end-to-end testing scenarios.

### Test Types

1. **Unit Tests** - Test individual components in isolation
2. **End-to-End Tests** - Test the complete MCP server through JSON-RPC communication  
3. **Edge Case Tests** - Test error conditions, boundary cases, and robustness

## Configuration Files

### Base Configuration (`vitest.config.ts`)
- Sets up global test environment
- Configures coverage reporting with V8 provider
- Enables automatic mock cleanup between tests

### Unit Test Configuration (`vitest.config.unit.ts`)
- **Excludes** E2E test files to run only unit tests
- Faster execution for development workflow
- Focuses on individual component testing

### E2E Test Configuration (`vitest.config.e2e.ts`)
- **Longer timeouts** (30s test, 20s hooks) for server communication
- **Setup files** for mock initialization
- **Includes only** E2E and edge case test files

## Test Directory Structure

```
src/__tests__/
├── config.test.ts           # ConfigManager unit tests
├── git.test.ts             # GitManager unit tests  
├── github.test.ts          # GitHubManager unit tests
├── development-tools.test.ts # DevelopmentTools unit tests
├── e2e.test.ts             # End-to-end integration tests
├── edge-cases.test.ts      # Edge case and error handling tests
├── setup.ts                # Global test setup and teardown
└── utils/
    ├── git-mock.ts         # Git operations mocking
    ├── github-mock.ts      # GitHub API mocking
    ├── fs-mock.ts          # File system mocking
    ├── mcp-client.ts       # Test client for MCP communication
    ├── persistent-mock.ts  # Shared mock management
    └── test-helpers.ts     # General test utilities
```

## Mock Architecture

### Sophisticated Mocking System

The testing framework implements a comprehensive mocking architecture that simulates real-world scenarios:

#### Git Operations Mock (`git-mock.ts`)
- **Simulates Git status** with configurable states (clean, dirty, protected branch)
- **Mocks Git commands** (add, commit, push, checkout)
- **Provides test scenarios** for different repository states

#### GitHub API Mock (`github-mock.ts`)
- **Mocks Octokit client** with realistic API responses
- **Simulates token management** using mocked keytar
- **Handles authentication scenarios** (valid/invalid tokens)

#### File System Mock (`fs-mock.ts`)
- **Virtual file system** for testing configuration management
- **Project directory simulation** with realistic structure
- **Configuration file management** with default configs

#### Persistent Mock Management (`persistent-mock.ts`)
- **Singleton pattern** ensures consistent mocks across tests
- **Lifecycle management** with proper setup and cleanup
- **Cross-test state** management to prevent interference

### Test Client Implementation

#### MCP Test Client (`mcp-client.ts`)
- **Custom EventEmitter-based client** for server communication
- **JSON-RPC 2.0 protocol** handling with request/response correlation
- **Timeout management** and error handling
- **Process spawning** and stdio management for real server testing

## Test Scenarios

### Unit Tests

#### Configuration Management (`config.test.ts`)
- ✅ Valid configuration loading
- ✅ Default configuration creation
- ✅ Configuration validation
- ✅ Project path validation
- ✅ Configuration reloading

#### Git Operations (`git.test.ts`)
- ✅ Branch detection and status
- ✅ Uncommitted changes analysis
- ✅ Branch creation and switching
- ✅ Commit operations
- ✅ Push operations with upstream tracking
- ✅ Remote URL parsing and validation
- ✅ Repository validation

#### GitHub Integration (`github.test.ts`)
- ✅ Repository URL parsing
- ✅ Token validation and management
- ✅ Pull request creation
- ✅ Reviewer assignment
- ✅ Repository information retrieval

#### Development Tools (`development-tools.test.ts`)
- ✅ Status reporting with different repository states
- ✅ Branch creation with proper prefixes
- ✅ Pull request workflow
- ✅ Checkpoint commit functionality
- ✅ Protected branch enforcement
- ✅ Error handling for various failure scenarios

### End-to-End Tests (`e2e.test.ts`)

#### Server Communication
- ✅ **Server initialization** with protocol negotiation
- ✅ **Tool registration** and discovery
- ✅ **JSON-RPC communication** with proper request/response handling

#### Tool Functionality
- ✅ **`development.status`** - Repository status reporting
- ✅ **`development.create_branch`** - Branch creation with validation
- ✅ **`development.create_pull_request`** - GitHub PR creation
- ✅ **`development.checkpoint`** - Commit operations

#### Parameter Validation
- ✅ **Required parameter enforcement**
- ✅ **Invalid tool name handling**
- ✅ **Type validation** and error reporting

### Edge Cases and Error Handling (`edge-cases.test.ts`)

#### Configuration Edge Cases
- ✅ Missing configuration files
- ✅ Invalid project directories
- ✅ Malformed configuration data

#### Git Repository Edge Cases  
- ✅ Non-git repositories
- ✅ Git command failures
- ✅ Corrupted repository states
- ✅ Permission errors

#### GitHub API Edge Cases
- ✅ API rate limiting
- ✅ Invalid repository permissions
- ✅ Expired authentication tokens
- ✅ Network connectivity issues

#### Input Validation Edge Cases
- ✅ Special characters in parameters
- ✅ Very long input strings
- ✅ Unicode character handling
- ✅ Empty string validation

#### System Edge Cases
- ✅ File system permission errors
- ✅ Network connectivity problems
- ✅ Disk space limitations
- ✅ Concurrent operation handling

## Running Tests

### Available Commands

```bash
# Run all tests (unit + e2e)
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only E2E tests  
npm run test:e2e

# Run E2E tests with local setup
npm run test:e2e:local

# Generate coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Execution Strategy

1. **Development Workflow**
   ```bash
   npm run test:unit && npm run test:watch
   ```

2. **CI/CD Pipeline**
   ```bash
   npm run test:coverage
   npm run test:e2e
   ```

3. **Local Verification**
   ```bash
   npm test
   ```

## Mock vs Real Testing

### Mocked Testing (Default)
- **Fast execution** with predictable results
- **Isolated testing** without external dependencies
- **Deterministic behavior** for CI/CD pipelines
- **Comprehensive scenario coverage** including error conditions

### Local Testing (Optional)
- **Real MCP server** spawning and communication
- **Actual file system** interaction (in controlled environment)
- **Integration verification** with real components
- **Performance testing** under realistic conditions

## Best Practices

### Test Organization
- **Separation of concerns** between unit and integration tests
- **Modular mock utilities** for reusability
- **Clear test descriptions** and expected behaviors
- **Comprehensive edge case coverage**

### Mock Management
- **Realistic behavior simulation** matching actual APIs
- **State management** to prevent test interference
- **Proper cleanup** to avoid resource leaks
- **Flexible configuration** for different test scenarios

### Error Testing
- **Comprehensive error scenarios** for robustness
- **Graceful failure handling** verification
- **User-friendly error messages** validation
- **Recovery mechanism** testing

## Coverage Goals

- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: All user workflows covered
- **Edge Cases**: All error conditions tested
- **Documentation**: All public APIs documented with examples

## Future Improvements

- **Performance benchmarking** for large repositories
- **Stress testing** with high concurrency
- **Memory leak detection** for long-running scenarios
- **Visual regression testing** for UI components (if added)
- **Cross-platform testing** (Windows, macOS, Linux)

## Debugging Tests

### Common Issues

1. **Mock State Interference**
   - Ensure proper cleanup in `afterEach`
   - Use isolated test environments

2. **Timing Issues**
   - Increase timeouts for E2E tests
   - Use proper async/await patterns

3. **File System Dependencies**
   - Use virtual file system mocks
   - Clean up temporary files

### Debugging Commands

```bash
# Run specific test file
npx vitest run src/__tests__/config.test.ts

# Run with debug output
DEBUG=* npm run test:unit

# Run single test with watch
npx vitest --watch --reporter=verbose config.test.ts
```

This comprehensive testing strategy ensures the `claude-code-github` MCP server is robust, reliable, and ready for production use across different environments and edge cases.