# Step 6: API Gateway - Detailed Explanation

## 🎯 What We Built

A REST API using Amazon API Gateway that exposes our Lambda functions as HTTP endpoints:

1. **REST API**: Main chatbot API with CORS, throttling, and logging
2. **Cognito Authorizer**: JWT token validation for secure endpoints
3. **Health Endpoint** (`GET /health`): Public endpoint to verify API is running
4. **Chat Endpoint** (`POST /chat`): Authenticated endpoint for chatbot interactions
5. **Request Validation**: Schema validation to reject malformed requests
6. **CloudWatch Logging**: Full request/response logging for debugging

---

## 🏗️ API Gateway Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│  (React App)                                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   API GATEWAY (REST)                          │
│  Domain: https://<id>.execute-api.us-west-2.amazonaws.com    │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CORS: Allow frontend origins                         │  │
│  │  Throttling: 100 req/s, 200 burst                     │  │
│  │  Logging: Full request/response (CloudWatch)          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────┐          ┌──────────────────────────┐   │
│  │  GET /health    │          │    POST /chat            │   │
│  │  (Public)       │          │    (Authenticated)       │   │
│  └────────┬────────┘          └──────────┬───────────────┘   │
│           │                              │                    │
│           │                              ▼                    │
│           │                    ┌──────────────────────────┐   │
│           │                    │  Cognito Authorizer      │   │
│           │                    │  • Validate JWT token    │   │
│           │                    │  • Extract user claims   │   │
│           │                    │  • Cache for 5 minutes   │   │
│           │                    └──────────┬───────────────┘   │
│           │                              │                    │
│           │                              ▼                    │
│           │                    ┌──────────────────────────┐   │
│           │                    │  Request Validator       │   │
│           │                    │  • Check body exists     │   │
│           │                    │  • Validate schema       │   │
│           │                    └──────────┬───────────────┘   │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            ▼                              ▼
    ┌───────────────┐          ┌───────────────────┐
    │ Health Lambda │          │   Chat Lambda     │
    │ (128 MB)      │          │   (512 MB)        │
    └───────────────┘          └───────────────────┘
```

---

## 🔄 Trade-offs Analysis

### 1. REST API vs HTTP API vs WebSocket API

**Our Choice: REST API**

| Factor | REST API | HTTP API | WebSocket API |
|--------|----------|----------|---------------|
| **Cost** | $3.50/M requests | ✅ $1/M requests | $1/M messages |
| **Cognito Authorizer** | ✅ Full support | ⚠️ Limited (JWT only) | Manual validation |
| **Request Validation** | ✅ Built-in | ❌ None | ❌ Manual |
| **Features** | ✅ Full (caching, API keys) | Basic | Real-time only |
| **Use Case** | HTTP APIs | Simple APIs | ✅ Streaming |
| **Maturity** | ✅ Battle-tested | Newer | Mature |

**Why REST API?**
- Cognito User Pool authorizer support (not JWT-only)
- Built-in request validation saves Lambda costs
- API keys and usage plans for future rate limiting
- More features for $2.50/M extra ($3.50 vs $1)

**When to Use HTTP API?**
- Simple pass-through to Lambda
- JWT validation only (no Cognito User Pools)
- Cost is critical constraint
- Don't need request validation or caching

**When to Use WebSocket API?**
- Real-time streaming (we'll add this in Step 7 for Bedrock streaming)
- Bi-directional communication
- Long-lived connections

**Cost Example:**
```
100K requests/month:
- REST API: 100K × $3.50/1M = $0.35
- HTTP API: 100K × $1/1M = $0.10
- Savings: $0.25/month

1M requests/month:
- REST API: 1M × $3.50 = $3.50
- HTTP API: 1M × $1 = $1.00
- Savings: $2.50/month

