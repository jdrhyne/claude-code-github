import { Router } from 'express';
import { SuggestionStore } from '../stores/suggestion-store.js';
import { DevelopmentTools } from '../../development-tools.js';
import { APIResponse, EventFilters } from '../types.js';
import { requireScopes, AuthenticatedRequest } from '../middleware/auth.js';
import Joi from 'joi';

export const suggestionsRoutes = Router();

// Validation schemas
const querySchema = Joi.object({
  project: Joi.string(),
  type: Joi.string(),
  since: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const dismissSchema = Joi.object({
  reason: Joi.string()
});

const actionSchema = Joi.object({
  action: Joi.string().required(),
  params: Joi.object()
});

// Get suggestions
suggestionsRoutes.get('/', requireScopes('read:suggestions'), async (req: AuthenticatedRequest, res) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const store = req.app.locals.suggestionStore as SuggestionStore;
    const filters: EventFilters = {
      project: value.project,
      type: value.type,
      since: value.since ? new Date(value.since) : undefined,
      limit: value.limit
    };

    const suggestions = store.getSuggestions(filters);
    const stats = store.getStats();

    const response: APIResponse = {
      success: true,
      data: {
        suggestions,
        total: suggestions.length,
        stats
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API] Get suggestions error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'SUGGESTIONS_ERROR',
        message: error.message || 'Failed to fetch suggestions'
      }
    };

    res.status(500).json(response);
  }
});

// Get single suggestion
suggestionsRoutes.get('/:id', requireScopes('read:suggestions'), async (req, res) => {
  try {
    const store = req.app.locals.suggestionStore as SuggestionStore;
    const suggestion = store.getSuggestion(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Suggestion not found'
        }
      });
    }

    const response: APIResponse = {
      success: true,
      data: suggestion
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API] Get suggestion error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'SUGGESTION_ERROR',
        message: error.message || 'Failed to fetch suggestion'
      }
    };

    res.status(500).json(response);
  }
});

// Dismiss suggestion
suggestionsRoutes.post('/:id/dismiss', requireScopes('write:suggestions'), async (req, res) => {
  try {
    // Validate body
    const { error } = dismissSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const store = req.app.locals.suggestionStore as SuggestionStore;
    const dismissed = store.dismissSuggestion(req.params.id);

    if (!dismissed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Suggestion not found'
        }
      });
    }

    const response: APIResponse = {
      success: true,
      data: {
        id: req.params.id,
        dismissed: true
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API] Dismiss suggestion error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'DISMISS_ERROR',
        message: error.message || 'Failed to dismiss suggestion'
      }
    };

    res.status(500).json(response);
  }
});

// Execute suggestion action
suggestionsRoutes.post('/:id/action', requireScopes('write:suggestions', 'execute:actions'), async (req, res) => {
  try {
    // Validate body
    const { error, value } = actionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const store = req.app.locals.suggestionStore as SuggestionStore;
    const suggestion = store.getSuggestion(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Suggestion not found'
        }
      });
    }

    // Verify action is valid for this suggestion
    const validAction = suggestion.actions?.find(a => a.type === value.action);
    if (!validAction) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Action '${value.action}' is not valid for this suggestion`
        }
      });
    }

    // Execute the action
    const tools = req.app.locals.developmentTools as DevelopmentTools;
    let result: any;

    switch (value.action) {
      case 'commit':
        result = await tools.checkpoint({
          message: value.params?.message || suggestion.message
        });
        break;
      
      case 'create_branch':
        result = await tools.createBranch({
          name: value.params?.name || 'feature',
          type: value.params?.type || 'feature',
          message: value.params?.message || 'Initial commit'
        });
        break;
      
      default:
        return res.status(501).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: `Action '${value.action}' is not implemented`
          }
        });
    }

    // Mark suggestion as actioned
    store.actionSuggestion(req.params.id, value.action, value.params);

    const response: APIResponse = {
      success: true,
      data: {
        id: req.params.id,
        action: value.action,
        result
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API] Action suggestion error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'ACTION_ERROR',
        message: error.message || 'Failed to execute suggestion action'
      }
    };

    res.status(500).json(response);
  }
});