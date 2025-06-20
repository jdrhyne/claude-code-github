# LLM Prompt Templates for Autonomous Git Agent

## Core Decision-Making Prompts

### 1. Event Analysis & Action Decision
```
You are an intelligent Git workflow assistant monitoring a software project. Analyze the current situation and decide what action to take.

PROJECT CONTEXT:
- Repository: {repo_name}
- Current branch: {branch_name}
- Protected branches: {protected_branches}
- Last commit: {time_since_last_commit}
- Last user activity: {last_activity_time}

CURRENT EVENT:
- Type: {event_type}
- Description: {event_description}
- Files affected: {file_count}
- Change summary: {change_summary}

RECENT HISTORY:
{last_10_events}

USER PREFERENCES:
- Commit style: {commit_style}
- Working hours: {working_hours}
- Auto-commit preference: {auto_commit_pref}
- Risk tolerance: {risk_tolerance}

CURRENT STATE:
- Uncommitted changes: {uncommitted_count} files
- Tests status: {test_status}
- Build status: {build_status}
- Active PR: {active_pr_info}

AVAILABLE ACTIONS:
1. commit - Create a commit with current changes
2. branch - Create a new feature/bugfix branch
3. pr - Create a pull request
4. stash - Stash changes for later
5. wait - Wait for more changes
6. suggest - Suggest action to user (no auto-execution)

Respond with JSON:
{
  "action": "action_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "requires_approval": true/false,
  "risk_assessment": "low/medium/high",
  "alternative_action": "backup option"
}
```

### 2. Commit Message Generation
```
Generate a professional git commit message for the following changes:

DIFF SUMMARY:
{file_diffs}

PROJECT INFO:
- Language: {primary_language}
- Type: {project_type}
- Current feature: {current_feature_context}

RECENT COMMITS (for style reference):
{last_5_commits}

USER PREFERENCES:
- Format: {conventional_commits/github_style/custom}
- Detail level: {concise/detailed}
- Include scope: {yes/no}
- Emoji usage: {never/sometimes/always}

REQUIREMENTS:
1. Follow the team's commit style based on recent commits
2. Be specific about what changed and why
3. Use active voice and present tense
4. Keep first line under 72 characters
5. Add body if changes are complex

Generate the commit message:
```

### 3. Pull Request Creation
```
Create a pull request description for the following changes:

BRANCH INFO:
- Feature branch: {branch_name}
- Base branch: {base_branch}
- Commits included: {commit_count}

CHANGES SUMMARY:
{aggregated_changes}

COMMIT HISTORY:
{commit_list_with_messages}

TEST RESULTS:
{test_summary}

PROJECT CONTEXT:
- Related issue: {issue_number}
- Sprint/milestone: {current_milestone}
- Dependencies: {dependency_changes}

USER PREFERENCES:
- PR template: {template_preference}
- Description style: {detailed/concise}
- Checklist items: {include_checklist}

Generate a comprehensive PR description including:
1. Summary of changes
2. Motivation and context  
3. Type of change (feature/bugfix/refactor)
4. Testing performed
5. Checklist items if needed
6. Related issues/PRs
```

### 4. Intelligent Branch Naming
```
Suggest a branch name for the current work:

CURRENT CHANGES:
- Files modified: {file_list}
- Main changes: {change_summary}
- Detected intent: {feature/bugfix/refactor/docs}

EXISTING BRANCHES:
{current_branches}

NAMING CONVENTION:
- Prefixes: {configured_prefixes}
- Style: {kebab-case/snake_case}
- Include issue: {yes/no}
- Max length: {max_length}

CONTEXT CLUES:
- Related issue title: {issue_title}
- Recent commit messages: {recent_commits}
- Directory focus: {primary_directory}

Suggest a branch name following the team's conventions:
```

