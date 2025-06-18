import { Command } from 'commander';
import { DevelopmentTools } from '../development-tools.js';
import chalk from 'chalk';
import ora from 'ora';

export default function runDirectCli() {
  const program = new Command();

  async function initializeDevTools() {
    const devTools = new DevelopmentTools();
    await devTools.initialize();
    return devTools;
  }

  program
    .name('claude-code-github')
    .description('Direct CLI access to Claude Code GitHub tools')
    .version('2.0.0');

  program
    .command('status')
    .description('Show current project status')
    .option('-e, --enhanced', 'Show enhanced status with PRs and issues')
    .action(async (options) => {
      const spinner = ora('Loading project status...').start();
      try {
        const devTools = await initializeDevTools();
        
        if (options.enhanced) {
          const status = await devTools.getEnhancedStatus();
          spinner.succeed('Project status loaded');
          console.log(status);
        } else {
          const status = await devTools.getStatus();
          spinner.succeed('Project status loaded');
          console.log(chalk.cyan('\n📁 Project Status\n'));
          console.log(chalk.yellow('Branch:'), status.branch);
          console.log(chalk.yellow('Protected:'), status.is_protected ? chalk.red('Yes') : chalk.green('No'));
          console.log(chalk.yellow('Remote:'), status.remote_status);
          console.log(chalk.yellow('Changes:'), status.uncommitted_changes.file_count);
          if (status.uncommitted_changes.file_count > 0) {
            console.log(chalk.yellow('\nFiles changed:'));
            status.uncommitted_changes.files_changed.forEach((file: any) => {
              const color = file.status === 'Added' ? 'green' : 
                           file.status === 'Deleted' ? 'red' : 'yellow';
              console.log(`  ${(chalk as any)[color](file.status.padEnd(10))} ${file.file}`);
            });
          }
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('commit <message>')
    .description('Create a commit with all current changes')
    .option('-p, --push', 'Push to remote after committing')
    .action(async (message, options) => {
      const spinner = ora('Creating commit...').start();
      try {
        const devTools = await initializeDevTools();
        const result = await devTools.checkpoint({ message, push: options.push });
        spinner.succeed(`Commit created: ${result.commit_sha.substring(0, 7)}`);
        if (options.push && result.pushed) {
          console.log(chalk.green('✓ Pushed to remote'));
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('branch <type> <name>')
    .description('Create a new branch with appropriate prefix')
    .argument('<type>', 'Branch type: feature, bugfix, or refactor')
    .argument('<name>', 'Branch name (without prefix)')
    .option('-m, --message <message>', 'Initial commit message')
    .action(async (type, name, options) => {
      const spinner = ora('Creating branch...').start();
      try {
        const devTools = await initializeDevTools();
        const message = options.message || `chore: create ${type} branch ${name}`;
        const result = await devTools.createBranch({ name, type, message });
        spinner.succeed(`Branch created: ${result.branch}`);
        if (result.files_committed > 0) {
          console.log(chalk.green(`✓ Committed ${result.files_committed} files`));
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('pr')
    .description('Create or manage pull requests')
    .option('-c, --create', 'Create a new pull request')
    .option('-s, --status <number>', 'Get status of PR number')
    .option('-u, --update <number>', 'Update PR number')
    .option('-t, --title <title>', 'PR title (for create/update)')
    .option('-b, --body <body>', 'PR body (for create/update)')
    .option('-d, --draft', 'Create as draft PR')
    .action(async (options) => {
      const spinner = ora('Processing PR request...').start();
      try {
        const devTools = await initializeDevTools();
        
        if (options.create) {
          const title = options.title || 'New Pull Request';
          const body = options.body || 'Auto-generated pull request';
          const result = await devTools.createPullRequest({
            title,
            body,
            is_draft: options.draft !== false
          });
          spinner.succeed(`Pull request created: ${result.url}`);
        } else if (options.status) {
          const result = await devTools.getPullRequestStatus(parseInt(options.status));
          spinner.succeed('PR status retrieved');
          console.log(result);
        } else if (options.update) {
          const updates: any = {};
          if (options.title) updates.title = options.title;
          if (options.body) updates.body = options.body;
          if (options.draft !== undefined) updates.draft = options.draft;
          
          updates.pr_number = parseInt(options.update);
          await devTools.updatePullRequest(updates);
          spinner.succeed(`PR #${options.update} updated`);
        } else {
          spinner.fail('Please specify --create, --status, or --update');
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('issue')
    .description('Manage GitHub issues')
    .option('-l, --list', 'List open issues')
    .option('-b, --branch <number>', 'Create branch from issue number')
    .option('-u, --update <number>', 'Update issue number')
    .option('-c, --comment <comment>', 'Add comment to issue')
    .option('-s, --state <state>', 'Change issue state (open/closed)')
    .action(async (options) => {
      const spinner = ora('Processing issue request...').start();
      try {
        const devTools = await initializeDevTools();
        
        if (options.list) {
          const result = await devTools.listIssues({
            state: 'open' as const,
            limit: 20
          });
          spinner.succeed('Issues retrieved');
          console.log(result);
        } else if (options.branch) {
          const result = await devTools.createBranchFromIssue({
            issue_number: parseInt(options.branch)
          });
          spinner.succeed(`Branch created: ${result.branch}`);
        } else if (options.update) {
          const updates: any = {
            issue_number: parseInt(options.update)
          };
          if (options.comment) updates.comment = options.comment;
          if (options.state) updates.state = options.state;
          
          await devTools.updateIssue(updates);
          spinner.succeed(`Issue #${options.update} updated`);
        } else {
          spinner.fail('Please specify --list, --branch, or --update');
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('release')
    .description('Create and manage releases')
    .option('-c, --create <tag>', 'Create a new release with tag')
    .option('-n, --name <name>', 'Release name')
    .option('-b, --body <body>', 'Release notes')
    .option('-d, --draft', 'Create as draft')
    .option('-p, --prerelease', 'Mark as pre-release')
    .option('-l, --list', 'List recent releases')
    .action(async (options) => {
      const spinner = ora('Processing release request...').start();
      try {
        const devTools = await initializeDevTools();
        
        if (options.create) {
          const result = await devTools.createRelease({
            tag_name: options.create,
            name: options.name,
            body: options.body,
            draft: options.draft || false,
            prerelease: options.prerelease || false
          });
          spinner.succeed(`Release created: ${result.url}`);
        } else if (options.list) {
          const result = await devTools.listReleases(10);
          spinner.succeed('Releases retrieved');
          console.log(result);
        } else {
          spinner.fail('Please specify --create or --list');
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('quick <action>')
    .description('Quick workflow actions: wip, fix, done, sync, update')
    .action(async (action) => {
      const spinner = ora(`Executing quick action: ${action}...`).start();
      try {
        const devTools = await initializeDevTools();
        const result = await devTools.quickAction(action);
        spinner.succeed(`Quick action '${action}' completed`);
        console.log(chalk.green(result.message));
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('version <type>')
    .description('Bump version: major, minor, patch')
    .option('-c, --custom <version>', 'Use custom version')
    .action(async (type, options) => {
      const spinner = ora('Bumping version...').start();
      try {
        const devTools = await initializeDevTools();
        const result = await devTools.versionBump({
          type: options.custom ? 'custom' : type,
          custom_version: options.custom
        });
        spinner.succeed(`Version bumped: ${result.old_version} → ${result.new_version}`);
        if (result.files_updated.length > 0) {
          console.log(chalk.green('Files updated:'), result.files_updated.join(', '));
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program
    .command('changelog')
    .description('Generate changelog from commits')
    .option('-f, --from <ref>', 'Starting Git ref')
    .option('-t, --to <ref>', 'Ending Git ref', 'HEAD')
    .option('-F, --format <format>', 'Output format: markdown, json, conventional', 'markdown')
    .action(async (options) => {
      const spinner = ora('Generating changelog...').start();
      try {
        const devTools = await initializeDevTools();
        const result = await devTools.generateChangelog({
          from: options.from,
          to: options.to,
          format: options.format
        });
        spinner.succeed('Changelog generated');
        console.log(result);
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  program.parse(process.argv);
}