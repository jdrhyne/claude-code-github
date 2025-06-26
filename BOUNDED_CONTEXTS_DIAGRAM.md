# Bounded Contexts Architecture Diagram

## Context Map Overview

```mermaid
graph TB
    subgraph "Core Domain"
        PM[Project Management<br/>Context]
        AUTO[Automation<br/>Context]
    end

    subgraph "Supporting Domain"
        GIT[Git Operations<br/>Context]
        GH[GitHub Integration<br/>Context]
    end

    subgraph "Generic Subdomain"
        MON[Monitoring<br/>Context]
        AUTH[Authentication<br/>Context]
    end

    subgraph "External Systems"
        CLAUDE[Claude Code<br/>MCP Client]
        GHAPI[GitHub API]
        GITCLI[Git CLI]
        WEB[Web Clients]
    end

    %% Relationships
    CLAUDE -->|MCP Protocol| PM
    CLAUDE -->|MCP Protocol| GIT
    CLAUDE -->|MCP Protocol| GH
    CLAUDE -->|MCP Protocol| AUTO

    GIT -->|Events| PM
    GH -->|Events| PM
    PM -->|Commands| AUTO
    MON -->|Insights| AUTO
    
    GIT -->|Commands| GITCLI
    GH -->|API Calls| GHAPI
    
    WEB -->|REST/WebSocket| PM
    WEB -->|REST/WebSocket| MON

    AUTH -.->|Validates| PM
    AUTH -.->|Validates| GIT
    AUTH -.->|Validates| GH
    AUTH -.->|Validates| AUTO
    AUTH -.->|Validates| MON
```

## Detailed Context Boundaries

### 1. Git Operations Context

```mermaid
classDiagram
    class GitRepository {
        -id: RepositoryId
        -path: string
        -config: RepositoryConfig
        -currentBranch: string
        -uncommittedChanges: Changes
        +createBranch(params): Result~Branch~
        +commitChanges(message): Result~Commit~
        +getStatus(): RepositoryStatus
    }

    class Branch {
        -name: string
        -type: BranchType
        -baseBranch: string
        -createdAt: Date
        +getName(): string
        +getType(): BranchType
    }

    class Commit {
        -hash: string
        -message: CommitMessage
        -author: Author
        -timestamp: Date
        +getShortHash(): string
    }

    class Changes {
        -files: FileChange[]
        +isEmpty(): boolean
        +getFileCount(): number
        +getDiff(): string
    }

    class FileChange {
        -path: string
        -status: ChangeStatus
        -additions: number
        -deletions: number
    }

    GitRepository "1" *-- "0..*" Branch
    GitRepository "1" *-- "1" Changes
    Changes "1" *-- "0..*" FileChange
    GitRepository ..> Commit : creates
```

### 2. GitHub Integration Context

```mermaid
classDiagram
    class GitHubProject {
        -owner: string
        -repo: string
        -token: GitHubToken
        +createPullRequest(params): PullRequest
        +listIssues(filters): Issue[]
        +createRelease(params): Release
    }

    class PullRequest {
        -id: string
        -number: number
        -title: string
        -body: string
        -state: PRState
        -author: User
        -reviewers: Reviewer[]
        +assignReviewers(reviewers): void
        +markReady(): void
        +close(): void
    }

    class Issue {
        -number: number
        -title: string
        -state: IssueState
        -labels: Label[]
        +createBranch(): string
        +close(comment): void
    }

    class Release {
        -tagName: string
        -name: string
        -body: string
        -isDraft: boolean
        -isPrerelease: boolean
        +publish(): void
    }

    GitHubProject "1" *-- "0..*" PullRequest
    GitHubProject "1" *-- "0..*" Issue
    GitHubProject "1" *-- "0..*" Release
    PullRequest "1" *-- "0..*" Reviewer
```

### 3. Project Management Context

```mermaid
classDiagram
    class Project {
        -id: ProjectId
        -config: ProjectConfiguration
        -state: ProjectState
        +updateState(changes): void
        +getStatus(): ProjectStatus
        +configure(settings): void
    }

    class ProjectState {
        -data: Map~string, any~
        +apply(change: StateChange): void
        +getCurrentBranch(): string
        +getUncommittedChanges(): FileChange[]
        +getAutomationMode(): AutomationMode
    }

    class ProjectConfiguration {
        -gitConfig: GitConfig
        -githubConfig: GitHubConfig
        -automationConfig: AutomationConfig
        +validate(): Result~void~
    }

    class ProjectStatus {
        -branch: string
        -isProtected: boolean
        -changes: UncommittedChanges
        -lastActivity: Date
        +toJSON(): object
    }

    Project "1" *-- "1" ProjectState
    Project "1" *-- "1" ProjectConfiguration
    Project ..> ProjectStatus : generates
```

### 4. Automation Context

