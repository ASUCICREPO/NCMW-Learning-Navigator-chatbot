# Step 7: Bedrock Integration - Detailed Explanation

## 🎯 What We Built

Amazon Bedrock integration with Claude 3.5 Sonnet for our chatbot:

1. **Bedrock IAM Permissions**: Lambda can invoke Bedrock models
2. **Chat Lambda Update**: Integrated Claude 3.5 Sonnet API
3. **Role-Based System Prompts**: Customized responses for instructors/staff/admins
4. **DynamoDB Integration**: Save all conversations for history and analytics
5. **Fallback Handling**: Graceful degradation if Bedrock is unavailable
6. **Error Handling**: Robust try-catch blocks for reliability

**What We're NOT Adding Yet (Future Steps):**
- RAG (Retrieval-Augmented Generation) with OpenSearch
- Streaming responses (WebSocket API)
- Conversation memory/context
- LangChain orchestration

---

## 🏗️ Bedrock Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         USER                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS + JWT
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    API GATEWAY                                │
│  • Validate JWT token                                         │
│  • Extract user info (sub, email, groups)                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   CHAT LAMBDA (1024 MB, 60s)                  │
│                                                                │
│  1. Parse request (message, conversation_id)                  │
│  2. Build role-specific system prompt                         │
│  3. Call Bedrock API ────────────────┐                        │
│  4. Save to DynamoDB                 │                        │
│  5. Return response                  │                        │
└──────────────────────────────────────┼────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
                  ▼                    ▼                    ▼
        ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐
        │  Amazon Bedrock │  │    DynamoDB      │  │ CloudWatch │
        │                 │  │                  │  │   Logs     │
        │ Claude 3.5      │  │ Conversations    │  │            │
        │ Sonnet          │  │ (PK/SK design)   │  │ Debugging  │
        └─────────────────┘  └──────────────────┘  └────────────┘
```

---

## 🔄 Trade-offs Analysis

### 1. Claude 3.5 Sonnet vs Claude 3 Opus vs Claude 3 Haiku

**Our Choice: Claude 3.5 Sonnet**

| Model | Input Cost | Output Cost | Speed | Quality | Use Case |
|-------|------------|-------------|-------|---------|----------|
| **Claude 3.5 Sonnet** | $3/MTok | $15/MTok | Fast | ✅ Excellent | ✅ Balanced |
| Claude 3 Opus | $15/MTok | $75/MTok | Slower | Best | Critical tasks |
| Claude 3 Haiku | $0.25/MTok | $1.25/MTok | Fastest | Good | Simple queries |

**Why Claude 3.5 Sonnet?**
- Best balance of quality, speed, and cost
- 5x cheaper than Opus ($3 vs $15 per MTok input)
- Nearly as good as Opus for most tasks
- Fast enough for real-time chat (<5 seconds)
- 200K token context window (large enough for conversations)

**When to Use Claude 3 Opus?**
- Complex reasoning required
- Critical decision-making
- Highest accuracy needed
- Budget is not a constraint

**When to Use Claude 3 Haiku?**
- Simple FAQ responses
- Classification tasks
- High volume, low complexity
- Cost is critical

**Cost Example:**
```
Scenario: 1000 conversations/month, avg 500 tokens in + 500 tokens out

Claude 3.5 Sonnet:
- Input: 1000 × 500 tokens × $3/1M = $1.50
- Output: 1000 × 500 tokens × $15/1M = $7.50
- Total: $9.00/month

Claude 3 Opus:
- Input: 1000 × 500 tokens × $15/1M = $7.50
- Output: 1000 × 500 tokens × $75/1M = $37.50
- Total: $45.00/month (5x more!)

