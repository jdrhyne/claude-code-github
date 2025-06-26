/**
 * Command to create a commit
 */
export class CommitCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly message: string,
    public readonly author: string,
    public readonly email: string
  ) {}
}