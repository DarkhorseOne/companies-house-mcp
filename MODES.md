# MCP Server Modes

The Companies House MCP server supports three different operational modes:

## 1. Stdio Mode (Default)
Standard MCP server using stdin/stdout transport.

```bash
# Development
npm run dev

# Production
npm run start

# Docker
docker-compose up companies-house-mcp
./mcp-http-control.sh start  # Default mode
```

**Use case**: Direct MCP client integration, command-line tools.

## 2. HTTP Mode
REST API server with MCP bridge functionality.

```bash
# Development
npm run dev:http

# Production
npm run start:http

# Docker
docker-compose --profile http up companies-house-mcp-http
MCP_MODE=http ./mcp-http-control.sh start
```

**Features**:
- REST API endpoints at `/api/*`
- MCP bridge at `/mcp/bridge`
- Server-Sent Events streaming at `/stream/*`
- Health check at `/health`
- Tools list at `/tools`

**Use case**: REST API access, web applications, testing.

## 3. Streamable HTTP Mode
MCP Streamable HTTP Transport using JSON-RPC over HTTP.

```bash
# Development
npm run dev:streamable

# Production
npm run start:streamable

# Docker
docker-compose --profile streamable up companies-house-mcp-streamable
MCP_MODE=streamable ./mcp-http-control.sh start
```

**Features**:
- Full MCP JSON-RPC protocol over HTTP
- MCP endpoint at `POST /`
- Server info at `/info`
- Health check at `/health`

**Use case**: MCP clients requiring HTTP transport, distributed systems.

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   # Edit .env and set your COMPANIES_HOUSE_API_KEY
   ```

2. **Choose and start a mode**:
   ```bash
   # Stdio mode (default)
   npm run dev
   
   # HTTP mode
   npm run dev:http
   
   # Streamable HTTP mode
   npm run dev:streamable
   ```

3. **Docker deployment**:
   ```bash
   # HTTP mode
   docker-compose --profile http up
   
   # Streamable mode
   docker-compose --profile streamable up
   ```

## Testing

- **HTTP Mode**: Use browser or curl to test `/api/*` endpoints
- **Streamable Mode**: Use `./test-streamable.sh` to test JSON-RPC endpoints
- **All Modes**: Use `mcp-inspector` for full MCP protocol testing

## Control Script

The `mcp-http-control.sh` script provides unified control for all modes:

```bash
# Start different modes
MCP_MODE=stdio ./mcp-http-control.sh start
MCP_MODE=http ./mcp-http-control.sh start
MCP_MODE=streamable ./mcp-http-control.sh start

# Check status
./mcp-http-control.sh status

# View logs
./mcp-http-control.sh logs

# Stop server
./mcp-http-control.sh stop
```

## Port Configuration

| Mode | Default Port | Environment Variable |
|------|-------------|---------------------|
| Stdio | N/A | N/A |
| HTTP | 3000 | `MCP_HTTP_PORT` |
| Streamable | 3001 | `MCP_STREAMABLE_PORT` |

## API Endpoints Summary

### HTTP Mode
- `GET /health` - Health check
- `GET /tools` - List available tools
- `GET /api/search/{query}` - Search companies
- `GET /api/company/{id}` - Get company profile
- `GET /api/company/{id}/officers` - Get company officers
- `GET /api/company/{id}/filings` - Get company filings
- `GET /stream/*` - Server-Sent Events streaming versions
- `POST /mcp/bridge` - MCP bridge endpoint

### Streamable HTTP Mode
- `GET /health` - Health check
- `GET /info` - Server information
- `POST /` - MCP JSON-RPC endpoint

All modes share the same business logic and Companies House API integration.