# 🚀 Production Monitoring Guide

## How Real-Time Monitoring Works

The agent monitoring system integrates with claude-code-github's MCP server to show real agent activity. Here's how to use it with your actual projects:

## 🎯 Two Ways to Monitor

### 1. **Monitor with MCP Server Running** (See Real Activity)

This shows actual agent decisions as they happen:

```bash
# Step 1: Start the MCP server (in one terminal)
cd /Users/admin/Projects/claude-code-github
npx . 

# Step 2: In another terminal, start monitoring
claude-dashboard
# or
claude-stream
```

When the MCP server is running and Claude Code is using it, you'll see:
- Real file change detections
- Actual agent analysis
- Live suggestions based on your work
- Git status monitoring
- Automation decisions

### 2. **Standalone Monitoring** (Development Mode)

For testing or demos without the MCP server:

```bash
# Shows sample events for demonstration
NODE_ENV=development claude-dashboard
```

## 📊 Monitoring Your Current Projects

Your configured projects include:
- AgentCopy
- claude-code-github
- claude-yes
- jdrhyne-me
- nutrient-dws-client-python
- vibetunnel
- volks-typo
- And many more...

### To Monitor a Specific Project:

```bash
# Monitor a specific project
claude-monitor monitor --project /Users/admin/Projects/AgentCopy

# Or change to project directory first
cd /Users/admin/Projects/AgentCopy
claude-monitor monitor
```

## 🔄 Integration with Claude Code

### Setup for Real-Time Monitoring:

1. **Ensure MCP Server is Configured in Claude Code:**
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

2. **Start Monitoring Dashboard:**
   ```bash
   claude-dashboard
   ```

3. **Use Claude Code Normally:**
   - Make file changes
   - Use git commands through Claude
   - Ask Claude for suggestions
   - Watch the monitoring dashboard update in real-time!

## 📡 What You'll See During Development

### When Making Changes:
```
🔍 Scanning: Detected changes in 3 files
🧠 Analyzing: Changes appear to be a new feature
💡 Suggesting: Create feature branch for authentication
```

### When Using Git Commands:
```
⚡ Executing: git add src/auth/*
⚡ Executing: git commit -m "feat: add user authentication"
✅ Success: Changes committed successfully
```

### When Agent Makes Decisions:
```
🧠 Decision Tree:
├─ ✓ Not on protected branch
├─ ✓ Tests passing
├─ ✓ Changes coherent
└─ → Suggesting: Commit current changes
```

## 🎮 Interactive Monitoring Controls

While monitoring is running:
- `[p]` - Pause/Resume monitoring
- `[c]` - Clear activity log
- `[r]` - Refresh display
- `[f]` - Filter events (coming soon)
- `[h]` - Show help
- `[q]` - Quit

## 🧪 Testing with Real Changes

### Quick Test Workflow:

1. **Start monitoring:**
   ```bash
   claude-dashboard
   ```

2. **In another terminal, make some changes:**
   ```bash
   cd /Users/admin/Projects/claude-code-github
   echo "// test comment" >> src/test-file.ts
   ```

3. **Watch the monitor react:**
   - Should show file change detection
   - May suggest committing changes
   - Shows confidence levels

4. **Use Claude Code:**
   ```bash
   claude-code "What's the status of my project?"
   ```
   - Monitor shows Claude's analysis
   - Displays any suggestions made

## 🔧 Advanced Usage

### Filter Specific Events:
```bash
# Only show suggestions and executions
claude-monitor stream --filter suggesting,executing

# Only show high-confidence events
claude-monitor stream --filter suggesting --min-confidence 0.8
```

### Monitor Multiple Projects:
Open multiple terminals with different projects:
```bash
# Terminal 1
claude-monitor monitor --project /Users/admin/Projects/AgentCopy

# Terminal 2
claude-monitor monitor --project /Users/admin/Projects/claude-code-github
```

### Export Activity Logs:
```bash
# Stream to file for analysis
claude-monitor stream > agent-activity.log 2>&1
```

## 🚨 Troubleshooting

### Not Seeing Real Events?

1. **Check MCP Server is Running:**
   ```bash
   ps aux | grep claude-code-github
   ```

2. **Verify Claude Code Integration:**
   - Ensure Claude Code is configured to use the MCP server
   - Try a command: `claude-code "status"`

3. **Check Monitoring Mode:**
   - Remove `NODE_ENV=development` for real events
   - Development mode only shows sample events

### Dashboard Issues?

1. **Terminal Size:**
   - Minimum 80x24 recommended
   - Try fullscreen terminal

2. **Character Encoding:**
   - Ensure UTF-8 support
   - Try `--no-color` flag

## 📈 Interpreting Agent Activity

### Confidence Levels:
- **90-100%**: High confidence, likely to auto-execute (if enabled)
- **70-89%**: Good confidence, suggestions offered
- **50-69%**: Moderate confidence, requires confirmation
- **Below 50%**: Low confidence, learning mode

### Event Types:
- 🔍 **Scanning**: Looking for changes
- 🧠 **Analyzing**: Processing information
- 💡 **Suggesting**: Offering recommendations
- ⚡ **Executing**: Taking action
- 📚 **Learning**: Updating patterns
- ⏳ **Waiting**: User input needed
- ❌ **Error**: Something went wrong

## 🎯 Best Practices

1. **Keep monitoring open** during active development
2. **Watch for patterns** in agent suggestions
3. **Use pause feature** when you need to focus
4. **Review decision trees** to understand agent logic
5. **Filter events** to reduce noise when needed

## Next Steps

1. Start the MCP server and monitoring together
2. Make some code changes and watch the agent react
3. Use Claude Code commands and see them in real-time
4. Experiment with different monitoring modes
5. Provide feedback on the visualization!

The monitoring system gives you unprecedented visibility into how the AI agent thinks and makes decisions about your code. Use it to build trust, debug issues, and improve your development workflow!