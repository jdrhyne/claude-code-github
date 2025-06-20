#!/bin/bash

echo "🚀 Setting up claude-code-github for background monitoring..."

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your Anthropic API key as an argument:"
    echo "   ./setup-background.sh sk-ant-api03-..."
    exit 1
fi

# Add API key to shell profile
SHELL_PROFILE="$HOME/.zshrc"
if ! grep -q "ANTHROPIC_API_KEY" "$SHELL_PROFILE"; then
    echo "" >> "$SHELL_PROFILE"
    echo "# Claude Code GitHub - API Key" >> "$SHELL_PROFILE"
    echo "export ANTHROPIC_API_KEY=\"$1\"" >> "$SHELL_PROFILE"
    echo "✅ Added API key to $SHELL_PROFILE"
else
    echo "⚠️  API key already in profile, updating..."
    sed -i '' "s/export ANTHROPIC_API_KEY=.*/export ANTHROPIC_API_KEY=\"$1\"/" "$SHELL_PROFILE"
fi

# Source the profile
source "$SHELL_PROFILE"

# Validate the configuration
echo ""
echo "🔍 Validating configuration..."
claude-code-github validate

# Start the service
echo ""
echo "🚀 Starting claude-code-github..."
claude-code-github start --verbose

echo ""
echo "✅ Setup complete! claude-code-github is now monitoring your projects."
echo ""
echo "📊 Check status anytime with:"
echo "   claude-code-github status"
echo ""
echo "🛑 To stop:"
echo "   claude-code-github stop"
echo ""
echo "📝 Your projects being monitored:"
grep -A1 "path:" ~/.config/claude-code-github/config.yml | grep "path:" | sed 's/.*path: "/- /' | sed 's/"//'