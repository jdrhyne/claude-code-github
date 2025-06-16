# Workspace Monitoring Guide

This guide covers the workspace monitoring feature introduced in v1.3.0, which enables real-time detection of new Git repositories in your development folders.

## Overview

Workspace monitoring watches your specified directories for new Git repositories, automatically detecting when you:
- Clone a repository
- Initialize a new Git repository
- Move a Git repository into a monitored folder

## Configuration

Add the `workspace_monitoring` section to your `config.yml`:

```yaml
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/you/Projects"
      auto_detect: true
      cache_discovery: true
      github_repo_detection: from_remote
    - path: "/Users/you/Work"
      auto_detect: true
      github_repo_detection: from_folder_name
```

### Configuration Options

#### Global Settings

- `enabled`: Whether workspace monitoring is active (default: false)

#### Per-Workspace Settings

- `path`: The directory to monitor for new Git repositories
- `auto_detect`: Whether to automatically detect new repositories (default: true)
- `cache_discovery`: Whether to cache discovered projects for faster startup (default: true)
- `github_repo_detection`: How to detect GitHub repository information
  - `from_remote`: Extract from git remote URL (default)
  - `from_folder_name`: Infer from folder name (e.g., "user-repo" → "user/repo")
- `inherit_settings`: Whether discovered projects inherit workspace settings (coming soon)

## How It Works

1. **Initial Scan**: On startup, the monitor scans configured workspace directories for existing Git repositories
2. **Real-time Detection**: Uses file system watchers to detect new `.git` directories
3. **Automatic Configuration**: Discovered projects are automatically added to your active project list
4. **Context Awareness**: Tracks your current working directory to provide context-specific suggestions

## Usage Examples

### Basic Setup

Monitor a single projects folder:

```yaml
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/you/Projects"
      auto_detect: true
```

### Multiple Workspaces

Monitor different folders with different settings:

```yaml
workspace_monitoring:
  enabled: true
  workspaces:
    - path: "/Users/you/personal-projects"
      auto_detect: true
      github_repo_detection: from_folder_name
    
    - path: "/Users/you/work-projects"
      auto_detect: true
      github_repo_detection: from_remote
      
    - path: "/Users/you/experiments"
      auto_detect: true
      cache_discovery: false  # Don't cache temporary experiments
```

### GitHub Repository Detection

#### From Remote URL (Default)

The monitor extracts repository information from git remote URLs:

```bash
# Remote: git@github.com:username/repository.git
# Detected: username/repository
```

#### From Folder Name

Uses folder naming conventions to infer repository:

```bash
# Folder: username-repository
# Detected: username/repository
```

This is useful when:
- You haven't set up remotes yet
- You use consistent folder naming
- You want immediate detection without remote configuration

## Performance Considerations

### Caching

Discovered projects are cached to improve startup time:

```yaml
workspaces:
  - path: "/Users/you/Projects"
    cache_discovery: true  # Enabled by default
```

Cache location: `~/.config/claude-code-github/workspace-cache.json`

### Monitoring Depth

The monitor only watches the immediate subdirectories of workspace paths to avoid performance issues with deeply nested structures.

## Integration with Other Features

### Automatic Project Discovery

Workspace monitoring complements project discovery:
- **Project Discovery**: One-time scan during startup
- **Workspace Monitoring**: Continuous monitoring for new projects

### Intelligent Suggestions

Discovered projects automatically benefit from:
- Smart commit suggestions
- Branch management
- Pull request workflows

## Troubleshooting

### Projects Not Being Detected

1. **Check workspace path exists**:
   ```bash
   ls -la /path/to/workspace
   ```

2. **Verify Git repository**:
   ```bash
   ls -la /path/to/project/.git
   ```

3. **Check configuration**:
   ```yaml
   workspace_monitoring:
     enabled: true  # Must be true
     workspaces:
       - path: "/exact/path/to/workspace"
         auto_detect: true  # Must be true
   ```

### Performance Issues

If you experience slowdowns:

1. **Reduce monitored paths**: Only monitor active development directories
2. **Disable caching for temporary folders**: Set `cache_discovery: false`
3. **Check system file watcher limits**:
   ```bash
   # macOS
   sysctl kern.maxfiles
   
   # Linux
   cat /proc/sys/fs/inotify/max_user_watches
   ```

### Cache Issues

Clear the cache if projects are incorrectly detected:

```bash
rm ~/.config/claude-code-github/workspace-cache.json
```

## Best Practices

1. **Organize Projects**: Keep projects in dedicated workspace folders
2. **Use Consistent Naming**: If using folder name detection, follow a consistent pattern
3. **Monitor Actively Used Folders**: Only monitor directories where you regularly create projects
4. **Combine with Manual Config**: Use workspace monitoring for dynamic projects, manual config for stable ones

## Example Workflow

1. Configure workspace monitoring:
   ```yaml
   workspace_monitoring:
     enabled: true
     workspaces:
       - path: "/Users/you/Projects"
         auto_detect: true
   ```

2. Clone a new repository:
   ```bash
   cd /Users/you/Projects
   git clone git@github.com:example/new-repo.git
   ```

3. The monitor automatically detects `new-repo` and adds it to active projects

4. Start working immediately:
   ```bash
   cd new-repo
   # Claude now provides intelligent suggestions for this project
   ```

## Migration from Manual Configuration

If you're currently using manual project configuration:

1. Enable workspace monitoring for your project directories
2. Remove manually configured projects that exist in monitored workspaces
3. Let the monitor automatically manage these projects

See the [Migration Guide](MIGRATION_GUIDE.md) for detailed steps.