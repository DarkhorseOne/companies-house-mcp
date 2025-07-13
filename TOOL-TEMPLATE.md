# Adding Tool Template

This template provides a standardized format for requesting new tool implementations. Just fill in the basic information and the implementation will follow the established patterns automatically.

## Template Format

```yaml
# Tool Implementation Request
tool_name: "tool_name_here"
api_endpoint: "API endpoint path"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/..."
description: "Brief description of what this tool does"
parameters:
  required:
    - parameter_name: "description"
  optional:
    - parameter_name: "description (default: value)"
```

## Usage Instructions

1. **Copy the template below**
2. **Fill in your tool details**
3. **Provide the API documentation URL**
4. **Submit the request**

The implementation will automatically:
- ✅ Parse the API documentation
- ✅ Generate TypeScript types
- ✅ Create service methods
- ✅ Register in both stdio and HTTP servers
- ✅ Add direct REST endpoints
- ✅ Generate proper error handling
- ✅ Update documentation
- ✅ Create test examples

## Example Templates

### Example 1: Company Charges
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

### Example 2: PSCs (Persons with Significant Control)
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

### Example 3: Company Exemptions
```yaml
tool_name: "get_company_exemptions"
api_endpoint: "/company/{company_number}/exemptions"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/exemptions/exemptions.html"
description: "Get company exemptions information"
parameters:
  required:
    - company_number: "Company number (8 digits)"
```

### Example 4: Advanced Company Search
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

### Example 5: Officer Appointments
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

### Example 6: Company Insolvency
```yaml
tool_name: "get_company_insolvency"
api_endpoint: "/company/{company_number}/insolvency"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/insolvency/insolvency.html"
description: "Get company insolvency information"
parameters:
  required:
    - company_number: "Company number (8 digits)"
```

### Example 7: UK Establishments
```yaml
tool_name: "get_company_uk_establishments"
api_endpoint: "/company/{company_number}/uk-establishments"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/company/uk-establishments/uk-establishments.html"
description: "Get UK establishments for an overseas company"
parameters:
  required:
    - company_number: "Company number (8 digits)"
```

## Implementation Process

When you provide a completed template, the following automated steps will be performed:

### Step 1: API Analysis
- 🔍 **Fetch API documentation** from the provided URL
- 📊 **Parse response schema** and parameter requirements
- 🏗️ **Generate TypeScript interfaces** based on API responses

### Step 2: Service Implementation
- ⚙️ **Create service method** in `src/services/companies-house.ts`
- 🛡️ **Add error handling** with appropriate HTTP status codes
- ✅ **Add input validation** for required parameters

### Step 3: MCP Server Registration
- 📋 **Add tool definition** to stdio server (`src/server.ts`)
- 🔧 **Create tool handler** with proper parameter extraction
- 📝 **Generate JSON schema** for input validation

### Step 4: HTTP Server Integration
- 🌐 **Add tool handler** to HTTP server (`src/http-server.ts`)
- 🛣️ **Create direct REST endpoint** following `/api/...` pattern
- 🔄 **Add MCP tool endpoint** via `/mcp/tools/...`

### Step 5: Documentation Update
- 📚 **Update README.md** with new tool documentation
- 🌐 **Update README-HTTP.md** with new API endpoints
- 💡 **Add usage examples** and parameter descriptions

### Step 6: Testing
- 🧪 **Generate test commands** for both stdio and HTTP
- ✅ **Provide curl examples** for direct API testing
- 📝 **Create MCP JSON-RPC examples**

## Template Submission

To request a new tool implementation, create an issue or comment with your filled template:

```yaml
# YOUR TOOL REQUEST HERE
tool_name: "your_tool_name"
api_endpoint: "/your/api/endpoint"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/..."
description: "What your tool does"
parameters:
  required:
    - param1: "description"
  optional:
    - param2: "description (default: value)"
```

## Validation Rules

The template system will validate:

- ✅ **Tool name** follows snake_case convention
- ✅ **API endpoint** matches Companies House API patterns
- ✅ **Documentation URL** is accessible and valid
- ✅ **Parameters** are properly categorized as required/optional
- ✅ **Company number** parameter uses 8-digit validation when present

## Auto-Generated Code Structure

Each tool implementation will include:

```typescript
// 1. TypeScript types in src/types.ts
export interface ToolNameResponse {
  // Generated from API docs
}

// 2. Service method in src/services/companies-house.ts
async getToolName(params): Promise<ToolNameResponse> {
  // Generated with error handling
}

// 3. Tool registration in src/server.ts
{
  name: 'tool_name',
  description: 'Generated description',
  inputSchema: {
    // Generated JSON schema
  }
}

// 4. HTTP endpoints in src/http-server.ts
this.app.get('/api/endpoint', async (request, reply) => {
  // Generated handler
});
```

## Notes

- All generated code follows the existing project patterns
- Error handling includes proper MCP error codes
- Input validation follows JSON Schema standards
- REST endpoints follow RESTful conventions
- Documentation is automatically updated
- Test examples are provided for immediate validation

Simply provide your tool template and all implementation details will be handled automatically!