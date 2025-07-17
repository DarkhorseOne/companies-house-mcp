#!/bin/bash

# MCP Server Control Script
# This script manages the Companies House MCP server using Docker Compose
# Supports stdio, http, and streamable modes

set -e

# Configuration
MODE="${MCP_MODE:-http}"
COMPOSE_FILE="docker-compose.yml"

# Mode-specific configuration
case "$MODE" in
    stdio)
        CONTAINER_NAME="companies-house-mcp"
        PROFILE=""
        DEFAULT_PORT=""
        ;;
    http)
        CONTAINER_NAME="companies-house-mcp-http"
        PROFILE="http"
        DEFAULT_PORT=3000
        ;;
    streamable)
        CONTAINER_NAME="companies-house-mcp-streamable"
        PROFILE="streamable"
        DEFAULT_PORT=3001
        ;;
    *)
        echo "Invalid mode: $MODE. Use stdio, http, or streamable"
        exit 1
        ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if container is running
is_running() {
    docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Check if container exists (running or stopped)
container_exists() {
    docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Get container status
get_status() {
    if container_exists; then
        docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Status}}" | head -n1
    else
        echo "Not created"
    fi
}

# Get container port
get_port() {
    if [ "$MODE" = "stdio" ]; then
        echo "N/A (stdio mode)"
        return
    fi
    
    if is_running; then
        docker port "${CONTAINER_NAME}" 2>/dev/null | grep -o '0.0.0.0:[0-9]*' | cut -d: -f2 | head -n1
    else
        case "$MODE" in
            http)
                echo "${MCP_HTTP_PORT:-$DEFAULT_PORT}"
                ;;
            streamable)
                echo "${MCP_STREAMABLE_PORT:-$DEFAULT_PORT}"
                ;;
        esac
    fi
}

# Start the MCP server
start_server() {
    log_info "Starting MCP server in $MODE mode..."
    
    if is_running; then
        log_warning "Server is already running"
        show_status
        return 0
    fi
    
    # Set mode-specific environment variables
    case "$MODE" in
        http)
            export MCP_HTTP_PORT="${MCP_HTTP_PORT:-$DEFAULT_PORT}"
            log_info "Using port: ${MCP_HTTP_PORT}"
            ;;
        streamable)
            export MCP_STREAMABLE_PORT="${MCP_STREAMABLE_PORT:-$DEFAULT_PORT}"
            log_info "Using port: ${MCP_STREAMABLE_PORT}"
            ;;
        stdio)
            log_info "Using stdio transport"
            ;;
    esac
    
    # Start the service
    if [ -n "$PROFILE" ]; then
        docker-compose --profile "${PROFILE}" up -d "${CONTAINER_NAME}"
    else
        docker-compose up -d "${CONTAINER_NAME}"
    fi
    
    # Wait a moment for startup
    sleep 2
    
    if is_running; then
        log_success "MCP server started successfully in $MODE mode"
        
        if [ "$MODE" != "stdio" ]; then
            local port=$(get_port)
            log_info "Server is running on port $port"
            
            case "$MODE" in
                http)
                    log_info "Health check: curl http://localhost:$port/health"
                    log_info "API endpoints: http://localhost:$port/api/*"
                    log_info "MCP bridge: http://localhost:$port/mcp/bridge"
                    ;;
                streamable)
                    log_info "Health check: curl http://localhost:$port/health"
                    log_info "Server info: curl http://localhost:$port/info"
                    log_info "MCP endpoint: POST http://localhost:$port/"
                    ;;
            esac
        else
            log_info "Server is running in stdio mode"
        fi
    else
        log_error "Failed to start MCP server"
        log_info "Check logs with: docker logs ${CONTAINER_NAME}"
        return 1
    fi
}