### 5. Risk Assessment
```
Assess the risk level of automatically executing an action:

ACTION DETAILS:
- Type: {action_type}
- Target: {target_branch/files}
- Scope: {change_scope}

CURRENT CONTEXT:
- Time: {current_time}
- Day: {day_of_week}
- User last seen: {last_activity}
- Production deploy day: {deploy_schedule}

CODE ANALYSIS:
- Files changed: {file_list}
- Critical files touched: {critical_files}
- Test coverage: {coverage_percentage}
- Conflicts detected: {conflict_status}

HISTORY:
- Recent failures: {recent_action_failures}
- User corrections: {times_user_corrected_similar_action}
- Success rate: {historical_success_rate}

Assess risk and determine if manual approval is needed:
{
  "risk_score": 0.0-1.0,
  "factors": ["list of risk factors"],
  "recommendation": "auto_execute/request_approval/abort",
  "mitigation": "suggested safety measures"
}
```

### 6. Learning from Feedback
```
Learn from user correction to improve future decisions:

ORIGINAL DECISION:
- Suggested action: {suggested_action}
- Reasoning: {original_reasoning}
- Confidence: {original_confidence}

USER ACTION:
- Actual action: {user_action}
- Modification: {what_user_changed}
- User comment: {user_feedback}

CONTEXT AT TIME:
{full_context_snapshot}

PATTERN ANALYSIS:
- Similar past corrections: {similar_corrections}
- Frequency: {correction_frequency}
- Category: {correction_category}

Extract learnings:
1. What pattern should be recognized?
2. How should future decisions be adjusted?
3. What preference was revealed?
4. Confidence adjustment needed?

Response format:
{
  "pattern_learned": "description",
  "preference_update": "specific preference",
  "confidence_adjustment": "increase/decrease/maintain",
  "future_behavior": "how to act differently"
}
```

### 7. Context-Aware Waiting Decision
```
Determine if we should wait for more changes before taking action:

CURRENT STATE:
- Files changed: {current_changes}
- Time since last change: {time_since_change}
- Related files not yet modified: {potentially_related_files}

ACTIVITY PATTERNS:
- User's typical session length: {avg_session_length}
- Current session duration: {current_session_time}
- Typical commit size: {avg_commit_size}
- Current change size: {current_size}

INDICATORS:
- Incomplete patterns: {detected_incomplete_patterns}
- TODO comments added: {new_todos}
- Failing tests: {test_failures}
- Syntax errors: {syntax_errors}

HISTORICAL BEHAVIOR:
- User typically commits when: {commit_patterns}
- Average time between changes: {change_frequency}

Should we wait? Respond with:
{
  "decision": "wait/act_now",
  "wait_for": "specific condition or time",
  "confidence": 0.0-1.0,
  "indicators": ["reasons for decision"]
}
```

### 8. Smart Notification Generation
```
Generate a user notification for an important event or decision:

EVENT:
- Type: {event_type}
- Severity: {severity_level}
- Action taken/suggested: {action}

USER PREFERENCES:
- Notification style: {verbose/concise/minimal}
- Technical level: {beginner/intermediate/expert}
- Emoji preference: {love/tolerate/hate}

CONTEXT:
- Current focus: {user_current_activity}
- Time of day: {time}
- Recent notifications: {last_3_notifications}

Generate an appropriate notification that:
1. Is contextually relevant
2. Matches user's style preference
3. Includes actionable information
4. Avoids notification fatigue

Format: {
  "title": "brief title",
  "body": "notification content",
  "priority": "low/medium/high",
  "actions": ["available actions"]
}
```

## Prompt Engineering Guidelines

### 1. Context Ordering
- Most relevant context first
- User preferences early in prompt
- Historical patterns for learning

### 2. Output Formatting
- Always request structured JSON responses
- Include confidence scores
- Provide reasoning for transparency

### 3. Safety Instructions
- Always check protected branches
- Respect working hours
- Consider risk factors
- Default to user approval when uncertain

### 4. Learning Integration
- Include past corrections in context
- Reference user preferences
- Adapt language to user's style

### 5. Fallback Behavior
- Always provide alternative actions
- Clear "unsure" responses
- Graceful degradation to manual mode