import chalk from 'chalk';
import { PushResult, DeploymentInfo } from './types.js';

export class StatusDisplay {
  static showPushResult(result: PushResult): string {
    const lines: string[] = [];
    
    if (!result.pushed) {
      lines.push(chalk.yellow('⚠️  No push performed'));
      return lines.join('\n');
    }

    lines.push(chalk.green(`✓ Pushed to ${result.branch}`));
    
    if (result.remote_url) {
      lines.push(chalk.gray(`  Remote: ${result.remote_url}`));
    }

    if (result.deployment_info && result.deployment_info.should_deploy) {
      lines.push('');
      lines.push(chalk.cyan('🚀 Deployment detected:'));
      lines.push(chalk.gray(`  Reason: ${result.deployment_info.reason}`));
      
      if (result.deployment_info.version_bump) {
        lines.push(chalk.gray(`  Version: ${result.deployment_info.version_bump.from} → ${result.deployment_info.version_bump.to}`));
      }
      
      if (result.deployment_info.workflows && result.deployment_info.workflows.length > 0) {
        lines.push(chalk.gray(`  Workflows: ${result.deployment_info.workflows.join(', ')}`));
      }
    }

    if (result.workflow_runs && result.workflow_runs.length > 0) {
      lines.push('');
      lines.push(chalk.cyan('📋 GitHub Actions:'));
      for (const run of result.workflow_runs) {
        lines.push(chalk.gray(`  • ${run.name}: ${run.url}`));
      }
    }

    return lines.join('\n');
  }

  static showCheckpointCreated(message: string): string {
    return chalk.green(`✓ Created checkpoint: ${message}`);
  }

  static showBranchCreated(branchName: string, message: string): string {
    return [
      chalk.green(`✓ Created branch: ${branchName}`),
      chalk.gray(`  Committed: ${message}`)
    ].join('\n');
  }

  static showPullRequestCreated(url: string, isDraft: boolean): string {
    return [
      chalk.green(`✓ Created ${isDraft ? 'draft ' : ''}pull request`),
      chalk.cyan(`  View at: ${url}`)
    ].join('\n');
  }

  static showStatus(status: any): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold('📂 Project Status'));
    lines.push(chalk.gray(`  Branch: ${status.branch}${status.is_protected ? ' (protected)' : ''}`));
    
    if (status.uncommitted_changes) {
      lines.push(chalk.yellow(`  Changes: ${status.uncommitted_changes.file_count} files`));
      
      const fileList = status.uncommitted_changes.files_changed
        .slice(0, 5)
        .map((f: any) => `    • ${f.file} (${f.status})`)
        .join('\n');
      
      lines.push(fileList);
      
      if (status.uncommitted_changes.files_changed.length > 5) {
        lines.push(chalk.gray(`    ... and ${status.uncommitted_changes.files_changed.length - 5} more`));
      }
    } else {
      lines.push(chalk.green('  No uncommitted changes'));
    }
    
    return lines.join('\n');
  }

  static showEnhancedStatus(status: any): string {
    const lines: string[] = [];
    
    // Header
    lines.push(chalk.bold.cyan('📊 Comprehensive Project Status'));
    lines.push(chalk.gray('─'.repeat(50)));
    
    // Project info
    lines.push(chalk.bold('\n📁 Project'));
    lines.push(chalk.gray(`  Path: ${status.project.path}`));
    lines.push(chalk.gray(`  Repo: ${status.project.repo}`));
    
    // Branch info
    lines.push(chalk.bold('\n🌿 Branch'));
    lines.push(`  Current: ${chalk.green(status.branch.current)}${status.branch.isProtected ? chalk.red(' (protected)') : ''}`);
    if (status.branch.tracking) {
      lines.push(chalk.gray(`  Tracking: ${status.branch.tracking}`));
      if (status.branch.ahead > 0 || status.branch.behind > 0) {
        const aheadBehind = [];
        if (status.branch.ahead > 0) aheadBehind.push(chalk.green(`↑${status.branch.ahead}`));
        if (status.branch.behind > 0) aheadBehind.push(chalk.red(`↓${status.branch.behind}`));
        lines.push(`  Status: ${aheadBehind.join(' ')}`);
      }
    }
    
    // Uncommitted changes
    lines.push(chalk.bold('\n📝 Working Directory'));
    if (status.uncommittedChanges) {
      lines.push(chalk.yellow(`  ${status.uncommittedChanges.file_count} uncommitted changes:`));
      status.uncommittedChanges.files_changed.slice(0, 3).forEach((f: any) => {
        const statusIcon = f.status === 'Modified' ? '±' : f.status === 'Added' ? '+' : '-';
        lines.push(chalk.gray(`    ${statusIcon} ${f.file}`));
      });
      if (status.uncommittedChanges.files_changed.length > 3) {
        lines.push(chalk.gray(`    ... and ${status.uncommittedChanges.files_changed.length - 3} more`));
      }
    } else {
      lines.push(chalk.green('  ✓ Clean working directory'));
    }
    
    // Recent commits
    if (status.recentCommits && status.recentCommits.length > 0) {
      lines.push(chalk.bold('\n📌 Recent Commits'));
      status.recentCommits.slice(0, 3).forEach((commit: any) => {
        lines.push(chalk.gray(`  ${commit.hash} ${commit.message.substring(0, 50)}${commit.message.length > 50 ? '...' : ''}`));
        lines.push(chalk.gray(`         by ${commit.author} on ${commit.date}`));
      });
    }
    
    // Pull requests
    if (status.pullRequests && status.pullRequests.length > 0) {
      lines.push(chalk.bold('\n🔀 Pull Requests'));
      status.pullRequests.forEach((pr: any) => {
        const reviewIcon = pr.reviewStatus === 'approved' ? '✅' : 
                          pr.reviewStatus === 'changes_requested' ? '❌' : 
                          pr.reviewStatus === 'reviewed' ? '👀' : '⏳';
        lines.push(`  #${pr.number} ${pr.title}`);
        lines.push(chalk.gray(`       ${reviewIcon} ${pr.reviewStatus} • ${pr.draft ? 'Draft' : 'Ready'} • ${pr.url}`));
      });
    }
    
    // Issues
    if (status.issues && status.issues.length > 0) {
      lines.push(chalk.bold('\n🎯 Assigned Issues'));
      status.issues.slice(0, 3).forEach((issue: any) => {
        lines.push(`  #${issue.number} ${issue.title}`);
        if (issue.labels.length > 0) {
          lines.push(chalk.gray(`       Labels: ${issue.labels.join(', ')}`));
        }
      });
    }
    
    // CI/CD Status
    if (status.workflowRuns && status.workflowRuns.length > 0) {
      lines.push(chalk.bold('\n🔄 CI/CD Status'));
      status.workflowRuns.forEach((run: any) => {
        const statusIcon = run.status === 'completed' ? '✅' : 
                          run.status === 'failure' ? '❌' : '🔄';
        lines.push(`  ${statusIcon} ${run.name} - ${run.status || 'running'}`);
      });
    }
    
    // Related branches
    if (status.relatedBranches && status.relatedBranches.length > 0) {
      lines.push(chalk.bold('\n🔗 Related Branches'));
      status.relatedBranches.slice(0, 3).forEach((branch: string) => {
        lines.push(chalk.gray(`  • ${branch}`));
      });
    }
    
    lines.push(chalk.gray('\n─'.repeat(50)));
    
    return lines.join('\n');
  }
}