import { Query } from '../../../../shared/infrastructure/query-bus.js';
import { RepositoryStatus, CommitInfo } from '../../domain/types.js';

/**
 * Query to get repository status
 */
export class GetRepositoryStatusQuery implements Query {
  readonly _queryBrand?: undefined;

  constructor(
    public readonly repositoryId: string,
    public readonly includeOptions?: {
      branches?: boolean;
      lastCommit?: boolean;
      remoteStatus?: boolean;
      stash?: boolean;
    }
  ) {}
}

/**
 * Extended repository status result
 */
export interface RepositoryStatusResult extends RepositoryStatus {
  repositoryId: string;
  path: string;
  branches?: string[];
  lastCommit?: CommitInfo;
  remoteStatus?: {
    ahead: number;
    behind: number;
    upToDate: boolean;
  };
  stashCount?: number;
}