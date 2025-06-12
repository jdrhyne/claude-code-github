#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Starting MCP server...');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data);
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data);
});

server.on('error', (error) => {
  console.error('Process error:', error);
});

server.on('close', (code) => {
  console.log('Server exited with code:', code);
});

// Send initialize request after a short delay
setTimeout(() => {
  console.log('Sending initialize request...');
  const request = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 1
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
  
  // Give it 5 seconds to respond
  setTimeout(() => {
    console.log('Timeout reached, killing server...');
    server.kill();
  }, 5000);
}, 1000);