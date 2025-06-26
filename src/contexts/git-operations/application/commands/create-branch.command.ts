import { BranchType } from '../../domain/types.js';

/**
 * Command to create a new branch
 */
export class CreateBranchCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly branchName: string,
    public readonly branchType: BranchType,
    public readonly commitMessage: string
  ) {}
}