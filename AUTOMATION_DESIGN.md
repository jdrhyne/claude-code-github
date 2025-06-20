# Automation Configuration Design for claude-code-github

## Overview

This design extends the claude-code-github server to support autonomous operation through configurable automation rules, policies, and safety mechanisms. The system builds upon the existing monitoring and suggestion engine architecture to enable automatic execution of common development workflows while maintaining safety and control.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Automation System                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Rule Engine  │  │Policy Engine │  │ Approval System   │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘    │
│         │                  │                    │               │
│  ┌──────▼──────────────────▼────────────────────▼──────────┐   │
│  │              Automation Orchestrator                     │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼──────────────────────────────────┐   │
│  │         Existing Infrastructure (Enhanced)               │   │
│  ├─────────────────┬──────────────┬────────────────────────┤   │
│  │ Monitoring      │ Suggestion   │ Development Tools      │   │
│  │ System          │ Engine       │ (Git, GitHub, etc.)    │   │
│  └─────────────────┴──────────────┴────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Comprehensive Config.yml Extension

```yaml
# ~/.config/claude-code-github/config.yml

# Global settings for the claude-code-github server
git_workflow:
  main_branch: main
  protected_branches: [main, develop]
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

# Automation Configuration
automation:
  enabled: true
  mode: "assisted"  # Options: "off", "assisted", "autonomous"
  
  # Global safety settings
  safety:
    require_approval:
      - "push"
      - "merge"
      - "release"
    auto_rollback:
      enabled: true
      on_test_failure: true
      on_build_failure: true
    dry_run_mode: false
    max_actions_per_hour: 20
    pause_on_errors: true
    
  # Notification settings
  notifications:
    channels:
      - type: "webhook"
        url: "https://hooks.slack.com/services/..."
        events: ["action_taken", "approval_required", "error"]
      - type: "email"
        address: "dev@example.com"
        events: ["daily_summary", "approval_required"]
    
  # Rule definitions
  rules:
    # Auto-commit rules
    auto_commit:
      enabled: true
      conditions:
        - type: "time_based"
          idle_minutes: 30
          min_changes: 3
        - type: "file_count"
          threshold: 10
          message_template: "chore: checkpoint - {file_count} files modified"
        - type: "pattern"
          patterns:
            - "test/**/*.test.ts"
            - "**/*.spec.ts"
          message_template: "test: add/update test cases"
      policies:
        - no_commits_on_protected_branches
        - require_conventional_commits
        - max_commit_size: 50  # files
    
    # Auto-branch rules
    auto_branch:
      enabled: true
      conditions:
        - type: "protected_branch_changes"
          action: "create_feature_branch"
          naming_strategy: "from_changed_files"  # or "from_ai_analysis"
        - type: "new_feature_detected"
          indicators:
            - "new_component_added"
            - "new_api_endpoint"
            - "new_module_created"
      policies:
        - require_branch_prefix
        - auto_push_after_creation: true
    
    # Auto-PR rules
    auto_pr:
      enabled: true
      conditions:
        - type: "branch_ready"
          requirements:
            - "no_uncommitted_changes"
            - "tests_passing"
            - "build_successful"
            - "commits_ahead_of_main: >3"
        - type: "milestone_complete"
          indicators:
            - "feature_complete"
            - "all_todos_resolved"
      template: |
        ## Summary
        {ai_generated_summary}
        
        ## Changes
        {change_list}
        
        ## Testing
        - [ ] Unit tests pass
        - [ ] Integration tests pass
        - [ ] Manual testing completed
        
        ## Checklist
        - [ ] Code follows style guidelines
        - [ ] Self-review completed
        - [ ] Documentation updated
      policies:
        - create_as_draft: true
        - auto_assign_reviewers: true
        - require_ci_pass_before_undraft: true
    
    # Auto-merge rules
    auto_merge:
      enabled: false  # Requires explicit enable for safety
      conditions:
        - type: "pr_approved"
          min_approvals: 2
          required_reviewers: ["senior-dev", "tech-lead"]
        - type: "all_checks_passed"
          required_checks:
            - "build"
            - "test"
            - "lint"
            - "security-scan"
        - type: "no_merge_conflicts"
      policies:
        - merge_method: "squash"  # or "merge", "rebase"
        - delete_branch_after_merge: true
        - update_from_base_before_merge: true
    
    # Auto-release rules
    auto_release:
      enabled: true
      conditions:
        - type: "version_tag_pushed"
          pattern: "v*.*.*"
        - type: "milestone_closed"
          required_completion: 90  # percentage
        - type: "manual_trigger"
          allowed_users: ["release-manager", "tech-lead"]
      actions:
        - generate_changelog: true
        - create_github_release: true
        - trigger_deployment: false  # Requires explicit enable
      policies:
        - require_release_branch: true
        - enforce_semver: true
        - block_releases_on_friday: true
    
    # Custom workflow rules
    custom_workflows:
      - name: "dependency_update"
        enabled: true
        trigger:
          type: "schedule"
          cron: "0 0 * * 1"  # Weekly on Monday
        actions:
          - run_command: "npm update"
          - run_tests: true
          - create_pr_if_changes: true
        policies:
          - max_retries: 3
          - notify_on_failure: true
      
      - name: "code_quality_check"
        enabled: true
        trigger:
          type: "file_change"
          patterns: ["src/**/*.ts", "src/**/*.tsx"]
        actions:
          - run_command: "npm run lint"
          - run_command: "npm run type-check"
          - add_commit_status: true
        policies:
          - block_on_failure: false
          - auto_fix_issues: true

# Project-specific automation overrides
projects:
  - path: "/Users/dev/projects/production-app"
    github_repo: "company/production-app"
    automation:
      mode: "assisted"  # Override global mode
      rules:
        auto_commit:
          enabled: false  # Disable for production
        auto_merge:
          conditions:
            - type: "pr_approved"
              min_approvals: 3  # Higher for production
              required_reviewers: ["tech-lead", "security-team"]
    
  - path: "/Users/dev/projects/experimental-feature"
    github_repo: "company/experimental-feature"
    automation:
      mode: "autonomous"  # Full automation for experimental
      rules:
        auto_commit:
          conditions:
            - type: "time_based"
              idle_minutes: 15  # More frequent commits
```

