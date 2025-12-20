# Learning Navigator - Detailed AWS Architecture

## Overview

This document provides the complete AWS architecture for the Learning Navigator chatbot, including all services, configurations, and interconnections.

**Region**: `us-west-2` (US West - Oregon)
**Deployment Model**: Serverless, multi-tier architecture
**Cost**: ~$400-500/month operational

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS & CLIENT LAYER                               │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Instructor  │  │    Staff     │  │   Learner    │  │    Admin     │   │
│  │   Browser    │  │   Browser    │  │   Browser    │  │  Dashboard   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │                  │           │
│         └──────────────────┴──────────────────┴──────────────────┘           │
│                                    │                                         │
│                                    │ HTTPS                                   │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CDN & SECURITY LAYER                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon CloudFront (CDN)                                            │   │
│  │  - Global edge locations                                            │   │
│  │  - SSL/TLS termination                                              │   │
│  │  - Static asset caching (React app)                                 │   │
│  │  - DDoS protection (AWS Shield Standard)                            │   │
│  └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AWS WAF (Web Application Firewall)                                 │   │
│  │  - Rate limiting (100 req/min per IP)                               │   │
│  │  - SQL injection protection                                         │   │
│  │  - XSS protection                                                    │   │
│  │  - AWS Managed Rules (Core Rule Set)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
                ▼                    ▼                    ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
      │   S3 Bucket  │    │  API Gateway │    │  API Gateway │
      │   (Static    │    │  (REST API)  │    │ (WebSocket)  │
      │   Website)   │    │              │    │              │
      └──────────────┘    └──────┬───────┘    └──────┬───────┘
                                 │                    │
                                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION & AUTHORIZATION                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon Cognito User Pool                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │   User       │  │    User      │  │   User       │             │   │
│  │  │   Groups:    │  │   Attributes:│  │   Policies   │             │   │
│  │  │              │  │              │  │              │             │   │
│  │  │ • instructors│  │ • email      │  │ • Password   │             │   │
│  │  │ • staff      │  │ • name       │  │   policy     │             │   │
│  │  │ • learners   │  │ • role       │  │ • MFA        │             │   │
│  │  │ • admins     │  │ • language   │  │   (optional) │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │                                                                     │   │
│  │  ➜ JWT Tokens (ID, Access, Refresh)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPUTE LAYER (Lambda)                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda Function Group: Chat Services                               │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │  │  sendMessage     │  │  getHistory      │  │  createSession   │ │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │  │  Runtime: Node20 │ │   │
│  │  │  Memory: 1024MB  │  │  Memory: 512MB   │  │  Memory: 512MB   │ │   │
│  │  │  Timeout: 30s    │  │  Timeout: 10s    │  │  Timeout: 10s    │ │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                        │   │
│  │  │  streamResponse  │  │  endSession      │                        │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │                        │   │
│  │  │  Memory: 1024MB  │  │  Memory: 512MB   │                        │   │
│  │  │  Timeout: 30s    │  │  Timeout: 10s    │                        │   │
│  │  └──────────────────┘  └──────────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda Function Group: AI Services (LangChain)                     │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │  │  generateResponse│  │  searchKnowledge │  │  detectIntent    │ │   │
│  │  │  (RAG Chain)     │  │  (Vector Store)  │  │  (Comprehend)    │ │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │  │  Runtime: Node20 │ │   │
│  │  │  Memory: 2048MB  │  │  Memory: 1024MB  │  │  Memory: 512MB   │ │   │
│  │  │  Timeout: 60s    │  │  Timeout: 30s    │  │  Timeout: 10s    │ │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                        │   │
│  │  │  agentExecutor   │  │  analyzeSentiment│                        │   │
│  │  │  (With Tools)    │  │  (Comprehend)    │                        │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │                        │   │
│  │  │  Memory: 2048MB  │  │  Memory: 512MB   │                        │   │
│  │  │  Timeout: 90s    │  │  Timeout: 10s    │                        │   │
│  │  └──────────────────┘  └──────────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda Function Group: Document Processing                         │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                        │   │
│  │  │  processDocument │  │  updateIndex     │                        │   │
│  │  │  (S3 Trigger)    │  │  (Embeddings)    │                        │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │                        │   │
│  │  │  Memory: 2048MB  │  │  Memory: 1024MB  │                        │   │
│  │  │  Timeout: 300s   │  │  Timeout: 60s    │                        │   │
│  │  └──────────────────┘  └──────────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda Function Group: Integration Services                        │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │  │  createZendesk   │  │  getLMSCourses   │  │  translateText   │ │   │
│  │  │  Ticket          │  │                  │  │  (Amazon         │ │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │  │  Translate)      │ │   │
│  │  │  Memory: 512MB   │  │  Memory: 512MB   │  │  Runtime: Node20 │ │   │
│  │  │  Timeout: 30s    │  │  Timeout: 30s    │  │  Memory: 512MB   │ │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Lambda Function Group: Admin & Analytics                           │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │  │  getAnalytics    │  │  getConversations│  │  exportData      │ │   │
│  │  │  Runtime: Node20 │  │  Runtime: Node20 │  │  Runtime: Node20 │ │   │
│  │  │  Memory: 512MB   │  │  Memory: 512MB   │  │  Memory: 1024MB  │ │   │
│  │  │  Timeout: 30s    │  │  Timeout: 30s    │  │  Timeout: 60s    │ │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────┬─────────────────────────────┘
                             │                   │
              ┌──────────────┼───────────────────┼──────────────┐
              │              │                   │              │
              ▼              ▼                   ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI/ML SERVICES LAYER                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon Bedrock                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Model: Claude 3 Sonnet (anthropic.claude-3-sonnet-v1:0)  │     │   │
