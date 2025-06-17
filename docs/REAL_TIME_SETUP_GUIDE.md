# 🚀 Real-time Monitoring & Terminal Notifications Setup Guide

**Complete step-by-step guide to get live development suggestions in your terminal**

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Configuration](#basic-configuration)
4. [API Server Setup](#api-server-setup)
5. [Terminal Notifications Setup](#terminal-notifications-setup)
6. [Advanced Configuration](#advanced-configuration)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)
9. [Usage Examples](#usage-examples)
10. [Tips & Best Practices](#tips--best-practices)

---

## Prerequisites

### System Requirements
- **Node.js**: Version 16.0.0 or higher
- **npm**: Comes with Node.js
- **Git**: For project monitoring
- **Terminal**: Any modern terminal (Terminal.app, iTerm2, Windows Terminal, etc.)
- **Claude Code**: Already configured and working

### Verify Prerequisites
```bash
# Check Node.js version
node --version  # Should be 16.0.0+

# Check npm version
npm --version

# Check Git
git --version

# Verify Claude Code is working
claude --version
```

---

## Installation

### Step 1: Install/Update claude-code-github

Choose one of these installation methods:

#### Option A: NPX (Recommended - Always Latest)
```bash
# This will use the latest version automatically
npx @jdrhyne/claude-code-github@latest --version
```

#### Option B: Global Installation
```bash
# Install globally for easier access
npm install -g @jdrhyne/claude-code-github@latest

# Verify installation
claude-code-github --version  # Should show 2.0.0+
```

### Step 2: Verify Installation
```bash
# Check main command
npx @jdrhyne/claude-code-github@latest --help

# Check notification command is available
npx @jdrhyne/claude-code-github@latest
# Look for mention of claude-code-notify in output
```

---

## Basic Configuration

### Step 1: Initial Setup
```bash
# Run the setup wizard (creates config file)
npx @jdrhyne/claude-code-github@latest --setup
```

**Follow the interactive prompts:**
1. **GitHub Token**: Enter your GitHub Personal Access Token
2. **Projects**: Add your project paths
3. **Workflow Settings**: Configure branch preferences

### Step 2: Locate Configuration File
Your config file will be created at:
- **macOS/Linux**: `~/.config/claude-code-github/config.yml`
- **Windows**: `%APPDATA%\claude-code-github\config.yml`

### Step 3: Verify Basic Config
```bash
# Edit your config file
nano ~/.config/claude-code-github/config.yml
# or
code ~/.config/claude-code-github/config.yml
```

**Ensure you have at least this basic structure:**
```yaml
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

projects:
  - path: "/Users/yourusername/Projects/your-project"
    github_repo: "username/repository-name"
```

---

## API Server Setup

**⚠️ CRITICAL**: The API server is required for real-time notifications!

### Step 1: Enable API Server
Add this section to your `config.yml`:

```yaml
# Add this to your existing config.yml
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "your-secure-token-here"  # Generate a secure random string
        scopes: ["*"]
```

### Step 2: Generate Secure Token
```bash
# Generate a secure token (choose one method)

# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: Using OpenSSL (macOS/Linux)
openssl rand -hex 32

# Method 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Method 4: Online generator
# Visit: https://generate.plus/en/base64 (64 characters)
```

**Copy the generated token and replace `"your-secure-token-here"` in your config.**

### Step 3: Enable WebSocket Support
Add WebSocket configuration to your `config.yml`:

```yaml
# Add this to your config.yml
websocket:
  enabled: true
  events: ["*"]  # Subscribe to all events
```

### Step 4: Complete API Configuration Example
Here's what your `config.yml` should look like now:

```yaml
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

# Your existing projects
projects:
  - path: "/Users/yourusername/Projects/your-project"
    github_repo: "username/repository-name"

# NEW: API Server Configuration
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "abc123def456789..."  # Your generated token
        scopes: ["*"]

# NEW: WebSocket Configuration  
websocket:
  enabled: true
  events: ["*"]

# Optional: Enhanced monitoring
monitoring:
  enabled: true
  
# Optional: Workspace monitoring for auto-discovery
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/yourusername/Projects"
      max_depth: 3
      exclude_patterns: ["node_modules", ".git", "dist", "build"]
```

---

## Terminal Notifications Setup

### Step 1: Start the API Server
Open a terminal window and start the MCP server with API enabled:

```bash
# Navigate to one of your monitored projects
cd /Users/yourusername/Projects/your-project

# Start the server (keep this running)
npx @jdrhyne/claude-code-github@latest
```

**Expected output:**
```
• Loading configuration
✓ Configuration loaded
• Setting up 1 project
✓ 1 project configured
• Starting API server
✓ API server started on localhost:3000
```

**⚠️ Keep this terminal open! The API server must run continuously.**

### Step 2: Test API Server
In a **new terminal window**, test the API:

```bash
# Test health endpoint (no auth required)
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-06-17T01:00:00.000Z"}

# Test authenticated endpoint
curl -H "Authorization: Bearer your-token-here" \
     http://localhost:3000/api/status

# Expected: JSON response with project status
```

### Step 3: Configure Terminal Notifications
Create a notification configuration file:

```bash
# Create notification config (optional but recommended)
mkdir -p ~/.config/claude-code-github
cat > ~/.config/claude-code-github/notify.yml << 'EOF'
# Terminal notification settings
api:
  url: "http://localhost:3000"
  token: "your-token-here"  # Same token from config.yml

notifications:
  sound: true
  colors: true
  timestamp: true
  
filters:
  events: ["suggestion.*", "milestone.*", "commit.*"]
  priorities: ["high", "medium"]
  
display:
  format: "detailed"  # Options: minimal, standard, detailed
  max_events: 50
EOF
```

### Step 4: Test Terminal Notifications
In a **third terminal window**, start the notification client:

```bash
# Basic usage (uses config from ~/.config/claude-code-github/config.yml)
npx @jdrhyne/claude-code-github@latest && claude-code-notify

# Or with explicit settings
claude-code-notify --url http://localhost:3000 --token "your-token-here" --sound --verbose
```

**Expected output:**
```
🔔 Claude Code Notifications v2.0.0
🔗 Connecting to http://localhost:3000...
✅ Connected successfully!
🎯 Subscribed to events: suggestion.*, milestone.*, commit.*

📊 Monitoring Status:
• Projects: 1 active
• Events: All types
• Sound: Enabled

Waiting for events... (Press Ctrl+C to exit)
```

---

## Advanced Configuration

### Webhook Integration (Optional)
Add webhook support for external services:

```yaml
# Add to config.yml for Slack/Teams integration
webhooks:
  enabled: true
  endpoints:
    - url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      events: ["suggestion.created", "milestone.reached"]
      auth:
        type: "bearer"
        token: "your-slack-token"
```

### Project-Specific Settings
Configure different settings per project:

```yaml
projects:
  - path: "/Users/yourusername/Projects/frontend-app"
    github_repo: "company/frontend-app"
    reviewers: ["teammate1", "teammate2"]
    suggestions:
      enabled: true
      large_changeset:
        threshold: 10  # Warn when changing 10+ files
        
  - path: "/Users/yourusername/Projects/backend-api"
    github_repo: "company/backend-api"
    reviewers: ["backend-team"]
    suggestions:
      time_reminders:
        warning_threshold_minutes: 30  # Warn after 30 min
```

### Multiple Notification Clients
Run notifications for specific projects:

```bash
# Terminal 1: Monitor frontend project only
claude-code-notify --project "/Users/yourusername/Projects/frontend-app" --sound

# Terminal 2: Monitor backend project only  
claude-code-notify --project "/Users/yourusername/Projects/backend-api" --verbose

# Terminal 3: Monitor high-priority events only
claude-code-notify --filter "suggestion.high" "milestone.*" --sound
```

---

## Testing & Verification

### Step 1: Verify Complete Setup
```bash
# 1. Check API server is running
curl http://localhost:3000/health

# 2. Check authentication works
curl -H "Authorization: Bearer your-token" http://localhost:3000/api/status

# 3. Check WebSocket connection
# (Terminal notifications should show "Connected successfully!")
```

### Step 2: Trigger Test Events
Create some activity in your monitored project:

```bash
# Go to your monitored project
cd /Users/yourusername/Projects/your-project

# Create some changes
echo "// Test change" >> README.md
git add README.md

# Check status (should trigger events)
claude-code-github status
```

**You should see:**
1. **API Server Terminal**: Log entries about status requests
2. **Notification Terminal**: Real-time suggestions appear
3. **Suggestions**: Like "You have uncommitted changes. Consider creating a commit."

### Step 3: Test Workflow Actions
```bash
# In your project directory, trigger different actions:

# 1. Create a feature branch (should generate suggestions)
claude-code-github create-branch --name "test-feature" --type "feature" --message "feat: test feature"

# 2. Create a checkpoint (should show real-time updates)
echo "more changes" >> test.txt
git add test.txt
claude-code-github checkpoint --message "wip: testing notifications"

# 3. Check enhanced status
claude-code-github status-enhanced
```

### Step 4: Verify Event Types
Your notification terminal should show various events:

```
🔔 [12:34:56] SUGGESTION • High Priority
💡 You're working on a protected branch 'main'. Consider creating a feature branch.

🔔 [12:35:12] COMMIT • Medium Priority  
✅ Committed changes: "feat: test feature"

🔔 [12:35:30] MILESTONE • Low Priority
🎉 Feature branch created successfully!
```

---

## Troubleshooting

### Problem: API Server Won't Start

**Symptoms:**
```
✗ Failed to start API server: EADDRINUSE: address already in use
```

**Solution:**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change port in config.yml
api_server:
  port: 3001  # Use different port
```

### Problem: Authentication Fails

**Symptoms:**
```
❌ Connection failed: Unauthorized
```

**Solutions:**
1. **Verify token in config.yml matches notification command:**
   ```bash
   # Check your config
   grep -A 5 "tokens:" ~/.config/claude-code-github/config.yml
   
   # Use exact same token in notification command
   claude-code-notify --token "exact-token-from-config"
   ```

2. **Regenerate token:**
   ```bash
   # Generate new token
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Update both config.yml and notification command
   ```

### Problem: No Events Appearing

**Symptoms:**
```
Waiting for events... (no activity)
```

**Solutions:**
1. **Check project monitoring:**
   ```bash
   # Verify project is in config
   grep -A 2 "projects:" ~/.config/claude-code-github/config.yml
   
   # Ensure you're in a monitored project directory
   pwd
   ```

2. **Generate test activity:**
   ```bash
   # Create changes in monitored project
   cd /path/to/monitored/project
   echo "test" >> README.md
   git add README.md
   
   # Trigger status check
   claude-code-github status
   ```

3. **Check API server logs:**
   - Look at the terminal running the API server
   - Should see requests being logged

### Problem: Connection Refused

**Symptoms:**
```
❌ Connection failed: ECONNREFUSED
```

**Solutions:**
1. **Ensure API server is running:**
   ```bash
   # In monitored project directory
   npx @jdrhyne/claude-code-github@latest
   ```

2. **Check correct URL:**
   ```bash
   # Test manually
   curl http://localhost:3000/health
   
   # If using different port/host, update notification command
   claude-code-notify --url http://localhost:3001
   ```

### Problem: Permissions/File Access

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solutions:**
```bash
# Fix config directory permissions
chmod 755 ~/.config
chmod 755 ~/.config/claude-code-github
chmod 644 ~/.config/claude-code-github/config.yml

# Check file ownership
ls -la ~/.config/claude-code-github/
```

---

## Usage Examples

### Example 1: Basic Development Session

**Setup (once):**
```bash
# Terminal 1: Start API server
cd ~/Projects/my-app
npx @jdrhyne/claude-code-github@latest

# Terminal 2: Start notifications  
claude-code-notify --sound
```

**Daily workflow:**
```bash
# Terminal 3: Your normal work
cd ~/Projects/my-app
git checkout -b feature/new-dashboard
# ... make changes ...
git add .
# 🔔 Notification: "Ready to commit changes!"

git commit -m "feat: add dashboard component"  
# 🔔 Notification: "Commit created successfully!"

# ... more changes ...
# 🔔 Notification: "You've been working for 45 minutes. Consider taking a break!"
```

### Example 2: Multi-Project Monitoring

```bash
# Terminal 1: API server
npx @jdrhyne/claude-code-github@latest

# Terminal 2: Frontend notifications
claude-code-notify --project "/Users/me/Projects/frontend" --filter "suggestion.*"

# Terminal 3: Backend notifications  
claude-code-notify --project "/Users/me/Projects/backend" --filter "suggestion.*"

# Terminal 4: All high-priority events
claude-code-notify --filter "*.high" --sound
```

### Example 3: Team Dashboard

```bash
# Shared screen terminal
claude-code-notify --verbose --no-sound --format json | \
  jq -r '"[\(.timestamp)] \(.type | upper): \(.message)"'
```

### Example 4: Integration with Other Tools

```bash
# Send notifications to log file
claude-code-notify --format json >> ~/dev-activity.log

# Integration with tmux status bar
# In .tmux.conf:
# set -g status-right '#(claude-code-notify --format oneline --timeout 5)'

# Send high-priority to desktop notifications
claude-code-notify --filter "*.high" --desktop-notify
```

---

## Tips & Best Practices

### 🏃‍♂️ Quick Start Checklist

**For immediate setup:**
1. ✅ Install: `npm install -g @jdrhyne/claude-code-github@latest`
2. ✅ Configure: Add API server settings to config.yml
3. ✅ Start API: `claude-code-github` (keep running)
4. ✅ Start notifications: `claude-code-notify --sound`
5. ✅ Test: Make changes in monitored project

### 🎯 Optimal Configuration

**For best experience:**
```yaml
# Recommended config.yml settings
api_server:
  enabled: true
  port: 3000
  host: localhost

websocket:
  enabled: true
  events: ["suggestion.*", "milestone.*", "commit.*"]

monitoring:
  enabled: true

suggestions:
  enabled: true
  time_reminders:
    enabled: true
    warning_threshold_minutes: 45
    reminder_threshold_minutes: 90
  large_changeset:
    enabled: true  
    threshold: 8
```

### 🔧 Performance Tips

1. **Use event filtering** to reduce noise:
   ```bash
   claude-code-notify --filter "suggestion.high" "milestone.*"
   ```

2. **Project-specific monitoring** for focused sessions:
   ```bash
   claude-code-notify --project "/path/to/current/project"
   ```

3. **Adjust monitoring depth** for large codebases:
   ```yaml
   workspace_monitoring:
     workspaces:
       - path: "/Users/me/Projects"
         max_depth: 2  # Don't go too deep
         exclude_patterns: ["node_modules", "vendor", ".git"]
   ```

### 🎨 Customization Ideas

**Visual customization:**
```bash
# Minimal output for smaller terminals
claude-code-notify --format minimal

# Detailed output for debugging
claude-code-notify --verbose --format detailed

# Custom colors (if supported by terminal)
claude-code-notify --color-scheme dark
```

**Sound customization:**
```bash
# Sound only for high priority
claude-code-notify --sound --filter "*.high"

# Different notification styles
claude-code-notify --notification-style brief
```

### 🚀 Advanced Workflows

**Automated startup:**
```bash
# Add to your shell startup (.bashrc, .zshrc)
alias start-dev='cd ~/Projects/current && claude-code-github & claude-code-notify --sound &'
```

**Integration with IDE:**
```bash
# VS Code task (in .vscode/tasks.json)
{
  "label": "Start Claude Notifications",
  "type": "shell", 
  "command": "claude-code-notify",
  "args": ["--project", "${workspaceFolder}", "--sound"],
  "group": "build"
}
```

**Smart filtering based on time:**
```bash
# Quiet hours (no sound at night)
if [ $(date +%H) -gt 22 ] || [ $(date +%H) -lt 8 ]; then
  claude-code-notify --no-sound
else
  claude-code-notify --sound
fi
```

---

## 🎉 You're All Set!

You now have real-time development monitoring and suggestions running! 

**What you should see:**
- 🔔 **Live notifications** when you make changes
- 💡 **Smart suggestions** based on your development patterns  
- 🎯 **Contextual hints** for better Git workflow
- ⚡ **Real-time updates** without manual commands

**Next steps:**
- Explore webhook integrations for team notifications
- Customize event filters for your workflow
- Set up multiple notification clients for different projects
- Try the advanced API endpoints for custom integrations

**Need help?** Check the [main documentation](https://github.com/jdrhyne/claude-code-github) or [open an issue](https://github.com/jdrhyne/claude-code-github/issues).

Happy coding! 🚀