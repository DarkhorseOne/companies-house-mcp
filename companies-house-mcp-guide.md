# UK Companies House MCP Service Development Guide

## Prerequisites

- Node.js 18+ installed
- TypeScript knowledge
- Companies House API key (free registration required)
- Understanding of REST APIs

## Step 1: Set Up the Project Structure

```bash
mkdir companies-house-mcp
cd companies-house-mcp
npm init -y
```

Install required dependencies:

```bash
# Core MCP dependencies
npm install @modelcontextprotocol/sdk

# Development dependencies
npm install -D typescript @types/node ts-node nodemon

# HTTP client and utilities
npm install axios dotenv
npm install -D @types/axios
```

Create the basic project structure:

```
companies-house-mcp/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── types.ts
│   └── services/
│       └── companies-house.ts
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

## Step 2: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "type-check": "tsc --noEmit"
  }
}
```

## Step 3: Set Up Environment Configuration

Create `.env` file:

```env
COMPANIES_HOUSE_API_KEY=your_api_key_here
COMPANIES_HOUSE_BASE_URL=https://api.company-information.service.gov.uk
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
*.log
.DS_Store
```

## Step 4: Define TypeScript Types

Create `src/types.ts`:

```typescript
export interface CompanyProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  registered_office_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    next_made_up_to?: string;
  };
}

export interface CompanySearch {
  total_results: number;
  items: CompanySearchItem[];
}

export interface CompanySearchItem {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type: string;
  date_of_creation: string;
  address: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
  };
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
  address: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface CompanyFiling {
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  type: string;
}
```

## Step 5: Create Companies House Service

