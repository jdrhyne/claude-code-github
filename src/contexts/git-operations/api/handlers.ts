import { Request, Response, NextFunction } from 'express';
import { CommandBus } from '../../../shared/infrastructure/command-bus.js';
import { CreateBranchCommand } from '../application/commands/create-branch.command.js';
import { CommitCommand } from '../application/commands/commit.command.js';
import { GitRepositoryRepository } from '../application/ports/repositories.js';

/**
 * API handlers for Git Operations
 */
export class GitOperationsHandlers {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly repoRepository: GitRepositoryRepository
  ) {}

  /**
   * List all repositories
   */
  listRepositories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositories = await this.repoRepository.findAll();
      
      res.json({
        data: repositories.map(repo => ({
          id: repo.repositoryId.value,
          path: repo.path,
          mainBranch: repo.config.mainBranch,
          currentBranch: repo.currentBranch,
          hasUncommittedChanges: !repo.uncommittedChanges.isEmpty()
        }))
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get repository status
   */
  getRepositoryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repoId } = req.params;
      // Safely handle include parameter - can be string or array
      const includeParam = req.query.include;
      const include: string[] = Array.isArray(includeParam) 
        ? includeParam 
        : includeParam 
          ? [includeParam] 
          : [];
      
      const repository = await this.repoRepository.findById(repoId);
      if (!repository) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Repository not found'
        });
        return;
      }

      const status = repository.getStatus();
      const response: any = {
        branch: status.currentBranch,
        isProtected: repository.isOnProtectedBranch(),
        uncommittedChanges: {
          fileCount: status.uncommittedChanges.length,
          files: status.uncommittedChanges
        }
      };

      // Include additional data based on query params
      if (include.includes('branches')) {
        response.branches = Array.from(repository.branches.values()).map(branch => ({
          name: branch.name.value,
          type: branch.type,
          createdAt: branch.createdAt
        }));
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new branch
   */
  createBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repoId } = req.params;
      const { name, type, commitMessage } = req.body;

      const command = new CreateBranchCommand(
        repoId,
        name,
        type,
        commitMessage
      );

      const result = await this.commandBus.execute<{ branchName: string; createdAt: Date }>(command);

      if (result.isFailure) {
        res.status(400).json({
          code: 'BRANCH_CREATION_FAILED',
          message: result.error
        });
        return;
      }

      res.status(201)
        .location(`/api/v2/git/repositories/${repoId}/branches/${result.value.branchName}`)
        .json({
          name: result.value.branchName,
          createdAt: result.value.createdAt
        });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a commit
   */
  createCommit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repoId } = req.params;
      const { message, author = 'System', email = 'system@claude-code-github.dev' } = req.body;

      const command = new CommitCommand(
        repoId,
        message,
        author,
        email
      );

      const result = await this.commandBus.execute<{ hash: string; createdAt: Date }>(command);

      if (result.isFailure) {
        res.status(400).json({
          code: 'COMMIT_FAILED',
          message: result.error
        });
        return;
      }

      res.status(201).json({
        hash: result.value.hash,
        createdAt: result.value.createdAt
      });
    } catch (error) {
      next(error);
    }
  };
}