import { Router } from 'express';
import { GitOperationsHandlers } from './handlers.js';
import { validateRequest } from './validation.js';
import {
  CreateBranchSchema,
  CreateCommitSchema,
  GetRepositoryStatusSchema,
  CheckoutBranchSchema
} from './validation.js';

/**
 * Create Git Operations router
 */
export function createGitOperationsRouter(handlers: GitOperationsHandlers): Router {
  const router = Router();

  // Repository endpoints
  router.get('/repositories', handlers.listRepositories);

  router.get(
    '/repositories/:repoId/status',
    validateRequest(GetRepositoryStatusSchema),
    handlers.getRepositoryStatus
  );

  // Branch operations
  router.post(
    '/repositories/:repoId/branches',
    validateRequest(CreateBranchSchema),
    handlers.createBranch
  );

  // Commit operations
  router.post(
    '/repositories/:repoId/commits',
    validateRequest(CreateCommitSchema),
    handlers.createCommit
  );

  return router;
}

/**
 * Error handling middleware
 */
export function errorHandler(err: Error, req: any, res: any, next: any): void {
  console.error('API Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
    requestId: req.id || 'unknown'
  });
}