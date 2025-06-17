# Claude Code GitHub - Notification Tools

Real-time terminal and desktop notifications for your development workflow.

## Overview

The notification tools connect to the Claude Code GitHub API server to provide real-time notifications about:
- 💡 Development suggestions
- 🎉 Milestones reached
- 📝 Commits created
- 🔀 Pull requests
- And more...

## Available Tools

### 1. Terminal Notifications (`claude-code-notify`)

Simple terminal-based notifications that display in your console.

```bash
# Basic usage (uses config.yml for settings)
claude-code-notify

# With options
claude-code-notify --sound --verbose

# Filter specific events
claude-code-notify --filter "suggestion.*" "milestone.*"

# Watch specific project
claude-code-notify --project /path/to/project
```

**Options:**
- `-u, --url <url>` - API server URL (default: from config)
- `-t, --token <token>` - API token (default: from config)
- `-s, --sound` - Enable terminal bell for notifications
- `-f, --filter <events...>` - Filter specific event types
- `-p, --project <path>` - Only show events for specific project
- `-v, --verbose` - Show all events and additional details

### 2. Desktop Notifications (`claude-code-notify-desktop`)

Native desktop notifications with sound and click-to-focus support.

```bash
# Desktop notifications with terminal output
claude-code-notify-desktop --sound --focus

# Desktop only (no terminal)
claude-code-notify-desktop --no-terminal --desktop

# With custom filters
claude-code-notify-desktop --filter "suggestion.created" --sound
```

**Options:**
- `-d, --desktop` - Enable desktop notifications (default: true)
- `-T, --no-terminal` - Disable terminal output
- `-s, --sound` - Enable notification sounds
- `-f, --focus` - Focus project in VS Code on notification click
- `--filter <events...>` - Filter specific events
- `-p, --project <path>` - Only show events for specific project
- `-v, --verbose` - Show all events

**Features:**
- Native OS notifications (macOS, Windows, Linux)
- Custom sounds based on priority
- Click notifications to open project in VS Code
- Real-time statistics in terminal

### 3. Terminal Dashboard (`claude-code-dashboard`)

Full-featured terminal dashboard with interactive UI.

```bash
# Launch the dashboard
claude-code-dashboard

# With custom API endpoint
claude-code-dashboard --url http://localhost:3000 --token YOUR_TOKEN
```

**Features:**
- Real-time statistics panel
- Active suggestions list (navigate with arrow keys)
- Event stream log
- Interactive UI with keyboard shortcuts
- Detailed suggestion view (press Enter)

**Keyboard Shortcuts:**
- `↑/↓` - Navigate suggestions
- `Enter` - View suggestion details
- `c` - Clear event log
- `q` - Quit

## Configuration

### Using config.yml

If you have the API server configured in your `config.yml`, the tools will automatically use those settings:

```yaml
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "your-secure-token"
        scopes: ["*"]
```

### Manual Configuration

You can override settings with command-line options:

```bash
claude-code-notify --url http://custom-server:4000 --token MY_TOKEN
```

## Examples

### Example 1: Development Session Monitor

Keep a terminal window open with real-time suggestions:

```bash
# Terminal 1: Your regular work
cd /my/project
vim src/app.js

# Terminal 2: Notifications
claude-code-notify --project /my/project --sound
```

### Example 2: Team Dashboard

Set up a dashboard on a shared screen:

```bash
# Full dashboard view
claude-code-dashboard --max-events 200
```

### Example 3: Desktop Productivity

Get desktop notifications while working:

```bash
# Run in background with desktop notifications
claude-code-notify-desktop --no-terminal --sound --focus &
```

### Example 4: CI/CD Integration

Monitor deployment suggestions:

```bash
# Filter for deployment-related events
claude-code-notify --filter "milestone.release" "suggestion.deploy"
```

## Notification Types

### Suggestion Priorities

- 🚨 **High Priority** - Immediate action recommended
  - Protected branch warnings
  - Security issues
  - Breaking changes

- 💡 **Medium Priority** - Standard suggestions
  - Commit reminders
  - PR suggestions
  - Code quality improvements

- 💭 **Low Priority** - Tips and best practices
  - Style suggestions
  - Optional improvements

### Event Types

- `suggestion.created` - New suggestion generated
- `suggestion.updated` - Suggestion updated
- `suggestion.executed` - Suggestion action taken
- `suggestion.dismissed` - Suggestion dismissed
- `milestone.reached` - Development milestone achieved
- `commit.created` - New commit created
- `pr.created` - Pull request opened
- `branch.created` - New branch created

## Troubleshooting

### Connection Issues

```bash
# Check if API server is running
curl http://localhost:3000/health

# Test with explicit settings
claude-code-notify --url http://localhost:3000 --token YOUR_TOKEN --verbose
```

### No Notifications

1. Check API server is enabled in `config.yml`
2. Verify token has correct permissions
3. Ensure monitoring is active for your projects
4. Try verbose mode to see all events

### Desktop Notifications Not Working

**macOS**: System Preferences → Notifications → Allow notifications from Terminal

**Windows**: Settings → System → Notifications → Enable for Node.js

**Linux**: Ensure `libnotify` is installed:
```bash
sudo apt-get install libnotify-bin  # Ubuntu/Debian
sudo dnf install libnotify          # Fedora
```

## Advanced Usage

### Custom Event Handling

Create your own notification handler:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_TOKEN' }
});

socket.on('suggestion.created', (event) => {
  // Custom handling
  if (event.data.priority === 'high') {
    // Send to Slack, email, etc.
  }
});
```

### Integration with Other Tools

**tmux status bar**:
```bash
# In .tmux.conf
set -g status-right '#(claude-code-notify --filter "suggestion.*" --format oneline)'
```

**i3 status bar**:
```bash
# In i3status config
order += "external_script claude_suggestions"
external_script claude_suggestions {
    script_path = "claude-code-notify --format json"
}
```

## Tips

1. **Reduce Noise**: Use filters to only see relevant events
2. **Project Focus**: Use `--project` to monitor specific repositories
3. **Sound Strategy**: Enable sound only for high-priority events
4. **Multiple Monitors**: Run dashboard on a secondary screen
5. **Background Mode**: Use `nohup` or `screen` for persistent monitoring

## Future Features

- [ ] Notification history and replay
- [ ] Custom notification templates
- [ ] Integration with more desktop environments
- [ ] Mobile app notifications
- [ ] Team collaboration features