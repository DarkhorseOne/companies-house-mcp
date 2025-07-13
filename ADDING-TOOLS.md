# Adding New Tools to Companies House MCP Server

This guide explains how to add new tools to the Companies House MCP Server, covering both stdio and HTTP implementations.

## Overview

To add a new tool to the MCP server, you need to:

1. **Define TypeScript types** for the new API endpoint
2. **Add the service method** in the Companies House service
3. **Register the tool** in both stdio and HTTP servers
4. **Update documentation** and rebuild the project

## Step-by-Step Guide

### Step 1: Define TypeScript Types

First, add type definitions for the new API endpoint in `src/types.ts`:

```typescript
// Example: Adding company charges (secured debts) support
export interface CompanyCharge {
  id: string;
  charge_code: string;
  charge_number: number;
  classification: {
    description: string;
    type: string;
  };
  status: string;
  delivered_on: string;
  created_on: string;
  particulars: {
    description?: string;
    contains_floating_charge?: boolean;
    contains_fixed_charge?: boolean;
    floating_charge_covers_all?: boolean;
  };
  secured_details?: {
    description?: string;
    type?: string;
  };
  transactions?: Array<{
    delivered_on: string;
    filing_type: string;
    links: {
      filing: string;
    };
  }>;
}

export interface CompanyChargesResponse {
  total_count: number;
  unfiltered_count: number;
  satisfied_count: number;
  part_satisfied_count: number;
  items: CompanyCharge[];
}
```

### Step 2: Add Service Method

Add the new method to `src/services/companies-house.ts`:

```typescript
export class CompaniesHouseService {
  // ... existing methods ...

  async getCompanyCharges(companyNumber: string, itemsPerPage: number = 25): Promise<CompanyChargesResponse> {
    try {
      const response = await this.client.get(`/company/${companyNumber}/charges`, {
        params: {
          items_per_page: itemsPerPage,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get company charges: ${error}`);
    }
  }
}
```

### Step 3: Register Tool in Stdio Server

Add the tool definition and handler in `src/server.ts`:

```typescript
export class CompaniesHouseMCPServer {
  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // ... existing tools ...
          {
            name: 'get_company_charges',
            description: 'Get company charges (secured debts, mortgages, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                company_number: {
                  type: 'string',
                  description: 'Company number (e.g., 12345678)',
                },
                items_per_page: {
                  type: 'number',
                  description: 'Number of charges to return (default: 25)',
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
          // ... existing cases ...
          
          case 'get_company_charges': {
            const { company_number, items_per_page = 25 } = args as {
              company_number: string;
              items_per_page?: number;
            };
            const result = await this.companiesHouseService.getCompanyCharges(company_number, items_per_page);
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
}
```

### Step 4: Register Tool in HTTP Server

Add the tool to the HTTP server in `src/http-server.ts`:

```typescript
export class CompaniesHouseHTTPServer {
  private setupMCPServer(): void {
    this.toolsResponse = {
      tools: [
        // ... existing tools ...
        {
          name: 'get_company_charges',
          description: 'Get company charges (secured debts, mortgages, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              company_number: {
                type: 'string',
                description: 'Company number (e.g., 12345678)',
              },
              items_per_page: {
                type: 'number',
                description: 'Number of charges to return (default: 25)',
                default: 25,
              },
            },
            required: ['company_number'],
          },
        },
      ],
    };

