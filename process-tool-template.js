#!/usr/bin/env node

/**
 * Tool Template Processor
 * 
 * This script processes YAML tool templates and automatically implements
 * all the required code for adding new tools to the Companies House MCP Server.
 * 
 * Usage:
 *   node process-tool-template.js <template-file>
 *   
 * Or provide template directly:
 *   echo "tool_name: get_company_charges..." | node process-tool-template.js
 */

const fs = require('fs');

// YAML parser (simple implementation for our needs)
function parseYAML(yamlContent) {
  const lines = yamlContent.trim().split('\n');
  const result = {};
  let currentSection = null;
  let currentSubsection = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Top level key
    if (!line.startsWith(' ') && trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      
      if (value.startsWith('"') && value.endsWith('"')) {
        result[key.trim()] = value.slice(1, -1);
      } else if (value) {
        result[key.trim()] = value.replace(/^"(.*)"$/, '$1');
      } else {
        currentSection = key.trim();
        result[currentSection] = {};
      }
    }
    // Second level (under parameters)
    else if (line.startsWith('  ') && !line.startsWith('    ') && trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      
      if (currentSection && !value) {
        currentSubsection = key.trim();
        result[currentSection][currentSubsection] = [];
      }
    }
    // Third level (parameter items)
    else if (line.startsWith('    -') && currentSection && currentSubsection) {
      const item = trimmed.substring(1).trim();
      if (item.includes(':')) {
        const [paramKey, paramDesc] = item.split(':');
        const paramObj = {};
        paramObj[paramKey.trim()] = paramDesc.trim().replace(/^"(.*)"$/, '$1');
        result[currentSection][currentSubsection].push(paramObj);
      } else {
        result[currentSection][currentSubsection].push(item);
      }
    }
  }
  
  return result;
}

// Generate TypeScript interface from tool template
function generateTypeScriptTypes(toolName, apiEndpoint) {
  const interfaceName = toPascalCase(toolName.replace('get_', '').replace('search_', '')) + 'Response';
  
  // Basic template - would be enhanced by parsing actual API docs
  return `
// Generated interface for ${toolName}
export interface ${interfaceName} {
  // This interface should be updated based on actual API response
  // from ${apiEndpoint}
  [key: string]: any;
}`;
}

// Generate service method
function generateServiceMethod(toolName, apiEndpoint, parameters) {
  const methodName = toCamelCase(toolName);
  const responseType = toPascalCase(toolName.replace('get_', '').replace('search_', '')) + 'Response';
  
  // Extract path parameters
  const pathParams = (apiEndpoint.match(/{([^}]+)}/g) || []).map(p => p.slice(1, -1));
  
  // Generate parameter list
  const requiredParams = parameters.required || [];
  const optionalParams = parameters.optional || [];
  
  let paramList = '';
  
  requiredParams.forEach((param, index) => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    paramList += `${paramName}: string`;
    if (index < requiredParams.length - 1 || optionalParams.length > 0) {
      paramList += ', ';
    }
  });
  
  optionalParams.forEach((param, index) => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    paramList += `${paramName}?: ${getParamType(paramName)}`;
    if (index < optionalParams.length - 1) {
      paramList += ', ';
    }
  });
  
  // Generate API endpoint construction
  let endpointConstruction = `\`${apiEndpoint}\``;
  pathParams.forEach(param => {
    endpointConstruction = endpointConstruction.replace(`{${param}}`, `\${${param}}`);
  });
  
  // Generate query parameters
  const queryParams = optionalParams.filter(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    return !pathParams.includes(paramName);
  });
  
  let queryParamsCode = '';
  if (queryParams.length > 0) {
    queryParamsCode = `,\n        params: {\n`;
    queryParams.forEach(param => {
      const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
      const defaultValue = extractDefaultValue(param);
      if (defaultValue) {
        queryParamsCode += `          ${paramName}: ${paramName} || ${defaultValue},\n`;
      } else {
        queryParamsCode += `          ${paramName},\n`;
      }
    });
    queryParamsCode += '        }';
  }
  
  return `
  async ${methodName}(${paramList}): Promise<${responseType}> {
    try {
      const response = await this.client.get(${endpointConstruction}${queryParamsCode});
      return response.data;
    } catch (error) {
      throw new Error(\`Failed to ${toolName.replace(/_/g, ' ')}: \${error}\`);
    }
  }`;
}

