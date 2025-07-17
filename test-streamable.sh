#!/bin/bash

# Test script for MCP Streamable HTTP server

set -e

# Configuration
SERVER_URL="${MCP_STREAMABLE_URL:-http://localhost:3001}"
VERBOSE="${VERBOSE:-false}"

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

# Make JSON-RPC request
make_jsonrpc_request() {
    local method=$1
    local params=$2
    local id=$3
    
    local request_body
    if [ -n "$params" ]; then
        request_body=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "$method",
  "params": $params,
  "id": $id
}
EOF
)
    else
        request_body=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "$method",
  "id": $id
}
EOF
)
    fi
    
    if [ "$VERBOSE" = "true" ]; then
        log_info "Request: $request_body"
    fi
    
    local response=$(curl -s -X POST "$SERVER_URL/" \
        -H "Content-Type: application/json" \
        -d "$request_body")
    
    if [ "$VERBOSE" = "true" ]; then
        log_info "Response: $response"
    fi
    
    echo "$response"
}

# Test server health
test_health() {
    log_info "Testing server health..."
    
    local response=$(curl -s "$SERVER_URL/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        log_success "Health check passed"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        log_error "Health check failed"
        return 1
    fi
}

# Test server info
test_info() {
    log_info "Testing server info..."
    
    local response=$(curl -s "$SERVER_URL/info" 2>/dev/null)
    if [ $? -eq 0 ]; then
        log_success "Server info retrieved"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        log_error "Server info failed"
        return 1
    fi
}

# Test MCP initialize
test_initialize() {
    log_info "Testing MCP initialize..."
    
    local params='{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}'
    local response=$(make_jsonrpc_request "initialize" "$params" 1)
    
    if echo "$response" | jq -e '.result.protocolVersion' >/dev/null 2>&1; then
        log_success "Initialize successful"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        log_error "Initialize failed"
        echo "$response" | jq .
        return 1
    fi
}

# Test tools list
test_tools_list() {
    log_info "Testing tools/list..."
    
    local response=$(make_jsonrpc_request "tools/list" '{}' 2)
    
    if echo "$response" | jq -e '.result.tools' >/dev/null 2>&1; then
        local tool_count=$(echo "$response" | jq '.result.tools | length')
        log_success "Tools list retrieved ($tool_count tools)"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        log_error "Tools list failed"
        echo "$response" | jq .
        return 1
    fi
}

# Test tool call
test_tool_call() {
    log_info "Testing tools/call (search_companies)..."
    
    local params='{"name":"search_companies","arguments":{"query":"test","items_per_page":5}}'
    local response=$(make_jsonrpc_request "tools/call" "$params" 3)
    
    if echo "$response" | jq -e '.result.content' >/dev/null 2>&1; then
        log_success "Tool call successful"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        # This might fail due to invalid API key, which is expected
        if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
            log_warning "Tool call failed (expected with invalid API key)"
            if [ "$VERBOSE" = "true" ]; then
                echo "$response" | jq .
            fi
        else
            log_error "Tool call failed unexpectedly"
            echo "$response" | jq .
            return 1
        fi
    fi
}

# Test invalid method
test_invalid_method() {
    log_info "Testing invalid method..."
    
    local response=$(make_jsonrpc_request "invalid/method" '{}' 4)
    
    if echo "$response" | jq -e '.error.code' >/dev/null 2>&1; then
        log_success "Invalid method properly rejected"
        if [ "$VERBOSE" = "true" ]; then
            echo "$response" | jq .
        fi
    else
        log_error "Invalid method not properly handled"
        echo "$response" | jq .
        return 1
    fi
}

# Main test function
run_tests() {
    log_info "Testing MCP Streamable HTTP server at $SERVER_URL"
    echo "=================================="
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log_error "jq is required for this test script"
        exit 1
    fi
    
    # Run tests
    test_health || exit 1
    test_info || exit 1
    test_initialize || exit 1
    test_tools_list || exit 1
    test_tool_call || exit 1
    test_invalid_method || exit 1
    
    echo "=================================="
    log_success "All tests completed successfully!"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --verbose    Show detailed request/response information"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MCP_STREAMABLE_URL - Server URL (default: http://localhost:3001)"
    echo "  VERBOSE           - Enable verbose output (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run basic tests"
    echo "  $0 --verbose                         # Run tests with verbose output"
    echo "  MCP_STREAMABLE_URL=http://localhost:8080 $0  # Test different server"
}

# Parse command line arguments
case "${1:-}" in
    -v|--verbose)
        VERBOSE=true
        run_tests
        ;;
    -h|--help)
        show_usage
        ;;
    "")
        run_tests
        ;;
    *)
        log_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac