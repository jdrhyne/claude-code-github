# Testing Intelligent Suggestions

## Quick Test via Claude Code

If you have claude-code-github configured with Claude Code, simply ask:

```
"What's the dev status of my project?"
```

Claude will use the `dev_status` tool which includes intelligent suggestions.

## Manual Test Scenarios

### 1. Protected Branch Warning

```bash
# You're already on main, make a change
echo "test" >> README.md

# Ask Claude: "What's my dev status?"
# Should see: Warning about working on protected branch
```

### 2. Time-Based Reminder

```bash
# Make changes and wait
echo "feature code" >> new-feature.js
git add new-feature.js

# The suggestion engine tracks time since changes
# After 60 minutes: Gentle reminder to commit
# After 120 minutes: Stronger warning
```

### 3. Large Changeset

```bash
# Create many files
for i in {1..6}; do echo "content" > file$i.js; done
git add *.js

# Check status - should suggest breaking into smaller commits
```

### 4. Clean Working Directory on Feature Branch

```bash
# Create and push a feature branch with no local changes
git checkout -b feature/test
git push -u origin feature/test

# With clean working directory, should suggest creating a PR
```

## Configuration Check

Make sure suggestions are enabled in `~/.config/claude-code-github/config.yml`:

```yaml
suggestions:
  enabled: true
  time_based_commits:
    enabled: true
    reminder_minutes: 60
    warning_minutes: 120
  branch_protection:
    enabled: true
  commit_size:
    enabled: true
    max_files: 5
  pr_suggestions:
    enabled: true
```

## What to Expect

When you run `dev_status`, you'll see:

```json
{
  "suggestions": [
    {
      "type": "warning",
      "priority": "high",
      "message": "You're working directly on protected branch 'main'",
      "action": "dev_create_branch",
      "reason": "Protected branches should not receive direct commits."
    }
  ],
  "hints": [
    "Use 'dev_create_branch' to create a feature branch",
    "Consider smaller, focused commits"
  ]
}
```

## Debugging

If you don't see suggestions:

1. Check if suggestions are enabled in config
2. Verify you have uncommitted changes: `git status`
3. Check the branch you're on: `git branch`
4. Make sure the MCP server is running and connected

The suggestions appear in the `dev_status` response under the `suggestions` and `hints` fields.