│  │  │  Region: us-west-2                                         │     │   │
│  │  │  Features:                                                 │     │   │
│  │  │  • Streaming responses                                     │     │   │
│  │  │  • Prompt caching (cost optimization)                      │     │   │
│  │  │  • Tool calling support                                    │     │   │
│  │  │  • 200K token context window                              │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Embeddings: Titan Embed Text v1                          │     │   │
│  │  │  • 1536 dimensions                                         │     │   │
│  │  │  • Used for document chunking and retrieval               │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon OpenSearch Service (Vector Database)                        │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Configuration:                                            │     │   │
│  │  │  • Instance: t3.small.search (2 nodes)                    │     │   │
│  │  │  • Storage: 20 GB EBS per node                            │     │   │
│  │  │  • k-NN enabled for vector search                         │     │   │
│  │  │  • Index: knowledge-base                                  │     │   │
│  │  │                                                            │     │   │
│  │  │  Data:                                                     │     │   │
│  │  │  • ~1000 document chunks                                  │     │   │
│  │  │  • Hybrid search (keyword + semantic)                     │     │   │
│  │  │  • Role-based filtering                                   │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon Comprehend                                                   │   │
│  │  • Sentiment analysis (positive/neutral/negative)                    │   │
│  │  • Language detection (en/es)                                        │   │
│  │  • Entity recognition (optional)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon Translate                                                    │   │
│  │  • English ↔ Spanish translation                                     │   │
│  │  • Real-time translation for queries and responses                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon Textract (Document Processing)                              │   │
│  │  • Extract text from PDFs                                            │   │
│  │  • OCR for scanned documents                                         │   │
│  │  • Table and form extraction                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon DynamoDB (Primary Database)                                 │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Table: learning-navigator (Single Table Design)          │     │   │
│  │  │                                                            │     │   │
│  │  │  Partition Key: PK                                        │     │   │
│  │  │  Sort Key: SK                                             │     │   │
│  │  │                                                            │     │   │
│  │  │  Access Patterns:                                         │     │   │
│  │  │  • USER#<userId> / PROFILE                               │     │   │
│  │  │  • USER#<userId> / CONV#<convId>                         │     │   │
│  │  │  • CONV#<convId> / MSG#<timestamp>                       │     │   │
│  │  │  • MSG#<msgId> / FEEDBACK                                │     │   │
│  │  │                                                            │     │   │
│  │  │  GSI1: GSI1PK-GSI1SK-index                               │     │   │
│  │  │  • For date-based queries (analytics)                    │     │   │
│  │  │                                                            │     │   │
│  │  │  Features:                                                │     │   │
│  │  │  • On-demand capacity mode                               │     │   │
│  │  │  • Point-in-time recovery (35 days)                      │     │   │
│  │  │  • Encryption at rest (KMS)                              │     │   │
│  │  │  • TTL enabled for temporary data                        │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon S3 Buckets                                                   │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Bucket: national-council-s3-pdfs (us-west-2)            │     │   │
│  │  │  • Knowledge base source documents (3 PDFs, 7.1 MiB)     │     │   │
│  │  │  • S3 Event Notifications → Lambda (processDocument)     │     │   │
│  │  │  • Versioning: Enabled (recommended)                     │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Bucket: learning-navigator-frontend                      │     │   │
│  │  │  • React build artifacts                                  │     │   │
│  │  │  • Static hosting enabled                                 │     │   │
│  │  │  • CloudFront distribution                                │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Bucket: learning-navigator-logs                          │     │   │
│  │  │  • CloudWatch log archives                                │     │   │
│  │  │  • Conversation transcripts (long-term storage)           │     │   │
│  │  │  • Lifecycle policy: Archive to Glacier after 90 days    │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MONITORING & OBSERVABILITY LAYER                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Amazon CloudWatch                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Logs:                                                     │     │   │
│  │  │  • /aws/lambda/learning-navigator-*                       │     │   │
│  │  │  • /aws/apigateway/learning-navigator                     │     │   │
│  │  │  • Retention: 30 days                                     │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Metrics:                                                  │     │   │
│  │  │  • Lambda invocations, errors, duration                   │     │   │
│  │  │  • API Gateway requests, 4XX, 5XX errors                  │     │   │
│  │  │  • DynamoDB read/write capacity                           │     │   │
│  │  │  • Bedrock token usage and costs                          │     │   │
│  │  │  • Custom metrics (conversation quality, etc.)            │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Alarms:                                                   │     │   │
│  │  │  • High error rate (> 5%)                                 │     │   │
│  │  │  • High latency (p95 > 3s)                                │     │   │
│  │  │  • Lambda throttling                                       │     │   │
│  │  │  • Budget exceeded                                         │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  Dashboards:                                               │     │   │
│  │  │  • System health overview                                  │     │   │
│  │  │  • AI performance metrics                                  │     │   │
│  │  │  • Cost tracking                                           │     │   │
│  │  │  • User engagement                                         │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AWS X-Ray                                                           │   │
│  │  • Distributed tracing                                               │   │
│  │  • Service map visualization                                         │   │
│  │  • Performance analysis                                              │   │
│  │  • Bottleneck identification                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY & SECRETS LAYER                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AWS KMS (Key Management Service)                                    │   │
│  │  • Customer managed keys for encryption                              │   │
│  │  • Automatic key rotation                                            │   │
│  │  • Used for: DynamoDB, S3, Secrets Manager                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AWS Secrets Manager                                                 │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  learning-navigator/zendesk                               │     │   │
│  │  │  • subdomain, email, apiToken                             │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │  learning-navigator/lms                                   │     │   │
│  │  │  • apiKey, endpoint                                        │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  IAM Roles & Policies                                                │   │
│  │  • Lambda execution roles (least privilege)                          │   │
│  │  • Service-to-service authentication                                 │   │
│  │  • Fine-grained access control                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                                   │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐                    │
│  │  Zendesk API          │  │  LMS API (Customer's)  │                    │
│  │  • Support tickets     │  │  • Course information  │                    │
│  │  • Auto-escalation     │  │  • Enrollment data     │                    │
│  └────────────────────────┘  └────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service-by-Service Details

### 1. Frontend Hosting

**Services**: S3 + CloudFront

**S3 Bucket Configuration**:
```json
{
  "bucketName": "learning-navigator-frontend",
  "region": "us-west-2",
  "websiteConfiguration": {
    "indexDocument": "index.html",
    "errorDocument": "index.html"
  },
  "publicReadAccess": false,
  "versioning": true,
  "encryption": "AES256"
}
```

**CloudFront Distribution**:
```json
{
  "origins": [{
    "domainName": "learning-navigator-frontend.s3.us-west-2.amazonaws.com",
    "s3OriginConfig": {
      "originAccessIdentity": "OAI-configured"
    }
  }],
  "defaultCacheBehavior": {
    "viewerProtocolPolicy": "redirect-to-https",
    "allowedMethods": ["GET", "HEAD", "OPTIONS"],
    "cachedMethods": ["GET", "HEAD"],
    "compress": true,
    "defaultTTL": 86400
  },
  "priceClass": "PriceClass_100",
  "viewerCertificate": {
    "acmCertificateArn": "<SSL_CERT_ARN>",
    "sslSupportMethod": "sni-only"
  }
}
```

---

### 2. API Gateway (REST)

**Configuration**:
```yaml
restApiName: learning-navigator-api
endpointType: REGIONAL
region: us-west-2

authorizers:
  - name: CognitoAuthorizer
    type: COGNITO_USER_POOLS
    userPoolArn: <COGNITO_USER_POOL_ARN>

routes:
  /chat:
    POST:
      authorizer: CognitoAuthorizer
      integration: Lambda (sendMessage)
      requestValidation: true

    GET:
      authorizer: CognitoAuthorizer
      integration: Lambda (getHistory)

  /session:
    POST:
      authorizer: CognitoAuthorizer
      integration: Lambda (createSession)

    DELETE:
      authorizer: CognitoAuthorizer
      integration: Lambda (endSession)

  /admin/analytics:
    GET:
      authorizer: CognitoAuthorizer
      integration: Lambda (getAnalytics)
      requiredGroup: admins

throttling:
  rateLimit: 100  # requests per second
  burstLimit: 200

cors:
  allowOrigins: ["https://yourDomain.com"]
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  allowHeaders: ["Content-Type", "Authorization"]
```

---

### 3. API Gateway (WebSocket)

**Configuration**:
```yaml
webSocketApiName: learning-navigator-ws
region: us-west-2

routes:
  $connect:
    integration: Lambda (onConnect)
    authorization: Custom (JWT in query string)

  $disconnect:
    integration: Lambda (onDisconnect)

  $default:
    integration: Lambda (streamResponse)

stage:
  name: prod
  throttling:
    rateLimit: 100
    burstLimit: 200
```

---

### 4. Lambda Functions Summary

| Function | Purpose | Memory | Timeout | Concurrency |
|----------|---------|--------|---------|-------------|
| sendMessage | Process user messages | 1024MB | 30s | 10 reserved |
| streamResponse | Stream AI responses via WS | 1024MB | 30s | 10 reserved |
| generateResponse | LangChain RAG chain | 2048MB | 60s | 5 reserved |
| agentExecutor | Agent with tools | 2048MB | 90s | 5 reserved |
| processDocument | S3 trigger, process PDFs | 2048MB | 300s | 2 |
| createZendeskTicket | Escalation | 512MB | 30s | Unreserved |
| getAnalytics | Admin dashboard | 512MB | 30s | Unreserved |

**Shared Lambda Layer**:
```
learning-navigator-shared-layer
├── nodejs/
│   ├── node_modules/
│   │   ├── langchain/
│   │   ├── @langchain/aws/
│   │   ├── @aws-sdk/client-dynamodb/
│   │   ├── @aws-sdk/client-s3/
│   │   └── @opensearch-project/opensearch/
│   └── utils/
│       ├── db.ts
│       ├── auth.ts
│       └── logger.ts
```

---

### 5. Amazon Bedrock Configuration

**Model**: `anthropic.claude-3-sonnet-20240229-v1:0`
**Region**: `us-west-2`

**Request Configuration**:
```typescript
{
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  temperature: 0.7,
  top_p: 0.9,
  system: "<role-based-prompt>",
  messages: [
    { role: "user", content: "<user-query>" }
  ],
  // Cost optimization
  prompt_caching: {
    system: { type: "ephemeral" }  // Cache system prompts
  }
}
```

**Monthly Usage Estimate**:
- Input tokens: ~5M tokens/month
- Output tokens: ~2M tokens/month
- Cost: ~$45/month (with caching)

---

### 6. OpenSearch Configuration

**Cluster**:
```yaml
domainName: learning-navigator-kb
region: us-west-2
version: OpenSearch_2.11

clusterConfig:
  instanceType: t3.small.search
  instanceCount: 2
  dedicatedMasterEnabled: false
  zoneAwarenessEnabled: true

ebsOptions:
  ebsEnabled: true
  volumeType: gp3
  volumeSize: 20  # GB per node

encryptionAtRestOptions:
  enabled: true
  kmsKeyId: <KMS_KEY_ID>

nodeToNodeEncryptionOptions:
  enabled: true

accessPolicies:
  - Effect: Allow
    Principal: { AWS: <LAMBDA_EXECUTION_ROLE_ARN> }
    Action: "es:*"
    Resource: "*"
```

**Index Mapping**:
```json
{
  "knowledge-base": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.knn": true,
      "index.knn.algo_param.ef_search": 512
    },
    "mappings": {
      "properties": {
        "documentId": { "type": "keyword" },
        "text": { "type": "text", "analyzer": "standard" },
        "embedding": {
          "type": "knn_vector",
          "dimension": 1536,
          "method": {
            "name": "hnsw",
            "space_type": "l2",
            "engine": "nmslib"
          }
        },
        "source": { "type": "keyword" },
        "role": { "type": "keyword" },
        "language": { "type": "keyword" },
        "category": { "type": "keyword" }
      }
    }
  }
}
```

---

### 7. DynamoDB Table Design

**Table Name**: `learning-navigator`
**Capacity Mode**: On-Demand
**Region**: `us-west-2`

**Keys**:
- Partition Key: `PK` (String)
- Sort Key: `SK` (String)

**GSI**:
- `GSI1PK-GSI1SK-index` (for date-based queries)

**Features**:
- Point-in-time recovery: Enabled
- Encryption: AWS managed KMS
- TTL attribute: `expiresAt` (for temporary data)
- Streams: Disabled (not needed for MVP)

---

### 8. Cognito User Pool

**Configuration**:
```yaml
userPoolName: learning-navigator-users
region: us-west-2

signInAliases:
  email: true
  username: false

passwordPolicy:
  minimumLength: 12
  requireLowercase: true
  requireUppercase: true
  requireNumbers: true
  requireSymbols: true

mfaConfiguration: OPTIONAL

autoVerifiedAttributes:
  - email

userAttributes:
  - email (required)
  - given_name (required)
  - family_name (required)
  - custom:role (mutable)
  - custom:language (mutable)

userGroups:
  - name: instructors
    description: MHFA Instructors
  - name: staff
    description: Internal Staff
  - name: learners
    description: MHFA Learners
  - name: admins
    description: System Administrators
```

---

## Network & Security

### VPC Configuration

**Not required for MVP** - All services are serverless and managed:
- Lambda: No VPC needed (public subnet access)
- OpenSearch: In AWS managed network
- DynamoDB: AWS managed

**Future consideration**: If integrating with on-premise LMS, use VPC:
- Private subnets for Lambda
- NAT Gateway for outbound
- VPC Endpoints for AWS services

---

### Security Groups

**OpenSearch Domain**:
```yaml
securityGroupName: opensearch-sg
rules:
  ingress:
    - protocol: tcp
      port: 443
      source: <LAMBDA_SECURITY_GROUP>
  egress:
    - protocol: tcp
      port: 443
      destination: 0.0.0.0/0
```

---

### IAM Roles

**Lambda Execution Role** (learning-navigator-lambda-role):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-west-2:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-west-2:*:table/learning-navigator"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-west-2::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpGet"
      ],
      "Resource": "arn:aws:es:us-west-2:*:domain/learning-navigator/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::national-council-s3-pdfs/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-west-2:*:secret:learning-navigator/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "comprehend:DetectSentiment",
        "comprehend:DetectDominantLanguage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "translate:TranslateText"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Data Flow Diagrams