## 2. Example Automation Rules and Policies

### Rule Categories

#### Time-Based Rules
```yaml
time_based_rules:
  end_of_day_commit:
    trigger:
      type: "schedule"
      time: "17:00"  # 5 PM daily
    condition:
      has_uncommitted_changes: true
    action:
      type: "commit"
      message: "WIP: end of day checkpoint"
      push: false
    
  weekly_pr_cleanup:
    trigger:
      type: "schedule"
      cron: "0 9 * * 1"  # Monday 9 AM
    condition:
      stale_prs:
        days_old: 7
        no_activity: true
    action:
      type: "notify"
      message: "Stale PRs need attention"
```

#### Pattern-Based Rules
```yaml
pattern_based_rules:
  test_file_commit:
    trigger:
      type: "file_change"
      patterns:
        - "**/*.test.ts"
        - "**/*.spec.ts"
    condition:
      changes_only_tests: true
    action:
      type: "commit"
      message_template: "test: {auto_generated_description}"
      
  documentation_update:
    trigger:
      type: "file_change"
      patterns:
        - "**/*.md"
        - "docs/**/*"
    condition:
      no_code_changes: true
    action:
      type: "commit"
      message: "docs: update documentation"
      skip_tests: true
```

#### Intelligent Rules
```yaml
intelligent_rules:
  feature_completion:
    trigger:
      type: "ai_analysis"
      indicators:
        - "todos_completed"
        - "tests_added"
        - "no_fixme_comments"
    action:
      type: "suggest"
      suggestion: "Feature appears complete. Create PR?"
      
  refactor_detection:
    trigger:
      type: "diff_analysis"
      indicators:
        - "significant_file_moves"
        - "similar_changes_across_files"
        - "no_behavior_changes"
    action:
      type: "commit"
      message_template: "refactor: {ai_description}"
      create_branch_if_needed: true
```

### Policy Examples

#### Safety Policies
```yaml
safety_policies:
  - name: "no_direct_main_commits"
    type: "branch_protection"
    rule: "block_commits_to_protected_branches"
    
  - name: "require_test_coverage"
    type: "quality_gate"
    rule: "min_coverage_80_percent"
    
  - name: "human_approval_for_production"
    type: "approval_gate"
    rule: "require_manual_approval_for_prod_changes"
```

