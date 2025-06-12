# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.5...HEAD
[1.1.5]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jdrhyne/claude-code-github/releases/tag/v1.0.0