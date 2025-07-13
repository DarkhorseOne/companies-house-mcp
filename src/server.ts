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
    // Server is now running silently for MCP stdio communication
  }
}