// Generate tool definition for MCP server
function generateToolDefinition(toolName, description, parameters) {
  const properties = {};
  const required = [];
  
  (parameters.required || []).forEach(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    const paramDesc = typeof param === 'string' ? param : Object.values(param)[0];
    
    properties[paramName] = {
      type: getSchemaType(paramName),
      description: paramDesc
    };
    
    if (paramName === 'company_number') {
      properties[paramName].pattern = '^\\\\d{8}$';
    }
    
    required.push(paramName);
  });
  
  (parameters.optional || []).forEach(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    const paramDesc = typeof param === 'string' ? param : Object.values(param)[0];
    const defaultValue = extractDefaultValue(param);
    
    properties[paramName] = {
      type: getSchemaType(paramName),
      description: paramDesc
    };
    
    if (defaultValue) {
      properties[paramName].default = parseDefaultValue(defaultValue, paramName);
    }
    
    if (paramName.includes('page') || paramName.includes('size')) {
      properties[paramName].minimum = 1;
      if (paramName.includes('size')) {
        properties[paramName].maximum = 100;
      }
    }
  });
  
  return `          {
            name: '${toolName}',
            description: '${description}',
            inputSchema: {
              type: 'object',
              properties: ${JSON.stringify(properties, null, 14).replace(/^/gm, '              ')},
              required: ${JSON.stringify(required)},
            },
          }`;
}

// Generate tool handler for MCP server
function generateToolHandler(toolName, parameters) {
  const methodName = toCamelCase(toolName);
  
  // Generate parameter extraction
  const allParams = [...(parameters.required || []), ...(parameters.optional || [])];
  const paramExtraction = allParams.map(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    const defaultValue = extractDefaultValue(param);
    if (defaultValue) {
      return `${paramName} = ${defaultValue}`;
    }
    return paramName;
  }).join(', ');
  
  const paramTypes = allParams.map(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    return `${paramName}${(parameters.optional || []).some(p => 
      (typeof p === 'string' ? p : Object.keys(p)[0]) === paramName
    ) ? '?' : ''}: ${getParamType(paramName)}`;
  }).join(';\n              ');
  
  const methodArgs = allParams.map(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    return paramName;
  }).join(', ');
  
  return `
          case '${toolName}': {
            const { ${paramExtraction} } = args as {
              ${paramTypes};
            };
            const result = await this.companiesHouseService.${methodName}(${methodArgs});
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }`;
}

// Generate HTTP tool handler
function generateHTTPToolHandler(toolName, parameters) {
  const methodName = toCamelCase(toolName);
  
  const allParams = [...(parameters.required || []), ...(parameters.optional || [])];
  const paramExtraction = allParams.map(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    const defaultValue = extractDefaultValue(param);
    if (defaultValue) {
      return `${paramName} = ${defaultValue}`;
    }
    return paramName;
  }).join(', ');
  
  const methodArgs = allParams.map(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    return paramName;
  }).join(', ');
  
  return `
    this.toolHandlers.set('${toolName}', async (args: any) => {
      const { ${paramExtraction} } = args;
      const result = await this.companiesHouseService.${methodName}(${methodArgs});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });`;
}

// Generate REST API endpoint
function generateRESTEndpoint(toolName, apiEndpoint, parameters) {
  const endpointPath = convertToRESTPath(apiEndpoint);
  const pathParams = (apiEndpoint.match(/{([^}]+)}/g) || []).map(p => p.slice(1, -1));
  const methodName = toCamelCase(toolName);
  
  // Generate parameter extraction from URL and query
  let paramExtraction = '';
  let methodArgs = '';
  
  pathParams.forEach(param => {
    paramExtraction += `        const { ${param} } = request.params;\n`;
    methodArgs += param + ', ';
  });
  
  (parameters.optional || []).forEach(param => {
    const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
    if (!pathParams.includes(paramName)) {
      const defaultValue = extractDefaultValue(param);
      if (defaultValue) {
        paramExtraction += `        const ${paramName} = request.query.${paramName} ? \n          Number(request.query.${paramName}) : ${defaultValue};\n`;
      } else {
        paramExtraction += `        const ${paramName} = request.query.${paramName};\n`;
      }
      methodArgs += paramName + ', ';
    }
  });
  
  methodArgs = methodArgs.replace(/, $/, '');
  
  return `
    this.app.get('${endpointPath}', async (request: FastifyRequest<{
      Params: { ${pathParams.map(p => `${p}: string`).join('; ')} };
      Querystring: { ${(parameters.optional || []).filter(param => {
        const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
        return !pathParams.includes(paramName);
      }).map(param => {
        const paramName = typeof param === 'string' ? param : Object.keys(param)[0];
        return `${paramName}?: string`;
      }).join('; ')} };
    }>, reply: FastifyReply) => {
      try {
${paramExtraction}        
        const result = await this.companiesHouseService.${methodName}(${methodArgs});
        return result;
      } catch (error) {
        reply.code(500);
        return { error: (error as Error).message };
      }
    });`;
}

// Helper functions
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + toCamelCase(str).slice(1);
}

function getParamType(paramName) {
  if (paramName.includes('page') || paramName.includes('size') || paramName.includes('count')) {
    return 'number';
  }
  if (paramName.includes('register_view')) {
    return 'boolean';
  }
  return 'string';
}

