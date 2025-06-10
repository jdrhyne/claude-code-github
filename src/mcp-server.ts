import { JsonRpcRequest, JsonRpcResponse, JsonRpcError, McpTool } from './types.js';
import { formatJsonRpcError } from './errors.js';

export class McpServer {
  private tools: Map<string, McpTool> = new Map();
  private handlers: Map<string, (params: any) => Promise<any>> = new Map();

  constructor() {
    this.setupStandardHandlers();
  }

  private setupStandardHandlers() {
    this.handlers.set('initialize', async (params) => {
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'claude-code-github',
          version: '1.0.0'
        }
      };
    });

    this.handlers.set('tools/list', async () => {
      return {
        tools: Array.from(this.tools.values())
      };
    });

    this.handlers.set('tools/call', async (params) => {
      const { name, arguments: args } = params;
      const handler = this.handlers.get(`tool:${name}`);
      
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  registerTool(tool: McpTool, handler: (params: any) => Promise<any>) {
    this.tools.set(tool.name, tool);
    this.handlers.set(`tool:${tool.name}`, handler);
  }

  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    try {
      const handler = this.handlers.get(method);
      if (!handler) {
        throw new Error(`Unknown method: ${method}`);
      }

      const result = await handler(params);
      
      return {
        jsonrpc: '2.0',
        result,
        id: id ?? null
      };
    } catch (error) {
      const errorResponse = formatJsonRpcError(error instanceof Error ? error : new Error(String(error)));

      return {
        jsonrpc: '2.0',
        error: errorResponse,
        id: id ?? null
      };
    }
  }

  start() {
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          this.processLine(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        this.processLine(buffer.trim());
      }
    });
  }

  private async processLine(line: string) {
    try {
      const request: JsonRpcRequest = JSON.parse(line);
      const response = await this.handleRequest(request);
      
      if (request.id !== undefined) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (error) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error'
        },
        id: null
      };
      
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  }
}