Claude 3 Haiku:
- Input: 1000 × 500 tokens × $0.25/1M = $0.125
- Output: 1000 × 500 tokens × $1.25/1M = $0.625
- Total: $0.75/month (12x cheaper, but lower quality)
```

---

### 2. Direct Bedrock API vs LangChain

**Our Choice: Direct Bedrock API (for now)**

| Factor | Direct Bedrock API | LangChain |
|--------|-------------------|-----------|
| **Complexity** | ✅ Simple | Complex |
| **Dependencies** | None (boto3 built-in) | 10+ packages |
| **Lambda Size** | 1 MB | 50-100 MB |
| **Cold Start** | ✅ Fast (<500ms) | Slower (1-2s) |
| **Features** | Basic | ✅ RAG, agents, memory |
| **Flexibility** | ✅ Full control | Abstracted |

**Why Direct API for MVP?**
- Simpler code (fewer dependencies)
- Faster cold starts
- Smaller Lambda package
- Full control over requests
- Easy to understand and debug

**When to Use LangChain?** (Future Step 8)
- Need RAG with vector search
- Want conversation memory
- Multiple tool/agent orchestration
- Advanced prompt chaining
- Worth the complexity trade-off

---

### 3. System Prompt: Role-Based vs Generic

**Our Choice: Role-Based System Prompts**

| Approach | Pros | Cons |
|----------|------|------|
| **Generic** | Simple, one prompt | Less relevant answers |
| **Role-Based** | ✅ Personalized, accurate | More complex logic |

**Why Role-Based?**
- Instructors need course/invoice help
- Staff need operational guidance
- Admins need analytics/management info
- Tailored responses = better UX

**Implementation:**
```python
# Instructor system prompt
"Focus on: Course scheduling, invoicing, resources, certification"

# Staff system prompt
"Focus on: Operational processes, troubleshooting, policies"

# Admin system prompt
"Focus on: Analytics, user management, configuration"
```

**Token Cost Impact:**
- Generic prompt: ~100 tokens
- Role-based prompts: ~150 tokens
- Extra cost: 50 tokens × $3/1M = $0.00015 per request
- Worth it for better responses!

---

### 4. Lambda Memory: 512 MB vs 1024 MB

**Our Choice: 1024 MB (increased for Bedrock)**

| Memory | Cost/ms | Speed | Use Case |
|--------|---------|-------|----------|
| **512 MB** | $0.0000083 | Slower | Mock responses |
| **1024 MB** | $0.0000166 | ✅ Faster | ✅ Bedrock API |
| **2048 MB** | $0.0000333 | Fastest | Heavy compute |

**Why 1024 MB?**
- Bedrock SDK + JSON parsing needs memory
- Faster execution = lower overall cost
- 512 MB might timeout on complex queries
- 1024 MB is sweet spot for API calls

**Cost Example:**
```
Scenario: 1000 requests/month, 5 seconds avg (Bedrock latency)

512 MB:
- May timeout (30s limit)
- Cost: 1000 × 5s × $0.0000083 = $0.0415

1024 MB:
- Runs reliably
- Faster (maybe 4s due to more CPU)
- Cost: 1000 × 4s × $0.0000166 = $0.0664

Extra $0.025/month for reliability is worth it!
```

---

### 5. Timeout: 30s vs 60s

**Our Choice: 60 seconds (increased for Bedrock)**

| Timeout | Risk | Use Case |
|---------|------|----------|
| **30s** | Timeouts on slow queries | Mock responses |
| **60s** | ✅ Safe for Bedrock | ✅ Real AI |
| **900s** | Runaway cost risk | Batch processing |

**Why 60s?**
- Bedrock typical latency: 3-10 seconds
- Worst case (long response): 15-20 seconds
- DynamoDB save: 100-500ms
- 60s provides safe buffer

**Bedrock Latency Factors:**
```
Fast query (100 tokens out): 2-3 seconds
Medium query (500 tokens out): 5-8 seconds
Long query (2000 tokens out): 12-20 seconds

With retries and DynamoDB:
- Best case: 3 seconds
- Typical: 6 seconds
- Worst case: 25 seconds

60s timeout is safe!
```

---

### 6. Bedrock Permissions: Specific Model vs Wildcard

**Our Choice: Wildcard (`*`) for MVP**

| Approach | Security | Flexibility |
|----------|----------|-------------|
| **Specific ARN** | ✅ Most secure | Hard to change models |
| **Wildcard (*)** | Less secure | ✅ Easy to experiment |

**Why Wildcard?**
- Easy to switch models (Sonnet → Opus → Haiku)
- No infrastructure change needed
- Good for MVP experimentation
- Can restrict later

**Specific ARN (Production):**
```python
resources=[
    f"arn:aws:bedrock:{region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
]
```

**Security Note:**
- Wildcard only allows models in our account
- Can't access other AWS resources
- Lambda role is still least-privilege

---

### 7. Error Handling: Fail vs Fallback

**Our Choice: Fallback to Mock Response**

| Approach | UX | Reliability |
|----------|----|----|
| **Fail (return error)** | ❌ Poor UX | Shows real status |
| **Fallback (mock)** | ✅ Better UX | ✅ Always works |
| **Retry + Fail** | Balanced | More complex |

**Why Fallback?**
- Users get *some* response
- Graceful degradation
- Bedrock throttling won't break app
- Can add retry logic later

**Implementation:**
```python
try:
    response = query_bedrock(...)
