import * as chokidar from 'chokidar';
import * as path from 'path';
import { ProjectConfig } from './types.js';

export interface FileChangeEvent {
  projectPath: string;
  filePath: string;
  eventType: 'add' | 'change' | 'unlink';
  timestamp: Date;
}

export class FileWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private changeListeners: Set<(event: FileChangeEvent) => void> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceMs = 500;

  addProject(project: ProjectConfig) {
    if (this.watchers.has(project.path)) {
      return;
    }

    const watcher = chokidar.watch(project.path, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/tmp/**',
        '**/temp/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.log',
        '**/.env.local',
        '**/.env.*.local'
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10
    });

    watcher
      .on('add', (filePath) => this.handleFileEvent(project.path, filePath, 'add'))
      .on('change', (filePath) => this.handleFileEvent(project.path, filePath, 'change'))
      .on('unlink', (filePath) => this.handleFileEvent(project.path, filePath, 'unlink'))
      .on('error', (error) => {
        console.error(`File watcher error for ${project.path}:`, error);
      });

    this.watchers.set(project.path, watcher);
  }

  removeProject(projectPath: string) {
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectPath);
    }

    const timer = this.debounceTimers.get(projectPath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(projectPath);
    }
  }

  private handleFileEvent(projectPath: string, filePath: string, eventType: 'add' | 'change' | 'unlink') {
    const key = `${projectPath}:${eventType}`;
    
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      
      const event: FileChangeEvent = {
        projectPath,
        filePath: path.relative(projectPath, filePath),
        eventType,
        timestamp: new Date()
      };

      this.notifyListeners(event);
    }, this.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  private notifyListeners(event: FileChangeEvent) {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in file change listener:', error);
      }
    }
  }

  addChangeListener(listener: (event: FileChangeEvent) => void) {
    this.changeListeners.add(listener);
  }

  removeChangeListener(listener: (event: FileChangeEvent) => void) {
    this.changeListeners.delete(listener);
  }

  close() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.changeListeners.clear();
  }
}