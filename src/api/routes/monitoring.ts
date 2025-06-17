import { Router, RequestHandler } from 'express';
import { EventStore } from '../stores/event-store.js';
import { APIResponse, EventFilters } from '../types.js';
import { requireScopes } from '../middleware/auth.js';
import Joi from 'joi';

export const monitoringRoutes = Router();

// Validation schema for query parameters
const querySchema = Joi.object({
  type: Joi.string(),
  project: Joi.string(),
  since: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(1000).default(100)
});

// Get monitoring events
const getEventsHandler: RequestHandler = async (req, res): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
      return;
    }

    const store = req.app.locals.eventStore as EventStore;
    const filters: EventFilters = {
      type: value.type,
      project: value.project,
      since: value.since ? new Date(value.since) : undefined,
      limit: value.limit
    };

    const events = store.getEvents(filters);
    const stats = store.getStats();

    const response: APIResponse = {
      success: true,
      data: {
        events,
        total: events.length,
        stats
      }
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Get events error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'EVENTS_ERROR',
        message: error.message || 'Failed to fetch events'
      }
    };

    void res.status(500).json(response);
  }
};

monitoringRoutes.get('/events', requireScopes('read:monitoring'), getEventsHandler);

// Get event statistics
monitoringRoutes.get('/stats', requireScopes('read:monitoring'), async (req, res): Promise<void> => {
  try {
    const eventStore = req.app.locals.eventStore as EventStore;
    const suggestionStore = req.app.locals.suggestionStore;
    
    const eventStats = eventStore.getStats();
    const suggestionStats = suggestionStore.getStats();

    const response: APIResponse = {
      success: true,
      data: {
        events: eventStats,
        suggestions: suggestionStats,
        timestamp: new Date().toISOString()
      }
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Get stats error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message || 'Failed to fetch statistics'
      }
    };

    void res.status(500).json(response);
  }
});

// Get specific event
monitoringRoutes.get('/events/:id', requireScopes('read:monitoring'), async (req, res): Promise<void> => {
  try {
    const store = req.app.locals.eventStore as EventStore;
    const event = store.getEvent(req.params.id);

    if (!event) {
      void res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event not found'
        }
      });
      return;
    }

    const response: APIResponse = {
      success: true,
      data: event
    };

    void res.json(response);
  } catch (error: any) {
    console.error('[API] Get event error:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'EVENT_ERROR',
        message: error.message || 'Failed to fetch event'
      }
    };

    void res.status(500).json(response);
  }
});

// Server-sent events endpoint for real-time streaming
monitoringRoutes.get('/stream', requireScopes('read:monitoring'), (req, res): void => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  // Send initial connection message
  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':\n\n'); // SSE comment to keep alive
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });

  // Store the response object for sending events
  // This would be used by the event emitter to send real-time updates
  const clients = req.app.locals.sseClients || [];
  clients.push(res);
  req.app.locals.sseClients = clients;

  // Remove client on disconnect
  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
});