# Stop the MCP server
stop_server() {
    log_info "Stopping MCP server in $MODE mode..."
    
    if ! container_exists; then
        log_warning "Server container does not exist"
        return 0
    fi
    
    if ! is_running; then
        log_warning "Server is not running"
        return 0
    fi
    
    if [ -n "$PROFILE" ]; then
        docker-compose --profile "${PROFILE}" stop "${CONTAINER_NAME}"
    else
        docker-compose stop "${CONTAINER_NAME}"
    fi
    
    if ! is_running; then
        log_success "MCP server stopped successfully"
    else
        log_error "Failed to stop MCP server"
        return 1
    fi
}

# Show server status
show_status() {
    log_info "MCP Server Status ($MODE mode)"
    echo "========================"
    
    if container_exists; then
        local status=$(get_status)
        local port=$(get_port)
        
        echo "Container: ${CONTAINER_NAME}"
        echo "Mode: ${MODE}"
        echo "Status: ${status}"
        echo "Port: ${port}"
        
        if is_running; then
            echo -e "Health: ${GREEN}Running${NC}"
            if [ "$MODE" != "stdio" ]; then
                echo "URL: http://localhost:${port}"
            fi
        else
            echo -e "Health: ${RED}Stopped${NC}"
        fi
    else
        echo "Container: Not created"
        echo "Mode: ${MODE}"
        echo -e "Status: ${RED}Not deployed${NC}"
    fi
    
    echo "========================"
}

# Restart the MCP server
restart_server() {
    log_info "Restarting MCP server in $MODE mode..."
    stop_server
    sleep 1
    start_server
}

# Show server logs
show_logs() {
    if container_exists; then
        log_info "Showing logs for ${CONTAINER_NAME}..."
        docker logs "${CONTAINER_NAME}" "${@}"
    else
        log_error "Container does not exist"
        return 1
    fi
}

# Follow server logs
follow_logs() {
    if container_exists; then
        log_info "Following logs for ${CONTAINER_NAME}... (Press Ctrl+C to exit)"
        docker logs -f "${CONTAINER_NAME}"
    else
        log_error "Container does not exist"
        return 1
    fi
}

# Remove the container
remove_container() {
    log_info "Removing MCP server container ($MODE mode)..."
    
    if is_running; then
        log_info "Stopping running container first..."
        stop_server
    fi
    
    if container_exists; then
        if [ -n "$PROFILE" ]; then
            docker-compose --profile "${PROFILE}" rm -f "${CONTAINER_NAME}"
        else
            docker-compose rm -f "${CONTAINER_NAME}"
        fi
        log_success "Container removed successfully"
    else
        log_warning "Container does not exist"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|follow|remove|help}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the MCP server"
    echo "  stop     - Stop the MCP server"
    echo "  restart  - Restart the MCP server"
    echo "  status   - Show server status"
    echo "  logs     - Show server logs"
    echo "  follow   - Follow server logs in real-time"
    echo "  remove   - Remove the server container"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MCP_MODE              - Server mode: stdio, http, or streamable (default: http)"
    echo "  MCP_HTTP_PORT         - HTTP server port (default: 3000)"
    echo "  MCP_STREAMABLE_PORT   - Streamable HTTP server port (default: 3001)"
    echo ""
    echo "Examples:"
    echo "  $0 start                                    # Start HTTP server on default port"
    echo "  MCP_MODE=stdio $0 start                     # Start stdio server"
    echo "  MCP_MODE=streamable $0 start                # Start streamable HTTP server"
    echo "  MCP_HTTP_PORT=8080 $0 start                 # Start HTTP server on port 8080"
    echo "  MCP_MODE=streamable MCP_STREAMABLE_PORT=8081 $0 start # Start streamable server on port 8081"
    echo "  $0 logs --tail 50                           # Show last 50 log lines"
    echo ""
    echo "Modes:"
    echo "  stdio      - Standard MCP stdio transport (no HTTP port)"
    echo "  http       - HTTP REST API + MCP bridge (port 3000)"
    echo "  streamable - MCP Streamable HTTP transport (port 3001)"
}

# Main script logic
case "${1:-help}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        shift
        show_logs "$@"
        ;;
    follow)
        follow_logs
        ;;
    remove)
        remove_container
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac