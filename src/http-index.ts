import dotenv from 'dotenv';
import { CompaniesHouseHTTPServer } from './http-server';

// Suppress dotenv console output completely
const originalConsoleLog = console.log;
console.log = () => {}; // Temporarily disable console.log
dotenv.config();
console.log = originalConsoleLog; // Restore console.log

async function main() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  
  if (!apiKey) {
    process.stderr.write('COMPANIES_HOUSE_API_KEY environment variable is required\n');
    process.exit(1);
  }

  const server = new CompaniesHouseHTTPServer(apiKey);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    process.stderr.write('\nReceived SIGINT. Shutting down gracefully...\n');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    process.stderr.write('\nReceived SIGTERM. Shutting down gracefully...\n');
    await server.stop();
    process.exit(0);
  });

  await server.start(port, host);
}

main().catch((error) => {
  console.error('HTTP Server failed to start:', error);
  process.exit(1);
});