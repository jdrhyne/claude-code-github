# claude-code-github

An MCP server for Claude Code that automates your Git workflow, from local commits to GitHub pull requests.

[![npm version](https://badge.fury.io/js/@jdrhyne%2Fclaude-code-github.svg)](https://badge.fury.io/js/@jdrhyne%2Fclaude-code-github)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

`claude-code-github` bridges the gap between Claude Code and your local Git workflow. Instead of manually running `git` commands and navigating to GitHub to create pull requests, you can ask Claude to handle your entire development workflow.

**Before**: 
```bash
git add .
git commit -m "feat: add user authentication"
git push origin feature/auth
# Then navigate to GitHub to create PR...
```

**After**:
> "Claude, create a feature branch for user authentication and commit my changes"

> "Claude, open a draft pull request for my current work"

The server monitors your project files in the background and provides Claude with real-time status updates, allowing the AI to make intelligent decisions about when to commit, when to create branches, and when you're ready for a pull request.

## Key Features

- 🔄 **Intelligent Git Workflow** - Claude understands your repository state and suggests appropriate actions
- 🛡️ **Protected Branch Safety** - Prevents accidental commits to main/develop branches
- 🚀 **Automated PR Creation** - One command creates and pushes branches, then opens GitHub PRs
- 📊 **Real-time Status** - Background file monitoring provides Claude with current diff and change summaries
- 🔐 **Secure Token Management** - GitHub tokens stored safely in your system keychain
- ⚙️ **Configurable Workflows** - Customize branch prefixes, protected branches, and reviewers per project

## Prerequisites

- **Node.js 16+** - Required to run the MCP server
- **Git** - Must be available in your PATH
- **GitHub Account** - For pull request creation (Personal Access Token required)
- **Claude Code** - The official Claude Code CLI

## Installation

### Via npx (Recommended)

No installation required! The server runs on-demand:

```bash
npx @jdrhyne/claude-code-github@latest
```

### Global Installation

For permanent installation:

```bash
npm install -g @jdrhyne/claude-code-github
```

## Quick Start

### 1. Run the Server

```bash
npx @jdrhyne/claude-code-github@latest
```

On first run, the server will:
- Create a configuration file at `~/.config/claude-code-github/config.yml`
- Prompt you to create a GitHub Personal Access Token
- Exit with instructions to configure your projects

### 2. Configure Your Projects

Edit the configuration file at `~/.config/claude-code-github/config.yml`:

```yaml
# Global Git workflow settings
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

# Projects to monitor
projects:
  - path: "/Users/yourname/Projects/my-awesome-app"
    github_repo: "yourname/my-awesome-app"
    reviewers:
      - "teammate1"
      - "teammate2"

  - path: "/Users/yourname/Projects/another-project"  
    github_repo: "yourname/another-project"
```

### 3. Set Up GitHub Token

When prompted, create a GitHub Personal Access Token:

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens/new)
2. Create a token with `repo` and `workflow` scopes
3. Enter the token when prompted by the server

The token is stored securely in your system's keychain (macOS Keychain, Windows Credential Manager, etc.).

### 4. Configure Claude Code

Add the server to your Claude Code configuration:

**macOS/Linux**: `~/.claude/config.json`  
**Windows**: `%APPDATA%\.claude\config.json`

```json
{
  "mcpServers": {
    "claude-code-github": {
      "command": "npx",
      "args": [
        "-y",
        "@jdrhyne/claude-code-github@latest"
      ]
    }
  }
}
```

## Usage Examples

### Get Project Status

> **You**: "Claude, what's the status of my current project?"

Claude will use the `development.status()` tool to show:
- Current branch name
- Whether you're on a protected branch
- List of modified, added, and deleted files
- Summary of your changes (diff)

### Create a Feature Branch

> **You**: "Claude, create a feature branch called 'user-profile' and commit my changes with the message 'feat: add user profile page'"

Claude will:
1. Verify you're not on a protected branch
2. Create branch `feature/user-profile`
3. Switch to the new branch
4. Stage and commit all changes
5. Confirm the operation

### Open a Pull Request

> **You**: "Claude, create a draft pull request for my current work"

Claude will:
1. Push your current branch to GitHub
2. Create a draft pull request
3. Add configured reviewers
4. Return the PR URL for review

### Make a Checkpoint

> **You**: "Claude, checkpoint my work with message 'WIP: implementing authentication logic'"

Claude will commit your current changes without switching branches.

## Available Tools

The server provides these tools to Claude:

### `development.status()`
Returns comprehensive project status including branch info, protected branch warnings, and detailed change summaries.

### `development.create_branch(name, type, message)`
Creates a new branch with appropriate prefix and commits current changes.

**Parameters**:
- `name`: Branch name (without prefix)
- `type`: Branch type (`feature`, `bugfix`, `refactor`)  
- `message`: Commit message

### `development.create_pull_request(title, body, is_draft)`
Pushes current branch and creates a GitHub pull request.

**Parameters**:
- `title`: PR title
- `body`: PR description
- `is_draft`: Whether to create as draft (default: true)

### `development.checkpoint(message)`
Commits current changes with the provided message.

**Parameters**:
- `message`: Commit message

## Configuration Reference

### Git Workflow Settings

```yaml
git_workflow:
  main_branch: main                    # Default branch name
  protected_branches:                  # Branches that prevent direct commits
    - main
    - develop
    - production
  branch_prefixes:                     # Prefixes for different branch types
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/
    hotfix: hotfix/
```

### Project Configuration

```yaml
projects:
  - path: "/absolute/path/to/project"  # Must be absolute path
    github_repo: "owner/repository"    # GitHub repository identifier
    reviewers:                         # Optional: default reviewers for PRs
      - "github-username1"
      - "github-username2"
```

## Security & Safety

### Protected Branches
The server refuses to perform operations that would result in direct commits to protected branches. This prevents accidental commits to `main` or `develop`.

### Secure Token Storage
GitHub tokens are stored in your system's native credential manager:
- **macOS**: Keychain Access
- **Windows**: Windows Credential Manager  
- **Linux**: libsecret/keyring

Tokens are never stored in configuration files or logs.

### Remote Validation
Before pushing to GitHub, the server validates that your local Git remote matches the configured repository, preventing accidental pushes to wrong repositories.

## Troubleshooting

### Server Won't Start

```bash
# Check Node.js version
node --version  # Should be 16+

# Verify Git is available
git --version

# Run with debug output
DEBUG=* npx @jdrhyne/claude-code-github@latest
```

### Configuration Issues

```bash
# Check configuration file location
ls -la ~/.config/claude-code-github/

# Validate configuration
npx @jdrhyne/claude-code-github@latest --validate-config
```

### GitHub Authentication

```bash
# Test GitHub token manually
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Clear stored token (to re-enter)
npx @jdrhyne/claude-code-github@latest --reset-token
```

### Git Repository Issues

```bash
# Verify repository status
cd /path/to/your/project
git status
git remote -v

# Check repository permissions
git push --dry-run
```

## Development

### Building from Source

```bash
git clone https://github.com/your-org/claude-code-github.git
cd claude-code-github
npm install
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Development Mode

```bash
# Run in development with auto-reload
npm run dev

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## Architecture

The server consists of several key components:

- **MCP Server**: JSON-RPC 2.0 protocol handler for Claude Code communication
- **File Watcher**: Efficient OS-native file system monitoring
- **Git Manager**: Git operations and repository state management
- **GitHub Manager**: GitHub API integration with secure authentication
- **Development Tools**: High-level workflow automation tools
- **Configuration Manager**: YAML-based configuration with validation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [Claude Code](https://claude.ai/code) - The official Claude Code CLI
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol specification

---

**Made with ❤️ for developers who want to focus on code, not Git workflows.**