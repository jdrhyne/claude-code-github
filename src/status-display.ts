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
}