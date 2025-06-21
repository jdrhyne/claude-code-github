/**
 * Tests for Agent Monitoring System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentEventEmitter, AgentEvent, AgentEventUtils } from '../monitoring/agent-events.js';
import { MonitorCli, isMonitorMode, getMonitorMode } from '../cli/monitor-cli.js';

describe('AgentEventEmitter', () => {
  let eventEmitter: AgentEventEmitter;

  beforeEach(() => {
    eventEmitter = new AgentEventEmitter();
  });

  it('should emit agent activity events', () => {
    const mockCallback = vi.fn();
    eventEmitter.onAgentActivity(mockCallback);

    eventEmitter.emitAgentActivity({
      type: 'scanning',
      confidence: 0.8,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 3,
      },
      message: 'Test scanning event',
    });

    expect(mockCallback).toHaveBeenCalledOnce();
    const event = mockCallback.mock.calls[0][0] as AgentEvent;
    expect(event.type).toBe('scanning');
    expect(event.confidence).toBe(0.8);
    expect(event.message).toBe('Test scanning event');
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should store event history', () => {
    eventEmitter.emitAgentActivity({
      type: 'analyzing',
      confidence: 0.7,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 2,
      },
      message: 'Test analysis event',
    });

    const history = eventEmitter.getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('analyzing');
    expect(history[0].message).toBe('Test analysis event');
  });

  it('should filter event history', () => {
    // Add multiple events
    eventEmitter.emitAgentActivity({
      type: 'scanning',
      confidence: 0.8,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 1,
      },
      message: 'Scanning event',
    });

    eventEmitter.emitAgentActivity({
      type: 'analyzing',
      confidence: 0.9,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 1,
      },
      message: 'Analysis event',
    });

    // Filter by type
    const scanningEvents = eventEmitter.getEventHistory({ types: ['scanning'] });
    expect(scanningEvents).toHaveLength(1);
    expect(scanningEvents[0].type).toBe('scanning');

    // Filter by confidence
    const highConfidenceEvents = eventEmitter.getEventHistory({ minConfidence: 0.85 });
    expect(highConfidenceEvents).toHaveLength(1);
    expect(highConfidenceEvents[0].type).toBe('analyzing');
  });

  it('should generate statistics', () => {
    eventEmitter.emitAgentActivity({
      type: 'scanning',
      confidence: 0.8,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 1,
      },
      message: 'Event 1',
    });

    eventEmitter.emitAgentActivity({
      type: 'analyzing',
      confidence: 0.6,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 1,
      },
      message: 'Event 2',
    });

    const stats = eventEmitter.getStatistics();
    expect(stats.totalEvents).toBe(2);
    expect(stats.eventsByType.scanning).toBe(1);
    expect(stats.eventsByType.analyzing).toBe(1);
    expect(stats.averageConfidence).toBe(0.7);
  });

  it('should clear history', () => {
    eventEmitter.emitAgentActivity({
      type: 'scanning',
      confidence: 0.8,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 1,
      },
      message: 'Test event',
    });

    expect(eventEmitter.getEventHistory()).toHaveLength(1);
    
    eventEmitter.clearHistory();
    expect(eventEmitter.getEventHistory()).toHaveLength(0);
  });
});

describe('AgentEventUtils', () => {
  it('should format events correctly', () => {
    const event: AgentEvent = {
      id: 'test-id',
      type: 'analyzing',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      confidence: 0.85,
      context: {
        path: '/test/project',
        branch: 'main',
        isProtected: false,
        hasUncommittedChanges: true,
        filesChanged: 3,
      },
      message: 'Test message',
    };

    const formatted = AgentEventUtils.formatEvent(event);
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('(85%)');
    expect(formatted).toContain('🧠');
  });

  it('should return correct icons for event types', () => {
    expect(AgentEventUtils.getEventIcon('scanning')).toBe('🔍');
    expect(AgentEventUtils.getEventIcon('analyzing')).toBe('🧠');
    expect(AgentEventUtils.getEventIcon('suggesting')).toBe('💡');
    expect(AgentEventUtils.getEventIcon('executing')).toBe('⚡');
    expect(AgentEventUtils.getEventIcon('unknown')).toBe('📋');
  });

  it('should return correct colors for event types', () => {
    expect(AgentEventUtils.getEventColor('scanning')).toBe('blue');
    expect(AgentEventUtils.getEventColor('analyzing')).toBe('yellow');
    expect(AgentEventUtils.getEventColor('suggesting')).toBe('green');
    expect(AgentEventUtils.getEventColor('executing')).toBe('magenta');
    expect(AgentEventUtils.getEventColor('unknown')).toBe('white');
  });

  it('should create decision trees from reasoning', () => {
    const reasoning = ['Condition 1 met', 'Condition 2 passed', 'Ready for action'];
    const tree = AgentEventUtils.createDecisionTree(reasoning, 0.85);

    expect(tree.condition).toBe('Agent Analysis');
    expect(tree.result).toBe('pass');
    expect(tree.confidence).toBe(0.85);
    expect(tree.children).toHaveLength(3);
    expect(tree.children![0].condition).toBe('Condition 1 met');
  });
});

describe('Monitor CLI utilities', () => {
  beforeEach(() => {
    // Reset process.argv for each test
    process.argv = ['node', 'test.js'];
  });

  it('should detect monitor mode from CLI args', () => {
    process.argv = ['node', 'test.js', 'monitor'];
    expect(isMonitorMode()).toBe(true);

    process.argv = ['node', 'test.js', 'dashboard'];
    expect(isMonitorMode()).toBe(true);

    process.argv = ['node', 'test.js', 'stream'];
    expect(isMonitorMode()).toBe(true);

    process.argv = ['node', 'test.js', '--monitor'];
    expect(isMonitorMode()).toBe(true);

    process.argv = ['node', 'test.js'];
    expect(isMonitorMode()).toBe(false);
  });

  it('should extract correct monitor mode from CLI args', () => {
    process.argv = ['node', 'test.js', 'monitor'];
    expect(getMonitorMode()).toBe('monitor');

    process.argv = ['node', 'test.js', 'dashboard'];
    expect(getMonitorMode()).toBe('dashboard');

    process.argv = ['node', 'test.js', 'stream'];
    expect(getMonitorMode()).toBe('stream');

    process.argv = ['node', 'test.js', '--monitor'];
    expect(getMonitorMode()).toBe('monitor');

    process.argv = ['node', 'test.js'];
    expect(getMonitorMode()).toBe(null);
  });
});

describe('MonitorCli', () => {
  let monitorCli: MonitorCli;
  let mockEventEmitter: AgentEventEmitter;

  beforeEach(() => {
    mockEventEmitter = new AgentEventEmitter();
    monitorCli = new MonitorCli(mockEventEmitter);
  });

  it('should create MonitorCli instance', () => {
    expect(monitorCli).toBeInstanceOf(MonitorCli);
  });

  it('should handle shouldShowEvent filtering', () => {
    const event = {
      type: 'analyzing',
      message: 'Test event',
      confidence: 0.8,
    };

    // No filter - should show all events
    expect((monitorCli as any).shouldShowEvent(event)).toBe(true);

    // Filter matches - should show
    expect((monitorCli as any).shouldShowEvent(event, 'analyzing,suggesting')).toBe(true);

    // Filter doesn't match - should not show
    expect((monitorCli as any).shouldShowEvent(event, 'scanning,executing')).toBe(false);
  });
});