Create `src/services/companies-house.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';
import { CompanyProfile, CompanySearch, CompanyOfficer, CompanyFiling } from '../types';

export class CompaniesHouseService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'https://api.company-information.service.gov.uk') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.apiKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async searchCompanies(query: string, itemsPerPage: number = 20): Promise<CompanySearch> {
    try {
      const response = await this.client.get('/search/companies', {
        params: {
          q: query,
          items_per_page: itemsPerPage,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search companies: ${error}`);
    }
  }

  async getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
    try {
      const response = await this.client.get(`/company/${companyNumber}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get company profile: ${error}`);
    }
  }

  async getCompanyOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
    try {
      const response = await this.client.get(`/company/${companyNumber}/officers`);
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get company officers: ${error}`);
    }
  }

  async getCompanyFilings(companyNumber: string, itemsPerPage: number = 25): Promise<CompanyFiling[]> {
    try {
      const response = await this.client.get(`/company/${companyNumber}/filing-history`, {
        params: {
          items_per_page: itemsPerPage,
        },
      });
      return response.data.items || [];
    } catch (error) {
      throw new Error(`Failed to get company filings: ${error}`);
    }
  }
}
```

## Step 6: Create the MCP Server

Create `src/server.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CompaniesHouseService } from './services/companies-house';

export class CompaniesHouseMCPServer {
  private server: Server;
  private companiesHouseService: CompaniesHouseService;

  constructor(apiKey: string) {
    this.companiesHouseService = new CompaniesHouseService(apiKey);
    this.server = new Server(
      {
        name: 'companies-house-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_companies',
            description: 'Search for UK companies by name or keyword',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for company name or keyword',
                },
                items_per_page: {
                  type: 'number',
                  description: 'Number of results to return (default: 20)',
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_company_profile',
            description: 'Get detailed company profile information',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
              },
              required: ['company_number'],
            },
          },
          {
            name: 'get_company_officers',
            description: 'Get list of company officers (directors, secretaries, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
              },
              required: ['company_number'],
            },
          },
          {
            name: 'get_company_filings',
            description: 'Get company filing history',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
                items_per_page: {
                  type: 'number',
                  description: 'Number of filings to return (default: 25)',
                  default: 25,
                },
              },
              required: ['company_number'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_companies': {
            const { query, items_per_page = 20 } = args as {
              query: string;
              items_per_page?: number;
            };
            const result = await this.companiesHouseService.searchCompanies(query, items_per_page);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_profile': {
            const { company_number } = args as { company_number: string };
            const result = await this.companiesHouseService.getCompanyProfile(company_number);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_officers': {
            const { company_number } = args as { company_number: string };
            const result = await this.companiesHouseService.getCompanyOfficers(company_number);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_filings': {
            const { company_number, items_per_page = 25 } = args as {
              company_number: string;
              items_per_page?: number;
            };
            const result = await this.companiesHouseService.getCompanyFilings(company_number, items_per_page);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Companies House MCP server running on stdio');
  }
}
```

## Step 7: Create the Main Entry Point

Create `src/index.ts`:

```typescript
import dotenv from 'dotenv';
import { CompaniesHouseMCPServer } from './server';

dotenv.config();

async function main() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  
  if (!apiKey) {
    console.error('COMPANIES_HOUSE_API_KEY environment variable is required');
    process.exit(1);
  }

  const server = new CompaniesHouseMCPServer(apiKey);
  await server.run();
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
```

## Step 8: Get Companies House API Key

1. Visit [Companies House Developer Hub](https://developer.company-information.service.gov.uk/)
2. Create an account or sign in
3. Register a new application
4. Copy your API key to the `.env` file

## Step 9: Build and Test

Build the project:

```bash
npm run build
```

Test the server:

```bash
npm run dev
```

## Step 10: Create MCP Configuration

Create a configuration file for MCP clients (e.g., `mcp-config.json`):

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

## Step 11: Testing the MCP Server

### Method 1: Using MCP Inspector (Recommended)

The MCP Inspector is a web-based tool for testing MCP servers:

1. **Install MCP Inspector:**
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Start your MCP server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, run the inspector:**
   ```bash
   mcp-inspector node dist/index.js
   ```

4. **Open your browser to** `http://localhost:3000` to interact with your MCP server

### Method 2: Manual Testing with Node.js

Create a test script `test-mcp.js`:

```javascript
const { spawn } = require('child_process');

// Spawn the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test list tools
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Test search companies
const searchRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'search_companies',
    arguments: {
      query: 'Apple',
      items_per_page: 5
    }
  }
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(searchRequest) + '\n');
}, 1000);

server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

// Clean up after 5 seconds
setTimeout(() => {
  server.kill();
}, 5000);
```

Run the test:
```bash
node test-mcp.js
```

### Method 3: Using Claude Desktop

1. **Configure Claude Desktop** by editing the config file:
   
   **On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add your MCP server:**
   ```json
   {
     "mcpServers": {
       "companies-house": {
         "command": "node",
         "args": ["path/to/your/companies-house-mcp/dist/index.js"],
         "env": {
           "COMPANIES_HOUSE_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop** and test by asking Claude to search for companies

### Method 4: Unit Tests

Create `src/tests/companies-house.test.ts`:

```typescript
import { CompaniesHouseService } from '../services/companies-house';

describe('CompaniesHouseService', () => {
  let service: CompaniesHouseService;

  beforeEach(() => {
    service = new CompaniesHouseService(process.env.COMPANIES_HOUSE_API_KEY || 'test-key');
  });

  test('should search companies', async () => {
    const result = await service.searchCompanies('Apple');
    expect(result).toHaveProperty('items');
    expect(result.items).toBeInstanceOf(Array);
  });

  test('should get company profile', async () => {
    // Use a known company number for testing
    const result = await service.getCompanyProfile('00000006');
    expect(result).toHaveProperty('company_name');
    expect(result).toHaveProperty('company_number');
  });
});
```

Install testing dependencies:
```bash
npm install -D jest @types/jest ts-jest
```

Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts

## Step 12: Enhanced Features (Optional)

Consider adding these enhancements:

1. **Caching**: Implement Redis or in-memory caching for frequently accessed data
2. **Rate limiting**: Add proper rate limiting to respect API limits
3. **Error handling**: Implement more robust error handling and logging
4. **Validation**: Add input validation for company numbers and search queries
5. **Pagination**: Handle API pagination for large result sets
6. **Additional endpoints**: Add more Companies House API endpoints like PSCs (People with Significant Control)

## Step 13: Docker Configuration

Create a `Dockerfile` in the project root:

```dockerfile
# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R mcp:nodejs /app
USER mcp

# Expose the port (optional, MCP typically uses stdio)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Create a `.dockerignore` file:

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.vscode
dist
*.log
```

Create a `docker-compose.yml` for easier development:

```yaml
version: '3.8'

services:
  companies-house-mcp:
    build: .
    container_name: companies-house-mcp
    environment:
      - COMPANIES_HOUSE_API_KEY=${COMPANIES_HOUSE_API_KEY}
      - COMPANIES_HOUSE_BASE_URL=https://api.company-information.service.gov.uk
      - NODE_ENV=production
    volumes:
      # Mount logs directory if needed
      - ./logs:/app/logs
    restart: unless-stopped
    stdin_open: true
    tty: true
    # For MCP stdio communication
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

### Docker Build and Run Commands

Build the Docker image:

```bash
docker build -t companies-house-mcp .
```

Run the container:

```bash
docker run -e COMPANIES_HOUSE_API_KEY=your_api_key_here companies-house-mcp
```

Or use Docker Compose:

```bash
# Make sure to set COMPANIES_HOUSE_API_KEY in your .env file
docker-compose up -d
```

### Multi-stage Dockerfile (Production Optimized)

For production, use this optimized multi-stage Dockerfile:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership
RUN chown -R mcp:nodejs /app

# Switch to non-root user
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

## Step 15: Remote Server Deployment

### Method 1: HTTP Bridge (Recommended)

Create an HTTP wrapper for your MCP server that can be deployed remotely.

#### Create HTTP Server Wrapper

Create `src/http-server.ts`:

```typescript
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CompaniesHouseService } from './services/companies-house';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

export class CompaniesHouseHTTPServer {
  private app: express.Application;
  private companiesHouseService: CompaniesHouseService;
  private mcpServer: Server;

  constructor(apiKey: string) {
    this.app = express();
    this.companiesHouseService = new CompaniesHouseService(apiKey);
    this.setupMCPServer();
    this.setupRoutes();
  }

  private setupMCPServer(): void {
    this.mcpServer = new Server(
      {
        name: 'companies-house-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Copy the tool handlers from your original server.ts
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_companies',
            description: 'Search for UK companies by name or keyword',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for company name or keyword',
                },
                items_per_page: {
                  type: 'number',
                  description: 'Number of results to return (default: 20)',
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_company_profile',
            description: 'Get detailed company profile information',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
              },
              required: ['company_number'],
            },
          },
          {
            name: 'get_company_officers',
            description: 'Get list of company officers',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
              },
              required: ['company_number'],
            },
          },
          {
            name: 'get_company_filings',
            description: 'Get company filing history',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
                items_per_page: {
                  type: 'number',
                  description: 'Number of filings to return (default: 25)',
                  default: 25,
                },
              },
              required: ['company_number'],
            },
          },
        ],
      };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_companies': {
            const { query, items_per_page = 20 } = args as {
              query: string;
              items_per_page?: number;
            };
            const result = await this.companiesHouseService.searchCompanies(query, items_per_page);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_profile': {
            const { company_number } = args as { company_number: string };
            const result = await this.companiesHouseService.getCompanyProfile(company_number);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_officers': {
            const { company_number } = args as { company_number: string };
            const result = await this.companiesHouseService.getCompanyOfficers(company_number);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_company_filings': {
            const { company_number, items_per_page = 25 } = args as {
              company_number: string;
              items_per_page?: number;
            };
            const result = await this.companiesHouseService.getCompanyFilings(company_number, items_per_page);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
      }
    });
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // List available tools
    this.app.get('/tools', async (req, res) => {
      try {
        const toolsResponse = await this.mcpServer.request(
          { method: 'tools/list', params: {} },
          ListToolsRequestSchema
        );
        res.json(toolsResponse);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Execute tool
    this.app.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const toolArgs = req.body;

        const response = await this.mcpServer.request(
          {
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: toolArgs,
            },
          },
          CallToolRequestSchema
        );

        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Direct API endpoints for easier access
    this.app.get('/api/search/:query', async (req, res) => {
      try {
        const { query } = req.params;
        const { items_per_page = 20 } = req.query;
        const result = await this.companiesHouseService.searchCompanies(
          query,
          Number(items_per_page)
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/company/:companyNumber', async (req, res) => {
      try {
        const { companyNumber } = req.params;
        const result = await this.companiesHouseService.getCompanyProfile(companyNumber);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/company/:companyNumber/officers', async (req, res) => {
      try {
        const { companyNumber } = req.params;
        const result = await this.companiesHouseService.getCompanyOfficers(companyNumber);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/company/:companyNumber/filings', async (req, res) => {
      try {
        const { companyNumber } = req.params;
        const { items_per_page = 25 } = req.query;
        const result = await this.companiesHouseService.getCompanyFilings(
          companyNumber,
          Number(items_per_page)
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`Companies House MCP HTTP Server running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`Tools list: http://localhost:${port}/tools`);
    });
  }
}
```

#### Create HTTP Server Entry Point

Create `src/http-index.ts`:

```typescript
import dotenv from 'dotenv';
import { CompaniesHouseHTTPServer } from './http-server';

