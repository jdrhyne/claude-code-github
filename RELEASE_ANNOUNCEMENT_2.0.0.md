# 🚀 claude-code-github v2.0.0 Release Announcement

**Date:** June 16, 2025  
**Version:** 2.0.0  
**Breaking Changes:** Yes (See Migration Guide)

## 🎉 Overview

We're excited to announce the **biggest release** in claude-code-github's history! Version 2.0.0 transforms our simple MCP server into a **comprehensive development workflow platform** with real-time capabilities, external integrations, and powerful automation features.

## ✨ What's New

### 🔥 REST API Server
- **Complete HTTP API** for external tool integration
- **Authentication system** with bearer tokens and scoped permissions
- **Rate limiting** and security middleware (CORS, Helmet)
- **Health checks** and monitoring endpoints
- Support for all Git workflow operations via HTTP

### ⚡ Real-time WebSocket Server
- **Live event streaming** for development activities
- **Bidirectional communication** with external clients
- **Event filtering** and subscription management
- **Connection authentication** and management
- Real-time suggestion delivery without polling

### 📡 Advanced Webhook System
- **External service integration** (Slack, Teams, custom endpoints)
- **Exponential backoff** retry logic for reliability
- **Multiple authentication methods** (Bearer tokens, HMAC signatures)
- **Event filtering** and conditional delivery
- **Delivery tracking** and error handling

### 🖥️ Terminal Notification Client
**New:** `claude-code-notify` command-line tool
- **Real-time development suggestions** in your terminal
- **WebSocket connection** to the API server
- **Colored output** and sound notifications
- **Event filtering** and project-specific monitoring
- **Background operation** support

### 🔍 Workspace Monitoring
- **Dynamic Git repository discovery** in parent directories
- **Real-time detection** of new projects
- **Automatic GitHub repository detection** from git remotes
- **Smart exclusion patterns** for performance
- **Cross-platform compatibility**

## 🎯 New Use Cases Unlocked

1. **📊 Real-time Development Dashboards**
   ```bash
   # Get live suggestions without manual MCP calls
   claude-code-notify --project /my/project
   ```

2. **🤝 Team Collaboration**
   ```yaml
   # Send development insights to Slack
   webhooks:
     endpoints:
       - url: "https://hooks.slack.com/your-webhook"
         events: ["suggestion.created", "milestone.reached"]
   ```

3. **🔧 CI/CD Integration**
   ```bash
   # Trigger workflows based on development patterns
   curl -H "Authorization: Bearer $TOKEN" \
        http://localhost:3000/api/status/enhanced
   ```

4. **🔌 External Tool Integration**
   ```javascript
   // Connect IDEs and editors via REST API
   const response = await fetch('http://localhost:3000/api/suggestions');
   const suggestions = await response.json();
   ```

5. **📱 Custom Monitoring Dashboards**
   ```javascript
   // Build real-time dashboards with WebSocket
   const socket = io('http://localhost:3000', {
     auth: { token: 'your-token' }
   });
   socket.on('suggestion.created', handleNewSuggestion);
   ```

## 📋 Migration Guide

### Configuration Changes

**⚠️ BREAKING CHANGE:** New configuration sections required

Add these sections to your `~/.config/claude-code-github/config.yml`:

```yaml
# Enable API server (optional but recommended)
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "generate-secure-token-here"
        scopes: ["*"]

# Enable WebSocket for real-time features (optional)
websocket:
  enabled: true
  events: ["*"]

# Enable webhooks for external integrations (optional)
webhooks:
  enabled: false  # Set to true when ready
  endpoints: []

# Enable workspace monitoring (optional)
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/username/Projects"
      max_depth: 3
      exclude_patterns: ["node_modules", ".git", "dist"]
```

### Claude Code Configuration

Your existing Claude Code configuration remains the same:

```json
{
  "mcpServers": {
    "claude-code-github": {
      "command": "npx",
      "args": ["-y", "@jdrhyne/claude-code-github@latest"]
    }
  }
}
```

### New Commands Available

