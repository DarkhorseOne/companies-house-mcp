# Companies House MCP HTTP Bridge

This implementation provides HTTP access to the Companies House MCP server, enabling remote deployment and web-based access to the MCP tools.

## Architecture

The HTTP bridge consists of two main components:

1. **HTTP Server** (`src/http-server.ts`) - Fastify-based HTTP server that exposes MCP tools as REST endpoints
2. **HTTP Bridge Client** (`simple-http-bridge.js`) - Client-side bridge that translates MCP protocol to HTTP calls

## Features

- **Fastify-based HTTP server** with CORS and security middleware
- **Multiple endpoint types**:
  - Direct REST API endpoints (`/api/...`)
  - MCP-compatible endpoints (`/mcp/...`)
  - Bridge endpoint for stdio compatibility (`/mcp/bridge`)
- **Health checks and monitoring**
- **Graceful shutdown handling**
- **TypeScript support with proper typing**

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
# Required
COMPANIES_HOUSE_API_KEY=your_api_key_here

# Optional
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

### 3. Build and Start HTTP Server

```bash
# Build TypeScript
npm run build

# Start HTTP server
npm run start:http

# Or for development with hot reload
npm run dev:http
```

### 4. Test the HTTP Server

```bash
# Health check
curl http://localhost:3000/health

# List available tools
curl http://localhost:3000/tools

# Search companies (direct API)
curl http://localhost:3000/api/search/Apple

# Get company profile (direct API)
curl http://localhost:3000/api/company/00000006
```

## API Endpoints

### Health and Info

- `GET /health` - Health check endpoint
- `GET /tools` - List available MCP tools

### Direct REST API

- `GET /api/search/:query?items_per_page=20` - Search companies
- `GET /api/company/:companyNumber` - Get company profile
- `GET /api/company/:companyNumber/officers` - Get company officers
- `GET /api/company/:companyNumber/filings?items_per_page=25` - Get company filings

### MCP-Compatible Endpoints

- `POST /mcp/tools/:toolName` - Execute MCP tool with JSON body
- `POST /mcp/bridge` - Full MCP protocol bridge endpoint

## Using the MCP Bridge

The MCP bridge allows you to use the HTTP server with existing MCP clients that expect stdio transport.

### Local Development Setup

1. **Start the HTTP Server:**
```bash
npm run start:http
```

2. **Test HTTP Server:**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/tools
```

3. **Configure Claude Desktop:**
```json
{
  "mcpServers": {
    "companies-house-http": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/simple-http-bridge.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here",
        "MCP_HTTP_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

4. **Test the Bridge:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node simple-http-bridge.js
```

### Cloud Deployment Setup

1. **Deploy HTTP Server to Cloud:**
```bash
# On cloud server (e.g., AWS, GCP, DigitalOcean)
git clone your-repo
cd companies-house-mcp
npm install && npm run build
npm run start:http
```

2. **Configure Local Client:**
```json
{
  "mcpServers": {
    "companies-house-cloud": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/simple-http-bridge.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here",
        "MCP_HTTP_SERVER_URL": "https://your-server.com:3000"
      }
    }
  }
}
```

## Remote Deployment

### Option 1: Traditional Server Deployment

```bash
# On remote server
git clone your-repo
cd companies-house-mcp
npm install
npm run build

# Set environment variables
export COMPANIES_HOUSE_API_KEY=your_key
export PORT=3000
export HOST=0.0.0.0

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/http-index.js --name companies-house-mcp

# Or start directly
npm run start:http
```

### Option 2: Docker Deployment

```bash
# Build image
docker build -t companies-house-mcp .

# Run container
docker run -d \
  --name companies-house-mcp \
  -p 3000:3000 \
  -e COMPANIES_HOUSE_API_KEY=your_key \
  companies-house-mcp
```

### Option 3: Cloud Deployment

The HTTP server can be deployed to any cloud platform that supports Node.js:

- **Railway**: Connect git repo, set environment variables
- **Heroku**: Add `Procfile` with `web: npm run start:http`
- **DigitalOcean App Platform**: Use Node.js buildpack
- **AWS/GCP/Azure**: Deploy as container or serverless function

## Client Configuration for Remote Server

### Local Development

For connecting to a local HTTP server:

```json
{
  "mcpServers": {
    "companies-house-http": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/simple-http-bridge.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here",
        "MCP_HTTP_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Cloud Deployment

For connecting to a remote cloud server:

```json
{
  "mcpServers": {
    "companies-house-cloud": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/simple-http-bridge.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here",
        "MCP_HTTP_SERVER_URL": "https://your-server.com:3000"
      }
    }
  }
}
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **API Keys**: Store API keys securely using environment variables
3. **CORS**: Configure CORS appropriately for your use case
4. **Rate Limiting**: Consider adding rate limiting for production use
5. **Authentication**: Add API authentication if exposing publicly

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPANIES_HOUSE_API_KEY` | Required | Companies House API key |
| `PORT` | 3000 | HTTP server port |
| `HOST` | 0.0.0.0 | HTTP server host |
| `NODE_ENV` | development | Node environment |
| `MCP_HTTP_SERVER_URL` | http://localhost:3000 | Bridge target URL |
| `MCP_HTTP_TIMEOUT` | 5000 | HTTP request timeout (ms) |

## Monitoring and Logging

The HTTP server includes built-in logging via Fastify's logger. Logs include:

- Request/response logging
- Error tracking
- Health check status
- Server startup/shutdown events

For production monitoring, consider integrating with:
- **PM2** for process monitoring
- **Winston** or **Pino** for advanced logging
- **Prometheus** for metrics collection
- **Sentry** for error tracking

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if HTTP server is running on correct port
2. **API key errors**: Verify `COMPANIES_HOUSE_API_KEY` is set correctly
3. **CORS errors**: Check CORS configuration in `http-server.ts`
4. **Timeout errors**: Increase `MCP_HTTP_TIMEOUT` value

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev:http
```

### Health Checks

Monitor server health:

```bash
# Simple health check
curl http://localhost:3000/health

# Check if tools are accessible
curl http://localhost:3000/tools
```

## Performance

The HTTP bridge adds minimal overhead:
- ~5-10ms additional latency compared to stdio
- Concurrent request handling via Fastify
- Connection pooling for upstream API calls
- JSON parsing/serialization overhead

For high-throughput scenarios, consider:
- Connection pooling
- Response caching
- Load balancing multiple instances