#### Quality Policies
```yaml
quality_policies:
  - name: "conventional_commits"
    type: "commit_format"
    rule: "enforce_conventional_commit_format"
    
  - name: "atomic_commits"
    type: "commit_size"
    rule: "max_files_per_commit: 20"
    
  - name: "pr_size_limit"
    type: "pr_validation"
    rule: "max_lines_changed: 500"
```

## 3. Safety Mechanisms and Approval Workflows

### Multi-Level Safety System

```yaml
safety_system:
  levels:
    - level: 1
      name: "Validation"
      checks:
        - syntax_validation
        - policy_compliance
        - conflict_detection
      
    - level: 2
      name: "Simulation"
      checks:
        - dry_run_execution
        - impact_analysis
        - rollback_plan_generation
      
    - level: 3
      name: "Approval"
      checks:
        - risk_assessment
        - human_review_required
        - approval_collection
      
    - level: 4
      name: "Execution"
      checks:
        - pre_flight_checks
        - progressive_rollout
        - real_time_monitoring
      
    - level: 5
      name: "Verification"
      checks:
        - post_execution_validation
        - success_criteria_met
        - rollback_if_needed
```

### Approval Workflow Configuration

```yaml
approval_workflows:
  standard:
    steps:
      - name: "auto_review"
        type: "automated"
        checks:
          - "policy_compliance"
          - "risk_score < 30"
        
      - name: "peer_review"
        type: "human"
        required_if:
          - "risk_score >= 30"
          - "affects_critical_path"
        assignees: ["team_lead", "senior_dev"]
        timeout: "2h"
        
      - name: "final_approval"
        type: "human"
        required_if:
          - "risk_score >= 70"
          - "production_change"
        assignees: ["tech_lead", "manager"]
        timeout: "4h"
  
  emergency:
    steps:
      - name: "quick_validation"
        type: "automated"
        checks: ["critical_checks_only"]
        
      - name: "emergency_approval"
        type: "human"
        assignees: ["on_call_engineer"]
        timeout: "15m"
```

### Risk Assessment Framework

```yaml
risk_assessment:
  factors:
    - name: "change_size"
      weight: 0.2
      thresholds:
        low: "< 5 files"
        medium: "5-20 files"
        high: "> 20 files"
    
    - name: "code_criticality"
      weight: 0.3
      thresholds:
        low: "test files, docs"
        medium: "feature code"
        high: "core systems, auth, payments"
    
    - name: "time_of_day"
      weight: 0.1
      thresholds:
        low: "business hours"
        medium: "evening"
        high: "late night, weekends"
    
    - name: "recent_failures"
      weight: 0.4
      thresholds:
        low: "no failures in 7 days"
        medium: "1-2 failures"
        high: "> 2 failures"
  
  risk_levels:
    low: "< 30"
    medium: "30-70"
    high: "> 70"
    critical: "> 90"
```

## 4. Integration with Existing Suggestion Engine

### Enhanced Suggestion Engine

```typescript
// src/automation/automation-engine.ts

import { SuggestionEngine, Suggestion } from '../suggestion-engine.js';
import { AutomationRule, AutomationPolicy, ApprovalRequest } from './types.js';

export class AutomationEngine extends SuggestionEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private policies: Map<string, AutomationPolicy> = new Map();
  private approvalQueue: ApprovalRequest[] = [];
  
  /**
   * Enhanced suggestion analysis that can trigger automation
   */
  async analyzeSituationWithAutomation(
    projectPath: string, 
    status: DevelopmentStatus
  ): Promise<AutomationResult> {
    // Get base suggestions
    const suggestions = this.analyzeSituation(projectPath, status);
    
    // Check if any suggestions match automation rules
    const automationCandidates = this.matchSuggestionsToRules(suggestions);
    
    // Apply policies to filter candidates
    const approvedActions = await this.applyPolicies(automationCandidates);
    
    // Check if approval is needed
    const actionsNeedingApproval = this.checkApprovalRequirements(approvedActions);
    
    // Execute approved actions
    const executedActions = await this.executeApprovedActions(
      approvedActions.filter(a => !actionsNeedingApproval.includes(a))
    );
    
    // Queue actions needing approval
    this.queueForApproval(actionsNeedingApproval);
    
    return {
      suggestions,
      automatedActions: executedActions,
      pendingApprovals: actionsNeedingApproval,
      blocked: this.getBlockedActions()
    };
  }
  
  /**
   * Match suggestions to automation rules
   */
  private matchSuggestionsToRules(
    suggestions: Suggestion[]
  ): AutomationCandidate[] {
    const candidates: AutomationCandidate[] = [];
    
    for (const suggestion of suggestions) {
      const matchingRules = this.findMatchingRules(suggestion);
      
      for (const rule of matchingRules) {
        if (this.evaluateRuleConditions(rule, suggestion)) {
          candidates.push({
            suggestion,
            rule,
            confidence: this.calculateConfidence(suggestion, rule),
            riskScore: this.calculateRiskScore(suggestion, rule)
          });
        }
      }
    }
    
    return candidates;
  }
  
  /**
   * Integration with existing monitoring system
   */
  integrateWithMonitoring(monitoringEvent: MonitoringEvent): void {
    // Convert monitoring events to suggestions
    const suggestion = this.convertEventToSuggestion(monitoringEvent);
    
    if (suggestion && this.shouldAutomate(suggestion)) {
      this.queueAutomation(suggestion);
    }
  }
}
```