except Exception as e:
    print(f"Bedrock error: {e}")
    # Fallback to friendly error message
    response = "I'm experiencing technical difficulties..."
```

**Future Improvement:**
- Add exponential backoff retry
- Queue failed requests
- Alert ops team on repeated failures

---

### 8. Conversation Storage: DynamoDB vs S3 vs Both

**Our Choice: DynamoDB Only (for now)**

| Storage | Query Speed | Cost | Use Case |
|---------|-------------|------|----------|
| **DynamoDB** | ✅ Fast (<10ms) | $1.25/M reads | ✅ Recent conversations |
| **S3** | Slow (need scan) | $0.023/GB | Archive old data |
| **Both** | Best of both | More complex | Production |

**Why DynamoDB Only?**
- Fast queries by user or conversation
- Single-table design (Step 2)
- Good for MVP scale
- Can archive to S3 later

**Data Model:**
```
PK: CONV#<conversation_id>
SK: MSG#<timestamp>#USER (or ASSISTANT)

Attributes:
- message: text
- userId: sub from Cognito
- userEmail: email
- timestamp: ISO 8601
- model: claude-3-5-sonnet...

GSI1PK: USER#<user_id>
GSI1SK: CONV#<conversation_id>#<timestamp>
(For querying all conversations by user)
```

**Future: Archive to S3:**
```python
# After 90 days, move to S3 for analytics
s3.put_object(
    Bucket='learning-navigator-logs',
    Key=f'conversations/{year}/{month}/{conversation_id}.json',
    Body=json.dumps(messages)
)
```

---

## 💰 Cost Estimate

### Updated Monthly Costs (1000 conversations/month)

| Component | Previous (Mock) | With Bedrock | Change |
|-----------|----------------|--------------|--------|
| **API Gateway** | $3.50 | $3.50 | - |
| **Lambda Compute** | $3.78 (512MB) | $6.64 (1024MB) | +$2.86 |
| **DynamoDB** | $0.10 | $0.25 (more writes) | +$0.15 |
| **Bedrock** | $0 | $9.00 | +$9.00 |
| **CloudWatch** | $1.00 | $1.50 | +$0.50 |
| **Total** | **$8.38** | **$20.89** | **+$12.51** |

### At Scale (10K conversations/month)

| Component | Cost |
|-----------|------|
| API Gateway | $35.00 |
| Lambda | $66.40 |
| DynamoDB | $2.50 |
| **Bedrock** | **$90.00** |
| CloudWatch | $15.00 |
| **Total** | **~$208.90/month** |

**Bedrock is the largest cost driver!**

### Optimization Strategies

1. **Use Claude 3 Haiku for simple queries:**
   - "What is MHFA?" → Haiku (12x cheaper)
   - "Help me with complex invoicing issue" → Sonnet

2. **Implement caching:**
   - Cache common questions
   - Reuse responses for similar queries
   - Save 20-30% on Bedrock costs

3. **Prompt engineering:**
   - Shorter system prompts (save input tokens)
   - Request concise responses (save output tokens)
   - 20% token reduction = 20% cost reduction

4. **Rate limiting:**
   - Prevent abuse
   - Set per-user limits
   - Protect budget

---

## 🧪 How to Test

### 1. Test with AWS CLI (After Deployment)

```bash
# Get API URL and create a user first (see STEP_4_COGNITO.md)

# Get JWT token
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <client-id> \
  --auth-parameters USERNAME=<email>,PASSWORD=<password> \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Test chat endpoint
curl -X POST \
  https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What courses are available for MHFA instructors?"
  }'

