# Step 5: Lambda Functions - Detailed Explanation

## 🎯 What We Built

Two AWS Lambda functions for our serverless API:
1. **Health Check Lambda**: Simple endpoint to verify API is running
2. **Chat Lambda**: Main chatbot endpoint (mock responses for now, Bedrock integration in Step 7)

Plus:
- **IAM Execution Role**: Shared permissions for Lambda functions
- **Environment Variables**: Configuration for DynamoDB, S3 access
- **CloudWatch Logging**: Automatic logging for debugging

---

## 🏗️ Lambda Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       API GATEWAY                             │
│  (Step 6 - Coming Next)                                      │
└───────────────────┬──────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Health  │  │   Chat   │  │  Future  │
│  Lambda  │  │  Lambda  │  │ Lambdas  │
└────┬─────┘  └────┬─────┘  └──────────┘
     │             │
     │             ├─→ DynamoDB (save conversations)
     │             ├─→ S3 (read PDFs)
     │             └─→ Bedrock (future: Claude AI)
     │
     └─→ CloudWatch Logs
```

---

## 🔄 Trade-offs Analysis

### 1. Lambda vs EC2 vs Containers (ECS/Fargate)

**Our Choice: Lambda**

| Factor | Lambda | EC2 | ECS/Fargate |
|--------|--------|-----|-------------|
| **Cost (low traffic)** | ✅ $0.20/1M requests | ❌ $20-50/month always | ⚠️ $10-30/month |
| **Scaling** | ✅ Automatic (0 to 1000s) | ❌ Manual/Auto-scaling | ⚠️ Auto-scaling |
| **Maintenance** | ✅ Zero | ❌ OS patches, updates | ⚠️ Container management |
| **Cold Start** | ⚠️ 50-500ms | ✅ None | ⚠️ 10-30s |
| **Timeout** | ⚠️ 15 minutes max | ✅ Unlimited | ✅ Unlimited |
| **Performance** | ⚠️ Variable | ✅ Consistent | ✅ Consistent |

**Why Lambda?**
- Perfect for unpredictable chatbot traffic (bursts of activity)
- $0 cost when not in use (vs EC2 always running)
- Auto-scales automatically
- Great for MVP (optimize later if needed)

**When to Consider EC2/ECS?**
- Consistent high traffic (>10M requests/month)
- Need sub-50ms latency (cold starts are issue)
- Complex dependencies that don't fit Lambda limits
- Long-running operations (>15 minutes)

**Cost Example:**
```
Scenario: 100K requests/month, 500ms avg duration, 512 MB memory

Lambda:
- Compute: 100K × 0.5s × 512MB × $0.0000166667 = $0.42
- Requests: 100K × $0.20/1M = $0.02
- Total: $0.44/month

EC2 (t3.small):
- Instance: $15/month (24/7)
- Even with 0 traffic: $15/month
- Total: $15/month

Winner: Lambda (34x cheaper at this scale!)
```

---

### 2. Python 3.11 vs Python 3.9

**Our Choice: Python 3.11**

| Factor | Python 3.11 | Python 3.9 |
|--------|------------|------------|
| **Performance** | ✅ 10-60% faster | Baseline |
| **Features** | ✅ Latest syntax | Older syntax |
| **Support End** | October 2027 | October 2025 |
| **Stability** | ⚠️ Newer | ✅ More battle-tested |
| **Libraries** | ⚠️ Some compatibility | ✅ Full compatibility |

**Why 3.11?**
- Faster execution = lower costs
- Longer support period
- Modern features (better error messages, type hints)
- LangChain and Bedrock SDKs work fine

**When to use 3.9?**
- Legacy dependencies that don't support 3.11
- Team not ready for newer Python
- Maximum stability requirements

---

### 3. Memory Allocation: 128 MB vs 512 MB vs 1024 MB

**Our Choices:**
- Health Check: 128 MB
- Chat: 512 MB (will increase to 1024 MB with Bedrock)

| Memory | Cost/ms | Use Case | Our Usage |
|--------|---------|----------|-----------|
| **128 MB** | $0.0000000021 | Simple APIs | Health check |
| **512 MB** | $0.0000000083 | Moderate logic | Chat (MVP) |
| **1024 MB** | $0.0000166667 | AI/ML workloads | Chat (future) |
| **3008 MB** | $0.0000500000 | Heavy compute | Not needed |

**Why 128 MB for Health Check?**
- Simple JSON response
- No external calls
- Runs in <10ms
- Cheapest option

**Why 512 MB for Chat (MVP)?**
- JSON parsing
- DynamoDB writes
- Future: LangChain overhead
- Will upgrade to 1024 MB when we add Bedrock

**Memory vs Cost Trade-off:**
```
Example: 1M requests, 500ms duration

