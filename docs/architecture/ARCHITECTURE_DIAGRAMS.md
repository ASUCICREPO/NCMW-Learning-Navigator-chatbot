# MHFA Learning Navigator - Architecture Diagrams

## 1. AWS Infrastructure Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Frontend<br/>Hosted on AWS Amplify]
        A1[ChatBody Component]
        A2[Admin Dashboard]
        A3[Profile & Recommendations]
    end

    subgraph "Authentication"
        B[AWS Cognito<br/>User Pool]
    end

    subgraph "API Gateway Layer"
        C[WebSocket API Gateway]
        D[REST API Gateway]
    end

    subgraph "Lambda Functions"
        E1[WebSocket Handler]
        E2[cfEvaluator]
        E3[Log Classifier]
        E4[Email Reply Handler]
        E5[Notify Admin]
        E6[Escalated Queries Handler]
        E7[Session Logs Handler]
        E8[User Profile Handler]
        E9[File API Handler]
    end

    subgraph "AI/ML Services"
        F[AWS Bedrock Agent<br/>Learning Navigator]
        F1[Knowledge Base<br/>OpenSearch Serverless]
        F2[Guardrail]
        F3[Claude Sonnet 4.5<br/>Cross-Region Inference]
    end

    subgraph "Storage Layer"
        G1[(S3: Knowledge Base PDFs)]
        G2[(S3: Email Bucket)]
        G3[(S3: Supplemental Data)]
        G4[(S3: Dashboard Logs)]
        H1[(DynamoDB: Session Logs)]
        H2[(DynamoDB: Escalated Queries)]
        H3[(DynamoDB: User Profiles)]
    end

    subgraph "Notification Services"
        I[AWS SES<br/>Email Service]
        I1[Receipt Rule Set]
    end

    subgraph "Monitoring & Security"
        J1[CloudWatch Logs]
        J2[IAM Roles & Policies]
        J3[Secrets Manager<br/>GitHub Token]
    end

    A -->|Authenticate| B
    A -->|WebSocket Connection| C
    A -->|REST API Calls| D

    C -->|$sendMessage| E1
    E1 -->|Invoke| E2
    E2 -->|Invoke Agent| F
    E2 -->|Log Classification| E3

    F -->|Query| F1
    F -->|Content Filtering| F2
    F -->|LLM Inference| F3
    F -->|Action Group: notify-admin| E5

    F1 -->|Retrieve Documents| G1
    F1 -->|Store Multimodal Data| G3

    E5 -->|Send Email| I
    E5 -->|Store Query| H2

    I1 -->|Incoming Email| I
    I -->|Store Raw Email| G2
    I -->|Trigger| E4
    E4 -->|Process & Update KB| G1
    E4 -->|Sync KB| F1

    E3 -->|Store Logs| H1
    E3 -->|Upload to S3| G4

    D -->|/escalated-queries| E6
    D -->|/session-logs| E7
    D -->|/user-profile| E8
    D -->|/file-api| E9

    E6 -->|Read/Write| H2
    E7 -->|Read| H1
    E8 -->|Read/Write| H3

    E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 -->|Logs| J1
    E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 -.->|IAM Permissions| J2

    A -.->|GitHub Integration| J3

    style F fill:#FF6B6B
    style F1 fill:#FF6B6B
    style F2 fill:#FF6B6B
    style F3 fill:#FF6B6B
    style A fill:#4ECDC4
    style B fill:#95E1D3
    style I fill:#FFE66D
