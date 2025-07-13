# Companies House MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to UK Companies House data. This server enables AI tools to search for companies, retrieve detailed company profiles, officer information, and filing history through the official Companies House API.

## Features

- **Company Search**: Search for UK companies by name or keyword
- **Company Profiles**: Get detailed company information including registration details, addresses, and status
- **Officer Information**: Retrieve lists of company officers (directors, secretaries, etc.)
- **Filing History**: Access company filing history and documents
- **MCP Compatible**: Works with any MCP-compatible AI assistant or client

## Prerequisites

- Node.js 18 or higher
- Companies House API key (free registration at [Companies House Developer Hub](https://developer.company-information.service.gov.uk/))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd companies-house-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Companies House API key
```

4. Build the project:
```bash
npm run build
```

## Configuration

Create a `.env` file in the project root:

```env
COMPANIES_HOUSE_API_KEY=your_api_key_here
COMPANIES_HOUSE_BASE_URL=https://api.company-information.service.gov.uk
```

### Getting a Companies House API Key

1. Visit the [Companies House Developer Hub](https://developer.company-information.service.gov.uk/)
2. Create an account or sign in
3. Register a new application
4. Copy your API key to the `.env` file

## Usage

### Development

Start the development server with hot reload:
```bash
npm run dev
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

### Docker

Run using Docker:
```bash
docker build -t companies-house-mcp .
docker run -e COMPANIES_HOUSE_API_KEY=your_api_key_here companies-house-mcp
```

Or use Docker Compose:
```bash
docker-compose up
```

## MCP Client Configuration

### Local Development (Stdio Transport)

For local development or direct MCP client usage:

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/dist/index.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cloud Deployment (HTTP Bridge)

For cloud deployment where the HTTP server runs remotely:

1. **Start HTTP server on cloud server:**
```bash
npm run start:http
```

2. **Configure client to use HTTP bridge:**
```json
{
  "mcpServers": {
    "companies-house-http": {
      "command": "node",
      "args": ["/absolute/path/to/companies-house-mcp/simple-http-bridge.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here",
        "MCP_HTTP_SERVER_URL": "http://your-server:3000"
      }
    }
  }
}
```

> **Note:** For cloud deployment, see [README-HTTP.md](./README-HTTP.md) for detailed HTTP bridge configuration.

## Available Tools

The server provides the following tools for AI assistants:

### 1. search_companies
Search for UK companies by name or keyword.

**Parameters:**
- `query` (string, required): Search query for company name or keyword
- `items_per_page` (number, optional): Number of results to return (default: 20)

**Example:**
```json
{
  "name": "search_companies",
  "arguments": {
    "query": "Apple",
    "items_per_page": 10
  }
}
```

### 2. get_company_profile
Get detailed company profile information.

**Parameters:**
- `company_number` (string, required): Company number (e.g., "12345678")

**Example:**
```json
{
  "name": "get_company_profile",
  "arguments": {
    "company_number": "12345678"
  }
}
```

### 3. get_company_officers
Get list of company officers (directors, secretaries, etc.).

**Parameters:**
- `company_number` (string, required): Company number (e.g., "12345678")

**Example:**
```json
{
  "name": "get_company_officers",
  "arguments": {
    "company_number": "12345678"
  }
}
```

### 4. get_company_filings
Get company filing history.

**Parameters:**
- `company_number` (string, required): Company number (e.g., "12345678")
- `items_per_page` (number, optional): Number of filings to return (default: 25)

**Example:**
```json
{
  "name": "get_company_filings",
  "arguments": {
    "company_number": "12345678",
    "items_per_page": 50
  }
}
```

## Development

### Scripts

**Core MCP Server (Stdio):**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production stdio server
- `npm run type-check` - Run TypeScript type checking

**HTTP Bridge (Cloud Deployment):**
- `npm run start:http` - Start HTTP server for cloud deployment
- `npm run dev:http` - Start HTTP server in development mode
- `npm run bridge` - Start HTTP bridge client

### Project Structure

```
companies-house-mcp/
├── src/
│   ├── index.ts              # Stdio MCP server entry point
│   ├── server.ts             # Core MCP server implementation
│   ├── http-index.ts         # HTTP server entry point
│   ├── http-server.ts        # HTTP server implementation
│   ├── types.ts              # TypeScript type definitions
│   └── services/
│       └── companies-house.ts # Companies House API client
├── simple-http-bridge.js     # HTTP bridge client
├── dist/                     # Compiled JavaScript files
├── .env                      # Environment variables
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose configuration
├── README.md                 # Main documentation
└── README-HTTP.md            # HTTP bridge documentation
```

## API Rate Limits

The Companies House API has rate limits. Please refer to the [official documentation](https://developer.company-information.service.gov.uk/api/docs/index/gettingStarted.html) for current limits and best practices.

## Error Handling

The server includes comprehensive error handling:
- API errors are wrapped in MCP error format
- Invalid company numbers return appropriate error messages
- Network errors are caught and reported
- Missing API keys are detected at startup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues related to:
- **This MCP server**: Open an issue in this repository
- **Companies House API**: Visit the [Companies House Developer Hub](https://developer.company-information.service.gov.uk/)
- **Model Context Protocol**: Visit the [MCP documentation](https://modelcontextprotocol.io/)

## Disclaimer

This is an unofficial client for the Companies House API. Please ensure you comply with the Companies House API terms of service and data usage policies.