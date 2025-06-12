#!/bin/bash

# Script to configure git remote to use token authentication

echo "Configuring git remote for token authentication..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$REMOTE_URL" ]; then
    echo "❌ Error: No origin remote found"
    exit 1
fi

# Check if URL is already using token format
if [[ "$REMOTE_URL" == *"@github.com"* ]] && [[ "$REMOTE_URL" != "git@github.com"* ]]; then
    echo "✅ Remote is already configured for token authentication"
    exit 0
fi

# Extract repository info
if [[ "$REMOTE_URL" == "https://github.com/"* ]]; then
    # HTTPS URL format: https://github.com/user/repo.git
    REPO_PATH=${REMOTE_URL#https://github.com/}
elif [[ "$REMOTE_URL" == "git@github.com:"* ]]; then
    # SSH URL format: git@github.com:user/repo.git
    REPO_PATH=${REMOTE_URL#git@github.com:}
else
    echo "❌ Error: Unrecognized GitHub URL format"
    exit 1
fi

# Get GitHub username from git config
GITHUB_USER=$(git config --global user.name)

if [ -z "$GITHUB_USER" ]; then
    read -p "Enter your GitHub username: " GITHUB_USER
fi

# Try to get token from keychain
TOKEN=$(security find-generic-password -s "claude-code-github" -a "github-token" -w 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ No token found in keychain. Please run ./setup-github-token.sh first"
    exit 1
fi

# Set up new remote URL with token
NEW_REMOTE_URL="https://${GITHUB_USER}:${TOKEN}@github.com/${REPO_PATH}"

echo "Current remote: $REMOTE_URL"
echo "New remote: https://${GITHUB_USER}:[TOKEN]@github.com/${REPO_PATH}"
echo ""
read -p "Update origin remote to use token authentication? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote set-url origin "$NEW_REMOTE_URL"
    echo "✅ Remote updated successfully"
    echo ""
    echo "You can now push directly with: git push"
    echo ""
    echo "⚠️  Security note: Your token is now in the git remote URL."
    echo "   Anyone with access to your local repository can see it."
    echo "   Consider using SSH keys for better security in production."
else
    echo "❌ Remote update cancelled"
fi