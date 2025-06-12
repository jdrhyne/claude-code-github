#!/bin/bash

# Script to set up GitHub token for claude-code-github MCP server

echo "Setting up GitHub authentication for claude-code-github..."
echo ""
echo "Please create a GitHub Personal Access Token with these scopes:"
echo "  • repo (Full control of private repositories)"
echo "  • workflow (Update GitHub Action workflows)"
echo ""
echo "Create your token at: https://github.com/settings/tokens/new"
echo ""
read -p "Enter your GitHub Personal Access Token: " -s TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo "Error: Token cannot be empty"
    exit 1
fi

# Store token in keychain using security command (macOS)
security add-generic-password -a "github-token" -s "claude-code-github" -w "$TOKEN" -U

if [ $? -eq 0 ]; then
    echo "✅ Token stored successfully in keychain"
    
    # Get GitHub username from git config
    GITHUB_USER=$(git config --global user.name)
    
    # Configure git to use token for authentication
    echo ""
    echo "Configuring git to use token authentication..."
    
    # Set up git credential helper to use the token
    git config --global credential.helper osxkeychain
    
    # Store credentials for GitHub
    echo "protocol=https
host=github.com
username=$GITHUB_USER
password=$TOKEN" | git credential-osxkeychain store
    
    echo "✅ Git configured to use token authentication"
    echo ""
    echo "You can now push to GitHub repositories using the MCP server!"
else
    echo "❌ Failed to store token in keychain"
    exit 1
fi