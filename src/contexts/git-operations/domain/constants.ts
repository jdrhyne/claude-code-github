/**
 * Configuration constants for Git Operations domain
 */

/**
 * Git configuration constraints
 */
export const GitConstraints = {
  /**
   * Commit message constraints
   */
  CommitMessage: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 5000,
    CONVENTIONAL_PATTERN: /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?: .+/
  },

  /**
   * Branch name constraints
   */
  BranchName: {
    MAX_LENGTH: 255,
    VALID_CHARS_PATTERN: /^[a-zA-Z0-9\-_\/]+$/,
    INVALID_PATTERNS: {
      STARTS_WITH_SLASH: /^\//,
      ENDS_WITH_SLASH: /\/$/,
      CONSECUTIVE_SLASHES: /\/\//
    }
  },

  /**
   * Repository ID constraints
   */
  RepositoryId: {
    MAX_LENGTH: 255
  }
} as const;

/**
 * Default Git configuration
 */
export const GitDefaults = {
  /**
   * Default branch names
   */
  Branches: {
    MAIN: 'main',
    MASTER: 'master',
    DEVELOP: 'develop'
  },

  /**
   * Default remote configuration
   */
  Remote: {
    NAME: 'origin'
  },

  /**
   * Default author information
   */
  Author: {
    NAME: 'System',
    EMAIL: 'system@claude-code-github.dev'
  }
} as const;

/**
 * Git status mapping constants
 */
export const GitStatusMap = {
  MODIFIED: 'M',
  ADDED: 'A',
  DELETED: 'D',
  RENAMED: 'R',
  COPIED: 'C',
  UNTRACKED: '?',
  UNMERGED: 'U',
  IGNORED: '!'
} as const;

/**
 * Reverse mapping for Git status
 */
export const GitStatusReverseMap = Object.entries(GitStatusMap).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<string, string>
);

/**
 * Event aggregation settings
 */
export const EventAggregationSettings = {
  /**
   * Maximum number of events to keep in memory
   */
  MAX_EVENTS: 1000,

  /**
   * Event snapshot frequency
   */
  SNAPSHOT_FREQUENCY: 10,

  /**
   * Event retention period in days
   */
  RETENTION_DAYS: 30
} as const;

/**
 * Performance settings
 */
export const PerformanceSettings = {
  /**
   * Cache TTL in milliseconds
   */
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  /**
   * Maximum concurrent operations
   */
  MAX_CONCURRENT_OPS: 10,

  /**
   * Operation timeout in milliseconds
   */
  OPERATION_TIMEOUT: 30 * 1000 // 30 seconds
} as const;