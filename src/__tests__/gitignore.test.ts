import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FileWatcher } from '../file-watcher.js';
import { ProjectConfig } from '../types.js';
import * as chokidar from 'chokidar';

// Mock chokidar
vi.mock('chokidar');

describe('FileWatcher gitignore support', () => {
  let fileWatcher: FileWatcher;
  const testProjectPath = '/test/project';
  const testProject: ProjectConfig = {
    path: testProjectPath,
    github_repo: 'test/repo'
  };

  beforeEach(() => {
    fileWatcher = new FileWatcher();
    vi.clearAllMocks();
    
    // Setup chokidar mock
    vi.mocked(chokidar.watch).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      close: vi.fn()
    } as unknown as chokidar.FSWatcher);
  });

  afterEach(() => {
    fileWatcher.close();
  });

  it('should read and respect .gitignore patterns', () => {
    const gitignoreContent = `
node_modules/
*.log
.env
dist/
coverage/
    `;

    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      return filePath === path.join(testProjectPath, '.gitignore');
    });

    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath === path.join(testProjectPath, '.gitignore')) {
        return gitignoreContent;
      }
      throw new Error('File not found');
    });

    fileWatcher.addProject(testProject);

    expect(chokidar.watch).toHaveBeenCalledWith(
      testProjectPath,
      expect.objectContaining({
        ignored: expect.any(Function),
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: 10
      })
    );

    // Get the ignored function from the mock call
    const watchCall = vi.mocked(chokidar.watch).mock.calls[0];
    const options = watchCall[1];
    const ignoredFn = options.ignored as (filePath: string) => boolean;

    // Test that gitignore patterns are respected
    expect(ignoredFn(path.join(testProjectPath, 'node_modules/package.json'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, 'error.log'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, '.env'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, 'dist/index.js'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, 'coverage/report.html'))).toBe(true);
    
    // Test that non-ignored files are allowed
    expect(ignoredFn(path.join(testProjectPath, 'src/index.ts'))).toBe(false);
    expect(ignoredFn(path.join(testProjectPath, 'README.md'))).toBe(false);
  });

  it('should always ignore .git directory', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    fileWatcher.addProject(testProject);

    const watchCall = chokidar.watch.mock.calls[0];
    const options = watchCall[1];
    const ignoredFn = options.ignored;

    expect(ignoredFn(path.join(testProjectPath, '.git/config'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, '.git/HEAD'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, '.git'))).toBe(true);
  });

  it('should handle missing .gitignore gracefully', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => {
      fileWatcher.addProject(testProject);
    }).not.toThrow();

    const watchCall = chokidar.watch.mock.calls[0];
    const options = watchCall[1];
    const ignoredFn = options.ignored;

    // Should still apply default patterns
    expect(ignoredFn(path.join(testProjectPath, 'node_modules/package.json'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, '.DS_Store'))).toBe(true);
  });

  it('should load global gitignore if present', () => {
    const projectGitignore = 'node_modules/\n';
    const globalGitignore = '*.swp\n*.bak\n';
    
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (typeof filePath !== 'string') return false;
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      return filePath === path.join(testProjectPath, '.gitignore') ||
             filePath === path.join(homeDir, '.gitignore_global');
    });

    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath === path.join(testProjectPath, '.gitignore')) {
        return projectGitignore;
      }
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      if (filePath === path.join(homeDir, '.gitignore_global')) {
        return globalGitignore;
      }
      throw new Error('File not found');
    });

    fileWatcher.addProject(testProject);

    const watchCall = chokidar.watch.mock.calls[0];
    const options = watchCall[1];
    const ignoredFn = options.ignored;

    // Test both local and global patterns
    expect(ignoredFn(path.join(testProjectPath, 'node_modules/foo'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, 'file.swp'))).toBe(true);
    expect(ignoredFn(path.join(testProjectPath, 'backup.bak'))).toBe(true);
  });
});