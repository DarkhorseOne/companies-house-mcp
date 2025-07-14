#!/bin/bash

# MCP HTTP Server Control Script
# This script manages the Companies House MCP HTTP server using Docker Compose

set -e

# Configuration
CONTAINER_NAME="companies-house-mcp-http"
COMPOSE_FILE="docker-compose.yml"
PROFILE="http"
DEFAULT_PORT=3000

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
    if is_running; then
        docker port "${CONTAINER_NAME}" 2>/dev/null | grep -o '0.0.0.0:[0-9]*' | cut -d: -f2 | head -n1
    else
        echo "${MCP_HTTP_PORT:-$DEFAULT_PORT}"
    fi
}

# Start the HTTP server
start_server() {
    log_info "Starting MCP HTTP server..."
    
    if is_running; then
        log_warning "Server is already running"
        show_status
        return 0
    fi
    
    # Set default port if not specified
    export MCP_HTTP_PORT="${MCP_HTTP_PORT:-$DEFAULT_PORT}"
    
    log_info "Using port: ${MCP_HTTP_PORT}"
    
    # Start the service
    docker-compose --profile "${PROFILE}" up -d "${CONTAINER_NAME}"
    
    # Wait a moment for startup
    sleep 2
    
    if is_running; then
        log_success "MCP HTTP server started successfully"
        log_info "Server is running on port $(get_port)"
        log_info "Health check: curl http://localhost:$(get_port)/health"
    else
        log_error "Failed to start MCP HTTP server"
        log_info "Check logs with: docker logs ${CONTAINER_NAME}"
        return 1
    fi
}

# Stop the HTTP server
stop_server() {
    log_info "Stopping MCP HTTP server..."
    
    if ! container_exists; then
        log_warning "Server container does not exist"
        return 0
    fi
    
    if ! is_running; then
        log_warning "Server is not running"
        return 0
    fi
    
    docker-compose --profile "${PROFILE}" stop "${CONTAINER_NAME}"
    
    if ! is_running; then
        log_success "MCP HTTP server stopped successfully"
    else
        log_error "Failed to stop MCP HTTP server"
        return 1
    fi
}

# Show server status
show_status() {
    log_info "MCP HTTP Server Status"
    echo "========================"
    
    if container_exists; then
        local status=$(get_status)
        local port=$(get_port)
        
        echo "Container: ${CONTAINER_NAME}"
        echo "Status: ${status}"
        echo "Port: ${port}"
        
        if is_running; then
            echo -e "Health: ${GREEN}Running${NC}"
            echo "URL: http://localhost:${port}"
        else
            echo -e "Health: ${RED}Stopped${NC}"
        fi
    else
        echo "Container: Not created"
        echo -e "Status: ${RED}Not deployed${NC}"
    fi
    
    echo "========================"
}

# Restart the HTTP server
restart_server() {
    log_info "Restarting MCP HTTP server..."
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
    log_info "Removing MCP HTTP server container..."
    
    if is_running; then
        log_info "Stopping running container first..."
        stop_server
    fi
    
    if container_exists; then
        docker-compose --profile "${PROFILE}" rm -f "${CONTAINER_NAME}"
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
    echo "  start    - Start the MCP HTTP server"
    echo "  stop     - Stop the MCP HTTP server"
    echo "  restart  - Restart the MCP HTTP server"
    echo "  status   - Show server status"
    echo "  logs     - Show server logs"
    echo "  follow   - Follow server logs in real-time"
    echo "  remove   - Remove the server container"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MCP_HTTP_PORT - HTTP server port (default: 3000)"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start server on default port"
    echo "  MCP_HTTP_PORT=8080 $0 start # Start server on port 8080"
    echo "  $0 logs --tail 50           # Show last 50 log lines"
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