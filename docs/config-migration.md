# Configuration Migration Guide

If you installed claude-code-github before version 1.1.0, your configuration file may be missing the intelligent suggestions and monitoring features. This guide will help you update your configuration.

## Quick Check

Run this command to see if your config has the new sections:

```bash
grep -E "suggestions:|monitoring:" ~/.config/claude-code-github/config.yml
```

If nothing is returned, you need to update your config.

## Adding Missing Sections

Add these sections to your `~/.config/claude-code-github/config.yml` file after the `git_workflow` section:

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

## Alternative: Regenerate Config

If you prefer, you can rename your current config and let the server generate a new one with all features:

```bash
# Backup current config
mv ~/.config/claude-code-github/config.yml ~/.config/claude-code-github/config.yml.backup

# Run the server to generate new config
npx @jdrhyne/claude-code-github@latest

# Copy your projects from the backup to the new config
```

## After Updating

After updating your configuration:

1. Restart Claude Code to ensure the MCP server reloads
2. The server will now provide intelligent suggestions based on your development patterns
3. You should start seeing suggestions like:
   - Time-based reminders for uncommitted work
   - Protected branch warnings
   - Large changeset suggestions
   - PR readiness notifications

## Customizing Suggestions

You can customize the behavior per-project by adding overrides:

```yaml
projects:
  - path: "/path/to/project"
    github_repo: "username/repo"
    # Project-specific overrides
    suggestions:
      time_reminders:
        warning_threshold_minutes: 240  # 4 hours for this project
      large_changeset:
        threshold: 10  # Allow more files before suggesting commit
```

For more information, see the [main documentation](https://github.com/jdrhyne/claude-code-github).