# claude-code-github

![Claude Code GitHub Hero](docs/images/claude-code-github-hero.png)

An MCP server for Claude Code that automates your Git workflow, from local commits to GitHub pull requests.

[![npm version](https://img.shields.io/npm/v/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
[![npm downloads](https://img.shields.io/npm/dm/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
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

Let Claude handle your Git workflow with natural language commands:
- 🗣️ "Claude, create a feature branch and commit my changes"
- 📝 "Claude, open a draft pull request for my current work"
- 🔍 "Claude, what's the status of my current project?"

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Available Tools](#available-tools)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Key Features

- 🔄 **Intelligent Git Workflow** - Claude understands your repository state and suggests appropriate actions
- 🛡️ **Protected Branch Safety** - Prevents accidental commits to main/develop branches
- 🚀 **Automated PR Creation** - One command creates and pushes branches, then opens GitHub PRs
- 📊 **Real-time Status** - Background file monitoring provides Claude with current diff and change summaries
- 🔐 **Secure Token Management** - GitHub tokens stored safely in your system keychain
- ⚙️ **Configurable Workflows** - Customize branch prefixes, protected branches, and reviewers per project

## Prerequisites

- **Node.js 16+** (tested with 16.x, 18.x, 20.x, 22.x)
- **Git 2.20+** in your PATH
- **GitHub Account** with Personal Access Token
- **Claude Code** - The official Claude Code CLI

Works on macOS, Windows, and Linux with native keychain integration.

## Installation

```bash
# No installation required - run on demand with npx
npx @jdrhyne/claude-code-github@latest

# Or install globally
npm install -g @jdrhyne/claude-code-github
```

## Configuration

### 1. First Run Setup

```bash
npx @jdrhyne/claude-code-github@latest
```

First run creates `~/.config/claude-code-github/config.yml` and exits. Edit this file:

```yaml
git_workflow:
  main_branch: main
  protected_branches: [main, develop]
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

projects:
  - path: "/Users/yourname/Projects/my-app"
    github_repo: "yourname/my-app"
    reviewers: ["teammate1", "teammate2"]
```

### 2. GitHub Token

Create a token at [GitHub Settings → Tokens](https://github.com/settings/tokens/new) with `repo` and `workflow` scopes. The server will prompt for it on first use and store it securely in your system keychain.

### 3. Configure Claude Code

```bash
# Add the MCP server
claude mcp add claude-code-github npx -- -y @jdrhyne/claude-code-github@latest

# Verify it's working (run in a Git repository)
claude-code "What's the status of my current project?"
```

## Usage Examples

### Basic Workflow

```
You: "Claude, what's the status of my current project?"
You: "Claude, create a feature branch called 'user-profile' and commit my changes"
You: "Claude, create a draft pull request for my current work"
```

### Common Commands

| What you say | What Claude does |
|--------------|------------------|
| "What's my project status?" | Shows current branch, changes, and diff |
| "Create a feature branch for user auth" | Creates `feature/user-auth` and commits |
| "Open a draft PR" | Pushes branch and creates GitHub PR |
| "Checkpoint my work" | Commits current changes |
| "Show my open issues" | Lists GitHub issues assigned to you |
| "Create branch from issue #42" | Creates branch with issue title |
| "Update PR #55" | Modifies PR title, reviewers, or status |
| "Bump version to 2.0.0" | Updates package.json version |
| "Generate changelog" | Creates changelog from commits |
| "Create release v2.0.0" | Tags and publishes GitHub release |

### Complete Example

```
You: "I'm starting work on user authentication. What's my status?"
Claude: "You're on 'main' with 3 uncommitted files. Let me create a feature branch."

You: "Create a feature branch called 'auth-system' and commit these changes"
Claude: "Created 'feature/auth-system' and committed with 'feat: add authentication foundation'"

You: "Create a draft PR with title 'Add User Authentication'"
Claude: "Created draft PR #42 at github.com/yourname/project/pull/42"
```

## Available Tools

### Core Development Tools

| Tool | Description |
|------|-------------|
| `dev_status()` | Get project status with branch info and change summaries |
| `dev_create_branch(name, type, message)` | Create branch with prefix and commit changes |
| `dev_create_pull_request(title, body, is_draft)` | Push branch and create GitHub PR |
| `dev_checkpoint(message)` | Commit current changes |
| `dev_quick(action)` | Quick actions: `wip`, `fix`, `done`, `sync`, `update` |

### PR & Issue Management

| Tool | Description |
|------|-------------|
| `dev_pr_update(pr_number, ...)` | Update PR title, reviewers, labels, or draft status |
| `dev_pr_status(pr_number)` | Get PR reviews, checks, and mergeable state |
| `dev_issue_branch(issue_number)` | Create branch from GitHub issue |
| `dev_issue_list(state, labels, ...)` | List and filter GitHub issues |
| `dev_issue_update(issue_number, ...)` | Add comments or change issue state |

### Release Management

| Tool | Description |
|------|-------------|
| `dev_version_bump(type)` | Bump version (`major`, `minor`, `patch`) |
| `dev_changelog(from, to)` | Generate changelog between Git refs |
| `dev_release(tag_name, ...)` | Create GitHub release with notes |


## Troubleshooting

### Quick Fixes

| Issue | Solution |
|-------|----------|
| Server shows no output | **This is normal!** MCP servers run silently. Press Ctrl+C to exit. |
| Claude can't find project | Add project path to `~/.config/claude-code-github/config.yml` |
| Token errors | Run `npx @jdrhyne/claude-code-github@latest --reset-token` |
| Permission denied | Fix with `sudo chown -R $(whoami) ~/.npm` |
| Protected branch error | Create a feature branch first |

### Common Issues

**Server Won't Start**
```bash
node --version  # Should be 16+
git --version   # Should be 2.20+
DEBUG=claude-code-github* npx @jdrhyne/claude-code-github@latest
```

**GitHub Authentication**
```bash
# Test token
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Reset token
npx @jdrhyne/claude-code-github@latest --reset-token
```

**Configuration Problems**
```bash
# Validate config
npx @jdrhyne/claude-code-github@latest --validate-config

# Check project path exists
ls -la "/path/to/your/project"
```

### Getting Help

1. Enable debug mode: `DEBUG=claude-code-github* npx @jdrhyne/claude-code-github@latest`
2. Check prerequisites: Node.js 16+, Git 2.20+, GitHub token, Claude Code
3. Report issues: https://github.com/jdrhyne/claude-code-github/issues

## Development

```bash
# Clone and build
git clone https://github.com/jdrhyne/claude-code-github.git
cd claude-code-github
npm install
npm run build

# Testing
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report

# Development
npm run dev      # Auto-reload development
npm run lint     # Lint code
npm run typecheck # Type checking
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- 📦 [npm Package](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
- 🐛 [Report Issues](https://github.com/jdrhyne/claude-code-github/issues)
- 📖 [Changelog](CHANGELOG.md)
- 🤝 [Contributing](CONTRIBUTING.md)
- 🔒 [Security](SECURITY.md)

---

**Made with ❤️ for developers who want to focus on code, not Git workflows.**