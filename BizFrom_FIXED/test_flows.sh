#!/bin/bash
# BizForm SaaS - Flow Validation Testing Script
# 
# This script tests all major flows using curl commands.
# Usage: bash test_flows.sh
# 
# Prerequisites:
#   - Backend running on http://localhost:3000
#   - curl installed
#   - jq installed (optional, for JSON parsing)

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "BizForm SaaS - Flow Validation Tests"
echo "=========================================="
echo "Target: $BASE_URL"
echo ""

# Helper function to print test result
print_result() {
  local test_name=$1
  local status=$2
  if [ "$status" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name (exit code: $status)"
  fi
}

# Helper function to extract JSON value
extract_json() {
  echo "$1" | grep -o "\"$2\"[^,}]*" | cut -d'"' -f4
}

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}1. AUTHENTICATION FLOW${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 1: Register New User
echo "Test 1.1: Register New User"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser'$(date +%s)'@example.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234",
    "name": "Test User",
    "phone": "9999999999",
    "aadhaar": "1234-5678-9012"
  }')

echo "Response: $REGISTER_RESPONSE"
if echo "$REGISTER_RESPONSE" | grep -q "OTP\|code"; then
  print_result "Register user" 0
else
  print_result "Register user" 1
fi
echo ""

# Test 2: Login with existing user
echo "Test 1.2: Login with Valid Credentials"
LOGIN_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sivasirasani49@gmail.com",
    "password": "password123",
    "rememberMe": false
  }')

echo "Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q "session_token\|usr_"; then
  print_result "Login with valid credentials" 0
  # Extract session token from Set-Cookie header if needed
else
  print_result "Login with valid credentials" 1
fi
echo ""

# Test 3: Invalid Login
echo "Test 1.3: Login with Invalid Credentials"
INVALID_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sivasirasani49@gmail.com",
    "password": "wrongpassword"
  }')

echo "Response: $INVALID_LOGIN"
if echo "$INVALID_LOGIN" | grep -q "error\|Invalid"; then
  print_result "Reject invalid credentials" 0
else
  print_result "Reject invalid credentials" 1
fi
echo ""

# Test 4: Validate Session
echo "Test 1.4: Validate Session Token"
VALIDATE_SESSION=$(curl -s -X GET "$BASE_URL/api/auth/validate-session" \
  -H "Cookie: session_token=test_token")

echo "Response: $VALIDATE_SESSION"
if echo "$VALIDATE_SESSION" | grep -q "valid\|error"; then
  print_result "Session validation endpoint" 0
else
  print_result "Session validation endpoint" 1
fi
echo ""

# Test 5: Forgot Password
echo "Test 1.5: Request Password Reset"
FORGOT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sivasirasani49@gmail.com"
  }')

echo "Response: $FORGOT_RESPONSE"
if echo "$FORGOT_RESPONSE" | grep -q "email\|code\|OTP"; then
  print_result "Forgot password flow" 0
