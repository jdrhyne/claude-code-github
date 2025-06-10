# claude-code-github

![Claude Code GitHub Hero](docs/images/claude-code-github-hero.png)

An MCP server for Claude Code that automates your Git workflow, from local commits to GitHub pull requests.

[![npm version](https://img.shields.io/npm/v/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
[![npm downloads](https://img.shields.io/npm/dt/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
[![CI](https://github.com/jdrhyne/claude-code-github/actions/workflows/ci.yml/badge.svg)](https://github.com/jdrhyne/claude-code-github/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jdrhyne/claude-code-github/actions/workflows/codeql.yml/badge.svg)](https://github.com/jdrhyne/claude-code-github/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@jdrhyne/claude-code-github.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Changelog](https://img.shields.io/badge/changelog-Keep%20a%20Changelog-orange)](CHANGELOG.md)

## 🚀 Quick Start

```bash
# Install and run with npx (recommended)
npx @jdrhyne/claude-code-github@latest

# Or install globally
npm install -g @jdrhyne/claude-code-github
```

📦 **[View on npm](https://www.npmjs.com/package/@jdrhyne/claude-code-github)** • 📚 **[Full Installation Guide](#installation)**

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

## Why Use This?

### 🚀 **Productivity Benefits**
- **5-step process → 1 command**: Instead of manual git add/commit/push/PR creation, just ask Claude
- **No context switching**: Stay in your editor, let Claude handle GitHub navigation
- **Intelligent timing**: Claude knows when you have enough changes to warrant a commit or PR
- **Consistent workflows**: Enforces best practices like conventional commits and protected branches

### 🛡️ **Safety & Quality**
- **Protected branch enforcement**: Impossible to accidentally commit to main/develop
- **Repository validation**: Prevents pushing to wrong repositories
- **Secure authentication**: GitHub tokens never stored in files or logs
- **Change validation**: Claude reviews your changes before committing

### ⚡ **Developer Experience**
- **Natural language interface**: "Create a feature branch for user auth" vs memorizing git commands
- **Context-aware suggestions**: Claude suggests next steps based on repository state
- **Real-time monitoring**: Instant status updates without running git status
- **Team collaboration**: Automatic reviewer assignment and draft PR creation

## Table of Contents

- [🚀 Quick Start](#-quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#quick-start)
- [Usage Examples](#usage-examples--workflows)
- [Available Tools](#available-tools)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [Changelog](CHANGELOG.md)

## Key Features

- 🔄 **Intelligent Git Workflow** - Claude understands your repository state and suggests appropriate actions
- 🛡️ **Protected Branch Safety** - Prevents accidental commits to main/develop branches
- 🚀 **Automated PR Creation** - One command creates and pushes branches, then opens GitHub PRs
- 📊 **Real-time Status** - Background file monitoring provides Claude with current diff and change summaries
- 🔐 **Secure Token Management** - GitHub tokens stored safely in your system keychain
- ⚙️ **Configurable Workflows** - Customize branch prefixes, protected branches, and reviewers per project

## Prerequisites

- **Node.js 16+** - Required to run the MCP server (tested with 16.x, 18.x, 20.x, 22.x)
- **Git** - Must be available in your PATH (version 2.20+ recommended)
- **GitHub Account** - For pull request creation (Personal Access Token required)
- **Claude Code** - The official Claude Code CLI

### Version Compatibility

| Component | Minimum Version | Tested Versions | Notes |
|-----------|----------------|-----------------|--------|
| Node.js | 16.0.0 | 16.x, 18.x, 20.x, 22.x | LTS versions recommended |
| Git | 2.20.0 | 2.20+, 2.30+, 2.40+ | Modern Git features required |
| Claude Code | Latest | Latest stable | MCP protocol support needed |

### Operating System Support

- ✅ **macOS** - Native keychain integration
- ✅ **Windows** - Windows Credential Manager integration  
- ✅ **Linux** - libsecret/keyring integration

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

**First run behavior**:
- Creates a configuration file at `~/.config/claude-code-github/config.yml`
- Displays instructions to configure your projects
- Exits so you can edit the config

**Subsequent runs**:
- Starts silently and waits for JSON-RPC communication
- No console output = server is working correctly
- Press Ctrl+C to stop the server when testing

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

Add the MCP server using the Claude CLI:

```bash
# Add the MCP server to Claude Code
claude mcp add claude-code-github npx -- -y @jdrhyne/claude-code-github@latest

# Verify it was added
claude mcp list

# View server details
claude mcp get claude-code-github
```

**Alternative**: If you're using a local installation:
```bash
claude mcp add claude-code-github node /path/to/claude-code-github/dist/index.js
```

**Note**: The server will securely prompt for your GitHub token on first use through the keychain.

### 5. Test Your Setup

Verify everything is working correctly:

```bash
# Verify Node.js version
node --version  # Should be 16+

# Verify Git is available
git --version

# Test the server starts (should run silently and wait for input)
npx @jdrhyne/claude-code-github@latest
# Press Ctrl+C to exit after a few seconds - this means it's working!

# Test server responds to JSON-RPC (optional verification)
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | npx @jdrhyne/claude-code-github@latest
# Should output a JSON response, then Ctrl+C to exit
```

**Important**: The MCP server runs **silently** when working correctly. If you see no output and the process keeps running, that's perfect! The server communicates via JSON-RPC protocol, not console messages.

### 6. Test with Claude Code

Once Claude Code is configured, test the integration:

```bash
# Check Claude Code can communicate (run this in a configured Git repository)
claude-code "What's the status of my current project?"
```

## Key Use Cases

### 🚀 **Feature Development**
Perfect for developers who want to focus on coding rather than Git commands:
- Automatic branch creation with proper naming conventions
- Intelligent commit timing based on code changes
- Seamless PR creation with team reviewer assignment

### 👥 **Team Collaboration**
Ideal for teams that want consistent Git workflows:
- Enforced protected branch policies
- Standardized commit message formats
- Automatic reviewer assignment per project

### 🏢 **Enterprise Development**
Great for organizations with strict development processes:
- GitHub Enterprise support
- Configurable workflow rules
- Secure token management
- Audit trail through Git history

### 🔄 **CI/CD Integration**
Works well with automated deployment pipelines:
- Draft PRs for review before merging
- Consistent branch naming for automated testing
- Protected branch enforcement prevents broken deployments

## Usage Examples & Workflows

### Get Project Status

> **You**: "Claude, what's the status of my current project?"

Claude will use the `dev_status` tool to show:
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

### Working with Issues

> **You**: "Show me my open issues"

Claude will list all open issues assigned to you.

> **You**: "Create a branch from issue #42"

Claude will create a branch like `feature/42-implement-user-auth` based on the issue title.

> **You**: "Update issue #42 with a comment about my progress"

Claude will add a comment to the issue, automatically noting which branch you're working on.

### Managing Pull Requests

> **You**: "What's the status of PR #55?"

Claude will show detailed PR status including review status, CI checks, and mergeable state.

> **You**: "Update PR #55 to remove draft status and add reviewers alice and bob"

Claude will update the PR accordingly.

> **You**: "Generate a PR description based on my commits"

Claude will analyze your commits and create a well-formatted PR description.

### Release Management

> **You**: "Bump the version to 2.0.0"

Claude will update package.json and stage the changes.

> **You**: "Generate a changelog since the last release"

Claude will create a changelog grouped by features, fixes, and breaking changes.

> **You**: "Create a new release v2.0.0"

Claude will create a tag, generate release notes, and publish a GitHub release.

### Complete Development Workflow

Here's a full example workflow from start to finish:

> **You**: "Claude, I'm starting work on a new user authentication feature. What's my current status?"

> **Claude**: *Uses dev_status* - "You're on branch 'main' with 3 uncommitted files. I can see changes to login.js, auth.js, and tests. Since you're on a protected branch, let me create a feature branch for you."

> **You**: "Perfect! Create a feature branch called 'auth-system' and commit these changes."

> **Claude**: *Uses dev_create_branch* - "Created branch 'feature/auth-system' and committed your changes with message 'feat: add authentication system foundation'. You now have a clean working directory on your feature branch."

> **You**: "I've made more changes. Can you check my progress and create a pull request when ready?"

> **Claude**: *Uses dev_status* - "You have 2 new files and 1 modification. The changes look substantial - implementing login validation and user sessions. This looks ready for review. Shall I create a draft pull request?"

> **You**: "Yes, create a draft PR with title 'Add User Authentication System'"

> **Claude**: *Uses dev_create_pull_request* - "Created draft pull request #42: 'Add User Authentication System' at https://github.com/yourname/project/pull/42. I've assigned your configured reviewers and marked it as draft so you can review before marking ready."

### Error Handling Examples

**Protected Branch Safety**:
> **You**: "Commit my changes to main"
> **Claude**: "I cannot commit directly to the protected branch 'main'. Let me create a feature branch for these changes instead. What would you like to name this branch?"

**No Changes to Commit**:
> **You**: "Create a checkpoint"
> **Claude**: "I don't see any uncommitted changes in your repository. Your working directory is clean. Would you like me to check the status of your current branch instead?"

**GitHub Authentication Issues**:
> **You**: "Create a pull request"
> **Claude**: "I'm having trouble authenticating with GitHub. Your token may have expired. Please run `npx @jdrhyne/claude-code-github@latest --reset-token` to re-enter your credentials."

## Available Tools

The server provides these tools to Claude:

### Core Development Tools

#### `dev_status()`
Returns comprehensive project status including branch info, protected branch warnings, and detailed change summaries.

#### `dev_status_enhanced()`
Get comprehensive project status including PRs, issues, CI/CD status, and more.

#### `dev_create_branch(name, type, message)`
Creates a new branch with appropriate prefix and commits current changes.

**Parameters**:
- `name`: Branch name (without prefix)
- `type`: Branch type (`feature`, `bugfix`, `refactor`)  
- `message`: Commit message

#### `dev_create_pull_request(title, body, is_draft)`
Pushes current branch and creates a GitHub pull request.

**Parameters**:
- `title`: PR title
- `body`: PR description
- `is_draft`: Whether to create as draft (default: true)

#### `dev_checkpoint(message, push?)`
Commits current changes with the provided message.

**Parameters**:
- `message`: Commit message
- `push`: Whether to push to remote (optional)

#### `dev_quick(action)`
Perform common workflow actions quickly.

**Parameters**:
- `action`: One of `wip`, `fix`, `done`, `sync`, `update`

### Enhanced PR Management Tools

#### `dev_pr_update(pr_number, ...)`
Update an existing pull request.

**Parameters**:
- `pr_number`: The PR number to update
- `title`: New title (optional)
- `body`: New description (optional)
- `draft`: Draft status (optional)
- `reviewers`: Array of reviewers (optional)
- `labels`: Array of labels (optional)

#### `dev_pr_status(pr_number)`
Get detailed status of a pull request including reviews, checks, and mergeable state.

#### `dev_pr_generate_description(template?)`
Generate a pull request description based on commits.

### Issue Integration Tools

#### `dev_issue_branch(issue_number, branch_type?)`
Create a new branch from a GitHub issue.

**Parameters**:
- `issue_number`: The issue number
- `branch_type`: Type of branch (default: `feature`)

#### `dev_issue_list(state?, labels?, ...)`
List GitHub issues with filtering options.

**Parameters**:
- `state`: `open`, `closed`, or `all`
- `labels`: Array of label names
- `assignee`: Filter by assignee
- `sort`: Sort by `created`, `updated`, or `comments`
- `limit`: Maximum results

#### `dev_issue_update(issue_number, ...)`
Update a GitHub issue.

**Parameters**:
- `issue_number`: The issue number
- `comment`: Add a comment
- `state`: Change state to `open` or `closed`
- `labels`: Update labels

### Release Management Tools

#### `dev_version_bump(type, custom_version?)`
Bump the project version.

**Parameters**:
- `type`: `major`, `minor`, `patch`, or `custom`
- `custom_version`: Version string (when type is `custom`)

#### `dev_changelog(from?, to?)`
Generate a changelog based on commits.

**Parameters**:
- `from`: Starting Git ref (tag, commit, branch)
- `to`: Ending Git ref (default: HEAD)

#### `dev_release(tag_name, ...)`
Create a GitHub release with automatic changelog generation.

**Parameters**:
- `tag_name`: The tag name (e.g., v1.2.3)
- `name`: Release name (optional)
- `body`: Release notes (auto-generated if not provided)
- `draft`: Whether to create as draft
- `prerelease`: Whether this is a pre-release

#### `dev_release_latest()`
Get information about the latest release.

#### `dev_release_list(limit?)`
List recent releases.

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

### Advanced Configuration

#### Multiple Project Types

```yaml
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
    - production
    - staging
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/
    hotfix: hotfix/
    chore: chore/

projects:
  # Frontend React project
  - path: "/Users/dev/frontend-app"
    github_repo: "company/frontend-app"
    reviewers: ["frontend-team", "ui-designer"]
    
  # Backend API project  
  - path: "/Users/dev/api-server"
    github_repo: "company/api-server"
    reviewers: ["backend-team", "devops"]
    
  # Documentation project
  - path: "/Users/dev/docs"
    github_repo: "company/documentation"
    reviewers: ["tech-writer", "product-manager"]
```

#### Team/Organization Setup

```yaml
# Enterprise GitHub configuration
git_workflow:
  main_branch: develop  # Different default branch
  protected_branches:
    - main
    - develop
    - release/*
    - hotfix/*
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    release: release/
    hotfix: hotfix/

projects:
  - path: "/workspace/main-product"
    github_repo: "enterprise/main-product"
    reviewers: 
      - "@enterprise/senior-developers"
      - "@enterprise/security-team"
```

## Environment Variables

You can customize the server behavior using environment variables:

```bash
# Configuration
export CLAUDE_CODE_GITHUB_CONFIG_PATH="/custom/path/to/config.yml"
export CLAUDE_CODE_GITHUB_DEBUG=true

# GitHub API
export GITHUB_API_URL="https://api.github.com"  # For GitHub Enterprise
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"  # Alternative to keychain storage

# Performance tuning
export CLAUDE_CODE_GITHUB_FILE_WATCH_DEBOUNCE=500  # ms
export CLAUDE_CODE_GITHUB_MAX_DIFF_SIZE=50000      # characters

# Security
export CLAUDE_CODE_GITHUB_DISABLE_KEYCHAIN=false   # Force file-based token storage
export CLAUDE_CODE_GITHUB_VALIDATE_REMOTES=true    # Enable remote validation
```

### Usage with Environment Variables

```bash
# Run with custom config path
CLAUDE_CODE_GITHUB_CONFIG_PATH="/work/config.yml" npx @jdrhyne/claude-code-github@latest

# Run with debug logging
CLAUDE_CODE_GITHUB_DEBUG=true npx @jdrhyne/claude-code-github@latest

# Run with GitHub Enterprise
GITHUB_API_URL="https://github.company.com/api/v3" npx @jdrhyne/claude-code-github@latest
```

## Performance & Limits

### File Watching
- **Debounce**: 500ms default (configurable)
- **Ignored patterns**: node_modules, .git, dist, build automatically excluded
- **Large repos**: Tested with repositories up to 50,000 files
- **Memory usage**: ~50-100MB baseline, scales with repository size

### GitHub API
- **Rate limiting**: Respects GitHub's rate limits (5,000 requests/hour)
- **Timeout**: 30-second timeout for API requests
- **Retry logic**: Automatic retry with exponential backoff
- **Concurrent requests**: Limited to 3 concurrent API calls

### System Requirements
- **Minimum RAM**: 256MB available
- **Disk space**: ~50MB for installation + log files
- **Network**: Outbound HTTPS access to GitHub API required

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

### Common Questions

#### "The server doesn't show any output - is it working?"

**This is normal!** MCP servers run silently when working correctly. You should see:

✅ **Expected**: No console output, process keeps running  
✅ **Expected**: Process responds to Ctrl+C to terminate  
❌ **Problem**: Error messages or immediate exit  

```bash
# Test if it's working - run this and wait a few seconds:
npx @jdrhyne/claude-code-github@latest
# If no errors appear and it keeps running, it's working perfectly!
# Press Ctrl+C to exit
```

#### "Server starts but Claude Code can't find my project"

Make sure your project is configured in `~/.config/claude-code-github/config.yml`:

```yaml
projects:
  - path: "/full/absolute/path/to/your/project"  # Must be absolute!
    github_repo: "username/repository-name"
```

The server automatically detects which project you're in based on your current directory.

**Project Detection Rules**:
- Server matches your current directory against configured project paths
- If you're in `/Users/you/code/myapp`, it looks for a project with path `/Users/you/code/myapp`
- If no exact match, it falls back to the first project in your config
- The server works from any directory, but tools work best when run from a configured project

### Installation & Startup Issues

#### Server Won't Start
```bash
# Check Node.js version and upgrade if needed
node --version  # Should be 16+
nvm install 20  # If using nvm

# Verify Git is available
git --version
which git

# Clear npm cache if installation fails
npm cache clean --force

# Run with debug output
DEBUG=claude-code-github* npx @jdrhyne/claude-code-github@latest
```

#### Permission Errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Windows: Run as Administrator or use:
npm config set prefix %APPDATA%\npm
```

### Configuration Issues

#### Missing Config File
```bash
# Check configuration file exists
ls -la ~/.config/claude-code-github/config.yml

# If missing, run server once to create it
npx @jdrhyne/claude-code-github@latest

# Validate configuration syntax
npx @jdrhyne/claude-code-github@latest --validate-config
```

#### Invalid Project Paths
```bash
# Verify project paths exist and are accessible
ls -la "/path/to/your/project"

# Check Git repository status
cd "/path/to/your/project"
git status

# Verify remote repository matches config
git remote -v
```

### GitHub Authentication Issues

#### Token Creation & Validation
```bash
# Test GitHub token manually
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# For GitHub Enterprise
curl -H "Authorization: token YOUR_TOKEN" https://github.company.com/api/v3/user

# Clear stored token and re-enter
npx @jdrhyne/claude-code-github@latest --reset-token
```

#### Common Token Errors
- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Insufficient token scopes (need `repo` and `workflow`)
- **404 Not Found**: Repository doesn't exist or no access

#### Token Scope Verification
```bash
# Check token scopes
curl -H "Authorization: token YOUR_TOKEN" -I https://api.github.com/user

# Look for X-OAuth-Scopes header
# Should include: repo, workflow
```

### Git Repository Issues

#### Repository State Problems
```bash
# Verify repository is clean
git status

# Check for merge conflicts
git diff --check

# Verify remote connectivity
git ls-remote origin

# Test push permissions
git push --dry-run
```

#### Branch Protection Issues
```bash
# Check if you're on a protected branch
git branch --show-current

# List protected branches (requires API access)
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/owner/repo/branches
```

### Claude Code Integration Issues

#### MCP Server Communication
```bash
# Test Claude Code can reach the server
claude-code "What MCP servers are available?"

# Verify server is listed
claude-code "List available tools"

# Test specific tool
claude-code "What's the status of my current project?"
```

#### Configuration File Issues
```bash
# Verify Claude Code config syntax
cat ~/.claude/config.json | jq .

# Check server configuration
jq .mcpServers ~/.claude/config.json
```

### Performance Issues

#### Slow File Watching
```bash
# Reduce file watching load
export CLAUDE_CODE_GITHUB_FILE_WATCH_DEBOUNCE=1000

# Exclude more directories in .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo ".next/" >> .gitignore
```

#### Memory Usage
```bash
# Monitor server memory usage
ps aux | grep claude-code-github

# Limit diff size for large repositories
export CLAUDE_CODE_GITHUB_MAX_DIFF_SIZE=10000
```

### Network & Firewall Issues

#### Corporate Firewall
```bash
# Test GitHub API connectivity
curl -v https://api.github.com/zen

# Configure proxy if needed
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

#### SSL Certificate Issues
```bash
# For corporate certificates
npm config set cafile /path/to/certificate.crt

# Disable SSL verification (not recommended for production)
npm config set strict-ssl false
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOENT: no such file` | Invalid project path | Check path in config.yml |
| `Bad credentials` | Invalid GitHub token | Reset token with `--reset-token` |
| `Not a git repository` | Path not a Git repo | Run `git init` or fix path |
| `Protected branch` | Trying to commit to main | Create feature branch first |
| `Network unreachable` | Connectivity issues | Check internet/firewall |
| `Rate limit exceeded` | Too many API calls | Wait 1 hour or use different token |

### Getting Help

If you're still having issues:

1. **Enable debug mode**: `DEBUG=claude-code-github* npx @jdrhyne/claude-code-github@latest`
2. **Check the logs**: Look for error messages in the output
3. **Verify all prerequisites**: Node.js, Git, GitHub token, Claude Code
4. **Test each component**: GitHub API, Git operations, file watching
5. **Create an issue**: https://github.com/jdrhyne/claude-code-github/issues

## Development

### Building from Source

```bash
git clone https://github.com/jdrhyne/claude-code-github.git
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