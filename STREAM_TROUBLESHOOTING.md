# 🔍 Troubleshooting: No Events in Stream

## Why You're Not Seeing Events

The monitoring system shows events from two sources:

1. **Sample Events** (Development Mode) - For testing
2. **Real Events** (Production Mode) - From actual development activity

Currently, you're not seeing events because:
- ❌ NODE_ENV is not set to 'development' (no sample events)
- ❌ No real development activity is happening
- ❌ MCP server might not be running

## 🚀 Quick Fixes

### Option 1: See Sample Events Immediately
```bash
# This will show sample events after 3-5 seconds
NODE_ENV=development claude-stream

# Or using the full command
NODE_ENV=development node /Users/admin/Projects/claude-code-github/dist/index.js stream
```

### Option 2: Generate Real Events
```bash
# Terminal 1: Start stream
claude-stream

# Terminal 2: Make changes in a project
cd /Users/admin/Projects/claude-code-github
echo "// test" >> test.js
rm test.js

# You should see events!
```

### Option 3: Update Your Aliases (Permanent Fix)
The issue is your alias doesn't include NODE_ENV. Let's fix it:

```bash
# Edit your .zshrc
nano ~/.zshrc

# Find this line:
alias claude-stream='cd /Users/admin/Projects/claude-code-github && NODE_ENV=development node dist/index.js stream'

# Make sure it includes NODE_ENV=development
```

## 🧪 Test Commands

### See Sample Events Now:
```bash
cd /Users/admin/Projects/claude-code-github
NODE_ENV=development node dist/index.js stream
```

You should see:
```
🚀 Starting Claude Code GitHub Agent Monitor...
📡 Starting event stream...
Press Ctrl+C to quit
[wait 3 seconds]
4:33:15 PM 🔍 Scanning project for changes... (100%)
4:33:17 PM 🧠 Analyzing changes: 3 new TypeScript files (85%)
4:33:19 PM 💡 Suggesting: Commit monitoring infrastructure (92%)
```

### See Real Events:
```bash
# First, ensure the MCP server is running with Claude Code
# Then make actual file changes in your projects
```

## 📊 Understanding Event Sources

### Development Mode (Sample Events):
- Triggered by `NODE_ENV=development`
- Shows demo events at 1s, 3s, 5s intervals
- Great for testing and demos
- Not connected to real development

### Production Mode (Real Events):
- Requires MCP server running
- Shows actual file changes
- Shows real agent decisions
- Connected to your development activity

## 🔧 Permanent Solution

### Fix the Alias:
```bash
# Open your shell config
code ~/.zshrc

# Ensure the claude-stream alias has NODE_ENV:
alias claude-stream='cd /Users/admin/Projects/claude-code-github && NODE_ENV=development node dist/index.js stream'

# Reload
source ~/.zshrc
```

### Or Create New Test Aliases:
```bash
# Add these to ~/.zshrc
alias claude-stream-demo='cd /Users/admin/Projects/claude-code-github && NODE_ENV=development node dist/index.js stream'
alias claude-stream-real='cd /Users/admin/Projects/claude-code-github && node dist/index.js stream'
```

## 🎯 Quick Test Right Now

Run this exact command:
```bash
cd /Users/admin/Projects/claude-code-github && NODE_ENV=development node dist/index.js stream
```

If you don't see events after 5 seconds, there might be a deeper issue.

## 🚨 Still No Events?

Try these debugging steps:

1. **Check the build:**
   ```bash
   cd /Users/admin/Projects/claude-code-github
   npm run build
   ```

2. **Test with explicit path:**
   ```bash
   NODE_ENV=development /Users/admin/.asdf/installs/nodejs/22.14.0/bin/node /Users/admin/Projects/claude-code-github/dist/index.js stream
   ```

3. **Check for errors:**
   ```bash
   NODE_ENV=development node dist/index.js stream 2>&1 | tee stream-debug.log
   ```

The issue is almost certainly that the alias isn't including NODE_ENV=development. Once that's fixed, you'll see events immediately!