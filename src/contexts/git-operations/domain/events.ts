import { DomainEvent } from '../../../shared/events/domain-event.js';
import { BranchType } from './types.js';

/**
 * Strongly-typed domain events for Git Operations
 */

/**
 * Base interface for Git domain events
 */
interface GitDomainEvent extends DomainEvent {
  payload: {
    path: string;
    [key: string]: unknown;
  };
}

/**
 * Event emitted when a branch is created
 */
export interface BranchCreatedEvent extends GitDomainEvent {
  eventType: 'BranchCreated';
  payload: {
    path: string;
    branchName: string;
    branchType: BranchType;
    baseBranch: string;
    createdAt: Date;
  };
}

/**
 * Event emitted when a branch is checked out
 */
export interface BranchCheckedOutEvent extends GitDomainEvent {
  eventType: 'BranchCheckedOut';
  payload: {
    path: string;
    fromBranch: string;
    toBranch: string;
    timestamp: Date;
  };
}

/**
 * Event emitted when a commit is created
 */
export interface CommitCreatedEvent extends GitDomainEvent {
  eventType: 'CommitCreated';
  payload: {
    path: string;
    commitHash: string;
    branch: string;
    message: string;
    author: string;
    email: string;
    fileCount: number;
    additions: number;
    deletions: number;
    timestamp: Date;
  };
}

/**
 * Event emitted when repository changes are updated
 */
export interface ChangesUpdatedEvent extends GitDomainEvent {
  eventType: 'ChangesUpdated';
  payload: {
    path: string;
    fileCount: number;
    additions: number;
    deletions: number;
    modifiedFiles: string[];
    addedFiles: string[];
    deletedFiles: string[];
    timestamp: Date;
  };
}

/**
 * Union type of all Git domain events
 */
export type GitOperationEvent = 
  | BranchCreatedEvent
  | BranchCheckedOutEvent
  | CommitCreatedEvent
  | ChangesUpdatedEvent;

/**
 * Type guard for Git domain events
 */
export function isGitOperationEvent(event: DomainEvent): event is GitOperationEvent {
  return [
    'BranchCreated',
    'BranchCheckedOut', 
    'CommitCreated',
    'ChangesUpdated'
  ].includes(event.eventType);
}

/**
 * Factory functions for creating typed events
 */
export const GitEventFactory = {
  branchCreated(
    aggregateId: string,
    payload: Omit<BranchCreatedEvent['payload'], 'createdAt'>
  ): BranchCreatedEvent {
    return {
      aggregateId,
      eventType: 'BranchCreated',
      eventVersion: 1,
      occurredOn: new Date(),
      payload: {
        ...payload,
        createdAt: new Date()
      }
    };
  },

  branchCheckedOut(
    aggregateId: string,
    fromBranch: string,
    toBranch: string,
    path: string
  ): BranchCheckedOutEvent {
    return {
      aggregateId,
      eventType: 'BranchCheckedOut',
      eventVersion: 1,
      occurredOn: new Date(),
      payload: {
        path,
        fromBranch,
        toBranch,
        timestamp: new Date()
      }
    };
  },

  commitCreated(
    aggregateId: string,
    payload: Omit<CommitCreatedEvent['payload'], 'timestamp'>
  ): CommitCreatedEvent {
    return {
      aggregateId,
      eventType: 'CommitCreated',
      eventVersion: 1,
      occurredOn: new Date(),
      payload: {
        ...payload,
        timestamp: new Date()
      }
    };
  },

  changesUpdated(
    aggregateId: string,
    payload: Omit<ChangesUpdatedEvent['payload'], 'timestamp'>
  ): ChangesUpdatedEvent {
    return {
      aggregateId,
      eventType: 'ChangesUpdated',
      eventVersion: 1,
      occurredOn: new Date(),
      payload: {
        ...payload,
        timestamp: new Date()
      }
    };
  }
};