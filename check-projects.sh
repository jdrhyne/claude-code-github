#!/bin/bash

# Quick script to check which projects are configured and their status

echo "🔍 Claude Code GitHub - Project Monitor Status"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Extract projects from config
echo -e "${BLUE}📁 Configured Projects:${NC}"
echo ""

# Read config and show projects with git status
while IFS= read -r line; do
    if [[ $line =~ path:\ \"(.*)\" ]]; then
        project_path="${BASH_REMATCH[1]}"
        project_name=$(basename "$project_path")
        
        # Check if directory exists
        if [ -d "$project_path" ]; then
            # Get git status summary
            cd "$project_path" 2>/dev/null
            if [ -d ".git" ]; then
                # Count changes
                modified=$(git status --porcelain 2>/dev/null | grep -c "^ M")
                untracked=$(git status --porcelain 2>/dev/null | grep -c "^??")
                branch=$(git branch --show-current 2>/dev/null)
                
                if [ $modified -gt 0 ] || [ $untracked -gt 0 ]; then
                    echo -e "${YELLOW}● $project_name${NC} - ${branch:-main} (${modified}M/${untracked}U)"
                    echo "  Path: $project_path"
                else
                    echo -e "${GREEN}● $project_name${NC} - ${branch:-main} (clean)"
                    echo "  Path: $project_path"
                fi
            else
                echo -e "${RED}● $project_name${NC} - Not a git repo"
                echo "  Path: $project_path"
            fi
        else
            echo -e "${RED}● $project_name${NC} - Directory not found"
            echo "  Path: $project_path"
        fi
        echo ""
    fi
done < ~/.config/claude-code-github/config.yml

echo -e "${BLUE}📊 Summary:${NC}"
echo "- All projects above are monitored when MCP server is running"
echo "- Yellow = has uncommitted changes (active)"
echo "- Green = clean (no changes)"
echo "- Red = issues found"
echo ""
echo -e "${BLUE}🎯 To monitor a specific project:${NC}"
echo "claude-monitor monitor --project /path/to/project"
echo ""
echo -e "${BLUE}🔄 To see all activity:${NC}"
echo "claude-monitor stream"