```

## 2. User Flow Diagram - Chat Interaction

```mermaid
flowchart TD
    Start([User Opens App]) --> Auth{Authenticated?}
    Auth -->|No| Login[Login/Sign Up<br/>via Cognito]
    Auth -->|Yes| ChatUI[Chat Interface]
    Login --> ChatUI

    ChatUI --> SelectLang{Select Language}
    SelectLang --> EN[English]
    SelectLang --> ES[Spanish]

    EN --> ViewWelcome[View Welcome Screen<br/>with Suggested Prompts]
    ES --> ViewWelcome

    ViewWelcome --> TypeQuery[User Types Query]
    TypeQuery --> SendQuery[Send Message via<br/>WebSocket]

    SendQuery --> AgentProcess[Agent Processes Query]
    AgentProcess --> CheckConf{Confidence ≥ 90%?}

    CheckConf -->|Yes| InScopeResp[Agent Provides Answer<br/>with Citations]
    CheckConf -->|No| CheckScope{In Scope?}

    CheckScope -->|Yes| LowConf[Low Confidence Response]
    CheckScope -->|No| OutScope[Out of Scope Response]

    LowConf --> AskEmail[Ask for Email<br/>to Escalate]
    OutScope --> AskEmail

    InScopeResp --> ShowResp[Display Response<br/>with Sources]

    AskEmail --> UserEmail{User Provides<br/>Email?}
    UserEmail -->|Yes| CallNotify[Call notify-admin<br/>Action Group]
    UserEmail -->|No| ShowResp

    CallNotify --> SendAdminEmail[Send Email to Admin<br/>via SES]
    CallNotify --> StoreEscalation[Store in DynamoDB<br/>Escalated Queries]

    SendAdminEmail --> ConfirmEscalation[Show Confirmation<br/>to User]
    StoreEscalation --> ConfirmEscalation

    ConfirmEscalation --> ShowResp

    ShowResp --> NextAction{Next Action?}
    NextAction -->|New Query| TypeQuery
    NextAction -->|View Profile| ProfilePage[Navigate to<br/>Profile & Recommendations]
    NextAction -->|Switch Language| SelectLang
    NextAction -->|Logout| Logout[Logout]

    ProfilePage --> SetRole[Set/Update User Role]
    SetRole --> ViewRecs[View Personalized<br/>Recommendations]
    ViewRecs --> ClickRec{Click Recommendation?}
    ClickRec -->|Yes| AutoQuery[Auto-send Query<br/>to Chat]
    ClickRec -->|No| BackChat[Back to Chat]
    AutoQuery --> AgentProcess
    BackChat --> ChatUI

    Logout --> End([End Session])

    style AgentProcess fill:#FF6B6B
    style SendAdminEmail fill:#FFE66D
    style ChatUI fill:#4ECDC4
    style ProfilePage fill:#95E1D3
```

## 3. Admin User Flow Diagram

```mermaid
flowchart TD
    Start([Admin Opens App]) --> AdminAuth{Admin<br/>Authenticated?}
    AdminAuth -->|No| AdminLogin[Admin Login<br/>via Cognito]
    AdminAuth -->|Yes| Dashboard[Admin Dashboard]
    AdminLogin --> Dashboard

    Dashboard --> ViewOptions{Select Action}

    ViewOptions -->|View Escalated Queries| EscalatedPage[Escalated Queries Page]
    ViewOptions -->|View Session Logs| SessionLogsPage[Session Logs Page]
    ViewOptions -->|Respond to Email| EmailInbox[Check Email Inbox]

    EscalatedPage --> FilterStatus[Filter by Status:<br/>Pending/In Progress/Resolved]
    FilterStatus --> ViewQuery[View Query Details]
    ViewQuery --> UpdateStatus[Update Status &<br/>Add Notes]
    UpdateStatus --> SaveUpdate[Save to DynamoDB]
    SaveUpdate --> Dashboard

    SessionLogsPage --> SelectSession[Select Session]
    SelectSession --> ViewLogs[View Conversation Logs]
    ViewLogs --> AnalyzeLogs[Analyze User Interactions]
    AnalyzeLogs --> Dashboard

    EmailInbox --> ReceiveEmail{Received<br/>Escalation Email?}
    ReceiveEmail -->|Yes| ReplyEmail[Reply to User Email]
    ReceiveEmail -->|No| Dashboard

    ReplyEmail --> SESReceive[SES Receives Reply]
    SESReceive --> S3Store[Store in S3 Email Bucket]
    SESReceive --> TriggerLambda[Trigger Email Handler Lambda]

    TriggerLambda --> ProcessEmail[Extract Attachments<br/>& Content]
    ProcessEmail --> UpdateKB{Has Attachments?}

    UpdateKB -->|Yes| UploadDocs[Upload to Knowledge Base<br/>S3 Bucket]
    UpdateKB -->|No| Complete[Email Processed]

    UploadDocs --> SyncKB[Trigger KB Sync/Ingestion]
    SyncKB --> Complete

    Complete --> Dashboard

    Dashboard --> Logout{Logout?}
    Logout -->|Yes| End([End Session])
    Logout -->|No| ViewOptions

    style Dashboard fill:#4ECDC4
    style SyncKB fill:#FF6B6B
    style SESReceive fill:#FFE66D
    style EscalatedPage fill:#95E1D3
