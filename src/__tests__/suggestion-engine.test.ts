import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionEngine, WorkContext } from '../suggestion-engine.js';
import { DevelopmentStatus, Config } from '../types.js';

describe('SuggestionEngine', () => {
  let suggestionEngine: SuggestionEngine;
  let config: Config;

  beforeEach(() => {
    config = {
      git_workflow: {
        main_branch: 'main',
        protected_branches: ['main', 'master', 'develop'],
        branch_prefixes: {
          feature: 'feature/',
          bugfix: 'bugfix/',
          refactor: 'refactor/'
        },
        auto_push: false
      },
      suggestions: {
        enabled: true,
        protected_branch_warnings: true,
        time_reminders: {
          enabled: true,
          warning_threshold_minutes: 120,
          reminder_threshold_minutes: 60
        },
        large_changeset: {
          enabled: true,
          threshold: 5
        },
        pattern_recognition: true,
        pr_suggestions: true,
        change_pattern_suggestions: true,
        branch_suggestions: true
      },
      projects: []
    };

    suggestionEngine = new SuggestionEngine(config);
  });

  describe('Protected branch warnings', () => {
    it('should warn when working on protected branch with uncommitted changes', () => {
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 3,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        type: 'warning',
        priority: 'high',
        message: "You're working directly on protected branch 'main'",
        action: 'dev_create_branch'
      });
    });

    it('should not warn on protected branch with no changes', () => {
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Uncommitted changes suggestions', () => {
    it('should suggest commit when 5+ files changed', () => {
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 7,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const commitSuggestion = suggestions.find(s => s.type === 'commit');
      expect(commitSuggestion).toBeDefined();
      expect(commitSuggestion?.message).toContain('7 uncommitted files');
    });

    it('should suggest splitting mixed changes', () => {
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 3,
          diff_summary: 'changes',
          files_changed: [
            { file: 'new.ts', status: 'Added' },
            { file: 'existing.ts', status: 'Modified' },
            { file: 'old.ts', status: 'Deleted' }
          ]
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const mixedSuggestion = suggestions.find(s => 
        s.message.includes('mixed changes')
      );
      expect(mixedSuggestion).toBeDefined();
    });
  });

  describe('Time-based suggestions', () => {
    it('should suggest checkpoint after 2 hours of uncommitted work', () => {
      const projectPath = '/test/project';
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 2,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      // First call to set uncommitted start time
      suggestionEngine.analyzeSituation(projectPath, status);

      // Simulate 2.5 hours passing
      // Access private property for testing
      const context = (suggestionEngine as unknown as { workContexts: Map<string, WorkContext> }).workContexts.get(projectPath);
      context.uncommittedStartTime = new Date(Date.now() - 150 * 60 * 1000); // 150 minutes ago

      const suggestions = suggestionEngine.analyzeSituation(projectPath, status);
      
      const timeSuggestion = suggestions.find(s => 
        s.type === 'checkpoint' && s.priority === 'high'
      );
      expect(timeSuggestion).toBeDefined();
      expect(timeSuggestion?.message).toMatch(/over \d+ hours/);
    });
  });

  describe('Change pattern detection', () => {
    it('should recognize test and implementation changes', () => {
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 2,
          diff_summary: 'changes',
          files_changed: [
            { file: 'src/feature.ts', status: 'Added' },
            { file: 'src/__tests__/feature.test.ts', status: 'Added' }
          ]
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const testSuggestion = suggestions.find(s => 
        s.message.includes('implementation and test')
      );
      expect(testSuggestion).toBeDefined();
    });

    it('should recognize documentation updates with code', () => {
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 2,
          diff_summary: 'changes',
          files_changed: [
            { file: 'src/feature.ts', status: 'Modified' },
            { file: 'README.md', status: 'Modified' }
          ]
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const docSuggestion = suggestions.find(s => 
        s.message.includes('Documentation')
      );
      expect(docSuggestion).toBeDefined();
    });
  });

  describe('Branch suggestions', () => {
    it('should suggest feature branch when adding components on main', () => {
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: false,
        uncommitted_changes: {
          file_count: 1,
          diff_summary: 'changes',
          files_changed: [
            { file: 'src/components/NewFeature.tsx', status: 'Added' }
          ]
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const branchSuggestion = suggestions.find(s => s.type === 'branch');
      expect(branchSuggestion).toBeDefined();
      expect(branchSuggestion?.priority).toBe('high');
    });
  });

  describe('PR readiness detection', () => {
    it('should suggest PR when on feature branch with clean working directory', () => {
      const status: DevelopmentStatus = {
        branch: 'feature/awesome-feature',
        is_protected: false,
        uncommitted_changes: {
          file_count: 0,
          diff_summary: '',
          files_changed: []
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const prSuggestion = suggestions.find(s => s.type === 'pr');
      expect(prSuggestion).toBeDefined();
      expect(prSuggestion?.action).toBe('dev_create_pull_request');
    });

    it('should not suggest PR on main branch', () => {
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      const prSuggestion = suggestions.find(s => s.type === 'pr');
      expect(prSuggestion).toBeUndefined();
    });
  });

  describe('Contextual hints', () => {
    it('should provide hints for new sessions', () => {
      const projectPath = '/test/project';
      const hints = suggestionEngine.getContextualHints(projectPath);
      
      expect(hints).toContain("Starting a new session? Run 'dev_status' to see your current state.");
    });

    it('should provide hints after recent commit', () => {
      const projectPath = '/test/project';
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 1,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      // Simulate commit by having changes then no changes
      suggestionEngine.analyzeSituation(projectPath, status);
      
      const cleanStatus: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false
      };
      suggestionEngine.analyzeSituation(projectPath, cleanStatus);

      const hints = suggestionEngine.getContextualHints(projectPath);
      
      const prHint = hints.find(h => h.includes('Consider creating a PR'));
      expect(prHint).toBeDefined();
    });
  });

  describe('Priority sorting', () => {
    it('should sort suggestions by priority', () => {
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 10,
          diff_summary: 'changes',
          files_changed: [
            { file: 'src/feature.ts', status: 'Added' },
            { file: 'README.md', status: 'Modified' }
          ]
        }
      };

      const suggestions = suggestionEngine.analyzeSituation('/test/project', status);
      
      // Should have multiple suggestions
      expect(suggestions.length).toBeGreaterThan(1);
      
      // Check that high priority items come first
      const priorities = suggestions.map(s => s.priority);
      const priorityValues = priorities.map(p => 
        p === 'high' ? 0 : p === 'medium' ? 1 : 2
      );
      
      // Check if sorted
      for (let i = 1; i < priorityValues.length; i++) {
        expect(priorityValues[i]).toBeGreaterThanOrEqual(priorityValues[i - 1]);
      }
    });
  });

  describe('Configuration control', () => {
    it('should disable all suggestions when globally disabled', () => {
      config.suggestions!.enabled = false;
      const localEngine = new SuggestionEngine(config);
      
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 10,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = localEngine.analyzeSituation('/test/project', status);
      expect(suggestions).toHaveLength(0);
    });

    it('should disable protected branch warnings when configured', () => {
      config.suggestions!.protected_branch_warnings = false;
      const localEngine = new SuggestionEngine(config);
      
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 3,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = localEngine.analyzeSituation('/test/project', status);
      const protectedBranchSuggestion = suggestions.find(s => s.type === 'warning');
      expect(protectedBranchSuggestion).toBeUndefined();
    });

    it('should use custom thresholds for large changesets', () => {
      config.suggestions!.large_changeset.threshold = 10;
      const localEngine = new SuggestionEngine(config);
      
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 7, // Less than new threshold of 10
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = localEngine.analyzeSituation('/test/project', status);
      const commitSuggestion = suggestions.find(s => s.type === 'commit');
      expect(commitSuggestion).toBeUndefined();
    });

    it('should use custom time thresholds', () => {
      config.suggestions!.time_reminders.warning_threshold_minutes = 30;
      config.suggestions!.time_reminders.reminder_threshold_minutes = 15;
      const localEngine = new SuggestionEngine(config);
      
      const projectPath = '/test/project';
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 2,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      // First call to set uncommitted start time
      localEngine.analyzeSituation(projectPath, status);

      // Simulate 45 minutes passing (should trigger high priority warning with custom threshold)
      const context = (localEngine as unknown as { workContexts: Map<string, WorkContext> }).workContexts.get(projectPath);
      context!.uncommittedStartTime = new Date(Date.now() - 45 * 60 * 1000);

      const suggestions = localEngine.analyzeSituation(projectPath, status);
      const timeSuggestion = suggestions.find(s => s.type === 'checkpoint' && s.priority === 'high');
      expect(timeSuggestion).toBeDefined();
    });

    it('should support per-project overrides', () => {
      // Add a project with suggestions disabled
      config.projects = [{
        path: '/test/project',
        github_repo: 'test/repo',
        suggestions: {
          enabled: false
        }
      }];
      const localEngine = new SuggestionEngine(config);
      
      const status: DevelopmentStatus = {
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 10,
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = localEngine.analyzeSituation('/test/project', status);
      expect(suggestions).toHaveLength(0);
    });

    it('should use project-specific thresholds', () => {
      // Add a project with custom threshold
      config.projects = [{
        path: '/test/project',
        github_repo: 'test/repo',
        suggestions: {
          large_changeset: {
            threshold: 15
          }
        }
      }];
      const localEngine = new SuggestionEngine(config);
      
      const status: DevelopmentStatus = {
        branch: 'feature/test',
        is_protected: false,
        uncommitted_changes: {
          file_count: 10, // Less than project threshold of 15
          diff_summary: 'changes',
          files_changed: []
        }
      };

      const suggestions = localEngine.analyzeSituation('/test/project', status);
      const commitSuggestion = suggestions.find(s => s.type === 'commit');
      expect(commitSuggestion).toBeUndefined();
    });
  });
});