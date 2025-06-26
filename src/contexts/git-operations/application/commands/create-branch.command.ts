import { BranchType } from '../../domain/types.js';
import { Command } from '../../../../shared/infrastructure/command-bus.js';

/**
 * Command to create a new branch
 */
export class CreateBranchCommand implements Command {
  readonly _commandBrand?: undefined;

  constructor(
    public readonly repositoryId: string,
    public readonly branchName: string,
    public readonly branchType: BranchType,
    public readonly commitMessage: string
  ) {}
}