#!/bin/bash

# Start monitoring for claude-code-github projects
# This script helps you quickly start monitoring your development

set -e

echo "🚀 Claude Code GitHub - Production Monitoring"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if MCP server is running
check_mcp_server() {
    if pgrep -f "claude-code-github" > /dev/null; then
        echo -e "${GREEN}✅ MCP server is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  MCP server is not running${NC}"
        return 1
    fi
}

# Main menu
echo "Choose monitoring mode:"
echo ""
echo "1. Monitor with REAL agent activity (requires MCP server)"
echo "2. Monitor with SAMPLE data (standalone demo)"
echo "3. Start MCP server + Monitoring (full setup)"
echo "4. Monitor specific project"
echo ""

read -p "Select option (1-4): " choice

case $choice in
    1)
        echo -e "\n${BLUE}Starting real-time monitoring...${NC}"
        if check_mcp_server; then
            echo "Dashboard will show actual agent activity from your development."
            echo -e "${YELLOW}Press 'q' to quit, 'h' for help${NC}\n"
            sleep 2
            cd /Users/admin/Projects/claude-code-github && node dist/index.js monitor
        else
            echo -e "${YELLOW}Start the MCP server first with: npx @jdrhyne/claude-code-github@latest${NC}"
            echo "Or choose option 3 for automatic setup."
        fi
        ;;
    
    2)
        echo -e "\n${BLUE}Starting demo monitoring with sample data...${NC}"
        echo -e "${YELLOW}Press 'q' to quit, 'h' for help${NC}\n"
        sleep 2
        NODE_ENV=development cd /Users/admin/Projects/claude-code-github && node dist/index.js monitor
        ;;
    
    3)
        echo -e "\n${BLUE}Starting full monitoring setup...${NC}"
        echo "This will:"
        echo "1. Start the MCP server in the background"
        echo "2. Launch the monitoring dashboard"
        echo ""
        read -p "Continue? (y/n): " confirm
        
        if [[ $confirm == "y" || $confirm == "Y" ]]; then
            # Start MCP server in background
            echo -e "${BLUE}Starting MCP server...${NC}"
            cd /Users/admin/Projects/claude-code-github
            npx @jdrhyne/claude-code-github@latest &
            MCP_PID=$!
            
            # Wait for server to start
            sleep 3
            
            # Start monitoring
            echo -e "${BLUE}Starting monitoring dashboard...${NC}"
            echo -e "${YELLOW}Press 'q' to quit monitoring${NC}"
            sleep 2
            
            # Trap to clean up on exit
            trap "kill $MCP_PID 2>/dev/null; exit" INT TERM EXIT
            
            node dist/index.js monitor
        fi
        ;;
    
    4)
        echo -e "\n${BLUE}Select a project to monitor:${NC}"
        echo ""
        echo "1. AgentCopy"
        echo "2. claude-code-github"
        echo "3. claude-yes"
        echo "4. jdrhyne-me"
        echo "5. nutrient-dws-client-python"
        echo "6. vibetunnel"
        echo "7. volks-typo"
        echo "8. Custom path..."
        echo ""
        
        read -p "Select project (1-8): " proj_choice
        
        case $proj_choice in
            1) PROJECT_PATH="/Users/admin/Projects/AgentCopy" ;;
            2) PROJECT_PATH="/Users/admin/Projects/claude-code-github" ;;
            3) PROJECT_PATH="/Users/admin/Projects/claude-yes" ;;
            4) PROJECT_PATH="/Users/admin/Projects/jdrhyne-me" ;;
            5) PROJECT_PATH="/Users/admin/Projects/nutrient-dws-client-python" ;;
            6) PROJECT_PATH="/Users/admin/Projects/vibetunnel" ;;
            7) PROJECT_PATH="/Users/admin/Projects/volks-typo" ;;
            8) 
                read -p "Enter project path: " PROJECT_PATH
                ;;
            *)
                echo -e "${YELLOW}Invalid selection${NC}"
                exit 1
                ;;
        esac
        
        echo -e "\n${BLUE}Monitoring project: $PROJECT_PATH${NC}"
        echo -e "${YELLOW}Press 'q' to quit, 'h' for help${NC}\n"
        sleep 2
        
        cd /Users/admin/Projects/claude-code-github && node dist/index.js monitor --project "$PROJECT_PATH"
        ;;
    
    *)
        echo -e "${YELLOW}Invalid selection${NC}"
        exit 1
        ;;
esac