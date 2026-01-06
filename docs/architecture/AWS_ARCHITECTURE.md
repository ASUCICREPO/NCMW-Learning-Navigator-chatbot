# AWS Architecture - Learning Navigator Chatbot

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [High-Level Architecture Diagram](#high-level-architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Security Architecture](#security-architecture)
6. [Scalability & Performance](#scalability--performance)
7. [Cost Optimization](#cost-optimization)
8. [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

The Learning Navigator chatbot is a **serverless, AI-powered application** built on AWS, leveraging AWS Bedrock for generative AI capabilities. The architecture follows AWS best practices for security, scalability, and cost optimization.

### Key Architectural Patterns:
- **Serverless Architecture**: No server management, auto-scaling, pay-per-use
- **Event-Driven Design**: Lambda functions triggered by API Gateway, EventBridge, and SES events
- **Microservices**: Decoupled Lambda functions for specific responsibilities
- **Real-Time Communication**: WebSocket API for bi-directional chat streaming
- **Content-Based Routing**: Guardrails and confidence scoring for query handling

### Technology Stack:
- **Frontend**: React (TypeScript), Material-UI, hosted on AWS Amplify
- **Backend**: AWS Lambda (Python 3.12), API Gateway (REST + WebSocket)
- **AI/ML**: AWS Bedrock (Claude 3.5 Sonnet v2, Haiku, Nova Lite, Titan Embeddings)
- **Storage**: Amazon S3 (documents), DynamoDB (session logs, user profiles)
- **Authentication**: Amazon Cognito (User Pools + Identity Pools)
- **Email**: Amazon SES (notifications and email ingestion)
- **Infrastructure as Code**: AWS CDK (TypeScript)

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USERS / CLIENTS                                    │
│                                                                                 │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐          │
│  │   Guest      │         │  Instructor  │         │    Admin     │          │
│  │   User       │         │  / Learner   │         │    User      │          │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘          │
└─────────┼──────────────────────────┼──────────────────────────┼────────────────┘
          │                          │                          │
          │ HTTPS                    │ HTTPS                    │ HTTPS
          │                          │                          │
┌─────────▼──────────────────────────▼──────────────────────────▼────────────────┐
│                         AWS AMPLIFY (Frontend Hosting)                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  React Application (TypeScript + Material-UI)                           │  │
│  │  • Main Chat Interface (Guest Mode + Authenticated)                     │  │
│  │  • Admin Portal (Protected by Cognito)                                  │  │
│  │  • Language Toggle (EN ↔ ES)                                            │  │
│  │  • Personalized Recommendations (Role-based)                            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Environment Variables:                                                         │
│  • REACT_APP_WEBSOCKET_API → WebSocket API URL                                 │
│  • REACT_APP_COGNITO_USER_POOL_ID → Cognito User Pool                         │
│  • REACT_APP_ANALYTICS_API → Admin REST API URL                                │
└─────────┬───────────────────────────────────────────────┬─────────────────────┘
          │                                               │
          │                                               │
┌─────────▼───────────────────────────┐      ┌──────────▼──────────────────────┐
│   AMAZON COGNITO (Authentication)   │      │   API GATEWAY                    │
│  ┌───────────────────────────────┐  │      │  ┌────────────────────────────┐ │
│  │  User Pool                    │  │      │  │  WebSocket API             │ │
│  │  • Email-based authentication │  │      │  │  Route: sendMessage        │ │
│  │  • Admin users only           │  │      │  │  Stage: production         │ │
│  │  • Password policies          │  │      │  └────────┬───────────────────┘ │
│  └───────────────────────────────┘  │      │           │                      │
│                                      │      │  ┌────────▼───────────────────┐ │
│  ┌───────────────────────────────┐  │      │  │  REST API                  │ │
│  │  Identity Pool                │  │      │  │  Endpoints:                │ │
│  │  • Federated identities       │  │      │  │  • /files (GET, POST)      │ │
│  │  • S3 access for authenticated│  │      │  │  • /files/{key} (DELETE)   │ │
│  └───────────────────────────────┘  │      │  │  • /sync (POST)            │ │
│                                      │      │  │  • /session-logs (GET)     │ │
│  ┌───────────────────────────────┐  │      │  │  • /escalated-queries (GET)│ │
│  │  User Pool Authorizer         │  │      │  │  • /user-profile (GET/POST)│ │
│  │  • JWT validation             │  │      │  │  • /recommendations (GET)  │ │
│  │  • Protects admin APIs        │  │      │  └────────────────────────────┘ │
│  └───────────────────────────────┘  │      │                                  │
└──────────────────────────────────────┘      └──────────┬───────────────────────┘
                                                         │
                                                         │
┌────────────────────────────────────────────────────────▼─────────────────────────┐
│                           AWS LAMBDA FUNCTIONS                                   │
│                                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────────┐  │
│  │ websocketHandler    │  │ cfEvaluator         │  │ logclassifier          │  │
│  │ • Receives user     │  │ • Invokes Bedrock   │  │ • Analyzes chat logs   │  │
│  │   messages          │  │   Agent             │  │ • Sentiment scoring    │  │
│  │ • Invokes           │─▶│ • Streams responses │  │ • Stores in DynamoDB   │  │
│  │   cfEvaluator       │  │ • Computes          │  │                        │  │
│  │ • Manages WebSocket │  │   confidence score  │  │                        │  │
│  │   connections       │  │ • Handles citations │  │                        │  │
│  └─────────────────────┘  └──────────┬──────────┘  └────────────────────────┘  │
│                                      │                                          │
│  ┌─────────────────────┐  ┌──────────▼──────────┐  ┌────────────────────────┐  │
│  │ emailHandler        │  │ notifyAdmin         │  │ adminFile              │  │
│  │ • Processes SES     │  │ • Sends admin email │  │ • Upload/delete PDFs   │  │
│  │   incoming emails   │  │ • Escalates low-    │  │ • List knowledge base  │  │
│  │ • Extracts content  │  │   confidence queries│  │   documents            │  │
│  │ • Uploads to S3     │  │ • Logs to DynamoDB  │  │ • Triggers KB sync     │  │
│  │ • Triggers KB sync  │  │                     │  │                        │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────────────┘  │
│                                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────────┐  │
│  │ sessionLogsFn       │  │ retrieveSessionLogs │  │ escalatedQueriesFn     │  │
│  │ • Queries CloudWatch│  │ • Fetches session   │  │ • Lists escalated      │  │
│  │ • Aggregates logs   │  │   logs from DynamoDB│  │   queries              │  │
│  │ • Stores in S3      │  │ • Returns analytics │  │ • Filters by status    │  │
│  │ • Updates DynamoDB  │  │   data              │  │ • Returns query details│  │
│  │ • Scheduled daily   │  │                     │  │                        │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────────────┘  │
│                                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐                              │
│  │ userProfileFn       │  │ updateQueryStatusFn │                              │
│  │ • Manages user      │  │ • Updates query     │                              │
│  │   profiles          │  │   status (pending/  │                              │
│  │ • Stores role       │  │   resolved)         │                              │
│  │   preferences       │  │ • Writes to DynamoDB│                              │
│  │ • Returns           │  │                     │                              │
│  │   recommendations   │  │                     │                              │
│  └─────────────────────┘  └─────────────────────┘                              │
└───────────────┬──────────────────────────────────────────────┬─────────────────┘
                │                                              │
                │                                              │
┌───────────────▼──────────────────────────────┐   ┌──────────▼─────────────────┐
│      AWS BEDROCK (Generative AI)             │   │   DATA STORAGE             │
│  ┌────────────────────────────────────────┐  │   │  ┌──────────────────────┐  │
│  │  Bedrock Agent: "Learning Navigator"  │  │   │  │  Amazon S3           │  │
│  │  • Model: Claude 3.5 Sonnet v2        │  │   │  │  ┌─────────────────┐ │  │
│  │  • Cross-region inference profile      │  │   │  │  │ national-council│ │  │
│  │  • Knowledge base integration          │  │   │  │  │ -s3-pdfs        │ │  │
│  │  • Action groups (notify-admin)        │  │   │  │  │ • PDF documents │ │  │
│  │  • User input enabled                  │  │   │  │  │ • Knowledge base│ │  │
│  │  • Guardrails enabled                  │  │   │  │  └─────────────────┘ │  │
│  └────────────────────────────────────────┘  │   │  │                        │  │
│                                               │   │  │  ┌─────────────────┐ │  │
│  ┌────────────────────────────────────────┐  │   │  │  │ emailBucket     │ │  │
│  │  Knowledge Base                        │  │   │  │  │ • Incoming      │ │  │
│  │  • Vector embeddings (Titan v2)        │  │   │  │  │   emails from   │ │  │
│  │  • Data source: S3 (national-council)  │  │   │  │  │   SES           │ │  │
│  │  • Parsing: Bedrock Data Automation    │  │   │  │  └─────────────────┘ │  │
│  │  • Supplemental bucket for multimodal  │  │   │  │                        │  │
│  │  • Instruction: MHFA support guidance  │  │   │  │  ┌─────────────────┐ │  │
│  └────────────────────────────────────────┘  │   │  │  │ supplemental    │ │  │
│                                               │   │  │  │ Bucket          │ │  │
│  ┌────────────────────────────────────────┐  │   │  │  │ • Multimodal    │ │  │
│  │  Guardrails                            │  │   │  │  │   data storage  │ │  │
│  │  • Content filters (HIGH input)        │  │   │  │  └─────────────────┘ │  │
│  │  • Blocked outputs messaging           │  │   │  │                        │  │
│  │  • Scope: MHFA topics only             │  │   │  │  ┌─────────────────┐ │  │
│  │  • MEDIUM output filtering             │  │   │  │  │ dashboardLogs   │ │  │
│  │  • Modality: TEXT + IMAGE              │  │   │  │  │ Bucket          │ │  │
│  └────────────────────────────────────────┘  │   │  │  │ • Session logs  │ │  │
│                                               │   │  │  │ • Analytics data│ │  │
│  ┌────────────────────────────────────────┐  │   │  │  └─────────────────┘ │  │
│  │  Foundation Models                     │  │   │  └──────────────────────┘  │
│  │  • Claude 3.5 Sonnet v2 (main chat)    │  │   │                             │
│  │  • Claude Haiku (fast responses)       │  │   │  ┌──────────────────────┐  │
│  │  • Nova Lite (sentiment analysis)      │  │   │  │  Amazon DynamoDB     │  │
│  │  • Titan Embed Text v2 (embeddings)    │  │   │  │  ┌─────────────────┐ │  │
│  └────────────────────────────────────────┘  │   │  │  │NCMWDashboard    │ │  │
│                                               │   │  │  │Sessionlogs      │ │  │
│  ┌────────────────────────────────────────┐  │   │  │  │ • PK: session_id│ │  │
│  │  Action Groups                         │  │   │  │  │ • SK: timestamp │ │  │
│  │  • notify-admin                        │  │   │  │  │ • Sentiment     │ │  │
│  │    - Executor: notifyAdmin Lambda      │  │   │  │  │   scores        │ │  │
│  │    - Schema: OpenAPI (YAML)            │  │   │  │  └─────────────────┘ │  │
│  │    - Sends email via SES               │  │   │  │                        │  │
│  │    - Logs to DynamoDB                  │  │   │  │  ┌─────────────────┐ │  │
│  └────────────────────────────────────────┘  │   │  │  │NCMWEscalated    │ │  │
└───────────────────────────────────────────────┘   │  │  │Queries          │ │  │
                                                    │  │  │ • PK: query_id  │ │  │
┌───────────────────────────────────────────────┐   │  │  │ • SK: timestamp │ │  │
│      AMAZON SES (Email Service)               │   │  │  │ • GSI: status   │ │  │
│  ┌────────────────────────────────────────┐  │   │  │  └─────────────────┘ │  │
│  │  Email Sending                         │  │   │  │                        │  │
│  │  • Verified identity: admin email      │  │   │  │  ┌─────────────────┐ │  │
│  │  • Sends notifications to users        │  │   │  │  │NCMWUserProfiles │ │  │
│  │  • Low-confidence query escalations    │  │   │  │  │ • PK: userId    │ │  │
│  │  • Admin replies to user queries       │  │   │  │  │ • Role          │ │  │
│  └────────────────────────────────────────┘  │   │  │  │ • Preferences   │ │  │
│                                               │   │  │  │ • History       │ │  │
│  ┌────────────────────────────────────────┐  │   │  │  └─────────────────┘ │  │
│  │  Email Receiving (Ingestion)           │  │   │  └──────────────────────┘  │
│  │  • Receipt rule set (active)           │  │   └────────────────────────────┘
│  │  • Recipients: admin email             │  │
│  │  • Actions:                            │  │
│  │    1. Store in S3 (emailBucket)        │  │   ┌────────────────────────────┐
│  │    2. Trigger Lambda (emailHandler)    │  │   │  AMAZON EVENTBRIDGE        │
│  │  • TLS: Optional                       │  │   │  ┌──────────────────────┐  │
│  │  • Spam scanning: Enabled              │  │   │  │  Scheduled Rule      │  │
│  └────────────────────────────────────────┘  │   │  │  • Daily at 23:59 UTC│  │
└───────────────────────────────────────────────┘   │  │  • Triggers:         │  │
                                                    │  │    sessionLogsFn     │  │
┌───────────────────────────────────────────────┐   │  │  • Purpose: Aggregate│  │
│      AMAZON CLOUDWATCH                        │   │  │    daily logs       │  │
│  ┌────────────────────────────────────────┐  │   │  └──────────────────────┘  │
│  │  Logs                                  │  │   └────────────────────────────┘
│  │  • /aws/lambda/websocketHandler        │  │
│  │  • /aws/lambda/cfEvaluator             │  │   ┌────────────────────────────┐
│  │  • /aws/lambda/logclassifier           │  │   │  AWS SECRETS MANAGER       │
│  │  • /aws/lambda/emailHandler            │  │   │  ┌──────────────────────┐  │
│  │  • /aws/lambda/adminFile               │  │   │  │  github-secret-token │  │
│  │  • All other Lambda functions          │  │   │  │  • GitHub PAT for    │  │
│  └────────────────────────────────────────┘  │   │  │    Amplify (private  │  │
│                                               │   │  │    repos only)       │  │
│  ┌────────────────────────────────────────┐  │   │  └──────────────────────┘  │
│  │  Metrics                               │  │   └────────────────────────────┘
│  │  • Lambda invocations, errors, duration│  │
│  │  • API Gateway requests, 4xx/5xx       │  │   ┌────────────────────────────┐
│  │  • DynamoDB read/write capacity        │  │   │  AWS IAM (Roles & Policies)│
│  │  • Bedrock API calls, token usage      │  │   │  ┌──────────────────────┐  │
│  └────────────────────────────────────────┘  │   │  │  bedrockRoleAgent    │  │
│                                               │   │  │  • S3 full access    │  │
│  ┌────────────────────────────────────────┐  │   │  │  • Bedrock full      │  │
│  │  Alarms (Recommended)                  │  │   │  │  • CloudWatch full   │  │
│  │  • Lambda error rate > 5%              │  │   │  └──────────────────────┘  │
│  │  • API Gateway 5xx errors              │  │   │                            │
│  │  • DynamoDB throttling                 │  │   │  ┌──────────────────────┐  │
│  │  • High Bedrock costs                  │  │   │  │  Lambda execution    │  │
│  └────────────────────────────────────────┘  │   │  │  roles (per function)│  │
└───────────────────────────────────────────────┘   │  │  • Least privilege   │  │
                                                    │  │  • Service-specific  │  │
                                                    │  └──────────────────────┘  │
                                                    │                            │
                                                    │  ┌──────────────────────┐  │
                                                    │  │  Cognito             │  │
                                                    │  │  authenticatedRole   │  │
                                                    │  │  • S3 read/write     │  │
                                                    │  └──────────────────────┘  │
                                                    └────────────────────────────┘
```

---

## Component Details

### 1. Frontend Layer (AWS Amplify)

**Purpose**: Hosts the React single-page application (SPA) with automatic CI/CD from GitHub.

**Key Features:**
- **Auto-build**: Triggers on every `git push` to main branch
- **Environment Variables**: Injected at build time for API endpoints
- **Custom Domain Support**: SSL certificate auto-provisioned via ACM
- **SPA Routing**: Custom rewrite rules for React Router

**Build Process:**
```yaml
version: 1.0
frontend:
  phases:
    preBuild:
      - cd frontend
      - npm ci
    build:
      - npm run build
  artifacts:
    baseDirectory: frontend/build
    files: ['**/*']
  cache:
    paths: ['frontend/node_modules/**/*']
```

**Custom Rules:**
- All non-file routes redirect to `/index.html` (SPA support)
- `/admin` and `/admin/*` rewrite to `/index.html` (admin portal routing)

---

### 2. Authentication Layer (Amazon Cognito)

**Components:**

#### User Pool
- **Purpose**: Manages admin user authentication
- **Sign-in**: Email + password
- **Security Features**:
  - Auto email verification
  - Password policies (min 8 chars)
  - Account recovery via email
  - No self sign-up (admin creates users)

#### Identity Pool
- **Purpose**: Federated identities for S3 access
- **Role Mapping**: Authenticated users → IAM role with S3 permissions
- **Use Case**: Admin file uploads to knowledge base

#### User Pool Authorizer
- **Purpose**: Protects REST API admin endpoints
- **Mechanism**: JWT token validation
- **Endpoints Protected**:
  - `/files` (document management)
  - `/sync` (knowledge base sync)
  - `/session-logs` (analytics)
  - `/escalated-queries` (notifications)
  - `/user-profile` (user preferences)
  - `/recommendations` (personalized content)

**Authentication Flow:**
```
1. Admin logs in → Cognito validates credentials
2. Cognito returns JWT tokens (ID, Access, Refresh)
3. Frontend stores tokens in localStorage
4. API requests include Authorization header: Bearer <ID_TOKEN>
5. API Gateway validates JWT with Cognito User Pool Authorizer
6. Valid token → Request forwarded to Lambda
7. Invalid/expired token → 401 Unauthorized
```

---

### 3. API Gateway Layer

#### WebSocket API
**Purpose**: Real-time bidirectional communication for chat streaming.

**Configuration:**
- **Route**: `sendMessage`
- **Stage**: `production`
- **Integration**: Lambda function (`websocketHandler`)
- **Connection Management**: API Gateway manages WebSocket connections

**Data Flow:**
```
1. User sends chat message → WebSocket message
2. API Gateway routes to websocketHandler Lambda
3. Lambda invokes cfEvaluator for Bedrock processing
4. cfEvaluator streams response back via WebSocket
5. Frontend displays response in real-time
```

**Connection Lifecycle:**
- `$connect`: Client establishes connection
- `sendMessage`: Client sends chat message
- `$disconnect`: Client closes connection

#### REST API
**Purpose**: Admin portal backend operations.

**Endpoints:**

| Endpoint | Method | Purpose | Authorization |
|----------|--------|---------|---------------|
| `/files` | GET | List knowledge base documents | Cognito |
| `/files` | POST | Upload new document | Cognito |
| `/files/{key}` | GET | Download specific document | Cognito |
| `/files/{key}` | DELETE | Delete document | Cognito |
| `/sync` | POST | Trigger knowledge base sync | Cognito |
| `/session-logs` | GET | List all session logs | Cognito |
| `/session-logs/{sessionId}` | GET | Get single session details | Cognito |
| `/escalated-queries` | GET | List escalated queries | Cognito |
| `/escalated-queries` | PUT | Update query status | Cognito |
| `/escalated-queries/{queryId}` | GET | Get single query details | Cognito |
| `/user-profile` | GET | Get user profile | Cognito |
| `/user-profile` | POST | Create user profile | Cognito |
| `/user-profile` | PUT | Update user profile | Cognito |
| `/recommendations` | GET | Get personalized recommendations | Cognito |

**CORS Configuration:**
- Allow Origins: `*` (all origins)
- Allow Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allow Headers: `Content-Type, Authorization, X-Amz-Date, X-Api-Key`

---

### 4. Lambda Functions Layer

#### websocketHandler
**Runtime**: Python 3.12
**Trigger**: API Gateway WebSocket (`sendMessage` route)
**Purpose**: Entry point for user chat messages

**Logic:**
```python
1. Receive message from API Gateway event
2. Extract connectionId and user message
3. Invoke cfEvaluator Lambda asynchronously
4. Return 200 OK to API Gateway
```

**Environment Variables:**
- `RESPONSE_FUNCTION_ARN`: ARN of cfEvaluator Lambda

**Permissions:**
- Invoke cfEvaluator Lambda
- Execute API Gateway connections (send messages back to client)

---

#### cfEvaluator
**Runtime**: Python 3.12 (Docker build)
**Trigger**: Invoked by websocketHandler
**Purpose**: Core chat logic, Bedrock agent invocation, confidence scoring

**Logic:**
```python
1. Parse user message and session context
2. Invoke Bedrock Agent with user query
3. Stream agent responses in real-time
4. Compute confidence score (0-100)
5. If confidence < 90:
   - Request user email for escalation
   - Trigger notify-admin action group
6. If confidence >= 90:
   - Return response with citations
7. Send responses back to client via WebSocket
8. Log interaction for analytics
```

**Environment Variables:**
- `WS_API_ENDPOINT`: WebSocket API callback URL
- `AGENT_ID`: Bedrock Agent ID
- `AGENT_ALIAS_ID`: Bedrock Agent Alias ID
- `LOG_CLASSIFIER_FN_NAME`: logclassifier Lambda name

**Permissions:**
- Bedrock full access (invoke agent, query knowledge base)
- API Gateway invoke (send WebSocket messages)
- S3 read access (knowledge base bucket)
- Invoke logclassifier Lambda

**Timeout**: 120 seconds (supports long-running Bedrock calls)

---

#### logclassifier
**Runtime**: Python 3.12
**Trigger**: Invoked by cfEvaluator after each chat interaction
**Purpose**: AI-powered sentiment analysis and session logging

**Logic:**
```python
1. Receive chat session data (user query, agent response, metadata)
2. Invoke Bedrock Nova Lite model for sentiment analysis
3. Compute sentiment score (0-100)
   - 0-30: Negative sentiment
   - 31-70: Neutral sentiment
   - 71-100: Positive sentiment
4. Store results in DynamoDB (NCMWDashboardSessionlogs)
5. Return sentiment score to cfEvaluator
```

**Environment Variables:**
- `BUCKET`: S3 bucket for log backups
- `DYNAMODB_TABLE`: Session logs table name

**Permissions:**
- DynamoDB read/write (session logs table)
- S3 read access (dashboard logs bucket)
- Bedrock full access (Nova Lite model)

**Timeout**: 30 seconds

---

#### notifyAdmin (Action Group)
**Runtime**: Python 3.12 (Docker build)
**Trigger**: Invoked by Bedrock Agent via action group
**Purpose**: Send email notifications for low-confidence queries

**Logic:**
```python
1. Receive parameters from Bedrock Agent:
   - email: User's email address
   - querytext: Original user question
   - agentResponse: Best partial answer
2. Generate email body with query details
3. Send email via SES to admin
4. Store escalated query in DynamoDB
5. Return success/failure to agent
```

**Environment Variables:**
- `VERIFIED_SOURCE_EMAIL`: Admin email (sender)
- `ADMIN_EMAIL`: Admin email (recipient)
- `ESCALATED_QUERIES_TABLE`: DynamoDB table name

**Permissions:**
- SES send email (restricted to verified email identity)
- DynamoDB write access (escalated queries table)

**Timeout**: 60 seconds

**Action Group Schema** (OpenAPI):
```yaml
openapi: 3.0.0
info:
  title: Notify Admin API
  version: 1.0.0
paths:
  /notify-admin:
    post:
      summary: Notify admin of low-confidence query
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                querytext:
                  type: string
                agentResponse:
                  type: string
      responses:
        '200':
          description: Email sent successfully
```

---

#### emailHandler
**Runtime**: Python 3.12
**Trigger**: Amazon SES (incoming email)
**Purpose**: Process admin replies and update knowledge base

**Logic:**
```python
1. Receive email event from SES
2. Download raw email from S3 (emailBucket)
3. Parse email body (extract admin's answer)
4. Convert email to PDF (or text file)
5. Upload to knowledge base S3 bucket
6. Trigger Bedrock knowledge base sync
7. Monitor sync status until complete
```

**Environment Variables:**
- `SOURCE_BUCKET_NAME`: Email bucket name
- `DESTINATION_BUCKET_NAME`: Knowledge base bucket name
- `KNOWLEDGE_BASE_ID`: Bedrock KB ID
- `DATA_SOURCE_ID`: Bedrock data source ID
- `ADMIN_EMAIL`: Admin email address

**Permissions:**
- S3 read (emailBucket)
- S3 write (knowledge base bucket)
- Bedrock full access (start ingestion job, get job status)
- SES receive message (invoked by SES)

**Memory**: 2048 MB (handles email parsing and PDF generation)
**Timeout**: 2 minutes

---

#### adminFile
**Runtime**: Python 3.12
**Trigger**: API Gateway REST API (`/files`, `/sync`)
**Purpose**: Document management for admin portal

**Operations:**
1. **List Files** (GET `/files`):
   - List all objects in knowledge base S3 bucket
   - Return file metadata (name, size, last modified)

2. **Upload File** (POST `/files`):
   - Receive base64-encoded file from frontend
   - Decode and upload to S3
   - Return success/failure

3. **Download File** (GET `/files/{key}`):
   - Generate pre-signed S3 URL
   - Return URL to frontend (valid for 5 minutes)

4. **Delete File** (DELETE `/files/{key}`):
   - Delete object from S3
   - Return success/failure

5. **Sync Knowledge Base** (POST `/sync`):
   - Start Bedrock ingestion job
   - Return job ID and status

**Environment Variables:**
- `BUCKET_NAME`: Knowledge base bucket name
- `KNOWLEDGE_BASE_ID`: Bedrock KB ID
- `DATA_SOURCE_ID`: Bedrock data source ID

**Permissions:**
- S3 read/write (knowledge base bucket)
- Bedrock full access (start ingestion job)

**Memory**: 1024 MB
**Timeout**: 30 seconds

---

#### sessionLogsFn (Daily Scheduler)
**Runtime**: Python 3.12
**Trigger**: Amazon EventBridge (daily at 23:59 UTC)
**Purpose**: Aggregate daily session logs from CloudWatch

**Logic:**
```python
1. Query CloudWatch Logs Insights for cfEvaluator logs
2. Filter for structured log events (chat sessions)
3. Extract session metadata:
   - session_id, user_id, timestamp
   - user_query, agent_response
   - confidence_score, sentiment_score
   - language, role
4. Store aggregated data in S3 (dashboardLogsBucket)
5. Update DynamoDB with daily statistics
```

**Environment Variables:**
- `GROUP_NAME`: CloudWatch log group name
- `BUCKET`: Dashboard logs bucket name
- `DYNAMODB_TABLE`: Session logs table name

**Permissions:**
- CloudWatch Logs (StartQuery, GetQueryResults)
- S3 write (dashboard logs bucket)
- DynamoDB read/write (session logs table)

**Timeout**: 30 seconds

**Schedule**: Cron expression `cron(59 23 * * ? *)`

---

#### retrieveSessionLogsFn
**Runtime**: Python 3.12
**Trigger**: API Gateway REST API (GET `/session-logs`)
**Purpose**: Retrieve session logs for admin analytics

**Logic:**
```python
1. Parse query parameters:
   - startDate, endDate (date range filter)
   - limit (pagination)
   - sessionId (single session lookup)
2. Query DynamoDB with filters
3. Return session logs as JSON
```

**Environment Variables:**
- `DYNAMODB_TABLE`: Session logs table name

**Permissions:**
- DynamoDB read (session logs table)

**Timeout**: 10 seconds

---

#### escalatedQueriesFn
**Runtime**: Python 3.12
**Trigger**: API Gateway REST API (GET `/escalated-queries`)
**Purpose**: Retrieve escalated queries for admin portal

**Logic:**
```python
1. Parse query parameters:
   - status (pending/resolved)
   - startDate, endDate
2. Query DynamoDB with GSI (StatusIndex)
3. Return escalated queries as JSON
```

**Environment Variables:**
- `ESCALATED_QUERIES_TABLE`: DynamoDB table name

**Permissions:**
- DynamoDB read (escalated queries table)

**Timeout**: 10 seconds

---

#### updateQueryStatusFn
**Runtime**: Python 3.12
**Trigger**: API Gateway REST API (PUT `/escalated-queries`)
**Purpose**: Update escalated query status (admin marks as resolved)

**Logic:**
```python
1. Parse request body:
   - query_id
   - new_status (pending/resolved)
2. Update DynamoDB item
3. Return success/failure
```

**Environment Variables:**
- `ESCALATED_QUERIES_TABLE`: DynamoDB table name

**Permissions:**
- DynamoDB read/write (escalated queries table)

**Timeout**: 10 seconds

---

#### userProfileFn
**Runtime**: Python 3.12
**Trigger**: API Gateway REST API (`/user-profile`, `/recommendations`)
**Purpose**: Manage user profiles and personalized recommendations

**Operations:**
1. **Get Profile** (GET `/user-profile`):
   - Query DynamoDB by userId
   - Return user role, preferences, history

2. **Create/Update Profile** (POST/PUT `/user-profile`):
   - Store user role (Instructor/Learner/Staff)
   - Store language preference
   - Store interaction history

3. **Get Recommendations** (GET `/recommendations`):
   - Fetch user role from profile
   - Return role-specific quick actions:
     - **Instructor**: Course creation, learner tracking, certification
     - **Learner**: Course enrollment, progress tracking, assessments
     - **Staff**: Reports, user management, content moderation

**Environment Variables:**
- `USER_PROFILE_TABLE`: DynamoDB table name
- `USER_POOL_ID`: Cognito User Pool ID

**Permissions:**
- DynamoDB read/write (user profile table)
- Cognito admin actions (update user attributes)

**Timeout**: 30 seconds

---

### 5. AWS Bedrock Layer

#### Bedrock Agent: "Learning Navigator"
**Model**: Claude 3.5 Sonnet v2 (Cross-Region Inference Profile)
**Knowledge Base**: Vector Knowledge Base with Titan Embeddings v2
**Guardrails**: Enabled (content filtering + topic scoping)

**Configuration:**
```typescript
foundationModel: CrossRegionInferenceProfile (US region)
shouldPrepareAgent: true
userInputEnabled: true
knowledgeBases: [LearningNavigatorKB]
instruction: [Detailed prompt with confidence scoring logic]
guardrail: LearningNavigatorGuardrail
```

**Agent Instruction** (System Prompt):
```
You are Learning Navigator, an AI-powered assistant integrated into the
MHFA Learning Ecosystem. You support instructors, learners, and administrators
by helping them navigate training resources, answer FAQs, and provide real-time guidance.

1. On every user question:
   • Query the KB and compute a confidence score (1-100).
   • ALWAYS include citations and source references.
   • **CRITICAL URL PRESERVATION RULES**:
     - Copy URLs EXACTLY from knowledge base
     - NEVER say "visit the website" without including the URL
     - Place URLs on their own line or embedded in response

   • If confidence ≥ 90:
     - Reply with direct answer and confidence percentage
     - Cite specific source documents
     - Include any URLs/links from sources

   • If confidence < 90:
     - Say: "I'm sorry, I don't have a reliable answer right now.
            Could you please share your email so I can escalate this
            to an administrator for further help?"
     - Wait for user to supply email address

2. Once you receive a valid email address:
   • Call action group function notify-admin with parameters:
     - email: user's email
     - querytext: original question
     - agentResponse: best partial answer
   • Reply: "Thanks! An administrator has been notified and will
            follow up at [email]. Would you like to ask any other questions?"

3. Scope: MHFA training, certification, MHFA Connect platform,
   instructor policies, learner courses, administrative procedures,
   National Council programs, mental wellness, crisis support.

   For out-of-scope questions, say: "I'm Learning Navigator for the
   MHFA Learning Ecosystem. I help with training resources, courses,
   instructor/learner support, and administrative guidance."
```

---

#### Knowledge Base
**Type**: Vector Knowledge Base
**Embeddings Model**: Amazon Titan Embed Text v2 (1024 dimensions)
**Data Source**: S3 bucket (`national-council-s3-pdfs`)
**Parsing Strategy**: Bedrock Data Automation (handles PDFs, images, tables)

**Configuration:**
```typescript
embeddingsModel: TITAN_EMBED_TEXT_V2_1024
instruction: "Support MHFA Learning Ecosystem users with training resources,
              course navigation, and administrative guidance."
supplementalDataStorageLocations: [S3 bucket for multimodal data]
```

**Data Source Settings:**
- **Bucket**: `national-council-s3-pdfs`
- **Parsing**: Bedrock Data Automation (extracts text, images, tables)
- **Sync**: Manual (triggered via API) or automatic (scheduled)
- **Chunking**: Default (300 tokens per chunk, 20% overlap)

**Indexing Process:**
```
1. Upload PDF documents to S3
2. Trigger ingestion job via API or console
3. Bedrock parses documents (text extraction)
4. Bedrock chunks content (300 token chunks)
5. Bedrock generates embeddings (Titan v2)
6. Bedrock stores vectors in managed vector store
7. Bedrock indexes for semantic search
8. Knowledge base status: "Available"
```

**Query Process:**
```
1. Agent receives user query
2. Agent generates query embedding (Titan v2)
3. Agent performs vector similarity search in KB
4. Agent retrieves top K relevant chunks (K=5 by default)
5. Agent includes chunks in context for LLM
6. LLM generates response with citations
```

---

#### Guardrails
**Name**: LearningNavigator-Guardrails
**Purpose**: Enforce content safety and topic relevance

**Content Filters:**
| Filter Type | Input Strength | Output Strength | Modalities |
|-------------|----------------|-----------------|------------|
| Hate Speech | HIGH | MEDIUM | TEXT, IMAGE |
| Insults | HIGH | MEDIUM | TEXT, IMAGE |
| Sexual Content | HIGH | MEDIUM | TEXT, IMAGE |
| Violence | HIGH | MEDIUM | TEXT, IMAGE |
| Misconduct | HIGH | MEDIUM | TEXT, IMAGE |
| Prompt Attack | HIGH | NONE | TEXT, IMAGE |

**Blocked Outputs Messaging:**
```
"I can only assist with MHFA Learning Ecosystem topics: training,
courses, instructor/learner support, and administrative guidance."
```

**How Guardrails Work:**
```
1. User input passes through guardrail (input filter)
2. If blocked → Return blocked message
3. If passed → Send to agent
4. Agent generates response
5. Response passes through guardrail (output filter)
6. If blocked → Return blocked message
7. If passed → Return to user
```

---

#### Foundation Models Used

| Model | Use Case | Cost (per 1M tokens) |
|-------|----------|----------------------|
| **Claude 3.5 Sonnet v2** | Main chatbot responses | Input: $3, Output: $15 |
| **Claude Haiku** | Fast responses (potential optimization) | Input: $0.25, Output: $1.25 |
| **Nova Lite** | Sentiment analysis | Input: $0.06, Output: $0.24 |
| **Titan Embed Text v2** | Vector embeddings (1024 dim) | $0.02 per 1M tokens |

---

### 6. Data Storage Layer

#### Amazon S3

**Bucket 1: national-council-s3-pdfs** (Knowledge Base)
- **Purpose**: Store PDF documents for knowledge base
- **Contents**: MHFA training materials, guides, FAQs
- **Access**: Read by cfEvaluator, Read/Write by adminFile, emailHandler
- **Versioning**: Recommended for production
- **Lifecycle Policy**: Archive to Glacier after 90 days (cost optimization)

**Bucket 2: emailBucket**
- **Purpose**: Store incoming emails from SES
- **Contents**: Raw email messages (MIME format)
- **Access**: Write by SES, Read by emailHandler
- **Lifecycle Policy**: Delete after 7 days (temporary storage)

**Bucket 3: supplementalBucket**
- **Purpose**: Multimodal data extracted from documents
- **Contents**: Images, tables, charts from PDFs
- **Access**: Read/Write by Bedrock Knowledge Base
- **Auto-delete**: Yes (ephemeral data)

**Bucket 4: dashboardLogsBucket**
- **Purpose**: Archived session logs
- **Contents**: Daily aggregated logs from CloudWatch
- **Access**: Write by sessionLogsFn, Read by logclassifier
- **Retention**: Indefinite (analytics)

---

#### Amazon DynamoDB

**Table 1: NCMWDashboardSessionlogs**
- **Purpose**: Store chat session logs and sentiment scores
- **Partition Key**: `session_id` (STRING)
- **Sort Key**: `timestamp` (STRING, ISO 8601 format)
- **Attributes**:
  - `user_id` (STRING, optional for guests)
  - `user_query` (STRING)
  - `agent_response` (STRING)
  - `confidence_score` (NUMBER, 0-100)
  - `sentiment_score` (NUMBER, 0-100)
  - `language` (STRING, EN or ES)
  - `role` (STRING, Instructor/Learner/Staff/Guest)
- **TTL**: None (historical analytics)
- **Capacity**: On-demand (auto-scaling)

**Table 2: NCMWEscalatedQueries**
- **Purpose**: Track low-confidence queries sent to admin
- **Partition Key**: `query_id` (STRING, UUID)
- **Sort Key**: `timestamp` (STRING)
- **Attributes**:
  - `user_email` (STRING)
  - `query_text` (STRING)
  - `agent_response` (STRING)
  - `status` (STRING, pending/resolved)
  - `admin_reply` (STRING, optional)
  - `resolved_at` (STRING, timestamp)
- **Global Secondary Index (GSI)**:
  - **Index Name**: `StatusIndex`
  - **Partition Key**: `status`
  - **Sort Key**: `timestamp`
  - **Projection**: ALL
  - **Use Case**: Query all pending/resolved queries

**Table 3: NCMWUserProfiles**
- **Purpose**: Store user preferences and profiles
- **Partition Key**: `userId` (STRING, Cognito sub or guest UUID)
- **Attributes**:
  - `role` (STRING, Instructor/Learner/Staff)
  - `language` (STRING, EN or ES)
  - `preferences` (MAP, customizable)
  - `interaction_history` (LIST, recent queries)
  - `created_at` (STRING, timestamp)
  - `last_login` (STRING, timestamp)
- **TTL**: None (persistent)

---

### 7. Email Service (Amazon SES)

#### Email Sending
**Purpose**: Send admin notifications for escalated queries

**Configuration:**
- **Verified Identity**: Admin email address (must be verified)
- **Sandbox Mode**: Default (requires production access request)
- **Sending Quota** (Sandbox): 200 emails/day, 1 email/second
- **Sending Quota** (Production): 50,000 emails/day (can request increase)

**Email Template** (Escalation Notification):
```
Subject: Learning Navigator - Query Requires Expert Attention

Body:
Hello,

A user has submitted a query that requires expert attention:

User Email: {user_email}
Query: {query_text}

Our AI assistant's response (confidence: {confidence_score}%):
{agent_response}

Please respond directly to the user at {user_email} with a detailed answer.

Thank you,
Learning Navigator
```

---

#### Email Receiving (Ingestion)
**Purpose**: Capture admin replies and add to knowledge base

**Receipt Rule Set:**
- **Name**: `learning-navigator-email-rules`
- **Status**: Active (set via CDK custom resource)
- **Recipients**: Admin email address

**Receipt Rule:**
- **Name**: `ProcessIncomingEmail`
- **Recipients**: [admin@clientdomain.com]
- **Scan Enabled**: Yes (spam/virus scanning)
- **TLS Policy**: OPTIONAL
- **Actions**:
  1. **Store in S3**: Save raw email to `emailBucket/incoming/`
  2. **Trigger Lambda**: Invoke `emailHandler` function

**MX Records** (DNS Configuration):
```
Domain: clientdomain.com
Type: MX
Priority: 10
Value: inbound-smtp.us-west-2.amazonaws.com
```

---

### 8. Monitoring & Logging (Amazon CloudWatch)

#### Log Groups
| Log Group | Purpose | Retention |
|-----------|---------|-----------|
| `/aws/lambda/websocketHandler` | WebSocket messages | 7 days |
| `/aws/lambda/cfEvaluator` | Chat processing logs | 14 days |
| `/aws/lambda/logclassifier` | Sentiment analysis | 7 days |
| `/aws/lambda/emailHandler` | Email processing | 7 days |
| `/aws/lambda/adminFile` | File operations | 7 days |
| `/aws/lambda/sessionLogsFn` | Daily aggregation | 7 days |
| All other Lambdas | Function logs | 7 days |

**Log Insights Queries** (Example):
```sql
-- Find all low-confidence queries
fields @timestamp, session_id, confidence_score, user_query
| filter confidence_score < 90
| sort @timestamp desc
| limit 100

-- Calculate average sentiment by day
fields @timestamp, sentiment_score
| stats avg(sentiment_score) by bin(@timestamp, 1d)
```

---

#### Metrics
**Lambda Metrics:**
- Invocations (count)
- Errors (count)
- Duration (milliseconds, p50/p90/p99)
- Throttles (count)
- Concurrent Executions (count)

**API Gateway Metrics:**
- Request Count (count)
- 4XXError (count)
- 5XXError (count)
- Latency (milliseconds)
- WebSocket Connection Count (gauge)
- WebSocket Message Count (count)

**DynamoDB Metrics:**
- ConsumedReadCapacityUnits (count)
- ConsumedWriteCapacityUnits (count)
- ThrottledRequests (count)
- SystemErrors (count)

**Bedrock Metrics:**
- Invocations (count)
- ModelInvocationLatency (milliseconds)
- InputTokens (count)
- OutputTokens (count)
- ClientErrors (count)
- ServerErrors (count)

---

#### Recommended Alarms

**Critical Alarms:**
```yaml
1. Lambda Error Rate > 5%
   Metric: Errors / Invocations
   Threshold: 0.05
   Period: 5 minutes
   Action: SNS notification to DevOps team

2. API Gateway 5XX Errors
   Metric: 5XXError
   Threshold: 5 errors in 5 minutes
   Action: SNS notification + PagerDuty

3. DynamoDB Throttling
   Metric: ThrottledRequests
   Threshold: 1 throttle
   Action: SNS notification (increase capacity)

4. Bedrock High Cost
   Metric: InputTokens + OutputTokens
   Threshold: 10M tokens/day
   Action: SNS notification (budget alert)

5. WebSocket Connection Failures
   Metric: 4XXError on $connect route
   Threshold: 10 errors in 5 minutes
   Action: SNS notification
```

---

### 9. Security & IAM Layer

#### IAM Roles

**Role 1: bedrockRoleAgent**
- **Principal**: `bedrock.amazonaws.com`
- **Policies**:
  - AmazonS3FullAccess (knowledge base access)
  - AmazonBedrockFullAccess (agent execution)
  - CloudWatchFullAccessV2 (logging)
- **Purpose**: Allows Bedrock Agent to read S3, invoke models, write logs

**Role 2: Lambda Execution Roles** (per function)
- **Principal**: `lambda.amazonaws.com`
- **Base Policies**:
  - AWSLambdaBasicExecutionRole (CloudWatch logs)
  - Custom policies for function-specific resources
- **Examples**:
  - `cfEvaluator`: Bedrock, API Gateway, S3 read
  - `adminFile`: S3 read/write, Bedrock (sync)
  - `notifyAdmin`: SES send email, DynamoDB write
  - `emailHandler`: S3 read/write, Bedrock, SES receive

**Role 3: Cognito Authenticated Role**
- **Principal**: `cognito-identity.amazonaws.com`
- **Policies**:
  - S3 PutObject (knowledge base bucket)
  - S3 GetObject (knowledge base bucket)
- **Purpose**: Allows authenticated users to upload/download documents

---

#### Security Best Practices Implemented

1. **Least Privilege IAM Policies**
   - Each Lambda has only the permissions it needs
   - SES restricted to verified email identity
   - S3 access restricted to specific buckets

2. **Encryption at Rest**
   - S3: SSE-S3 (server-side encryption)
   - DynamoDB: AWS managed encryption
   - Secrets Manager: KMS encryption

3. **Encryption in Transit**
   - API Gateway: TLS 1.2+
   - WebSocket: WSS (TLS)
   - Amplify: HTTPS only (SSL certificate via ACM)

4. **Authentication & Authorization**
   - Cognito User Pool: Email verification required
   - API Gateway: Cognito User Pool Authorizer (JWT validation)
   - Guest Access: No authentication (read-only chat)

5. **Network Security**
   - Lambda: No VPC required (serverless)
   - S3: Private buckets (no public access)
   - DynamoDB: Private tables

6. **Content Security**
   - Bedrock Guardrails: Content filtering (HIGH input, MEDIUM output)
   - API Gateway: CORS restrictions
   - SES: Spam scanning enabled

7. **Secrets Management**
   - GitHub Token: Stored in Secrets Manager
   - Admin Email: Context parameter (not hardcoded)
   - API Keys: Environment variables (encrypted)

---

## Data Flow Diagrams

### Flow 1: Guest User Chat (High Confidence)

```
┌──────────┐
│  Guest   │
│  User    │
└────┬─────┘
     │
     │ 1. Opens chat
     │ 2. Types query: "What is MHFA?"
     ▼
┌─────────────────────────┐
│  React App (Amplify)    │
│  • Establishes WebSocket│
│  • Sends message         │
└────┬────────────────────┘
     │
     │ 3. WebSocket message
     ▼
┌─────────────────────────┐
│  API Gateway (WebSocket)│
│  • Routes to Lambda     │
└────┬────────────────────┘
     │
     │ 4. Invokes
     ▼
┌─────────────────────────┐
│  websocketHandler       │
│  • Extracts message     │
│  • Invokes cfEvaluator  │
└────┬────────────────────┘
     │
     │ 5. Invokes (async)
     ▼
┌─────────────────────────┐
│  cfEvaluator            │
│  • Prepares context     │
│  • Invokes Bedrock Agent│
└────┬────────────────────┘
     │
     │ 6. Invoke Agent
     ▼
┌─────────────────────────┐
│  Bedrock Agent          │
│  • Queries KB           │
│  • Generates embedding  │
│  • Retrieves chunks     │
└────┬────────────────────┘
     │
     │ 7. Vector search
     ▼
┌─────────────────────────┐
│  Knowledge Base (Bedrock)│
│  • Returns relevant     │
│    chunks with citations│
└────┬────────────────────┘
     │
     │ 8. Chunks + citations
     ▼
┌─────────────────────────┐
│  Bedrock Agent (LLM)    │
│  • Generates response   │
│  • Computes confidence: │
│    95% (HIGH)           │
└────┬────────────────────┘
     │
     │ 9. Streams response
     ▼
┌─────────────────────────┐
│  cfEvaluator            │
│  • Receives stream      │
│  • Sends to WebSocket   │
│  • Invokes logclassifier│
└────┬────────────────────┘
     │
     │ 10. WebSocket messages
     ▼
┌─────────────────────────┐
│  React App (Amplify)    │
│  • Displays response    │
│  • Shows confidence     │
│  • Renders citations    │
└─────────────────────────┘
     │
     │ 11. (Background)
     ▼
┌─────────────────────────┐
│  logclassifier          │
│  • Sentiment: 85 (good) │
│  • Stores in DynamoDB   │
└─────────────────────────┘
```

**Response Example:**
```
Mental Health First Aid (MHFA) is a skills-based training that teaches
participants how to identify, understand, and respond to signs of mental
health and substance use challenges.

(confidence: 95%)

Sources:
• MHFA_Overview_Guide.pdf, page 3
• Instructor_Handbook_2024.pdf, page 12
```

---

### Flow 2: Guest User Chat (Low Confidence → Email Escalation)

```
┌──────────┐
│  Guest   │
│  User    │
└────┬─────┘
     │
     │ 1. Types complex query:
     │    "How do I appeal a rejected certification?"
     ▼
┌─────────────────────────┐
│  React App → WebSocket  │
│  → websocketHandler     │
│  → cfEvaluator          │
└────┬────────────────────┘
     │
     │ 2. Invokes Bedrock Agent
     ▼
┌─────────────────────────┐
│  Bedrock Agent          │
│  • Queries KB           │
│  • Finds limited info   │
│  • Confidence: 45% (LOW)│
└────┬────────────────────┘
     │
     │ 3. Returns response with escalation prompt
     ▼
┌─────────────────────────┐
│  cfEvaluator            │
│  • Detects low          │
│    confidence < 90      │
│  • Returns escalation   │
│    message              │
└────┬────────────────────┘
     │
     │ 4. Displays message
     ▼
┌─────────────────────────┐
│  React App              │
│  Shows: "I'm sorry, I   │
│  don't have a reliable  │
│  answer. Could you share│
│  your email for admin   │
│  escalation?"           │
└─────────────────────────┘
     │
     │ 5. User enters email: user@example.com
     ▼
┌─────────────────────────┐
│  React App → WebSocket  │
│  → websocketHandler     │
│  → cfEvaluator          │
└────┬────────────────────┘
     │
     │ 6. Invokes Bedrock Agent with email
     ▼
┌─────────────────────────┐
│  Bedrock Agent          │
│  • Calls action group:  │
│    notify-admin         │
└────┬────────────────────┘
     │
     │ 7. Invokes Lambda
     ▼
┌─────────────────────────┐
│  notifyAdmin Lambda     │
│  • Receives params:     │
│    - email: user@...    │
│    - query: "How do..."│
│    - agentResponse: ... │
└────┬────────────────────┘
     │
     │ 8. Sends email via SES
     ▼
┌─────────────────────────┐
│  Amazon SES             │
│  To: admin@client.com   │
│  Subject: Query Requires│
│           Expert Attn   │
│  Body: [query details]  │
└────┬────────────────────┘
     │
     │ 9. Stores in DynamoDB
     ▼
┌─────────────────────────┐
│  NCMWEscalatedQueries   │
│  • query_id: UUID       │
│  • status: pending      │
│  • user_email: ...      │
│  • query_text: ...      │
└─────────────────────────┘
     │
     │ 10. Returns success to agent
     ▼
┌─────────────────────────┐
│  React App              │
│  Shows: "Thanks! An     │
│  administrator has been │
│  notified and will      │
│  follow up at user@...  │
│  Would you like to ask  │
│  any other questions?"  │
└─────────────────────────┘
```

---

### Flow 3: Admin Reply Ingestion

```
┌──────────┐
│  Admin   │
│  User    │
└────┬─────┘
     │
     │ 1. Receives email from SES
     │ 2. Replies with detailed answer
     ▼
┌─────────────────────────┐
│  Email Client (Gmail)   │
│  To: admin@client.com   │
│  Subject: Re: Query ... │
│  Body: [detailed answer]│
���────┬────────────────────┘
     │
     │ 3. Email sent to SES
     ▼
┌─────────────────────────┐
│  Amazon SES             │
│  • Receipt rule matches │
│  • Triggers actions:    │
│    1. Store in S3       │
│    2. Invoke Lambda     │
└────┬────────────────────┘
     │
     │ 4. Stores raw email
     ▼
┌─────────────────────────┐
│  S3: emailBucket        │
│  Key: incoming/MSGID    │
│  Content: MIME email    │
└─────────────────────────┘
     │
     │ 5. Invokes Lambda
     ▼
┌─────────────────────────┐
│  emailHandler Lambda    │
│  • Downloads from S3    │
│  • Parses email body    │
│  • Extracts answer text │
└────┬────────────────────┘
     │
     │ 6. Converts to PDF
     ▼
┌─────────────────────────┐
│  emailHandler Lambda    │
│  • Generates PDF with:  │
│    - Original query     │
│    - Admin answer       │
│    - Metadata           │
└────┬────────────────────┘
     │
     │ 7. Uploads to KB bucket
     ▼
┌─────────────────────────┐
│  S3: national-council-  │
│      s3-pdfs            │
│  Key: admin-replies/... │
│  Content: PDF file      │
└─────────────────────────┘
     │
     │ 8. Triggers KB sync
     ▼
┌─────────────────────────┐
│  Bedrock Knowledge Base │
│  • Starts ingestion job │
│  • Parses new PDF       │
│  • Generates embeddings │
│  • Indexes content      │
└────┬────────────────────┘
     │
     │ 9. Updates KB status
     ▼
┌─────────────────────────┐
│  Bedrock Knowledge Base │
│  Status: Available      │
│  • New content indexed  │
│  • Ready for queries    │
└─────────────────────────┘
     │
     │ 10. Future queries can now access admin's answer
     ▼
┌─────────────────────────┐
│  Next User Query        │
│  • Same question asked  │
│  • KB returns admin's   │
│    detailed answer      │
│  • Confidence: 95%      │
└─────────────────────────┘
```

---

### Flow 4: Admin Document Upload

```
┌──────────┐
│  Admin   │
│  User    │
└────┬─────┘
     │
     │ 1. Login to admin portal
     ▼
┌─────────────────────────┐
│  Cognito User Pool      │
│  • Validates credentials│
│  • Returns JWT tokens   │
└────┬────────────────────┘
     │
     │ 2. JWT tokens stored
     ▼
┌─────────────────────────┐
│  React App (Admin)      │
│  • Navigates to Docs tab│
│  • Clicks "Upload"      │
│  • Selects PDF file     │
└────┬────────────────────┘
     │
     │ 3. POST /files with file data
     ▼
┌─────────────────────────┐
│  API Gateway (REST)     │
│  • Validates JWT        │
│  • Authorizes request   │
└────┬────────────────────┘
     │
     │ 4. Invokes Lambda
     ▼
┌─────────────────────────┐
│  adminFile Lambda       │
│  • Decodes base64 file  │
│  • Uploads to S3        │
└────┬────────────────────┘
     │
     │ 5. PutObject
     ▼
┌─────────────────────────┐
│  S3: national-council-  │
│      s3-pdfs            │
│  Key: new-document.pdf  │
│  Size: 2.5 MB           │
└─────────────────────────┘
     │
     │ 6. Returns success
     ▼
┌─────────────────────────┐
│  React App (Admin)      │
│  Shows: "Upload         │
│         successful!"    │
│  • Displays "Sync KB"   │
│    button               │
└─────────────────────────┘
     │
     │ 7. Admin clicks "Sync KB"
     ▼
┌─────────────────────────┐
│  POST /sync             │
│  → API Gateway          │
│  → adminFile Lambda     │
└────┬────────────────────┘
     │
     │ 8. Start ingestion job
     ▼
┌─────────────────────────┐
│  Bedrock Knowledge Base │
│  Job ID: job-123        │
│  Status: IN_PROGRESS    │
└────┬────────────────────┘
     │
     │ 9. Polls status every 10 seconds
     ▼
┌─────────────────────────┐
│  React App (Admin)      │
│  Shows: "Syncing... 45%"│
└─────────────────────────┘
     │
     │ 10. Ingestion complete (5-15 min)
     ▼
┌─────────────────────────┐
│  Bedrock Knowledge Base │
│  Status: COMPLETE       │
│  • 1 new document       │
│  • 23 new chunks        │
│  • 23 new embeddings    │
└────┬────────────────────┘
     │
     │ 11. Displays success
     ▼
┌─────────────────────────┐
│  React App (Admin)      │
│  Shows: "Knowledge Base │
│         synced! New     │
│         document is     │
│         ready for       │
│         queries."       │
└─────────────────────────┘
```

---

## Security Architecture

### Defense in Depth Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Edge Security (CloudFront - Optional)              │
│  • DDoS protection (AWS Shield)                              │
│  • WAF rules (rate limiting, geo-blocking)                   │
│  • SSL/TLS termination                                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 2: Application Security (API Gateway)                 │
│  • CORS policies                                             │
│  • Throttling & rate limiting                                │
│  • JWT validation (Cognito Authorizer)                       │
│  • Request/response validation                               │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 3: Authentication (Cognito)                           │
│  • Email verification                                        │
│  • Password policies                                         │
│  • MFA support (optional)                                    │
│  • Account recovery                                          │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 4: Authorization (IAM)                                │
│  • Least privilege policies                                  │
│  • Service-specific roles                                    │
│  • Resource-based policies                                   │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 5: Business Logic Security (Lambda)                   │
│  • Input validation                                          │
│  • Output sanitization                                       │
│  • Error handling (no sensitive data in errors)              │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 6: Content Security (Bedrock Guardrails)              │
│  • Content filtering (hate, violence, sexual, etc.)          │
│  • Topic enforcement (MHFA only)                             │
│  • Prompt injection prevention                               │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Layer 7: Data Security (Encryption)                         │
│  • At Rest: S3 (SSE-S3), DynamoDB (AWS managed)              │
│  • In Transit: TLS 1.2+ (API Gateway, Amplify)               │
│  • Secrets: Secrets Manager (KMS encrypted)                  │
└──────────────────────────────────────────────────────────────┘
```

---

### Threat Model & Mitigations

| Threat | Risk Level | Mitigation |
|--------|-----------|------------|
| **Unauthorized API Access** | HIGH | Cognito JWT validation, API Gateway authorizer |
| **SQL Injection** | N/A | No SQL database (DynamoDB NoSQL) |
| **XSS (Cross-Site Scripting)** | MEDIUM | React auto-escaping, Content Security Policy |
| **CSRF** | LOW | SPA architecture (no cookies for auth) |
| **DDoS** | MEDIUM | API Gateway throttling, AWS Shield |
| **Data Breach (S3)** | HIGH | Private buckets, IAM policies, encryption |
| **Prompt Injection** | MEDIUM | Bedrock Guardrails, prompt engineering |
| **Sensitive Data in Logs** | MEDIUM | Log scrubbing, CloudWatch Logs retention |
| **Insider Threat** | LOW | IAM audit logs, CloudTrail monitoring |
| **Supply Chain Attack** | MEDIUM | npm audit, Dependabot, CDK version pinning |

---

## Scalability & Performance

### Auto-Scaling Components

| Component | Scaling Method | Limits |
|-----------|----------------|--------|
| **AWS Lambda** | Auto-scale (1000 concurrent/region) | Adjustable via quota request |
| **API Gateway** | Auto-scale (10,000 RPS default) | Adjustable via quota request |
| **DynamoDB** | On-demand (auto-scale read/write) | Unlimited |
| **Bedrock** | Auto-scale (regional quotas) | Model-specific (e.g., 100 RPM) |
| **S3** | Auto-scale (unlimited) | 5,500 GET/3,500 PUT per prefix/second |
| **Amplify** | Auto-scale (CDN) | Unlimited |

---

### Performance Optimizations

**Frontend:**
- React code splitting (lazy loading)
- Material-UI tree shaking
- Gzip compression (Amplify)
- CloudFront CDN (optional)
- Service worker for offline support (future)

**Backend:**
- Lambda reserved concurrency (prevent cold starts)
- Lambda SnapStart for Python (future, Java only currently)
- DynamoDB DAX caching (future, for read-heavy workloads)
- S3 Transfer Acceleration (for large uploads)
- Bedrock cross-region inference (lower latency)

**Database:**
- DynamoDB single-table design (reduce queries)
- GSI for efficient status filtering
- Sparse indexes for optional attributes
- DynamoDB Streams for real-time processing (future)

---

### Latency Breakdown (Typical)

```
User sends message → Response displayed: ~3-8 seconds

1. WebSocket message (user → API Gateway): 50-100 ms
2. websocketHandler Lambda (cold start): 500-1000 ms (first time), 10-50 ms (warm)
3. cfEvaluator Lambda (cold start): 1000-2000 ms (first time), 50-100 ms (warm)
4. Bedrock Agent invocation:
   - Knowledge Base query: 500-1000 ms
   - Claude 3.5 Sonnet generation: 2000-5000 ms (streaming)
5. WebSocket response (API Gateway → user): 50-100 ms

Total: 3-8 seconds (typical)

Cold start impact: +2-3 seconds (first request after idle)
```

**Cold Start Mitigation:**
- Provisioned concurrency (costs extra, keeps Lambdas warm)
- EventBridge scheduled pings (keep functions warm)
- Lambda SnapStart (Java only, future for Python)

---

## Cost Optimization

### Cost Breakdown (Estimated Monthly)

**Baseline Scenario: 10,000 chat messages/month**

| Service | Usage | Cost |
|---------|-------|------|
| **Bedrock** | 500K input + 1M output tokens | $18 |
| **Lambda** | 50K invocations, 512MB, 5s avg | $5 |
| **API Gateway** | 10K WebSocket messages + 5K REST | $4 |
| **DynamoDB** | 50K writes, 100K reads, 10GB storage | $8 |
| **S3** | 50GB storage, 10K requests | $3 |
| **Amplify** | 1 app, 20GB data transfer | $8 |
| **Cognito** | 100 monthly active users | $5 |
| **SES** | 500 emails/month | $1 |
| **CloudWatch** | 5GB logs, 10 metrics | $8 |
| **Route 53** | 1 hosted zone | $0.50 |
| **Total** | | **$60.50** |

---

### Cost Optimization Strategies

1. **Bedrock:**
   - Use Haiku for simple queries (10x cheaper)
   - Implement caching for repeated queries
   - Optimize prompts (fewer input tokens)
   - Use cross-region inference (volume discounts)

2. **Lambda:**
   - Right-size memory (lower memory = lower cost)
   - Reduce timeout (avoid paying for idle time)
   - Use ARM architecture (20% cheaper)
   - Batch DynamoDB writes

3. **DynamoDB:**
   - Use on-demand for unpredictable workloads
   - Switch to provisioned if usage is steady
   - Enable TTL for temporary data
   - Use sparse indexes

4. **S3:**
   - Lifecycle policies (Glacier after 90 days)
   - Enable S3 Intelligent-Tiering
   - Delete temporary files (emailBucket)

5. **CloudWatch:**
   - Reduce log retention (7 days vs. 30 days)
   - Filter logs (exclude debug in production)
   - Use Logs Insights instead of exporting

---

## Disaster Recovery

### Backup Strategy

**S3 Buckets:**
- **Versioning**: Enabled on knowledge base bucket
- **Cross-Region Replication**: Optional (for critical data)
- **Lifecycle**: Archive to Glacier after 90 days

**DynamoDB Tables:**
- **Point-in-Time Recovery (PITR)**: Enabled (35-day retention)
- **On-Demand Backups**: Weekly automated backups
- **Cross-Region Replication**: Optional (DynamoDB Global Tables)

**Lambda Functions:**
- **Source Code**: Backed up in GitHub repository
- **CDK Definitions**: Version controlled in Git
- **Re-deployment**: `cdk deploy --all` (5-10 minutes)

---

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Component | RPO | RTO | Recovery Method |
|-----------|-----|-----|-----------------|
| **Lambda Functions** | 0 (stateless) | 10 min | Redeploy from GitHub |
| **DynamoDB** | 5 min (PITR) | 30 min | Restore from PITR |
| **S3 (Knowledge Base)** | 0 (versioning) | 5 min | Restore previous version |
| **Cognito** | 0 (managed) | 0 | Managed by AWS |
| **Bedrock** | 0 (managed) | 0 | Managed by AWS |
| **Amplify** | 0 (Git) | 15 min | Rebuild from GitHub |

---

### Disaster Recovery Plan

**Scenario 1: Accidental Lambda Code Deletion**
1. Checkout previous Git commit
2. Run `cdk deploy --all`
3. Wait 10 minutes for deployment
4. Verify Lambda functions operational

**Scenario 2: DynamoDB Table Corruption**
1. Identify corruption time (e.g., 2 hours ago)
2. Create new table from PITR (restore to 2 hours ago)
3. Update Lambda environment variables with new table name
4. Redeploy Lambda functions
5. Verify data integrity

**Scenario 3: S3 Knowledge Base Data Loss**
1. Enable S3 versioning (if not already)
2. List object versions: `aws s3api list-object-versions`
3. Restore deleted objects: `aws s3api restore-object`
4. Trigger knowledge base sync
5. Verify chatbot responses

**Scenario 4: Regional Outage (us-west-2)**
1. Deploy to secondary region (us-east-1) using CDK
2. Update DNS (Route 53) to point to new region
3. Restore DynamoDB from backup to new region
4. Copy S3 data to new region (if not using CRR)
5. Wait for DNS propagation (1-5 minutes)

---

## Conclusion

This AWS architecture provides:
- ✅ **Serverless & Scalable**: Auto-scales from 0 to millions of requests
- ✅ **Cost-Effective**: Pay-per-use pricing, ~$60-300/month
- ✅ **Highly Available**: Multi-AZ by default (99.99% SLA)
- ✅ **Secure**: Defense-in-depth, encryption, least privilege
- ✅ **AI-Powered**: Bedrock Claude 3.5 Sonnet with knowledge base
- ✅ **Real-Time**: WebSocket for streaming chat responses
- ✅ **Maintainable**: Infrastructure as Code (CDK), version controlled

**Next Steps:**
1. Deploy to production using CLIENT_DEPLOYMENT_GUIDE.md
2. Set up CloudWatch alarms and dashboards
3. Enable S3 versioning and DynamoDB PITR
4. Request SES production access for email notifications
5. Monitor costs and optimize based on actual usage

---

**Document Version:** 1.0
**Last Updated:** January 5, 2026
**Prepared By:** Development Team
**Architecture Diagram Tools:** ASCII art (for Markdown compatibility)
