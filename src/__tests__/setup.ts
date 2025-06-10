import { beforeAll, afterAll } from 'vitest';
import { getSharedMock, cleanupSharedMock } from './utils/persistent-mock.js';

beforeAll(async () => {
  await getSharedMock();
});

afterAll(async () => {
  await cleanupSharedMock();
});