Even at 1M requests, extra features worth $2.50/month for MVP
```

---

### 2. Cognito Authorizer vs Lambda Authorizer vs API Keys

**Our Choice: Cognito Authorizer**

| Factor | Cognito Authorizer | Lambda Authorizer | API Keys |
|--------|-------------------|-------------------|----------|
| **Cost** | ✅ Free | $0.20/M authorizations | Free |
| **Use Case** | User authentication | Custom logic | Service-to-service |
| **JWT Validation** | ✅ Automatic | Manual | N/A |
| **User Claims** | ✅ Automatic extraction | Manual | N/A |
| **Caching** | ✅ Built-in (configurable) | Manual | N/A |
| **Complexity** | ✅ Simple | More code | Simplest |

**Why Cognito Authorizer?**
- Free (vs $0.20/M for Lambda authorizer)
- Automatic JWT validation (no code needed)
- Extracts user claims (`sub`, `email`, `cognito:groups`) automatically
- Built-in caching (we set to 5 minutes)
- Perfect for user authentication

**When to Use Lambda Authorizer?**
- Custom authorization logic (check external database)
- Non-JWT authentication (API keys from database)
- Complex rules (rate limits per user type)
- Multiple token types (JWT + custom tokens)

**When to Use API Keys?**
- Service-to-service authentication
- Third-party integrations
- Simple static credentials
- Not suitable for user authentication

**Cost Comparison:**
```
1M chat requests/month:

Cognito Authorizer:
- Authorization: Free
- Total: $0

Lambda Authorizer:
- Authorization: 1M × $0.20/M = $0.20
- Lambda execution: 1M × 50ms × 128MB = $0.01
- Total: $0.21/month

Small cost, but Cognito is better for user auth anyway!
```

---

### 3. Throttling: 100 req/s vs Higher Limits

**Our Choice: 100 req/s, 200 burst**

| Rate Limit | Use Case | Risk |
|------------|----------|------|
| **10 req/s** | Internal tools | Users get throttled |
| **100 req/s** | MVP chatbot | Good balance |
| **1000 req/s** | High traffic apps | Cost abuse risk |
| **10,000 req/s** | Enterprise | Very expensive |

**Why 100 req/s?**
- Conservative limit for MVP
- 100 users making 1 request/second = 100 req/s
- 200 burst allows spikes (10 users submitting at once)
- Prevents abuse and runaway costs

**Throttling Math:**
```
100 req/s sustained:
- Per minute: 100 × 60 = 6,000 requests
- Per hour: 6,000 × 60 = 360,000 requests
- Per day: 360K × 24 = 8.6M requests
- Per month: 8.6M × 30 = 258M requests

At $3.50 per 1M requests: 258M × $3.50 = $903/month
(This is theoretical max, actual usage will be much lower)

Burst capacity (200):
- Allows 200 concurrent users to submit at exact same time
- Resets after 1 second
- Good for classroom scenarios (instructor demos to class)
```

**When to Increase?**
- Production launch (increase to 500-1000 req/s)
- High user count (>500 concurrent users)
- Special events (training sessions, webinars)

**When to Decrease?**
- Internal testing (10-50 req/s)
- Budget constraints
- Detected abuse patterns

---

### 4. Logging Level: INFO vs ERROR vs OFF

**Our Choice: INFO with data trace enabled**

| Level | What's Logged | Cost | Use Case |
|-------|--------------|------|----------|
| **OFF** | Nothing | Free | Not recommended |
| **ERROR** | Errors only | $0.10/GB | Production |
| **INFO** | All requests + errors | $0.50/GB | ✅ MVP / Debugging |

**Why INFO for MVP?**
- Full request/response logging for debugging
- See exact JWT tokens, payloads, responses
- Troubleshoot issues quickly
- Cost is low at MVP scale

**Data Trace Enabled:**
- Logs full request/response bodies
- Essential for debugging during development
- **IMPORTANT:** Disable in production (logs sensitive data!)

**Log Volume Estimate:**
```
100K requests/month, 2 KB per log entry:

