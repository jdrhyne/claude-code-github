import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { default as ignore } from 'ignore';
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
  private gitignoreCache: Map<string, ReturnType<typeof ignore>> = new Map();

  addProject(project: ProjectConfig) {
    if (this.watchers.has(project.path)) {
      return;
    }

    // Load gitignore patterns
    const ig = this.loadGitignore(project.path);
    this.gitignoreCache.set(project.path, ig);

    const watcher = chokidar.watch(project.path, {
      ignored: (filePath: string) => {
        // Get relative path and normalize for cross-platform
        const relativePath = path.relative(project.path, filePath).replace(/\\/g, '/');
        
        // Always ignore .git directory
        if (relativePath === '.git' || relativePath.startsWith('.git/')) {
          return true;
        }
        
        // Check gitignore patterns
        if (relativePath && ig.ignores(relativePath)) {
          return true;
        }
        
        // Default patterns as fallback
        const defaultPatterns = [
          '**/node_modules/**',
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
        ];
        
        // Normalize the full path for pattern matching
        const normalizedPath = filePath.replace(/\\/g, '/');
        return defaultPatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(normalizedPath);
        });
      },
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

  private loadGitignore(projectPath: string): ReturnType<typeof ignore> {
    const ig = ignore();
    
    try {
      // Load .gitignore from project root
      const gitignorePath = path.join(projectPath, '.gitignore');
      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        ig.add(gitignoreContent);
      } catch (error) {
        // File might have been deleted between check and read, or no permission
        // This is not critical, we can continue without gitignore
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Warning: Could not read .gitignore file: ${error}`);
        }
      }
      
      // Also check for global gitignore
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (homeDir) {
        const globalGitignorePath = path.join(homeDir, '.gitignore_global');
        try {
          const globalGitignoreContent = fs.readFileSync(globalGitignorePath, 'utf8');
          ig.add(globalGitignoreContent);
        } catch (error) {
          // Global gitignore is optional, ignore if not found
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Warning: Could not read global .gitignore file: ${error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading gitignore:', error);
    }
    
    return ig;
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
    
    this.gitignoreCache.delete(projectPath);
  }

  private handleFileEvent(projectPath: string, filePath: string, eventType: 'add' | 'change' | 'unlink') {
    // Reload gitignore if it changed
    const relativePath = path.relative(projectPath, filePath);
    if (relativePath === '.gitignore' && eventType === 'change') {
      const ig = this.loadGitignore(projectPath);
      this.gitignoreCache.set(projectPath, ig);
    }
    
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
    this.gitignoreCache.clear();
  }
}