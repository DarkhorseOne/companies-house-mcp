#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

// Configuration
const SERVER_URL = process.env.MCP_HTTP_SERVER_URL || 'http://localhost:3000';

// Create readline interface for stdin/stdout communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
  crlfDelay: Infinity
});

// HTTP client
const httpClient = axios.create({
  baseURL: SERVER_URL,
  timeout: 5000, // Shorter timeout for testing
  headers: {
    'Content-Type': 'application/json',
  }
});

// Handle errors by sending JSON-RPC error response
function sendError(id, message, code = -32603) {
  const errorResponse = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
  console.log(JSON.stringify(errorResponse));
}

// Process a single MCP request
async function processRequest(data) {
  process.stderr.write(`Processing: ${data}\n`);
  let request;
  
  try {
    request = JSON.parse(data);
  } catch (error) {
    process.stderr.write(`JSON parse error: ${error.message}\n`);
    sendError(null, 'Invalid JSON');
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        // Respond immediately to initialization
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'companies-house-mcp-http-bridge',
              version: '1.0.0'
            }
          }
        }));
        break;

      case 'notifications/initialized':
        // No response needed for notifications
        break;

      case 'tools/list':
        try {
          process.stderr.write('Making HTTP request to /tools\n');
          const response = await httpClient.get('/tools');
          process.stderr.write(`Got response: ${JSON.stringify(response.data)}\n`);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: response.data
          }));
          process.stderr.write('Sent tools/list response\n');
        } catch (error) {
          process.stderr.write(`Tools list error: ${error.message}\n`);
          sendError(id, `Failed to get tools: ${error.message}`);
        }
        break;

      case 'tools/call':
        try {
          const { name, arguments: args } = params;
          const response = await httpClient.post(`/mcp/tools/${name}`, args);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: response.data
          }));
        } catch (error) {
          sendError(id, `Tool execution failed: ${error.message}`);
        }
        break;

      default:
        sendError(id, `Unknown method: ${method}`, -32601);
        break;
    }
  } catch (error) {
    sendError(id, `Request processing failed: ${error.message}`);
  }
}

// Main execution
function main() {
  process.stderr.write('Bridge starting...\n');

  // Process requests line by line
  rl.on('line', async (line) => {
    process.stderr.write(`Received line: ${line}\n`);
    if (line.trim()) {
      await processRequest(line.trim());
    }
  });
  
  // Handle graceful shutdown
  rl.on('close', () => {
    process.stderr.write('Bridge shutting down\n');
    // Don't exit immediately, let pending requests finish
    setTimeout(() => process.exit(0), 100);
  });
  
  process.on('SIGINT', () => {
    process.stderr.write('Received SIGINT\n');
    rl.close();
  });
  
  process.on('SIGTERM', () => {
    process.stderr.write('Received SIGTERM\n');
    rl.close();
  });
  
  process.stderr.write('Bridge ready for MCP requests\n');
}

// Start the bridge
try {
  main();
} catch (error) {
  process.stderr.write(`Bridge failed: ${error.message}\n`);
  process.exit(1);
}