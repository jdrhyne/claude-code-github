# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jdrhyne/claude-code-github/releases/tag/v1.0.0