# Response:
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "As an MHFA instructor, you have access to several courses...",
  "user_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "timestamp": "2025-12-20T15:30:00.000Z",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

### 2. Test Different User Roles

```bash
# Test as instructor (will get instructor-focused response)
curl -X POST ... -d '{"message": "How do I submit an invoice?"}'

# Test as staff (will get operational guidance)
curl -X POST ... -d '{"message": "How do I troubleshoot a user issue?"}'

# Test as admin (will get analytics info)
curl -X POST ... -d '{"message": "Show me user engagement metrics"}'
```

### 3. Test Conversation Continuity

```bash
# First message
CONV_ID=$(curl -X POST ... -d '{"message": "Hello"}' | jq -r '.conversation_id')

# Continue conversation
curl -X POST ... -d "{
  \"conversation_id\": \"$CONV_ID\",
  \"message\": \"Tell me more about that\"
}"
```

### 4. Check DynamoDB

```bash
# Query conversation messages
aws dynamodb query \
  --table-name learning-navigator \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"CONV#<conversation-id>"}}'

# Query user's conversations
aws dynamodb query \
  --table-name learning-navigator \
  --index-name GSI1PK-GSI1SK-index \
  --key-condition-expression "GSI1PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#<user-id>"}}'
```

### 5. Monitor CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/learning-navigator-chat --follow

# Look for:
# - "Invoking Bedrock model: ..."
# - "Bedrock response received (X chars)"
# - "Saved user message to DynamoDB"
# - "Saved assistant message to DynamoDB"
```

---

## 🚨 Troubleshooting

### Issue 1: "AccessDeniedException" from Bedrock

**Cause:** Lambda doesn't have Bedrock permissions

**Fix:**
```bash
# Check IAM role permissions
aws iam get-role-policy \
  --role-name learning-navigator-lambda-role \
  --policy-name <policy-name>

# Should include:
# "bedrock:InvokeModel"
# "bedrock:InvokeModelWithResponseStream"
```

### Issue 2: Model Not Found

**Cause:** Claude 3.5 Sonnet not enabled in your region

**Fix:**
1. Go to AWS Bedrock console
2. Click "Model access" in left sidebar
3. Request access to "Anthropic Claude 3.5 Sonnet"
4. Wait for approval (usually instant)

### Issue 3: Timeout After 60s

**Cause:** Bedrock is slow or having issues

**Fix:**
- Check Bedrock service health
- Reduce max_tokens (2048 → 1024)
- Add retry logic with exponential backoff

### Issue 4: Empty Response from Bedrock

**Cause:** Response parsing failed

**Fix:**
- Check CloudWatch logs for full response
- Verify response format matches code expectations
- Add better error handling:
```python
if not content_blocks:
    print(f"Unexpected response: {response_body}")
    return "I couldn't generate a response..."
```

---

## 🚀 What's Next

**Step 8: RAG with OpenSearch** (Future)
- Add OpenSearch domain for vector search
- Implement document embedding pipeline
- Add LangChain for RAG orchestration
- Enable semantic search over PDF knowledge base

**Step 9: Streaming Responses** (Future)
- Add WebSocket API
- Use `InvokeModelWithResponseStream`
- Stream tokens to frontend in real-time
- Better UX for long responses

**Step 10: Conversation Memory** (Future)
- Load previous messages from DynamoDB
- Include context in Bedrock requests
- Implement sliding window (last 10 messages)
- Handle 200K token limit

---

## 📊 Summary

✅ **Integrated**: Amazon Bedrock Claude 3.5 Sonnet
✅ **Added**: Bedrock IAM permissions to Lambda role
✅ **Implemented**: Role-based system prompts
✅ **Configured**: 1024 MB memory, 60s timeout
✅ **Built**: DynamoDB conversation storage
✅ **Added**: Fallback handling for errors
✅ **Cost**: ~$21/month for 1K conversations, ~$209/month for 10K
✅ **Next Step**: Add OpenSearch for RAG (Step 8)
✅ **Interview Ready**: Understanding of Bedrock integration trade-offs

**Chatbot is now powered by real AI!** 🎉 🤖

No more mock responses - Claude 3.5 Sonnet is answering user questions!

---

*Ready for Step 8: RAG with OpenSearch!* 🚀
