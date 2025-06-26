import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { JsonRpcRequest, JsonRpcResponse } from '../../types.js';

export interface McpClientOptions {
  command: string[];
  cwd?: string;
  timeout?: number;
}

export class McpTestClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(private options: McpClientOptions) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.options.command[0], this.options.command.slice(1), {
        cwd: this.options.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create process streams'));
        return;
      }

      this.process.stdout.setEncoding('utf8');
      this.process.stdout.on('data', (chunk: string) => {
        this.handleData(chunk);
      });

      this.process.stderr?.on('data', (chunk: Buffer) => {
        console.error('Server stderr:', chunk.toString());
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      this.process.on('close', (code) => {
        this.emit('close', code);
      });

      setTimeout(() => resolve(), 100);
    });
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: JsonRpcResponse = JSON.parse(line.trim());
          this.handleResponse(response);
        } catch (_error) {
          console.error('Failed to parse response:', line, error);
        }
      }
    }
  }

  private handleResponse(response: JsonRpcResponse) {
    if (response.id !== null && response.id !== undefined) {
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    }
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process?.stdin) {
      throw new Error('Client not connected');
    }

    const id = this.requestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, this.options.timeout || 5000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message);
    });
  }

  async initialize(): Promise<any> {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
  }

  async listTools(): Promise<any> {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, arguments_: any = {}): Promise<any> {
    return this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.process) {
        this.process.on('close', () => {
          resolve();
        });
        
        for (const pending of this.pendingRequests.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Client disconnected'));
        }
        this.pendingRequests.clear();
        
        this.process.kill();
        this.process = null;
      } else {
        resolve();
      }
    });
  }
}