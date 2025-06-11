#!/usr/bin/env node

/**
 * Test script to manually check intelligent suggestions
 * Run this to see what suggestions would be generated for your current project state
 */

const { GitManager } = require('./dist/git');
const { SuggestionEngine } = require('./dist/suggestion-engine');
const { FileWatcher } = require('./dist/file-watcher');
const path = require('path');

async function testSuggestions() {
  const projectPath = process.cwd();
  console.log(`\n🔍 Testing suggestions for: ${projectPath}\n`);

  try {
    // Initialize managers
    const gitManager = new GitManager();
    const fileWatcher = new FileWatcher();

    // Create mock config
    const config = {
      git_workflow: {
        main_branch: 'main',
        protected_branches: ['main', 'master', 'develop']
      },
      suggestions: {
        enabled: true,
        time_based_commits: {
          enabled: true,
          reminder_minutes: 60,
          warning_minutes: 120
        },
        branch_protection: { enabled: true },
        commit_size: {
          enabled: true,
          max_files: 5
        },
        pr_suggestions: { enabled: true }
      }
    };

    // Get current status
    console.log('📊 Getting project status...\n');
    
    const branchInfo = await gitManager.getBranchInfo(projectPath);
    console.log(`Current branch: ${branchInfo.current}`);
    console.log(`Tracking: ${branchInfo.tracking || 'none'}`);
    
    const changes = await gitManager.getUncommittedChanges(projectPath);
    if (changes && changes.files) {
      console.log(`\nUncommitted changes: ${changes.files.length} files`);
      changes.files.forEach(f => console.log(`  - ${f.file} (${f.status})`));
    } else {
      console.log('\nNo uncommitted changes');
    }

    // Create development status
    const status = {
      project_path: projectPath,
      branch: branchInfo.current,
      tracking_branch: branchInfo.tracking,
      is_protected: config.git_workflow.protected_branches.includes(branchInfo.current),
      uncommitted_changes: changes,
      last_commit_time: new Date(Date.now() - 90 * 60 * 1000), // Simulate 90 minutes ago
      unpushed_commits: 0,
      open_pull_request: null
    };

    // Initialize suggestion engine with config
    const suggestionEngine = new SuggestionEngine(config);
    
    // Get suggestions
    console.log('\n🤖 Analyzing for suggestions...\n');
    const suggestions = suggestionEngine.analyzeSituation(projectPath, status);

    if (suggestions.length === 0) {
      console.log('✨ No suggestions at this time - you\'re all good!');
    } else {
      console.log(`Found ${suggestions.length} suggestion(s):\n`);
      
      suggestions.forEach((suggestion, index) => {
        const icon = suggestion.priority === 'high' ? '🔴' : 
                    suggestion.priority === 'medium' ? '🟡' : '🟢';
        
        console.log(`${icon} Suggestion ${index + 1}: ${suggestion.type}`);
        console.log(`   Priority: ${suggestion.priority}`);
        console.log(`   Message: ${suggestion.message}`);
        if (suggestion.action) {
          console.log(`   Action: ${suggestion.action}`);
        }
        console.log('');
      });
    }

    // Cleanup
    fileWatcher.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure you run this from a git repository');
  }
}

// Run the test
testSuggestions().catch(console.error);