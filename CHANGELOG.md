# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MIT License file
- CONTRIBUTING.md with contribution guidelines
- CHANGELOG.md for tracking version history
- SECURITY.md for security vulnerability reporting
- GitHub Actions CI/CD workflow
- Improved package.json metadata
- Project badges in README

## [1.0.1] - 2025-01-06

### Fixed
- Shortened MCP tool names from `development_` to `dev_` prefix
- Updated tool names to comply with MCP naming requirements
- Fixed TypeScript compilation issues
- Fixed npm publishing configuration

### Added
- Comprehensive README enhancements (Phase 1)

### Changed
- Clarified MCP server silent behavior and project detection in documentation

## [1.0.0] - 2025-01-05

### Added
- Initial release of claude-code-github MCP server
- File watching with efficient OS-native filesystem events
- Git workflow automation tools:
  - `dev_status()` - Get current project status
  - `dev_create_branch()` - Create and checkout new branches
  - `dev_create_pull_request()` - Create GitHub pull requests
  - `dev_checkpoint()` - Create commits with custom messages
- Configuration management with YAML
- Secure GitHub token storage using system keychain
- Protected branch safeguards
- Multi-project support
- TypeScript implementation
- Comprehensive test suite

[Unreleased]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/jdrhyne/claude-code-github/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jdrhyne/claude-code-github/releases/tag/v1.0.0