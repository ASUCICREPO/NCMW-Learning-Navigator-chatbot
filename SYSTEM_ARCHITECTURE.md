# Learning Navigator - System Architecture

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [AWS Services Architecture](#2-aws-services-architecture)
3. [Component Design](#3-component-design)
4. [Data Flow](#4-data-flow)
5. [Security Architecture](#5-security-architecture)
6. [Integration Architecture](#6-integration-architecture)
7. [Deployment Architecture](#7-deployment-architecture)

---

## 1. HIGH-LEVEL ARCHITECTURE

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Web App    │  │  Admin       │  │   Mobile     │              │
│  │  (React)     │  │  Dashboard   │  │  Responsive  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WSS
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                               │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  Amazon API Gateway (REST + WebSocket)                    │      │
│  │  - Authentication (Cognito)                               │      │
│  │  - Rate Limiting                                          │      │
│  │  - Request Validation                                     │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
┌───────────────────┐  ┌──────────────┐  ┌────────────────────┐
│  APPLICATION      │  │  AI/ML       │  │  INTEGRATION       │
│  LAYER            │  │  LAYER       │  │  LAYER             │
│                   │  │              │  │                    │
│  ┌─────────────┐  │  │ ┌──────────┐│  │  ┌──────────────┐  │
│  │  Lambda     │  │  │ │ Bedrock  ││  │  │  Zendesk     │  │
│  │  Functions  │◄─┼──┼─│ (Claude) ││  │  │  Integration │  │
│  │             │  │  │ └──────────┘│  │  └──────────────┘  │
│  │ - Chat API  │  │  │              │  │                    │
│  │ - Auth      │  │  │ ┌──────────┐│  │  ┌──────────────┐  │
│  │ - Analytics │  │  │ │ Kendra   ││  │  │  Dynamics    │  │
│  │ - Admin     │  │  │ │ (Search) ││  │  │  365 (Phase2)│  │
│  └─────────────┘  │  │ └──────────┘│  │  └──────────────┘  │
└───────────────────┘  └──────────────┘  └────────────────────┘
         │                     │                    │
         └─────────────────────┼────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  DynamoDB    │  │  S3 Buckets  │  │  RDS         │              │
│  │              │  │              │  │  (Optional)  │              │
│  │ - Sessions   │  │ - Documents  │  │              │              │
│  │ - Users      │  │ - Logs       │  │ - Analytics  │              │
│  │ - Chats      │  │ - Knowledge  │  │ - Reporting  │              │
│  │ - Feedback   │  │   Base       │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING & SECURITY                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  CloudWatch  │  │  WAF         │  │  Cognito     │              │
│  │  - Logs      │  │  - DDoS      │  │  - Auth      │              │
│  │  - Metrics   │  │  - Rate Limit│  │  - Users     │              │
│  │  - Alarms    │  │              │  │  - Roles     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Principles

1. **Serverless-First**: Use AWS Lambda and managed services to minimize operational overhead
2. **Microservices**: Loosely coupled services communicating via API Gateway
3. **Event-Driven**: Asynchronous processing where appropriate
4. **Security by Design**: Defense in depth, zero trust architecture
5. **Scalability**: Auto-scaling at every layer
6. **Cost Optimization**: Pay-per-use model, appropriate service selection

---

## 2. AWS SERVICES ARCHITECTURE

### 2.1 Core AWS Services

#### Frontend & Delivery
- **Amazon S3**: Host static web application (React)
- **Amazon CloudFront**: CDN for global content delivery, SSL/TLS termination
- **AWS Amplify** (Alternative): Simplified hosting with CI/CD

#### Compute
- **AWS Lambda**: Serverless compute for all backend logic
  - Runtime: Node.js 20.x or Python 3.12
  - Memory: 512MB - 1024MB per function
  - Timeout: 30 seconds (API calls), 15 minutes (batch processing)

#### API Management
- **Amazon API Gateway**:
  - REST API: CRUD operations, admin functions
  - WebSocket API: Real-time chat streaming
  - Features: Request validation, throttling, caching

#### AI/ML Services
- **Amazon Bedrock**:
  - Model: Claude 3 Sonnet or Claude 3.5 Sonnet
  - Features: Streaming responses, prompt caching
  - Guardrails for content filtering

- **Amazon Kendra** (Alternative: OpenSearch):
  - Intelligent search for knowledge base
  - RAG implementation
  - Document indexing and retrieval

- **Amazon Comprehend**:
  - Sentiment analysis
  - Language detection
  - Entity recognition

- **Amazon Translate**:
  - English ↔ Spanish translation
  - Real-time translation

#### Data Storage
- **Amazon DynamoDB**:
  - User sessions and conversation state
  - Chat history and metadata
  - User preferences and profiles
  - Feedback and ratings

- **Amazon S3**:
  - Knowledge base documents (PDFs, DOCX, etc.)
  - Conversation logs (archived)
  - Backup and disaster recovery

- **Amazon RDS** (Optional - for complex analytics):
  - PostgreSQL for relational data
  - Analytics and reporting queries

#### Authentication & Authorization
- **Amazon Cognito**:
  - User pools for authentication
  - User groups for role-based access
  - MFA support
  - OAuth 2.0 / OIDC integration

#### Monitoring & Observability
- **Amazon CloudWatch**:
  - Logs aggregation
  - Metrics and dashboards
  - Alarms and notifications

- **AWS X-Ray**:
  - Distributed tracing
  - Performance analysis
  - Bottleneck identification

#### Security
- **AWS WAF**: Web application firewall
- **AWS KMS**: Encryption key management
- **AWS Secrets Manager**: API keys and credentials storage
- **AWS Shield**: DDoS protection

#### Integration
- **Amazon EventBridge**: Event routing and orchestration
- **Amazon SQS**: Message queue for async processing
- **AWS Step Functions** (Optional): Complex workflow orchestration

---

## 3. COMPONENT DESIGN

### 3.1 Frontend Application (React)

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatWindow.tsx          # Main chat interface
│   │   ├── MessageList.tsx         # Message display
│   │   ├── MessageInput.tsx        # User input
│   │   ├── CitationCard.tsx        # Source citations
│   │   └── FeedbackButtons.tsx     # Thumbs up/down
│   ├── Admin/
│   │   ├── Dashboard.tsx           # Analytics dashboard
│   │   ├── ConversationLogs.tsx    # Log viewer
│   │   ├── Analytics.tsx           # Charts and metrics
│   │   └── Settings.tsx            # Configuration
│   ├── Auth/
│   │   ├── Login.tsx               # Login form
│   │   ├── Signup.tsx              # Registration
│   │   └── PasswordReset.tsx       # Password recovery
│   └── Common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Loader.tsx
├── services/
│   ├── api.ts                      # API client
│   ├── websocket.ts                # WebSocket connection
│   ├── auth.ts                     # Cognito integration
│   └── analytics.ts                # Analytics tracking
├── hooks/
│   ├── useChat.ts                  # Chat logic
│   ├── useAuth.ts                  # Authentication
│   └── useWebSocket.ts             # WebSocket management
├── store/
│   ├── chatSlice.ts                # Chat state (Redux)
│   ├── userSlice.ts                # User state
│   └── store.ts                    # Redux store config
├── utils/
│   ├── i18n.ts                     # Internationalization
│   ├── constants.ts
│   └── helpers.ts
└── App.tsx
```

### 3.2 Backend Services (Lambda Functions)

#### Chat Service
```
functions/
├── chat/
│   ├── sendMessage/                # Handle user messages
│   │   ├── handler.ts
│   │   ├── validation.ts
│   │   └── models.ts
│   ├── streamResponse/             # Stream AI responses (WebSocket)
│   │   └── handler.ts
│   ├── getHistory/                 # Retrieve chat history
│   │   └── handler.ts
│   └── endSession/                 # Close chat session
│       └── handler.ts
```

#### AI Service
```
├── ai/
│   ├── generateResponse/           # Bedrock integration
│   │   ├── handler.ts
│   │   ├── promptTemplates.ts
│   │   └── ragService.ts
│   ├── searchKnowledge/            # Kendra search
│   │   └── handler.ts
│   ├── detectIntent/               # Intent classification
│   │   └── handler.ts
│   └── analyzeSentiment/           # Comprehend integration
│       └── handler.ts
```

#### User Service
```
├── user/
│   ├── getProfile/                 # User profile
│   │   └── handler.ts
│   ├── updatePreferences/          # User settings
│   │   └── handler.ts
│   └── getRecommendations/         # Personalized suggestions
│       └── handler.ts
```

#### Admin Service
```
├── admin/
│   ├── getAnalytics/               # Dashboard metrics
│   │   └── handler.ts
│   ├── getConversations/           # Conversation logs
│   │   └── handler.ts
│   ├── exportData/                 # Data export
│   │   └── handler.ts
│   └── updateConfig/               # System configuration
│       └── handler.ts
```

#### Integration Service
```
├── integrations/
│   ├── zendesk/
│   │   ├── createTicket.ts         # Create Zendesk ticket
│   │   └── updateTicket.ts
│   ├── dynamics365/                # Phase 2
│   │   ├── syncContacts.ts
│   │   └── updateLeads.ts
│   └── lms/
│       └── getCourses.ts           # LMS integration
```

### 3.3 Data Models

#### DynamoDB Tables

**Users Table**
```typescript
{
  PK: "USER#<userId>",
  SK: "PROFILE",
  email: string,
  role: "instructor" | "staff" | "learner" | "admin",
  language: "en" | "es",
  preferences: {
    notifications: boolean,
    theme: string
  },
  createdAt: timestamp,
  lastActive: timestamp
}
```

**Conversations Table**
```typescript
{
  PK: "USER#<userId>",
  SK: "CONV#<conversationId>",
  conversationId: string,
  status: "active" | "closed" | "escalated",
  startTime: timestamp,
  endTime: timestamp,
  messageCount: number,
  sentiment: "positive" | "neutral" | "negative",
  topics: string[],
  escalated: boolean,
  zendeskTicketId?: string
}
```

**Messages Table**
```typescript
{
  PK: "CONV#<conversationId>",
  SK: "MSG#<timestamp>",
  messageId: string,
  role: "user" | "assistant",
  content: string,
  language: "en" | "es",
  citations?: [
    {
      source: string,
      url: string,
      excerpt: string
    }
  ],
  timestamp: timestamp
}
```

**Feedback Table**
```typescript
{
  PK: "MSG#<messageId>",
  SK: "FEEDBACK",
  messageId: string,
  conversationId: string,
  userId: string,
  rating: "positive" | "negative",
  comment?: string,
  timestamp: timestamp
}
```

---

## 4. DATA FLOW

### 4.1 User Message Flow

```
User Input → API Gateway → Lambda (sendMessage)
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Save to DynamoDB    Invoke AI Service
                    ↓                   ↓
              Get Conversation    Search Kendra (RAG)
              History & Context         ↓
                    │             Retrieve Relevant Docs
                    │                   ↓
                    └────────┬──────────┘
                             ↓
                    Build Prompt with Context
                             ↓
                    Invoke Bedrock (Claude)
                             ↓
                    Stream Response via WebSocket
                             ↓
                    Save Response to DynamoDB
                             ↓
                    Analyze Sentiment (Comprehend)
                             ↓
                    Check Escalation Criteria
                             ↓
                    [If escalation needed]
                             ↓
                    Create Zendesk Ticket
                             ↓
                    User Receives Response
```

### 4.2 Knowledge Base Update Flow

```
Admin Uploads Document → S3 Bucket
                            ↓
                   S3 Event Trigger
                            ↓
                   Lambda (processDocument)
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
    Extract Text/Metadata         Convert to Searchable Format
    (TextTract/Comprehend)                ↓
              ↓                    Index in Kendra
    Detect Language                       ↓
              ↓                    Update Search Index
    Translate if needed                   ↓
              ↓                    Store Embeddings
    Store Metadata in DynamoDB            ↓
              └─────────────┬─────────────┘
                            ↓
                    Update Complete
```

### 4.3 Analytics Data Flow

```
User Interaction → Event Captured
                         ↓
                CloudWatch Logs
                         ↓
            ┌────────────┴────────────┐
            ↓                         ↓
    Real-time Metrics          Batch Processing
    (CloudWatch)               (EventBridge + Lambda)
            ↓                         ↓
    Live Dashboard            Aggregate Analytics
                                      ↓
                              Store in DynamoDB/RDS
                                      ↓
                              Admin Dashboard Query
```

---

## 5. SECURITY ARCHITECTURE

### 5.1 Authentication Flow

```
User Login → Cognito User Pool
                   ↓
           Authenticate Credentials
                   ↓
           [Optional MFA]
                   ↓
           Generate JWT Tokens
           (ID Token, Access Token, Refresh Token)
                   ↓
           Return to Client
                   ↓
Client stores tokens (secure storage)
                   ↓
API Request with Authorization Header
                   ↓
API Gateway validates JWT with Cognito
                   ↓
Extract user claims (userId, role)
                   ↓
Lambda receives authorized request
```

### 5.2 Authorization Matrix

| Resource              | Instructor | Internal Staff | Learner | Admin |
|-----------------------|------------|----------------|---------|-------|
| Chat Interface        | ✓          | ✓              | ✓       | ✓     |
| Instructor Resources  | ✓          | ✓              |         | ✓     |
| Admin Dashboard       |            |                |         | ✓     |
| Analytics View        |            | ✓              |         | ✓     |
| System Configuration  |            |                |         | ✓     |
| User Management       |            |                |         | ✓     |
| Knowledge Base Edit   |            | ✓              |         | ✓     |

### 5.3 Data Security

```
┌─────────────────────────────────────────┐
│  Data Classification                     │
├─────────────────────────────────────────┤
│  • PII (Personally Identifiable Info)   │
│    - Email, Name, Contact Info          │
│    - Encryption: KMS                    │
│    - Access: Minimal, audited           │
│                                          │
│  • Conversation Data (Sensitive)        │
│    - Chat history, feedback             │
│    - Encryption: KMS                    │
│    - Retention: 90 days active,         │
│      archived to S3 with lifecycle      │
│                                          │
│  • Analytics Data (Aggregated)          │
│    - Anonymized metrics                 │
│    - No PII                             │
│    - Encryption: Standard               │
└─────────────────────────────────────────┘
```

### 5.4 Network Security

- **VPC Configuration**: Lambda functions in private subnets (for RDS access if used)
- **Security Groups**: Restrictive ingress/egress rules
- **WAF Rules**:
  - Rate limiting: 100 requests/minute per IP
  - SQL injection protection
  - XSS protection
  - Geographic blocking (if needed)
- **DDoS Protection**: AWS Shield Standard (included)

---

## 6. INTEGRATION ARCHITECTURE

### 6.1 Zendesk Integration

```
Escalation Triggered → Lambda (createTicket)
                              ↓
                    Check Escalation Criteria
                              ↓
                    Prepare Ticket Payload:
                    - User info
                    - Conversation history
                    - Issue category
                    - Priority
                              ↓
                    POST to Zendesk API
                    (stored credentials via Secrets Manager)
                              ↓
                    Receive Ticket ID
                              ↓
                    Update DynamoDB:
                    - Mark conversation as escalated
                    - Store ticket ID
                              ↓
                    Send ticket info to user
                              ↓
                    Log event to CloudWatch
```

**API Details**:
- Endpoint: `https://{subdomain}.zendesk.com/api/v2/tickets`
- Authentication: API token (stored in Secrets Manager)
- Payload:
```json
{
  "ticket": {
    "subject": "Chatbot Escalation - {topic}",
    "comment": {
      "body": "{conversation_summary}"
    },
    "priority": "normal",
    "status": "new",
    "custom_fields": [
      {"id": 123, "value": "chatbot_escalation"}
    ]
  }
}
```

### 6.2 AWS Cognito Integration

```
Frontend → Cognito Hosted UI / SDK
              ↓
    User Authentication
              ↓
    JWT Tokens Issued
              ↓
    Frontend stores tokens
              ↓
API Request → API Gateway
              ↓
    Cognito Authorizer validates JWT
              ↓
    Extract user claims:
    - sub (userId)
    - cognito:groups (roles)
    - email
              ↓
    Pass to Lambda context
              ↓
    Lambda uses claims for authorization
```

### 6.3 Learning Management System (LMS) Integration

```
User Query about Courses → AI Service
                                ↓
                    Detect course-related intent
                                ↓
                    Lambda (getCourses)
                                ↓
                    Call LMS API
                    (RESTful or GraphQL)
                                ↓
                    Fetch relevant course data:
                    - Course catalog
                    - User enrollments
                    - Schedule information
                                ↓
                    Cache in DynamoDB (TTL: 1 hour)
                                ↓
                    Format response for AI
                                ↓
                    AI generates natural language answer
                                ↓
                    Include course links in response
```

### 6.4 Microsoft Dynamics 365 Integration (Phase 2)

**Architecture**:
- **Option 1**: Direct REST API integration
  - Microsoft Graph API
  - Azure AD OAuth authentication
  - Sync user profiles, leads, opportunities

- **Option 2**: Event-driven sync
  - EventBridge → Lambda → Dynamics API
  - Bidirectional webhook integration
  - Real-time updates

**Data Sync**:
- User profiles (Cognito ↔ Dynamics)
- Lead capture (Chatbot → Dynamics)
- Instructor information (Dynamics → Chatbot)

---

## 7. DEPLOYMENT ARCHITECTURE

### 7.1 Infrastructure as Code (IaC)

**AWS CDK (Recommended)** or **Terraform**

```
infrastructure/
├── lib/
│   ├── api-stack.ts              # API Gateway, Lambda
│   ├── data-stack.ts             # DynamoDB, S3, RDS
│   ├── ai-stack.ts               # Bedrock, Kendra
│   ├── auth-stack.ts             # Cognito
│   ├── monitoring-stack.ts       # CloudWatch, X-Ray
│   └── frontend-stack.ts         # S3, CloudFront
├── bin/
│   └── app.ts                    # CDK app entry point
└── cdk.json
```

### 7.2 CI/CD Pipeline

```
GitHub Repository
      ↓
[Push to branch]
      ↓
GitHub Actions / AWS CodePipeline
      ↓
├─→ [Build Stage]
│   - Install dependencies
│   - Run tests (unit, integration)
│   - Lint code
│   - Build artifacts
│
├─→ [Deploy to Dev]
│   - Deploy CDK stack to dev environment
│   - Run smoke tests
│   - Integration tests
│
├─→ [Manual Approval]
│
├─→ [Deploy to Staging]
│   - Deploy CDK stack to staging
│   - Run E2E tests
│   - Performance tests
│   - Security scans
│
├─→ [Manual Approval]
│
└─→ [Deploy to Production]
    - Deploy CDK stack to production
    - Blue-green deployment
    - Monitor metrics
    - Automatic rollback on errors
```

### 7.3 Environment Configuration

| Environment | Purpose              | Configuration                        |
|-------------|----------------------|--------------------------------------|
| Development | Local testing        | Single region, minimal resources     |
| Staging     | Pre-production tests | Production-like, scaled down         |
| Production  | Live system          | Multi-AZ, auto-scaling, full monitoring |

### 7.4 Disaster Recovery

**Strategy**: Pilot Light

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour

**Backup Schedule**:
- DynamoDB: Point-in-time recovery enabled (35 days)
- S3: Versioning enabled, lifecycle rules
- RDS (if used): Automated daily snapshots, 7-day retention

**Recovery Procedure**:
1. Restore DynamoDB tables from backup
2. Restore S3 buckets from versioning
3. Redeploy infrastructure via CDK
4. Update DNS/CloudFront if needed
5. Validate system health
6. Resume operations

---

## 8. SCALABILITY & PERFORMANCE

### 8.1 Auto-Scaling Configuration

**Lambda**:
- Concurrent executions: 100 (initial), 1000 (reserved)
- Provisioned concurrency: 10 (for critical functions)
- Auto-scaling based on invocation rate

**DynamoDB**:
- On-demand capacity mode (recommended for MVP)
- Auto-scales read/write capacity
- No capacity planning needed

**API Gateway**:
- Throttling: 10,000 requests/second (adjustable)
- Burst: 5,000 requests

### 8.2 Caching Strategy

```
┌───────────────────────────────────────┐
│  Cache Layer                           │
├───────────────────────────────────────┤
│  1. CloudFront (Edge)                 │
│     - Static assets: 1 year           │
│     - API responses: Not cached       │
│                                        │
│  2. API Gateway Cache                 │
│     - GET requests: 5 minutes         │
│     - Invalidate on updates           │
│                                        │
│  3. DynamoDB DAX (Optional)           │
│     - Hot data: microsecond latency   │
│                                        │
│  4. Application Cache (Lambda)        │
│     - In-memory: session data         │
│     - TTL: function lifetime          │
│                                        │
│  5. Bedrock Prompt Caching            │
│     - System prompts: 5 minutes       │
│     - Knowledge base context: cached  │
└───────────────────────────────────────┘
```

### 8.3 Performance Targets

| Metric                    | Target          |
|---------------------------|-----------------|
| API Response Time (p95)   | < 200ms         |
| Chat Response Time (p95)  | < 3s            |
| WebSocket Latency         | < 100ms         |
| Page Load Time            | < 2s            |
| Time to Interactive (TTI) | < 3s            |
| Throughput                | 100 req/sec     |

---

## 9. COST ESTIMATION (Monthly - MVP)

**Assumptions**: 100 concurrent users, 10,000 conversations/month, 100,000 messages/month

| Service              | Estimated Cost | Notes                           |
|----------------------|----------------|---------------------------------|
| Lambda               | $50            | 1M invocations, 512MB memory    |
| API Gateway          | $35            | REST + WebSocket                |
| Bedrock (Claude)     | $150           | Pay-per-token, varies with usage|
| Kendra               | $810           | Developer edition               |
| DynamoDB             | $25            | On-demand, 5GB storage          |
| S3                   | $10            | 50GB storage, 100GB transfer    |
| CloudFront           | $15            | 100GB data transfer             |
| Cognito              | $5             | < 50,000 MAUs (free tier)       |
| CloudWatch           | $20            | Logs, metrics, dashboards       |
| **Total**            | **~$1,120**    | Can be optimized                |

**Cost Optimization Options**:
- Use OpenSearch instead of Kendra: Save ~$700/month
- Implement aggressive caching: Reduce Bedrock calls by 30%
- Reserved capacity for predictable workloads: Save 20-40%

---

## 10. ARCHITECTURE DECISION RECORDS (ADRs)

### ADR-001: Serverless Architecture
**Decision**: Use AWS Lambda for all compute
**Rationale**: Low initial traffic, no Ops overhead, cost-effective, auto-scaling
**Consequences**: Cold starts (mitigated with provisioned concurrency), 15-min timeout limit

### ADR-002: Amazon Bedrock for LLM
**Decision**: Use Bedrock with Claude 3 Sonnet
**Rationale**: Fully managed, no infrastructure, enterprise-ready, great for RAG
**Consequences**: Vendor lock-in (AWS), token costs scale with usage

### ADR-003: DynamoDB for Primary Database
**Decision**: Use DynamoDB for conversations, users, feedback
**Rationale**: Serverless, fast, auto-scaling, simple data model
**Consequences**: Limited query flexibility, eventual consistency

### ADR-004: WebSocket for Real-time Chat
**Decision**: Use API Gateway WebSocket for streaming responses
**Rationale**: Real-time bi-directional communication, better UX than polling
**Consequences**: More complex than REST, connection management overhead

### ADR-005: Kendra vs OpenSearch for RAG
**Decision**: Evaluate both, recommend OpenSearch for MVP
**Rationale**: Kendra is expensive ($810/mo), OpenSearch more flexible and cost-effective
**Consequences**: OpenSearch requires more setup, but significant cost savings

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Author**: Architecture Team
**Status**: Draft - Pending Review