    // Add tool handler
    this.toolHandlers.set('get_company_charges', async (args: any) => {
      const { company_number, items_per_page = 25 } = args;
      const result = await this.companiesHouseService.getCompanyCharges(company_number, items_per_page);
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

  private setupRoutes(): void {
    // ... existing routes ...

    // Add direct API endpoint
    this.app.get('/api/company/:companyNumber/charges', async (request: FastifyRequest<{
      Params: { companyNumber: string };
      Querystring: { items_per_page?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyNumber } = request.params;
        const items_per_page = request.query.items_per_page ? 
          Number(request.query.items_per_page) : 25;
        
        const result = await this.companiesHouseService.getCompanyCharges(
          companyNumber,
          items_per_page
        );
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });
  }
}
```

### Step 5: Update Documentation

Add the new tool to the README.md file:

```markdown
### 5. get_company_charges
Get company charges (secured debts, mortgages, etc.).

**Parameters:**
- `company_number` (string, required): Company number (e.g., "12345678")
- `items_per_page` (number, optional): Number of charges to return (default: 25)

**Example:**
```json
{
  "name": "get_company_charges",
  "arguments": {
    "company_number": "12345678",
    "items_per_page": 50
  }
}
```
```

Update the HTTP API documentation in README-HTTP.md:

```markdown
### Direct REST API

- `GET /api/company/:companyNumber/charges?items_per_page=25` - Get company charges
```

### Step 6: Build and Test

1. **Build the project:**
```bash
npm run build
```

2. **Test the stdio server:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_company_charges","arguments":{"company_number":"00000006","items_per_page":10}}}' | node dist/index.js
```

3. **Test the HTTP server:**
```bash
# Start HTTP server
npm run start:http

# Test direct API
curl "http://localhost:3000/api/company/00000006/charges?items_per_page=10"

# Test MCP tool via HTTP
curl -X POST http://localhost:3000/mcp/tools/get_company_charges \
  -H "Content-Type: application/json" \
  -d '{"company_number":"00000006","items_per_page":10}'
```

## Advanced Examples

### Adding a Tool with Complex Parameters

Example: Adding a search tool with multiple filters:

```typescript
// In types.ts
export interface AdvancedSearchParams {
  query: string;
  company_type?: string;
  company_status?: string;
  company_subtype?: string;
  dissolved_from?: string;
  dissolved_to?: string;
  incorporated_from?: string;
  incorporated_to?: string;
  size?: number;
  start_index?: number;
}

// In companies-house.ts
async advancedCompanySearch(params: AdvancedSearchParams): Promise<CompanySearch> {
  try {
    const response = await this.client.get('/advanced-search/companies', {
      params: {
        q: params.query,
        company_type: params.company_type,
        company_status: params.company_status,
        company_subtype: params.company_subtype,
        dissolved_from: params.dissolved_from,
        dissolved_to: params.dissolved_to,
        incorporated_from: params.incorporated_from,
        incorporated_to: params.incorporated_to,
        size: params.size || 20,
        start_index: params.start_index || 0,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to perform advanced search: ${error}`);
  }
}