dotenv.config();

async function main() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const port = Number(process.env.PORT) || 3000;
  
  if (!apiKey) {
    console.error('COMPANIES_HOUSE_API_KEY environment variable is required');
    process.exit(1);
  }

  const server = new CompaniesHouseHTTPServer(apiKey);
  server.start(port);
}

main().catch((error) => {
  console.error('HTTP Server failed to start:', error);
  process.exit(1);
});
```

#### Install Express Dependencies

```bash
npm install express cors helmet
npm install -D @types/express @types/cors
```

#### Update package.json

Add new scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "start:http": "node dist/http-index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "dev:http": "nodemon --exec ts-node src/http-index.ts"
  }
}
```

### Method 2: WebSocket Bridge

Create `src/websocket-server.ts`:

```typescript
import WebSocket from 'ws';
import { CompaniesHouseMCPServer } from './server';

export class CompaniesHouseWebSocketServer {
  private wss: WebSocket.Server;
  private mcpServer: CompaniesHouseMCPServer;

  constructor(apiKey: string, port: number = 8080) {
    this.mcpServer = new CompaniesHouseMCPServer(apiKey);
    this.wss = new WebSocket.Server({ port });
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', async (message) => {
        try {
          const request = JSON.parse(message.toString());
          // Handle MCP protocol over WebSocket
          // This would require adapting the stdio transport to WebSocket
          // Implementation depends on your specific needs
        } catch (error) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }

  public start(): void {
    console.log(`WebSocket server running on port ${this.wss.options.port}`);
  }
}
```

