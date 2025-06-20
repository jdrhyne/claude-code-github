# 🚀 Running claude-code-github in Background for All Projects

## Quick Setup (3 Steps)

### 1. Configure Your Projects

Edit `~/.config/claude-code-github/config.yml` to add all your projects:

```yaml
# Global settings
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - master
    - develop

# Add ALL your projects here
projects:
  - path: "/Users/admin/Projects/my-app"
    github_repo: "username/my-app"
    
  - path: "/Users/admin/Projects/another-project"
    github_repo: "username/another-project"
    
  - path: "/Users/admin/Projects/work-project"
    github_repo: "company/work-project"
    reviewers:
      - "teammate1"
      - "teammate2"

# Enable automation (start with learning mode!)
automation:
  enabled: true
  mode: learning  # Safe mode - just observes
  
  llm:
    provider: anthropic
    model: claude-3-sonnet-20240229
    api_key_env: ANTHROPIC_API_KEY
    
  preferences:
    commit_style: conventional
    commit_frequency: moderate
    risk_tolerance: low
    
  safety:
    max_actions_per_hour: 10
    require_tests_pass: true
```

### 2. Set Your API Key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# For Anthropic Claude (recommended)
export ANTHROPIC_API_KEY="your-api-key-here"

# OR for OpenAI
export OPENAI_API_KEY="your-api-key-here"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 3. Start the Background Service

```bash
# Start monitoring all projects
claude-code-github start

# Or if you want to see logs
claude-code-github start --verbose
```

## 🖥️ Running as a System Service

### macOS (using launchd)

1. Create a launch agent:

```bash
cat > ~/Library/LaunchAgents/com.claude-code-github.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-code-github</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/usr/local/bin/claude-code-github</string>
        <string>start</string>
        <string>--daemon</string>
    </array>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>ANTHROPIC_API_KEY</key>
        <string>YOUR_API_KEY_HERE</string>
    </dict>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/tmp/claude-code-github.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/claude-code-github.error.log</string>
</dict>
</plist>
EOF
```

2. Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.claude-code-github.plist
```

3. Check status:
```bash
launchctl list | grep claude-code-github
```

### Linux (using systemd)

1. Create a systemd service:

```bash
sudo cat > /etc/systemd/system/claude-code-github.service << 'EOF'
[Unit]
Description=Claude Code GitHub Monitor
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
Environment="ANTHROPIC_API_KEY=YOUR_API_KEY_HERE"
ExecStart=/usr/bin/node /usr/local/bin/claude-code-github start --daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

2. Enable and start:
```bash
sudo systemctl enable claude-code-github
sudo systemctl start claude-code-github
```

3. Check status:
```bash
sudo systemctl status claude-code-github
```

## 🔍 Monitoring & Control

### Check Status
```bash
# See what's running
claude-code-github status

# View real-time activity
claude-code-github monitor

# Check automation status in Claude
dev_automation_status
```

### View Logs
```bash
# Recent activity
claude-code-github logs

# Follow logs in real-time
claude-code-github logs -f

# System service logs (macOS)
tail -f /tmp/claude-code-github.log

# System service logs (Linux)
journalctl -u claude-code-github -f
```

### Stop/Restart
```bash
# Stop monitoring
claude-code-github stop

# Restart
claude-code-github restart

# Emergency stop (disables automation)
claude-code-github stop --emergency
```

## 🎯 Best Practices

### 1. Start Conservative
```yaml
automation:
  mode: learning  # Start here for 1-2 days
  preferences:
    risk_tolerance: low
```

### 2. Add Projects Gradually
- Start with personal/test projects
- Add work projects after testing
- Monitor behavior before adding critical repos

### 3. Configure Per-Project Settings
```yaml
projects:
  # Personal project - more autonomous
  - path: "/Users/me/personal-project"
    github_repo: "me/personal-project"
    automation_override:
      mode: autonomous
      
  # Work project - more conservative  
  - path: "/Users/me/work-project"
    github_repo: "company/work-project"
    automation_override:
      mode: assisted
      preferences:
        risk_tolerance: low
```

### 4. Set Up Notifications
```bash
# Desktop notifications for important events
claude-code-github notify --desktop

# Or use the dashboard
claude-code-github notify --dashboard
```

## 🛠️ Troubleshooting

### Service Won't Start
```bash
# Check config is valid
claude-code-github validate

# Test with verbose output
claude-code-github start --verbose --no-daemon
```

### High CPU/Memory Usage
```bash
# Limit monitored paths
claude-code-github config set monitoring.max_depth 3

# Exclude large directories
claude-code-github config set monitoring.ignore "node_modules,dist,build"
```

### API Rate Limits
```yaml
# Reduce API calls
automation:
  safety:
    max_actions_per_hour: 5  # Lower limit
  thresholds:
    confidence: 0.8  # Higher threshold
```

## 📊 Performance Tips

1. **Exclude unnecessary paths** in `.gitignore`
2. **Set reasonable depth** for monitoring (default: 5)
3. **Use learning mode** initially to avoid API costs
4. **Monitor API usage** in your provider dashboard

## 🔐 Security Notes

- API keys are stored in system keychain
- No code is sent to LLMs, only metadata
- All automation actions are logged
- Use read-only GitHub tokens if possible

## 🎉 You're All Set!

The service is now monitoring all your projects in the background. It will:
- Learn your commit patterns
- Suggest appropriate actions
- Help automate repetitive Git tasks
- Keep you in control with safety features

Check the status anytime with:
```bash
claude-code-github status
```

Or in Claude:
```
dev_automation_status
```