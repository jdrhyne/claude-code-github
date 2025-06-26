import { GitRepository } from '../../domain/repository.js';

/**
 * Repository interface for Git repositories
 */
export interface GitRepositoryRepository {
  /**
   * Find a repository by ID
   */
  findById(id: string): Promise<GitRepository | null>;

  /**
   * Save repository state
   */
  save(repository: GitRepository): Promise<void>;

  /**
   * List all repositories
   */
  findAll(): Promise<GitRepository[]>;
}