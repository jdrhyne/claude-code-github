#!/bin/bash

echo "🚀 Starting claude-code-github for ALL projects..."
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "❌ Please provide your Anthropic API key:"
        echo "   ./start-all-projects.sh sk-ant-api03-..."
        echo ""
        echo "Or set it in your environment:"
        echo "   export ANTHROPIC_API_KEY='sk-ant-api03-...'"
        exit 1
    fi
else
    export ANTHROPIC_API_KEY="$1"
    echo "✅ Using provided API key"
fi

# Validate configuration
echo "🔍 Validating configuration..."
claude-code-github validate

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Configuration validation failed!"
    echo "Please fix the errors above before starting."
    exit 1
fi

# Summary of what will be monitored
echo ""
echo "📊 Monitoring 19 Git repositories:"
echo ""
grep -A1 "path:" ~/.config/claude-code-github/config.yml | grep "path:" | sed 's/.*path: "/  • /' | sed 's/"//' | head -10
echo "  ... and 9 more projects"

echo ""
echo "🤖 LLM Automation: ENABLED (Learning Mode)"
echo "🛡️  Safety: Protected branches, rate limiting active"
echo ""

# Start the service
echo "🚀 Starting service..."
claude-code-github start --verbose

echo ""
echo "✅ Service is now running!"
echo ""
echo "📋 Quick Commands:"
echo "  • Check status:     claude-code-github status"
echo "  • View logs:        claude-code-github logs -f"
echo "  • Stop service:     claude-code-github stop"
echo "  • In Claude:        dev_automation_status"
echo ""
echo "💡 The system is in LEARNING MODE and will observe your patterns for 1-2 days."