import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookManager, WebhookEvent } from '../src/webhooks/manager.js';
import { WebhookConfig, WebhookEndpoint } from '../src/api/types.js';
import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';

// Mock http/https modules
vi.mock('http');
vi.mock('https');

describe('Webhook Manager - Basic Tests', () => {
  let manager: WebhookManager;
  let config: WebhookConfig;
  let mockHttpRequest: any;
  let mockHttpsRequest: any;

  beforeEach(() => {
    config = {
      enabled: true,
      signing_secret: 'test-secret',
      endpoints: []
    };

    // Create mock request
    mockHttpRequest = {
      on: vi.fn().mockReturnThis(),
      write: vi.fn(),
      end: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn()
    };

    mockHttpsRequest = {
      on: vi.fn().mockReturnThis(),
      write: vi.fn(),
      end: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn()
    };

    // Setup mocks for successful response
    const createMockResponse = (statusCode: number = 200) => {
      const response = new EventEmitter();
      (response as any).statusCode = statusCode;
      
      // Simulate response
      setTimeout(() => {
        response.emit('data', '{"success":true}');
        response.emit('end');
      }, 10);
      
      return response;
    };

    vi.mocked(http).request = vi.fn((options, callback) => {
      if (callback) callback(createMockResponse() as any);
      return mockHttpRequest;
    });

    vi.mocked(https).request = vi.fn((options, callback) => {
      if (callback) callback(createMockResponse() as any);
      return mockHttpsRequest;
    });

    manager = new WebhookManager(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    manager.close();
  });

  describe('Basic Delivery', () => {
    it('should deliver webhook successfully', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook'
      };
      manager.addEndpoint(endpoint);

      const event: WebhookEvent = {
        id: '123',
        type: 'suggestion.created',
        timestamp: new Date(),
        data: { test: 'data' }
      };

      const results = await manager.deliver(event);
      expect(results.size).toBe(1);
      expect(results.get(endpoint.url)?.success).toBe(true);
      expect(vi.mocked(http).request).toHaveBeenCalledOnce();
    });

    it('should include required headers', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook'
      };
      manager.addEndpoint(endpoint);

      const event: WebhookEvent = {
        id: '123',
        type: 'test.event',
        timestamp: new Date(),
        data: { foo: 'bar' }
      };

      await manager.deliver(event);

      const requestCall = vi.mocked(http).request.mock.calls[0];
      const options = requestCall[0] as any;
      
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-Webhook-Event']).toBe('test.event');
      expect(options.headers['X-Webhook-ID']).toBe('123');
      expect(options.headers['X-Webhook-Timestamp']).toBeDefined();
      expect(options.headers['X-Webhook-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should deliver to multiple endpoints', async () => {
      const endpoints = [
        { url: 'http://example1.com/webhook' },
        { url: 'http://example2.com/webhook' },
        { url: 'https://secure.com/webhook' }
      ];
      
      endpoints.forEach(ep => manager.addEndpoint(ep));

      const event: WebhookEvent = {
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      };

      const results = await manager.deliver(event);
      expect(results.size).toBe(3);
      expect(vi.mocked(http).request).toHaveBeenCalledTimes(2);
      expect(vi.mocked(https).request).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by exact type', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        events: ['suggestion.created']
      };
      manager.addEndpoint(endpoint);

      const matchingEvent: WebhookEvent = {
        id: '1',
        type: 'suggestion.created',
        timestamp: new Date(),
        data: {}
      };

      const nonMatchingEvent: WebhookEvent = {
        id: '2',
        type: 'commit.created',
        timestamp: new Date(),
        data: {}
      };

      const results1 = await manager.deliver(matchingEvent);
      expect(results1.size).toBe(1);

      const results2 = await manager.deliver(nonMatchingEvent);
      expect(results2.size).toBe(0);
    });

    it('should support wildcard filtering', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        events: ['suggestion.*', 'commit.*']
      };
      manager.addEndpoint(endpoint);

      const events = [
        { id: '1', type: 'suggestion.created' },
        { id: '2', type: 'suggestion.updated' },
        { id: '3', type: 'commit.created' },
        { id: '4', type: 'milestone.reached' }
      ];

      for (const event of events) {
        const result = await manager.deliver({
          ...event,
          timestamp: new Date(),
          data: {}
        });
        
        if (event.type.startsWith('suggestion.') || event.type.startsWith('commit.')) {
          expect(result.size).toBe(1);
        } else {
          expect(result.size).toBe(0);
        }
      }
    });
  });

  describe('Authentication', () => {
    it('should add bearer token', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        auth: {
          type: 'bearer',
          token: 'secret-token'
        }
      };
      manager.addEndpoint(endpoint);

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      });

      const options = (vi.mocked(http).request.mock.calls[0][0] as any);
      expect(options.headers['Authorization']).toBe('Bearer secret-token');
    });

    it('should add basic auth', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        auth: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        }
      };
      manager.addEndpoint(endpoint);

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      });

      const options = (vi.mocked(http).request.mock.calls[0][0] as any);
      const expectedAuth = `Basic ${Buffer.from('user:pass').toString('base64')}`;
      expect(options.headers['Authorization']).toBe(expectedAuth);
    });

    it('should add custom headers', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        auth: {
          type: 'custom',
          headers: {
            'X-API-Key': 'my-api-key',
            'X-Custom': 'value'
          }
        }
      };
      manager.addEndpoint(endpoint);

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      });

      const options = (vi.mocked(http).request.mock.calls[0][0] as any);
      expect(options.headers['X-API-Key']).toBe('my-api-key');
      expect(options.headers['X-Custom']).toBe('value');
    });
  });

  describe('Failure Handling', () => {
    it('should handle HTTP error responses', async () => {
      // Mock failure response
      vi.mocked(http).request = vi.fn((options, callback) => {
        const response = new EventEmitter();
        (response as any).statusCode = 500;
        
        if (callback) callback(response as any);
        
        setTimeout(() => {
          response.emit('data', '{"error":"Internal Server Error"}');
          response.emit('end');
        }, 10);
        
        return mockHttpRequest;
      });

      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        retry: { max_attempts: 1 } // No retries
      };
      manager.addEndpoint(endpoint);

      const event: WebhookEvent = {
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      };

      const results = await manager.deliver(event);
      expect(results.get(endpoint.url)?.success).toBe(false);
      expect(results.get(endpoint.url)?.error).toContain('HTTP 500');
    });

    it('should handle network errors', async () => {
      // Mock network error
      vi.mocked(http).request = vi.fn(() => {
        setTimeout(() => {
          const errorHandler = mockHttpRequest.on.mock.calls.find(
            (call: any[]) => call[0] === 'error'
          )?.[1];
          if (errorHandler) errorHandler(new Error('ECONNREFUSED'));
        }, 10);
        return mockHttpRequest;
      });

      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        retry: { max_attempts: 1 }
      };
      manager.addEndpoint(endpoint);

      const event: WebhookEvent = {
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      };

      const results = await manager.deliver(event);
      expect(results.get(endpoint.url)?.success).toBe(false);
      expect(results.get(endpoint.url)?.error).toContain('ECONNREFUSED');
    });
  });

  describe('Endpoint Management', () => {
    it('should manage endpoints', () => {
      expect(manager.getEndpoints()).toHaveLength(0);

      const endpoint1 = { url: 'http://webhook1.com' };
      const endpoint2 = { url: 'http://webhook2.com' };

      manager.addEndpoint(endpoint1);
      manager.addEndpoint(endpoint2);
      expect(manager.getEndpoints()).toHaveLength(2);

      const removed = manager.removeEndpoint('http://webhook1.com');
      expect(removed).toBe(true);
      expect(manager.getEndpoints()).toHaveLength(1);
      expect(manager.getEndpoints()[0].url).toBe('http://webhook2.com');

      const notRemoved = manager.removeEndpoint('http://nonexistent.com');
      expect(notRemoved).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit success events', async () => {
      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook'
      };
      manager.addEndpoint(endpoint);

      const successEvents: any[] = [];
      manager.on('delivery-success', (data) => successEvents.push(data));

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: { foo: 'bar' }
      });

      expect(successEvents).toHaveLength(1);
      expect(successEvents[0].delivery.event.id).toBe('123');
      expect(successEvents[0].response.statusCode).toBe(200);
    });

    it('should emit retry events on failure', async () => {
      // Mock failure response
      vi.mocked(http).request = vi.fn((options, callback) => {
        const response = new EventEmitter();
        (response as any).statusCode = 503;
        
        if (callback) callback(response as any);
        
        setTimeout(() => {
          response.emit('data', '{"error":"Service Unavailable"}');
          response.emit('end');
        }, 10);
        
        return mockHttpRequest;
      });

      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        retry: { max_attempts: 3 }
      };
      manager.addEndpoint(endpoint);

      const retryEvents: any[] = [];
      manager.on('delivery-retry', (data) => retryEvents.push(data));

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      });

      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0].error).toContain('HTTP 503');
    });

    it('should emit failure events when retries exhausted', async () => {
      // Mock permanent failure
      vi.mocked(http).request = vi.fn((options, callback) => {
        const response = new EventEmitter();
        (response as any).statusCode = 500;
        
        if (callback) callback(response as any);
        
        setTimeout(() => {
          response.emit('data', '{"error":"Error"}');
          response.emit('end');
        }, 10);
        
        return mockHttpRequest;
      });

      const endpoint: WebhookEndpoint = {
        url: 'http://example.com/webhook',
        retry: { max_attempts: 1 } // Only one attempt, no retries
      };
      manager.addEndpoint(endpoint);

      const failureEvents: any[] = [];
      manager.on('delivery-failed', (data) => failureEvents.push(data));

      await manager.deliver({
        id: '123',
        type: 'test',
        timestamp: new Date(),
        data: {}
      });

      expect(failureEvents).toHaveLength(1);
      expect(failureEvents[0].delivery.attempts).toBe(1);
      expect(failureEvents[0].error).toContain('HTTP 500');
    });
  });
});