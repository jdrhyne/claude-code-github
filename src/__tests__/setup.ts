import { beforeAll, afterAll, vi } from 'vitest';
import { getSharedMock, cleanupSharedMock } from './utils/persistent-mock.js';

// Mock process.exit to prevent tests from actually exiting
vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit unexpectedly called with "${code}"`);
});

beforeAll(async () => {
  await getSharedMock();
});

afterAll(async () => {
  await cleanupSharedMock();
});