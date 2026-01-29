# MHFA Learning Navigator - AWS Cost Estimation

**Last Updated:** January 2025
**Region:** US-West-2 (Oregon)
**Currency:** USD

---

## Executive Summary

| Usage Tier | Monthly Conversations | Estimated Monthly Cost | Cost per Conversation |
|------------|----------------------|------------------------|----------------------|
| **Low** | 1,000 | $25 - $40 | $0.025 - $0.040 |
| **Medium** | 10,000 | $138 - $208 | $0.014 - $0.021 |
| **High** | 50,000 | $648 - $948 | $0.013 - $0.019 |
| **Enterprise** | 100,000+ | $1,198 - $1,698 | $0.012 - $0.017 |

> **Note:** Costs assume average conversation length of 3-4 message exchanges with knowledge base retrieval. Higher estimates include peak traffic buffers, verbose logging, and development/testing overhead. With optimization, medium-tier costs can drop to $113-133/month.

---

## Detailed Cost Breakdown by Service

### 1. Amazon Bedrock (Primary Cost Driver)

#### Claude 4 Sonnet (Chat Responses)
**Pricing:**
- Input tokens: $3.00 per million tokens
- Output tokens: $15.00 per million tokens

**Usage Estimates per Conversation:**
- Average input: 500 tokens (user query + role context + KB context)
- Average output: 300 tokens (AI response)

**Monthly Costs:**

| Usage Tier | Conversations | Input Tokens | Output Tokens | Monthly Cost |
|------------|--------------|--------------|---------------|--------------|
| Low | 1,000 | 0.5M (500K) | 0.3M (300K) | $6.00 |
| Medium | 10,000 | 5M | 3M | $60.00 |
| High | 50,000 | 25M | 15M | $300.00 |
| Enterprise | 100,000 | 50M | 30M | $600.00 |

#### Titan Embeddings Text v2 (Knowledge Base)
**Pricing:** $0.02 per 1,000 input tokens

**One-Time Setup Cost:**
- 100 documents × 5,000 tokens each = 500,000 tokens
- Setup cost: $10 (one-time)

**Ongoing Costs (Document Updates):**
- ~20 document updates per month
- Monthly cost: ~$2

**Bedrock Total:**

| Usage Tier | Monthly Cost |
|------------|--------------|
| Low | $18 |
| Medium | $62 |
| High | $312 |
| Enterprise | $624 |

> **Note:** Amazon Nova Lite for AI sentiment analysis has been removed. The system now uses manual user feedback (thumbs up/down) for sentiment tracking, providing more accurate satisfaction data at zero AI cost.

---

### 2. AWS Lambda

**Pricing:**
- $0.20 per million requests
- $0.0000166667 per GB-second of compute

**Lambda Functions:**
- `chatResponseHandler` (512 MB, ~3s per invocation)
- `websocketHandler` (256 MB, ~0.5s per invocation)
- `logclassifier` (512 MB, ~2s per invocation)
- `email` (256 MB, ~1s per invocation)
- `adminFile` (512 MB, ~2s per invocation)
- `userProfile` (256 MB, ~0.5s per invocation)

**Per Conversation:**
- Chat: 2 Lambda invocations (WebSocket handler + Chat handler)
- Background: 1 Lambda invocation (Log classifier)
- Total: 3 invocations

**Monthly Costs:**

| Usage Tier | Invocations | Request Cost | Compute Cost | Total |
|------------|-------------|--------------|--------------|-------|
| Low | 3,000 | $0.60 | $2.00 | $2.60 |
| Medium | 30,000 | $6.00 | $20.00 | $26.00 |
| High | 150,000 | $30.00 | $100.00 | $130.00 |
| Enterprise | 300,000 | $60.00 | $200.00 | $260.00 |

---

### 3. Amazon API Gateway

#### WebSocket API
**Pricing:**
- $1.00 per million messages (first 1B messages)
- $0.25 per million connection minutes

**Per Conversation:**
- 1 connection (~3 minutes average)
- 6-8 messages (connect, user messages, bot chunks, disconnect)

**Monthly Costs:**

| Usage Tier | Conversations | Messages | Connection Minutes | Total |
|------------|--------------|----------|-------------------|-------|
| Low | 1,000 | 8,000 | 3,000 | $0.76 |
| Medium | 10,000 | 80,000 | 30,000 | $7.58 |
| High | 50,000 | 400,000 | 150,000 | $37.90 |
| Enterprise | 100,000 | 800,000 | 300,000 | $75.80 |

#### REST API (Admin Portal)
**Pricing:** $3.50 per million API calls

**Estimated Usage:**
- ~1,000 admin API calls per month (analytics, document management)

**Monthly Cost:** ~$0.04 (negligible)

---

### 4. Amazon DynamoDB

**Tables:**
- Session Logs Table (stores all conversations)
- Escalated Queries Table (stores low-confidence queries)
- Feedback Table (user feedback)

