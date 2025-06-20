#!/bin/bash

echo "Scanning for Git repositories in /Users/admin/Projects/..."
echo ""

# Create temporary file for config
TEMP_CONFIG="/tmp/all-projects-config.yml"

# Start with existing config header
cat > "$TEMP_CONFIG" << 'EOF'
# Global settings for the claude-code-github server
# Full documentation available at https://github.com/jdrhyne/claude-code-github

# Default Git workflow settings.
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/
  # Auto-push configuration
  auto_push:
    feature_branches: true      # Automatically push feature branches after commits
    main_branch: false          # Automatically push main branch (use with caution)
    confirm_before_push: false  # Ask for confirmation before pushing

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

# API server configuration for real-time notifications
api_server:
  enabled: true
  port: 3000
  host: localhost
  auth:
    enabled: true
    tokens:
      - name: "notification-client"
        token: "dev-token-123"
        scopes: ["*"]

# WebSocket configuration for real-time events
websocket:
  enabled: true
  events: ["*"]

# A list of projects for the server to monitor.
# Use absolute paths.
projects:
EOF

# Scan for git repos
COUNT=0
for dir in /Users/admin/Projects/*/; do
    if [ -d "$dir/.git" ]; then
        PROJECT_NAME=$(basename "$dir")
        PROJECT_PATH=$(realpath "$dir")
        
        # Get remote URL
        cd "$dir"
        REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
        
        # Convert SSH URLs to repo format
        if [[ $REMOTE_URL == git@github.com:* ]]; then
            GITHUB_REPO=$(echo "$REMOTE_URL" | sed 's/git@github.com://' | sed 's/\.git$//')
        elif [[ $REMOTE_URL == https://github.com/* ]]; then
            GITHUB_REPO=$(echo "$REMOTE_URL" | sed 's|https://github.com/||' | sed 's/\.git$//')
        else
            # Try to guess from project name
            GITHUB_REPO="jdrhyne/$PROJECT_NAME"
        fi
        
        echo "✓ Found: $PROJECT_NAME → $GITHUB_REPO"
        
        # Add to config
        cat >> "$TEMP_CONFIG" << EOF
  - path: "$PROJECT_PATH"
    github_repo: "$GITHUB_REPO"
    reviewers:
      - "jdrhyne"
EOF
        
        COUNT=$((COUNT + 1))
    fi
done

# Add automation config
cat >> "$TEMP_CONFIG" << 'EOF'

# LLM-powered automation configuration (NEW!)
automation:
  enabled: true
  mode: learning  # Start with learning mode - safe!
  
  # LLM provider configuration
  llm:
    provider: anthropic  # or 'openai'
    model: claude-3-sonnet-20240229  # or 'gpt-4'
    api_key_env: ANTHROPIC_API_KEY  # Environment variable name
    temperature: 0.3  # Lower = more consistent decisions
  
  # Decision thresholds
  thresholds:
    confidence: 0.7      # Minimum confidence to suggest action
    auto_execute: 0.9    # Minimum confidence for autonomous execution
    require_approval: 0.5 # Below this, ignore completely
  
  # Your development preferences
  preferences:
    commit_style: conventional  # or 'descriptive'
    commit_frequency: moderate  # 'aggressive', 'moderate', or 'conservative'
    risk_tolerance: low         # 'low', 'medium', or 'high'
    work_hours: "9-17"         # Optional: only automate during work hours
    
  # Safety controls
  safety:
    max_actions_per_hour: 10    # Rate limiting
    require_tests_pass: true    # Check test status before actions
    emergency_stop: false       # Set to true to halt all automation
    protected_operations:       # Never automate these
      - force_push
      - rebase
      - tag_deletion
    
  # Learning system
  learning:
    enabled: true
    feedback_weight: 0.8  # How much to weight user feedback
    pattern_memory: 100   # Number of patterns to remember
EOF

echo ""
echo "📊 Found $COUNT Git repositories"
echo ""
echo "Generated config saved to: $TEMP_CONFIG"
echo ""
echo "To use this config:"
echo "1. Review the generated config: cat $TEMP_CONFIG"
echo "2. Backup current config: cp ~/.config/claude-code-github/config.yml ~/.config/claude-code-github/config.yml.backup"
echo "3. Apply new config: cp $TEMP_CONFIG ~/.config/claude-code-github/config.yml"
echo "4. Restart service: claude-code-github restart"