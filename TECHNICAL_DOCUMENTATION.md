# Learning Navigator - Technical Documentation

> **Quick Reference**: AI-powered chatbot using AWS Bedrock Claude 4 Sonnet for the MHFA Learning Ecosystem

---

## 1. AWS Services Overview

### Core AI Services
| Service | Purpose | Usage |
|---------|---------|-------|
| **AWS Bedrock Agent** | AI conversation engine | Orchestrates chatbot responses using Claude 4 Sonnet with guardrails |
| **Bedrock Knowledge Base** | Document search & RAG | Stores and queries training materials, PDFs, and FAQs |
| **OpenSearch Serverless** | Vector database | Powers semantic search for Knowledge Base (auto-created) |

### Compute & APIs
| Service | Purpose | Usage |
|---------|---------|-------|
| **Lambda Functions (12)** | Serverless compute | Handles chat, email, file management, and analytics |
| **API Gateway (REST)** | HTTP API | Admin dashboard, file management, user profiles |
| **API Gateway (WebSocket)** | Real-time chat | Bidirectional communication for instant responses |

### Storage & Database
| Service | Purpose | Usage |
|---------|---------|-------|
| **S3 Buckets (4)** | Object storage | Knowledge base documents, emails, logs, supplemental data |
| **DynamoDB Tables (3)** | NoSQL database | Session logs, escalated queries, user profiles |

### Authentication & Email
| Service | Purpose | Usage |
|---------|---------|-------|
| **Cognito User Pool** | User authentication | Admin portal login with MFA support |
| **Cognito Identity Pool** | Temporary credentials | Secure S3 access for authenticated users |
| **SES (Simple Email Service)** | Email notifications | Admin alerts for escalated queries |

### Frontend & CI/CD
| Service | Purpose | Usage |
|---------|---------|-------|
| **Amplify** | Static hosting | React frontend with automatic deployments |
| **CodeBuild** | CI/CD pipeline | Automated build and deployment from GitHub |
| **CloudWatch** | Logging & monitoring | Centralized logs and metrics for all services |
| **EventBridge** | Scheduled tasks | Daily export of session logs at 11:59 PM UTC |

---

## 2. System Architecture & Data Flow

### High-Level Architecture
```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Amplify (React Frontend)           │
│  • Chat Interface                   │
│  • Admin Dashboard                  │
└───────┬─────────────────────────────┘
        │
        ├──────────────┬───────────────┐
        ▼              ▼               ▼
   WebSocket API   REST API      Cognito
   (Real-time)     (Admin)       (Auth)
        │              │               │
        ▼              ▼               │
   Lambda         Lambda              │
   Functions      Functions           │
        │              │               │
        └──────┬───────┴───────────────┘
               ▼
        ┌─────────────────┐
        │  Bedrock Agent  │
        │  (Claude 4)     │
        └────────┬────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
   Knowledge Base    Email Lambda
   (RAG Search)      (SES Alerts)
        │
        ▼
   S3 Documents
   DynamoDB Logs
```

### Detailed Data Flow

#### **Workflow 1: User Chat Query**
```
1. User types message in React app
   ↓
2. WebSocket API Gateway receives message
   ↓
3. Lambda (websocketHandler) validates and forwards
   ↓
4. Lambda (chatResponseHandler) invokes Bedrock Agent
   ↓
5. Bedrock Agent:
   • Applies guardrails (content filtering)
   • Queries Knowledge Base (semantic search)
   • OpenSearch finds relevant documents
   • Generates response using Claude 4 Sonnet
   ↓
6. Response streams back through WebSocket
   ↓
7. Lambda logs session to DynamoDB
   ↓
8. User sees real-time response in chat
```

#### **Workflow 2: Knowledge Base Document Upload**
```
1. Admin uploads PDF via Admin Dashboard
   ↓
2. REST API Gateway → Lambda (adminFile)
   ↓
3. File saved to S3 bucket (national-council)
   ↓
4. S3 event trigger → Lambda (kb-sync)
   ↓
5. Lambda starts Bedrock ingestion job
   ↓
6. Knowledge Base:
   • Extracts text from PDF
   • Creates embeddings (Titan v2)
   • Stores in OpenSearch Serverless
   ↓
7. Document immediately available for chat queries
```

#### **Workflow 3: Query Escalation to Admin**
```
1. Agent determines low confidence (<90%) on query
   ↓
2. Agent asks user for email address
   ↓
3. Agent action group triggers Lambda (email/NotifyAdminFn)
   ↓
4. Lambda:
   • Saves to DynamoDB (EscalatedQueries)
   • Sends email via SES to admin
   ↓
5. Admin receives notification with query details
   ↓
6. Admin can respond via Admin Dashboard
```

#### **Workflow 4: Daily Analytics Export**
```
1. EventBridge cron rule triggers (11:59 PM UTC)
   ↓
2. Lambda (sessionLogs) queries CloudWatch Logs
   ↓
3. Aggregates all chat sessions from past 24 hours
   ↓
4. Exports JSON to S3 (DashboardLogsBucket)
   ↓
5. Saves summary to DynamoDB (SessionLogsTable)
   ↓
6. Admin views analytics in dashboard via REST API
```

