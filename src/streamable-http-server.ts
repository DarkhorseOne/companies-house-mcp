import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CompaniesHouseService } from './services/companies-house';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface StreamableHTTPRequest extends FastifyRequest {
  body: JSONRPCRequest | JSONRPCNotification;
}

export class CompaniesHouseStreamableHTTPServer {
  private app: FastifyInstance;
  private companiesHouseService: CompaniesHouseService;

  constructor(apiKey: string) {
    this.app = Fastify({
      logger: {
        level: 'info',
        stream: process.stderr
      }
    });
    
    this.companiesHouseService = new CompaniesHouseService(apiKey);
    this.setupRoutes();
  }

  private async setupMiddleware(): Promise<void> {
    await this.app.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false
    });
    
    await this.app.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS']
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async () => {
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        transport: 'streamable-http'
      };
    });

    // MCP Streamable HTTP endpoint
    this.app.post('/', async (request: FastifyRequest<{Body: JSONRPCRequest | JSONRPCNotification}>, reply: FastifyReply) => {
      try {
        const jsonrpcRequest = request.body;
        
        // Handle notifications (no response needed)
        if (!('id' in jsonrpcRequest)) {
          const notification = jsonrpcRequest as JSONRPCNotification;
          await this.handleNotification(notification);
          reply.code(204).send(); // No content for notifications
          return;
        }

        // Handle requests (response needed)
        const mcpRequest = jsonrpcRequest as JSONRPCRequest;
        const response = await this.handleRequest(mcpRequest);
        
        reply.type('application/json').send(response);
      } catch (error) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: 'id' in request.body ? (request.body as JSONRPCRequest).id : null,
          error: {
            code: ErrorCode.InternalError,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        reply.code(500).send(errorResponse);
      }
    });

    // Server info endpoint for MCP discovery
    this.app.get('/info', async () => {
      return {
        name: 'companies-house-mcp-streamable',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        transport: 'streamable-http'
      };
    });
  }

  private async handleNotification(notification: JSONRPCNotification): Promise<void> {
    this.app.log.info(`Received notification: ${notification.method}`, notification.params);
    
    switch (notification.method) {
      case 'notifications/initialized':
        this.app.log.info('Client initialized');
        break;
      case 'notifications/cancelled':
        this.app.log.info('Request cancelled', notification.params);
        break;
      default:
        this.app.log.warn(`Unknown notification method: ${notification.method}`);
    }
  }

  private async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'companies-house-mcp-streamable',
                version: '1.0.0'
              }
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
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
              ]
            }
          };

        case 'tools/call':
          return await this.handleToolCall(id, params);

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: ErrorCode.MethodNotFound,
              message: `Unknown method: ${method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: ErrorCode.InternalError,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async handleToolCall(id: string | number, params: any): Promise<JSONRPCResponse> {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'search_companies': {
          const { query, items_per_page = 20 } = args;
          const result = await this.companiesHouseService.searchCompanies(query, items_per_page);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          };
        }

        case 'get_company_profile': {
          const { company_number } = args;
          const result = await this.companiesHouseService.getCompanyProfile(company_number);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          };
        }

        case 'get_company_officers': {
          const { company_number } = args;
          const result = await this.companiesHouseService.getCompanyOfficers(company_number);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          };
        }

        case 'get_company_filings': {
          const { company_number, items_per_page = 25 } = args;
          const result = await this.companiesHouseService.getCompanyFilings(company_number, items_per_page);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: ErrorCode.MethodNotFound,
              message: `Unknown tool: ${name}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: ErrorCode.InternalError,
          message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  public async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    try {
      await this.setupMiddleware();
      await this.app.listen({ port, host });
      
      process.stderr.write(`Companies House MCP Streamable HTTP Server running on http://${host}:${port}\n`);
      process.stderr.write(`Health check: http://${host}:${port}/health\n`);
      process.stderr.write(`Server info: http://${host}:${port}/info\n`);
      process.stderr.write(`MCP endpoint: POST http://${host}:${port}/\n`);
      process.stderr.write(`Transport: Streamable HTTP\n`);
    } catch (error) {
      this.app.log.error(error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    await this.app.close();
  }
}