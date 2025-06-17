import rateLimit from 'express-rate-limit';
import { RateLimitConfig } from '../types.js';
import { AuthenticatedRequest } from './auth.js';

export function rateLimitMiddleware(config?: RateLimitConfig) {
  if (!config?.enabled) {
    return (_req: any, _res: any, next: any) => next();
  }

  return rateLimit({
    windowMs: (config.window || 60) * 1000, // Convert seconds to milliseconds
    max: config.max_requests || 100,
    keyGenerator: (req: AuthenticatedRequest) => {
      if (config.by === 'token' && req.auth?.token) {
        return req.auth.token.name;
      }
      // Default to IP-based rate limiting
      return req.ip || 'unknown';
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: {
            retry_after: Math.ceil(req.rateLimit?.resetTime ? 
              (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 
              config.window || 60
            )
          }
        }
      });
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    skip: (req: AuthenticatedRequest) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
}