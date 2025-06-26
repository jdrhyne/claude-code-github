import { describe, it, expect, beforeEach } from 'vitest';
import { GitRepository } from '../repository.js';
import { BranchType } from '../types.js';
import { Changes } from '../value-objects/changes.js';

describe('GitRepository', () => {
  let repository: GitRepository;

  beforeEach(() => {
    const result = GitRepository.create({
      id: 'test-repo',
      path: '/path/to/repo',
      config: {
        mainBranch: 'main',
        protectedBranches: ['main', 'develop']
      }
    });
    
    expect(result.isSuccess).toBe(true);
    repository = result.value;
  });

  describe('create', () => {
    it('should create a valid repository', () => {
      expect(repository).toBeDefined();
      expect(repository.path).toBe('/path/to/repo');
      expect(repository.currentBranch).toBe('main');
      expect(repository.uncommittedChanges.isEmpty()).toBe(true);
    });

    it('should fail with invalid id', () => {
      const result = GitRepository.create({
        id: '',
        path: '/path/to/repo',
        config: {
          mainBranch: 'main',
          protectedBranches: []
        }
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Repository ID cannot be empty');
    });
  });

  describe('createBranch', () => {
    beforeEach(() => {
      // Add some uncommitted changes
      const changes = Changes.create([
        { path: 'file1.ts', status: 'modified' as any },
        { path: 'file2.ts', status: 'added' as any }
      ]);
      repository.updateChanges(changes);
      
      // Switch to a non-protected branch to allow branch creation
      repository['props'].currentBranch = 'feature/existing';
    });

    it('should create a feature branch successfully', () => {
      const result = repository.createBranch({
        name: 'user-auth',
        type: BranchType.FEATURE
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.name.value).toBe('feature/user-auth');
      expect(result.value.type).toBe(BranchType.FEATURE);
      expect(result.value.baseBranch).toBe('feature/existing');
    });

    it('should fail when on protected branch', () => {
      // Switch back to protected branch
      repository['props'].currentBranch = 'main';
      
      const result = repository.createBranch({
        name: 'test-branch',
        type: BranchType.FEATURE
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Cannot create branch on protected branch');
    });

    it('should fail when no uncommitted changes', () => {
      repository.updateChanges(Changes.empty());
      
      const result = repository.createBranch({
        name: 'another-branch',
        type: BranchType.FEATURE
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('No changes to commit');
    });

    it('should emit BranchCreated event', () => {
      const result = repository.createBranch({
        name: 'new-feature',
        type: BranchType.FEATURE
      });

      expect(result.isSuccess).toBe(true);
      
      const events = repository.getUncommittedEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const branchCreatedEvent = events.find(e => e.eventType === 'BranchCreated');
      expect(branchCreatedEvent).toBeDefined();
      expect(branchCreatedEvent?.payload.branchName).toBe('feature/new-feature');
    });
  });

  describe('commit', () => {
    it('should create commit with changes', () => {
      const changes = Changes.create([
        { path: 'file1.ts', status: 'modified' as any }
      ]);
      repository.updateChanges(changes);

      const result = repository.commit({
        message: 'feat: add user authentication',
        author: 'John Doe',
        email: 'john@example.com'
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.message.value).toBe('feat: add user authentication');
      expect(repository.uncommittedChanges.isEmpty()).toBe(true);
    });

    it('should fail with no changes', () => {
      const result = repository.commit({
        message: 'empty commit',
        author: 'John Doe',
        email: 'john@example.com'
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('No changes to commit');
    });

    it('should emit CommitCreated event', () => {
      const changes = Changes.create([
        { path: 'file1.ts', status: 'modified' as any }
      ]);
      repository.updateChanges(changes);

      repository.commit({
        message: 'test commit',
        author: 'John Doe',
        email: 'john@example.com'
      });

      const events = repository.getUncommittedEvents();
      const commitEvent = events.find(e => e.eventType === 'CommitCreated');
      expect(commitEvent).toBeDefined();
      expect(commitEvent?.payload.message).toBe('test commit');
    });
  });

  describe('checkoutBranch', () => {
    beforeEach(() => {
      // Create a branch to checkout
      const changes = Changes.create([
        { path: 'file1.ts', status: 'modified' as any }
      ]);
      repository.updateChanges(changes);
      
      // Switch to non-protected branch to create new branch
      repository['props'].currentBranch = 'feature/temp';
      
      const branchResult = repository.createBranch({
        name: 'test-branch',
        type: BranchType.FEATURE
      });
      
      expect(branchResult.isSuccess).toBe(true);
      
      // Clear changes to allow checkout
      repository.updateChanges(Changes.empty());
    });

    it('should checkout existing branch', () => {
      const result = repository.checkoutBranch('feature/test-branch');
      expect(result.isSuccess).toBe(true);
      expect(repository.currentBranch).toBe('feature/test-branch');
    });

    it('should fail with uncommitted changes', () => {
      const changes = Changes.create([
        { path: 'file1.ts', status: 'modified' as any }
      ]);
      repository.updateChanges(changes);

      const result = repository.checkoutBranch('feature/test-branch');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Cannot switch branches with uncommitted changes');
    });

    it('should fail for non-existent branch', () => {
      const result = repository.checkoutBranch('non-existent');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Branch does not exist');
    });
  });

  describe('isOnProtectedBranch', () => {
    it('should return true for protected branches', () => {
      expect(repository.isOnProtectedBranch()).toBe(true);
    });

    it('should return false for non-protected branches', () => {
      repository['props'].currentBranch = 'feature/test';
      expect(repository.isOnProtectedBranch()).toBe(false);
    });
  });
});