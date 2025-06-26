import { z } from 'zod';
import { BranchType } from '../domain/types.js';

/**
 * Validation schemas for Git Operations API
 */

export const CreateBranchSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Branch name is required')
      .max(100, 'Branch name too long')
      .regex(/^[a-zA-Z0-9\-_]+$/, 'Branch name can only contain letters, numbers, hyphens, and underscores'),
    type: z.nativeEnum(BranchType),
    commitMessage: z.string()
      .min(10, 'Commit message must be at least 10 characters')
      .max(5000, 'Commit message too long')
  })
});

export const CreateCommitSchema = z.object({
  body: z.object({
    message: z.string()
      .min(10, 'Commit message must be at least 10 characters')
      .max(5000, 'Commit message too long'),
    author: z.string().optional(),
    email: z.string().email().optional()
  })
});

export const GetRepositoryStatusSchema = z.object({
  params: z.object({
    repoId: z.string()
  }),
  query: z.object({
    include: z.array(z.enum(['changes', 'branches', 'remotes', 'stash'])).optional()
  }).optional()
});

export const CheckoutBranchSchema = z.object({
  params: z.object({
    repoId: z.string()
  }),
  body: z.object({
    branchName: z.string()
  })
});

/**
 * Express middleware for request validation
 */
export function validateRequest(schema: z.ZodSchema) {
  return async (req: any, res: any, next: any) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // Replace request properties with validated data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;
      
      next();
    } catch (_error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        next(error);
      }
    }
  };
}