### Method 3: SSH Tunneling (Simple Solution)

For the original stdio-based MCP server, you can use SSH tunneling:

#### On your remote server:

1. **Deploy your MCP server:**
   ```bash
   # Upload your built MCP server to remote server
   scp -r dist/ user@remote-server:/path/to/companies-house-mcp/
   ```

2. **Install dependencies on remote server:**
   ```bash
   ssh user@remote-server
   cd /path/to/companies-house-mcp
   npm install --production
   ```

#### On your local machine (Claude Desktop config):

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "ssh",
      "args": [
        "user@remote-server",
        "cd /path/to/companies-house-mcp && COMPANIES_HOUSE_API_KEY=your_key node dist/index.js"
      ]
    }
  }
}
```

### Method 4: Docker on Remote Server

#### Build and push Docker image:

```bash
# Build the image
docker build -t companies-house-mcp .

# Tag for your registry
docker tag companies-house-mcp your-registry/companies-house-mcp:latest

# Push to registry
docker push your-registry/companies-house-mcp:latest
```

#### Deploy on remote server:

```bash
# On remote server
docker run -d \
  --name companies-house-mcp \
  --restart unless-stopped \
  -e COMPANIES_HOUSE_API_KEY=your_key \
  -p 3000:3000 \
  your-registry/companies-house-mcp:latest
```

#### Update tsconfig.json for HTTP server:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Method 5: Cloud Deployment

#### AWS Lambda (Serverless)

Create `src/lambda.ts`:

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { CompaniesHouseService } from './services/companies-house';

const companiesHouseService = new CompaniesHouseService(process.env.COMPANIES_HOUSE_API_KEY!);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { httpMethod, path, body } = event;
    
    if (httpMethod === 'GET' && path.startsWith('/search/')) {
      const query = path.split('/search/')[1];
      const result = await companiesHouseService.searchCompanies(decodeURIComponent(query));
      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

#### Railway/Heroku/DigitalOcean

Create `Procfile`:

```
web: npm run start:http
```

Add to `package.json`:

```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### Client Configuration for Remote HTTP Server

For the HTTP server approach, update your Claude Desktop config to use a bridge script:

Create `mcp-http-bridge.js`:

```javascript
const axios = require('axios');

const SERVER_URL = 'http://your-remote-server:3000';

async function main() {
  process.stdin.on('data', async (data) => {
    try {
      const request = JSON.parse(data.toString());
      
      if (request.method === 'tools/list') {
        const response = await axios.get(`${SERVER_URL}/tools`);
        console.log(JSON.stringify(response.data));
      } else if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        const response = await axios.post(`${SERVER_URL}/tools/${name}`, args);
        console.log(JSON.stringify(response.data));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
    }
  });
}

main();
```

