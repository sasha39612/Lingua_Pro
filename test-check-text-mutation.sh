#!/bin/bash

###############################################################################
# CheckText Mutation - Quick Start Guide
###############################################################################
#
# This script demonstrates how to test the checkText mutation
# which validates service-to-service calls with error handling and 
# circuit breaker protection.
#
# Usage: bash check-text-examples.sh
#

set -e  # Exit on error

API_GATEWAY_URL="http://localhost:8080/graphql"
JWT_TOKEN=""  # Will be populated from login

###############################################################################
# 1. HELPER FUNCTIONS
###############################################################################

# Log helper
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Pretty print JSON
pretty_json() {
  echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Make GraphQL request
graphql_request() {
  local query="$1"
  local variables="$2"
  
  curl -s -X POST "$API_GATEWAY_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d @- << EOF
{
  "query": "$query",
  "variables": $variables
}
EOF
}

###############################################################################
# 2. GET JWT TOKEN (from auth-service)
###############################################################################

get_jwt_token() {
  log "=== Getting JWT Token ==="
  
  local login_query='
    mutation {
      login(
        email: "student@example.com"
        password: "SecurePassword123"
      ) {
        id
        email
        token
      }
    }
  '
  
  log "Sending login request..."
  local response=$(graphql_request "$login_query" "{}")
  
  JWT_TOKEN=$(echo "$response" | jq -r '.data.login.token' 2>/dev/null || echo "")
  
  if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
    log "ERROR: Failed to obtain JWT token"
    log "Response: $(pretty_json "$response")"
    
    # Try to create user first
    log "User might not exist. Attempting to create user..."
    local register_query='
      mutation {
        register(
          email: "student@example.com"
          password: "SecurePassword123"
          language: "en"
        ) {
          id
          email
          token
        }
      }
    '
    
    response=$(graphql_request "$register_query" "{}")
    JWT_TOKEN=$(echo "$response" | jq -r '.data.register.token' 2>/dev/null || echo "")
    
    if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
      log "ERROR: Failed to create user or obtain token"
      log "Response: $(pretty_json "$response")"
      return 1
    fi
  fi
  
  log "✅ JWT Token obtained (first 50 chars): ${JWT_TOKEN:0:50}..."
  return 0
}

###############################################################################
# 3. TEST 1: Happy Path
###############################################################################

test_happy_path() {
  log ""
  log "=== TEST 1: Happy Path ==="
  log "Scenario: Text service is healthy, analysis succeeds"
  log ""
  
  local query='
    mutation CheckText($input: CheckTextInput!) {
      checkText(input: $input) {
        id
        originalText
        correctedText
        textScore
        feedback
        createdAt
      }
    }
  '
  
  local variables='{
    "input": {
      "userId": "user_test_001",
      "language": "en",
      "text": "Hello, I am studing English."
    }
  }'
  
  log "Sending checkText mutation..."
  log "Input: studing → studying (spelling error)"
  
  local response=$(graphql_request "$query" "$variables")
  local result=$(echo "$response" | jq -r '.data.checkText' 2>/dev/null)
  
  if [ "$result" != "null" ] && [ ! -z "$result" ]; then
    log "✅ SUCCESS"
    log "Response:"
    pretty_json "$(echo "$response" | jq '.data.checkText')"
    
    local score=$(echo "$response" | jq -r '.data.checkText.textScore')
    local feedback=$(echo "$response" | jq -r '.data.checkText.feedback')
    
    log ""
    log "Analysis Results:"
    log "  Score: $score"
    log "  Feedback: $feedback"
  else
    log "❌ FAILED"
    log "Response:"
    pretty_json "$response"
  fi
}

###############################################################################
# 4. TEST 2: Without Authentication
###############################################################################

test_without_auth() {
  log ""
  log "=== TEST 2: Authentication Required ==="
  log "Scenario: Request without JWT token is rejected"
  log ""
  
  local query='
    mutation CheckText($input: CheckTextInput!) {
      checkText(input: $input) {
        textScore
      }
    }
  '
  
  local variables='{
    "input": {
      "userId": "user_test_002",
      "language": "en",
      "text": "Test text"
    }
  }'
  
  log "Sending request WITHOUT Authorization header..."
  
  local response=$(curl -s -X POST "$API_GATEWAY_URL" \
    -H "Content-Type: application/json" \
    -d @- << EOF
{
  "query": "$query",
  "variables": $variables
}
EOF
  )
  
  local error=$(echo "$response" | jq -r '.errors[0].message' 2>/dev/null || echo "")
  
  if [ "$error" == "Unauthorized" ] || [[ "$error" =~ "Unauthorized" ]]; then
    log "✅ SUCCESS - Request rejected as expected"
    log "Error: $error"
  else
    log "❌ FAILED - Request should have been rejected"
    log "Response:"
    pretty_json "$response"
  fi
}

###############################################################################
# 5. TEST 3: Check Service Health
###############################################################################

