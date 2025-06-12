import chalk from 'chalk';

export class ProgressIndicator {
  private spinner: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string = '';
  private isInteractive: boolean;
  private isSilent: boolean;

  constructor() {
    // Only show progress spinners if stderr is a TTY
    this.isInteractive = process.stderr.isTTY || false;
    // Check if running in MCP mode (should be silent)
    this.isSilent = process.env.MCP_MODE === 'true';
  }

  start(message: string) {
    this.message = message;
    this.currentFrame = 0;
    
    // Clear any existing interval
    this.stop();
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      // In non-interactive mode, just log the message
      console.error(chalk.gray(`• ${message}`));
      return;
    }
    
    // Write initial frame
    process.stderr.write(`${this.spinner[this.currentFrame]} ${chalk.gray(this.message)}`);
    
    this.interval = setInterval(() => {
      // Clear current line
      process.stderr.write('\r');
      
      // Update frame
      this.currentFrame = (this.currentFrame + 1) % this.spinner.length;
      
      // Write new frame
      process.stderr.write(`${this.spinner[this.currentFrame]} ${chalk.gray(this.message)}`);
    }, 80);
  }

  update(message: string) {
    this.message = message;
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      // In non-interactive mode, just log the new message
      console.error(chalk.gray(`• ${message}`));
      return;
    }
    
    // Clear current line and write new message
    process.stderr.write('\r');
    process.stderr.write(`${this.spinner[this.currentFrame]} ${chalk.gray(this.message)}`);
  }

  succeed(message?: string) {
    this.stop();
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      console.error(`${chalk.green('✓')} ${chalk.gray(message || this.message)}`);
      return;
    }
    
    process.stderr.write('\r');
    process.stderr.write(`${chalk.green('✓')} ${chalk.gray(message || this.message)}\n`);
  }

  fail(message?: string) {
    this.stop();
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      console.error(`${chalk.red('✗')} ${chalk.gray(message || this.message)}`);
      return;
    }
    
    process.stderr.write('\r');
    process.stderr.write(`${chalk.red('✗')} ${chalk.gray(message || this.message)}\n`);
  }

  warn(message?: string) {
    this.stop();
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      console.error(`${chalk.yellow('⚠')} ${chalk.gray(message || this.message)}`);
      return;
    }
    
    process.stderr.write('\r');
    process.stderr.write(`${chalk.yellow('⚠')} ${chalk.gray(message || this.message)}\n`);
  }

  info(message?: string) {
    this.stop();
    
    // Don't output anything in silent/MCP mode
    if (this.isSilent) {
      return;
    }
    
    if (!this.isInteractive) {
      console.error(`${chalk.blue('ℹ')} ${chalk.gray(message || this.message)}`);
      return;
    }
    
    process.stderr.write('\r');
    process.stderr.write(`${chalk.blue('ℹ')} ${chalk.gray(message || this.message)}\n`);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  clear() {
    this.stop();
    
    if (!this.isInteractive) {
      return;
    }
    
    process.stderr.write('\r');
    process.stderr.write(' '.repeat(this.message.length + 3));
    process.stderr.write('\r');
  }
}

export function showProgress<T>(message: string, operation: () => Promise<T>): Promise<T> {
  const progress = new ProgressIndicator();
  progress.start(message);
  
  return operation()
    .then((result) => {
      progress.succeed();
      return result;
    })
    .catch((error) => {
      progress.fail();
      throw error;
    });
}

export function formatFileChange(status: string, file: string): string {
  const statusColors: Record<string, (text: string) => string> = {
    'Added': chalk.green,
    'Modified': chalk.yellow,
    'Deleted': chalk.red,
    'Renamed': chalk.blue
  };
  
  const color = statusColors[status] || chalk.gray;
  const prefix = status.charAt(0).toUpperCase();
  
  return `${color(prefix)} ${file}`;
}

export function formatDiff(diff: string, maxLines: number = 20): string {
  const lines = diff.split('\n');
  const formattedLines: string[] = [];
  let lineCount = 0;
  
  for (const line of lines) {
    if (lineCount >= maxLines) {
      formattedLines.push(chalk.gray('... (truncated)'));
      break;
    }
    
    if (line.startsWith('+') && !line.startsWith('+++')) {
      formattedLines.push(chalk.green(line));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      formattedLines.push(chalk.red(line));
    } else if (line.startsWith('@@')) {
      formattedLines.push(chalk.cyan(line));
    } else {
      formattedLines.push(chalk.gray(line));
    }
    
    lineCount++;
  }
  
  return formattedLines.join('\n');
}

export function formatBranchInfo(branch: string, isProtected: boolean): string {
  const branchDisplay = chalk.cyan(branch);
  const protectedBadge = isProtected ? chalk.red(' [PROTECTED]') : '';
  
  return `${branchDisplay}${protectedBadge}`;
}

export function formatCommitMessage(message: string): string {
  const lines = message.split('\n');
  const [title, ...body] = lines;
  
  const formatted: string[] = [chalk.bold(title)];
  
  if (body.length > 0) {
    formatted.push('');
    formatted.push(...body.map(line => chalk.gray(line)));
  }
  
  return formatted.join('\n');
}

export class StatusDisplay {
  static showDevelopmentStatus(status: any): string {
    const output: string[] = [];
    
    output.push(chalk.bold('\n📊 Development Status\n'));
    
    // Branch info
    output.push(`${chalk.gray('Branch:')} ${formatBranchInfo(status.branch, status.is_protected)}`);
    
    // Uncommitted changes
    if (status.uncommitted_changes) {
      const { file_count, files_changed } = status.uncommitted_changes;
      
      output.push(`${chalk.gray('Changes:')} ${chalk.yellow(`${file_count} file${file_count !== 1 ? 's' : ''} modified`)}`);
      output.push('');
      
      // Show file changes
      for (const change of files_changed.slice(0, 10)) {
        output.push(`  ${formatFileChange(change.status, change.file)}`);
      }
      
      if (files_changed.length > 10) {
        output.push(chalk.gray(`  ... and ${files_changed.length - 10} more files`));
      }
    } else {
      output.push(`${chalk.gray('Changes:')} ${chalk.green('Working directory clean')}`);
    }
    
    return output.join('\n');
  }
  
  static showBranchCreated(branchName: string, message: string): string {
    const output: string[] = [];
    
    output.push(chalk.green.bold('\n✅ Branch Created\n'));
    output.push(`${chalk.gray('Branch:')} ${chalk.cyan(branchName)}`);
    output.push(`${chalk.gray('Commit:')} ${formatCommitMessage(message)}`);
    
    return output.join('\n');
  }
  
  static showPullRequestCreated(prNumber: number, prUrl: string): string {
    const output: string[] = [];
    
    output.push(chalk.green.bold('\n✅ Pull Request Created\n'));
    output.push(`${chalk.gray('PR:')} #${prNumber}`);
    output.push(`${chalk.gray('URL:')} ${chalk.cyan(prUrl)}`);
    
    return output.join('\n');
  }
  
  static showCheckpointCreated(message: string): string {
    const output: string[] = [];
    
    output.push(chalk.green.bold('\n✅ Checkpoint Created\n'));
    output.push(`${chalk.gray('Commit:')} ${formatCommitMessage(message)}`);
    
    return output.join('\n');
  }
}