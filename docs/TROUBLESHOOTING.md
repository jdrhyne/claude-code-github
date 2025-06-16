# Troubleshooting Guide

This guide helps you resolve common issues with claude-code-github.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Project Discovery Issues](#project-discovery-issues)
- [GitHub Integration](#github-integration)
- [Performance Problems](#performance-problems)
- [MCP Server Issues](#mcp-server-issues)
- [Common Error Messages](#common-error-messages)

## Installation Issues

### npm install fails with permission errors

**Problem**: `EACCES` or permission denied errors during global installation

**Solution**:
```bash
# Option 1: Use npx (recommended)
npx @jdrhyne/claude-code-github@latest

# Option 2: Fix npm permissions
npm config set prefix ~/.npm
echo 'export PATH="$HOME/.npm/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
npm install -g @jdrhyne/claude-code-github@latest

# Option 3: Use a Node version manager
# Install nvm or fnm, then:
npm install -g @jdrhyne/claude-code-github@latest
```

### Command not found after installation

**Problem**: `claude-code-github: command not found`

**Solution**:
1. Check if installed correctly:
   ```bash
   npm list -g @jdrhyne/claude-code-github
   ```

2. Find npm global bin directory:
   ```bash
   npm config get prefix
   # Add the bin subdirectory to your PATH
   ```

3. Use npx instead:
   ```bash
   npx @jdrhyne/claude-code-github@latest
   ```

## Configuration Problems

### Configuration file not found

**Problem**: "Configuration file not found at ~/.config/claude-code-github/config.yml"

**Solution**:
1. Run setup wizard:
   ```bash
   claude-code-github --setup
   ```

2. Or create manually:
   ```bash
   mkdir -p ~/.config/claude-code-github
   claude-code-github  # Creates default config
   ```

### Invalid YAML syntax

**Problem**: "Invalid YAML in configuration file"

**Common causes and fixes**:
1. **Incorrect indentation** - Use spaces, not tabs
2. **Missing quotes** - Wrap paths with spaces in quotes
3. **Wrong dash placement** - List items need space after dash

**Validate your YAML**:
```bash
# Install yamllint
pip install yamllint
yamllint ~/.config/claude-code-github/config.yml
```

### Configuration validation errors

**Problem**: Various validation errors on startup

**Solutions by error type**:

1. **"Missing git_workflow configuration"**
   ```yaml
   git_workflow:
     main_branch: main
     protected_branches: [main]
     branch_prefixes:
       feature: feature/
       bugfix: bugfix/
       refactor: refactor/
   ```

2. **"Project path does not exist"**
   - Verify the path is correct and absolute
   - Create the directory if needed
   - Remove non-existent projects

3. **"Invalid GitHub repository format"**
   ```yaml
   # Correct format:
   github_repo: "username/repository"
   # Not: github.com/username/repository
   # Not: username-repository
   ```

## Project Discovery Issues

### No projects discovered

**Problem**: Automatic discovery finds 0 projects

**Checklist**:
1. **Discovery enabled?**
   ```yaml
   project_discovery:
     enabled: true  # Must be true
   ```

2. **Valid scan paths?**
   ```yaml
   scan_paths:
     - "/Users/yourname/Projects"  # Must exist
   ```

3. **Are they Git repositories?**
   ```bash
   ls -la /path/to/project/.git
   ```

4. **Check max_depth**:
   ```yaml
   max_depth: 3  # Increase if projects are deeply nested
   ```

5. **Review exclude patterns**:
   ```yaml
   exclude_patterns:
     - "*/.*"  # This would exclude ALL hidden directories!
   ```

### GitHub repository not detected

**Problem**: Projects discovered but `github_repo` is empty

**Solutions**:

1. **Check git remote**:
   ```bash
   cd /path/to/project
   git remote -v
   # Should show origin with GitHub URL
   ```

2. **Add remote if missing**:
   ```bash
   git remote add origin git@github.com:username/repo.git
   ```

3. **Enable auto-detection**:
   ```yaml
   project_discovery:
     auto_detect_github_repo: true  # Must be true
   ```

### Excluded projects being discovered

**Problem**: Projects in excluded paths still appear

**Check pattern syntax**:
```yaml
exclude_patterns:
  - "*/archived/*"     # Matches /anywhere/archived/anywhere
  - "/Users/*/temp/*"  # Matches /Users/anyone/temp/anywhere
  - "*/node_modules"   # Matches any node_modules directory
```

**Test patterns**:
```bash
# See what would be discovered
claude-code-github --setup --dry-run
```

## GitHub Integration

### Authentication failures

**Problem**: "GitHub authentication required" or 401 errors

**Solution**:
1. Create new token: https://github.com/settings/tokens/new
2. Required scopes: `repo`, `workflow`
3. Run `claude-code-github` - it will prompt for token
4. Token is stored securely in system keychain

### "Resource not accessible by integration"

**Problem**: Can't create PRs or access repository

**Causes**:
1. Token missing required scopes
2. No repository access
3. Organization restrictions

**Fix**:
1. Regenerate token with all required scopes
2. For organizations: Settings → Applications → Authorized OAuth Apps
3. Check repository permissions

### Remote mismatch errors

**Problem**: "Remote repository does not match configuration"

**Fix**:
```bash
# Check current remote
git remote -v

# Update if needed
git remote set-url origin git@github.com:correct/repo.git

# Or update config to match
```

## Performance Problems

### Slow startup with many projects

**Problem**: Takes long time to start with discovery enabled

**Solutions**:

1. **Reduce scan depth**:
   ```yaml
   max_depth: 2  # Default is 3
   ```

2. **Be more specific with paths**:
   ```yaml
   # Instead of scanning entire home
   scan_paths:
     - "/Users/yourname/Projects/active"  # More specific
   ```

3. **Add exclude patterns**:
   ```yaml
   exclude_patterns:
     - "*/node_modules/*"
     - "*/vendor/*"
     - "*/.git/objects/*"
   ```

4. **Use workspace monitoring** (coming in next version)

### High memory usage

**Problem**: Process uses excessive memory

**Solutions**:
1. Disable monitoring features you don't use
2. Reduce file watcher depth
3. Exclude large directories

## MCP Server Issues

### Server hangs on startup

**Problem**: Claude Code shows "Connecting..." indefinitely

**Solutions**:

1. **Check for errors**:
   ```bash
   # Run directly to see errors
   claude-code-github
   ```

2. **Kill stuck processes**:
   ```bash
   # Find process
   ps aux | grep claude-code-github
   # Kill it
   kill -9 <PID>
   ```

3. **Clear lock files**:
   ```bash
   rm -f /tmp/claude-code-github-*.lock
   ```

### "Server initialization failed"

**Problem**: MCP server fails to start

**Common causes**:
1. Port already in use
2. Missing dependencies
3. Configuration errors

**Debug steps**:
```bash
# Check if another instance is running
lsof -i :3000  # Or your configured port

# Reinstall dependencies
npm install -g @jdrhyne/claude-code-github@latest --force

# Run with debug output
DEBUG=* claude-code-github
```

## Common Error Messages

### "Cannot perform operation on protected branch"

**Meaning**: Trying to commit directly to main/master

**Solution**: Create a feature branch:
```bash
git checkout -b feature/my-feature
```

Or use the tool:
```
dev_create_branch(name="my-feature", type="feature")
```

### "No changes to commit"

**Meaning**: Working directory is clean

**Check**:
```bash
git status
git diff
```

### "Process already running for this project"

**Meaning**: Another instance is monitoring this project

**Fix**:
1. Find the process: `ps aux | grep claude-code-github`
2. Kill it if stuck: `kill -9 <PID>`
3. Remove lock file: `rm /tmp/claude-code-github-*.lock`

### "Failed to load keytar"

**Meaning**: System keychain integration failed

**Solutions**:
1. **macOS**: Grant keychain access when prompted
2. **Linux**: Install `libsecret-1-dev`
3. **Windows**: Should work automatically
4. **Fallback**: Set `GITHUB_TOKEN` environment variable

## Getting More Help

If your issue isn't covered here:

1. **Check logs**:
   ```bash
   claude-code-github --debug
   ```

2. **Search existing issues**:
   https://github.com/jdrhyne/claude-code-github/issues

3. **Open new issue** with:
   - Error message
   - Configuration file (remove sensitive data)
   - Steps to reproduce
   - System information

4. **Community help**:
   https://github.com/jdrhyne/claude-code-github/discussions