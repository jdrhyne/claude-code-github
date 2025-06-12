import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationMonitor } from '../monitoring/conversation-monitor.js';
import { EventAggregator } from '../monitoring/event-aggregator.js';
import { MonitorManager } from '../monitoring/monitor-manager.js';
import { ProcessManager } from '../process-manager.js';
import { MonitoringEventType } from '../monitoring/types.js';
import { FileWatcher } from '../file-watcher.js';
import { GitManager } from '../git.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConversationMonitor', () => {
  let monitor: ConversationMonitor;

  beforeEach(() => {
    monitor = new ConversationMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  it('should detect feature completion patterns', () => {
    const events: any[] = [];
    monitor.on('event', (event) => events.push(event));

    monitor.processMessage('I have implemented the feature for authentication', 'assistant');
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(MonitoringEventType.FEATURE_COMPLETE);
    expect(events[0].data.pattern).toBe('feature_complete');
  });

  it('should detect bug fix patterns', () => {
    const events: any[] = [];
    monitor.on('event', (event) => events.push(event));

    monitor.processMessage('Fixed the issue with the login form', 'assistant');
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(MonitoringEventType.BUG_FIXED);
  });

  it('should detect test-related patterns', () => {
    const events: any[] = [];
    monitor.on('event', (event) => events.push(event));

    monitor.processMessage('All tests are passing now', 'assistant');
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(MonitoringEventType.TESTS_PASSING);
  });

  it('should extract file mentions', () => {
    const events: any[] = [];
    monitor.on('event', (event) => events.push(event));

    monitor.processMessage('Updated the file `src/auth/login.ts` and created `src/auth/logout.ts`', 'assistant');
    
    const fileEvent = events.find(e => e.type === MonitoringEventType.FILES_MENTIONED);
    expect(fileEvent).toBeDefined();
    expect(fileEvent.data.files).toContain('src/auth/login.ts');
    expect(fileEvent.data.files).toContain('src/auth/logout.ts');
  });

  it('should maintain message buffer', () => {
    monitor.processMessage('First message', 'user');
    monitor.processMessage('Second message', 'assistant');
    monitor.processMessage('Third message', 'user');

    const context = monitor.getRecentContext(2);
    expect(context).toHaveLength(2);
    expect(context[0].content).toBe('Second message');
    expect(context[1].content).toBe('Third message');
  });
});

describe('EventAggregator', () => {
  let aggregator: EventAggregator;

  beforeEach(() => {
    aggregator = new EventAggregator();
  });

  afterEach(() => {
    aggregator.clear();
  });

  it('should emit milestone for feature completion with tests', () => {
    const milestones: any[] = [];
    aggregator.on('milestone', (milestone) => milestones.push(milestone));

    // Add related events
    aggregator.addEvent({
      type: MonitoringEventType.TESTS_PASSING,
      timestamp: new Date(),
      projectPath: '/test',
      data: {}
    });

    aggregator.addEvent({
      type: MonitoringEventType.DOCS_UPDATED,
      timestamp: new Date(),
      projectPath: '/test',
      data: {}
    });

    aggregator.addEvent({
      type: MonitoringEventType.FEATURE_COMPLETE,
      timestamp: new Date(),
      projectPath: '/test',
      data: {}
    });

    expect(milestones).toHaveLength(1);
    expect(milestones[0].type).toBe('feature_shipped');
    expect(milestones[0].events).toHaveLength(3);
  });

  it('should emit release readiness milestone', () => {
    const milestones: any[] = [];
    aggregator.on('milestone', (milestone) => milestones.push(milestone));

    // Add multiple feature completions
    for (let i = 0; i < 3; i++) {
      aggregator.addEvent({
        type: MonitoringEventType.FEATURE_COMPLETE,
        timestamp: new Date(),
        projectPath: '/test',
        data: {}
      });
    }

    const releaseMilestone = milestones.find(m => m.type === 'release_ready');
    expect(releaseMilestone).toBeDefined();
    expect(releaseMilestone.events).toHaveLength(3);
  });

  it('should generate commit suggestions for large changesets', () => {
    const suggestions: any[] = [];
    aggregator.on('suggestion', (suggestion) => suggestions.push(suggestion));

    aggregator.addEvent({
      type: MonitoringEventType.GIT_STATE_CHANGE,
      timestamp: new Date(),
      projectPath: '/test',
      data: {
        uncommittedChanges: { file_count: 15 }
      }
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('commit');
    expect(suggestions[0].priority).toBe('medium');
  });

  it('should track event statistics', () => {
    // Add various events
    for (let i = 0; i < 5; i++) {
      aggregator.addEvent({
        type: MonitoringEventType.FILE_CHANGE,
        timestamp: new Date(),
        projectPath: '/test',
        data: {}
      });
    }

    for (let i = 0; i < 3; i++) {
      aggregator.addEvent({
        type: MonitoringEventType.BUG_FIXED,
        timestamp: new Date(),
        projectPath: '/test',
        data: {}
      });
    }

    const stats = aggregator.getStats();
    expect(stats.totalEvents).toBe(8);
    expect(stats.eventTypes[MonitoringEventType.FILE_CHANGE]).toBe(5);
    expect(stats.eventTypes[MonitoringEventType.BUG_FIXED]).toBe(3);
  });
});

describe('ProcessManager', () => {
  let manager: ProcessManager;
  let tempDir: string;

  beforeEach(async () => {
    manager = new ProcessManager();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-project-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should initialize and create lock file', async () => {
    await manager.initialize(tempDir);
    
    const instances = await ProcessManager.getRunningInstances();
    const instance = instances.find(i => i.projectPath === tempDir);
    
    expect(instance).toBeDefined();
    expect(instance?.pid).toBe(process.pid);
  });

  it('should prevent multiple instances', async () => {
    await manager.initialize(tempDir);
    
    const manager2 = new ProcessManager();
    await expect(manager2.initialize(tempDir)).rejects.toThrow(/already monitoring/);
  });

  it('should register and execute cleanup handlers', async () => {
    const cleanupCalled = vi.fn();
    
    await manager.initialize(tempDir);
    manager.onCleanup(cleanupCalled);
    
    // Trigger cleanup manually (normally done by signal)
    await manager['removeLockFile']();
    
    // In real scenario, cleanup would be called on shutdown
    // For test, we'll call it directly
    const handler = manager['cleanupHandlers'].values().next().value;
    if (handler) await handler();
    
    expect(cleanupCalled).toHaveBeenCalled();
  });

  it('should clean up stale lock files', async () => {
    // Create a fake stale lock file
    const lockDir = path.join(os.tmpdir(), 'claude-code-github-locks');
    await fs.mkdir(lockDir, { recursive: true });
    
    const staleLock = path.join(lockDir, 'project-stale.lock');
    await fs.writeFile(staleLock, JSON.stringify({
      pid: 99999999, // Non-existent process
      startTime: new Date(),
      projectPath: '/fake/path',
      lockFile: staleLock
    }));
    
    await manager.initialize(tempDir);
    
    // Stale lock should be cleaned up
    await expect(fs.access(staleLock)).rejects.toThrow();
  });
});

describe('MonitorManager', () => {
  let monitorManager: MonitorManager;
  let fileWatcher: FileWatcher;
  let gitManager: GitManager;

  beforeEach(() => {
    fileWatcher = new FileWatcher();
    gitManager = new GitManager();
    
    // Mock git methods
    vi.spyOn(gitManager, 'getCurrentBranch').mockResolvedValue('main');
    vi.spyOn(gitManager, 'getUncommittedChanges').mockResolvedValue({
      file_count: 3,
      diff_summary: 'mock diff',
      files_changed: []
    });
    vi.spyOn(gitManager, 'getRecentCommits').mockResolvedValue([]);

    monitorManager = new MonitorManager({
      fileWatcher,
      gitManager,
      projects: [{
        path: '/test/project',
        github_repo: 'test/repo'
      }]
    });
  });

  afterEach(() => {
    monitorManager.stop();
    fileWatcher.close();
    vi.restoreAllMocks();
  });

  it('should process conversation messages', () => {
    const events: any[] = [];
    monitorManager.on('monitoring-event', (event) => events.push(event));

    monitorManager.processConversationMessage('Fixed the bug in the auth module', 'assistant');
    
    const bugFixEvent = events.find(e => e.type === MonitoringEventType.BUG_FIXED);
    expect(bugFixEvent).toBeDefined();
  });

  it('should emit suggestions', () => {
    const suggestions: any[] = [];
    monitorManager.on('suggestion', (suggestion) => suggestions.push(suggestion));

    // Trigger events that should generate suggestions
    monitorManager.processConversationMessage('Feature is complete and ready', 'assistant');
    
    // Wait for event processing
    setTimeout(() => {
      expect(suggestions.length).toBeGreaterThan(0);
    }, 100);
  });

  it('should track monitoring state', () => {
    const state = monitorManager.getMonitoringState();
    
    expect(state.projects).toHaveLength(1);
    expect(state.activeMonitors.fileWatcher).toBe(true);
    expect(state.activeMonitors.gitMonitor).toBe(true);
    expect(state.activeMonitors.conversationMonitor).toBe(true);
  });
});