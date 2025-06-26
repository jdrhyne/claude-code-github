import { GitRepositoryRepository } from '../application/ports/repositories.js';
import { GitRepository } from '../domain/repository.js';
import { ConfigManager } from '../../../config.js';
import { GitManager } from '../../../git.js';
import { Changes } from '../domain/value-objects/changes.js';
import { Branch } from '../domain/entities/branch.js';
import { BranchType } from '../domain/types.js';

/**
 * Implementation of GitRepositoryRepository
 */
export class GitRepositoryRepositoryImpl implements GitRepositoryRepository {
  private repositories: Map<string, GitRepository> = new Map();

  constructor(
    private readonly configManager: ConfigManager,
    private readonly gitManager: GitManager
  ) {}

  async findById(id: string): Promise<GitRepository | null> {
    // Check cache first
    const cached = this.repositories.get(id);
    if (cached) {
      // Refresh uncommitted changes from Git
      const status = await this.gitManager.status(cached.path);
      const changes = await this.mapStatusToChanges(status);
      cached.updateChanges(changes);
      return cached;
    }

    // Load from config
    const projects = await this.configManager.getProjects();
    const project = projects.find(p => p.path === id);
    
    if (!project) {
      return null;
    }

    // Get current Git status
    const status = await this.gitManager.status(project.path);
    const branches = await this.gitManager.branch(project.path, []);

    // Create repository aggregate
    const repoResult = GitRepository.create({
      id: project.path,
      path: project.path,
      config: {
        mainBranch: project.git_workflow?.main_branch || 'main',
        protectedBranches: project.git_workflow?.protected_branches || ['main'],
        remoteName: 'origin',
        remoteUrl: project.github_repo
      },
      currentBranch: status.current
    });

    if (repoResult.isFailure) {
      throw new Error(repoResult.error);
    }

    const repository = repoResult.value;

    // Load existing branches
    for (const branchName of branches.all) {
      if (branchName === status.current) continue; // Skip current branch
      
      // Try to determine branch type from name
      let branchType = BranchType.FEATURE;
      if (branchName.startsWith('bugfix/')) branchType = BranchType.BUGFIX;
      else if (branchName.startsWith('hotfix/')) branchType = BranchType.HOTFIX;
      else if (branchName.startsWith('refactor/')) branchType = BranchType.REFACTOR;
      else if (branchName.startsWith('release/')) branchType = BranchType.RELEASE;
      else if (branchName.startsWith('chore/')) branchType = BranchType.CHORE;

      const branchResult = Branch.fromPersistence({
        name: branchName,
        type: branchType,
        baseBranch: project.git_workflow?.main_branch || 'main',
        createdAt: new Date(), // Would get from Git log in real implementation
        isProtected: project.git_workflow?.protected_branches?.includes(branchName) || false
      });

      if (branchResult.isSuccess) {
        // Add to repository's branch collection
        // Note: In the real implementation, we'd need to expose a method to add branches
      }
    }

    // Update with current changes
    const changes = await this.mapStatusToChanges(status);
    repository.updateChanges(changes);

    // Cache the repository
    this.repositories.set(id, repository);

    return repository;
  }

  async save(repository: GitRepository): Promise<void> {
    // Update cache
    this.repositories.set(repository.repositoryId.value, repository);
    
    // In a real implementation, we might persist additional metadata
    // For now, Git itself is our persistence layer
  }

  async findAll(): Promise<GitRepository[]> {
    const projects = await this.configManager.getProjects();
    const repositories: GitRepository[] = [];

    for (const project of projects) {
      try {
        const repo = await this.findById(project.path);
        if (repo) {
          repositories.push(repo);
        }
      } catch (error) {
        // Log error but continue processing other repositories
        console.error(`Failed to load repository ${project.path}:`, error);
      }
    }

    return repositories;
  }

  private async mapStatusToChanges(status: any): Promise<Changes> {
    const files: any[] = [];

    // Map Git status to domain model
    if (status.modified) {
      status.modified.forEach((file: string) => {
        files.push({
          path: file,
          status: 'modified'
        });
      });
    }

    if (status.created) {
      status.created.forEach((file: string) => {
        files.push({
          path: file,
          status: 'added'
        });
      });
    }

    if (status.deleted) {
      status.deleted.forEach((file: string) => {
        files.push({
          path: file,
          status: 'deleted'
        });
      });
    }

    if (status.renamed) {
      status.renamed.forEach(({ from, to }: any) => {
        files.push({
          path: to,
          status: 'renamed',
          oldPath: from
        });
      });
    }

    if (status.not_added) {
      status.not_added.forEach((file: string) => {
        files.push({
          path: file,
          status: 'untracked'
        });
      });
    }

    return Changes.create(files);
  }
}