### User Message Flow
```
User types message in React app
  ↓
WebSocket send via API Gateway
  ↓
Lambda: streamResponse
  ↓
├─→ Get conversation history (DynamoDB)
├─→ Detect language (Comprehend)
├─→ LangChain: agentExecutor.invoke()
│     ├─→ Search knowledge base (OpenSearch)
│     ├─→ Generate response (Bedrock Claude)
│     └─→ Check if escalation needed
│           ├─ Yes → Create Zendesk ticket
│           └─ No → Continue
│
├─→ Stream response tokens to user (WebSocket)
├─→ Analyze sentiment (Comprehend)
├─→ Save message to DynamoDB
└─→ Return complete response
```

---

## Cost Breakdown (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Lambda | 1M invocations, 1GB, 10s avg | $20 |
| API Gateway | REST + WebSocket, 100K requests | $35 |
| Bedrock (Claude) | 5M input + 2M output tokens | $45 |
| OpenSearch | 2x t3.small.search, 40GB storage | $100 |
| DynamoDB | On-demand, 5GB storage | $25 |
| S3 | 50GB storage, 100GB transfer | $10 |
| CloudFront | 100GB data transfer | $15 |
| Cognito | < 50K MAUs | $0 (free tier) |
| Comprehend | 100K characters | $2 |
| Translate | 500K characters | $8 |
| CloudWatch | Logs, metrics, dashboards | $20 |
| Textract | 1K pages (one-time) | $1.50 |
| KMS | 1 key, 10K requests | $2 |
| Secrets Manager | 2 secrets | $1 |
| **TOTAL** | | **~$284/month** |

