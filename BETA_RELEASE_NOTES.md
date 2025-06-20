# 🚀 Beta Release v2.1.0-beta.1

## 🎉 Introducing LLM-Powered Autonomous Git Workflow Automation

We're excited to announce the beta release of our most ambitious feature yet: **AI-powered Git automation** that learns from your development patterns and helps automate repetitive Git workflows.

## ✨ What's New

### 🤖 LLM Decision Engine
- Integrates with **Anthropic Claude** and **OpenAI GPT-4**
- Makes intelligent decisions about when to commit, branch, or create PRs
- Learns from your feedback to improve suggestions

### 🧠 Adaptive Learning System
- **Learning Mode**: Observes your patterns without taking action
- **Assisted Mode**: Suggests actions and waits for approval
- **Autonomous Mode**: Executes high-confidence actions automatically
- Adapts to your commit style, frequency, and preferences

### 🛡️ Safety First
- Protected branch safeguards
- Rate limiting (configurable actions per hour)
- Emergency stop mechanism
- Test status verification
- Comprehensive audit logging

### 🔧 New MCP Tools
- `dev_automation_status` - Check automation state
- `dev_automation_enable` - Turn on with mode selection
- `dev_automation_disable` - Turn off (with emergency option)
- `dev_automation_configure` - Adjust settings
- `dev_feedback_approve/reject/correct` - Train the system

## 🚀 Getting Started

### 1. Install Beta Version
```bash
npm install -g @jdrhyne/claude-code-github@beta
```

### 2. Set API Key
```bash
export ANTHROPIC_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
```

### 3. Enable in Config
```yaml
# ~/.config/claude-code-github/config.yml
automation:
  enabled: true
  mode: learning  # Start here!
  llm:
    provider: anthropic
    api_key_env: ANTHROPIC_API_KEY
```

### 4. Start Testing!
See [BETA_TESTING_GUIDE.md](./BETA_TESTING_GUIDE.md) for detailed instructions.

## ⚠️ Beta Disclaimer

This is a **beta release** intended for testing and feedback:
- Use on non-critical projects first
- Start with learning mode
- Monitor API costs
- Report issues on GitHub
- Expect some rough edges

## 🐛 Known Issues

- CI tests show environmental failures (Rollup dependencies)
- Some integration tests need refinement
- Learning data is stored locally only (no sync)

## 🙏 We Need Your Feedback!

This feature represents months of work and we're excited to see how it performs in real-world scenarios. Please share:
- What works well?
- What could be improved?
- Any unexpected behaviors?
- Feature requests?

Report at: https://github.com/jdrhyne/claude-code-github/issues

## 🔮 What's Next

Based on beta feedback, we plan to:
1. Refine decision algorithms
2. Add more LLM providers
3. Implement team learning features
4. Create VS Code integration
5. Add cost tracking dashboard

## 💡 Pro Tips

1. **Give it time** - The system needs 1-2 days to learn your patterns
2. **Be consistent** - Regular feedback helps it learn faster
3. **Start conservative** - Use learning mode before autonomous
4. **Monitor costs** - LLM API calls can add up in autonomous mode

Thank you for being an early adopter! Your testing helps make this feature amazing for everyone.

---

**Version**: 2.1.0-beta.1  
**Release Date**: June 20, 2025  
**Status**: Public Beta  
**Breaking Changes**: None - All features are opt-in