Monthly logs:
- 100K × 2 KB = 200 MB = 0.2 GB

CloudWatch cost:
- Ingestion: 0.2 GB × $0.50 = $0.10
- Storage (30 days): 0.2 GB × $0.03 = $0.006
- Total: ~$0.11/month

At 1M requests/month:
- 1M × 2 KB = 2 GB
- Ingestion: 2 GB × $0.50 = $1.00
- Storage: 2 GB × $0.03 = $0.06
- Total: ~$1.06/month

Very cheap for the debugging value!
```

**Production Best Practice:**
- Switch to ERROR level (log only failures)
- Disable data_trace_enabled (don't log sensitive data)
- Use structured logging (JSON format)
- Archive old logs to S3 (Step 3 logs bucket)

---

### 5. Caching: Enabled vs Disabled

**Our Choice: Disabled**

| Factor | Caching Enabled | Caching Disabled |
|--------|-----------------|------------------|
| **Cost** | $0.02/hour for 0.5 GB = $14.40/month | Free |
| **Response Time** | ✅ Faster (cached hits) | Slower (Lambda every time) |
| **Data Freshness** | ⚠️ Stale data | ✅ Always fresh |
| **Use Case** | Repeated identical queries | Unique queries |

**Why Disabled?**
- Chatbot queries are unique (no repeated requests)
- Each user message is different
- Caching would have ~0% hit rate
- Saves $14.40/month with no benefit

**When to Enable Caching?**
- Public endpoints with repeated queries
- "Get user profile" calls (same userId queried often)
- Static content (FAQ list, course catalog)
- High traffic with repeated patterns

**Cache Size Options:**
```
Cache Size | Cost | Use Case
-----------|------|----------
0.5 GB     | $0.02/hour ($14.40/month) | Small APIs
1.6 GB     | $0.038/hour ($27.36/month) | Medium traffic
6.1 GB     | $0.20/hour ($144/month) | High traffic
13.5 GB    | $0.25/hour ($180/month) | Very high traffic

For chatbot with unique queries: $0 (disabled) is best!
```

---

### 6. CORS: Permissive (*) vs Restrictive (Specific Domains)

**Our Choice: Permissive (`*`) for MVP**

| Setting | Allow Origins | Security | Development |
|---------|--------------|----------|-------------|
| **Permissive** | `*` (all) | ⚠️ Less secure | ✅ Easy |
| **Restrictive** | Specific domains | ✅ More secure | Harder to test |

**Why Permissive for MVP?**
- Easy local development (localhost:3000)
- Test from multiple environments
- Frontend URL may change during development
- Can restrict later (no infrastructure change)

**Current CORS Configuration:**
```python
allow_origins=["*"]  # Any domain can call API
allow_methods=["GET", "POST", "OPTIONS"]
allow_headers=["Content-Type", "Authorization", ...]
allow_credentials=True  # Allow cookies/JWT
max_age=3600  # Browser caches preflight for 1 hour
```

**Production Best Practice:**
```python
allow_origins=[
    "https://app.learningnavigator.com",  # Production
    "https://staging.learningnavigator.com",  # Staging
    "http://localhost:3000",  # Local dev (optional)
]
```

**CORS Preflight Flow:**
```
Browser: OPTIONS /chat
        Headers:
          Origin: http://localhost:3000
          Access-Control-Request-Method: POST

API Gateway: 200 OK
            Headers:
              Access-Control-Allow-Origin: *
              Access-Control-Allow-Methods: GET, POST, OPTIONS
              Access-Control-Max-Age: 3600

Browser: [Caches result for 1 hour]
         [Allows POST /chat request to proceed]
