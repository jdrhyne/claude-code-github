/**
 * Domain types for Git Operations context
 */

export enum BranchType {
  FEATURE = 'feature',
  BUGFIX = 'bugfix',
  HOTFIX = 'hotfix',
  REFACTOR = 'refactor',
  RELEASE = 'release',
  CHORE = 'chore'
}

export const BranchPrefixes: Record<BranchType, string> = {
  [BranchType.FEATURE]: 'feature/',
  [BranchType.BUGFIX]: 'bugfix/',
  [BranchType.HOTFIX]: 'hotfix/',
  [BranchType.REFACTOR]: 'refactor/',
  [BranchType.RELEASE]: 'release/',
  [BranchType.CHORE]: 'chore/'
};

export enum FileChangeStatus {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed',
  COPIED = 'copied',
  UNTRACKED = 'untracked'
}

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  additions?: number;
  deletions?: number;
  oldPath?: string; // For renamed files
}

export interface RepositoryConfig {
  mainBranch: string;
  protectedBranches: string[];
  remoteName?: string;
  remoteUrl?: string;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  message: string;
  timestamp: Date;
}

export interface RepositoryStatus {
  currentBranch: string;
  isClean: boolean;
  uncommittedChanges: FileChange[];
  lastCommit?: CommitInfo;
  ahead?: number;
  behind?: number;
}