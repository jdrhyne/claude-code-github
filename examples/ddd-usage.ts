#!/usr/bin/env ts-node
/**
 * Example of using the new DDD architecture
 */

import { ConfigManager } from '../src/config.js';
import { GitManager } from '../src/git.js';
import { GitOperationsContext } from '../src/contexts/git-operations/index.js';
import { FeatureFlags } from '../src/migration/feature-flags.js';

async function main() {
  console.log('🚀 DDD Architecture Example\n');

  // Initialize dependencies
  const configManager = new ConfigManager();
  const gitManager = new GitManager();
  
  // Enable DDD feature flag
  const featureFlags = new FeatureFlags();
  featureFlags.enable('use_ddd_git_operations');
  
  console.log('Feature flags:', featureFlags.getAll());
  console.log(`Migration progress: ${featureFlags.getMigrationProgress()}%\n`);

  // Create Git Operations context
  const gitOpsContext = new GitOperationsContext({
    configManager,
    gitManager,
    getCurrentProjectPath: async () => '/Users/admin/Projects/claude-code-github'
  });

  console.log('✅ Git Operations context initialized\n');

  // Example 1: Using MCP tools
  console.log('📦 Available MCP tools:');
  const tools = gitOpsContext.getMcpTools();
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  // Example 2: Using the API
  console.log('\n🌐 API Routes:');
  console.log('  GET  /api/v2/git/repositories');
  console.log('  GET  /api/v2/git/repositories/:id/status');
  console.log('  POST /api/v2/git/repositories/:id/branches');
  console.log('  POST /api/v2/git/repositories/:id/commits');

  // Example 3: Domain model usage
  console.log('\n🏗️  Domain Model Example:');
  
  const code = `
// Creating a branch through the domain model
const repository = await gitRepository.findById('/path/to/repo');

const branchResult = repository.createBranch({
  name: 'user-auth',
  type: BranchType.FEATURE
});

if (branchResult.isSuccess) {
  console.log('Branch created:', branchResult.value.name);
}

// Domain events are automatically emitted
const events = repository.getUncommittedEvents();
events.forEach(event => {
  console.log('Event:', event.eventType, event.payload);
});
`;

  console.log(code);

  // Example 4: Parallel mode
  console.log('\n🔄 Parallel Mode:');
  console.log('Enable parallel mode to run both legacy and DDD implementations:');
  console.log('  featureFlags.enable("parallel_run_mode");');
  console.log('  This helps validate the new implementation against the existing one.');

  // Cleanup
  gitOpsContext.dispose();
  console.log('\n✨ Example completed!');
}

// Run the example
main().catch(console.error);