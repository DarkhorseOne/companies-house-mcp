#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

// Configuration
const SERVER_URL = process.env.MCP_HTTP_SERVER_URL || 'http://localhost:3000';
const RECONNECT_DELAY = parseInt(process.env.MCP_RECONNECT_DELAY || '2000');
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MCP_MAX_RETRY_ATTEMPTS || '3');

// Connection state
let retryCount = 0;

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
  timeout: 5000,
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

// Simple HTTP request with retry
async function makeHttpRequest(method, url, data = null) {
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      let response;
      if (method === 'GET') {
        response = await httpClient.get(url);
      } else if (method === 'POST') {
        response = await httpClient.post(url, data);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      // Reset retry count on success
      retryCount = 0;
      return response;
    } catch (error) {
      process.stderr.write(`HTTP request attempt ${attempt + 1} failed: ${error.message}\n`);
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, attempt);
        process.stderr.write(`Retrying in ${delay}ms...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Request failed after ${MAX_RETRY_ATTEMPTS + 1} attempts: ${error.message}`);
      }
    }
  }
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

  // Check if this is a notification (no id field)
  const isNotification = !('id' in request);

  try {
    // Handle notifications (no response required)
    if (isNotification) {
      switch (method) {
        case 'notifications/initialized':
          process.stderr.write('Received initialized notification\n');
          break;
        case 'notifications/cancelled':
          process.stderr.write(`Request cancelled: ${JSON.stringify(params)}\n`);
          break;
        default:
          process.stderr.write(`Received notification: ${method}\n`);
          break;
      }
      return; // Don't send a response for notifications
    }

    // Handle requests (response required)
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

      case 'tools/list':
        try {
          process.stderr.write('Making HTTP request to /tools\n');
          const response = await makeHttpRequest('GET', '/tools');
          process.stderr.write(`Got response with ${response.data.tools?.length || 0} tools\n`);
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
          const response = await makeHttpRequest('POST', `/mcp/tools/${name}`, args);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: response.data
          }));
        } catch (error) {
          sendError(id, `Tool execution failed: ${error.message}`);
        }
        break;

      case 'bridge/status':
        // Get connection status
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            server_url: SERVER_URL,
            retry_count: retryCount,
            max_retries: MAX_RETRY_ATTEMPTS,
            reconnect_delay: RECONNECT_DELAY
          }
        }));
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
async function main() {
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
  process.stderr.write(`Configuration:\n`);
  process.stderr.write(`  Server URL: ${SERVER_URL}\n`);
  process.stderr.write(`  Max retry attempts: ${MAX_RETRY_ATTEMPTS}\n`);
  process.stderr.write(`  Reconnect delay: ${RECONNECT_DELAY}ms\n`);
}

// Start the bridge
main().catch(error => {
  process.stderr.write(`Bridge failed: ${error.message}\n`);
  process.exit(1);
});