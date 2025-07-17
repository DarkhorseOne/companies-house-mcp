# Docker Deployment Guide

This document describes how to deploy the Companies House MCP Server using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Companies House API key from [Companies House Developer Hub](https://developer.company-information.service.gov.uk/)

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your API key:
```bash
COMPANIES_HOUSE_API_KEY=your_actual_api_key_here
```

## Deployment Modes

The server supports three different deployment modes:

### 1. Stdio Mode (Default)

For MCP clients that communicate via stdin/stdout:

```bash
docker-compose up companies-house-mcp
```

This mode is suitable for:
- Local MCP client integrations
- Command-line tools
- Development environments

### 2. HTTP Mode

For REST API access with additional MCP bridge functionality:

```bash
docker-compose --profile http up companies-house-mcp-http
```

This mode provides:
- REST API endpoints at `/api/*`
- MCP bridge endpoint at `/mcp/bridge`
- Health check at `/health`
- Tools list at `/tools`

Default port: 3000 (configurable via `MCP_HTTP_PORT`)

### 3. Streamable HTTP Mode

For MCP Streamable HTTP Transport (JSON-RPC over HTTP):

```bash
docker-compose --profile streamable up companies-house-mcp-streamable
```

This mode provides:
- Full MCP JSON-RPC protocol over HTTP
- MCP endpoint at `POST /`
- Server info at `/info`
- Health check at `/health`

Default port: 3001 (configurable via `MCP_STREAMABLE_PORT`)

## Building the Image

To build the Docker image manually:

```bash
docker build -t companies-house-mcp .
```

## Running Multiple Modes

You can run different modes simultaneously on different ports:

```bash
# Run HTTP mode on port 3000 and Streamable mode on port 3001
MCP_HTTP_PORT=3000 MCP_STREAMABLE_PORT=3001 docker-compose --profile http --profile streamable up
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMPANIES_HOUSE_API_KEY` | Your Companies House API key | Required |
| `COMPANIES_HOUSE_BASE_URL` | Companies House API base URL | https://api.company-information.service.gov.uk |
| `NODE_ENV` | Node environment | production |
| `MCP_MODE` | Server mode (stdio/http/streamable) | stdio |
| `MCP_HTTP_PORT` | HTTP mode port | 3000 |
| `MCP_STREAMABLE_PORT` | Streamable HTTP mode port | 3000 |
| `MCP_STREAMABLE_HOST` | Streamable HTTP mode host | 0.0.0.0 |

## Health Checks

All modes include health check endpoints:

- **HTTP mode**: `GET http://localhost:3000/health`
- **Streamable mode**: `GET http://localhost:3001/health`

## Logs

Logs are written to stderr and can be viewed with:

```bash
docker-compose logs -f [service-name]
```

## Stopping Services

```bash
docker-compose down
```

## Examples

### Testing HTTP Mode

```bash
# Start HTTP mode
docker-compose --profile http up -d companies-house-mcp-http

# Test health endpoint
curl http://localhost:3000/health

# Test API endpoint
curl "http://localhost:3000/api/search/microsoft"

# Test MCP bridge
curl -X POST http://localhost:3000/mcp/bridge \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### Testing Streamable HTTP Mode

```bash
# Start streamable mode
docker-compose --profile streamable up -d companies-house-mcp-streamable

# Test health endpoint
curl http://localhost:3001/health

# Test MCP JSON-RPC endpoint
curl -X POST http://localhost:3001/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

## Troubleshooting

### Container won't start
- Check that your API key is set correctly in `.env`
- Verify the port isn't already in use
- Check logs with `docker-compose logs [service-name]`

### API returns 401 errors
- Verify your Companies House API key is valid
- Check that the API key has the correct permissions

### Port conflicts
- Change the port in `.env` file
- Use different ports for different modes

## Security Considerations

- Never commit your `.env` file with real API keys
- Use environment-specific `.env` files for different deployments
- Consider using Docker secrets for production deployments
- The server runs as a non-root user inside the container