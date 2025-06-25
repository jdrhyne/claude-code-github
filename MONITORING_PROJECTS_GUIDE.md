# 🔍 How to See Which Project is Being Monitored

## Current Project Display

The monitoring dashboard shows the current project in the **status bar** at the top:

```
┌─ Claude Code GitHub Agent ─────────────────────────────────────────┐
│ Status: ACTIVE │ Mode: ASSISTED │ Confidence: 0.85 │ Project: /Users/admin/Projects/claude-code-github │
└─────────────────────────────────────────────────────────────────────┘
```

Look for: `Project: {project-path}`

## 📊 How Project Monitoring Works

### Default Behavior:
1. **Without MCP Server**: Shows current directory or no specific project
2. **With MCP Server**: Monitors ALL configured projects simultaneously
3. **With --project flag**: Monitors only the specified project

### Check What's Being Monitored:

1. **In Dashboard Mode:**
   - Look at the status bar (top panel)
   - Shows `Project: /path/to/project` if specific project
   - May show multiple projects in activity feed

2. **In Stream Mode:**
   - Events show project context:
   ```
   🔍 Scanning project: /Users/admin/Projects/AgentCopy
   🧠 Analyzing: /Users/admin/Projects/claude-yes - 2 files changed
   ```

## 🎯 Monitor Specific Projects

### Single Project Monitoring:
```bash
# Monitor only AgentCopy
claude-monitor monitor --project /Users/admin/Projects/AgentCopy

# Monitor only claude-code-github
claude-monitor monitor --project /Users/admin/Projects/claude-code-github
```

### See All Configured Projects:
```bash
# List all projects in your config
grep -A1 "path:" ~/.config/claude-code-github/config.yml | grep "path:" | cut -d'"' -f2
```

Your configured projects:
- `/Users/admin/Projects/AgentCopy`
- `/Users/admin/Projects/awesome-pspdfkit`
- `/Users/admin/Projects/claude-code-github-marketing`
- `/Users/admin/Projects/claude-code-github`
- `/Users/admin/Projects/claude-yes`
- `/Users/admin/Projects/controltower-website`
- `/Users/admin/Projects/jdrhyne-me`
- `/Users/admin/Projects/muhimbi-website`
- `/Users/admin/Projects/nutrient-dws-client-python`
- `/Users/admin/Projects/nutrient-dws-typescript-client`
- `/Users/admin/Projects/pdfviewer.io`
- `/Users/admin/Projects/PSPDFKit-Website`
- `/Users/admin/Projects/RhyneReport`
- `/Users/admin/Projects/the-rhyne-report`
- `/Users/admin/Projects/Vibe-Doc-Brrr`
- `/Users/admin/Projects/vibetunnel`
- `/Users/admin/Projects/volks-typo-marketing`
- `/Users/admin/Projects/volks-typo-ultra-minimal`
- `/Users/admin/Projects/volks-typo`

## 🔄 How Multi-Project Monitoring Works

When the MCP server is running, it monitors **ALL** configured projects:

1. **File System Events**: Watches all project directories
2. **Git Status**: Tracks changes across all projects
3. **Event Attribution**: Each event shows which project it's from

Example multi-project activity:
```
10:15:23 🔍 Scanning: /Users/admin/Projects/AgentCopy
10:15:24 🧠 Analyzing: /Users/admin/Projects/claude-yes - Git status changed
10:15:25 💡 Suggesting: /Users/admin/Projects/vibetunnel - Commit 3 files
```

## 🎨 Enhanced Project Visibility

### Quick Test to See Project Info:

1. **Start monitoring with a specific project:**
   ```bash
   claude-monitor monitor --project /Users/admin/Projects/AgentCopy
   ```

2. **Look for project path in:**
   - Status bar (top of dashboard)
   - Event messages (includes project context)
   - Activity log entries

### Understanding Event Sources:

Each event in the activity feed shows its origin:
```
🔍 ANALYZING: /Users/admin/Projects/claude-code-github
├─ Changes detected: 3 files modified
├─ Pattern match: "Feature completion workflow"
└─ Confidence: 0.87 → SUGGESTING commit
```

## 💡 Tips for Project Monitoring

1. **Monitor Current Project Only:**
   ```bash
   cd /path/to/your/project
   claude-monitor monitor --project .
   ```

2. **Monitor Most Active Project:**
   ```bash
   # Start with your most active project
   claude-monitor monitor --project /Users/admin/Projects/claude-code-github
   ```

3. **See Events from All Projects:**
   ```bash
   # Don't specify --project to see all
   claude-monitor stream
   ```

4. **Filter by Project** (in stream mode):
   ```bash
   # Coming soon: filter events by project
   claude-monitor stream --project /Users/admin/Projects/AgentCopy
   ```

## 🚀 Quick Commands

### See which projects have recent activity:
```bash
# Check git status in all projects
for dir in ~/Projects/*/; do
  if [ -d "$dir/.git" ]; then
    echo "=== $dir ==="
    cd "$dir" && git status -s | head -3
  fi
done
```

### Monitor your most recently changed project:
```bash
# Find most recently modified project
recent=$(find ~/Projects -maxdepth 2 -name ".git" -type d -exec stat -f "%m %N" {} \; | sort -rn | head -1 | cut -d' ' -f2- | xargs dirname)
claude-monitor monitor --project "$recent"
```

## 📝 Summary

- **Current project** shows in the status bar
- **All configured projects** are monitored when MCP server runs
- **Use --project flag** to monitor specific project only
- **Event messages** include project context
- **Activity feed** shows which project each event is from

The monitoring system is designed to give you a unified view across all your projects while making it clear which project each event relates to!