import { Router } from 'express';
import { DevelopmentTools } from '../../development-tools.js';
import { APIResponse } from '../types.js';
import { requireScopes } from '../middleware/auth.js';

export const statusRoutes = Router();

// Get current development status
statusRoutes.get('/', requireScopes('read:status'), async (req, res): Promise<void> => {
  try {
    const tools = req.app.locals.developmentTools as DevelopmentTools;
    const status = await tools.getStatus();
    
    const response: APIResponse = {
      success: true,
      data: {
        project: {
          branch: status.branch,
          is_protected: status.is_protected,
          uncommitted_changes: status.uncommitted_changes
        },
        suggestions: status.suggestions || [],
        hints: status.hints || []
      }
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Status error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error.message || 'Failed to fetch development status'
      }
    };

    void res.status(500).json(response);
  }
});

// Get enhanced status with more details
statusRoutes.get('/enhanced', requireScopes('read:status'), async (req, res): Promise<void> => {
  try {
    const tools = req.app.locals.developmentTools as DevelopmentTools;
    const status = await tools.getEnhancedStatus();
    
    const response: APIResponse = {
      success: true,
      data: status
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Enhanced status error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error.message || 'Failed to fetch enhanced status'
      }
    };

    void res.status(500).json(response);
  }
});

// Get monitoring status
statusRoutes.get('/monitoring', requireScopes('read:status'), async (req, res): Promise<void> => {
  try {
    const tools = req.app.locals.developmentTools as DevelopmentTools;
    const monitoringStatus = tools.getMonitoringStatus();
    
    const response: APIResponse = {
      success: true,
      data: monitoringStatus
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Monitoring status error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: error.message || 'Failed to fetch monitoring status'
      }
    };

    void res.status(500).json(response);
  }
});