# Deploying Companies House MCP Server with Docker Compose

This guide explains how to deploy the Companies House MCP Server using Docker Compose. The server supports both stdio (default) and HTTP modes.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed
- A Companies House API key ([get one here](https://developer.company-information.service.gov.uk/))

## 1. Clone the Repository

```bash
git clone git@github.com:DarkhorseOne/companies-house-mcp.git
```

## 2. Setup env

```bash
touch .env
echo "COMPANIES_HOUSE_API_KEY=your_api_key_here" >> .env
echo "COMPANIES_HOUSE_BASE_URL=https://api.company-information.service.gov.uk" >> .env

```

## 3. Build and start the service

Default port is 3000, modify it if you want to use another one. Just edit the line `DEFAULT_PORT=3000` in `mcp-http-control.sh`.

```bash
# build and start
./mcp-http-control.sh start

# check service status
./mcp-http-control.sh status

# step the service
./mcp-http-control.sh stop

# remove docker container
./mcp-http-control.sh remove
```

You are all set!
