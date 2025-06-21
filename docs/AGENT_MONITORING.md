# Agent Monitoring System

## Overview

The Agent Monitoring System provides real-time visibility into autonomous agent activities through interactive terminal dashboards and event streaming. This system addresses the critical need for transparency in AI-driven development workflows by showing what the agent is thinking, analyzing, and suggesting in real-time.

## Features

### 🖥️ Interactive Dashboard
- Real-time terminal-based UI using blessed.js
- Live activity feed with color-coded events
- Decision tree visualization showing agent reasoning
- Interactive controls for pause/resume, filtering, and configuration
- Performance statistics and success metrics

### 📡 Event Streaming
- Minimal console output for lightweight monitoring
- Configurable event filtering by type or confidence
- Perfect for CI/CD environments or background monitoring
- Color-coded output with confidence indicators

### 🧠 Decision Transparency
- Complete reasoning chains for every agent decision
- Confidence levels for all suggestions and actions
- Visual decision trees showing pass/fail conditions
- Historical tracking of successful vs. failed actions

## Usage

### Launch Interactive Dashboard

```bash
# Basic dashboard
npx @jdrhyne/claude-code-github monitor

# Dashboard with project-specific monitoring
npx @jdrhyne/claude-code-github dashboard --project ./my-app

# Custom refresh rate and compact mode
npx @jdrhyne/claude-code-github monitor --refresh-rate 500 --compact
```

### Stream Events to Console

```bash
# Stream all events
npx @jdrhyne/claude-code-github stream

# Stream only analysis and suggestions
npx @jdrhyne/claude-code-github stream --filter analyzing,suggesting

# Stream without colors (for logging)
npx @jdrhyne/claude-code-github stream --no-color
```

## Dashboard Interface

### Status Bar
Shows current agent status, mode, confidence thresholds, and last action.

```
┌─ Claude Code GitHub Agent ─────────────────────────────────────────┐
│ Status: ACTIVE │ Mode: ASSISTED │ Confidence: 0.85 │ Last Action: 2m │
```

### Activity Log
Real-time stream of agent activities with timestamps, icons, and confidence levels.

```
🤖 Agent Stream │ my-app │ assisted mode
├─ 14:24:15 🔍 Scanning project for changes...
├─ 14:24:16 📁 Found 3 modified files:
│  ├─ src/auth/login.js (+12/-3)
│  ├─ src/auth/signup.js (+8/-1) 
│  └─ tests/auth.test.js (+15/-0)
├─ 14:24:17 🧠 Analyzing change pattern...
│  ├─ Theme: Authentication feature
│  ├─ Quality: High cohesion
│  └─ Risk: Low (tests included)
├─ 14:24:18 💡 SUGGESTION: Create feature branch
│  ├─ Action: git checkout -b feature/auth-improvements
│  ├─ Confidence: 0.87
│  └─ Reason: Cohesive feature changes with tests
└─ 14:24:25 ✅ User approved - executing...
```

### Decision Tree
Visual representation of agent reasoning with pass/fail indicators.

```
🧠 DECISION TREE
┌─ File changes detected
├─ ✓ Not on protected branch
├─ ✓ Tests passing
├─ ✓ Changes coherent (auth feature)
└─ → RECOMMEND: Create feature branch + commit
```

### Statistics Panel
Performance metrics and event breakdowns.

```
📊 RECENT ACTIVITY
14:23 ✓ Suggested branch creation (accepted)
14:19 ⚠ Warned about large commit (5 mins ago)
14:15 ✓ Auto-committed WIP changes
```

## Event Types

| Icon | Type | Description |
|------|------|-------------|
| 🔍 | `scanning` | Agent is scanning for changes |
| 🧠 | `analyzing` | Agent is analyzing detected changes |
| 💡 | `suggesting` | Agent is making a suggestion |
| ⚡ | `executing` | Agent is executing an action |
| 📚 | `learning` | Agent is learning from feedback |
| ⏳ | `waiting` | Agent is waiting for user input |
| ❌ | `error` | Agent encountered an error |
| 😴 | `idle` | Agent is idle/inactive |

