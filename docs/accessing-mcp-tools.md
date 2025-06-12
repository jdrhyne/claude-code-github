# Accessing MCP Tools in claude-code-github

This document explains various ways to access and interact with the MCP (Model Context Protocol) tools exposed by the claude-code-github server, with a focus on the `dev_monitoring_status` tool.

## Overview

The claude-code-github server implements the MCP protocol, which uses JSON-RPC 2.0 over stdin/stdout for communication. The server exposes various development tools that can be accessed programmatically.

## Available Tools

The server exposes the following tools:

- `dev_status` - Get the current development status of the active project
- `dev_status_enhanced` - Get comprehensive project status including PRs, issues, CI/CD status
- `dev_monitoring_status` - Get the current monitoring system status and recent events
- `dev_create_branch` - Create a new branch with appropriate prefix and commit changes
- `dev_create_pull_request` - Push current branch and create a pull request on GitHub
- `dev_checkpoint` - Create a commit with current changes
- And many more...

## How MCP Tools Work

1. **Server Process**: The MCP server runs as a Node.js process that reads JSON-RPC requests from stdin and writes responses to stdout
2. **JSON-RPC Protocol**: Communication uses JSON-RPC 2.0 format with requests containing method names and parameters
3. **Tool Registration**: Tools are registered with the server at startup with their schemas and handler functions
4. **Tool Invocation**: Tools are called using the `tools/call` method with the tool name and arguments

## Methods to Access MCP Tools

### 1. Using Claude Code (Primary Method)

The primary way to use these tools is through Claude Code itself. When configured properly, Claude can call these tools on your behalf:

```json
{
  "mcpServers": {
    "claude-code-github": {
      "command": "npx",
      "args": ["-y", "@jdrhyne/claude-code-github@latest"]
    }
  }
}
```

Once configured, you can ask Claude:
- "What's the monitoring status of my project?"
- "Show me the development status"
- "Create a feature branch for user authentication"

### 2. Programmatic Access (Node.js)

```javascript
const { spawn } = require('child_process');

class MCPClient {
  constructor() {
    this.requestId = 0;
    this.process = spawn('node', ['./dist/index.js']);
    // Setup stdin/stdout handlers...
  }

  async callTool(name, args = {}) {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args },
      id: this.requestId++
    };
    
    this.process.stdin.write(JSON.stringify(request) + '\n');
    // Wait for and parse response...
  }
}

// Usage
const client = new MCPClient();
await client.initialize();
const status = await client.callTool('dev_monitoring_status');
```

### 3. Programmatic Access (Python)

```python
import json
import subprocess

class MCPClient:
    def __init__(self):
        self.process = subprocess.Popen(
            ['node', './dist/index.js'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True
        )
        self.request_id = 0
    
    def call_tool(self, name, arguments=None):
        request = {
            'jsonrpc': '2.0',
            'method': 'tools/call',
            'params': {
                'name': name,
                'arguments': arguments or {}
            },
            'id': self.request_id
        }
        self.request_id += 1
        
        self.process.stdin.write(json.dumps(request) + '\n')
        self.process.stdin.flush()
        
        # Read and parse response
        response = json.loads(self.process.stdout.readline())
        return response.get('result')

# Usage
client = MCPClient()
client.send_request('initialize', {...})
status = client.call_tool('dev_monitoring_status')
```

### 4. Direct JSON-RPC (Shell/Curl)

You can interact with the server using shell pipes:

```bash
# Start server with named pipes
mkfifo request_pipe response_pipe
node ./dist/index.js < request_pipe > response_pipe &

# Send requests
echo '{"jsonrpc":"2.0","method":"initialize","params":{...},"id":1}' > request_pipe
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"dev_monitoring_status","arguments":{}},"id":2}' > request_pipe

# Read responses
cat response_pipe
```

### 5. Testing/Development

For testing, the project includes a test client in `src/__tests__/utils/mcp-client.ts`:

```typescript
import { McpTestClient } from './utils/mcp-client.js';

const client = new McpTestClient({
  command: ['node', './dist/index.js']
});

await client.connect();
await client.initialize();
const result = await client.callTool('dev_monitoring_status');
```

## JSON-RPC Request/Response Format

### Request Format
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "dev_monitoring_status",
    "arguments": {}
  },
  "id": 1
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"enabled\":true,\"conversation\":{...},\"events\":[...]}"
      }
    ]
  },
  "id": 1
}
```

## Example Scripts

The repository includes example scripts for testing MCP tools:

- `test-monitoring-tool.js` - Node.js example client
- `test-monitoring-tool.py` - Python example client  
- `test-monitoring-curl.sh` - Shell script using named pipes

Run them with:
```bash
node test-monitoring-tool.js
python3 test-monitoring-tool.py
./test-monitoring-curl.sh
```

## Tool Response Structure

The `dev_monitoring_status` tool returns:

```json
{
  "enabled": true,
  "conversation": {
    "messageCount": 10,
    "lastMessage": "2025-01-06T12:00:00Z",
    "topics": ["feature-development", "bug-fixing"]
  },
  "events": [
    {
      "timestamp": "2025-01-06T12:00:00Z",
      "type": "file-change",
      "data": {...}
    }
  ],
  "suggestions": [
    {
      "type": "commit",
      "priority": "high",
      "message": "You have uncommitted changes",
      "action": "dev_checkpoint"
    }
  ],
  "milestones": [
    {
      "type": "feature-complete",
      "title": "User authentication implemented",
      "timestamp": "2025-01-06T11:00:00Z"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Server not starting**: Ensure the dist folder exists and contains index.js
2. **Tool not found**: Check available tools with `tools/list` method
3. **Timeout errors**: Increase timeout in client implementation
4. **Parse errors**: Ensure proper JSON formatting and newline delimiters

### Debug Mode

Set environment variables for debugging:
```bash
DEBUG=* node ./dist/index.js
```

## Security Considerations

- The MCP server runs locally and only accepts connections via stdin/stdout
- No network ports are opened
- GitHub tokens are stored securely in the system keychain
- File system access is limited to configured project paths

## Further Reading

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [claude-code-github Documentation](https://github.com/jdrhyne/claude-code-github)