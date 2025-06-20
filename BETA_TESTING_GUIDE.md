# 🧪 Beta Testing Guide - LLM Automation Feature

Welcome to the beta test of claude-code-github's LLM-powered automation feature! This guide will help you set up and test the new autonomous Git workflow capabilities.

## ⚡ Quick Start

### 1. Update to Beta Version

```bash
npm install -g @jdrhyne/claude-code-github@beta
# or for MCP:
claude mcp update claude-code-github
```

### 2. Set Your API Key

```bash
# For Anthropic Claude (recommended)
export ANTHROPIC_API_KEY=your-api-key-here

# OR for OpenAI
export OPENAI_API_KEY=your-api-key-here
```

### 3. Enable Automation in Your Config

Edit `~/.config/claude-code-github/config.yml`:

```yaml
automation:
  enabled: true
  mode: learning  # Start here!
  
  llm:
    provider: anthropic  # or 'openai'
    model: claude-3-sonnet-20240229  # or 'gpt-4'
    api_key_env: ANTHROPIC_API_KEY  # or OPENAI_API_KEY
```

## 🎯 Testing Progression

### Phase 1: Learning Mode (Start Here!)
```yaml
mode: learning
```
- **What it does**: Observes your patterns, no actions taken
- **Test**: Work normally, check logs for learning activity
- **Duration**: 1-2 days of normal work

### Phase 2: Assisted Mode
```yaml
mode: assisted
```
- **What it does**: Suggests actions, requires approval
- **Test**: Review and approve/reject suggestions
- **Look for**: Quality of suggestions, timing accuracy

### Phase 3: Autonomous Mode (Use Caution!)
```yaml
mode: autonomous
```
- **What it does**: Takes actions automatically above confidence threshold
- **Test**: Monitor closely, use emergency stop if needed
- **Safety**: Set up protected branches and safety rules

## 🛠️ Configuration Options

### Essential Settings

```yaml
automation:
  enabled: true
  mode: learning
  
  # LLM Configuration
  llm:
    provider: anthropic
    model: claude-3-sonnet-20240229
    temperature: 0.3  # Lower = more consistent
    api_key_env: ANTHROPIC_API_KEY
  
  # Decision Thresholds
  thresholds:
    confidence: 0.7      # Minimum to suggest
    auto_execute: 0.9    # Minimum to auto-execute
    require_approval: 0.5 # Below this, ignore
  
  # Your Preferences
  preferences:
    commit_style: conventional  # or 'descriptive'
    commit_frequency: moderate  # or 'aggressive', 'conservative'
    risk_tolerance: medium      # or 'low', 'high'
    
  # Safety Controls
  safety:
    max_actions_per_hour: 10
    require_tests_pass: true
    emergency_stop: false  # Set to true to halt all automation
```

## 🔍 What to Test

### 1. Basic Functionality
- [ ] File change detection triggers LLM analysis
- [ ] Suggestions appear in Claude interface
- [ ] Feedback tools work (approve/reject/correct)

### 2. Decision Quality
- [ ] Commit timing makes sense
- [ ] Commit messages follow your style
- [ ] Branch suggestions are appropriate
- [ ] PR descriptions are accurate

### 3. Learning System
- [ ] System adapts to your feedback
- [ ] Repeated corrections change behavior
- [ ] Preferences are learned over time

### 4. Safety Features
- [ ] Protected branches are respected
- [ ] Rate limiting works
- [ ] Emergency stop halts all actions
- [ ] Test requirements are checked

## 📊 Monitoring Your Beta Test

### Check Automation Status
```bash
# In Claude:
dev_automation_status

# Returns current mode, stats, recent decisions
```

### View Learning Progress
```bash
# In Claude:
dev_feedback_stats

# Shows approval rates, patterns learned
```

### Emergency Controls
```bash
# Stop all automation immediately:
dev_automation_disable emergency

# Re-enable when ready:
dev_automation_enable learning
```

## 🐛 Reporting Issues

### What to Include
1. Your config.yml (without API keys)
2. The decision that was made
3. What you expected instead
4. Any error messages
5. Your feedback (approve/reject/correct)

### Where to Report
- GitHub Issues: https://github.com/jdrhyne/claude-code-github/issues
- Tag with: `beta-testing`, `llm-automation`

## 💡 Tips for Effective Testing

1. **Start Small**: Use on a test project first
2. **Be Consistent**: Work normally to train the system
3. **Give Feedback**: Use correction tool to teach preferences
4. **Monitor Costs**: Check API usage, especially in autonomous mode
5. **Document Patterns**: Note what works and what doesn't

## 🔐 Security Considerations

- API keys are never logged or transmitted
- All actions are logged locally for audit
- No code is sent to LLM, only metadata
- Decisions are made based on patterns, not content

## 📈 Expected Timeline

- **Day 1-2**: Learning your patterns
- **Day 3-5**: Making good suggestions
- **Week 2**: Ready for autonomous mode
- **Week 3**: Fully adapted to your workflow

## 🎉 Thank You!

Your beta testing helps make this feature better for everyone. We appreciate your time and feedback!

---

**Beta Version**: 2.1.0-beta.1
**Release Date**: June 20, 2025
**Feature Status**: Beta - Use with caution in production