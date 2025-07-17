# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides AI assistants with access to UK Companies House data. The server implements the MCP specification and offers tools for searching companies, retrieving company profiles, officer information, and filing history.

## Key Commands

```bash
# Development
npm run dev              # Start development server with hot reload (stdio)
npm run dev:http         # Start HTTP development server
npm run dev:streamable   # Start Streamable HTTP development server
npm run build            # Compile TypeScript to JavaScript
npm run start            # Start production server (stdio)
npm run start:http       # Start HTTP production server
npm run start:streamable # Start Streamable HTTP production server
npm run type-check       # Run TypeScript type checking without compilation

# Bridges
npm run bridge           # Start HTTP bridge for MCP stdio transport
npm run streaming-bridge # Start streaming bridge (deprecated)

# Docker
docker build -t companies-house-mcp .
docker-compose up                                    # Start stdio mode
docker-compose --profile http up                    # Start HTTP mode
docker-compose --profile streamable up              # Start streamable HTTP mode
./test-docker.sh                                     # Test Docker configuration
```

## Architecture

The codebase follows a layered architecture:

### Core Components

- **`src/index.ts`**: Entry point for stdio mode MCP server
- **`src/http-index.ts`**: Entry point for HTTP mode server
- **`src/streamable-http-index.ts`**: Entry point for Streamable HTTP mode server
- **`src/server.ts`**: Main MCP server implementation (`CompaniesHouseMCPServer` class)
  - Handles MCP protocol communication via stdio transport
  - Registers and dispatches tool calls
  - Implements 4 main tools: search_companies, get_company_profile, get_company_officers, get_company_filings
- **`src/http-server.ts`**: HTTP server implementation (`CompaniesHouseHTTPServer` class)
  - Provides REST API endpoints and MCP bridge functionality
  - Supports both regular HTTP endpoints and streaming via Server-Sent Events
  - Includes health checks and tool listing endpoints
- **`src/streamable-http-server.ts`**: Streamable HTTP server implementation (`CompaniesHouseStreamableHTTPServer` class)
  - Implements MCP Streamable HTTP Transport specification
  - Uses JSON-RPC over HTTP for MCP protocol communication
  - Fully compliant with MCP transport layer standards
- **`src/services/companies-house.ts`**: API client service (`CompaniesHouseService` class)
  - Handles HTTP requests to Companies House API
  - Implements authentication using API key as username with empty password
  - Provides methods for all supported API endpoints
- **`src/types.ts`**: TypeScript type definitions for Companies House API responses

### MCP Tools Provided

1. **search_companies**: Search for UK companies by name or keyword
2. **get_company_profile**: Get detailed company information by company number
3. **get_company_officers**: Get list of company officers (directors, secretaries, etc.)
4. **get_company_filings**: Get company filing history

### Environment Configuration

- **`COMPANIES_HOUSE_API_KEY`**: Required API key from Companies House Developer Hub
- **`COMPANIES_HOUSE_BASE_URL`**: API base URL (defaults to official endpoint)

### Important Notes

- The server communicates via stdio transport as per MCP specification
- Companies House API uses HTTP Basic Auth with API key as username and empty password
- TypeScript types are defined to match Companies House API response structure
- Error handling wraps API errors in MCP error format
- The server runs continuously and processes tool calls from MCP clients

### Dependencies

- `@modelcontextprotocol/sdk`: Core MCP server functionality
- `axios`: HTTP client for API requests (includes built-in TypeScript types)
- `dotenv`: Environment variable management