import { Request, Response, NextFunction } from 'express';
import { AuthConfig, AuthToken } from '../types.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    token: AuthToken;
    type: 'bearer' | 'api_key';
  };
}

export function authMiddleware(config?: AuthConfig) {
  // If auth is disabled, allow all requests
  if (!config?.enabled) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  const tokenMap = new Map<string, AuthToken>();
  for (const token of config.tokens) {
    tokenMap.set(token.token, token);
  }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip auth for health check
    if (req.path === '/health') {
      return next();
    }

    let providedToken: string | undefined;

    if (config.type === 'bearer') {
      // Check Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        providedToken = authHeader.substring(7);
      }
    } else if (config.type === 'api_key') {
      // Check X-API-Key header or query param
      providedToken = req.headers['x-api-key'] as string || req.query.api_key as string;
    }

    if (!providedToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authentication token'
        }
      });
      return;
    }

    const authToken = tokenMap.get(providedToken);
    if (!authToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
      return;
    }

    // Check scopes if needed (implement scope checking based on route)
    req.auth = {
      token: authToken,
      type: config.type
    };

    next();
  };
}

export async function verifyToken(token: string, config?: AuthConfig): Promise<AuthToken | null> {
  if (!config?.enabled) {
    return null;
  }

  const authToken = config.tokens.find(t => t.token === token);
  return authToken || null;
}

export function requireScopes(...requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const userScopes = req.auth.token.scopes;
    const hasAllScopes = requiredScopes.every(scope => 
      userScopes.includes(scope) || userScopes.includes('*')
    );

    if (!hasAllScopes) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
        }
      });
      return;
    }

    next();
  };
}