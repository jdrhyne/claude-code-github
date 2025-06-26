import { Entity } from '../../../../shared/domain/entity.js';
import { Result } from '../../../../shared/domain/result.js';
import { BranchName } from '../value-objects/branch-name.js';
import { BranchType } from '../types.js';

export interface BranchProps {
  name: BranchName;
  type: BranchType;
  baseBranch: string;
  createdAt: Date;
  isProtected: boolean;
}

/**
 * Branch entity representing a Git branch
 */
export class Branch extends Entity<string> {
  private props: BranchProps;

  private constructor(id: string, props: BranchProps) {
    super(id);
    this.props = props;
  }

  get name(): BranchName {
    return this.props.name;
  }

  get type(): BranchType {
    return this.props.type;
  }

  get baseBranch(): string {
    return this.props.baseBranch;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isProtected(): boolean {
    return this.props.isProtected;
  }

  /**
   * Mark branch as protected
   */
  markAsProtected(): void {
    this.props.isProtected = true;
  }

  /**
   * Create a new branch
   */
  static create(params: {
    name: string;
    type: BranchType;
    baseBranch: string;
    prefix?: string;
  }): Result<Branch> {
    const fullName = params.prefix ? `${params.prefix}${params.name}` : params.name;
    
    const branchNameResult = BranchName.create(fullName);
    if (branchNameResult.isFailure) {
      return Result.fail<Branch>(branchNameResult.error!);
    }

    const branch = new Branch(fullName, {
      name: branchNameResult.value,
      type: params.type,
      baseBranch: params.baseBranch,
      createdAt: new Date(),
      isProtected: false
    });

    return Result.ok<Branch>(branch);
  }

  /**
   * Reconstruct a branch from persistence
   */
  static fromPersistence(data: {
    name: string;
    type: BranchType;
    baseBranch: string;
    createdAt: Date;
    isProtected: boolean;
  }): Result<Branch> {
    const branchNameResult = BranchName.create(data.name);
    if (branchNameResult.isFailure) {
      return Result.fail<Branch>(branchNameResult.error!);
    }

    const branch = new Branch(data.name, {
      name: branchNameResult.value,
      type: data.type,
      baseBranch: data.baseBranch,
      createdAt: data.createdAt,
      isProtected: data.isProtected
    });

    return Result.ok<Branch>(branch);
  }
}