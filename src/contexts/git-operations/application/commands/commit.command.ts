import { Command } from '../../../../shared/infrastructure/command-bus.js';

/**
 * Command to create a commit
 */
export class CommitCommand implements Command {
  readonly _commandBrand?: undefined;

  constructor(
    public readonly repositoryId: string,
    public readonly message: string,
    public readonly author: string,
    public readonly email: string
  ) {}
}