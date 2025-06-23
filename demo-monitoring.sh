#!/bin/bash

# Demo script for testing agent monitoring system
# Run with: chmod +x demo-monitoring.sh && ./demo-monitoring.sh

set -e

echo "🚀 Claude Code GitHub Agent Monitoring Demo"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run command with description
run_demo() {
    local description="$1"
    local command="$2"
    local duration="$3"
    
    echo -e "${BLUE}📋 Testing: ${description}${NC}"
    echo -e "${YELLOW}Command: ${command}${NC}"
    echo ""
    
    if [ "$duration" ]; then
        echo "⏰ Running for ${duration} seconds..."
        timeout ${duration}s $command || true
    else
        echo "💡 Press Ctrl+C to stop"
        $command || true
    fi
    
    echo ""
    echo -e "${GREEN}✅ Test completed${NC}"
    echo "----------------------------------------"
    echo ""
}

# Check if built
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Project not built. Running npm run build...${NC}"
    npm run build
    echo ""
fi

echo "Available demos:"
echo "1. Help output"
echo "2. Stream mode (10 seconds)"
echo "3. Dashboard mode (15 seconds)"
echo "4. Stream with filtering (8 seconds)"
echo "5. All tests in sequence"
echo ""

read -p "Choose demo (1-5): " choice

case $choice in
    1)
        run_demo "Help Output" "node dist/index.js --help"
        ;;
    2)
        run_demo "Stream Mode with Sample Events" "NODE_ENV=development node dist/index.js stream" 10
        ;;
    3)
        run_demo "Interactive Dashboard" "NODE_ENV=development node dist/index.js monitor" 15
        ;;
    4)
        run_demo "Filtered Stream (analyzing,suggesting)" "NODE_ENV=development node dist/index.js stream --filter analyzing,suggesting" 8
        ;;
    5)
        echo -e "${BLUE}🎯 Running full demo sequence...${NC}"
        echo ""
        
        run_demo "1. Help Output" "node dist/index.js --help"
        
        run_demo "2. Version Check" "node dist/index.js --version"
        
        run_demo "3. Stream Mode" "NODE_ENV=development node dist/index.js stream" 8
        
        run_demo "4. Stream with No Colors" "NODE_ENV=development node dist/index.js stream --no-color" 6
        
        run_demo "5. Filtered Stream" "NODE_ENV=development node dist/index.js stream --filter suggesting,executing" 6
        
        echo -e "${YELLOW}⚠️  Next test will launch interactive dashboard${NC}"
        echo -e "${YELLOW}   Use keyboard controls: [p]ause [c]lear [h]elp [q]uit${NC}"
        read -p "Press Enter to continue..."
        
        run_demo "6. Interactive Dashboard" "NODE_ENV=development node dist/index.js monitor" 15
        
        echo -e "${GREEN}🎉 All demos completed successfully!${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Demo complete! Check TESTING_SETUP.md for more detailed testing.${NC}"