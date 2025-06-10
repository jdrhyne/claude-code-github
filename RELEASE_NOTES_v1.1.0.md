# v1.1.0: Intelligent Workflow Assistant

## 🎉 What's New

claude-code-github now features an **intelligent workflow assistant** that analyzes your development patterns and provides smart suggestions to improve productivity and maintain clean Git history. This major enhancement transforms the tool from basic Git automation into an AI-powered development companion.

### 🧠 Intelligent Workflow Assistant
- **Pattern Recognition**: Analyzes your work patterns and provides contextual suggestions
- **Time Tracking**: Reminds you to commit after extended work sessions (configurable: 1hr reminder, 2hr warning)
- **Change Analysis**: Suggests optimal commit strategies based on file types and changes
- **Workflow Guidance**: Recommends when to branch, commit, or create pull requests

### 🛡️ Smart Safety & Best Practices
- **Protected Branch Warnings**: Alerts when working directly on main/develop branches
- **Atomic Commit Suggestions**: Identifies large changesets (5+ files) and mixed change types
- **PR Readiness Detection**: Suggests creating pull requests when branches are ready
- **Work Loss Prevention**: Time-based reminders to avoid losing uncommitted work

### ⚙️ Comprehensive Configuration System
- **Master Switch**: `suggestions.enabled: false` to disable all suggestions
- **Granular Controls**: Enable/disable individual suggestion types
- **Custom Thresholds**: Adjust time limits (default: 60min/120min) and file counts (default: 5)
- **Per-Project Overrides**: Different configurations for different workflow styles

### 📊 Enhanced Status Reporting
- **Intelligent Suggestions**: Included in `dev_status` output with priority levels
- **Contextual Hints**: Smart recommendations based on current work context
- **Priority Sorting**: High/medium/low priority suggestions for better focus

## 🚀 Getting Started

```bash
npx @jdrhyne/claude-code-github@latest
```

The intelligent suggestions are **enabled by default** with sensible defaults. To customize:

```yaml
# Edit ~/.config/claude-code-github/config.yml
suggestions:
  enabled: true
  time_reminders:
    warning_threshold_minutes: 120  # Customize timing
  large_changeset:
    threshold: 5                   # Customize file count
```

## 📖 Documentation

- [Intelligent Suggestions Configuration](README.md#intelligent-suggestions)
- [Usage Examples](README.md#usage-examples)
- [Full Changelog](CHANGELOG.md)

## 🔄 Migration

**No breaking changes** - this is a fully backward-compatible release. Existing configurations will continue to work, and suggestions are additive to existing functionality.

## 💬 Feedback

The intelligent workflow assistant learns from common development patterns. We'd love to hear how it works for your workflow! Please [open an issue](https://github.com/jdrhyne/claude-code-github/issues) or start a [discussion](https://github.com/jdrhyne/claude-code-github/discussions).

---

**Full Changelog**: [1.0.2...1.1.0](https://github.com/jdrhyne/claude-code-github/compare/v1.0.2...v1.1.0)