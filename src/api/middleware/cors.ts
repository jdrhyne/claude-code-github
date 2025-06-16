import cors from 'cors';
import { CorsConfig } from '../types.js';

export function corsMiddleware(config?: CorsConfig) {
  if (!config?.enabled) {
    // Return a no-op middleware
    return (_req: any, _res: any, next: any) => next();
  }

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches any allowed pattern
      const isAllowed = config.origins.some(pattern => {
        if (pattern === '*') return true;
        
        // Support wildcard subdomain matching (e.g., "*.example.com")
        if (pattern.includes('*')) {
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
          );
          return regex.test(origin);
        }
        
        return origin === pattern;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: config.headers || ['Authorization', 'Content-Type', 'X-API-Key'],
    credentials: config.credentials ?? true,
    maxAge: 86400 // 24 hours
  };

  return cors(corsOptions);
}