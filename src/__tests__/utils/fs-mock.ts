import { vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';

export class FileSystemMock {
  private mockFiles: Map<string, string> = new Map();
  private mockDirectories: Set<string> = new Set();

  constructor() {
    this.setupDefaultStructure();
  }

  private setupDefaultStructure() {
    const configDir = path.join(os.homedir(), '.config', 'claude-code-github');
    this.mockDirectories.add(configDir);
    
    const configPath = path.join(configDir, 'config.yml');
    this.mockFiles.set(configPath, this.getDefaultConfig());
  }

  private getDefaultConfig(): string {
    return `
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

projects:
  - path: "/tmp/test-project"
    github_repo: "test-user/test-repo"
    reviewers:
      - "reviewer1"
`;
  }

  addFile(filePath: string, content: string) {
    this.mockFiles.set(filePath, content);
    
    const dir = path.dirname(filePath);
    this.mockDirectories.add(dir);
  }

  addDirectory(dirPath: string) {
    this.mockDirectories.add(dirPath);
  }

  removeFile(filePath: string) {
    this.mockFiles.delete(filePath);
  }

  createMockFS() {
    return {
      existsSync: vi.fn().mockImplementation((filePath: string) => {
        return this.mockFiles.has(filePath) || this.mockDirectories.has(filePath);
      }),
      
      readFileSync: vi.fn().mockImplementation((filePath: string, _encoding?: string) => {
        const content = this.mockFiles.get(filePath);
        if (!content) {
          throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        }
        return content;
      }),
      
      writeFileSync: vi.fn().mockImplementation((filePath: string, content: string) => {
        this.addFile(filePath, content);
      }),
      
      mkdirSync: vi.fn().mockImplementation((dirPath: string, _options?: any) => {
        this.addDirectory(dirPath);
      }),
      
      statSync: vi.fn().mockImplementation((filePath: string) => {
        if (this.mockDirectories.has(filePath)) {
          return { isDirectory: () => true, isFile: () => false };
        }
        if (this.mockFiles.has(filePath)) {
          return { isDirectory: () => false, isFile: () => true };
        }
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      })
    };
  }

  mockProjectDirectory(projectPath: string) {
    this.addDirectory(projectPath);
    this.addDirectory(path.join(projectPath, '.git'));
    this.addFile(path.join(projectPath, 'package.json'), '{"name": "test-project"}');
    this.addFile(path.join(projectPath, 'README.md'), '# Test Project');
  }

  mockConfigExists(exists: boolean = true) {
    const configPath = path.join(os.homedir(), '.config', 'claude-code-github', 'config.yml');
    if (!exists) {
      this.removeFile(configPath);
    } else {
      this.addFile(configPath, this.getDefaultConfig());
    }
  }
}