import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBranchHandler } from '../create-branch.handler.js';
import { CreateBranchCommand } from '../../commands/create-branch.command.js';
import { GitRepositoryRepository } from '../../ports/repositories.js';
import { GitService } from '../../ports/git-service.js';
import { EventBus } from '../../../../../shared/events/event-bus.js';
import { GitRepository } from '../../../domain/repository.js';
import { Changes } from '../../../domain/value-objects/changes.js';
import { BranchType } from '../../../domain/types.js';

describe('CreateBranchHandler', () => {
  let handler: CreateBranchHandler;
  let mockRepoRepository: GitRepositoryRepository;
  let mockGitService: GitService;
  let mockEventBus: EventBus;
  let mockRepository: GitRepository;

  beforeEach(() => {
    // Create mocks
    mockRepoRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      findAll: vi.fn()
    };

    mockGitService = {
      createBranch: vi.fn(),
      checkoutBranch: vi.fn(),
      stageAll: vi.fn(),
      commit: vi.fn(),
      getCurrentBranch: vi.fn(),
      getUncommittedChanges: vi.fn(),
      getLastCommit: vi.fn(),
      listBranches: vi.fn(),
      push: vi.fn()
    };

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      subscribeToAll: vi.fn(),
      unsubscribe: vi.fn()
    };

    // Create mock repository
    const repoResult = GitRepository.create({
      id: 'test-repo',
      path: '/test/repo',
      config: {
        mainBranch: 'main',
        protectedBranches: ['main', 'develop']
      },
      currentBranch: 'feature/existing'
    });

    expect(repoResult.isSuccess).toBe(true);
    mockRepository = repoResult.value;

    // Add uncommitted changes
    const changes = Changes.create([
      { path: 'file1.ts', status: 'modified' as any },
      { path: 'file2.ts', status: 'added' as any }
    ]);
    mockRepository.updateChanges(changes);

    handler = new CreateBranchHandler(
      mockRepoRepository,
      mockGitService,
      mockEventBus
    );
  });

  describe('handle', () => {
    it('should create branch successfully', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: initial commit for new feature'
      );

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        mockRepository.uncommittedChanges
      );
      vi.mocked(mockGitService.createBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.checkoutBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.stageAll).mockResolvedValue(undefined);
      vi.mocked(mockGitService.commit).mockResolvedValue('abc123');
      vi.mocked(mockRepoRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockEventBus.publish).mockResolvedValue(undefined);

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.branchName).toBe('feature/new-feature');
      expect(result.value.baseBranch).toBe('feature/existing');

      // Verify calls
      expect(mockRepoRepository.findById).toHaveBeenCalledWith('test-repo');
      expect(mockGitService.createBranch).toHaveBeenCalledWith(
        '/test/repo',
        'feature/new-feature'
      );
      expect(mockGitService.stageAll).toHaveBeenCalledWith('/test/repo');
      expect(mockGitService.commit).toHaveBeenCalledWith(
        '/test/repo',
        'feat: initial commit for new feature'
      );
      expect(mockRepoRepository.save).toHaveBeenCalledWith(mockRepository);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when repository not found', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'non-existent',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(null);

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Repository not found');
    });

    it('should fail when on protected branch', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      // Set repository to protected branch
      mockRepository['props'].currentBranch = 'main';

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        mockRepository.uncommittedChanges
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Cannot create branch on protected branch');
    });

    it('should fail when no uncommitted changes', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      // Clear uncommitted changes
      mockRepository.updateChanges(Changes.empty());

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        Changes.empty()
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('No changes to commit');
    });

    it('should handle Git service failures', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        mockRepository.uncommittedChanges
      );
      vi.mocked(mockGitService.createBranch).mockRejectedValue(
        new Error('Git operation failed')
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to create branch: Git operation failed');
    });

    it('should update repository state correctly', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        mockRepository.uncommittedChanges
      );
      vi.mocked(mockGitService.createBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.checkoutBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.stageAll).mockResolvedValue(undefined);
      vi.mocked(mockGitService.commit).mockResolvedValue('abc123');
      vi.mocked(mockRepoRepository.save).mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      expect(mockRepository.currentBranch).toBe('feature/new-feature');
      expect(mockRepository.uncommittedChanges.isEmpty()).toBe(true);
      expect(mockRepository.branches.has('feature/new-feature')).toBe(true);
    });

    it('should emit domain events', async () => {
      // Arrange
      const command = new CreateBranchCommand(
        'test-repo',
        'new-feature',
        BranchType.FEATURE,
        'feat: test'
      );

      vi.mocked(mockRepoRepository.findById).mockResolvedValue(mockRepository);
      vi.mocked(mockGitService.getUncommittedChanges).mockResolvedValue(
        mockRepository.uncommittedChanges
      );
      vi.mocked(mockGitService.createBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.checkoutBranch).mockResolvedValue(undefined);
      vi.mocked(mockGitService.stageAll).mockResolvedValue(undefined);
      vi.mocked(mockGitService.commit).mockResolvedValue('abc123');
      vi.mocked(mockRepoRepository.save).mockResolvedValue(undefined);

      // Act
      await handler.handle(command);

      // Assert
      const publishCall = vi.mocked(mockEventBus.publish).mock.calls[0][0];
      
      const eventTypes = publishCall.map((e: any) => e.eventType);
      
      // We should have: ChangesUpdated (from updateChanges), BranchCreated, CommitCreated, ChangesUpdated (from commit), BranchCheckedOut
      expect(publishCall).toHaveLength(5);
      expect(eventTypes).toContain('BranchCreated');
      expect(eventTypes).toContain('BranchCheckedOut');
      expect(eventTypes).toContain('CommitCreated');
      expect(eventTypes).toContain('ChangesUpdated');
    });
  });
});