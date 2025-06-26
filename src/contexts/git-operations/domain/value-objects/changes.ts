import { ValueObject } from '../../../../shared/domain/value-object.js';
import { FileChange } from '../types.js';

interface ChangesProps {
  files: FileChange[];
}

/**
 * Value object representing uncommitted changes in a repository
 */
export class Changes extends ValueObject<ChangesProps> {
  private constructor(props: ChangesProps) {
    super(props);
  }

  get files(): ReadonlyArray<FileChange> {
    return [...this.props.files];
  }

  get fileCount(): number {
    return this.props.files.length;
  }

  get additions(): number {
    return this.props.files.reduce((sum, file) => sum + (file.additions || 0), 0);
  }

  get deletions(): number {
    return this.props.files.reduce((sum, file) => sum + (file.deletions || 0), 0);
  }

  isEmpty(): boolean {
    return this.props.files.length === 0;
  }

  hasFile(path: string): boolean {
    return this.props.files.some(file => file.path === path);
  }

  getModifiedFiles(): FileChange[] {
    return this.props.files.filter(file => 
      file.status === 'modified' || 
      file.status === 'added' || 
      file.status === 'deleted'
    );
  }

  /**
   * Create an empty Changes object
   */
  static empty(): Changes {
    return new Changes({ files: [] });
  }

  /**
   * Create Changes from file list
   */
  static create(files: FileChange[]): Changes {
    return new Changes({ files: [...files] });
  }

  /**
   * Add a file change
   */
  add(change: FileChange): Changes {
    const existing = this.props.files.findIndex(f => f.path === change.path);
    const newFiles = [...this.props.files];
    
    if (existing >= 0) {
      newFiles[existing] = change;
    } else {
      newFiles.push(change);
    }

    return new Changes({ files: newFiles });
  }

  /**
   * Remove a file change
   */
  remove(path: string): Changes {
    const newFiles = this.props.files.filter(f => f.path !== path);
    return new Changes({ files: newFiles });
  }

  /**
   * Get a summary of changes
   */
  getSummary(): string {
    if (this.isEmpty()) {
      return 'No changes';
    }

    const counts = this.props.files.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = Object.entries(counts)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');

    return `${this.fileCount} files changed (${parts})`;
  }
}