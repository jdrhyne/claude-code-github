import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

export interface ProcessInfo {
  pid: number;
  startTime: Date;
  projectPath: string;
  lockFile: string;
}

export class ProcessManager {
  private static readonly LOCK_DIR = path.join(os.tmpdir(), 'claude-code-github-locks');
  private lockFile: string | null = null;
  private cleanupHandlers = new Set<() => void | Promise<void>>();
  private isShuttingDown = false;

  constructor() {
    this.setupProcessHandlers();
  }

  /**
   * Initialize process management for a given project
   */
  async initialize(projectPath: string): Promise<void> {
    // Ensure lock directory exists
    await fs.mkdir(ProcessManager.LOCK_DIR, { recursive: true });

    // Create unique lock file name based on project path
    const hash = createHash('md5').update(projectPath).digest('hex').substring(0, 8);
    this.lockFile = path.join(ProcessManager.LOCK_DIR, `project-${hash}.lock`);

    // Clean up any stale lock files
    await this.cleanupStaleLocks();

    // Check if another instance is running
    if (await this.isAnotherInstanceRunning()) {
      throw new Error(`Another instance of claude-code-github is already monitoring ${projectPath}`);
    }

    // Create our lock file
    await this.createLockFile(projectPath);
  }

  /**
   * Register a cleanup handler to be called on shutdown
   */
  onCleanup(handler: () => void | Promise<void>): void {
    this.cleanupHandlers.add(handler);
  }

  /**
   * Remove a cleanup handler
   */
  offCleanup(handler: () => void | Promise<void>): void {
    this.cleanupHandlers.delete(handler);
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      console.log(`\nReceived ${signal}, shutting down gracefully...`);

      try {
        // Run all cleanup handlers
        const cleanupPromises = Array.from(this.cleanupHandlers).map(handler => 
          Promise.resolve(handler()).catch(err => 
            console.error('Cleanup handler error:', err)
          )
        );

        await Promise.all(cleanupPromises);

        // Remove lock file
        await this.removeLockFile();

        console.log('Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.removeLockFile();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await this.removeLockFile();
      process.exit(1);
    });

    // Ensure cleanup on normal exit
    process.on('exit', () => {
      if (this.lockFile && fsSync.existsSync(this.lockFile)) {
        try {
          fsSync.unlinkSync(this.lockFile);
        } catch (error) {
          console.error('Failed to remove lock file on exit:', error);
        }
      }
    });
  }

  /**
   * Check if another instance is already running
   */
  private async isAnotherInstanceRunning(): Promise<boolean> {
    if (!this.lockFile) return false;

    try {
      const lockData = await fs.readFile(this.lockFile, 'utf-8');
      const processInfo: ProcessInfo = JSON.parse(lockData);

      // Check if the process is still running
      try {
        process.kill(processInfo.pid, 0);
        return true; // Process exists
      } catch {
        // Process doesn't exist, lock file is stale
        await this.removeLockFile();
        return false;
      }
    } catch (_error) {
      // Lock file doesn't exist or is invalid
      return false;
    }
  }

  /**
   * Create lock file with current process info
   */
  private async createLockFile(projectPath: string): Promise<void> {
    if (!this.lockFile) return;

    const processInfo: ProcessInfo = {
      pid: process.pid,
      startTime: new Date(),
      projectPath,
      lockFile: this.lockFile
    };

    await fs.writeFile(this.lockFile, JSON.stringify(processInfo, null, 2));
  }

  /**
   * Remove our lock file
   */
  private async removeLockFile(): Promise<void> {
    if (!this.lockFile) return;

    try {
      await fs.unlink(this.lockFile);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to remove lock file:', error);
      }
    }
  }

  /**
   * Clean up stale lock files from crashed processes
   */
  private async cleanupStaleLocks(): Promise<void> {
    try {
      const files = await fs.readdir(ProcessManager.LOCK_DIR);
      
      for (const file of files) {
        if (!file.endsWith('.lock')) continue;

        const lockPath = path.join(ProcessManager.LOCK_DIR, file);
        
        try {
          const lockData = await fs.readFile(lockPath, 'utf-8');
          const processInfo: ProcessInfo = JSON.parse(lockData);

          // Check if process is still running
          try {
            process.kill(processInfo.pid, 0);
          } catch {
            // Process doesn't exist, remove stale lock
            await fs.unlink(lockPath);
            console.log(`Cleaned up stale lock file: ${file}`);
          }
        } catch (_error) {
          // Invalid lock file, remove it
          await fs.unlink(lockPath);
        }
      }
    } catch (error) {
      // Lock directory might not exist yet
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error cleaning up stale locks:', error);
      }
    }
  }

  /**
   * Get information about all running instances
   */
  static async getRunningInstances(): Promise<ProcessInfo[]> {
    const instances: ProcessInfo[] = [];

    try {
      await fs.mkdir(ProcessManager.LOCK_DIR, { recursive: true });
      const files = await fs.readdir(ProcessManager.LOCK_DIR);

      for (const file of files) {
        if (!file.endsWith('.lock')) continue;

        const lockPath = path.join(ProcessManager.LOCK_DIR, file);
        
        try {
          const lockData = await fs.readFile(lockPath, 'utf-8');
          const processInfo: ProcessInfo = JSON.parse(lockData);

          // Check if process is still running
          try {
            process.kill(processInfo.pid, 0);
            instances.push(processInfo);
          } catch {
            // Process doesn't exist, ignore
          }
        } catch {
          // Invalid lock file, ignore
        }
      }
    } catch (error) {
      console.error('Error getting running instances:', error);
    }

    return instances;
  }
}