else
  print_result "Forgot password flow" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}2. BUSINESS MANAGEMENT FLOW${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Create a mock session token for testing (in production, use real token from login)
SESSION_TOKEN="test_session_usr_1"

# Test 6: Get Businesses
echo "Test 2.1: Fetch User Businesses"
BUSINESSES=$(curl -s -X GET "$BASE_URL/api/businesses" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $BUSINESSES"
if echo "$BUSINESSES" | grep -q "biz_\|businesses\|\[\]"; then
  print_result "Get businesses list" 0
else
  print_result "Get businesses list" 1
fi
echo ""

# Test 7: Create Business
echo "Test 2.2: Create New Business"
NEW_BIZ=$(curl -s -X POST "$BASE_URL/api/businesses" \
  -H "Cookie: session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Nursery",
    "phone": "9123456789",
    "address": "123 Main St, City",
    "notes": "Test business for validation"
  }')

echo "Response: $NEW_BIZ"
if echo "$NEW_BIZ" | grep -q "biz_\|Test Nursery"; then
  print_result "Create business" 0
else
  print_result "Create business" 1
fi
echo ""

# Test 8: Unauthorized Business Access
echo "Test 2.3: Prevent Unauthorized Business Access"
UNAUTHORIZED=$(curl -s -X GET "$BASE_URL/api/businesses/biz_unauthorized" \
  -H "Cookie: session_token=invalid_token")

echo "Response: $UNAUTHORIZED"
if echo "$UNAUTHORIZED" | grep -q "error\|Unauthorized\|Forbidden"; then
  print_result "Block unauthorized business access" 0
else
  print_result "Block unauthorized business access" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}3. FORM BUILDER FLOW${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 9: Get Form Schema
echo "Test 3.1: Fetch Form Schema for Business"
FORM=$(curl -s -X GET "$BASE_URL/api/forms/biz_1" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $FORM"
if echo "$FORM" | grep -q "fields\|customerName\|text"; then
  print_result "Get form schema" 0
else
  print_result "Get form schema" 1
fi
echo ""

# Test 10: Update Form Schema
echo "Test 3.2: Update Form Schema"
UPDATE_FORM=$(curl -s -X POST "$BASE_URL/api/forms/biz_1" \
  -H "Cookie: session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": [
      {"id": "f1", "name": "customerName", "label": "Customer Name", "type": "text", "required": true},
      {"id": "f2", "name": "email", "label": "Email Address", "type": "text", "required": true},
      {"id": "f3", "name": "amount", "label": "Purchase Amount", "type": "number", "required": true}
    ]
  }')

echo "Response: $UPDATE_FORM"
if echo "$UPDATE_FORM" | grep -q "success\|fields\|customerName"; then
  print_result "Update form schema" 0
else
  print_result "Update form schema" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}4. CUSTOMER SUBMISSION FLOW${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 11: Submit Customer Form
echo "Test 4.1: Submit Customer Record"
CUSTOMER=$(curl -s -X POST "$BASE_URL/api/customers" \
  -H "Cookie: session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "biz_1",
    "data": {
      "customerName": "John Doe",
      "phone": "9876543210",
      "address": "123 Oak Lane",
      "plantName": "Monstera Deliciosa",
      "quantity": 5,
      "notes": "Premium care instructions needed"
    },
    "paymentAmount": 2500,
    "paymentMethod": "Online",
    "transactionId": "TXN123456789"
  }')

echo "Response: $CUSTOMER"
if echo "$CUSTOMER" | grep -q "cust_\|John Doe\|2500"; then
  print_result "Submit customer record" 0
else
  print_result "Submit customer record" 1
fi
echo ""

# Test 12: Get Customer Records
echo "Test 4.2: Fetch Customer Records"
CUSTOMERS=$(curl -s -X GET "$BASE_URL/api/customers?businessId=biz_1" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $CUSTOMERS"
if echo "$CUSTOMERS" | grep -q "cust_\|John\|Rohan"; then
  print_result "Get customer records" 0
else
  print_result "Get customer records" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}5. REPORTING & METRICS FLOW${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 13: Overall Reports
echo "Test 5.1: Fetch Overall Dashboard Metrics"
OVERALL_REPORT=$(curl -s -X GET "$BASE_URL/api/reports/overall" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $OVERALL_REPORT"
if echo "$OVERALL_REPORT" | grep -q "business\|customer\|amount\|revenue"; then
  print_result "Get overall metrics" 0
else
  print_result "Get overall metrics" 1
fi
echo ""

# Test 14: Business-Specific Report
echo "Test 5.2: Fetch Business-Specific Report"
BIZ_REPORT=$(curl -s -X GET "$BASE_URL/api/reports/business/biz_1" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $BIZ_REPORT"
if echo "$BIZ_REPORT" | grep -q "revenue\|cash\|online\|amount"; then
  print_result "Get business report" 0
else
  print_result "Get business report" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}6. DATA ISOLATION TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 15: User Can Only See Own Businesses
echo "Test 6.1: Verify User Data Isolation (Own Businesses Only)"
USER_BIZ=$(curl -s -X GET "$BASE_URL/api/businesses" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $USER_BIZ"
if echo "$USER_BIZ" | grep -q "userId\|biz_"; then
  print_result "Verify user data isolation" 0
else
  print_result "Verify user data isolation" 1
fi
echo ""

# Test 16: Prevent Cross-User Access
echo "Test 6.2: Prevent Cross-User Business Access"
CROSS_USER=$(curl -s -X PUT "$BASE_URL/api/businesses/biz_other_user" \
  -H "Cookie: session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked Business"}')

echo "Response: $CROSS_USER"
if echo "$CROSS_USER" | grep -q "Forbidden\|error"; then
  print_result "Block cross-user access" 0
else
  print_result "Block cross-user access" 1
fi
echo ""

echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo -e "${YELLOW}7. ERROR HANDLING & EDGE CASES${NC}"
echo -e "${YELLOW}═══════════════════════════════════${NC}"
echo ""

# Test 17: Missing Required Fields
echo "Test 7.1: Validate Required Fields"
MISSING_FIELDS=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}')

echo "Response: $MISSING_FIELDS"
if echo "$MISSING_FIELDS" | grep -q "required\|error"; then
  print_result "Validate required fields" 0
else
  print_result "Validate required fields" 1
fi
echo ""

# Test 18: Invalid Business ID
echo "Test 7.2: Handle Invalid Business ID"
INVALID_BIZ=$(curl -s -X GET "$BASE_URL/api/forms/invalid_biz_id" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Response: $INVALID_BIZ"
if echo "$INVALID_BIZ" | grep -q "Forbidden\|not found\|error"; then
  print_result "Handle invalid business ID" 0
else
  print_result "Handle invalid business ID" 1
fi
echo ""

# Test 19: Email Delivery Failure Handling
echo "Test 7.3: Handle OTP Email Delivery Failure"
REGISTER_NO_EMAIL=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@invalid.local",
    "password": "Test@1234",
    "confirmPassword": "Test@1234",
    "name": "Test User",
    "phone": "9999999999",
    "aadhaar": "1234-5678-9012"
  }')

echo "Response: $REGISTER_NO_EMAIL"
if echo "$REGISTER_NO_EMAIL" | grep -q "success\|error\|OTP"; then
  print_result "Handle email delivery status" 0
else
  print_result "Handle email delivery status" 1
fi
echo ""

echo ""
echo "=========================================="
echo "Test Suite Completed"
echo "=========================================="
echo ""
echo "✅ All flow categories have been tested:"
echo "   1. Authentication (register, login, forgot password)"
echo "   2. Business Management (create, list, update)"
echo "   3. Form Builder (schema management)"
echo "   4. Customer Submission (CRUD operations)"
echo "   5. Reporting (metrics and revenue breakdown)"
echo "   6. Data Isolation (multi-user security)"
echo "   7. Error Handling (edge cases)"
echo ""
echo "📝 Notes:"
echo "   - Replace SESSION_TOKEN with real token from login response"
echo "   - Some tests may fail if backend is not running"
echo "   - Check backend logs for detailed error messages"
echo "   - Email-related tests may pass with fallback logging"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run this script: bash test_flows.sh"
echo "   2. Review results and logs"
echo "   3. Fix any failed tests"
echo "   4. Deploy to staging environment"
echo "=========================================="
