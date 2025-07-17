#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.log('Debug bridge started...');

rl.on('line', (line) => {
  console.log(`GOT LINE: ${line}`);
  console.log(`LINE LENGTH: ${line.length}`);
  console.log(`TRIMMED: ${line.trim()}`);
  
  // Echo the line back
  console.log(`ECHO: ${line}`);
});

rl.on('close', () => {
  console.log('Debug bridge closed');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  rl.close();
});

console.log('Debug bridge ready...');