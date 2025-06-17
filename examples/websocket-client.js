#!/usr/bin/env node

/**
 * Example WebSocket client for claude-code-github
 * 
 * This demonstrates real-time event streaming using Socket.IO
 */

const io = require('socket.io-client');

const WEBSOCKET_URL = 'http://localhost:3000';
const API_TOKEN = 'your-api-token'; // Replace with your actual token

// Connect to WebSocket server
const socket = io(WEBSOCKET_URL, {
  auth: {
    token: API_TOKEN
  },
  transports: ['websocket', 'polling']
});

// Connection event handlers
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  // Subscribe to events
  socket.emit('subscribe', {
    events: ['suggestion.created', 'milestone.reached', 'commit.created'],
    projects: ['*'] // Subscribe to all projects
  });
});

socket.on('connected', (data) => {
  console.log('🔗 Server welcome message:', data);
});

socket.on('subscribed', (data) => {
  console.log('📥 Subscribed to:', data);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('🚨 Error:', error);
});

// Event handlers
socket.on('suggestion.created', (event) => {
  console.log('\n🎯 New Suggestion:');
  console.log(`  Priority: ${event.data.priority}`);
  console.log(`  Message: ${event.data.message}`);
  console.log(`  Project: ${event.data.project}`);
  
  if (event.data.actions?.length > 0) {
    console.log('  Actions:');
    event.data.actions.forEach(action => {
      console.log(`    - ${action.label} (${action.type})`);
    });
  }
});

socket.on('milestone.reached', (event) => {
  console.log('\n🎉 Milestone Reached:');
  console.log(`  Type: ${event.data.type}`);
  console.log(`  Description: ${event.data.description}`);
});

socket.on('commit.created', (event) => {
  console.log('\n📝 New Commit:');
  console.log(`  Message: ${event.data.message}`);
  console.log(`  Branch: ${event.data.branch}`);
  console.log(`  Files: ${event.data.files_changed}`);
});

// Interactive commands
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n--- Commands ---');
  console.log('1. Get connection status');
  console.log('2. Change subscriptions');
  console.log('3. Send custom request');
  console.log('4. Exit');
  console.log('----------------');
}

function handleCommand(command) {
  switch (command.trim()) {
    case '1':
      socket.emit('request', {
        id: Date.now().toString(),
        method: 'getStatus'
      }, (response) => {
        console.log('Status:', response);
      });
      break;

    case '2':
      rl.question('Enter events to subscribe (comma-separated): ', (events) => {
        rl.question('Enter projects to subscribe (comma-separated): ', (projects) => {
          socket.emit('subscribe', {
            events: events.split(',').map(e => e.trim()),
            projects: projects.split(',').map(p => p.trim())
          });
        });
      });
      break;

    case '3':
      rl.question('Enter method name: ', (method) => {
        rl.question('Enter params (JSON): ', (paramsStr) => {
          try {
            const params = paramsStr ? JSON.parse(paramsStr) : undefined;
            socket.emit('request', {
              id: Date.now().toString(),
              method,
              params
            }, (response) => {
              console.log('Response:', JSON.stringify(response, null, 2));
            });
          } catch (error) {
            console.error('Invalid JSON:', error.message);
          }
        });
      });
      break;

    case '4':
      console.log('Goodbye!');
      socket.disconnect();
      process.exit(0);
      break;

    default:
      console.log('Invalid command');
  }
}

// Main loop
console.log('Claude Code GitHub WebSocket Client');
console.log('==================================\n');

socket.on('connect', () => {
  showMenu();
  
  rl.on('line', (input) => {
    handleCommand(input);
    setTimeout(showMenu, 100);
  });
});

// Keep alive with ping/pong
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 30000);

socket.on('pong', (data) => {
  // Connection is alive
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  socket.disconnect();
  process.exit(0);
});