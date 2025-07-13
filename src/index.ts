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