#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

// Configuration
const STREAMABLE_SERVER_URL = process.env.MCP_STREAMABLE_SERVER_URL || 'http://localhost:3001';
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
  baseURL: STREAMABLE_SERVER_URL,
  timeout: 30000,
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
async function makeStreamableRequest(jsonrpcRequest) {
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await httpClient.post('/', jsonrpcRequest);
      
      // Reset retry count on success
      retryCount = 0;
      return response.data;
    } catch (error) {
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Request failed after ${MAX_RETRY_ATTEMPTS + 1} attempts: ${error.message}`);
      }
    }
  }
}

// Check server health
async function checkServerHealth() {
  try {
    const response = await httpClient.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Process a single MCP request
async function processRequest(data) {
  let request;
  
  try {
    request = JSON.parse(data);
  } catch (error) {
    sendError(null, 'Invalid JSON');
    return;
  }

  const { id, method, params } = request;

  // Check if this is a notification (no id field)
  const isNotification = !('id' in request);

  try {
    // Handle notifications (no response required)
    if (isNotification) {
      // Silently handle notifications
      return;
    }

    // Handle requests by forwarding to streamable HTTP server
    try {
      const response = await makeStreamableRequest(request);
      
      // Forward the response directly
      console.log(JSON.stringify(response));
    } catch (error) {
      sendError(id, `Streamable server request failed: ${error.message}`);
    }
  } catch (error) {
    sendError(id, `Request processing failed: ${error.message}`);
  }
}

// Main execution
function main() {
  // Process requests line by line
  rl.on('line', (line) => {
    if (line.trim()) {
      processRequest(line.trim()).catch(error => {
        sendError(null, `Processing error: ${error.message}`);
      });
    }
  });
  
  // Handle graceful shutdown
  rl.on('close', () => {
    // Give some time for pending requests to complete
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
  
  process.on('SIGINT', () => {
    rl.close();
  });
  
  process.on('SIGTERM', () => {
    rl.close();
  });
  
  // Check server health asynchronously without blocking
  // Don't output anything to stderr - just silently check
  checkServerHealth().catch(() => {
    // Silently handle health check errors
  });
}

// Start the bridge
try {
  main();
} catch (error) {
  // Silently exit on error to avoid interfering with MCP clients
  process.exit(1);
}