```

---

### 7. Request Validation: API Gateway vs Lambda

**Our Choice: Basic validation in API Gateway, detailed validation in Lambda**

| Validation Level | Where | Cost | Flexibility |
|------------------|-------|------|-------------|
| **None** | - | Free | ✅ Most flexible |
| **Basic** | API Gateway | Free | Limited |
| **Strict** | API Gateway | Free | ⚠️ Hard to change |
| **Custom** | Lambda | Lambda cost | ✅ Fully flexible |

**Why Split Validation?**
- API Gateway: Reject obviously bad requests (saves Lambda cost)
- Lambda: Complex validation (message content, business rules)

**API Gateway Validation:**
```python
Schema:
- message: string (1-5000 chars) - REQUIRED
- conversation_id: string - OPTIONAL

Catches:
✅ Missing message field
✅ Empty message
✅ Message > 5000 characters
✅ Wrong data type (number instead of string)

Doesn't catch:
❌ Inappropriate content (requires Lambda)
❌ Business rules (requires Lambda)
❌ Context-specific validation (requires Lambda)
```

**Lambda Validation:**
```python
# In chat Lambda function (future improvement):
def validate_message(message):
    # Content moderation
    if contains_profanity(message):
        return error("Inappropriate content")

    # Business rules
    if len(message.split()) < 3:
        return error("Message too short")

    # Rate limiting per user
    if user_exceeded_daily_limit():
        return error("Daily limit exceeded")
```

**Cost Savings from API Gateway Validation:**
```
Scenario: 10% of requests have missing/invalid message field

Without API Gateway validation:
- 100K total requests
- 10K bad requests invoke Lambda unnecessarily
- Lambda cost for bad requests: 10K × 0.5s × 512MB = $0.42
- API Gateway cost: 100K × $3.50/1M = $0.35
- Total: $0.77

With API Gateway validation:
- 100K total requests
- 10K rejected at API Gateway (no Lambda invocation)
- 90K good requests invoke Lambda
- Lambda cost: 90K × 0.5s × 512MB = $3.78
- API Gateway cost: 100K × $3.50/1M = $0.35
- Total: $4.13

Wait, this is MORE expensive!

Actually, the savings come from preventing abuse:
- Malicious bot sends 1M invalid requests
- Without validation: 1M × Lambda cost = huge bill
- With validation: Rejected at API Gateway, minimal cost
```

---

### 8. Single Stage (prod) vs Multiple Stages (dev/staging/prod)

**Our Choice: Single stage (prod) for MVP**

| Approach | Stages | Deployment | Cost |
|----------|--------|------------|------|
| **Single Stage** | prod only | Direct to prod | 1× |
| **Multiple Stages** | dev, staging, prod | Test before prod | 3× |

**Why Single Stage for MVP?**
- Simpler deployment workflow
- Faster iteration (no multi-stage promotion)
- Lower cost (1 API instead of 3)
- MVP can deploy directly to prod

**Multiple Stages Structure (Future):**
```
API: learning-navigator-api

Stage: dev
  URL: https://<id>.execute-api.us-west-2.amazonaws.com/dev
  Use: Development testing
  Throttle: 10 req/s
  Logging: INFO (full)

Stage: staging
  URL: https://<id>.execute-api.us-west-2.amazonaws.com/staging
  Use: Pre-production testing
  Throttle: 50 req/s
  Logging: ERROR

Stage: prod
  URL: https://<id>.execute-api.us-west-2.amazonaws.com/prod
  Use: Production
  Throttle: 1000 req/s
  Logging: ERROR
  Caching: Enabled (if applicable)
