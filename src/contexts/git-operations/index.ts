import { ConfigManager } from '../../config.js';
import { GitManager } from '../../git.js';
import { InMemoryCommandBus } from '../../shared/infrastructure/command-bus.js';
import { InMemoryEventBus } from '../../shared/infrastructure/in-memory-event-bus.js';
import { GitRepositoryRepositoryImpl } from './infrastructure/git-repository.repository.js';
import { GitServiceImpl } from './infrastructure/git-service.impl.js';
import { CreateBranchHandler } from './application/handlers/create-branch.handler.js';
import { CreateBranchCommand } from './application/commands/create-branch.command.js';
import { GitOperationsHandlers } from './api/handlers.js';
import { GitOperationsMcpAdapter } from './api/mcp-adapter.js';
import { createGitOperationsRouter } from './api/routes.js';

/**
 * Git Operations context configuration
 */
export interface GitOperationsConfig {
  configManager: ConfigManager;
  gitManager: GitManager;
  getCurrentProjectPath: () => Promise<string>;
}

/**
 * Git Operations context - provides all components for the bounded context
 */
export class GitOperationsContext {
  // Infrastructure
  private readonly eventBus: InMemoryEventBus;
  private readonly commandBus: InMemoryCommandBus;
  
  // Domain repositories
  private readonly gitRepository: GitRepositoryRepositoryImpl;
  
  // Domain services
  private readonly gitService: GitServiceImpl;
  
  // Application handlers
  private readonly createBranchHandler: CreateBranchHandler;
  
  // API
  public readonly apiHandlers: GitOperationsHandlers;
  public readonly mcpAdapter: GitOperationsMcpAdapter;
  public readonly apiRouter: any;

  constructor(config: GitOperationsConfig) {
    // Initialize infrastructure
    this.eventBus = new InMemoryEventBus();
    this.commandBus = new InMemoryCommandBus();
    
    // Initialize domain services
    this.gitService = new GitServiceImpl(config.gitManager);
    
    // Initialize repositories
    this.gitRepository = new GitRepositoryRepositoryImpl(
      config.configManager,
      config.gitManager
    );
    
    // Initialize application handlers
    this.createBranchHandler = new CreateBranchHandler(
      this.gitRepository,
      this.gitService,
      this.eventBus
    );
    
    // Register command handlers
    this.commandBus.register(
      CreateBranchCommand,
      this.createBranchHandler
    );
    
    // Initialize API layer
    this.apiHandlers = new GitOperationsHandlers(
      this.commandBus,
      this.gitRepository
    );
    
    this.mcpAdapter = new GitOperationsMcpAdapter(
      this.commandBus,
      this.gitRepository,
      config.getCurrentProjectPath
    );
    
    this.apiRouter = createGitOperationsRouter(this.apiHandlers);
    
    // Subscribe to domain events (for logging/monitoring)
    this.subscribeToEvents();
  }

  /**
   * Get MCP tools for this context
   */
  getMcpTools() {
    return this.mcpAdapter.getTools();
  }

  /**
   * Subscribe to domain events
   */
  private subscribeToEvents(): void {
    this.eventBus.subscribe('BranchCreated', async (event) => {
      console.log(`[GitOps] Branch created: ${event.payload.branchName}`);
    });
    
    this.eventBus.subscribe('CommitCreated', async (event) => {
      console.log(`[GitOps] Commit created: ${event.payload.commitHash}`);
    });
    
    this.eventBus.subscribe('ChangesUpdated', async (event) => {
      console.log(`[GitOps] Changes updated: ${event.payload.fileCount} files`);
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.eventBus.clear();
    this.commandBus.clear();
  }
}