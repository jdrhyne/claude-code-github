import { CommandHandler } from '../ports/command-handler.js';
import { CreateBranchCommand } from '../commands/create-branch.command.js';
import { GitRepositoryRepository } from '../ports/repositories.js';
import { GitService } from '../ports/git-service.js';
import { Result } from '../../../../shared/domain/result.js';
import { EventBus } from '../../../../shared/events/event-bus.js';

export interface BranchCreatedDto {
  branchName: string;
  createdAt: Date;
  baseBranch: string;
}

/**
 * Handler for creating branches
 */
export class CreateBranchHandler implements CommandHandler<CreateBranchCommand, BranchCreatedDto> {
  constructor(
    private readonly repoRepository: GitRepositoryRepository,
    private readonly gitService: GitService,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateBranchCommand): Promise<Result<BranchCreatedDto>> {
    try {
      // Load the repository aggregate
      const repository = await this.repoRepository.findById(command.repositoryId);
      if (!repository) {
        return Result.fail<BranchCreatedDto>('Repository not found');
      }

      // Get current uncommitted changes from Git
      const changes = await this.gitService.getUncommittedChanges(repository.path);
      repository.updateChanges(changes);

      // Create branch in domain
      const branchResult = repository.createBranch({
        name: command.branchName,
        type: command.branchType
      });

      if (branchResult.isFailure) {
        return Result.fail<BranchCreatedDto>(branchResult.error!);
      }

      const branch = branchResult.value;

      // Execute Git operations
      await this.gitService.createBranch(repository.path, branch.name.value);
      await this.gitService.checkoutBranch(repository.path, branch.name.value);
      await this.gitService.stageAll(repository.path);
      const _commitHash = await this.gitService.commit(repository.path, command.commitMessage);

      // Update repository state to reflect Git operations
      // First, commit the changes in the domain model
      const commitResult = repository.commit({
        message: command.commitMessage,
        author: 'System', // Would come from config
        email: 'system@example.com' // Would come from config
      });

      if (commitResult.isFailure) {
        // This shouldn't happen as we've already validated
        throw new Error(commitResult.error);
      }

      // Now checkout the branch in the domain model (changes are already committed)
      const checkoutResult = repository.checkoutBranch(branch.name.value);
      if (checkoutResult.isFailure) {
        throw new Error(checkoutResult.error);
      }

      // Save the repository
      await this.repoRepository.save(repository);

      // Publish domain events
      const events = repository.getUncommittedEvents();
      await this.eventBus.publish(events);
      repository.markEventsAsCommitted();

      return Result.ok<BranchCreatedDto>({
        branchName: branch.name.value,
        createdAt: branch.createdAt,
        baseBranch: branch.baseBranch
      });
    } catch (error) {
      return Result.fail<BranchCreatedDto>(
        `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}