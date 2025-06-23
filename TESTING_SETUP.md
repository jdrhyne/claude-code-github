# 🧪 Agent Monitoring Testing Setup

## Quick Start Testing

### 1. **Basic Function Test**

```bash
# Test CLI help (should show new monitoring commands)
npm run build && node dist/index.js --help

# Expected output should include:
# Commands:
#   monitor        Launch real-time agent monitoring dashboard
#   dashboard      Launch interactive dashboard with full controls  
#   stream         Stream agent events to console (minimal output)
```

### 2. **Stream Mode Test** (Recommended first test)

```bash
# Test stream mode with sample events
NODE_ENV=development node dist/index.js stream

# Expected: Should show sample events after a few seconds:
# 📡 Starting event stream...
# 10:19:51 PM 🔍 Scanning project for changes... (100%)
# 10:19:53 PM 🧠 Analyzing changes: 3 new TypeScript files (85%)
# 10:19:55 PM 💡 Suggesting: Commit monitoring infrastructure (92%)
```

### 3. **Dashboard Mode Test**

```bash
# Test interactive dashboard
NODE_ENV=development node dist/index.js monitor

# Expected: Full terminal UI with panels
# Use 'q' to quit, 'h' for help
```

## Comprehensive Testing Scenarios

### Scenario 1: Stream Mode Variations

```bash
# Basic stream
node dist/index.js stream

# With filtering
node dist/index.js stream --filter analyzing,suggesting

# No colors (for logging)
node dist/index.js stream --no-color

# Development mode (with sample events)
NODE_ENV=development node dist/index.js stream
```

### Scenario 2: Dashboard Mode Variations

```bash
# Basic dashboard
node dist/index.js monitor

# Full-featured dashboard
node dist/index.js dashboard

# With specific project
node dist/index.js dashboard --project /Users/admin/Projects/claude-code-github

# Custom refresh rate
node dist/index.js monitor --refresh-rate 500

# Compact mode
node dist/index.js monitor --compact
```

### Scenario 3: Interactive Controls Testing

When in dashboard mode, test these keyboard shortcuts:

- `[p]` or `[space]` - Pause/Resume monitoring
- `[c]` - Clear activity log
- `[r]` - Refresh display
- `[h]` or `[?]` - Show help dialog
- `[q]` - Quit monitor

### Scenario 4: Error Handling

```bash
# Test invalid commands
node dist/index.js invalid-command

# Test invalid options
node dist/index.js stream --invalid-option

# Test without build
# (Delete dist folder and try running)
```

## Expected Behavior

### Stream Mode
- ✅ Shows timestamped events with icons
- ✅ Confidence percentages in parentheses
- ✅ Reasoning steps indented with └─
- ✅ Color coding (unless --no-color)
- ✅ Graceful exit with Ctrl+C

### Dashboard Mode
- ✅ Four-panel layout (Status, Activity, Decision Tree, Controls)
- ✅ Real-time updates
- ✅ Interactive keyboard controls
- ✅ Proper terminal cleanup on exit
- ✅ Responsive to terminal resize

### Development Mode
- ✅ Generates sample events automatically
- ✅ Events appear at 1s, 3s, 5s intervals
- ✅ Shows realistic agent workflow

## Manual Testing Checklist

### Installation & Setup
- [ ] `npm run build` completes without errors
- [ ] `node dist/index.js --help` shows monitoring commands
- [ ] `node dist/index.js --version` shows current version

### Stream Mode
- [ ] `node dist/index.js stream` starts successfully
- [ ] Shows startup message and instructions
- [ ] Accepts Ctrl+C to exit gracefully
- [ ] `--filter` option works correctly
- [ ] `--no-color` removes colors
- [ ] Development mode generates sample events

### Dashboard Mode
- [ ] `node dist/index.js monitor` launches UI
- [ ] Four panels are visible and properly formatted
- [ ] Status bar shows agent information
- [ ] Activity log accepts new events
- [ ] Keyboard controls work ([p], [c], [r], [h], [q])
- [ ] Help dialog displays and closes properly
- [ ] Terminal cleans up properly on exit

### Error Handling
- [ ] Invalid commands show helpful error messages
- [ ] Missing dependencies are reported clearly
- [ ] Terminal size issues are handled gracefully
- [ ] Network/file system errors don't crash

### Performance
- [ ] Dashboard refreshes smoothly (no flicker)
- [ ] Memory usage stays reasonable during long runs
- [ ] No significant CPU usage when idle
- [ ] Large number of events don't slow down UI

## Troubleshooting Common Issues

### Issue: "Command not found" or module errors
**Solution:** Run `npm run build` first

### Issue: Dashboard appears garbled
**Solution:** 
- Ensure terminal supports Unicode
- Try `--no-color` flag
- Increase terminal size (minimum 80x24)

### Issue: No sample events in development
**Solution:** 
- Ensure `NODE_ENV=development` is set
- Wait 5-10 seconds for events to generate

### Issue: Dashboard doesn't respond to keyboard
**Solution:**
- Ensure terminal has focus
- Try different key combinations
- Check if terminal intercepts certain keys

### Issue: Colors don't show properly
**Solution:**
- Use `--no-color` flag
- Check terminal color support
- Try different terminal emulator

## Advanced Testing

### Testing with Real Projects

1. Navigate to an actual Git repository
2. Make some file changes
3. Run monitoring while using claude-code-github MCP tools
4. Observe real agent events (requires full MCP setup)

### Performance Testing

```bash
# Long-running test (let it run for 10+ minutes)
NODE_ENV=development node dist/index.js monitor

# Memory monitoring
# Check memory usage with Activity Monitor or htop
```

### Terminal Compatibility Testing

Test on different terminals:
- macOS Terminal
- iTerm2
- VS Code integrated terminal
- tmux/screen sessions

## Success Criteria

✅ **All monitoring commands work without errors**  
✅ **Interactive dashboard displays properly**  
✅ **Stream mode shows formatted events**  
✅ **Keyboard controls are responsive**  
✅ **Sample events generate in development mode**  
✅ **Help system works correctly**  
✅ **Graceful exit and cleanup**  
✅ **No crashes or hanging processes**  

## Reporting Issues

When reporting issues, please include:

1. **Command used:** Exact command that caused the issue
2. **Expected behavior:** What should have happened
3. **Actual behavior:** What actually happened
4. **Environment:** Terminal, OS, Node.js version
5. **Output:** Any error messages or logs
6. **Steps to reproduce:** How to recreate the issue

## Next Steps After Testing

1. Test integration with actual MCP server functionality
2. Test with real Git repositories and file changes
3. Test with different project types and sizes
4. Gather feedback on UI/UX improvements
5. Test performance with large event volumes