```

## 4. Sequence Diagram - Chat Query Processing

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant WSGateway as WebSocket API Gateway
    participant WSHandler as WebSocket Handler Lambda
    participant CFEval as cfEvaluator Lambda
    participant Agent as Bedrock Agent
    participant KB as Knowledge Base
    participant S3 as S3 (PDFs)
    participant Classifier as Log Classifier Lambda
    participant DDB as DynamoDB (Logs)

    User->>Frontend: Type query & send
    Frontend->>WSGateway: WebSocket: sendMessage
    WSGateway->>WSHandler: Route message
    WSHandler->>CFEval: Invoke with query

    CFEval->>Agent: invoke_agent(query, sessionId)
    Agent->>KB: Search knowledge base
    KB->>S3: Retrieve relevant PDFs
    S3-->>KB: Return PDF content
    KB-->>Agent: Return search results with citations

    Agent->>Agent: Generate response using Claude 4.5
    Agent->>Agent: Apply guardrails
    Agent->>Agent: Calculate confidence score

    alt Confidence >= 90%
        Agent-->>CFEval: Return response + citations
        CFEval->>Classifier: Classify & log interaction
        Classifier->>DDB: Store session log
        CFEval-->>WSGateway: Send response
        WSGateway-->>Frontend: WebSocket response
        Frontend->>User: Display answer with sources
    else Confidence < 90%
        Agent-->>CFEval: Return low confidence indicator
        CFEval-->>WSGateway: Ask for email
        WSGateway-->>Frontend: Request email message
        Frontend->>User: Show email request
        User->>Frontend: Provide email address
        Frontend->>WSGateway: Send email
        WSGateway->>WSHandler: Route email
        WSHandler->>CFEval: Process email
        CFEval->>Agent: Trigger notify-admin action
        Note over Agent: Agent calls notify-admin<br/>action group
    end
```

## 5. Sequence Diagram - Email Escalation Flow

```mermaid
sequenceDiagram
    actor User
    participant Agent as Bedrock Agent
    participant NotifyLambda as Notify Admin Lambda
    participant SES as AWS SES
    actor Admin
    participant S3Email as S3 (Email Bucket)
    participant EmailHandler as Email Reply Handler
    participant S3KB as S3 (Knowledge Base)
    participant KB as Knowledge Base
    participant DDB as DynamoDB (Escalated Queries)

    User->>Agent: Low confidence query + email
    Agent->>NotifyLambda: notify-admin action group<br/>(email, query, response)

    par Send Email
        NotifyLambda->>SES: Send email to admin
        SES->>Admin: Escalation email received
    and Store in Database
        NotifyLambda->>DDB: Store escalated query<br/>(status: pending)
    end

    NotifyLambda-->>Agent: Confirmation
    Agent-->>User: "Admin notified, will follow up"

    Note over Admin: Admin reviews query<br/>and prepares response

    Admin->>SES: Reply to user email<br/>(with attachments)

    SES->>S3Email: Store raw email
    SES->>EmailHandler: Trigger Lambda

    EmailHandler->>S3Email: Read email content
    EmailHandler->>EmailHandler: Parse email & extract attachments

    alt Has PDF Attachments
        EmailHandler->>S3KB: Upload PDFs to KB bucket
        EmailHandler->>KB: Start ingestion job
        KB->>S3KB: Process new documents
        KB->>KB: Update vector embeddings
        KB-->>EmailHandler: Ingestion complete
    end

    EmailHandler->>SES: Forward reply to user
    SES->>User: Receive admin response

    Note over Admin: Admin can also update<br/>query status in dashboard

    Admin->>DDB: Update status to "resolved"
    DDB-->>Admin: Confirmation
```

