import { Changes } from '../../domain/value-objects/changes.js';
import { FileChange, FileChangeStatus } from '../../domain/types.js';
import { BranchType } from '../../domain/types.js';

/**
 * Git status data from Git CLI
 */
export interface GitStatusData {
  current: string;
  tracking?: string;
  ahead?: number;
  behind?: number;
  modified?: string[];
  created?: string[];
  deleted?: string[];
  renamed?: Array<{ from: string; to: string }>;
  not_added?: string[];
  conflicted?: string[];
  staged?: string[];
}

/**
 * Interface for mapping Git status to domain models
 */
export interface GitStatusMapper {
  /**
   * Map Git status to Changes value object
   */
  mapToChanges(status: GitStatusData): Changes;

  /**
   * Map Git status character to FileChangeStatus
   */
  mapStatusChar(statusChar: string): FileChangeStatus;

  /**
   * Determine branch type from branch name
   */
  determineBranchType(branchName: string): BranchType;
}

/**
 * Default implementation of GitStatusMapper
 */
export class DefaultGitStatusMapper implements GitStatusMapper {
  private readonly statusCharMap: Record<string, FileChangeStatus> = {
    'M': FileChangeStatus.MODIFIED,
    'A': FileChangeStatus.ADDED,
    'D': FileChangeStatus.DELETED,
    'R': FileChangeStatus.RENAMED,
    'C': FileChangeStatus.COPIED,
    '?': FileChangeStatus.UNTRACKED,
    'U': FileChangeStatus.MODIFIED // Treat unmerged as modified
  };

  private readonly branchPrefixMap: Array<{ prefix: string; type: BranchType }> = [
    { prefix: 'feature/', type: BranchType.FEATURE },
    { prefix: 'bugfix/', type: BranchType.BUGFIX },
    { prefix: 'hotfix/', type: BranchType.HOTFIX },
    { prefix: 'refactor/', type: BranchType.REFACTOR },
    { prefix: 'release/', type: BranchType.RELEASE },
    { prefix: 'chore/', type: BranchType.CHORE }
  ];

  mapToChanges(status: GitStatusData): Changes {
    const files: FileChange[] = [];

    // Map modified files
    if (status.modified) {
      status.modified.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.MODIFIED
        });
      });
    }

    // Map created/added files
    if (status.created) {
      status.created.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.ADDED
        });
      });
    }

    // Map deleted files
    if (status.deleted) {
      status.deleted.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.DELETED
        });
      });
    }

    // Map renamed files
    if (status.renamed) {
      status.renamed.forEach(({ from, to }) => {
        files.push({
          path: to,
          status: FileChangeStatus.RENAMED,
          oldPath: from
        });
      });
    }

    // Map untracked files
    if (status.not_added) {
      status.not_added.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.UNTRACKED
        });
      });
    }

    // Map conflicted files as modified
    if (status.conflicted) {
      status.conflicted.forEach(file => {
        // Check if already added to avoid duplicates
        if (!files.some(f => f.path === file)) {
          files.push({
            path: file,
            status: FileChangeStatus.MODIFIED
          });
        }
      });
    }

    return Changes.create(files);
  }

  mapStatusChar(statusChar: string): FileChangeStatus {
    return this.statusCharMap[statusChar] || FileChangeStatus.MODIFIED;
  }

  determineBranchType(branchName: string): BranchType {
    // Check each prefix mapping
    for (const { prefix, type } of this.branchPrefixMap) {
      if (branchName.startsWith(prefix)) {
        return type;
      }
    }

    // Default to feature if no prefix matches
    return BranchType.FEATURE;
  }

  /**
   * Extract branch name without prefix
   */
  extractBranchName(fullBranchName: string): string {
    for (const { prefix } of this.branchPrefixMap) {
      if (fullBranchName.startsWith(prefix)) {
        return fullBranchName.substring(prefix.length);
      }
    }
    return fullBranchName;
  }
}