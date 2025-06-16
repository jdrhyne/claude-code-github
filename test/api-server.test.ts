import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { APIServer } from '../src/api/server.js';
import { APIConfig } from '../src/api/types.js';
import { DevelopmentTools } from '../src/development-tools.js';

// Mock DevelopmentTools
vi.mock('../src/development-tools.js');

describe('API Server', () => {
  let server: APIServer;
  let request: supertest.SuperTest<supertest.Test>;
  let mockDevTools: any;

  const testConfig: APIConfig = {
    enabled: true,
    type: 'http',
    port: 0, // Use random port
    host: '127.0.0.1',
    auth: {
      enabled: true,
      type: 'bearer',
      tokens: [{
        name: 'test',
        token: 'test-token',
        scopes: ['*']
      }]
    },
    cors: {
      enabled: true,
      origins: ['*']
    },
    rateLimit: {
      enabled: false // Disable for tests
    }
  };

  beforeEach(async () => {
    // Create mock development tools
    mockDevTools = {
      getStatus: vi.fn().mockResolvedValue({
        branch: 'main',
        is_protected: true,
        uncommitted_changes: {
          file_count: 2,
          files_changed: [
            { file: 'test.js', status: 'modified' }
          ]
        },
        suggestions: [{
          type: 'commit',
          message: 'You have uncommitted changes'
        }]
      }),
      getEnhancedStatus: vi.fn().mockResolvedValue({
        project: { path: '/test', repo: 'test/repo' },
        branch: { current: 'main', isProtected: true }
      }),
      getMonitoringStatus: vi.fn().mockReturnValue({
        enabled: true,
        events: []
      })
    };

    server = new APIServer(testConfig, mockDevTools as any);
    await server.start();
    request = supertest(server.getApp());
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    it('should return health status without auth', async () => {
      const response = await request
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request
        .get('/api/v1/status')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authentication token'
        }
      });
    });

    it('should reject invalid tokens', async () => {
      const response = await request
        .get('/api/v1/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should accept valid tokens', async () => {
      const response = await request
        .get('/api/v1/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Status Endpoint', () => {
    it('should return development status', async () => {
      const response = await request
        .get('/api/v1/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          project: {
            branch: 'main',
            is_protected: true,
            uncommitted_changes: {
              file_count: 2,
              files_changed: [
                { file: 'test.js', status: 'modified' }
              ]
            }
          },
          suggestions: [{
            type: 'commit',
            message: 'You have uncommitted changes'
          }],
          hints: []
        }
      });

      expect(mockDevTools.getStatus).toHaveBeenCalled();
    });

    it('should return enhanced status', async () => {
      const response = await request
        .get('/api/v1/status/enhanced')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('project');
      expect(response.body.data).toHaveProperty('branch');
      expect(mockDevTools.getEnhancedStatus).toHaveBeenCalled();
    });
  });

  describe('Suggestions Endpoint', () => {
    it('should return suggestions list', async () => {
      const response = await request
        .get('/api/v1/suggestions')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should validate query parameters', async () => {
      const response = await request
        .get('/api/v1/suggestions?limit=invalid')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should filter suggestions', async () => {
      // Add some test suggestions
      const store = server.getSuggestionStore();
      store.addSuggestion({
        project: '/test',
        type: 'commit',
        priority: 'medium',
        message: 'Test suggestion',
        actions: []
      });

      const response = await request
        .get('/api/v1/suggestions?type=commit&limit=10')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.data.suggestions).toHaveLength(1);
      expect(response.body.data.suggestions[0].type).toBe('commit');
    });
  });

  describe('Event Store', () => {
    it('should store and retrieve events', async () => {
      const eventStore = server.getEventStore();
      
      // Add test event
      const event = eventStore.addEvent({
        type: 'test.event',
        project: '/test',
        data: { message: 'Test event' }
      });

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');

      // Retrieve event
      const retrieved = eventStore.getEvent(event.id);
      expect(retrieved).toEqual(event);

      // Get events with filters
      const events = eventStore.getEvents({ type: 'test.event' });
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request
        .get('/api/v1/nonexistent')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint GET /api/v1/nonexistent not found'
        }
      });
    });

    it('should handle internal errors', async () => {
      mockDevTools.getStatus.mockRejectedValue(new Error('Test error'));

      const response = await request
        .get('/api/v1/status')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATUS_ERROR');
    });
  });
});