## 6. Sequence Diagram - User Profile & Recommendations

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant RestAPI as REST API Gateway
    participant ProfileLambda as User Profile Lambda
    participant DDB as DynamoDB (User Profiles)
    participant ChatUI as Chat Interface

    User->>Frontend: Click Profile icon
    Frontend->>RestAPI: GET /user-profile
    RestAPI->>ProfileLambda: Get user profile
    ProfileLambda->>DDB: Query user profile

    alt Profile Exists
        DDB-->>ProfileLambda: Return profile data
        ProfileLambda-->>RestAPI: User role & preferences
        RestAPI-->>Frontend: Profile data
        Frontend->>User: Show profile & recommendations
    else No Profile
        DDB-->>ProfileLambda: No profile found
        ProfileLambda-->>RestAPI: Empty profile
        RestAPI-->>Frontend: No profile
        Frontend->>User: Show role selection screen
    end

    User->>Frontend: Select role<br/>(Instructor/Staff/Learner)
    Frontend->>RestAPI: PUT /user-profile<br/>(role, preferences)
    RestAPI->>ProfileLambda: Update profile
    ProfileLambda->>DDB: Store/Update profile
    DDB-->>ProfileLambda: Confirmation
    ProfileLambda-->>RestAPI: Success
    RestAPI-->>Frontend: Profile updated

    Frontend->>Frontend: Generate role-based<br/>recommendations
    Frontend->>User: Display recommendations:<br/>- Quick Actions<br/>- Suggested Topics<br/>- Recent Updates

    User->>Frontend: Click recommendation query
    Frontend->>ChatUI: Navigate with query
    ChatUI->>ChatUI: Auto-send query to agent

    Note over User,ChatUI: User continues with<br/>chat interaction
```

## 7. Component Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Components"
        A[App.jsx]
        A --> B[ChatBody.jsx]
        A --> C[AdminDashboard.jsx]
        A --> D[Profile.jsx]

        B --> B1[ChatHeader.jsx]
        B --> B2[ChatInput.jsx]
        B --> B3[BotFileCheckReply.jsx]
        B --> B4[UserBubble Component]
        B --> B5[WelcomeScreen Component]

        C --> C1[EscalatedQueries.jsx]
        C --> C2[SessionLogs.jsx]
        C --> C3[AdminAppHeader.jsx]

        D --> D1[RoleSelection.jsx]
        D --> D2[Recommendations.jsx]

        E[AppHeader.jsx]
        F[Switch.jsx - Language Toggle]

        G[LanguageContext.jsx]
        H[recommendationsTranslations.js]
        I[constants.js]
    end

    subgraph "State Management"
        J[React Context]
        J --> J1[Language Context]
        J --> J2[Local Storage<br/>- Auth Token<br/>- Language Preference]
    end

    subgraph "API Integration"
        K[WebSocket Client]
        L[REST API Client]
        M[Cognito SDK]
    end

    B1 --> F
    B1 --> G

    B --> K
    C --> L
    D --> L

    A --> M

    G --> H
    B --> I
    C --> I

    style B fill:#4ECDC4
    style C fill:#95E1D3
    style D fill:#FFE66D
    style K fill:#FF6B6B
    style L fill:#FF6B6B
```

## 8. Data Flow Diagram - Knowledge Base Update

```mermaid
flowchart LR
    subgraph "Data Sources"
        A1[Manual PDF Upload<br/>to S3]
        A2[Admin Email Reply<br/>with Attachments]
    end

    subgraph "Processing"
        B[S3: national-council-s3-pdfs]
        C[Bedrock Data Automation<br/>Parser]
        D[Titan Embeddings Model]
        E[OpenSearch Serverless<br/>Vector Store]
    end

    subgraph "AI Agent"
        F[Bedrock Agent]
        G[Knowledge Base Query]
        H[Claude Sonnet 4.5]
    end

    subgraph "User Interaction"
        I[User Query]
        J[Agent Response<br/>with Citations]
    end

    A1 --> B
    A2 -->|Email Handler Lambda| B

    B --> C
    C -->|Extract Text & Metadata| D
    D -->|Generate Embeddings| E

    I --> F
    F --> G
    G --> E
    E -->|Retrieve Relevant Docs| G
    G --> H
    H -->|Generate Response| J

    B -.->|Store Multimodal Data| S3Supp[S3: Supplemental Bucket]
    S3Supp -.->|Images, Tables| E

    style B fill:#95E1D3
    style E fill:#FF6B6B
    style F fill:#FF6B6B
    style H fill:#FF6B6B
```

## 9. Security & Authentication Flow