**With buffer for growth**: **$400-500/month**

---

## Deployment Regions

**Primary Region**: `us-west-2` (US West - Oregon)

**Rationale**:
- ✅ S3 bucket is in us-west-2
- ✅ All required services available
- ✅ Good latency for US users
- ✅ Cost-effective

**Future**: Multi-region for disaster recovery (us-east-1)

---

## Scalability & Performance

### Auto-Scaling Configuration

**Lambda**:
- Concurrent executions: 100 (initial), can scale to 1000+
- Provisioned concurrency: 10 for critical functions (sendMessage, generateResponse)

**DynamoDB**:
- On-demand: Auto-scales read/write capacity
- No capacity planning needed

**OpenSearch**:
- Can scale vertically (larger instances) or horizontally (more nodes)
- Current: 2 nodes sufficient for 1000 documents

### Performance Targets

| Metric | Target | Current Estimate |
|--------|--------|------------------|
| API response time (p95) | < 200ms | ~150ms |
| Chat response time (p95) | < 3s | ~2s |
| WebSocket latency | < 100ms | ~50ms |
| Throughput | 100 req/sec | Supported |

---

## Next Steps

1. **Review architecture** with team and stakeholders
2. **Set up AWS accounts** (dev, staging, prod)
3. **Initialize AWS CDK project**
4. **Deploy Phase 1**: Basic infrastructure (DynamoDB, S3, Cognito)
5. **Deploy Phase 2**: Lambda + API Gateway
6. **Deploy Phase 3**: AI services (Bedrock, OpenSearch)
7. **Test end-to-end** flow

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Architecture Design - Ready for Implementation
