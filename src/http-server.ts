import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CompaniesHouseService } from './services/companies-house';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

interface MCPRequest {
  method: string;
  params?: any;
  id?: string | number;
}

export class CompaniesHouseHTTPServer {
  private app: FastifyInstance;
  private companiesHouseService: CompaniesHouseService;
  private toolsResponse: any;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;

  constructor(apiKey: string) {
    this.app = Fastify({
      logger: {
        level: 'warn', // Reduce logging to avoid stdout pollution
        stream: process.stderr // Send logs to stderr instead of stdout
      }
    });
    this.companiesHouseService = new CompaniesHouseService(apiKey);
    this.toolHandlers = new Map();
    this.setupMCPServer();
    this.setupRoutes();
  }

  private setupMCPServer(): void {
    this.toolsResponse = {
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

    // Set up tool handlers
    this.toolHandlers.set('search_companies', async (args: any) => {
      const { query, items_per_page = 20 } = args;
      const result = await this.companiesHouseService.searchCompanies(query, items_per_page);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });

    this.toolHandlers.set('get_company_profile', async (args: any) => {
      const { company_number } = args;
      const result = await this.companiesHouseService.getCompanyProfile(company_number);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });

    this.toolHandlers.set('get_company_officers', async (args: any) => {
      const { company_number } = args;
      const result = await this.companiesHouseService.getCompanyOfficers(company_number);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });

    this.toolHandlers.set('get_company_filings', async (args: any) => {
      const { company_number, items_per_page = 25 } = args;
      const result = await this.companiesHouseService.getCompanyFilings(company_number, items_per_page);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private async setupMiddleware(): Promise<void> {
    await this.app.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false
    });
    
    await this.app.register(require('@fastify/cors'), {
      origin: true,
      credentials: true
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async () => {
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    });

    // List available tools
    this.app.get('/tools', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return this.toolsResponse;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    // Execute tool via MCP interface
    this.app.post('/mcp/tools/:toolName', async (request: FastifyRequest<{
      Params: { toolName: string };
      Body: any;
    }>, reply: FastifyReply) => {
      try {
        const { toolName } = request.params;
        const toolArgs = request.body;

        const handler = this.toolHandlers.get(toolName);
        if (!handler) {
          reply.code(404);
          return { error: `Tool '${toolName}' not found` };
        }

        const result = await handler(toolArgs);
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    // Direct API endpoints for easier access
    this.app.get('/api/search/:query', async (request: FastifyRequest<{
      Params: { query: string };
      Querystring: { items_per_page?: string };
    }>, reply: FastifyReply) => {
      try {
        const { query } = request.params;
        const items_per_page = request.query.items_per_page ? 
          Number(request.query.items_per_page) : 20;
        
        const result = await this.companiesHouseService.searchCompanies(
          decodeURIComponent(query),
          items_per_page
        );
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    this.app.get('/api/company/:companyNumber', async (request: FastifyRequest<{
      Params: { companyNumber: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;
        const result = await this.companiesHouseService.getCompanyProfile(companyNumber);
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    this.app.get('/api/company/:companyNumber/officers', async (request: FastifyRequest<{
      Params: { companyNumber: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;
        const result = await this.companiesHouseService.getCompanyOfficers(companyNumber);
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    this.app.get('/api/company/:companyNumber/filings', async (request: FastifyRequest<{
      Params: { companyNumber: string };
      Querystring: { items_per_page?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;
        const items_per_page = request.query.items_per_page ? 
          Number(request.query.items_per_page) : 25;
        
        const result = await this.companiesHouseService.getCompanyFilings(
          companyNumber,
          items_per_page
        );
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });

    // Server-Sent Events (SSE) streaming endpoints
    this.app.get('/stream/search/:query', async (request: FastifyRequest<{
      Params: { query: string };
      Querystring: { items_per_page?: string };
    }>, reply: FastifyReply) => {
      try {
        const { query } = request.params;
        const items_per_page = request.query.items_per_page ? 
          Number(request.query.items_per_page) : 20;

        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Headers', 'Cache-Control');

        const result = await this.companiesHouseService.searchCompanies(
          decodeURIComponent(query),
          items_per_page
        );
        
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
        reply.raw.end();
      } catch (error) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        reply.raw.end();
      }
    });

    this.app.get('/stream/company/:companyNumber', async (request: FastifyRequest<{
      Params: { companyNumber: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;

        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Headers', 'Cache-Control');

        const result = await this.companiesHouseService.getCompanyProfile(companyNumber);
        
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
        reply.raw.end();
      } catch (error) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        reply.raw.end();
      }
    });

    this.app.get('/stream/company/:companyNumber/officers', async (request: FastifyRequest<{
      Params: { companyNumber: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;

        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Headers', 'Cache-Control');

        const result = await this.companiesHouseService.getCompanyOfficers(companyNumber);
        
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
        reply.raw.end();
      } catch (error) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        reply.raw.end();
      }
    });

    this.app.get('/stream/company/:companyNumber/filings', async (request: FastifyRequest<{
      Params: { companyNumber: string };
      Querystring: { items_per_page?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;
        const items_per_page = request.query.items_per_page ? 
          Number(request.query.items_per_page) : 25;

        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Headers', 'Cache-Control');

        const result = await this.companiesHouseService.getCompanyFilings(
          companyNumber,
          items_per_page
        );
        
        reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
        reply.raw.end();
      } catch (error) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        reply.raw.end();
      }
    });

    // MCP Bridge endpoint for stdio transport compatibility
    this.app.post('/mcp/bridge', async (request: FastifyRequest<{
      Body: any;
    }>, reply: FastifyReply) => {
      try {
        const mcpRequest = request.body as MCPRequest;
        
        if (mcpRequest.method === 'tools/list') {
          return this.toolsResponse;
        } else if (mcpRequest.method === 'tools/call') {
          const { name, arguments: args } = mcpRequest.params;
          const handler = this.toolHandlers.get(name);
          if (!handler) {
            reply.code(404);
            return { error: `Tool '${name}' not found` };
          }
          const result = await handler(args);
          return result;
        } else if (mcpRequest.method === 'initialize') {
          return {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'companies-house-mcp-http-bridge',
              version: '1.0.0'
            }
          };
        }
        
        throw new Error(`Unsupported method: ${mcpRequest.method}`);
      } catch (error) {
        reply.code(500);
        return { 
          error: (error as Error).message,
          code: ErrorCode.InternalError
        };
      }
    });
  }

  public async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    try {
      await this.setupMiddleware();
      await this.app.listen({ port, host });
      // Use stderr for logging to avoid interfering with stdout JSON
      process.stderr.write(`Companies House MCP HTTP Server running on http://${host}:${port}\n`);
      process.stderr.write(`Health check: http://${host}:${port}/health\n`);
      process.stderr.write(`Tools list: http://${host}:${port}/tools\n`);
      process.stderr.write(`MCP Bridge: http://${host}:${port}/mcp/bridge\n`);
      process.stderr.write(`\nAPI Endpoints:\n`);
      process.stderr.write(`  GET /api/search/{query}?items_per_page=20\n`);
      process.stderr.write(`  GET /api/company/{companyNumber}\n`);
      process.stderr.write(`  GET /api/company/{companyNumber}/officers\n`);
      process.stderr.write(`  GET /api/company/{companyNumber}/filings?items_per_page=25\n`);
      process.stderr.write(`\nStreaming Endpoints (Server-Sent Events):\n`);
      process.stderr.write(`  GET /stream/search/{query}?items_per_page=20\n`);
      process.stderr.write(`  GET /stream/company/{companyNumber}\n`);
      process.stderr.write(`  GET /stream/company/{companyNumber}/officers\n`);
      process.stderr.write(`  GET /stream/company/{companyNumber}/filings?items_per_page=25\n`);
    } catch (error) {
      this.app.log.error(error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    await this.app.close();
  }
}