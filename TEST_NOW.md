# 🚀 IMMEDIATE TESTING COMMANDS

## IMPORTANT: Run from the claude-code-github directory!

First, make sure you're in the right directory:
```bash
cd /Users/admin/Projects/claude-code-github
```

## Test Commands (Copy & Paste)

### 1. Verify Installation
```bash
# From claude-code-github directory:
node dist/index.js --help
```

### 2. Test Stream Mode (10 seconds)
```bash
# This will show sample events:
NODE_ENV=development node dist/index.js stream
```
Press `Ctrl+C` to stop after seeing events.

### 3. Test Dashboard Mode
```bash
# This will launch the interactive UI:
NODE_ENV=development node dist/index.js monitor
```
Press `q` to quit, `h` for help.

### 4. Run Demo Script
```bash
# Automated testing sequence:
./demo-monitoring.sh
```
Choose option 5 for full demo.

## Alternative: Using npx (from any directory)

If you want to test from any directory:
```bash
cd /Users/admin/Projects/claude-code-github
npx . --help
npx . stream
npx . monitor
```

## Quick Troubleshooting

**"Cannot find module" error:**
- Make sure you're in: `/Users/admin/Projects/claude-code-github`
- Run: `pwd` to check current directory
- Run: `npm run build` if dist folder is missing

**No events showing:**
- Make sure to include `NODE_ENV=development`
- Wait 5-10 seconds for sample events

**Dashboard looks broken:**
- Make terminal window larger
- Try: `node dist/index.js monitor --no-color`

## Expected Output Examples

**Help Command:**
```
claude-code-github v2.1.0
An intelligent MCP server for Claude Code...

Commands:
  monitor        Launch real-time agent monitoring dashboard
  dashboard      Launch interactive dashboard with full controls  
  stream         Stream agent events to console (minimal output)
```

**Stream Mode:**
```
🚀 Starting Claude Code GitHub Agent Monitor...
📡 Starting event stream...
Press Ctrl+C to quit
4:33:15 PM 🔍 Scanning project for changes... (100%)
4:33:17 PM 🧠 Analyzing changes: 3 new TypeScript files (85%)
4:33:19 PM 💡 Suggesting: Commit monitoring infrastructure (92%)
```

**Dashboard Mode:**
```
┌─ Claude Code GitHub Agent ─────────────────────────────────────────┐
│ Status: ACTIVE │ Mode: ASSISTED │ Confidence: 0.85 │ Last Action: 2m │
├─────────────────────────────────────────────────────────────────────┤
│ 🔍 ANALYZING: /Users/admin/Projects/claude-code-github             │
```