Then in Claude Desktop config:

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "node",
      "args": ["path/to/mcp-http-bridge.js"]
    }
  }
}
```

### Security Considerations

1. **API Key Security:** Use environment variables or secure key management
2. **HTTPS:** Always use HTTPS in production
3. **Authentication:** Add API authentication for your HTTP endpoints
4. **Rate Limiting:** Implement rate limiting to prevent abuse
5. **CORS:** Configure CORS appropriately for your use case

### Monitoring and Logging

Add logging and monitoring to your remote server:

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/http-index.js --name companies-house-mcp

# Monitor
pm2 monit

# Logs
pm2 logs companies-house-mcp
```

For production deployment:

### Traditional Deployment
1. Use PM2 or similar process manager
2. Set up proper logging
3. Configure environment variables securely
4. Monitor API usage and rate limits
5. Set up health checks

### Docker Deployment
1. **Build and push to registry:**
   ```bash
   docker build -t your-registry/companies-house-mcp:latest .
   docker push your-registry/companies-house-mcp:latest
   ```

2. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Kubernetes deployment** (create `k8s-deployment.yaml`):
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: companies-house-mcp
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: companies-house-mcp
     template:
       metadata:
         labels:
           app: companies-house-mcp
       spec:
         containers:
         - name: companies-house-mcp
           image: your-registry/companies-house-mcp:latest
           env:
           - name: COMPANIES_HOUSE_API_KEY
             valueFrom:
               secretKeyRef:
                 name: companies-house-secret
                 key: api-key
           ports:
           - containerPort: 3000
   ```

4. **Docker Swarm deployment:**
   ```bash
   docker stack deploy -c docker-compose.yml companies-house-stack
   ```

## Troubleshooting

Common issues and solutions:

- **API Key Invalid**: Ensure your API key is correctly set in the environment variable
- **Rate Limiting**: Companies House API has rate limits - implement proper backoff strategies
- **Company Number Format**: Ensure company numbers are correctly formatted (8 digits, padded with zeros if needed)
- **CORS Issues**: Not applicable for MCP servers as they don't run in browsers

This guide provides a complete foundation for building an MCP service that integrates with the UK Companies House API. The service will allow AI assistants to search for companies, retrieve detailed company information, officer details, and filing history.: 'ts-jest',
  },
};
```

### Method 5: Docker Testing

Test the Docker container:

```bash
# Build the image
docker build -t companies-house-mcp .

# Run with environment variable
docker run -e COMPANIES_HOUSE_API_KEY=your_api_key_here companies-house-mcp

# Or use docker-compose
docker-compose up
```

### Method 6: Integration Testing Script

Create `test-integration.js`:

```javascript
const { execSync } = require('child_process');

async function testMCPServer() {
  console.log('Testing MCP Server Integration...');
  
  try {
    // Test 1: Server starts without errors
    console.log('✓ Testing server startup...');
    const serverProcess = execSync('timeout 5s npm run dev', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    // Test 2: API connectivity (optional - requires API key)
    if (process.env.COMPANIES_HOUSE_API_KEY) {
      console.log('✓ API key found, testing API connectivity...');
      // Add API connectivity test here
    }
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMCPServer();
```

### Test Data and Examples

**Real UK company numbers for testing:**
- `00000006` - LONDON BOROUGH OF SOUTHWARK
- `00000001` - THE GIRLS' DAY SCHOOL TRUST
- `00000002` - UNIVERSITY OF CAMBRIDGE

**Sample test commands:**

1. **Search for companies:**
   ```json
   {
     "name": "search_companies",
     "arguments": {
       "query": "Apple",
       "items_per_page": 5
     }
   }
   ```

2. **Get company profile:**
   ```json
   {
     "name": "get_company_profile",
     "arguments": {
       "company_number": "00000006"
     }
   }
   ```

3. **Get company officers:**
   ```json
   {
     "name": "get_company_officers",
     "arguments": {
       "company_number": "00000006"
     }
   }
   ```

4. **Get company filings:**
   ```json
   {
     "name": "get_company_filings",
     "arguments": {
       "company_number": "00000006",
       "items_per_page": 10
     }
   }
   ```

### Common Issues and Solutions

1. **API Key Issues:**
   - Ensure your API key is correctly set in `.env`
   - Check that the API key is active on Companies House website

