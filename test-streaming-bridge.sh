#!/bin/bash

# Test script for streaming-http-bridge.js

set -e

# Configuration
BRIDGE_SCRIPT="streaming-http-bridge.js"
HTTP_SERVER_PORT=3000
TEST_TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if HTTP server is running
check_http_server() {
    if curl -s "http://localhost:${HTTP_SERVER_PORT}/health" >/dev/null 2>&1; then
        log_success "HTTP server is running on port ${HTTP_SERVER_PORT}"
        return 0
    else
        log_error "HTTP server is not running on port ${HTTP_SERVER_PORT}"
        log_info "Please start the HTTP server first:"
        log_info "  npm run start:http"
        log_info "  # or"
        log_info "  npm run dev:http"
        return 1
    fi
}

# Test streaming bridge with a JSON-RPC request
test_bridge_request() {
    local method=$1
    local params=$2
    local expected_key=$3
    
    log_info "Testing $method..."
    
    # Create request
    local request
    if [ -n "$params" ]; then
        request="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}"
    else
        request="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":1}"
    fi
    
    # Send request to bridge and capture response
    local response=$(echo "$request" | timeout $TEST_TIMEOUT node "$BRIDGE_SCRIPT" 2>/dev/null | head -1)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Check if response contains expected key
        if echo "$response" | jq -e ".$expected_key" >/dev/null 2>&1; then
            log_success "$method test passed"
            return 0
        else
            log_error "$method test failed - missing $expected_key"
            echo "Response: $response"
            return 1
        fi
    else
        log_error "$method test failed - no response or timeout"
        return 1
    fi
}

# Test the bridge functionality
test_bridge() {
    log_info "Testing streaming bridge functionality..."
    
    # Test initialize
    local init_params='{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}'
    test_bridge_request "initialize" "$init_params" "result" || return 1
    
    # Test tools/list
    test_bridge_request "tools/list" '{}' "result" || return 1
    
    # Test bridge/status
    test_bridge_request "bridge/status" '{}' "result" || return 1
    
    # Test invalid method
    local response=$(echo '{"jsonrpc":"2.0","method":"invalid/method","id":1}' | timeout $TEST_TIMEOUT node "$BRIDGE_SCRIPT" 2>/dev/null | head -1)
    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
        log_success "Invalid method properly rejected"
    else
        log_error "Invalid method not properly handled"
        return 1
    fi
    
    return 0
}

# Main test function
main() {
    log_info "Testing streaming-http-bridge.js"
    echo "================================="
    
    # Check dependencies
    if ! command -v jq &> /dev/null; then
        log_error "jq is required for this test"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required for this test"
        exit 1
    fi
    
    if [ ! -f "$BRIDGE_SCRIPT" ]; then
        log_error "Bridge script not found: $BRIDGE_SCRIPT"
        exit 1
    fi
    
    # Check HTTP server
    if ! check_http_server; then
        log_warning "HTTP server not running, but continuing with bridge tests..."
    fi
    
    # Test bridge functionality
    if test_bridge; then
        echo "================================="
        log_success "All streaming bridge tests passed!"
    else
        echo "================================="
        log_error "Some streaming bridge tests failed!"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MCP_STREAMING_SERVER_URL - Streaming server URL"
    echo "  MCP_API_SERVER_URL       - API server URL"
    echo "  MCP_HEALTH_CHECK_URL     - Health check URL"
    echo ""
    echo "Prerequisites:"
    echo "  - HTTP server running (npm run start:http or npm run dev:http)"
    echo "  - jq command installed"
    echo "  - Node.js installed"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_usage
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac