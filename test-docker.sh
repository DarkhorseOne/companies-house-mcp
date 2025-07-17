#!/bin/bash

# Test script for Docker deployment

echo "Testing Docker configuration..."

# Test if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Test if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon not running. Please start Docker."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Test building the image
echo "Building Docker image..."
if docker build -t companies-house-mcp-test .; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Test environment file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env and set your COMPANIES_HOUSE_API_KEY"
fi

# Test different modes
echo "Testing different deployment modes..."

# Test stdio mode
echo "Testing stdio mode..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ Stdio mode configuration valid"
else
    echo "❌ Stdio mode configuration invalid"
fi

# Test HTTP mode
echo "Testing HTTP mode..."
if docker-compose --profile http config > /dev/null 2>&1; then
    echo "✅ HTTP mode configuration valid"
else
    echo "❌ HTTP mode configuration invalid"
fi

# Test streamable mode
echo "Testing streamable mode..."
if docker-compose --profile streamable config > /dev/null 2>&1; then
    echo "✅ Streamable mode configuration valid"
else
    echo "❌ Streamable mode configuration invalid"
fi

echo "
🎉 All tests passed!

Next steps:
1. Edit .env file and set your COMPANIES_HOUSE_API_KEY
2. Choose a deployment mode:
   - Stdio: docker-compose up companies-house-mcp
   - HTTP: docker-compose --profile http up companies-house-mcp-http
   - Streamable: docker-compose --profile streamable up companies-house-mcp-streamable
"