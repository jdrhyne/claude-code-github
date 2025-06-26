import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CommandBus } from '../../../shared/infrastructure/command-bus.js';
import { CreateBranchCommand } from '../application/commands/create-branch.command.js';
import { CommitCommand } from '../application/commands/commit.command.js';
import { GitRepositoryRepository } from '../application/ports/repositories.js';
import { BranchType } from '../domain/types.js';

/**
 * MCP Tool adapter for Git Operations context
 */
export class GitOperationsMcpAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly repoRepository: GitRepositoryRepository,
    private readonly getCurrentProjectPath: () => Promise<string>
  ) {}

  /**
   * Get MCP tools for Git operations
   */
  getTools(): Tool[] {
    return [
      {
        name: 'dev_status_v2',
        description: 'Get development status (DDD version)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: this.getStatus.bind(this)
      },
      {
        name: 'dev_create_branch_v2',
        description: 'Create a new branch with appropriate prefix (DDD version)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Branch name (without prefix)'
            },
            type: {
              type: 'string',
              enum: Object.values(BranchType),
              description: 'Type of branch'
            },
            message: {
              type: 'string',
              description: 'Commit message for initial commit'
            }
          },
          required: ['name', 'type', 'message']
        },
        handler: this.createBranch.bind(this)
      },
      {
        name: 'dev_checkpoint_v2',
        description: 'Create a commit with current changes (DDD version)',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Commit message'
            }
          },
          required: ['message']
        },
        handler: this.checkpoint.bind(this)
      }
    ];
  }

  /**
   * Get repository status
   */
  private async getStatus(): Promise<any> {
    try {
      const projectPath = await this.getCurrentProjectPath();
      const repository = await this.repoRepository.findById(projectPath);
      
      if (!repository) {
        throw new Error('No active project found');
      }

      const status = repository.getStatus();
      
      return {
        branch: status.currentBranch,
        is_protected: repository.isOnProtectedBranch(),
        uncommitted_changes: {
          file_count: status.uncommittedChanges.length,
          files_changed: status.uncommittedChanges.map(change => ({
            file: change.path,
            status: change.status
          }))
        },
        hints: [
          'Use dev_create_branch_v2 to create a new branch',
          'Use dev_checkpoint_v2 to commit changes'
        ]
      };
    } catch (_error) {
      throw new Error(`Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new branch
   */
  private async createBranch(params: any): Promise<any> {
    try {
      const projectPath = await this.getCurrentProjectPath();
      
      const command = new CreateBranchCommand(
        projectPath,
        params.name,
        params.type as BranchType,
        params.message
      );

      const result = await this.commandBus.execute<{ branchName: string; createdAt: Date }>(command);
      
      if (result.isFailure) {
        throw new Error(result.error);
      }

      return {
        branch: result.value.branchName,
        message: `✓ Created branch ${result.value.branchName}`
      };
    } catch (_error) {
      throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a checkpoint (commit)
   */
  private async checkpoint(params: any): Promise<any> {
    try {
      const projectPath = await this.getCurrentProjectPath();
      
      const command = new CommitCommand(
        projectPath,
        params.message,
        'System', // Would get from Git config
        'system@claude-code-github.dev' // Would get from Git config
      );

      const result = await this.commandBus.execute<{ hash: string; createdAt: Date }>(command);
      
      if (result.isFailure) {
        throw new Error(result.error);
      }

      return {
        message: `✓ Created checkpoint: ${params.message}`,
        commit_hash: result.value.hash
      };
    } catch (_error) {
      throw new Error(`Failed to create checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}