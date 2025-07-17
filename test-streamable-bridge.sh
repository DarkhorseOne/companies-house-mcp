#!/bin/bash

# Test script for streamable-http-bridge.js

set -e

# Configuration
BRIDGE_SCRIPT="streamable-http-bridge.js"
STREAMABLE_SERVER_PORT=3001
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

# Check if streamable HTTP server is running
check_streamable_server() {
    if curl -s "http://localhost:${STREAMABLE_SERVER_PORT}/health" >/dev/null 2>&1; then
        log_success "Streamable HTTP server is running on port ${STREAMABLE_SERVER_PORT}"
        return 0
    else
        log_error "Streamable HTTP server is not running on port ${STREAMABLE_SERVER_PORT}"
        log_info "Please start the streamable HTTP server first:"
        log_info "  npm run start:streamable"
        log_info "  # or"
        log_info "  npm run dev:streamable"
        return 1
    fi
}

# Test streamable bridge with a JSON-RPC request
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
    
    # Send request to bridge and capture response (and check for stderr)
    local stderr_output=$(echo "$request" | node "$BRIDGE_SCRIPT" 2>&1 >/dev/null)
    local response=$(echo "$request" | node "$BRIDGE_SCRIPT" 2>/dev/null | head -1)
    
    # Check if there's any stderr output
    if [ -n "$stderr_output" ]; then
        log_error "$method test failed - stderr output detected: $stderr_output"
        return 1
    fi
    
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

# Test tool call
test_tool_call() {
    log_info "Testing tools/call (search_companies)..."
    
    local params='{"name":"search_companies","arguments":{"query":"test","items_per_page":5}}'
    local response=$(echo "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":$params,\"id\":3}" | node "$BRIDGE_SCRIPT" 2>/dev/null | head -1)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Check for either success or expected error (API key issue)
        if echo "$response" | jq -e '.result' >/dev/null 2>&1; then
            log_success "Tool call successful"
            return 0
        elif echo "$response" | jq -e '.error' >/dev/null 2>&1; then
            log_warning "Tool call failed (expected with invalid API key)"
            return 0
        else
            log_error "Tool call failed unexpectedly"
            echo "Response: $response"
            return 1
        fi
    else
        log_error "Tool call failed - no response or timeout"
        return 1
    fi
}

# Test the bridge functionality
test_bridge() {
    log_info "Testing streamable bridge functionality..."
    
    # Test initialize
    local init_params='{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}'
    test_bridge_request "initialize" "$init_params" "result" || return 1
    
    # Test tools/list
    test_bridge_request "tools/list" '{}' "result" || return 1
    
    # Test tool call
    test_tool_call || return 1
    
    # Test invalid method
    local response=$(echo '{"jsonrpc":"2.0","method":"invalid/method","id":1}' | node "$BRIDGE_SCRIPT" 2>/dev/null | head -1)
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
    log_info "Testing streamable-http-bridge.js"
    echo "===================================="
    
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
    
    # Check streamable HTTP server
    if ! check_streamable_server; then
        exit 1
    fi
    
    # Test bridge functionality
    if test_bridge; then
        echo "===================================="
        log_success "All streamable bridge tests passed!"
    else
        echo "===================================="
        log_error "Some streamable bridge tests failed!"
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
    echo "  MCP_STREAMABLE_SERVER_URL - Streamable server URL (default: http://localhost:3001)"
    echo ""
    echo "Prerequisites:"
    echo "  - Streamable HTTP server running (npm run start:streamable or npm run dev:streamable)"
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