// Tool definition with complex schema
{
  name: 'advanced_company_search',
  description: 'Advanced company search with multiple filters',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      company_type: {
        type: 'string',
        description: 'Company type filter',
        enum: ['ltd', 'plc', 'llp', 'private-unlimited'],
      },
      company_status: {
        type: 'string',
        description: 'Company status filter',
        enum: ['active', 'dissolved', 'liquidation'],
      },
      size: {
        type: 'number',
        description: 'Number of results (max 100)',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
      start_index: {
        type: 'number',
        description: 'Starting index for pagination',
        minimum: 0,
        default: 0,
      },
    },
    required: ['query'],
  },
}
```

### Adding a Tool that Returns Different Content Types

Example: Tool that can return both JSON and formatted text:

```typescript
// In server.ts handler
case 'get_company_summary': {
  const { company_number, format = 'json' } = args as {
    company_number: string;
    format?: 'json' | 'text';
  };
  
  const company = await this.companiesHouseService.getCompanyProfile(company_number);
  
  if (format === 'text') {
    const summary = `
Company: ${company.company_name}
Number: ${company.company_number}
Status: ${company.company_status}
Type: ${company.company_type}
Incorporated: ${company.date_of_creation}
Address: ${company.registered_office_address.address_line_1}, ${company.registered_office_address.locality}
    `.trim();
    
    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(company, null, 2),
        },
      ],
    };
  }
}
```

## Best Practices

### 1. Error Handling

Always include proper error handling:

```typescript
async getCompanyCharges(companyNumber: string): Promise<CompanyChargesResponse> {
  try {
    const response = await this.client.get(`/company/${companyNumber}/charges`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Company ${companyNumber} not found or has no charges`);
    }
    if (error.response?.status === 401) {
      throw new Error('Invalid API key or unauthorized access');
    }
    throw new Error(`Failed to get company charges: ${error.message}`);
  }
}
```

### 2. Input Validation

Add validation for tool parameters:

```typescript
case 'get_company_charges': {
  const { company_number, items_per_page = 25 } = args as {
    company_number: string;
    items_per_page?: number;
  };
  
  // Validate company number format
  if (!/^\d{8}$/.test(company_number)) {
    throw new McpError(ErrorCode.InvalidParams, 'Company number must be 8 digits');
  }
  
  // Validate items_per_page range
  if (items_per_page < 1 || items_per_page > 100) {
    throw new McpError(ErrorCode.InvalidParams, 'items_per_page must be between 1 and 100');
  }
  
  const result = await this.companiesHouseService.getCompanyCharges(company_number, items_per_page);
  // ... rest of handler
}
```

### 3. Documentation

Always document your tools thoroughly:

```typescript
{
  name: 'get_company_charges',
  description: 'Get company charges (secured debts, mortgages, debentures). Returns details of charges secured against the company including status, amount, and security details.',
  inputSchema: {
    type: 'object',
    properties: {
      company_number: {
        type: 'string',
        description: 'Company number (8 digits, e.g., "12345678")',
        pattern: '^\\d{8}$',
      },
      items_per_page: {
        type: 'number',
        description: 'Number of charges to return (1-100, default: 25)',
        minimum: 1,
        maximum: 100,
        default: 25,
      },
    },
    required: ['company_number'],
  },
}
```

### 4. Testing

Create test cases for your new tools:

```bash
# Test valid company with charges
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_company_charges","arguments":{"company_number":"00000006"}}}' | node dist/index.js

# Test company without charges
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_company_charges","arguments":{"company_number":"12345678"}}}' | node dist/index.js

# Test invalid company number
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_company_charges","arguments":{"company_number":"invalid"}}}' | node dist/index.js
```

## Available Companies House API Endpoints

Here are additional Companies House API endpoints you can implement:

- `/company/{company_number}/persons-with-significant-control` - PSCs
- `/company/{company_number}/exemptions` - Company exemptions
- `/company/{company_number}/insolvency` - Insolvency information
- `/company/{company_number}/uk-establishments` - UK establishments
- `/disqualified-officers/natural/{officer_id}` - Disqualified officers
- `/dissolved-search/companies` - Search dissolved companies

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Ensure all types are properly imported and defined
2. **Missing tool in list**: Check that the tool is added to both `ListToolsRequestSchema` handlers
3. **Tool not working in HTTP mode**: Verify the tool handler is added to `this.toolHandlers`
4. **API errors**: Check the Companies House API documentation for endpoint availability and parameters

### Debug Tips

1. **Enable detailed logging**:
```typescript
console.error(`Calling API: /company/${companyNumber}/charges`);
console.error(`Parameters:`, { items_per_page });
```

2. **Test API endpoints directly**:
```bash
curl -u "your_api_key:" "https://api.company-information.service.gov.uk/company/00000006/charges"
```

3. **Validate JSON schema**:
Use online JSON schema validators to check your inputSchema definitions.

## Conclusion

Adding new tools to the Companies House MCP Server involves:

1. Understanding the Companies House API endpoint
2. Defining appropriate TypeScript types
3. Implementing the service method with error handling
4. Registering the tool in both stdio and HTTP servers
5. Adding comprehensive documentation
6. Testing thoroughly

Follow this guide and the existing patterns in the codebase to ensure consistency and maintainability.