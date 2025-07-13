import dotenv from 'dotenv';
import { CompaniesHouseMCPServer } from './server';

// Suppress dotenv console output completely
const originalConsoleLog = console.log;
console.log = () => {}; // Temporarily disable console.log
dotenv.config();
console.log = originalConsoleLog; // Restore console.log

async function main() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  
  if (!apiKey) {
    process.stderr.write('COMPANIES_HOUSE_API_KEY environment variable is required\n');
    process.exit(1);
  }

  const server = new CompaniesHouseMCPServer(apiKey);
  await server.run();
}

main().catch((error) => {
  process.stderr.write(`Server failed to start: ${error}\n`);
  process.exit(1);
});