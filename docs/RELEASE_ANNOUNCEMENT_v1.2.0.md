# 🎉 claude-code-github v1.2.0: Automatic Project Discovery

We're excited to announce the release of claude-code-github v1.2.0, featuring **Automatic Project Discovery** - a game-changing feature that eliminates manual project configuration!

## 🚀 What's New

### Automatic Project Discovery
No more manually adding each project to your config file! Simply tell claude-code-github where you keep your projects, and it will automatically discover all Git repositories.

**Before v1.2.0** (manual configuration):
```yaml
projects:
  - path: "/Users/you/Projects/app1"
    github_repo: "you/app1"
  - path: "/Users/you/Projects/app2"
    github_repo: "you/app2"
  - path: "/Users/you/Projects/app3"
    github_repo: "you/app3"
  # ... tediously list every project
```

**With v1.2.0** (automatic discovery):
```yaml
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/you/Projects"
  
projects: []  # Automatically populated!
```

### Key Features
- 🔍 **Smart Scanning**: Recursively discovers Git repositories
- 🔗 **Auto GitHub Detection**: Extracts repo info from git remotes
- 🚫 **Intelligent Filtering**: Skip archived folders, node_modules, etc.
- ⚡ **Fast & Efficient**: Configurable scan depth for performance
- 🔄 **Seamless Integration**: Works alongside manual configuration

## 📦 Installation

```bash
npm install -g @jdrhyne/claude-code-github@latest
# or use npx
npx @jdrhyne/claude-code-github@latest
```

## 🔧 Quick Setup

1. Update to v1.2.0
2. Add project discovery to your config:
   ```yaml
   project_discovery:
     enabled: true
     scan_paths:
       - "/path/to/your/projects"
   ```
3. Run `claude-code-github --setup` to see discovered projects
4. That's it! 🎉

## 📚 New Documentation

We've added comprehensive guides to help you:
- **[Migration Guide](https://github.com/jdrhyne/claude-code-github/blob/main/docs/MIGRATION_GUIDE.md)**: Step-by-step migration from manual config
- **[Troubleshooting Guide](https://github.com/jdrhyne/claude-code-github/blob/main/docs/TROUBLESHOOTING.md)**: Solutions for common issues

## 🐛 Bug Fixes

- Fixed Windows path separator issues
- Resolved ESLint errors for CI compliance
- Fixed const declaration scope issue

## 🙏 Thank You

Special thanks to our contributors and users who suggested this feature! Your feedback drives the development of claude-code-github.

## 📣 Share Your Experience

- ⭐ Star us on [GitHub](https://github.com/jdrhyne/claude-code-github)
- 🐛 Report issues: [GitHub Issues](https://github.com/jdrhyne/claude-code-github/issues)
- 💬 Join the discussion: [GitHub Discussions](https://github.com/jdrhyne/claude-code-github/discussions)
- 🐦 Tweet about it: #ClaudeCodeGitHub

## 🔮 What's Next?

We're already working on the next feature: **Workspace Monitoring** (#25) - real-time detection when you clone or create new projects!

---

## Social Media Posts

### Twitter/X
```
🎉 claude-code-github v1.2.0 is here!

✨ Automatic Project Discovery - no more manual config for every project!
🔍 Just point to your project folders
🚀 Auto-detects Git repos & GitHub remotes
📦 npm install -g @jdrhyne/claude-code-github@latest

#ClaudeCode #DevTools #Git
```

### LinkedIn
```
Excited to announce claude-code-github v1.2.0! 

The new Automatic Project Discovery feature eliminates the tedious task of manually configuring each project. Simply specify your workspace directories, and the tool automatically discovers all Git repositories and their GitHub remotes.

Key highlights:
• Smart repository scanning with configurable depth
• Automatic GitHub repository detection from git remotes
• Intelligent filtering (skip node_modules, archived folders)
• Seamless integration with existing configurations

This release significantly reduces setup friction for developers managing multiple projects. Check out the migration guide to upgrade your workflow!

#OpenSource #DeveloperTools #Automation #Git #GitHub
```

### Dev.to Article Outline
```markdown
---
title: Introducing Automatic Project Discovery in claude-code-github v1.2.0
published: true
tags: git, automation, productivity, opensource
---

## The Problem

If you're like most developers, you have dozens of Git repositories scattered across your filesystem...

## The Solution: Automatic Project Discovery

With v1.2.0, you can now configure directory paths instead of individual projects...

## How It Works

1. **Smart Scanning**: The discovery engine recursively scans configured paths...
2. **GitHub Detection**: Automatically extracts repository information from git remotes...
3. **Performance Optimization**: Configurable depth and exclude patterns...

## Migration Guide

[Step-by-step instructions...]

## Real-World Example

[Before/after configuration comparison...]

## What's Next?

We're working on Workspace Monitoring for real-time project detection...
```