```

**When to Add Multiple Stages?**
- Production launch
- Team needs testing environment
- Want to test infrastructure changes safely
- Compliance requirements (change management)

---

## 💰 Cost Estimate

### Monthly Costs (100K requests/month)

| Component | Calculation | Cost |
|-----------|-------------|------|
| **API Gateway Requests** | 100K × $3.50/1M | $0.35 |
| **API Gateway Logging** | 0.2 GB × $0.50 | $0.10 |
| **Data Transfer** | 100K × 2 KB × $0.09/GB | $0.018 |
| **Total API Gateway** | | **~$0.47/month** |

### At Scale (1M requests/month)

| Component | Cost |
|-----------|------|
| API Gateway Requests | $3.50 |
| Logging | $1.00 |
| Data Transfer | $0.18 |
| **Total** | **~$4.68/month** |

### Combined Infrastructure (1M requests/month)

| Component | Cost |
|-----------|------|
| DynamoDB | $1.25 |
| S3 | $1.00 |
| Lambda | $42.70 |
| **API Gateway** | **$4.68** |
| Cognito | $0.50 |
| CloudWatch | $5.00 |
| **Total** | **~$55.13/month** |

Still very affordable! Most cost is Lambda compute ($42.70).

---

## 🧪 How to Test

### 1. Test Health Endpoint (No Auth)

```bash
# Get API URL from CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`HealthEndpoint`].OutputValue' \
  --output text

# Test health endpoint (should return 200 OK)
curl https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/health

# Response:
{
  "status": "healthy",
  "service": "Learning Navigator API",
  "timestamp": "2025-12-20T10:30:00.000Z",
  "region": "us-west-2",
  "function": "learning-navigator-health",
  "version": "1.0.0"
}
```

### 2. Test Chat Endpoint (With Auth)

```bash
# First, get a JWT token from Cognito (requires creating a test user)
# See STEP_4_COGNITO.md for creating users

# Option 1: Use Cognito Hosted UI to get token
# Visit: https://learning-navigator-ncmw.auth.us-west-2.amazoncognito.com/login
# Login and copy token from URL after redirect

# Option 2: Use AWS CLI
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <user-pool-client-id> \
  --auth-parameters USERNAME=<email>,PASSWORD=<password> \
  --query 'AuthenticationResult.IdToken' \
  --output text

# Test chat endpoint with token
curl -X POST \
  https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "message": "Hello, what courses are available?"
  }'

# Response:
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Hello Instructor! I received your message...",
  "user_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "timestamp": "2025-12-20T10:30:00.000Z",
  "model": "mock"
}
```

### 3. Test Without Auth (Should Fail)

```bash
# Try to access chat without token
curl -X POST \
  https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Response (401 Unauthorized):
{
  "message": "Unauthorized"
}
```

### 4. Test Invalid Request (Should Fail)

```bash
# Missing required "message" field
curl -X POST \
  https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{}'

# Response (400 Bad Request):
{
  "message": "Invalid request body"
}
```

---

## 🚀 What's Next

**Step 7: Bedrock Integration** (Next Step)
- Integrate Amazon Bedrock (Claude 3 Sonnet)
- Add LangChain for RAG (Retrieval-Augmented Generation)
- Connect to OpenSearch for vector search
- Implement streaming responses (WebSocket API)
- Add conversation memory (DynamoDB)

**Step 8: Frontend Development**
- Build React application
- Integrate with API Gateway
- Implement Cognito authentication (AWS Amplify)
- Add real-time chat UI
- Deploy to S3 + CloudFront

---

## 📊 Summary

✅ **Created**: REST API with 2 endpoints (`/health`, `/chat`)
✅ **Configured**: Cognito authorizer for JWT validation
✅ **Enabled**: CORS, throttling (100 req/s), logging (INFO)
✅ **Added**: Request validation to reject bad requests
✅ **Cost**: ~$0.47/month for 100K requests, ~$4.68/month for 1M requests
✅ **Next Step**: Integrate Bedrock Claude for real AI responses
✅ **Interview Ready**: Understanding of API Gateway trade-offs

**Architecture Complete So Far:**
```
Frontend (S3) → API Gateway → Lambda → DynamoDB
                     ↓
                  Cognito
                     ↓
                CloudWatch
```

**Ready for Step 7: Bedrock Integration!** 🚀
