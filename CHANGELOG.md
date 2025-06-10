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
- **Enhanced PR Management Tools** (Phase 1)
  - `dev_pr_update` - Update existing pull requests (title, body, reviewers, labels, draft status)
  - `dev_pr_status` - Get detailed PR status including reviews, checks, and mergeable state
  - `dev_pr_generate_description` - Generate PR descriptions from commits with conventional commit parsing
- **Issue Integration Tools** (Phase 1)
  - `dev_issue_branch` - Create branches from GitHub issues with automatic naming
  - `dev_issue_list` - List and filter project issues with advanced options
  - `dev_issue_update` - Update issue status and add comments with branch context
- **Release Management Tools** (Phase 1)
  - `dev_version_bump` - Bump project version (major/minor/patch/custom)
  - `dev_changelog` - Generate changelogs from commits with conventional commit support
  - `dev_release` - Create GitHub releases with automatic changelog generation
  - `dev_release_latest` - Get information about the latest release
  - `dev_release_list` - List recent releases
- Enhanced GitHub API integration with comprehensive error handling
- Support for conventional commits in changelog generation
- Automatic issue linking in commits and PR descriptions

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