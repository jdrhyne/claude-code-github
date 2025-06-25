# 🚀 Shell Aliases for Claude Monitoring

## ✅ Aliases Have Been Added!

The following shortcuts have been added to your `~/.zshrc`:

### Available Commands (from anywhere):

```bash
# Show help and available commands
claude-help

# Launch monitoring dashboard
claude-dashboard

# Stream events to console
claude-stream

# General monitor command (add your own flags)
claude-monitor --version
claude-monitor stream --no-color
claude-monitor dashboard --compact
```

## 📋 To Use These Aliases:

### Option 1: Open a New Terminal
Simply open a new terminal window/tab and the aliases will be available.

### Option 2: Reload Current Terminal
```bash
source ~/.zshrc
```

## 🧪 Test the Aliases:

```bash
# From any directory, test help:
claude-help

# Should output:
# claude-code-github v2.1.0
# ...
# Commands:
#   monitor        Launch real-time agent monitoring dashboard
#   dashboard      Launch interactive dashboard with full controls  
#   stream         Stream agent events to console (minimal output)
```

## 📝 What Each Alias Does:

- **`claude-help`** - Shows help and available commands
- **`claude-dashboard`** - Launches interactive monitoring UI with sample events
- **`claude-stream`** - Streams events to console with sample data
- **`claude-monitor`** - Base command for custom options

## 🎯 Quick Start Testing:

1. **Open a new terminal** (or run `source ~/.zshrc`)

2. **Test stream mode** (10 seconds of sample events):
   ```bash
   claude-stream
   ```
   Press `Ctrl+C` to stop

3. **Test dashboard mode**:
   ```bash
   claude-dashboard
   ```
   Press `h` for help, `q` to quit

## 🔧 Customization:

To add more aliases or modify existing ones:
```bash
# Edit your shell config
nano ~/.zshrc
# or
code ~/.zshrc

# Then reload
source ~/.zshrc
```

## 💡 Pro Tips:

1. **Create shorter aliases** if desired:
   ```bash
   alias cm='claude-monitor'
   alias cs='claude-stream'
   alias cd='claude-dashboard'
   ```

2. **Add to other shells** (bash):
   ```bash
   # Add same lines to ~/.bashrc
   ```

3. **Remove aliases** if needed:
   ```bash
   unalias claude-monitor
   ```

Now you can monitor the agent from anywhere in your terminal! 🎉