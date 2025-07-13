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

To use this server with an MCP client, add the following configuration:

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "COMPANIES_HOUSE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

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

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
companies-house-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types.ts              # TypeScript type definitions
│   └── services/
│       └── companies-house.ts # Companies House API client
├── .env                      # Environment variables
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Docker configuration
└── docker-compose.yml        # Docker Compose configuration
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