---

## 3. Service Connections & Integration

### Connection Matrix

| From | To | Method | Purpose |
|------|-----|--------|---------|
| Frontend | WebSocket API | WSS connection | Real-time chat messages |
| Frontend | REST API | HTTPS + JWT | Admin operations |
| Frontend | Cognito | HTTPS | User authentication |
| Lambda | Bedrock Agent | AWS SDK | Invoke chat agent |
| Bedrock Agent | Knowledge Base | Internal | Query documents |
| Knowledge Base | S3 | Internal | Read PDFs/documents |
| Knowledge Base | OpenSearch | Internal | Vector search |
| Lambda | DynamoDB | AWS SDK | Store/retrieve data |
| Lambda | SES | AWS SDK | Send email notifications |
| S3 | Lambda (kb-sync) | Event notification | Auto-sync on upload |
| EventBridge | Lambda | Scheduled event | Daily log export |

### Security & Permissions

**IAM Roles & Policies:**
- **Bedrock Agent Role**: S3 read (documents), Bedrock invoke, CloudWatch logs
- **Lambda Roles**: DynamoDB read/write, S3 access, SES send, Bedrock invoke
- **Cognito Identity Pool**: S3 upload for authenticated users only

**Authentication Flow:**
1. User logs in → Cognito User Pool
2. Receives JWT tokens (ID, Access, Refresh)
3. Exchanges for temporary AWS credentials → Identity Pool
4. Uses credentials to upload files to S3
5. API Gateway validates JWT for all admin requests

**Network Security:**
- All S3 buckets: SSL enforced, public access blocked
- API Gateway: HTTPS only, CORS configured
- Cognito: Password policy (8+ chars), MFA available
- Bedrock Guardrails: Content filtering (HIGH input, MEDIUM output)

---

## 4. Key Technical Specifications

### Model Configuration
```typescript
AI Model: Claude 4 Sonnet v1.0 (cross-region US)
Embeddings: Amazon Titan Embed Text v2 (1024 dimensions)
Context Window: 200K tokens
Temperature: Default (balanced)
Guardrails: Content filtering + Topic boundaries
```

### Resource Names
```bash
Stack Name: national_council_backend
Knowledge Base Bucket: national-council
Tables: NCMWDashboardSessionlogs, NCMWEscalatedQueries, NCMWUserProfiles
Lambda Runtime: Python 3.12 (most), Node.js 20 (WebSocket handler)
API Stage: production
Region: us-east-1 (configurable)
```

### Performance Metrics
```
Lambda Timeout: 120s (chat), 60s (email), 30s (admin)
DynamoDB: On-demand billing (auto-scaling)
S3 Storage Class: Standard (frequently accessed)
CloudWatch Logs: Retention 30 days (configurable)
Knowledge Base Sync: ~2-5 minutes per document
```

---

## 5. Quick Reference: Common Operations

### Deploy Infrastructure
```bash
cd cdk_backend
cdk deploy -c adminEmail=admin@example.com \
  -c githubOwner=ASUCICREPO \
  -c githubRepo=NCMW-Learning-Navigator-chatbot
```

### Upload Documents to Knowledge Base
```bash
# Copy files to S3 (auto-syncs via Lambda)
aws s3 cp document.pdf s3://national-council/pdfs/

# Manual sync if needed
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id <KB_ID> \
  --data-source-id <DS_ID>
```

### Create Admin User
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID> \
  --username admin@example.com \
  --temporary-password TempPass123!
```

### View Logs
```bash
# WebSocket chat logs
aws logs tail /aws/lambda/chatResponseHandler --follow

# Email notification logs
aws logs tail /aws/lambda/NotifyAdminFn --follow

# All Lambda functions
aws logs tail --follow --filter-pattern "ERROR"
```

### Query DynamoDB
```bash
# Get recent sessions
aws dynamodb scan --table-name NCMWDashboardSessionlogs \
  --limit 10

# Get escalated queries
aws dynamodb query --table-name NCMWEscalatedQueries \
  --index-name StatusIndex \
  --key-condition-expression "status = :s" \
  --expression-attribute-values '{":s":{"S":"pending"}}'
```

---

## 6. Cost Optimization Tips

1. **Bedrock**: Use cross-region inference (included) for better availability at same cost
2. **DynamoDB**: On-demand billing scales to zero when not used
3. **Lambda**: Memory sized appropriately (1024MB avg), cold starts ~500ms
4. **S3**: Lifecycle policies move old logs to Glacier after 90 days
5. **CloudWatch**: Set log retention to 30 days (not indefinite)

---

## 7. Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| "Branch main not found" | Amplify branch doesn't exist | buildspec.yml auto-creates it now |
| "Rule set already exists" | SES rule set from previous deploy | CDK now imports existing |
| Chat not responding | WebSocket disconnected | Check Lambda timeout (120s) |
| Knowledge Base outdated | Sync job not triggered | Upload new doc or run manual sync |
| Email not sending | SES in sandbox mode | Request production access |
| High costs | Too many Bedrock calls | Add rate limiting in frontend |

---

**Document Version**: 1.0
**Last Updated**: February 2026
**For Support**: Check CloudWatch logs first, then GitHub issues
