# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-06-16

### 🚀 Major Release - API & Real-time Notification Architecture

This is a transformative release that introduces a complete API server architecture with real-time notifications, making claude-code-github much more than just an MCP server.

### ✨ Added

- **🔥 REST API Server** (#33) - Complete HTTP API for external integrations
  - Express.js server with comprehensive endpoint coverage
  - Authentication system with bearer tokens and scoped permissions
  - Rate limiting and security middleware (helmet, CORS)
  - Health checks and status endpoints
  - Full CRUD operations for Git workflow automation

- **⚡ Real-time WebSocket Server** - Live event streaming and notifications
  - Socket.IO server for bidirectional communication
  - Event broadcasting to subscribed clients
  - Connection management with authentication
  - Client subscription system for filtered events
  - Real-time status updates and suggestion delivery

- **📡 Advanced Webhook System** - External service integration
  - Webhook delivery with exponential backoff retry logic
  - Multiple authentication methods (Bearer token, HMAC signatures)
  - Event filtering and conditional delivery
  - Delivery status tracking and error handling
  - Support for multiple webhook endpoints per event type

- **🖥️ Terminal Notification Client** (`claude-code-notify`) - Real-time development suggestions
  - Connects to API server via WebSocket for live notifications
  - Terminal-based UI with colored output and progress indicators
  - Sound notifications for high-priority suggestions
  - Event filtering and project-specific monitoring
  - Command-line interface with multiple options
  - Background operation support

- **🔍 Workspace Monitoring** (#32) - Dynamic Git repository discovery
  - Real-time detection of new Git repositories in parent directories
  - Efficient file system watching with chokidar
  - Automatic GitHub repository detection from git remotes
  - Smart exclusion patterns for performance optimization
  - Cross-platform path handling and error resilience
  - Integration with existing project configuration

- **📊 Enhanced Development Tools** - Extended functionality
  - Improved status reporting with API integration
  - Enhanced error handling and progress indicators
  - Better Git workflow management
  - Extended MCP tool coverage

### 🔧 Enhanced

- **Configuration System** - Extended for API and webhook management
  - New `api_server` configuration section
  - WebSocket and webhook configuration options
  - Token-based authentication setup
  - Flexible enabling/disabling of services

- **Type System** - Comprehensive TypeScript definitions
  - API request/response types
  - WebSocket event types
  - Webhook configuration types
  - Enhanced error types for better debugging

- **Error Handling** - Robust error management
  - Structured error responses for API
  - Graceful degradation when services are unavailable
  - Better error messages and troubleshooting guidance

- **Documentation** - Comprehensive guides and examples
  - API endpoint documentation
  - WebSocket integration examples
  - Webhook setup and configuration guides
  - Terminal notification usage documentation

### 🛠️ Technical Improvements

- **Dependencies** - New core dependencies for enhanced functionality
  - `express` ^5.1.0 - HTTP server framework
  - `socket.io` ^4.8.1 - Real-time WebSocket communication
  - `socket.io-client` ^4.8.1 - Client-side WebSocket connections
  - `blessed` ^0.1.81 - Terminal UI components
  - `commander` ^14.0.0 - Command-line interface framework
  - `cors` ^2.8.5 - Cross-origin resource sharing
  - `express-rate-limit` ^7.5.0 - API rate limiting
  - `helmet` ^8.1.0 - Security middleware

- **Build System** - Enhanced TypeScript compilation
  - Updated type definitions for new dependencies
  - Custom type definitions for packages without @types
  - Improved build process with new entry points

- **Testing** - Extended test coverage
  - API server unit tests
  - WebSocket functionality tests
  - Webhook delivery system tests
  - Workspace monitoring integration tests

### 📋 Configuration Changes

**BREAKING CHANGE**: New configuration structure required for API features

```yaml
# New sections in config.yml
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "your-secure-token"
        scopes: ["*"]

websocket:
  enabled: true
  events: ["*"]

webhooks:
  enabled: false
  endpoints: []

workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/username/Projects"
      max_depth: 3
      exclude_patterns: ["node_modules", ".git", "dist"]
```

### 🎯 Use Cases Unlocked

1. **Real-time Development Monitoring**: Get live suggestions without manual MCP calls
2. **Team Collaboration**: Share development insights via webhooks to Slack/Teams
3. **CI/CD Integration**: Trigger workflows based on development patterns
4. **External Tool Integration**: Connect IDEs, editors, and other tools via REST API
5. **Dashboard Creation**: Build custom monitoring dashboards using WebSocket feeds
6. **Automated Workflows**: Create sophisticated automation based on development events

### 📈 Performance & Scalability

- Efficient event-driven architecture
- Minimal resource usage with smart file watching
- Configurable monitoring depth and exclusion patterns
- Graceful handling of large numbers of repositories
- Background processing for webhook deliveries

### 🔒 Security Features

- Token-based authentication for API access
- Scoped permissions system
- Rate limiting to prevent abuse
- HMAC signature verification for webhooks
- Secure storage of GitHub tokens via keytar

This release transforms claude-code-github from a simple MCP server into a comprehensive development workflow platform that provides real-time insights and enables powerful integrations with external tools and services.

## [1.2.0] - 2025-06-13

### Added
- **Automatic Project Discovery** (#24) - No more manual configuration for each project!
  - Configure directory paths to scan for Git repositories
  - Automatically detects GitHub repository from git remotes (SSH & HTTPS)
  - Smart exclusion patterns (skip node_modules, archived folders, etc.)
  - Configurable scan depth (default: 3 levels)
  - Works seamlessly alongside manually configured projects
  - Cross-platform support with proper path handling
- **Project Discovery Configuration** - New `project_discovery` section in config
  - `enabled`: Toggle automatic discovery on/off
  - `scan_paths`: List of directories to scan
  - `exclude_patterns`: Glob patterns to exclude from scanning
  - `auto_detect_github_repo`: Auto-detect from git remote
  - `max_depth`: Maximum directory depth to scan

### Fixed
- Windows path separator issues in project discovery
- ESLint errors that were causing CI failures
- Const declaration scope issue with block statements

## [1.1.5] - 2025-06-12

### Fixed
- **MCP Server Initialization** - Fixed server hanging during initialization with Claude Code
  - Suppress all console output to stderr when running in MCP mode
  - Detect MCP mode automatically when no CLI arguments are provided
  - Fix double configuration loading that caused duplicate validation messages
  - Ensure clean JSON-RPC protocol communication without interference

## [1.1.4] - 2025-06-11

### Added
- **Active Monitoring System** - Comprehensive monitoring architecture that tracks development patterns
  - Conversation monitoring through MCP protocol with pattern recognition
  - Git state monitoring with change detection and milestone tracking
  - File system monitoring with intelligent change analysis
  - Event aggregation system that detects feature completion, bug fixes, and release readiness
  - Smart suggestion engine for commits, releases, and workflow optimization
  - Real-time notifications for development milestones without interrupting flow
- **Process Lifecycle Management** - Prevents zombie processes and ensures clean operation
  - Lock file system to enforce single instance per project
  - Automatic cleanup of stale processes from previous sessions
  - Graceful shutdown handling with proper resource cleanup
  - Health monitoring and auto-restart capabilities
- **Enhanced MCP Server** - Extended MCP protocol support for intelligent development assistance
  - Conversation message processing for development insights
  - Notification system for proactive suggestions
  - Real-time status updates and milestone detection
- **Monitoring Configuration** - Flexible configuration options for monitoring behavior
  - Enable/disable conversation tracking and auto-suggestions
  - Configurable thresholds for commit and release suggestions
  - Notification style preferences (inline, summary, none)
  - Learning mode for adaptive development pattern recognition
- **New Tools**
  - `dev_monitoring_status()` - View active monitoring insights and recent events
  - Enhanced status displays with monitoring integration

### Enhanced
- **Documentation** - Comprehensive updates for monitoring features
  - Configuration examples for monitoring setup
  - Troubleshooting guide for monitoring issues
  - Feature overview with monitoring capabilities
- **Test Coverage** - Added comprehensive test suite for monitoring functionality
  - Unit tests for conversation pattern detection
  - Event aggregation and milestone detection tests
  - Process management and lifecycle tests
  - Integration tests for monitoring system

### Fixed
- **Zombie Process Prevention** (#26) - Eliminated accumulation of MCP server processes
  - Proper process cleanup on session end
  - Single instance enforcement per project
  - Automatic stale process detection and cleanup
- **Active Monitoring Implementation** (#27) - Now provides intelligent development assistance
  - Monitors conversation context for development progress
  - Suggests commits, releases, and workflow improvements
  - Detects patterns like feature completion and test success
  - Provides contextual notifications based on development activity

## [1.1.3] - 2025-06-11

### Fixed
- File system race condition when reading .gitignore files
  - Now handles gracefully when files are deleted between existence check and read
  - Continues operation without gitignore rules rather than crashing
- JSON parsing errors for malformed package.json files
  - Added proper error handling with informative messages
  - Prevents crashes during version detection and updates
- GitHub API null user handling for deleted accounts
  - Properly handles PRs created by deleted users
  - Adds warning logs when encountering null users
- Array operations safety
  - Fixed potential undefined access when commit messages are empty
  - Added null checks for issue labels array
- Non-null assertion in suggestion engine
  - Replaced unsafe assertion with proper error handling
  - Prevents runtime errors from race conditions
- Added 60-second timeout for npm operations
  - Prevents indefinite hangs during dependency updates
  - Provides clear error messages on timeout
- Improved Git remote URL parsing
  - Now supports SSH with custom ports
  - Handles GitHub Enterprise URLs
  - Properly trims whitespace from URLs
  - Works with or without .git extension
- Promise.all replaced with Promise.allSettled
  - PR list fetching now continues even if individual PR details fail
  - Provides partial results instead of complete failure

### Enhanced
- Error resilience throughout the codebase
- Logging for debugging edge cases
- Input validation for external data

## [1.1.2] - 2025-06-11

### Fixed
- Pull request creation error when configured reviewers include the PR author
  - GitHub API doesn't allow requesting reviews from the PR author
  - Now automatically filters out the PR author from reviewers list
  - Uses case-insensitive comparison to handle username variations
  - Prevents "Review cannot be requested from pull request author" error

## [1.1.1] - 2025-06-10

### Fixed
- CLI argument handling for --version and --help flags
- Prevent CLI from hanging when run directly without arguments
- Improved user experience for direct CLI usage

## [1.1.0] - 2025-06-10

### Added
- **🧠 Intelligent Workflow Assistant**: Revolutionary suggestion engine that analyzes development patterns
  - Pattern recognition for optimal commit strategies
  - Time tracking with configurable reminders (1hr reminder, 2hr warning)
  - Change analysis for atomic commits and mixed change detection
  - Workflow guidance for branching, committing, and PR creation
- **🛡️ Smart Safety Features**: 
  - Protected branch warnings when working directly on main/develop
  - Large changeset suggestions (configurable threshold, default 5 files)
  - Work loss prevention with time-based reminders
  - PR readiness detection for clean working directories
- **⚙️ Comprehensive Configuration System**:
  - Master switch to enable/disable all suggestions
  - Granular controls for each suggestion type
  - Per-project configuration overrides
  - Customizable thresholds for time and file count limits
- **📊 Enhanced Status Reporting**: 
  - Intelligent suggestions included in dev_status output
  - Contextual hints based on work patterns
  - Priority-based suggestion sorting (high/medium/low)

### Enhanced
- `dev_status` tool now includes intelligent suggestions and contextual hints
- Configuration system expanded with detailed suggestion controls
- Package description updated to reflect intelligent workflow capabilities
- README completely redesigned to highlight intelligent workflow assistant features

### Documentation  
- Added comprehensive intelligent suggestions configuration guide
- Updated README with new key features highlighting AI capabilities
- Added examples for per-project suggestion overrides
- Proper gitignore support for file watching and status reporting
- README table of contents for improved navigation

### Fixed
- Updated npm package badges to use shields.io format for better reliability

## [1.0.2] - 2025-06-10

### Added
- Auto-push functionality to dev_checkpoint tool for streamlined workflow
- Quick Wins features: enhanced status display and quick action tools
- Phase 1 Core Enhancements: Pull Request, Issue, and Release Management capabilities
- Comprehensive UX improvements and project infrastructure
- Type safety improvements in test files
- Cross-platform environment variable support for Windows CI

### Fixed
- ESLint configuration and linting errors for CI pipeline
- Test failures and CI issues
- Git mock reference error in CI
- Process exit prevention during tests with proper NODE_ENV=test setting

### Documentation
- Updated tool references from development_* to dev_* prefix
- Improved npm package discoverability in README

### Refactored
- Shortened MCP tool names from development_ to dev_ for better usability

## [1.0.1] - 2025-06-10

### Fixed
- Tool names updated to comply with MCP naming requirements
- TypeScript compilation and npm publishing configuration

### Documentation
- Clarified MCP server silent behavior and project detection
- Comprehensive README enhancements (Phase 1)

## [1.0.0] - 2025-06-09

### Added
- Initial implementation of claude-code-github MCP server
- File watching with efficient OS-native events
- Git workflow automation tools:
  - `dev_status`: Real-time project status monitoring
  - `dev_create_branch`: Smart branch creation with conventional naming
  - `dev_create_pull_request`: GitHub PR creation with draft support
  - `dev_checkpoint`: Quick commit functionality
- Protected branch safeguards
- GitHub Personal Access Token secure storage
- Project-based configuration with YAML support
- Integration with Claude Code via MCP protocol

### Fixed
- Package name and installation commands alignment

[Unreleased]: https://github.com/jdrhyne/claude-code-github/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/jdrhyne/claude-code-github/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jdrhyne/claude-code-github/releases/tag/v1.0.0