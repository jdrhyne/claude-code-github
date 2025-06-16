# Migration Guide: From Manual Configuration to Automatic Project Discovery

This guide helps you migrate from manually configuring each project to using the new automatic project discovery feature introduced in v1.2.0.

## Table of Contents
- [Overview](#overview)
- [Before You Begin](#before-you-begin)
- [Migration Steps](#migration-steps)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)
- [Rollback Instructions](#rollback-instructions)

## Overview

The automatic project discovery feature eliminates the need to manually add each project to your configuration file. Instead, you configure directory paths to scan, and claude-code-github will automatically discover Git repositories.

### Key Benefits
- ✅ No more manual project configuration
- ✅ Automatically detects new projects when you clone/create them
- ✅ Reduces configuration maintenance
- ✅ Works alongside existing manual configurations

## Before You Begin

1. **Backup your current configuration**:
   ```bash
   cp ~/.config/claude-code-github/config.yml ~/.config/claude-code-github/config.yml.backup
   ```

2. **Update to v1.2.0 or later**:
   ```bash
   npm install -g @jdrhyne/claude-code-github@latest
   ```

## Migration Steps

### Step 1: Identify Your Project Locations

List all directories where you keep your Git repositories. Common patterns:
- All projects in one folder: `/Users/yourname/Projects`
- Separated by type: `/Users/yourname/Work`, `/Users/yourname/Personal`
- By client/organization: `/Users/yourname/ClientA`, `/Users/yourname/ClientB`

### Step 2: Update Your Configuration

Add the `project_discovery` section to your config file:

```yaml
# ~/.config/claude-code-github/config.yml

# Add this new section
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/yourname/Projects"    # Add your project directories
    - "/Users/yourname/Work"
  exclude_patterns:                  # Optional: exclude certain paths
    - "*/archived/*"
    - "*/node_modules/*"
    - "*/.Trash/*"
  auto_detect_github_repo: true
  max_depth: 3                       # How deep to scan (default: 3)

# Keep your existing projects section
# Discovered projects will be merged with these
projects:
  # You can now remove most entries here
  # Keep only projects with special configurations
  - path: "/Users/yourname/Projects/special-project"
    github_repo: "yourname/special-project"
    reviewers: ["teammate1", "teammate2"]  # Project-specific settings
```

### Step 3: Test the Discovery

Run claude-code-github with the `--setup` flag to see discovered projects:

```bash
claude-code-github --setup
```

This will show you:
- Which projects were discovered
- Any projects that couldn't be auto-detected
- Validation results

### Step 4: Clean Up Old Configuration

Once discovery is working, you can remove manually configured projects that were discovered automatically:

**Before** (manual configuration):
```yaml
projects:
  - path: "/Users/yourname/Projects/app1"
    github_repo: "yourname/app1"
  - path: "/Users/yourname/Projects/app2"
    github_repo: "yourname/app2"
  - path: "/Users/yourname/Projects/app3"
    github_repo: "yourname/app3"
    reviewers: ["john", "jane"]  # Special configuration
```

**After** (with discovery):
```yaml
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/yourname/Projects"

projects:
  # Only keep projects with special configurations
  - path: "/Users/yourname/Projects/app3"
    github_repo: "yourname/app3"
    reviewers: ["john", "jane"]
```

## Configuration Examples

### Example 1: Simple Setup
Most users can use this minimal configuration:

```yaml
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/yourname/Projects"

projects: []  # Let discovery handle everything
```

### Example 2: Multiple Workspaces
For developers with projects in multiple locations:

```yaml
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/yourname/Work"
    - "/Users/yourname/Personal"
    - "/Users/yourname/OpenSource"
  exclude_patterns:
    - "*/archived/*"
    - "*/experiments/*"
```

### Example 3: Mixed Mode
Combine automatic discovery with manual configuration:

```yaml
project_discovery:
  enabled: true
  scan_paths:
    - "/Users/yourname/Projects"
  exclude_patterns:
    - "*/private/*"  # Don't auto-discover private projects

projects:
  # Manually configure private or special projects
  - path: "/Users/yourname/private/secret-project"
    github_repo: "yourname/secret-project"
    reviewers: ["trusted-reviewer"]
```

### Example 4: Gradual Migration
Start with discovery disabled and test incrementally:

```yaml
project_discovery:
  enabled: false  # Start disabled
  scan_paths:
    - "/Users/yourname/test-folder"  # Test with one folder first

# Keep all existing projects during testing
projects:
  - path: "/Users/yourname/Projects/app1"
    github_repo: "yourname/app1"
  # ... rest of your projects
```

## Troubleshooting

### Projects Not Being Discovered

1. **Check if the directory is a Git repository**:
   ```bash
   ls -la /path/to/project/.git
   ```

2. **Verify GitHub remote is configured**:
   ```bash
   cd /path/to/project
   git remote -v
   ```

3. **Check scan depth**: Increase `max_depth` if projects are deeply nested

4. **Review exclude patterns**: Make sure your patterns aren't too broad

### GitHub Repository Not Auto-Detected

The discovery feature extracts GitHub info from git remotes. Ensure your remote is set:

```bash
git remote add origin git@github.com:username/repo.git
# or
git remote set-url origin https://github.com/username/repo.git
```

### Performance Issues

If discovery is slow with many projects:

1. Reduce `max_depth` to scan fewer levels
2. Use more specific `scan_paths` instead of scanning entire home directory
3. Add `exclude_patterns` for large non-project directories

## Rollback Instructions

If you need to revert to manual configuration:

1. **Restore your backup**:
   ```bash
   cp ~/.config/claude-code-github/config.yml.backup ~/.config/claude-code-github/config.yml
   ```

2. **Or disable discovery**:
   ```yaml
   project_discovery:
     enabled: false  # Disable discovery
   
   # Your manual projects remain unchanged
   projects:
     # ... your projects
   ```

## Next Steps

- Check out [workspace monitoring](./WORKSPACE_MONITORING.md) for even more automation
- Read the [troubleshooting guide](./TROUBLESHOOTING.md) for common issues
- Join our [discussions](https://github.com/jdrhyne/claude-code-github/discussions) for help

## Questions?

If you encounter any issues during migration:
1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Open an [issue](https://github.com/jdrhyne/claude-code-github/issues)
3. Ask in [discussions](https://github.com/jdrhyne/claude-code-github/discussions)