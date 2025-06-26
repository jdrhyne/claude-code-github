import { WebhookConfig, WebhookEndpoint, DeliveryResult } from '../api/types.js';
import { createHmac } from 'crypto';
import { EventEmitter } from 'events';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  project?: string;
  data: any;
}

export interface WebhookDelivery {
  id: string;
  endpoint: string;
  event: WebhookEvent;
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  status: 'pending' | 'delivered' | 'failed';
  error?: string;
}

export class WebhookManager extends EventEmitter {
  private endpoints: WebhookEndpoint[];
  private deliveryQueue: Map<string, WebhookDelivery> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;
  private http: any;
  private https: any;

  constructor(private config: WebhookConfig) {
    super();
    this.endpoints = config.endpoints || [];
    
    // Dynamic imports will be done in deliver method
  }

  /**
   * Deliver an event to all configured webhooks
   */
  async deliver(event: WebhookEvent): Promise<Map<string, DeliveryResult>> {
    if (this.endpoints.length === 0) {
      return new Map();
    }

    // Dynamic imports for http/https
    if (!this.http || !this.https) {
      const [httpModule, httpsModule] = await Promise.all([
        import('http'),
        import('https')
      ]);
      this.http = httpModule.default;
      this.https = httpsModule.default;
    }

    const results = new Map<string, DeliveryResult>();
    const deliveryPromises: Promise<void>[] = [];

    for (const endpoint of this.endpoints) {
      // Check if event matches endpoint filters
      if (!this.shouldDeliver(event, endpoint)) {
        continue;
      }

      const deliveryId = `${event.id}-${endpoint.url}`;
      const delivery: WebhookDelivery = {
        id: deliveryId,
        endpoint: endpoint.url,
        event,
        attempts: 0,
        status: 'pending'
      };

      this.deliveryQueue.set(deliveryId, delivery);
      
      const promise = this.attemptDelivery(delivery, endpoint).then(result => {
        results.set(endpoint.url, result);
      });
      
      deliveryPromises.push(promise);
    }

    await Promise.all(deliveryPromises);
    
    // Start retry timer if not already running
    if (!this.retryTimer) {
      this.startRetryTimer();
    }

    return results;
  }