function getSchemaType(paramName) {
  if (paramName.includes('page') || paramName.includes('size') || paramName.includes('count')) {
    return 'number';
  }
  if (paramName.includes('register_view')) {
    return 'boolean';
  }
  return 'string';
}

function extractDefaultValue(param) {
  if (typeof param === 'string') return null;
  const desc = Object.values(param)[0];
  const match = desc.match(/\(default:\s*([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function parseDefaultValue(defaultValue, paramName) {
  if (getParamType(paramName) === 'number') {
    return parseInt(defaultValue);
  }
  if (getParamType(paramName) === 'boolean') {
    return defaultValue === 'true';
  }
  return defaultValue.replace(/^['"]|['"]$/g, '');
}

function convertToRESTPath(apiEndpoint) {
  return '/api' + apiEndpoint.replace(/{([^}]+)}/g, ':$1');
}

// Main processing function
async function processTemplate(templateContent) {
  try {
    const template = parseYAML(templateContent);
    
    console.log('🔄 Processing tool template...');
    console.log(`📋 Tool: ${template.tool_name}`);
    console.log(`🌐 API: ${template.api_endpoint}`);
    console.log(`📚 Docs: ${template.api_docs_url}`);
    
    // Generate all code components
    const types = generateTypeScriptTypes(template.tool_name, template.api_endpoint);
    const serviceMethod = generateServiceMethod(template.tool_name, template.api_endpoint, template.parameters);
    const toolDefinition = generateToolDefinition(template.tool_name, template.description, template.parameters);
    const toolHandler = generateToolHandler(template.tool_name, template.parameters);
    const httpToolHandler = generateHTTPToolHandler(template.tool_name, template.parameters);
    const restEndpoint = generateRESTEndpoint(template.tool_name, template.api_endpoint, template.parameters);
    
    // Output generated code
    console.log('\n' + '='.repeat(60));
    console.log('GENERATED CODE SECTIONS');
    console.log('='.repeat(60));
    
    console.log('\n📝 1. TypeScript Types (add to src/types.ts):');
    console.log(types);
    
    console.log('\n⚙️ 2. Service Method (add to src/services/companies-house.ts):');
    console.log(serviceMethod);
    
    console.log('\n📋 3. Tool Definition (add to tools array in src/server.ts):');
    console.log(toolDefinition);
    
    console.log('\n🔧 4. Tool Handler (add to switch statement in src/server.ts):');
    console.log(toolHandler);
    
    console.log('\n🌐 5. HTTP Tool Handler (add to setupMCPServer in src/http-server.ts):');
    console.log(httpToolHandler);
    
    console.log('\n🛣️ 6. REST Endpoint (add to setupRoutes in src/http-server.ts):');
    console.log(restEndpoint);
    
    console.log('\n✅ Code generation complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Add the generated code to the appropriate files');
    console.log('2. Run: npm run build');
    console.log('3. Test the new tool');
    console.log(`4. Update documentation with the new ${template.tool_name} tool`);
    
    // Generate test commands
    console.log('\n🧪 Test Commands:');
    console.log(`\n# Stdio MCP Server:`);
    console.log(`echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"${template.tool_name}","arguments":{"company_number":"00000006"}}}' | node dist/index.js`);
    
    console.log(`\n# HTTP Server:`);
    console.log(`curl "${convertToRESTPath(template.api_endpoint).replace(':company_number', '00000006')}"`);
    
    console.log(`\n# MCP via HTTP:`);
    console.log(`curl -X POST http://localhost:3000/mcp/tools/${template.tool_name} -H "Content-Type: application/json" -d '{"company_number":"00000006"}'`);
    
  } catch (error) {
    console.error('❌ Error processing template:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  let templateContent = '';
  
  // Check if file argument provided
  if (process.argv[2]) {
    const templateFile = process.argv[2];
    if (fs.existsSync(templateFile)) {
      templateContent = fs.readFileSync(templateFile, 'utf8');
    } else {
      console.error(`❌ Template file not found: ${templateFile}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      templateContent += chunk;
    }
  }
  
  if (!templateContent.trim()) {
    console.log('📖 Usage: node process-tool-template.js <template-file>');
    console.log('   or: echo "template content" | node process-tool-template.js');
    console.log('\n📋 Template format:');
    console.log(`
tool_name: "get_company_charges"
api_endpoint: "/company/{company_number}/charges"
api_docs_url: "https://developer.company-information.service.gov.uk/api/docs/..."
description: "Get company charges"
parameters:
  required:
    - company_number: "Company number (8 digits)"
  optional:
    - items_per_page: "Number of items (default: 25)"
`);
    process.exit(1);
  }
  
  await processTemplate(templateContent);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processTemplate, parseYAML };