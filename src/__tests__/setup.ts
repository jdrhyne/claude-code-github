import { beforeAll, afterAll, vi } from 'vitest';
import { getSharedMock, cleanupSharedMock } from './utils/persistent-mock.js';
import { createMockEnvironment } from './utils/test-helpers.js';

// Mock process.exit to prevent tests from actually exiting
vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit unexpectedly called with "${code}"`);
});

// Mock environment including process.cwd()
let mockEnv: ReturnType<typeof createMockEnvironment>;

beforeAll(async () => {
  mockEnv = createMockEnvironment();
  await getSharedMock();
});

afterAll(async () => {
  await cleanupSharedMock();
  mockEnv?.restore();
});