import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketServer } from '../src/websocket/server.js';
import { EventStore } from '../src/api/stores/event-store.js';
import { EventBroadcaster } from '../src/websocket/event-broadcaster.js';
import express from 'express';

describe('WebSocket Server', () => {
  let httpServer: HTTPServer;
  let wsServer: WebSocketServer;
  let clientSocket: ClientSocket;
  let eventStore: EventStore;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server
    const app = express();
    httpServer = app.listen(0); // Random port
    port = (httpServer.address() as any).port;

    // Create WebSocket server
    wsServer = new WebSocketServer(httpServer, {
      enabled: true,
      authConfig: {
        enabled: true,
        type: 'bearer',
        tokens: [{
          name: 'test',
          token: 'test-token',
          scopes: ['*']
        }]
      }
    });

    eventStore = new EventStore();
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    await wsServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  const connectClient = (token = 'test-token'): Promise<void> => {
    return new Promise((resolve, reject) => {
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => resolve());
      clientSocket.on('connect_error', (error) => reject(error));
    });
  };

  describe('Authentication', () => {
    it('should accept valid tokens', async () => {
      await connectClient('test-token');
      expect(clientSocket.connected).toBe(true);
    });

    it('should reject invalid tokens', async () => {
      await expect(connectClient('invalid-token')).rejects.toThrow();
    });

    it('should reject connections without token', async () => {
      await expect(connectClient('')).rejects.toThrow();
    });
  });

  describe('Subscriptions', () => {
    beforeEach(async () => {
      await connectClient();
    });

    it('should handle event subscriptions', async () => {
      const subscribed = new Promise((resolve) => {
        clientSocket.on('subscribed', resolve);
      });

      clientSocket.emit('subscribe', {
        events: ['suggestion.created', 'milestone.reached'],
        projects: ['/test/project']
      });

      const result = await subscribed;
      expect(result).toEqual({
        events: ['suggestion.created', 'milestone.reached'],
        projects: ['/test/project']
      });
    });

    it('should handle unsubscribe', async () => {
      // First subscribe
      clientSocket.emit('subscribe', {
        events: ['suggestion.created'],
        projects: []
      });

      const unsubscribed = new Promise((resolve) => {
        clientSocket.on('unsubscribed', resolve);
      });

      clientSocket.emit('unsubscribe', {
        events: ['suggestion.created']
      });

      const result = await unsubscribed;
      expect(result).toEqual({
        events: ['suggestion.created']
      });
    });
  });

  describe('Broadcasting', () => {
    beforeEach(async () => {
      await connectClient();
    });

    it('should broadcast events to subscribed clients', async () => {
      // Subscribe to events
      clientSocket.emit('subscribe', {
        events: ['test.event'],
        projects: []
      });

      // Wait for subscription
      await new Promise(resolve => {
        clientSocket.on('subscribed', resolve);
      });

      // Set up event listener
      const eventReceived = new Promise((resolve) => {
        clientSocket.on('test.event', resolve);
      });

      // Broadcast event
      wsServer.broadcast('test.event', {
        message: 'Test broadcast'
      });

      const event = await eventReceived;
      expect(event).toMatchObject({
        type: 'test.event',
        data: {
          message: 'Test broadcast'
        }
      });
    });

    it('should filter events by project', async () => {
      // Subscribe to specific project
      clientSocket.emit('subscribe', {
        events: ['test.event'],
        projects: ['/project1']
      });

      await new Promise(resolve => {
        clientSocket.on('subscribed', resolve);
      });

      let receivedCount = 0;
      clientSocket.on('test.event', () => {
        receivedCount++;
      });

      // Broadcast to different project (should not receive)
      wsServer.broadcast('test.event', {
        project: '/project2',
        message: 'Wrong project'
      });

      // Broadcast to correct project (should receive)
      wsServer.broadcast('test.event', {
        project: '/project1',
        message: 'Correct project'
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedCount).toBe(1);
    });
  });

  describe('Request Handling', () => {
    beforeEach(async () => {
      await connectClient();
    });

    it('should handle status requests', async () => {
      const response = await new Promise((resolve) => {
        clientSocket.emit('request', {
          id: '123',
          method: 'getStatus'
        }, resolve);
      });

      expect(response).toMatchObject({
        success: true,
        result: {
          status: 'connected'
        }
      });
    });

    it('should handle stats requests', async () => {
      const response = await new Promise((resolve) => {
        clientSocket.emit('request', {
          id: '124',
          method: 'getStats'
        }, resolve);
      });

      expect(response).toMatchObject({
        success: true,
        result: {
          connections: 1,
          subscriptions: {}
        }
      });
    });

    it('should reject unknown methods', async () => {
      const response = await new Promise((resolve) => {
        clientSocket.emit('request', {
          id: '125',
          method: 'unknownMethod'
        }, resolve);
      });

      expect(response).toMatchObject({
        success: false,
        error: {
          message: 'Unknown method: unknownMethod'
        }
      });
    });
  });

  describe('Event Broadcaster Integration', () => {
    it('should broadcast suggestions', async () => {
      await connectClient();

      // Subscribe to suggestions
      clientSocket.emit('subscribe', {
        events: ['suggestion.created'],
        projects: []
      });

      await new Promise(resolve => {
        clientSocket.on('subscribed', resolve);
      });

      const suggestionReceived = new Promise((resolve) => {
        clientSocket.on('suggestion.created', resolve);
      });

      // Create broadcaster and emit suggestion
      const broadcaster = new EventBroadcaster(wsServer, eventStore, null);
      await broadcaster.broadcastSuggestion({
        id: 'sugg_123',
        timestamp: new Date(),
        project: '/test',
        type: 'commit',
        priority: 'medium',
        message: 'Test suggestion',
        actions: []
      });

      const event = await suggestionReceived;
      expect(event).toMatchObject({
        data: {
          id: 'sugg_123',
          message: 'Test suggestion'
        }
      });
    });
  });

  describe('Connection Management', () => {
    it('should track multiple connections', async () => {
      // Connect multiple clients
      const client1 = ioClient(`http://localhost:${port}`, {
        auth: { token: 'test-token' },
        transports: ['websocket']
      });

      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: 'test-token' },
        transports: ['websocket']
      });

      await Promise.all([
        new Promise(resolve => client1.on('connect', resolve)),
        new Promise(resolve => client2.on('connect', resolve))
      ]);

      const stats = wsServer.getStats();
      expect(stats.connections).toBe(2);

      client1.disconnect();
      client2.disconnect();
    });

    it('should handle ping/pong', async () => {
      await connectClient();

      const pongReceived = new Promise((resolve) => {
        clientSocket.on('pong', resolve);
      });

      clientSocket.emit('ping');

      const pong = await pongReceived;
      expect(pong).toHaveProperty('timestamp');
    });
  });
});