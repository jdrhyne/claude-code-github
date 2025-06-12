#!/bin/bash

# Script to set up git credentials helper for GitHub token authentication
# This is more secure than embedding the token in the remote URL

echo "Setting up secure git credentials for GitHub..."
echo ""

# Check if we have a token in keychain
TOKEN=$(security find-generic-password -s "claude-code-github" -a "github-token" -w 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ No token found in keychain. Please run ./setup-github-token.sh first"
    exit 1
fi

# Get GitHub username
GITHUB_USER=$(git config --global github.user)

if [ -z "$GITHUB_USER" ]; then
    # Try to extract from current remote
    REMOTE_URL=$(git remote get-url origin 2>/dev/null)
    if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/ ]]; then
        GITHUB_USER="${BASH_REMATCH[1]}"
        echo "Detected GitHub username: $GITHUB_USER"
    else
        read -p "Enter your GitHub username: " GITHUB_USER
    fi
    
    # Save for future use
    git config --global github.user "$GITHUB_USER"
fi

# Configure git credential helper
echo "Configuring git credential helper..."
git config --global credential.helper osxkeychain

# Store credentials in keychain for github.com
echo "Storing GitHub credentials in keychain..."
printf "protocol=https\nhost=github.com\nusername=%s\npassword=%s\n" "$GITHUB_USER" "$TOKEN" | git credential-osxkeychain store

if [ $? -eq 0 ]; then
    echo "✅ Credentials stored successfully"
    
    # Make sure remote is using HTTPS (not SSH or token-embedded URL)
    if git rev-parse --git-dir > /dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin 2>/dev/null)
        
        if [[ "$REMOTE_URL" == "git@github.com:"* ]]; then
            # Convert SSH to HTTPS
            REPO_PATH=${REMOTE_URL#git@github.com:}
            NEW_URL="https://github.com/${REPO_PATH}"
            echo ""
            echo "Converting SSH remote to HTTPS..."
            git remote set-url origin "$NEW_URL"
            echo "✅ Remote updated to: $NEW_URL"
        elif [[ "$REMOTE_URL" == *"@github.com"* ]] && [[ "$REMOTE_URL" != "git@github.com"* ]]; then
            # Remove embedded token from URL
            if [[ "$REMOTE_URL" =~ https://[^@]+@github\.com/(.+) ]]; then
                REPO_PATH="${BASH_REMATCH[1]}"
                NEW_URL="https://github.com/${REPO_PATH}"
                echo ""
                echo "Removing embedded token from remote URL..."
                git remote set-url origin "$NEW_URL"
                echo "✅ Remote updated to: $NEW_URL"
            fi
        fi
    fi
    
    echo ""
    echo "✅ Git is now configured to use your GitHub token securely!"
    echo ""
    echo "You can now:"
    echo "  • git push"
    echo "  • git pull" 
    echo "  • Use the MCP server to create PRs and manage releases"
    echo ""
    echo "The token is stored securely in your macOS keychain."
else
    echo "❌ Failed to store credentials"
    exit 1
fi