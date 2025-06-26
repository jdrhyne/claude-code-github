import { describe, it, expect } from 'vitest';
import { CommitMessage } from '../commit-message.js';

describe('CommitMessage', () => {
  describe('create', () => {
    it('should create valid commit message', () => {
      const result = CommitMessage.create('feat: add user authentication');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('feat: add user authentication');
    });

    it('should fail with empty message', () => {
      const result = CommitMessage.create('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail with message too short', () => {
      const result = CommitMessage.create('fix');
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should fail with message too long', () => {
      const longMessage = 'a'.repeat(5001);
      const result = CommitMessage.create(longMessage);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot exceed 5000 characters');
    });

    it('should trim whitespace', () => {
      const result = CommitMessage.create('  feat: add feature  ');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('feat: add feature');
    });
  });

  describe('subject and body', () => {
    it('should extract subject line', () => {
      const message = CommitMessage.create('feat: add feature\n\nThis is the body').value;
      expect(message.subject).toBe('feat: add feature');
    });

    it('should extract body', () => {
      const message = CommitMessage.create('feat: add feature\n\nThis is the body\nWith multiple lines').value;
      expect(message.body).toBe('This is the body\nWith multiple lines');
    });

    it('should return empty body for single line message', () => {
      const message = CommitMessage.create('feat: add feature').value;
      expect(message.body).toBe('');
    });
  });

  describe('isConventionalCommit', () => {
    it('should recognize conventional commits', () => {
      const conventionalFormats = [
        'feat: add feature',
        'fix: resolve bug',
        'docs: update readme',
        'style: format code',
        'refactor: improve structure',
        'test: add tests',
        'chore: update deps',
        'build: update config',
        'ci: fix pipeline',
        'perf: optimize query',
        'revert: undo change',
        'feat(auth): add login',
        'fix(api): handle error'
      ];

      conventionalFormats.forEach(format => {
        const message = CommitMessage.create(format).value;
        expect(message.isConventionalCommit()).toBe(true);
      });
    });

    it('should reject non-conventional commits', () => {
      const nonConventional = [
        'Add new feature',
        'Fixed the bug',
        'Update: new feature',
        'feature: add auth',
        'feat add feature',
        'feat:add feature'
      ];

      nonConventional.forEach(format => {
        const message = CommitMessage.create(format).value;
        expect(message.isConventionalCommit()).toBe(false);
      });
    });
  });

  describe('equality', () => {
    it('should be equal for same message', () => {
      const msg1 = CommitMessage.create('feat: add feature').value;
      const msg2 = CommitMessage.create('feat: add feature').value;
      expect(msg1.equals(msg2)).toBe(true);
    });

    it('should not be equal for different messages', () => {
      const msg1 = CommitMessage.create('feat: add feature').value;
      const msg2 = CommitMessage.create('fix: resolve bug').value;
      expect(msg1.equals(msg2)).toBe(false);
    });
  });
});