128 MB:  1M × 0.5s × $0.0000000021 = $0.11
512 MB:  1M × 0.5s × $0.0000000083 = $0.42 (4x cost)
1024 MB: 1M × 0.5s × $0.0000166667 = $0.83 (8x cost)

But: More memory = faster execution!
1024 MB might run in 250ms instead of 500ms
1024 MB: 1M × 0.25s × $0.0000166667 = $0.42 (same cost, but faster!)
```

**Optimization Strategy:**
1. Start with 512 MB
2. Monitor CloudWatch metrics (duration, memory used)
3. If using <256 MB consistently, decrease to 256 MB
4. If timeout issues, increase to 1024 MB

---

### 4. Timeout: 10s vs 30s vs Maximum

**Our Choices:**
- Health Check: 10 seconds
- Chat: 30 seconds (will increase to 60s with Bedrock)

| Timeout | Use Case | Risk |
|---------|----------|------|
| **3 seconds** | Simple APIs | Premature failures |
| **10 seconds** | DB queries | Good for most APIs |
| **30 seconds** | External APIs | AI services |
| **60 seconds** | Bedrock/OpenAI | Complex AI queries |
| **900 seconds** (15 min) | Batch processing | Runaway cost risk |

**Why 10s for Health Check?**
- Should respond instantly
- If taking >1s, something is very wrong
- 10s is generous safety margin

**Why 30s for Chat?**
- DynamoDB queries: 10-100ms
- Future Bedrock: 3-15 seconds
- Future OpenSearch: 100-500ms
- 30s is safe for MVP

**Timeout vs Cost:**
```
Longer timeout = Higher max cost per invocation

128 MB, 30s timeout:
Max cost per invoke: 30s × $0.0000000021 = $0.000063

If function hangs, you pay for full timeout!
1000 hanging invocations = $0.063

Good practice: Set timeout slightly above expected duration
```

---

### 5. Single IAM Role vs Per-Function Roles

**Our Choice: Single Shared Role**

| Factor | Single Role | Per-Function Roles |
|--------|------------|-------------------|
| **Security** | ⚠️ All Lambdas have same permissions | ✅ Least privilege |
| **Complexity** | ✅ Simple | ⚠️ More IAM roles to manage |
| **Best Practice** | ⚠️ Not ideal | ✅ Recommended |
| **Our Use Case** | ✅ Good for MVP | Future improvement |

**Why Single Role for MVP?**
- Both Lambdas need similar access (DynamoDB, S3, CloudWatch)
- Simpler to manage
- Easier to iterate quickly
- Can refine later

**Permissions Granted:**
```python
# CloudWatch Logs (always needed)
- logs:CreateLogGroup
- logs:CreateLogStream
- logs:PutLogEvents

# DynamoDB (both Lambdas need)
- dynamodb:GetItem
- dynamodb:PutItem
- dynamodb:Query
- dynamodb:UpdateItem

# S3 PDFs (only Chat needs, but health check doesn't hurt)
- s3:GetObject