test_health_check() {
  log ""
  log "=== TEST 3: Service Health Check ==="
  log "Scenario: Verify api-gateway and text-service are healthy"
  log ""
  
  log "Checking api-gateway health..."
  local gateway_health=$(curl -s http://localhost:8080/health)
  
  if echo "$gateway_health" | jq -e '.uptime' > /dev/null 2>&1; then
    log "✅ API Gateway is healthy"
    log "Uptime: $(echo "$gateway_health" | jq -r '.uptime') seconds"
  else
    log "❌ API Gateway health check failed"
    pretty_json "$gateway_health"
  fi
}

###############################################################################
# 6. TEST 4: Multiple Requests (Circuit Breaker Testing)
###############################################################################

test_circuit_breaker() {
  log ""
  log "=== TEST 4: Multiple Requests (Circuit Breaker) ==="
  log "Scenario: Send 5 sequential requests to monitor circuit breaker"
  log ""
  
  local query='
    mutation CheckText($input: CheckTextInput!) {
      checkText(input: $input) {
        id
        textScore
        feedback
      }
    }
  '
  
  for i in {1..5}; do
    local variables=$(cat <<EOF
{
  "input": {
    "userId": "user_test_circuit_$i",
    "language": "en",
    "text": "Request number $i for circuit breaker testing."
  }
}
EOF
)
    
    log "Request $i/5..."
    local response=$(graphql_request "$query" "$variables")
    
    local score=$(echo "$response" | jq -r '.data.checkText.textScore' 2>/dev/null || echo "error")
    local feedback=$(echo "$response" | jq -r '.data.checkText.feedback' 2>/dev/null || echo "no feedback")
    
    if [ "$score" != "error" ]; then
      log "  ✅ Response received"
      log "     Score: $score"
      if [[ "$feedback" == *"unavailable"* ]]; then
        log "     Status: FALLBACK (service unavailable)"
      else
        log "     Status: SUCCESS (service available)"
      fi
    else
      log "  ❌ Error in response"
    fi
    
    sleep 1  # Wait 1 second between requests
  done
  
  log "✅ Circuit breaker test completed"
  log "   (Watch api-gateway logs for circuit breaker state transitions)"
}

###############################################################################
# 7. TEST 5: Trace ID Forwarding
###############################################################################

test_trace_id() {
  log ""
  log "=== TEST 5: Distributed Tracing ==="
  log "Scenario: Verify X-Trace-ID header is forwarded"
  log ""
  
  local trace_id="test-trace-$(date +%s)"
  log "Using Trace ID: $trace_id"
  
  local query='
    mutation CheckText($input: CheckTextInput!) {
      checkText(input: $input) {
        textScore
      }
    }
  '
  
  local variables='{
    "input": {
      "userId": "user_trace_test",
      "language": "en",
      "text": "Testing trace ID forwarding."
    }
  }'
  
  log "Sending request with custom X-Trace-ID header..."
  
  local response=$(curl -s -X POST "$API_GATEWAY_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "X-Trace-ID: $trace_id" \
    -d @- << EOF
{
  "query": "$query",
  "variables": $variables
}
EOF
  )
  
  local score=$(echo "$response" | jq -r '.data.checkText.textScore' 2>/dev/null || echo "error")
  
  if [ "$score" != "error" ]; then
    log "✅ SUCCESS - Request processed with trace ID"
    log "  Check api-gateway logs for:"
    log "  [$trace_id] checkText called for user"
    log "  [$trace_id] Text service mutation succeeded"
  else
    log "❌ FAILED"
    pretty_json "$response"
  fi
}

###############################################################################
# MAIN EXECUTION
###############################################################################

main() {
  log "╔═════════════════════════════════════════════════════════╗"
  log "║          CheckText Mutation Test Suite                  ║"
  log "║                                                          ║"
  log "║  API Gateway: $API_GATEWAY_URL"
  log "╚═════════════════════════════════════════════════════════╝"
  
  # Check if gateway is running
  log ""
  log "Checking if api-gateway is running..."
  if ! curl -s "$API_GATEWAY_URL" > /dev/null 2>&1; then
    log "ERROR: api-gateway is not running at $API_GATEWAY_URL"
    log "Make sure Docker containers are started: docker-compose up -d"
    exit 1
  fi
  log "✅ api-gateway is running"
  
  # Get JWT token
  log ""
  if ! get_jwt_token; then
    log "ERROR: Could not obtain JWT token"
    exit 1
  fi
  
  # Run tests
  test_happy_path
  test_without_auth
  test_health_check
  test_circuit_breaker
  test_trace_id
  
  log ""
  log "╔═════════════════════════════════════════════════════════╗"
  log "║                  Tests Completed                        ║"
  log "║                                                          ║"
  log "║  Next: Check docker-compose logs for detailed output    ║"
  log "║    $ docker-compose logs -f api-gateway                ║"
  log "║    $ docker-compose logs -f text-service               ║"
  log "╚═════════════════════════════════════════════════════════╝"
}

# Run main if this script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
  main "$@"
fi
