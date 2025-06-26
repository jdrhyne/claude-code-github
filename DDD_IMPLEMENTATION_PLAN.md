# DDD Implementation Plan for Claude-Code-GitHub

## Executive Summary

This document outlines the implementation plan for migrating from the current monolithic architecture to a Domain-Driven Design (DDD) based architecture with clear bounded contexts and well-defined APIs.

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### 1.1 Module Structure Setup
```bash
src/
├── contexts/              # New DDD contexts
│   ├── git-operations/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── api/
│   ├── github-integration/
│   ├── project-management/
│   ├── automation/
│   └── monitoring/
├── shared/               # Shared kernel
│   ├── domain/
│   ├── events/
│   └── types/
└── legacy/              # Current code (to be migrated)
```

#### 1.2 Shared Kernel Implementation
```typescript
// src/shared/domain/entity.ts
export abstract class Entity<T> {
    protected readonly _id: T;
    
    constructor(id: T) {
        this._id = id;
    }
    
    equals(entity: Entity<T>): boolean {
        if (!entity) return false;
        if (!(entity instanceof Entity)) return false;
        return this._id === entity._id;
    }
}

// src/shared/domain/aggregate-root.ts
export abstract class AggregateRoot<T> extends Entity<T> {
    private _domainEvents: DomainEvent[] = [];
    
    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }
    
    clearEvents(): void {
        this._domainEvents = [];
    }
    
    getUncommittedEvents(): DomainEvent[] {
        return this._domainEvents;
    }
}

// src/shared/domain/value-object.ts
export abstract class ValueObject<T> {
    protected readonly props: T;
    
    constructor(props: T) {
        this.props = Object.freeze(props);
    }
    
    equals(vo: ValueObject<T>): boolean {
        if (!vo) return false;
        return JSON.stringify(this.props) === JSON.stringify(vo.props);
    }
}

// src/shared/events/domain-event.ts
export interface DomainEvent {
    aggregateId: string;
    eventType: string;
    eventVersion: number;
    occurredOn: Date;
    payload: any;
}

// src/shared/events/event-bus.ts
export interface EventBus {
    publish(events: DomainEvent[]): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): void;
}
```

### Phase 2: Git Operations Context (Week 3-4)

#### 2.1 Domain Layer
```typescript
// src/contexts/git-operations/domain/repository.ts
export class GitRepositoryId extends ValueObject<string> {
    constructor(value: string) {
        super(value);
        this.validate();
    }
    
    private validate(): void {
        if (!this.props || this.props.length === 0) {
            throw new Error('Repository ID cannot be empty');
        }
    }
    
    toString(): string {
        return this.props;
    }
}

export class Branch extends Entity<string> {
    private constructor(
        name: string,
        private readonly type: BranchType,
        private readonly baseBranch: string,
        private readonly createdAt: Date
    ) {
        super(name);
    }
    
    static create(params: CreateBranchParams): Branch {
        const prefix = BranchPrefixes[params.type];
        const name = `${prefix}${params.name}`;
        
        return new Branch(
            name,
            params.type,
            params.baseBranch,
            new Date()
        );
    }
    
    getName(): string {
        return this._id;
    }
}

export class GitRepository extends AggregateRoot<GitRepositoryId> {
    private branches: Map<string, Branch> = new Map();
    
    private constructor(
        id: GitRepositoryId,
        private readonly path: string,
        private readonly config: RepositoryConfig,
        private currentBranch: string,
        private uncommittedChanges: Changes
    ) {
        super(id);
    }
    
    static create(params: CreateRepositoryParams): GitRepository {
        return new GitRepository(
            new GitRepositoryId(params.id),
            params.path,
            params.config,
            params.currentBranch,
            Changes.empty()
        );
    }
    
    createBranch(params: CreateBranchParams): Result<Branch> {
        // Domain validation
        if (this.isOnProtectedBranch()) {
            return Result.fail('Cannot create branch from protected branch');
        }
        
        if (this.uncommittedChanges.isEmpty()) {
            return Result.fail('No changes to commit');
        }
        
        const branch = Branch.create({
            ...params,
            baseBranch: this.currentBranch
        });
        
        this.branches.set(branch.getName(), branch);
        
        this.addDomainEvent({
            aggregateId: this._id.toString(),
            eventType: 'BranchCreated',
            eventVersion: 1,
            occurredOn: new Date(),
            payload: {
                branchName: branch.getName(),
                branchType: params.type,
                baseBranch: this.currentBranch
            }
        });
        
        return Result.ok(branch);
    }
    
    private isOnProtectedBranch(): boolean {
        return this.config.protectedBranches.includes(this.currentBranch);
    }
}
```