## Keyboard Controls

### Dashboard Mode
- `[p]` or `[space]` - Pause/Resume monitoring
- `[c]` - Clear activity log
- `[r]` - Refresh display
- `[f]` - Filter events (future enhancement)
- `[h]` or `[?]` - Show help
- `[q]` - Quit monitor

### Stream Mode
- `Ctrl+C` - Stop streaming

## Configuration

### Monitor Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project <path>` | Monitor specific project | Current directory |
| `-r, --refresh-rate <ms>` | Dashboard refresh rate | 1000ms |
| `-c, --compact` | Use compact display mode | false |
| `--no-color` | Disable colored output | false |
| `-f, --filter <types>` | Filter events by type | All types |

### Event Filtering

Filter events by type using comma-separated values:

```bash
# Only show analysis and suggestions
--filter analyzing,suggesting

# Only show high-priority events
--filter suggesting,executing,error
```

## Integration with Existing Systems

The monitoring system integrates seamlessly with existing claude-code-github functionality:

### Event Emission
All automation tools automatically emit events:
- File change detection → `scanning` events
- Git status analysis → `analyzing` events
- AI decisions → `suggesting` events
- Action execution → `executing` events

### No Performance Impact
- Uses efficient event emission
- Dashboard runs in separate process
- Optional monitoring (disabled by default)
- Minimal memory footprint

### Backward Compatibility
- All existing MCP functionality remains unchanged
- Monitor can be enabled/disabled without affecting core features
- Compatible with all existing configuration options

## Architecture

### Core Components

1. **AgentEventEmitter** - Central event system
2. **AgentMonitor** - Interactive dashboard UI
3. **MonitorCli** - CLI interface and mode handling
4. **AgentIntegration** - Connects existing systems to events

### Event Flow

```
Automation System → AgentIntegration → AgentEventEmitter → Dashboard/Stream
                                    ↓
                               Event History & Statistics
```

## Development and Testing

### Sample Events
In development mode, the system generates sample events to demonstrate functionality:

```bash
NODE_ENV=development npx @jdrhyne/claude-code-github stream
```

### Testing
Comprehensive test suite covers:
- Event emission and filtering
- Dashboard component rendering
- CLI argument parsing
- Statistical calculations
- Integration with existing systems

Run tests:
```bash
npm test -- src/__tests__/agent-monitoring.test.ts
```

## Future Enhancements

- Web-based dashboard with rich visualizations
- Advanced filtering and search capabilities
- Event export and reporting
- Team collaboration features
- Mobile app notifications
- Voice command integration

## Troubleshooting

### Dashboard Issues
- Ensure terminal supports Unicode characters
- Try `--no-color` flag for basic terminals
- Check terminal size (minimum 80x24 recommended)

### Event Streaming
- Use `--no-color` for CI/CD environments
- Adjust refresh rate if terminal cannot keep up
- Filter events to reduce noise in busy projects

### Performance
- Monitor uses minimal CPU in background
- Event history limited to 1000 events by default
- Dashboard refresh rate can be adjusted for performance

## Examples

### Development Workflow
1. Start dashboard: `npx @jdrhyne/claude-code-github monitor`
2. Make code changes in your project
3. Watch agent analyze changes in real-time
4. See suggestions appear with reasoning
5. Approve or modify suggested actions

### CI/CD Integration
```bash
# In CI pipeline, stream events to logs
npx @jdrhyne/claude-code-github stream --no-color --filter error,executing
```

### Team Monitoring
```bash
# Multiple team members can monitor same project
npx @jdrhyne/claude-code-github dashboard --project /shared/project
```

The Agent Monitoring System transforms the claude-code-github autonomous agent from a "black box" into a transparent, trustworthy development partner that shows its work and reasoning at every step.