### API Integration

```typescript
// src/api/routes/automation.ts

export function setupAutomationRoutes(app: Express, automationEngine: AutomationEngine) {
  // Get automation status
  app.get('/api/automation/status', (req, res) => {
    res.json(automationEngine.getStatus());
  });
  
  // Get pending approvals
  app.get('/api/automation/approvals', (req, res) => {
    res.json(automationEngine.getPendingApprovals());
  });
  
  // Approve/reject automation
  app.post('/api/automation/approve/:id', (req, res) => {
    const result = automationEngine.processApproval(
      req.params.id,
      req.body.approved,
      req.body.reason
    );
    res.json(result);
  });
  
  // Configure automation rules
  app.put('/api/automation/rules/:ruleName', (req, res) => {
    const result = automationEngine.updateRule(
      req.params.ruleName,
      req.body
    );
    res.json(result);
  });
  
  // Emergency stop
  app.post('/api/automation/emergency-stop', (req, res) => {
    automationEngine.emergencyStop();
    res.json({ status: 'stopped' });
  });
}
```

### WebSocket Integration for Real-time Updates

```typescript
// src/websocket/automation-broadcaster.ts

export class AutomationBroadcaster {
  broadcast(event: AutomationEvent): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'automation_event',
          data: {
            action: event.action,
            status: event.status,
            project: event.project,
            timestamp: event.timestamp,
            requiresApproval: event.requiresApproval,
            riskLevel: event.riskLevel
          }
        }));
      }
    });
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Extend configuration schema
- Implement rule engine base
- Add policy framework
- Create approval system skeleton

### Phase 2: Core Automation (Weeks 3-4)
- Implement auto-commit functionality
- Add auto-branch creation
- Create PR automation
- Integrate with existing suggestion engine

### Phase 3: Safety & Approval (Weeks 5-6)
- Implement risk assessment
- Add approval workflows
- Create rollback mechanisms
- Add emergency stop functionality

### Phase 4: Advanced Features (Weeks 7-8)
- Add AI-powered rule suggestions
- Implement learning mode
- Create custom workflow support
- Add comprehensive monitoring

### Phase 5: Testing & Refinement (Weeks 9-10)
- Extensive testing with real projects
- Performance optimization
- Security audit
- Documentation and examples

## Key Benefits

1. **Productivity**: Automates repetitive tasks while maintaining quality
2. **Consistency**: Enforces best practices across all projects
3. **Safety**: Multiple layers of validation and approval
4. **Flexibility**: Highly configurable per-project settings
5. **Intelligence**: Learns from patterns and improves over time
6. **Transparency**: Full audit trail and real-time monitoring

## Security Considerations

1. **Authentication**: API endpoints require authentication
2. **Authorization**: Role-based access control for approvals
3. **Audit Trail**: All actions logged with user attribution
4. **Encryption**: Sensitive data encrypted at rest and in transit
5. **Rate Limiting**: Prevents runaway automation
6. **Isolation**: Project-level isolation prevents cross-contamination

This design provides a comprehensive, safe, and powerful automation system that enhances developer productivity while maintaining control and quality standards.