#### 2.2 Application Layer
```typescript
// src/contexts/git-operations/application/commands/create-branch.command.ts
export class CreateBranchCommand {
    constructor(
        public readonly repositoryId: string,
        public readonly branchName: string,
        public readonly branchType: BranchType,
        public readonly commitMessage: string
    ) {}
}

// src/contexts/git-operations/application/handlers/create-branch.handler.ts
export class CreateBranchHandler implements CommandHandler<CreateBranchCommand> {
    constructor(
        private readonly repoRepository: GitRepositoryRepository,
        private readonly gitService: GitService,
        private readonly eventBus: EventBus
    ) {}
    
    async handle(command: CreateBranchCommand): Promise<Result<BranchCreatedDto>> {
        // Load aggregate
        const repo = await this.repoRepository.findById(command.repositoryId);
        if (!repo) {
            return Result.fail('Repository not found');
        }
        
        // Execute domain logic
        const branchResult = repo.createBranch({
            name: command.branchName,
            type: command.branchType
        });
        
        if (branchResult.isFailure) {
            return Result.fail(branchResult.error);
        }
        
        // Execute side effects
        await this.gitService.createBranch(
            repo.getPath(),
            branchResult.value.getName()
        );
        
        await this.gitService.commit(
            repo.getPath(),
            command.commitMessage
        );
        
        // Save aggregate
        await this.repoRepository.save(repo);
        
        // Publish domain events
        await this.eventBus.publish(repo.getUncommittedEvents());
        repo.clearEvents();
        
        return Result.ok({
            branchName: branchResult.value.getName(),
            createdAt: new Date()
        });
    }
}
```

#### 2.3 Infrastructure Layer
```typescript
// src/contexts/git-operations/infrastructure/repositories/git-repository.repository.ts
export class GitRepositoryRepositoryImpl implements GitRepositoryRepository {
    constructor(
        private readonly configManager: ConfigManager,
        private readonly gitManager: GitManager
    ) {}
    
    async findById(id: string): Promise<GitRepository | null> {
        const config = await this.configManager.getProjectByPath(id);
        if (!config) return null;
        
        const status = await this.gitManager.status(config.path);
        
        return GitRepository.create({
            id: id,
            path: config.path,
            config: {
                mainBranch: config.main_branch,
                protectedBranches: config.protected_branches
            },
            currentBranch: status.current,
            uncommittedChanges: this.mapChanges(status)
        });
    }
    
    async save(repository: GitRepository): Promise<void> {
        // In this case, state is managed by Git itself
        // We might persist additional metadata here
    }
}

// src/contexts/git-operations/infrastructure/services/git.service.ts
export class GitServiceImpl implements GitService {
    constructor(private readonly gitManager: GitManager) {}
    
    async createBranch(repoPath: string, branchName: string): Promise<void> {
        await this.gitManager.checkoutBranch(repoPath, branchName, true);
    }
    
    async commit(repoPath: string, message: string): Promise<void> {
        await this.gitManager.add(repoPath, '.');
        await this.gitManager.commit(repoPath, message);
    }
}
```

### Phase 3: API Layer Implementation (Week 5)