2. **Rate Limiting:**
   - Companies House has rate limits (600 requests per 5 minutes)
   - Add delays between test requests

3. **Company Number Format:**
   - Ensure 8-digit format with leading zeros if needed
   - Example: `6` becomes `00000006`

4. **Network Issues:**
   - Test direct API access first: `curl -u your_api_key: https://api.company-information.service.gov.uk/company/00000006`

### Debugging Tips

1. **Enable verbose logging:**
   ```bash
   DEBUG=* npm run dev
   ```

2. **Check API responses:**
   Add console.log statements in your service methods

3. **Validate JSON-RPC format:**
   Ensure your requests follow the correct JSON-RPC 2.0 format

4. **Monitor network traffic:**
   Use tools like Wireshark or browser dev tools to inspect API calls

## Step 12: Enhanced Features (Optional)

Consider adding these enhancements:

1. **Caching**: Implement Redis or in-memory caching for frequently accessed data
2. **Rate limiting**: Add proper rate limiting to respect API limits
3. **Error handling**: Implement more robust error handling and logging
4. **Validation**: Add input validation for company numbers and search queries
5. **Pagination**: Handle API pagination for large result sets
6. **Additional endpoints**: Add more Companies House API endpoints like PSCs (People with Significant Control)

## Step 13: Docker Configuration

Create a `Dockerfile` in the project root:

```dockerfile
# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R mcp:nodejs /app
USER mcp

# Expose the port (optional, MCP typically uses stdio)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Create a `.dockerignore` file:

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.vscode
dist
*.log
```

Create a `docker-compose.yml` for easier development:

```yaml
version: '3.8'

services:
  companies-house-mcp:
    build: .
    container_name: companies-house-mcp
    environment:
      - COMPANIES_HOUSE_API_KEY=${COMPANIES_HOUSE_API_KEY}
      - COMPANIES_HOUSE_BASE_URL=https://api.company-information.service.gov.uk
      - NODE_ENV=production
    volumes:
      # Mount logs directory if needed
      - ./logs:/app/logs
    restart: unless-stopped
    stdin_open: true
    tty: true
    # For MCP stdio communication
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

### Docker Build and Run Commands

Build the Docker image:

```bash
docker build -t companies-house-mcp .
```

Run the container:

```bash
docker run -e COMPANIES_HOUSE_API_KEY=your_api_key_here companies-house-mcp
```

Or use Docker Compose:

```bash
# Make sure to set COMPANIES_HOUSE_API_KEY in your .env file
docker-compose up -d
```

### Multi-stage Dockerfile (Production Optimized)

For production, use this optimized multi-stage Dockerfile:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Change ownership
RUN chown -R mcp:nodejs /app

# Switch to non-root user
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

## Step 14: Deployment

For production deployment:

### Traditional Deployment
1. Use PM2 or similar process manager
2. Set up proper logging
3. Configure environment variables securely
4. Monitor API usage and rate limits
5. Set up health checks

### Docker Deployment
1. **Build and push to registry:**
   ```bash
   docker build -t your-registry/companies-house-mcp:latest .
   docker push your-registry/companies-house-mcp:latest
   ```

2. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Kubernetes deployment** (create `k8s-deployment.yaml`):
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: companies-house-mcp
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: companies-house-mcp
     template:
       metadata:
         labels:
           app: companies-house-mcp
       spec:
         containers:
         - name: companies-house-mcp
           image: your-registry/companies-house-mcp:latest
           env:
           - name: COMPANIES_HOUSE_API_KEY
             valueFrom:
               secretKeyRef:
                 name: companies-house-secret
                 key: api-key
           ports:
           - containerPort: 3000
   ```

4. **Docker Swarm deployment:**
   ```bash
   docker stack deploy -c docker-compose.yml companies-house-stack
   ```

## Troubleshooting

Common issues and solutions:

- **API Key Invalid**: Ensure your API key is correctly set in the environment variable
- **Rate Limiting**: Companies House API has rate limits - implement proper backoff strategies
- **Company Number Format**: Ensure company numbers are correctly formatted (8 digits, padded with zeros if needed)
- **CORS Issues**: Not applicable for MCP servers as they don't run in browsers

This guide provides a complete foundation for building an MCP service that integrates with the UK Companies House API. The service will allow AI assistants to search for companies, retrieve detailed company information, officer details, and filing history.