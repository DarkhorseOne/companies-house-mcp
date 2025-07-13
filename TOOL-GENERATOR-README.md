# Tool Generator System

This system provides an automated way to add new tools to the Companies House MCP Server. Simply provide a YAML template with basic tool information, and all the necessary code will be generated automatically.

## 🚀 Quick Start

### 1. Create a Tool Request

Create a YAML file with your tool specification:

```yaml
tool_name: "get_company_charges"
api_endpoint: "/company/{company_number}/charges"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/charges/charges.html"
description: "Get company charges (secured debts, mortgages, debentures)"
parameters:
  required:
    - company_number: "Company number (8 digits)"
  optional:
    - items_per_page: "Number of charges to return (default: 25)"
```

### 2. Generate the Code

Run the template processor:

```bash
# From file
node process-tool-template.js your-tool-request.yaml

# Or from stdin
cat your-tool-request.yaml | node process-tool-template.js
```

### 3. Copy Generated Code

The processor will output all the code sections you need to add to different files. Simply copy and paste each section into the appropriate location.

### 4. Build and Test

```bash
npm run build
# Test commands will be provided in the output
```

## 📋 Template Format

### Required Fields

- **`tool_name`** - Snake_case name for the tool (e.g., `get_company_charges`)
- **`api_endpoint`** - Companies House API endpoint path
- **`api_docs_url`** - Link to the API documentation
- **`description`** - Brief description of what the tool does

### Parameters Section

```yaml
parameters:
  required:
    - parameter_name: "Parameter description"
  optional:
    - parameter_name: "Parameter description (default: value)"
```

## 🔧 What Gets Generated

The tool generator automatically creates:

### 1. TypeScript Types (`src/types.ts`)
```typescript
export interface ToolNameResponse {
  // Interface for API response
}
```

### 2. Service Method (`src/services/companies-house.ts`)
```typescript
async getToolName(params): Promise<ToolNameResponse> {
  // HTTP client method with error handling
}
```

### 3. MCP Tool Definition (`src/server.ts`)
```typescript
{
  name: 'tool_name',
  description: 'Tool description',
  inputSchema: {
    // JSON schema for validation
  }
}
```

### 4. MCP Tool Handler (`src/server.ts`)
```typescript
case 'tool_name': {
  // Parameter extraction and service call
}
```

### 5. HTTP Tool Handler (`src/http-server.ts`)
```typescript
this.toolHandlers.set('tool_name', async (args) => {
  // HTTP bridge handler
});
```

### 6. REST API Endpoint (`src/http-server.ts`)
```typescript
this.app.get('/api/endpoint', async (request, reply) => {
  // Direct REST API access
});
```

## 📚 Example Templates

### Company Charges
```yaml
tool_name: "get_company_charges"
api_endpoint: "/company/{company_number}/charges"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/charges/charges.html"
description: "Get company charges (secured debts, mortgages, debentures)"
parameters:
  required:
    - company_number: "Company number (8 digits)"
  optional:
    - items_per_page: "Number of charges to return (default: 25)"
```

### Persons with Significant Control (PSCs)
```yaml
tool_name: "get_company_pscs"
api_endpoint: "/company/{company_number}/persons-with-significant-control"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/pscs/pscs.html"
description: "Get persons with significant control for a company"
parameters:
  required:
    - company_number: "Company number (8 digits)"
  optional:
    - items_per_page: "Number of PSCs to return (default: 25)"
    - register_view: "Register view (default: false)"
```

### Advanced Company Search
```yaml
tool_name: "advanced_company_search"
api_endpoint: "/advanced-search/companies"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/search/companies/advanced-search.html"
description: "Advanced company search with multiple filters"
parameters:
  required:
    - query: "Search query string"
  optional:
    - company_type: "Company type filter (ltd, plc, llp, etc.)"
    - company_status: "Company status filter (active, dissolved, etc.)"
    - size: "Number of results to return (default: 20, max: 100)"
    - start_index: "Starting index for pagination (default: 0)"
```

### Officer Appointments
```yaml
tool_name: "get_officer_appointments"
api_endpoint: "/officers/{officer_id}/appointments"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/officers/appointments/appointments.html"
description: "Get appointments for a specific officer"
parameters:
  required:
    - officer_id: "Officer ID from Companies House"
  optional:
    - items_per_page: "Number of appointments to return (default: 35)"
```

### Company Insolvency
```yaml
tool_name: "get_company_insolvency"
api_endpoint: "/company/{company_number}/insolvency"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/insolvency/insolvency.html"
description: "Get company insolvency information"
parameters:
  required:
    - company_number: "Company number (8 digits)"
```

## 🎯 Features

### Automatic Code Generation
- ✅ **TypeScript interfaces** based on API endpoints
- ✅ **Service methods** with proper error handling
- ✅ **JSON Schema validation** for parameters
- ✅ **Both stdio and HTTP** server implementations
- ✅ **REST API endpoints** following conventions
- ✅ **Test commands** for immediate validation

### Smart Parameter Handling
- ✅ **Path parameters** extracted from endpoint URLs
- ✅ **Query parameters** for optional filters
- ✅ **Type inference** (string, number, boolean)
- ✅ **Default values** parsed from descriptions
- ✅ **Validation rules** (min/max, patterns)

### Error Handling
- ✅ **HTTP status code** handling
- ✅ **MCP error codes** for protocol compliance
- ✅ **Input validation** with descriptive messages
- ✅ **API error wrapping** with context

## 🔍 Manual Customization

After generating the code, you may want to customize:

### 1. TypeScript Types
Update the generated interface with actual API response structure:

```typescript
export interface CompanyChargesResponse {
  total_count: number;
  satisfied_count: number;
  part_satisfied_count: number;
  items: CompanyCharge[];
}
```

### 2. Error Handling
Add specific error handling for known API responses:

```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    throw new Error(`Company ${companyNumber} not found or has no charges`);
  }
  // ... other specific errors
}
```

### 3. Input Validation
Add custom validation logic:

```typescript
if (!/^\d{8}$/.test(company_number)) {
  throw new McpError(ErrorCode.InvalidParams, 'Company number must be 8 digits');
}
```

## 🧪 Testing Generated Tools

The generator provides test commands for each new tool:

### Stdio MCP Server
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tool_name","arguments":{"company_number":"00000006"}}}' | node dist/index.js
```

### HTTP Server
```bash
curl "http://localhost:3000/api/company/00000006/charges"
```

### MCP via HTTP Bridge
```bash
curl -X POST http://localhost:3000/mcp/tools/tool_name \
  -H "Content-Type: application/json" \
  -d '{"company_number":"00000006"}'
```

## 📖 Available Companies House Endpoints

Here are some additional endpoints you can implement:

- `/company/{company_number}/exemptions` - Company exemptions
- `/company/{company_number}/uk-establishments` - UK establishments
- `/disqualified-officers/natural/{officer_id}` - Disqualified officers
- `/dissolved-search/companies` - Search dissolved companies
- `/company/{company_number}/registers` - Company registers

## 🚨 Important Notes

1. **Update TypeScript types** - The generator creates basic interfaces; update them with actual API response structures
2. **Test thoroughly** - Always test generated tools with real API calls
3. **Follow conventions** - Generated code follows project patterns; maintain consistency
4. **Error handling** - Customize error messages for better user experience
5. **Documentation** - Update README files with new tool information

## 🤝 Contributing New Templates

To add more template examples:

1. Test the endpoint with the Companies House API
2. Create a proper YAML template
3. Generate and test the code
4. Add the template to this documentation
5. Submit a pull request

The tool generator makes it easy to extend the Companies House MCP Server with any API endpoint!