**Pricing:**
- On-Demand: $1.25 per million write requests, $0.25 per million read requests
- Storage: $0.25 per GB-month

**Monthly Costs:**

| Usage Tier | Write Requests | Read Requests | Storage (GB) | Total |
|------------|---------------|---------------|--------------|-------|
| Low | 3,000 | 10,000 | 0.5 | $0.13 |
| Medium | 30,000 | 100,000 | 5 | $1.29 |
| High | 150,000 | 500,000 | 25 | $6.44 |
| Enterprise | 300,000 | 1,000,000 | 50 | $12.88 |

---

### 5. Amazon S3

**Buckets:**
- Knowledge Base Documents (PDFs, docs)
- Supplemental Data Storage
- Email Attachments
- CloudWatch Logs Archive

**Pricing:**
- Storage: $0.023 per GB-month (Standard)
- GET requests: $0.0004 per 1,000 requests

**Monthly Costs:**

| Storage Size | Monthly Cost |
|--------------|--------------|
| 10 GB | $0.23 |
| 50 GB | $1.15 |
| 100 GB | $2.30 |
| 500 GB | $11.50 |

**Typical Usage:** 50-100 GB → **$1-2/month**

---

### 6. AWS Amplify

**Pricing:**
- Build minutes: $0.01 per build minute
- Hosting: $0.15 per GB served
- Storage: $0.023 per GB stored

**Typical React App:**
- Build time: ~5 minutes per deployment
- Deployments per month: ~10-20
- App size: 50 MB
- Data transfer: ~10 GB per month

**Monthly Costs:**

| Component | Cost |
|-----------|------|
| Builds (15 builds × 5 min) | $0.75 |
| Storage (50 MB) | $0.00 |
| Data Transfer (10 GB) | $1.50 |
| **Total** | **$2.25** |

---

### 7. Amazon SES (Email Notifications)

**Pricing:**
- First 1,000 emails per month: Free (from EC2/Lambda)
- $0.10 per 1,000 emails thereafter

**Usage:**
- Email escalations: ~5-10% of conversations
- Admin notifications

**Monthly Costs:**

| Usage Tier | Escalation Emails | Cost |
|------------|------------------|------|
| Low | 50-100 | $0.00 |
| Medium | 500-1,000 | $0.00 |
| High | 2,500-5,000 | $0.40 |
| Enterprise | 5,000-10,000 | $0.90 |

---

### 8. Amazon Cognito

**Pricing:**
- MAUs (Monthly Active Users): First 50,000 free
- $0.0055 per MAU thereafter

**Admin Users:** 5-20 users

**Monthly Cost:** **$0.00** (within free tier)

---

### 9. CloudWatch Logs

**Pricing:**
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB-month
- Insights queries: $0.005 per GB scanned

**Monthly Costs:**

| Usage Tier | Log Volume | Ingestion | Storage | Total |
|------------|------------|-----------|---------|-------|
| Low | 5 GB | $2.50 | $0.15 | $2.65 |
| Medium | 50 GB | $25.00 | $1.50 | $26.50 |
| High | 250 GB | $125.00 | $7.50 | $132.50 |
| Enterprise | 500 GB | $250.00 | $15.00 | $265.00 |

> **Note:** Medium-tier estimate (50 GB) assumes verbose logging including full prompts, responses, and streaming chunks (~5 MB per conversation). Optimized production setups with minimal logging (errors + metrics only) typically use 10-20 GB (~1-2 MB per conversation), reducing CloudWatch costs to $5-10/month.

## Total Monthly Cost Summary

| Usage Tier | Conversations | Total Monthly Cost | Cost per Conversation |
|------------|--------------|--------------------|-----------------------|
| **Low** (1K) | 1,000 | **$25 - $40** | **$0.025 - $0.040** |
| **Medium** (10K) | 10,000 | **$138 - $208** | **$0.014 - $0.021** |
| **High** (50K) | 50,000 | **$648 - $948** | **$0.013 - $0.019** |
| **Enterprise** (100K+) | 100,000+ | **$1,198 - $1,698** | **$0.012 - $0.017** |

### Cost Breakdown by Service (Medium Tier Example - 10K conversations)

| Service | Monthly Cost | % of Total |
|---------|--------------|-----------|
| Amazon Bedrock (Claude, Titan) | $62 | 49% |
| AWS Lambda | $26 | 21% |
| CloudWatch Logs | $26 | 21% |
| Amazon API Gateway | $7.58 | 6% |
| AWS Amplify | $2.25 | 2% |
| Amazon DynamoDB | $1.29 | 1% |
| Amazon S3 | $1.15 | 1% |
| Amazon SES | $0.00 | 0% |
| Amazon Cognito | $0.00 | 0% |
| **Subtotal (Base Services)** | **~$126** | **~100%** |

---