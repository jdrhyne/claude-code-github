# claude-code-github

![Claude Code GitHub Hero](docs/images/claude-code-github-hero.png)

An **intelligent MCP server** for Claude Code that monitors your development patterns and automates Git workflows with smart suggestions.

**🎉 NEW in v2.2.0**: Domain-Driven Design architecture, enhanced security, and improved TypeScript support!

[![npm version](https://img.shields.io/npm/v/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
[![npm downloads](https://img.shields.io/npm/dt/@jdrhyne/claude-code-github.svg)](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
[![CI](https://github.com/jdrhyne/claude-code-github/actions/workflows/ci.yml/badge.svg)](https://github.com/jdrhyne/claude-code-github/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jdrhyne/claude-code-github/actions/workflows/codeql.yml/badge.svg)](https://github.com/jdrhyne/claude-code-github/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@jdrhyne/claude-code-github.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Changelog](https://img.shields.io/badge/changelog-read%20it-orange)](CHANGELOG.md)

## 🚀 Quick Start

```bash
# Install and run with npx (recommended)
npx @jdrhyne/claude-code-github@latest

# Or install globally
npm install -g @jdrhyne/claude-code-github
```

Let Claude handle your Git workflow with **intelligent automation**:
- 🧠 **Smart Suggestions**: "You've been working for 2 hours - consider committing your progress"
- 🛡️ **Safety Warnings**: "You're working on main branch - create a feature branch?"  
- 🗣️ **Natural Commands**: "Claude, create a feature branch and commit my changes"
- 📝 **Workflow Automation**: "Claude, open a draft pull request for my current work"
- 🔍 **Intelligent Status**: "Claude, what's the status of my current project?"
- 🖥️ **Real-Time Monitoring**: Watch agent decisions in beautiful terminal dashboards

**NEW:** Monitor autonomous agent activity with real-time dashboards:
```bash
# Launch interactive monitoring dashboard
npx @jdrhyne/claude-code-github monitor

# Stream events to console
npx @jdrhyne/claude-code-github stream
```

## Table of Contents

- [What's New in v2.2.0](#whats-new-in-v220)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Intelligent Suggestions](#intelligent-suggestions)
- [Agent Monitoring](#agent-monitoring)
- [Usage Examples](#usage-examples)
- [Available Tools](#available-tools)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Upgrading from v2.1.0](#upgrading-from-v210)

## What's New in v2.2.0

### 🏗️ **Domain-Driven Design Architecture**
- Complete bounded contexts implementation for better code organization
- CQRS pattern for clean separation of commands and queries
- Event-driven architecture with domain events
- Type-safe value objects and aggregates

### 🛡️ **Enhanced Security**
- Fixed type confusion vulnerability in query parameter handling
- Comprehensive type-safe query parameter extraction
- Improved input validation across all endpoints

### 📊 **Better Developer Experience**
- Updated to TypeScript ESLint v8 for better code quality
- Improved error messages and debugging
- Enhanced performance monitoring
- Full backward compatibility

## Key Features

### 🧠 **Intelligent Workflow Assistant**
- **Pattern Recognition** - Analyzes your work patterns and provides contextual suggestions
- **Time Tracking** - Reminds you to commit after extended work sessions (configurable thresholds)
- **Change Analysis** - Suggests optimal commit strategies based on file types and changes
- **Workflow Guidance** - Recommends when to branch, commit, or create pull requests

### 🔍 **Active Monitoring System**
- **Conversation Tracking** - Monitors your development conversation for progress insights
- **Event Aggregation** - Detects milestones like feature completion and test success
- **Smart Notifications** - Proactive suggestions based on your development activity
- **Release Detection** - Knows when you're ready for a release based on completed work
- **Workspace Monitoring** (NEW v1.3.0) - Real-time detection of new Git repositories in your folders

### 🛡️ **Smart Safety & Best Practices**
- **Protected Branch Safety** - Warns when working directly on main/develop branches
- **Atomic Commit Suggestions** - Identifies large changesets and mixed change types
- **PR Readiness Detection** - Suggests creating pull requests when branches are ready
- **Work Loss Prevention** - Time-based reminders to avoid losing uncommitted work

### 🔧 **Powerful Automation**
- **Natural Language Control** - Claude understands repository state and suggests appropriate actions
- **Automated PR Creation** - One command creates branches, commits, pushes, and opens GitHub PRs
- **Real-time Monitoring** - Background file watching provides intelligent context
- **Configurable Intelligence** - Customize suggestion types, thresholds, and behavior per project

### 🔐 **Enterprise Ready**
- **Secure Token Management** - GitHub tokens stored safely in your system keychain
- **Multi-Project Support** - Different configurations for different workflow styles
- **Cross-Platform** - Works on macOS, Windows, and Linux with native integrations

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

### Automatic Project Discovery

Instead of manually configuring each project, you can enable automatic discovery:

```yaml
# Automatic project discovery configuration
project_discovery:
  enabled: true                 # Enable automatic discovery of Git repositories
  scan_paths:                   # List of directories to scan for Git repositories
    - "/Users/yourname/Projects"
    - "/Users/yourname/Work"
  exclude_patterns:             # Patterns to exclude from scanning
    - "*/node_modules/*"
    - "*/archived/*"
    - "*/.Trash/*"
  auto_detect_github_repo: true # Automatically detect GitHub repository from git remote
  max_depth: 3                  # Maximum directory depth to scan

# Your manually configured projects (discovered projects will be added to this list)
projects: []
```

When enabled, claude-code-github will:
- Scan the specified directories for Git repositories
- Automatically detect the GitHub repository from the git remote URL
- Merge discovered projects with your manually configured ones
- Skip common non-project directories like `node_modules`, `.git`, etc.

### Workspace Monitoring (NEW in v1.3.0)

Enable real-time monitoring of your development folders:

```yaml
# Workspace monitoring for real-time project detection
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/yourname/Projects"
      auto_detect: true
      cache_discovery: true
      github_repo_detection: from_remote  # or from_folder_name
```

Workspace monitoring:
- Detects when you clone or create new Git repositories
- Automatically adds them to your active projects
- Provides context awareness based on your current directory
- Uses efficient file system watchers for minimal overhead

See [Workspace Monitoring Guide](docs/WORKSPACE_MONITORING.md) for complete details.

### 2. Intelligent Suggestions

Configure the intelligent workflow assistant to match your preferences:

```yaml
# Intelligent suggestion system configuration
suggestions:
  enabled: true                 # Master switch for all suggestions
  
  # Warn when working directly on protected branches
  protected_branch_warnings: true
  
  # Time-based reminders for uncommitted work
  time_reminders:
    enabled: true
    warning_threshold_minutes: 120    # High priority warning after 2 hours
    reminder_threshold_minutes: 60    # Medium priority reminder after 1 hour
  
  # Large changeset suggestions
  large_changeset:
    enabled: true
    threshold: 5                # Suggest commit when this many files are changed
  
  # Pattern recognition for optimal workflows
  pattern_recognition: true     # Recognize tests + implementation patterns
  pr_suggestions: true          # Suggest PR creation when branches are ready
  change_pattern_suggestions: true  # Suggestions for doc + code patterns
  branch_suggestions: true      # Suggest feature branches for new work
```

**Per-Project Overrides**: Add `suggestions:` block to any project to override global settings:

```yaml
projects:
  - path: "/Users/yourname/Projects/prototype"
    github_repo: "yourname/prototype"
    suggestions:
      enabled: false           # Disable suggestions for prototyping
  
  - path: "/Users/yourname/Projects/production-app"
    github_repo: "yourname/production-app"
    suggestions:
      time_reminders:
        warning_threshold_minutes: 30  # Faster pace for production work
      large_changeset:
        threshold: 3           # Smaller commits for production
```

### 3. Active Monitoring Configuration (NEW)

Enable intelligent monitoring that tracks your development progress:

```yaml
# Advanced monitoring system configuration
monitoring:
  enabled: true                 # Master switch for monitoring system
  conversation_tracking: true   # Track conversation for development insights
  auto_suggestions: true        # Automatically suggest based on activity
  commit_threshold: 5           # Suggest commit after this many changes
  release_threshold:
    features: 3                 # Suggest release after this many features
    bugfixes: 10                # Or this many bug fixes
  notification_style: inline    # inline, summary, or none
  learning_mode: false          # Learn from your development patterns
```

The monitoring system automatically:
- Detects when you complete features, fix bugs, or add tests
- Tracks file changes and suggests optimal commit timing
- Identifies release-ready milestones
- Provides contextual notifications without interrupting flow

### 4. API & Integration Configuration (NEW in v1.2.0)

Enable the API server for external integrations:

```yaml
# REST API and WebSocket server configuration
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    type: bearer
    tokens:
      - name: "vscode-extension"
        token: "your-secure-token"
        scopes: ["*"]

# Real-time WebSocket connections
websocket:
  enabled: true
  namespace: "/socket.io"  # Socket.IO namespace

# Webhook delivery for external services
webhooks:
  enabled: true
  signing_secret: "your-webhook-secret"  # For HMAC verification
  endpoints:
    - url: "https://your-server.com/claude-webhook"
      events: ["suggestion.*", "milestone.*"]
      auth:
        type: bearer
        token: "webhook-token"
      retry:
        max_attempts: 3
        backoff: exponential
```

The API enables:
- **REST API**: Query status, get suggestions, execute actions
- **WebSocket**: Real-time event streaming to clients
- **Webhooks**: Push events to external services
- **Integration**: VS Code extensions, Slack bots, dashboards

See the [Integration Guide](docs/INTEGRATION_GUIDE.md) for complete API documentation.

### 5. GitHub Token

Create a token at [GitHub Settings → Tokens](https://github.com/settings/tokens/new) with `repo` and `workflow` scopes. The server will prompt for it on first use and store it securely in your system keychain.

### 6. Configure Claude Code

```bash
# Add the MCP server
claude mcp add claude-code-github npx -- -y @jdrhyne/claude-code-github@latest

# Verify it's working (run in a Git repository)
claude-code "What's the status of my current project?"
```

## Agent Monitoring

### 🖥️ **Real-Time Monitoring Dashboard**

Monitor autonomous agent activities with beautiful terminal interfaces:

```bash
# Launch interactive dashboard
npx @jdrhyne/claude-code-github monitor

# Full-featured dashboard with controls
npx @jdrhyne/claude-code-github dashboard

# Minimal console streaming
npx @jdrhyne/claude-code-github stream
```

### 📊 **Dashboard Features**

- **Live Activity Feed** - Real-time stream of agent decisions with confidence levels
- **Decision Trees** - Visual representation of agent reasoning and logic
- **Interactive Controls** - Pause, resume, filter, and configure monitoring
- **Performance Stats** - Success rates, response times, and learning metrics

### 🎯 **Monitor Events**

Watch the agent's thought process in real-time:

```
🤖 Agent Stream │ my-app │ assisted mode
├─ 14:24:15 🔍 Scanning project for changes...
├─ 14:24:16 📁 Found 3 modified files
├─ 14:24:17 🧠 Analyzing change pattern...
│  ├─ Theme: Authentication feature
│  ├─ Quality: High cohesion
│  └─ Risk: Low (tests included)
├─ 14:24:18 💡 SUGGESTION: Create feature branch (87%)
└─ 14:24:25 ✅ User approved - executing...
```

### ⚡ **Event Types**

| Icon | Event | Description |
|------|-------|-------------|
| 🔍 | Scanning | Looking for changes |
| 🧠 | Analyzing | Processing detected changes |
| 💡 | Suggesting | Making recommendations |
| ⚡ | Executing | Performing actions |
| 📚 | Learning | Adapting from feedback |

### 🎛️ **Interactive Controls**

**Dashboard Mode:**
- `[p]` or `[space]` - Pause/Resume
- `[c]` - Clear logs  
- `[r]` - Refresh
- `[h]` - Help
- `[q]` - Quit

**Stream Mode:**
- `Ctrl+C` - Stop streaming

### 📡 **Advanced Monitoring**

```bash
# Monitor specific project
npx @jdrhyne/claude-code-github monitor --project ./my-app

# Filter events by type
npx @jdrhyne/claude-code-github stream --filter analyzing,suggesting

# Custom refresh rate
npx @jdrhyne/claude-code-github dashboard --refresh-rate 500

# No colors (for CI/logging)
npx @jdrhyne/claude-code-github stream --no-color
```

For complete monitoring documentation, see [Agent Monitoring Guide](docs/AGENT_MONITORING.md).

## Usage Examples

### Basic Workflow

```
You: "Claude, what's the status of my current project?"
You: "Claude, create a feature branch called 'user-profile' and commit my changes"
You: "Claude, create a draft pull request for my current work"
```

### Real-time Notifications (NEW)

Get real-time suggestions in your terminal while you work:

```bash
# Install globally or run with npx
npm install -g @jdrhyne/claude-code-github

# Start notifications in a separate terminal
claude-code-notify --sound

# Or with npx (no installation needed)
npx @jdrhyne/claude-code-github claude-code-notify --sound
```

This will show real-time notifications about:
- 💡 Development suggestions (commit reminders, branch suggestions)
- 🎉 Milestones reached (feature completions, release readiness)
- 📝 Commits and PRs (when using --verbose)

See [Notification Tools Guide](docs/NOTIFICATION_TOOLS.md) for more options.

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
| `dev_monitoring_status()` | View active monitoring insights and recent events |
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

**Monitoring Not Working**
- Check `monitoring.enabled: true` in config
- Ensure conversation tracking is enabled
- Use `dev_monitoring_status()` to check system status
- Notifications appear inline during conversation

**Zombie Processes**
- Fixed in latest version with process management
- Old processes are automatically cleaned up
- Check with: `ps aux | grep claude-code-github`

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

## Upgrading from v2.1.0

Upgrading to v2.2.0 is seamless with no breaking changes:

```bash
# Update to latest version
npm install -g @jdrhyne/claude-code-github@latest

# Or with npx (recommended)
npx @jdrhyne/claude-code-github@latest
```

### What's Improved

1. **Better Performance**: DDD architecture provides faster response times
2. **Enhanced Security**: Type-safe query handling prevents vulnerabilities  
3. **Improved Reliability**: Better error handling and recovery
4. **Richer Features**: More intelligent suggestions and monitoring

### Optional New Features

After upgrading, you can optionally enable:
- Enhanced monitoring dashboards
- Learning system for adaptive behavior
- Performance analytics
- Advanced error reporting

See the [v2.2.0 Changelog](CHANGELOG_v2.2.0.md) for complete details.

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