  /**
   * Check if event should be delivered to endpoint
   */
  private shouldDeliver(event: WebhookEvent, endpoint: WebhookEndpoint): boolean {
    if (!endpoint.events || endpoint.events.length === 0) {
      return true; // No filter, deliver all events
    }
    
    return endpoint.events.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return event.type.startsWith(prefix);
      }
      return event.type === pattern;
    });
  }

  /**
   * Attempt to deliver webhook
   */
  private async attemptDelivery(
    delivery: WebhookDelivery, 
    endpoint: WebhookEndpoint
  ): Promise<DeliveryResult> {
    delivery.attempts++;
    delivery.lastAttempt = new Date();

    try {
      const url = new URL(endpoint.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? this.https : this.http;

      // Prepare payload
      const payload = JSON.stringify({
        id: delivery.event.id,
        type: delivery.event.type,
        timestamp: delivery.event.timestamp.toISOString(),
        project: delivery.event.project,
        data: delivery.event.data
      });

      // Generate signature if secret is configured
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload).toString(),
        'User-Agent': 'claude-code-github/1.0',
        'X-Webhook-Event': delivery.event.type,
        'X-Webhook-ID': delivery.event.id,
        'X-Webhook-Timestamp': delivery.event.timestamp.toISOString()
      };

      if (this.config.signing_secret) {
        const signature = createHmac('sha256', this.config.signing_secret)
          .update(payload)
          .digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      // Add authentication headers
      this.addAuthHeaders(headers, endpoint.auth);

      // Send request
      const response = await this.sendRequest(client, url, {
        method: 'POST',
        path: url.pathname + url.search,
        hostname: url.hostname,
        port: url.port,
        headers
      }, payload);

      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
        delivery.status = 'delivered';
        this.deliveryQueue.delete(delivery.id);
        
        console.log(`[Webhooks] Delivered '${delivery.event.type}' to ${endpoint.url}`);
        this.emit('delivery-success', { delivery, response });
        
        return {
          success: true,
          attempts: delivery.attempts,
          response: {
            status: response.statusCode,
            body: response.body
          }
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
    } catch (_error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      delivery.error = errorMessage;

      // Check if we should retry
      const maxAttempts = endpoint.retry?.max_attempts ?? 3;
      if (delivery.attempts < maxAttempts) {
        // Calculate next retry time
        const backoff = endpoint.retry?.backoff ?? 'exponential';
        const delay = this.calculateRetryDelay(delivery.attempts, backoff);
        delivery.nextRetry = new Date(Date.now() + delay);
        
        console.log(`[Webhooks] Delivery failed for ${endpoint.url}, will retry in ${delay}ms`);
        this.emit('delivery-retry', { delivery, error: errorMessage });
      } else {
        delivery.status = 'failed';
        this.deliveryQueue.delete(delivery.id);
        
        console.error(`[Webhooks] Delivery failed permanently for ${endpoint.url}:`, errorMessage);
        this.emit('delivery-failed', { delivery, error: errorMessage });
      }

      return {
        success: false,
        attempts: delivery.attempts,
        error: errorMessage
      };
    }
  }

  /**
   * Send HTTP request
   */
  private sendRequest(
    client: any,
    url: URL,
    options: any,
    payload: string
  ): Promise<{ statusCode?: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = client.request(options, (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(payload);
      req.end();
    });
  }

  /**
   * Add authentication headers
   */
  private addAuthHeaders(headers: Record<string, string>, auth?: WebhookEndpoint['auth']): void {
    if (!auth) return;

    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;
      
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      
      case 'custom':
        if (auth.headers) {
          Object.assign(headers, auth.headers);
        }
        break;
    }
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number, backoff: 'linear' | 'exponential'): number {
    const baseDelay = 1000; // 1 second
    
    if (backoff === 'linear') {
      return baseDelay * attempt;
    } else {
      // Exponential backoff with jitter
      const delay = Math.pow(2, attempt - 1) * baseDelay;
      const jitter = Math.random() * 0.3 * delay; // 30% jitter
      return Math.min(delay + jitter, 60000); // Max 60 seconds
    }
  }

  /**
   * Start retry timer
   */
  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const retries: Promise<void>[] = [];

    for (const [, delivery] of this.deliveryQueue) {
      if (delivery.status === 'pending' && delivery.nextRetry && delivery.nextRetry.getTime() <= now) {
        const endpoint = this.endpoints.find(e => e.url === delivery.endpoint);
        if (endpoint) {
          retries.push(this.attemptDelivery(delivery, endpoint).then(() => {}));
        }
      }
    }

    if (retries.length > 0) {
      await Promise.all(retries);
    }

    // Stop timer if queue is empty
    if (this.deliveryQueue.size === 0 && this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Add a new webhook endpoint
   */
  addEndpoint(endpoint: WebhookEndpoint): void {
    this.endpoints.push(endpoint);
  }

  /**
   * Remove a webhook endpoint
   */
  removeEndpoint(url: string): boolean {
    const index = this.endpoints.findIndex(e => e.url === url);
    if (index >= 0) {
      this.endpoints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all configured endpoints
   */
  getEndpoints(): WebhookEndpoint[] {
    return [...this.endpoints];
  }

  /**
   * Get delivery queue status
   */
  getQueueStatus(): {
    pending: number;
    delivered: number;
    failed: number;
  } {
    let pending = 0;
    let delivered = 0;
    let failed = 0;

    for (const delivery of this.deliveryQueue.values()) {
      switch (delivery.status) {
        case 'pending': pending++; break;
        case 'delivered': delivered++; break;
        case 'failed': failed++; break;
      }
    }

    return { pending, delivered, failed };
  }

  /**
   * Clean up resources
   */
  close(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.deliveryQueue.clear();
  }
}