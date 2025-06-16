export interface APIConfig {
  enabled: boolean;
  type?: 'http' | 'fastify';
  port: number;
  host: string;
  auth?: AuthConfig;
  cors?: CorsConfig;
  rateLimit?: RateLimitConfig;
  logging?: LoggingConfig;
}

export interface AuthConfig {
  enabled: boolean;
  type: 'bearer' | 'api_key';
  tokens: AuthToken[];
}

export interface AuthToken {
  name: string;
  token: string;
  scopes: string[];
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

export interface RateLimitConfig {
  enabled: boolean;
  window: number; // seconds
  max_requests: number;
  by?: 'token' | 'ip';
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface WebSocketConfig {
  enabled: boolean;
  port?: number;
  namespace?: string;
  cors?: CorsConfig;
}

export interface WebhookConfig {
  enabled: boolean;
  signing_secret?: string;
  endpoints: WebhookEndpoint[];
}

export interface WebhookEndpoint {
  url: string;
  events?: string[];
  auth?: {
    type: 'bearer' | 'basic' | 'custom';
    token?: string;
    username?: string;
    password?: string;
    headers?: Record<string, string>;
  };
  retry?: {
    max_attempts: number;
    backoff?: 'linear' | 'exponential';
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface SuggestionEvent {
  id: string;
  timestamp: Date;
  project: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  message: string;
  actions?: SuggestionAction[];
  metadata?: Record<string, any>;
}

export interface SuggestionAction {
  type: string;
  label: string;
  params?: Record<string, any>;
}

export interface EventFilters {
  type?: string;
  project?: string;
  since?: Date;
  limit?: number;
}

export interface StoredEvent {
  id: string;
  timestamp: Date;
  type: string;
  project?: string;
  data: any;
}

export interface DeliveryResult {
  success: boolean;
  attempts: number;
  response?: any;
  error?: string;
}