# S3 Logs (for future log archival)
- s3:PutObject
```

**When to Split Roles?**
- Production deployment
- Compliance requirements (SOC 2, HIPAA)
- Different permission needs emerge
- Security audit recommendations

---

### 6. Environment Variables vs AWS Secrets Manager

**Our Choice: Environment Variables for Configuration**

| Factor | Environment Variables | Secrets Manager |
|--------|---------------------|-----------------|
| **Cost** | Free | $0.40/secret/month |
| **Use Case** | Non-sensitive config | API keys, passwords |
| **Rotation** | Manual (redeploy) | ✅ Automatic |
| **Access Control** | Lambda execution role | Fine-grained IAM |

**What We Store in Environment Variables:**
- `TABLE_NAME`: DynamoDB table name (not sensitive)
- `PDFS_BUCKET`: S3 bucket name (not sensitive)
- `ENVIRONMENT`: dev/staging/prod (not sensitive)

**What Goes in Secrets Manager (Future):**
- Zendesk API keys
- OAuth client secrets
- Database passwords (if we add RDS)
- Third-party API keys

**Cost Consideration:**
```
Current: 0 secrets = $0/month
Future (3 secrets): 3 × $0.40 = $1.20/month

Still cheap, but environment variables are free!
```

---

### 7. Bundling: Inline Code vs Lambda Layers

**Our Choice: Inline Code (Simple)**

| Factor | Inline Code | Lambda Layers |
|--------|------------|---------------|
| **Setup** | ✅ Simple | ⚠️ More complex |
| **Deployment Speed** | ⚠️ Slower (reupload all code) | ✅ Fast (reuse layer) |
| **Code Reuse** | ❌ Duplicate dependencies | ✅ Share across Lambdas |
| **Size Limit** | 50 MB zipped, 250 MB unzipped | 50 MB per layer, 5 layers max |

**Why Inline for MVP?**
- Currently no shared dependencies
- Simple deployment (`cdk deploy` handles it)
- Good for iteration speed

**When to Use Layers?** (Future Step 7)
- When we add LangChain (large library)
- When we have multiple Lambdas sharing code
- When deployment size becomes issue

**Example Layer Structure (Future):**
```
Layer: learning-navigator-dependencies
- boto3 (AWS SDK)
- langchain
- langchain-aws
- python-jose (JWT validation)
Total: ~30 MB

Benefits:
- Deploy layer once
- All Lambdas reference same layer
- Faster Lambda updates (only code changes)
```

---

## 💰 Cost Estimate

### Monthly Costs (100K requests/month)

| Component | Calculation | Cost |
|-----------|-------------|------|
| **Health Check** | 10K requests × 50ms × 128MB | $0.00 |
| **Chat Lambda** | 90K requests × 500ms × 512MB | $3.75 |
| **Requests** | 100K × $0.20/1M | $0.02 |
| **CloudWatch Logs** | 1 GB × $0.50 | $0.50 |
| **Total Lambda** | | **~$4.27/month** |

### At Scale (1M requests/month)

| Component | Cost |
|-----------|------|
| Chat Lambda | $37.50 |
| Requests | $0.20 |
| CloudWatch Logs | $5.00 |
| **Total** | **~$42.70/month** |

Still incredibly cheap! Compare to:
- EC2 (always-on): $180/month
- Fargate: $90/month

---

## 🚀 What's Next

**Step 6: API Gateway** (Next Step)
- Create REST API
- Add routes: `/health`, `/chat`
- Configure Cognito authorizer
- Enable CORS
- Deploy to AWS

**Step 7: Bedrock Integration** (Future)
- Add Claude 3 Sonnet
- Implement RAG with OpenSearch
- Stream responses (WebSocket)
- Add conversation memory

---

## 🧪 How to Test Locally (Future)

```bash
# Install AWS SAM CLI
brew install aws-sam-cli

# Invoke health Lambda locally
sam local invoke HealthCheckFunction

# Invoke chat Lambda with test event
sam local invoke ChatFunction -e test-events/chat-request.json

# Start local API Gateway
sam local start-api
curl http://localhost:3000/health
```

---

## 📊 Summary

✅ **Created**: 2 Lambda functions (health check, chat)
✅ **Configured**: Python 3.11 runtime, appropriate memory/timeout
✅ **Permissions**: IAM role with DynamoDB, S3, CloudWatch access
✅ **Environment**: Variables for table name, bucket names
✅ **Cost**: ~$4/month for 100K requests
✅ **Next Step**: Add API Gateway to expose Lambda endpoints
✅ **Interview Ready**: Understanding of Lambda trade-offs

**Ready for Step 6: API Gateway!** 🚀