#### 3.1 Express Router Setup
```typescript
// src/contexts/git-operations/api/routes.ts
export function createGitOperationsRouter(
    handlers: GitOperationsHandlers
): Router {
    const router = Router();
    
    // Repository endpoints
    router.get('/repositories', 
        asyncHandler(handlers.listRepositories)
    );
    
    router.get('/repositories/:repoId/status',
        validateParams(GetRepositoryStatusSchema),
        asyncHandler(handlers.getRepositoryStatus)
    );
    
    // Branch operations
    router.post('/repositories/:repoId/branches',
        validateBody(CreateBranchSchema),
        asyncHandler(handlers.createBranch)
    );
    
    // Commit operations
    router.post('/repositories/:repoId/commits',
        validateBody(CreateCommitSchema),
        asyncHandler(handlers.createCommit)
    );
    
    return router;
}

// src/contexts/git-operations/api/handlers.ts
export class GitOperationsHandlers {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus
    ) {}
    
    async createBranch(req: Request, res: Response): Promise<void> {
        const command = new CreateBranchCommand(
            req.params.repoId,
            req.body.name,
            req.body.type,
            req.body.commitMessage
        );
        
        const result = await this.commandBus.execute(command);
        
        if (result.isFailure) {
            throw new ApiError(result.error, 400);
        }
        
        res.status(201)
           .location(`/api/v2/git/repositories/${req.params.repoId}/branches/${result.value.branchName}`)
           .json({
               name: result.value.branchName,
               createdAt: result.value.createdAt
           });
    }
}
```

#### 3.2 MCP Tool Adapter
```typescript
// src/contexts/git-operations/api/mcp-adapter.ts
export class GitOperationsMcpAdapter {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus
    ) {}
    
    getTools(): Tool[] {
        return [
            {
                name: 'dev_create_branch',
                description: 'Create a new branch with appropriate prefix',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        type: { 
                            type: 'string',
                            enum: ['feature', 'bugfix', 'refactor']
                        },
                        message: { type: 'string' }
                    },
                    required: ['name', 'type', 'message']
                },
                handler: this.createBranch.bind(this)
            }
        ];
    }
    
    private async createBranch(params: any): Promise<any> {
        // Get current project context
        const projectId = await this.getCurrentProjectId();
        
        const command = new CreateBranchCommand(
            projectId,
            params.name,
            params.type,
            params.message
        );
        
        const result = await this.commandBus.execute(command);
        
        if (result.isFailure) {
            throw new Error(result.error);
        }
        
        return {
            branch: result.value.branchName,
            message: `Created branch ${result.value.branchName}`
        };
    }
}
```

### Phase 4: State Management Migration (Week 6)

#### 4.1 Event Store Implementation
```typescript
// src/shared/infrastructure/event-store.ts
export class InMemoryEventStore implements EventStore {
    private events: DomainEvent[] = [];
    private snapshots: Map<string, AggregateSnapshot> = new Map();
    
    async saveEvents(events: DomainEvent[]): Promise<void> {
        this.events.push(...events);
    }
    
    async getEvents(
        aggregateId: string,
        fromVersion?: number
    ): Promise<DomainEvent[]> {
        return this.events.filter(e => 
            e.aggregateId === aggregateId &&
            (!fromVersion || e.eventVersion > fromVersion)
        );
    }
    
    async saveSnapshot(snapshot: AggregateSnapshot): Promise<void> {
        this.snapshots.set(snapshot.aggregateId, snapshot);
    }
    
    async getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null> {
        return this.snapshots.get(aggregateId) || null;
    }
}

// src/contexts/project-management/infrastructure/project-state-store.ts
export class EventSourcedProjectStateStore implements ProjectStateStore {
    constructor(
        private readonly eventStore: EventStore,
        private readonly eventBus: EventBus
    ) {}
    
    async save(project: Project): Promise<void> {
        const events = project.getUncommittedEvents();
        await this.eventStore.saveEvents(events);
        await this.eventBus.publish(events);
        project.clearEvents();
        
        // Save snapshot every 10 events
        const allEvents = await this.eventStore.getEvents(project.getId());
        if (allEvents.length % 10 === 0) {
            await this.eventStore.saveSnapshot({
                aggregateId: project.getId(),
                version: allEvents.length,
                data: project.toSnapshot()
            });
        }
    }
    
    async findById(id: string): Promise<Project | null> {
        // Try to load from snapshot
        const snapshot = await this.eventStore.getSnapshot(id);
        let project: Project;
        
        if (snapshot) {
            project = Project.fromSnapshot(snapshot.data);
            
            // Apply events after snapshot
            const events = await this.eventStore.getEvents(id, snapshot.version);
            events.forEach(event => project.apply(event));
        } else {
            // Rebuild from events
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) return null;
            
            project = Project.create({ id });
            events.forEach(event => project.apply(event));
        }
        
        return project;
    }
}
```