```bash
# Terminal notifications (new!)
claude-code-notify

# Existing MCP server (unchanged)
claude-code-github
```

## 🚀 Getting Started with v2.0.0

### 1. Install/Update
```bash
# If using npx (recommended)
npx @jdrhyne/claude-code-github@latest

# If using global install
npm install -g @jdrhyne/claude-code-github@latest
```

### 2. Update Configuration
```bash
# Edit your config file
vi ~/.config/claude-code-github/config.yml

# Add the new sections shown in Migration Guide
```

### 3. Try Real-time Notifications
```bash
# In one terminal: start the MCP server with API enabled
claude-code-github

# In another terminal: get real-time suggestions
claude-code-notify --sound --verbose
```

### 4. Test the API
```bash
# Check server health
curl http://localhost:3000/health

# Get current status (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/status
```

## 📊 Performance & Architecture

### Event-Driven Architecture
- **Minimal resource usage** with smart file watching
- **Efficient WebSocket connections** with connection pooling
- **Background webhook delivery** with retry queues
- **Configurable monitoring depth** and exclusion patterns

### Security Features
- **Token-based authentication** for API access
- **Scoped permissions system** for fine-grained control
- **Rate limiting** to prevent API abuse
- **HMAC signature verification** for webhook security
- **Secure GitHub token storage** via system keychain

### Scalability
- **Graceful handling** of large numbers of repositories
- **Smart exclusion patterns** for performance optimization
- **Connection pooling** for WebSocket efficiency
- **Retry logic** for reliable webhook delivery

## 🛠️ Technical Details

### New Dependencies
- `express` ^5.1.0 - HTTP server framework
- `socket.io` ^4.8.1 - WebSocket communication
- `blessed` ^0.1.81 - Terminal UI components
- `commander` ^14.0.0 - CLI framework
- Security middleware: `cors`, `helmet`, `express-rate-limit`

### API Endpoints
- `GET /health` - Server health check
- `GET /api/status` - Current development status
- `GET /api/status/enhanced` - Detailed project information
- `GET /api/suggestions` - List active suggestions
- `POST /api/suggestions/:id/action` - Execute suggestion actions
- WebSocket: `ws://localhost:3000/` - Real-time events

### Backward Compatibility
- **Full MCP compatibility** maintained
- **Existing tools unchanged** (`dev_status`, `dev_create_branch`, etc.)
- **Configuration migration** is additive (no breaking changes to existing settings)
- **Optional features** - new capabilities are opt-in

## 🔗 Resources

- **Documentation:** [GitHub Repository](https://github.com/jdrhyne/claude-code-github)
- **Issue Tracker:** [GitHub Issues](https://github.com/jdrhyne/claude-code-github/issues)
- **NPM Package:** [@jdrhyne/claude-code-github](https://www.npmjs.com/package/@jdrhyne/claude-code-github)
- **Changelog:** [CHANGELOG.md](https://github.com/jdrhyne/claude-code-github/blob/main/CHANGELOG.md)

## 🤝 Community & Support

- **Report Issues:** [GitHub Issues](https://github.com/jdrhyne/claude-code-github/issues)
- **Feature Requests:** Use GitHub Issues with the `enhancement` label
- **Discussions:** [GitHub Discussions](https://github.com/jdrhyne/claude-code-github/discussions)

## 🎈 What's Next?

We're already working on the next major features:

- **📱 Mobile notifications** - iOS/Android app integration
- **🤖 Advanced AI suggestions** - More intelligent pattern recognition
- **👥 Team collaboration features** - Shared development insights
- **🔧 IDE extensions** - Native VS Code, JetBrains integration
- **📈 Analytics dashboard** - Web-based monitoring interface

## 📝 Acknowledgments

Special thanks to all contributors, testers, and the Claude Code community for making this release possible. Your feedback and suggestions have shaped this major evolution of the project.

---

**Ready to supercharge your development workflow?** 

```bash
npx @jdrhyne/claude-code-github@latest
```

**Get real-time suggestions while you code:**

```bash
claude-code-notify --sound
```

Happy coding! 🎉