```mermaid
classDiagram
    class AutomationEngine {
        -projectId: ProjectId
        -config: AutomationConfig
        -llmAgent: LLMAgent
        +makeDecision(context): Decision
        +executeSuggestion(suggestion): Result
        +recordFeedback(feedback): void
    }

    class Decision {
        -id: DecisionId
        -action: Action
        -confidence: number
        -reasoning: string
        -risk: RiskAssessment
        +requiresApproval(): boolean
        +execute(): Promise~Result~
    }

    class Suggestion {
        -id: string
        -type: SuggestionType
        -priority: Priority
        -context: SuggestionContext
        +accept(): void
        +reject(reason): void
    }

    class LLMAgent {
        -provider: LLMProvider
        -promptBuilder: PromptBuilder
        +evaluate(context): Decision
        +learn(feedback): void
    }

    AutomationEngine "1" *-- "1" LLMAgent
    AutomationEngine ..> Decision : creates
    AutomationEngine "1" *-- "0..*" Suggestion
```

### 5. Monitoring Context

```mermaid
classDiagram
    class MonitoringSystem {
        -events: EventStore
        -patterns: PatternMatcher
        +addEvent(event): void
        +generateInsights(range): Insights
        +detectAnomalies(): Anomaly[]
    }

    class MonitoringEvent {
        -id: string
        -timestamp: Date
        -type: EventType
        -source: string
        -data: object
        +matches(pattern): boolean
    }

    class Milestone {
        -type: MilestoneType
        -achievedAt: Date
        -metrics: Metrics
        +getDescription(): string
    }

    class Pattern {
        -name: string
        -conditions: Condition[]
        -actions: Action[]
        +evaluate(events): boolean
    }

    MonitoringSystem "1" *-- "0..*" MonitoringEvent
    MonitoringSystem ..> Milestone : detects
    MonitoringSystem "1" *-- "0..*" Pattern
```

## Integration Points

### API Gateway Pattern

```mermaid
graph LR
    subgraph "API Gateway"
        REST[REST API]
        GQL[GraphQL API]
        WS[WebSocket]
        MCP[MCP Server]
    end

    subgraph "Bounded Contexts"
        GIT_API[Git API]
        GH_API[GitHub API]
        PM_API[Project API]
        AUTO_API[Automation API]
        MON_API[Monitoring API]
    end

    REST --> GIT_API
    REST --> GH_API
    REST --> PM_API
    REST --> AUTO_API
    REST --> MON_API

    GQL --> GIT_API
    GQL --> GH_API
    GQL --> PM_API

    WS --> MON_API
    WS --> AUTO_API

    MCP --> GIT_API
    MCP --> GH_API
    MCP --> PM_API
    MCP --> AUTO_API
```

### Event Flow

```mermaid
sequenceDiagram
    participant User
    participant MCP as MCP Server
    participant Git as Git Context
    participant PM as Project Context
    participant Auto as Automation Context
    participant Mon as Monitoring Context

    User->>MCP: Create branch request
    MCP->>Git: CreateBranchCommand
    Git->>Git: Validate & Execute
    Git-->>PM: BranchCreatedEvent
    Git-->>Mon: BranchCreatedEvent
    PM->>PM: Update project state
    Mon->>Mon: Record event
    Mon-->>Auto: Pattern detected
    Auto->>Auto: Evaluate next action
    Auto-->>MCP: Suggestion
    MCP-->>User: Branch created + suggestion
```

## Anti-Corruption Layers

```mermaid
graph TB
    subgraph "External Systems ACL"
        GitACL[Git CLI ACL]
        GHACL[GitHub API ACL]
        LLMACL[LLM Provider ACL]
    end

    subgraph "Domain Models"
        GitDomain[Git Domain Models]
        GHDomain[GitHub Domain Models]
        AutoDomain[Automation Domain Models]
    end

    subgraph "External APIs"
        GitCLI[Git CLI]
        GHAPI[GitHub REST API]
        Claude[Claude API]
        OpenAI[OpenAI API]
    end

    GitCLI --> GitACL
    GitACL --> GitDomain

    GHAPI --> GHACL
    GHACL --> GHDomain

    Claude --> LLMACL
    OpenAI --> LLMACL
    LLMACL --> AutoDomain
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Commands"
        CMD1[Create Branch]
        CMD2[Create PR]
        CMD3[Make Decision]
    end

    subgraph "Command Bus"
        CBUS[Command Bus]
    end

    subgraph "Handlers"
        H1[Branch Handler]
        H2[PR Handler]
        H3[Decision Handler]
    end

    subgraph "Events"
        E1[Branch Created]
        E2[PR Created]
        E3[Decision Made]
    end

    subgraph "Event Bus"
        EBUS[Event Bus]
    end

    subgraph "Projections"
        P1[Status View]
        P2[Activity Feed]
        P3[Metrics]
    end

    CMD1 --> CBUS
    CMD2 --> CBUS
    CMD3 --> CBUS

    CBUS --> H1
    CBUS --> H2
    CBUS --> H3

    H1 --> E1
    H2 --> E2
    H3 --> E3

    E1 --> EBUS
    E2 --> EBUS
    E3 --> EBUS

    EBUS --> P1
    EBUS --> P2
    EBUS --> P3
```

---

*This architecture ensures clear boundaries between contexts while maintaining loose coupling through events and well-defined interfaces.*