```mermaid
flowchart TD
    Start([User Accesses App]) --> LoadApp[Load React App<br/>from Amplify]
    LoadApp --> CheckToken{Auth Token<br/>in LocalStorage?}

    CheckToken -->|No| ShowLogin[Show Login Screen]
    CheckToken -->|Yes| ValidateToken[Validate Token<br/>with Cognito]

    ValidateToken -->|Valid| AllowAccess[Allow Access]
    ValidateToken -->|Expired| ShowLogin

    ShowLogin --> EnterCreds[Enter Email & Password]
    EnterCreds --> CognitoAuth[Cognito Authentication]

    CognitoAuth -->|Success| GetToken[Receive JWT Token]
    CognitoAuth -->|Failure| ShowError[Show Error]
    ShowError --> ShowLogin

    GetToken --> StoreToken[Store Token in<br/>LocalStorage]
    StoreToken --> AllowAccess

    AllowAccess --> MakeRequest{Make API Request}

    MakeRequest -->|WebSocket| AttachToken1[Attach Token to<br/>WebSocket URL]
    MakeRequest -->|REST API| AttachToken2[Attach Token to<br/>Authorization Header]

    AttachToken1 --> WSAuth[WebSocket Handler<br/>Validates Token]
    AttachToken2 --> APIAuth[API Gateway<br/>Validates Token]

    WSAuth -->|Valid| ProcessWS[Process WebSocket Request]
    WSAuth -->|Invalid| Reject1[Reject: 401 Unauthorized]

    APIAuth -->|Valid| ProcessAPI[Process API Request]
    APIAuth -->|Invalid| Reject2[Reject: 401 Unauthorized]

    ProcessWS --> CheckRole{Check IAM<br/>Permissions}
    ProcessAPI --> CheckRole

    CheckRole -->|Authorized| ExecuteLambda[Execute Lambda Function]
    CheckRole -->|Unauthorized| Reject3[Reject: 403 Forbidden]

    ExecuteLambda --> Return[Return Response]

    Reject1 --> RefreshOrLogin{Token Refresh<br/>Possible?}
    Reject2 --> RefreshOrLogin
    Reject3 --> ShowError

    RefreshOrLogin -->|Yes| RefreshToken[Refresh Token<br/>via Cognito]
    RefreshOrLogin -->|No| Logout[Force Logout]

    RefreshToken --> StoreToken
    Logout --> ShowLogin

    Return --> Done([Complete])

    style CognitoAuth fill:#95E1D3
    style CheckRole fill:#FFE66D
    style ExecuteLambda fill:#4ECDC4
```

## 10. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Developer Workstation]
        A1[Git Push to GitHub]
    end

    subgraph "GitHub"
        B[GitHub Repository<br/>KHemanthRaju/ncwm_chatbot_2]
    end

    subgraph "AWS Amplify - Frontend Deployment"
        C[Amplify Console]
        C1[Build Process]
        C2[Deploy to CDN]
        C3[HTTPS Endpoint]
    end

    subgraph "AWS CDK - Backend Deployment"
        D[CDK CLI]
        D1[CDK Synth]
        D2[CloudFormation Stack]
        D3[Deploy Resources]
    end

    subgraph "Deployed Infrastructure"
        E[Lambda Functions]
        F[API Gateways]
        G[Bedrock Agent]
        H[S3 Buckets]
        I[DynamoDB Tables]
        J[Cognito User Pool]
        K[SES Configuration]
    end

    subgraph "Monitoring"
        L[CloudWatch Logs]
        M[CloudWatch Metrics]
        N[X-Ray Tracing]
    end

    A --> A1
    A1 --> B

    B -->|Webhook Trigger| C
    C --> C1
    C1 -->|npm run build| C2
    C2 --> C3

    A -->|cdk deploy| D
    D --> D1
    D1 --> D2
    D2 --> D3

    D3 --> E
    D3 --> F
    D3 --> G
    D3 --> H
    D3 --> I
    D3 --> J
    D3 --> K

    E --> L
    E --> M
    E -.-> N

    C3 -.->|API Calls| F

    style B fill:#FFE66D
    style C fill:#4ECDC4
    style D fill:#95E1D3
    style G fill:#FF6B6B
```

## Legend

- 🟦 **Blue (4ECDC4)**: Frontend/User Interface Components
- 🟩 **Green (95E1D3)**: Authentication & Security
- 🟨 **Yellow (FFE66D)**: Notification & Email Services
- 🟥 **Red (FF6B6B)**: AI/ML Services (Bedrock, Agent, KB)

## Key Technologies

- **Frontend**: React, Material-UI, WebSocket Client
- **Backend**: AWS Lambda (Python 3.12), API Gateway (WebSocket & REST)
- **AI/ML**: AWS Bedrock Agent, Claude Sonnet 4.5, OpenSearch Serverless
- **Storage**: Amazon S3, DynamoDB
- **Authentication**: Amazon Cognito
- **Notifications**: Amazon SES
- **IaC**: AWS CDK (TypeScript)
- **CI/CD**: AWS Amplify, GitHub Integration