### Phase 5: Integration & Migration (Week 7-8)

#### 5.1 Parallel Run Strategy
```typescript
// src/migration/parallel-adapter.ts
export class ParallelRunAdapter {
    constructor(
        private readonly legacyTools: DevelopmentTools,
        private readonly newContexts: ContextRegistry
    ) {}
    
    async createBranch(params: any): Promise<any> {
        // Run both implementations
        const [legacyResult, newResult] = await Promise.all([
            this.runLegacy(() => this.legacyTools.createBranch(params)),
            this.runNew(() => this.newContexts.gitOperations.createBranch(params))
        ]);
        
        // Compare results
        if (!this.resultsMatch(legacyResult, newResult)) {
            await this.logDiscrepancy('createBranch', params, legacyResult, newResult);
        }
        
        // Return legacy result during migration
        return legacyResult;
    }
    
    private async runLegacy<T>(fn: () => Promise<T>): Promise<T | Error> {
        try {
            return await fn();
        } catch (error) {
            return error as Error;
        }
    }
    
    private async runNew<T>(fn: () => Promise<T>): Promise<T | Error> {
        try {
            return await fn();
        } catch (error) {
            return error as Error;
        }
    }
}
```

#### 5.2 Feature Flag Management
```typescript
// src/migration/feature-flags.ts
export class FeatureFlags {
    private flags: Map<string, boolean> = new Map([
        ['use_new_git_operations', false],
        ['use_new_github_integration', false],
        ['use_new_project_management', false],
        ['use_new_automation', false],
        ['use_new_monitoring', false]
    ]);
    
    isEnabled(flag: string): boolean {
        return this.flags.get(flag) || false;
    }
    
    enable(flag: string): void {
        this.flags.set(flag, true);
    }
    
    disable(flag: string): void {
        this.flags.set(flag, false);
    }
}

// Usage in MCP server
export class MigrationMcpServer extends EnhancedMcpServer {
    constructor(
        private readonly featureFlags: FeatureFlags,
        private readonly legacyTools: DevelopmentTools,
        private readonly newContexts: ContextRegistry
    ) {
        super();
    }
    
    protected registerTools(): void {
        if (this.featureFlags.isEnabled('use_new_git_operations')) {
            this.registerContextTools(this.newContexts.gitOperations);
        } else {
            this.registerLegacyTools(this.legacyTools);
        }
    }
}
```

### Phase 6: Cleanup & Optimization (Week 9-10)

#### 6.1 Remove Legacy Code
- Delete `src/development-tools.ts` after all contexts migrated
- Remove parallel run adapters
- Clean up feature flags

#### 6.2 Performance Optimization
- Implement caching for frequently accessed aggregates
- Add database persistence for event store
- Optimize event replay with snapshots

#### 6.3 Documentation
- Update API documentation
- Create architecture decision records (ADRs)
- Write migration guide for extensions

## Success Metrics

1. **Code Quality**
   - Reduce average file size from 900+ to <300 lines
   - Achieve 90%+ test coverage per context
   - Zero `any` types in domain layer

2. **Performance**
   - API response time <100ms for 95th percentile
   - Event processing latency <50ms
   - Memory usage reduction of 20%

3. **Developer Experience**
   - Onboarding time reduced by 50%
   - Feature development time reduced by 30%
   - Bug fix time reduced by 40%

## Risk Mitigation

1. **Data Loss Prevention**
   - Implement comprehensive logging
   - Create rollback procedures
   - Regular backups during migration

2. **Compatibility**
   - Maintain backward compatibility
   - Version APIs properly
   - Gradual rollout with feature flags

3. **Testing Strategy**
   - Unit tests for all domain logic
   - Integration tests for each context
   - End-to-end tests for critical paths
   - Performance regression tests

## Timeline Summary

- **Weeks 1-2**: Foundation and shared kernel
- **Weeks 3-4**: Git operations context
- **Week 5**: API implementation
- **Week 6**: State management
- **Weeks 7-8**: Integration and migration
- **Weeks 9-10**: Cleanup and optimization

Total estimated time: 10 weeks with 2 developers

---

*This plan ensures a smooth transition from the current architecture to a clean DDD implementation while maintaining system stability throughout the migration.*