# Learning Navigator - Sequence Diagrams

## Overview

This document provides detailed sequence diagrams for all major system flows using Mermaid syntax. These diagrams complement the user flows in [USER_FLOWS.md](USER_FLOWS.md) by showing the exact sequence of interactions between components.

---

## Table of Contents

1. [User Authentication Flow](#1-user-authentication-flow)
2. [Basic Chat Message Flow](#2-basic-chat-message-flow)
3. [RAG Response Generation Flow](#3-rag-response-generation-flow)
4. [Agent with Tools Flow](#4-agent-with-tools-flow)
5. [Escalation to Zendesk Flow](#5-escalation-to-zendesk-flow)
6. [Real-Time Streaming Flow](#6-real-time-streaming-flow)
7. [Document Processing Flow](#7-document-processing-flow)
8. [Admin Analytics Flow](#8-admin-analytics-flow)

---

## 1. User Authentication Flow

### Description
User logs in with email/password, receives JWT tokens, and loads their profile.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant CF as CloudFront
    participant React as React App
    participant Cognito as AWS Cognito
    participant APIGW as API Gateway
    participant Lambda as Lambda: getProfile
    participant DDB as DynamoDB

    User->>CF: Navigate to app.learningnavigator.com
    CF->>React: Serve React app from S3
    React->>User: Display login page

    User->>React: Enter email + password
    React->>Cognito: POST /oauth2/token<br/>(email, password, clientId)

    Note over Cognito: Validate credentials<br/>Check password hash<br/>Verify account status<br/>Check MFA (if enabled)

    Cognito-->>React: Return JWT tokens<br/>{IdToken, AccessToken, RefreshToken}

    Note over React: Store tokens:<br/>- Access token in memory<br/>- Refresh token in httpOnly cookie<br/>- Set user state

    React->>APIGW: GET /api/user/profile<br/>Authorization: Bearer {token}

    Note over APIGW: API Gateway Authorizer:<br/>1. Extract JWT from header<br/>2. Validate signature<br/>3. Check expiration<br/>4. Extract claims

    APIGW->>Lambda: Invoke with user context<br/>{userId, email, role, groups}

    Lambda->>DDB: GetItem<br/>PK: USER#user-123<br/>SK: PROFILE
    DDB-->>Lambda: Return user profile<br/>{id, name, role, preferences}

    Lambda-->>APIGW: HTTP 200 OK<br/>User profile data
    APIGW-->>React: User profile

    React->>User: Display chat interface<br/>User authenticated ✓

    Note over User: Duration: ~500ms<br/>Cost: ~$0.0001
```

### Key Details
- **Duration**: ~500ms
- **Services**: CloudFront, S3, Cognito, API Gateway, Lambda, DynamoDB
- **Authentication**: JWT tokens with 1-hour expiry
- **Security**: TLS 1.3, httpOnly cookies, API Gateway authorizer

---

## 2. Basic Chat Message Flow

### Description
User sends a message, system retrieves history, generates AI response with RAG, saves conversation, and returns response with citations.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User
    participant React as React Chat UI
    participant APIGW as API Gateway
    participant SendMsg as Lambda: sendMessage
    participant DDB as DynamoDB
    participant GenResp as Lambda: generateResponse
    participant Comprehend as Amazon Comprehend
    participant Bedrock as Amazon Bedrock
    participant OpenSearch as OpenSearch

    User->>React: Type: "How do I register for a course?"
    React->>React: Display message in chat<br/>Show "AI is thinking..."

    React->>APIGW: POST /api/chat/message<br/>Authorization: Bearer {token}<br/>{message, conversationId, sessionId}

    Note over APIGW: Rate limiting: ✓ 100 req/min<br/>Authorization: ✓ Validate JWT<br/>Validation: ✓ Check schema<br/>WAF: ✓ Check for attacks

    APIGW->>SendMsg: Invoke Lambda<br/>Context: {userId, role: "instructor"}

    Note over SendMsg: 1. Extract user from JWT<br/>2. Validate input<br/>3. Get/create conversation

    SendMsg->>DDB: Query conversation history<br/>PK: CONV#conv-456<br/>SK begins_with MSG#<br/>Limit: 10
    DDB-->>SendMsg: Return last 10 messages<br/>[{role: "user", content: "..."}, ...]

    SendMsg->>GenResp: Invoke generateResponse<br/>{query, history, userId, role}

    Note over GenResp: Start RAG pipeline

    GenResp->>Comprehend: DetectDominantLanguage<br/>Text: "How do I register..."
    Comprehend-->>GenResp: Language: "en" (confidence: 0.99)

    GenResp->>Bedrock: Generate embedding<br/>Model: Titan Embed Text v1<br/>Input: query text
    Bedrock-->>GenResp: Embedding: [0.234, -0.123, ..., 0.789]<br/>(1536 dimensions)

    GenResp->>OpenSearch: Hybrid search<br/>{embedding, keywords, role_filter}

    Note over OpenSearch: Execute:<br/>- Keyword search (BM25)<br/>- Vector search (k-NN)<br/>- Filter by role: ["instructor", "all"]<br/>- Return top 5 results

    OpenSearch-->>GenResp: Return 5 relevant documents<br/>[{text, source, section, score}, ...]

    Note over GenResp: Build prompt:<br/>- System prompt (role-based)<br/>- Retrieved context<br/>- Conversation history<br/>- User query

    GenResp->>Bedrock: InvokeModel<br/>Model: Claude 3 Sonnet<br/>{system, messages, max_tokens: 2048}

    Note over Bedrock: Generate response:<br/>- Process context<br/>- Generate answer<br/>- Include citations<br/>Input tokens: 4823<br/>Output tokens: 287

    Bedrock-->>GenResp: Response with citations<br/>"To register for a course...[1]"

    Note over GenResp: Extract citations:<br/>Map [1], [2] to source docs

    GenResp-->>SendMsg: Return formatted response<br/>{content, citations, metadata}

    SendMsg->>DDB: PutItem (User message)<br/>PK: CONV#conv-456<br/>SK: MSG#2025-12-20T10:30:00.000Z

    SendMsg->>DDB: PutItem (AI response)<br/>PK: CONV#conv-456<br/>SK: MSG#2025-12-20T10:30:02.500Z

    SendMsg->>DDB: UpdateItem (Conversation metadata)<br/>SET messageCount += 2<br/>SET lastMessageAt = timestamp

    par Async sentiment analysis
        SendMsg->>Comprehend: DetectSentiment<br/>Text: user message
        Comprehend-->>SendMsg: Sentiment: NEUTRAL (0.90)
    end

    SendMsg-->>APIGW: HTTP 200 OK<br/>{messageId, content, citations, timestamp}
    APIGW-->>React: Response data

    React->>User: Display AI response<br/>with clickable citations

    Note over User: Duration: ~2-3 seconds<br/>Cost: ~$0.02
```

### Key Details
- **Duration**: ~2-3 seconds
- **Services**: API Gateway, Lambda (×2), DynamoDB, OpenSearch, Bedrock (×2), Comprehend (×2)
- **Cost per request**: ~$0.02
- **Parallel operations**: Sentiment analysis runs asynchronously

---

## 3. RAG Response Generation Flow

### Description
Detailed breakdown of the generateResponse Lambda function showing the complete RAG pipeline.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant SendMsg as sendMessage Lambda
    participant GenResp as generateResponse Lambda
    participant Comprehend as Amazon Comprehend
    participant Bedrock as Amazon Bedrock
    participant OpenSearch as OpenSearch Vector Store
    participant CloudWatch as CloudWatch Logs

    SendMsg->>GenResp: Invoke with query<br/>{query, history, userId, role, language}

    Note over GenResp: Input:<br/>Query: "How do I register..."<br/>Role: "instructor"<br/>History: [last 10 messages]

    alt Language not provided
        GenResp->>Comprehend: DetectDominantLanguage<br/>Text: first 5000 chars
        Comprehend-->>GenResp: {LanguageCode: "en", Score: 0.99}
    end

    Note over GenResp: Step 1: Generate Query Embedding

    GenResp->>Bedrock: InvokeModel<br/>Model: amazon.titan-embed-text-v1<br/>Input: query text
    Bedrock-->>GenResp: {embedding: [1536 floats]}

    Note over GenResp: Step 2: Search Knowledge Base

    GenResp->>OpenSearch: POST /knowledge-base/_search<br/>{<br/>  size: 5,<br/>  query: {<br/>    bool: {<br/>      must: [keyword_search],<br/>      should: [vector_search],<br/>      filter: [role, language]<br/>    }<br/>  }<br/>}

    Note over OpenSearch: Execute hybrid search:<br/>1. BM25 keyword matching<br/>2. k-NN vector similarity<br/>3. Combine scores<br/>4. Apply filters<br/>5. Return top 5

    OpenSearch-->>GenResp: Top 5 results<br/>[<br/>  {score: 15.23, text: "...", source: "..."},<br/>  {score: 12.45, text: "...", source: "..."},<br/>  ...<br/>]

    Note over GenResp: Step 3: Build Context

    GenResp->>GenResp: Format retrieved documents:<br/>---<br/>Document 1: MHFA Connect Guide<br/>To register for a course...<br/>---<br/>Document 2: Learner Guide<br/>Course registration includes...<br/>---

    Note over GenResp: Step 4: Construct Prompt

    GenResp->>GenResp: Build LangChain prompt:<br/>- System: role-based instructions<br/>- Context: retrieved documents<br/>- History: last 10 messages<br/>- Query: user question<br/><br/>Total tokens: ~5000

    Note over GenResp: Step 5: Generate Response

    GenResp->>Bedrock: InvokeModel<br/>Model: anthropic.claude-3-sonnet<br/>{<br/>  anthropic_version: "bedrock-2023-05-31",<br/>  max_tokens: 2048,<br/>  temperature: 0.7,<br/>  system: "You are a helpful assistant...",<br/>  messages: [{role: "user", content: "..."}]<br/>}

    Note over Bedrock: Claude processing:<br/>1. Analyze context<br/>2. Understand query<br/>3. Generate response<br/>4. Add citations<br/><br/>Time: ~2 seconds

    Bedrock-->>GenResp: {<br/>  content: [{<br/>    type: "text",<br/>    text: "To register for a course..."<br/>  }],<br/>  usage: {<br/>    input_tokens: 4823,<br/>    output_tokens: 287<br/>  }<br/>}

    Note over GenResp: Step 6: Extract Citations

    GenResp->>GenResp: Parse response:<br/>1. Find citation markers [1], [2]<br/>2. Map to source documents<br/>3. Extract metadata<br/>4. Build citation objects

    Note over GenResp: Step 7: Log Metrics

    GenResp->>CloudWatch: PutLogEvents<br/>{<br/>  timestamp,<br/>  userId,<br/>  conversationId,<br/>  query,<br/>  retrievedDocs: 5,<br/>  inputTokens: 4823,<br/>  outputTokens: 287,<br/>  cost: 0.0189,<br/>  processingTime: 2143ms,<br/>  model: "claude-3-sonnet"<br/>}

    GenResp-->>SendMsg: Return formatted response<br/>{<br/>  content: "To register for a course...",<br/>  citations: [<br/>    {id: 1, source: "MHFA Connect Guide", ...}<br/>  ],<br/>  metadata: {<br/>    inputTokens: 4823,<br/>    outputTokens: 287,<br/>    model: "claude-3-sonnet",<br/>    processingTime: 2143<br/>  }<br/>}

    Note over SendMsg: Duration: ~2 seconds<br/>Cost: ~$0.02
```

### Key Details
- **Duration**: ~2 seconds
- **Services**: Comprehend, Bedrock (×2 - embeddings + generation), OpenSearch, CloudWatch
- **Token usage**: ~4800 input, ~300 output
- **Cost**: ~$0.02 per response
- **Caching**: System prompts cached for 5 minutes

---

## 4. Agent with Tools Flow

### Description
Complex query requiring agent reasoning and tool execution (search knowledge base, create Zendesk ticket).

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User
    participant SendMsg as sendMessage Lambda
    participant AgentExec as agentExecutor Lambda
    participant Bedrock as Bedrock (Claude)
    participant KBTool as KnowledgeBase Tool
    participant OpenSearch as OpenSearch
    participant ZendeskTool as Zendesk Tool
    participant Secrets as Secrets Manager
    participant Zendesk as Zendesk API
    participant DDB as DynamoDB

    User->>SendMsg: "I need help with invoicing,<br/>if you can't help create a ticket"

    SendMsg->>AgentExec: Invoke agent executor<br/>{query, history, userId, tools}

    Note over AgentExec: Initialize agent with tools:<br/>1. search_knowledge_base<br/>2. create_support_ticket<br/>3. get_course_info

    Note over AgentExec: Agent Decision Loop (ReAct Pattern)

    AgentExec->>Bedrock: Agent reasoning step 1<br/>{<br/>  system: "You have access to tools...",<br/>  messages: [{<br/>    role: "user",<br/>    content: "I need help with invoicing..."<br/>  }]<br/>}

    Note over Bedrock: Claude reasoning:<br/>Thought: User needs invoicing help.<br/>I should first search the<br/>knowledge base for information.

    Bedrock-->>AgentExec: Decision:<br/>{<br/>  thought: "Search KB for invoicing info",<br/>  action: "search_knowledge_base",<br/>  action_input: "instructor invoicing process"<br/>}

    Note over AgentExec: Execute Tool: search_knowledge_base

    AgentExec->>KBTool: execute("instructor invoicing process")

    KBTool->>OpenSearch: Similarity search<br/>{<br/>  query: "instructor invoicing process",<br/>  k: 5,<br/>  filter: {role: ["instructor", "all"]}<br/>}

    OpenSearch-->>KBTool: Top 5 results<br/>[<br/>  {text: "Instructors submit invoices...", ...},<br/>  {text: "Invoice process includes...", ...}<br/>]

    KBTool-->>AgentExec: Tool result:<br/>"Found 3 documents about invoicing:<br/>1. Instructor Handbook: Submit invoices via...<br/>2. MHFA Connect: Invoice portal at...<br/>3. FAQ: Common invoicing questions..."

    Note over AgentExec: Agent Decision Loop continues

    AgentExec->>Bedrock: Agent reasoning step 2<br/>{<br/>  messages: [<br/>    previous_messages,<br/>    {role: "user", content: "Tool result: ..."},<br/>  ]<br/>}

    Note over Bedrock: Claude evaluation:<br/>Thought: Found good information<br/>about invoicing in KB. I can<br/>provide this to the user.<br/>No need to create ticket.

    Bedrock-->>AgentExec: Decision:<br/>{<br/>  thought: "KB has sufficient info",<br/>  action: "Final Answer",<br/>  action_input: "Based on the Instructor<br/>    Handbook, here's how to handle<br/>    invoicing: [detailed answer]"<br/>}

    AgentExec-->>SendMsg: Agent response with answer
    SendMsg-->>User: Display answer with option:<br/>"If you need additional help,<br/>I can create a support ticket."

    rect rgb(240, 240, 255)
        Note over User,DDB: Alternative Path: If KB Search Fails or User Insists

        User->>SendMsg: "That doesn't help, create a ticket"
        SendMsg->>AgentExec: Continue agent execution

        AgentExec->>Bedrock: Agent reasoning step 3

        Note over Bedrock: Claude reasoning:<br/>Thought: User needs more help,<br/>KB info wasn't sufficient.<br/>I'll create a support ticket.

        Bedrock-->>AgentExec: Decision:<br/>{<br/>  action: "create_support_ticket",<br/>  action_input: {<br/>    subject: "Instructor Invoicing Help",<br/>    description: "User needs help...",<br/>    priority: "normal"<br/>  }<br/>}

        AgentExec->>ZendeskTool: execute(ticket_data)

        ZendeskTool->>Secrets: GetSecretValue<br/>SecretId: "learning-navigator/zendesk"
        Secrets-->>ZendeskTool: {subdomain, email, apiToken}

        ZendeskTool->>Zendesk: POST /api/v2/tickets<br/>Authorization: Basic {credentials}<br/>{<br/>  ticket: {<br/>    subject: "Instructor Invoicing Help",<br/>    comment: {body: "User needs help..."},<br/>    priority: "normal",<br/>    status: "new",<br/>    requester: {<br/>      name: "John Doe",<br/>      email: "instructor@example.com"<br/>    },<br/>    tags: ["chatbot", "escalation"],<br/>    custom_fields: [<br/>      {id: 123, value: "chatbot_escalation"},<br/>      {id: 124, value: "conv-456"}<br/>    ]<br/>  }<br/>}

        Zendesk-->>ZendeskTool: {<br/>  ticket: {<br/>    id: 12345,<br/>    url: "https://...",<br/>    status: "new"<br/>  }<br/>}

        ZendeskTool-->>AgentExec: "Ticket 12345 created"

        AgentExec->>DDB: UpdateItem<br/>PK: USER#user-123<br/>SK: CONV#conv-456<br/>SET escalated = true<br/>SET zendeskTicketId = "12345"<br/>SET escalatedAt = timestamp

        AgentExec->>Bedrock: Agent reasoning step 4<br/>(with tool result)

        Bedrock-->>AgentExec: Decision:<br/>{<br/>  action: "Final Answer",<br/>  action_input: "I've created ticket #12345..."<br/>}

        AgentExec-->>SendMsg: Final response with ticket info
        SendMsg-->>User: "I've created ticket #12345.<br/>Our team will respond within<br/>1 business day."
    end

    Note over User: Duration: ~4-5 seconds<br/>Cost: ~$0.04-0.06<br/>(multiple Bedrock calls + tool executions)
```

### Key Details
- **Duration**: ~4-5 seconds (multiple LLM calls)
- **Services**: Bedrock (×2-3 calls), OpenSearch, Zendesk API, Secrets Manager, DynamoDB
- **Cost per request**: ~$0.04-0.06
- **Pattern**: ReAct (Reasoning + Acting)
- **Tools**: 3 available (KB search, Zendesk, courses)

---

## 5. Escalation to Zendesk Flow

### Description
Automatic escalation triggered by negative sentiment detection or repeated failures.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User
    participant SendMsg as sendMessage Lambda
    participant Comprehend as Amazon Comprehend
    participant DDB as DynamoDB
    participant Secrets as Secrets Manager
    participant Zendesk as Zendesk API
    participant CloudWatch as CloudWatch Logs

    User->>SendMsg: "This is frustrating! I've asked<br/>3 times and you're not helping!"

    Note over SendMsg: Process message normally first

    SendMsg->>Comprehend: DetectSentiment<br/>Text: "This is frustrating..."<br/>LanguageCode: "en"

    Comprehend-->>SendMsg: {<br/>  Sentiment: "NEGATIVE",<br/>  SentimentScore: {<br/>    Positive: 0.01,<br/>    Neutral: 0.02,<br/>    Mixed: 0.08,<br/>    Negative: 0.89<br/>  }<br/>}

    Note over SendMsg: Check escalation criteria:<br/>✓ Negative sentiment > 0.7 (0.89)<br/>✓ OR failedAttempts > 2<br/>✓ OR explicit user request

    alt Escalation criteria met
        Note over SendMsg: shouldEscalate() returns true

        SendMsg->>DDB: Query conversation<br/>PK: CONV#conv-456<br/>Get full history

        DDB-->>SendMsg: All messages in conversation<br/>+ metadata (failedAttempts, etc.)

        Note over SendMsg: Build ticket description:<br/>- User details<br/>- Conversation ID<br/>- Escalation reason<br/>- Full conversation history<br/>- Sentiment scores<br/>- Failed attempt count

        SendMsg->>Secrets: GetSecretValue<br/>SecretId: "learning-navigator/zendesk"

        Secrets-->>SendMsg: {<br/>  subdomain: "nationalcouncil",<br/>  email: "api@nationalcouncil.org",<br/>  apiToken: "abc123...xyz"<br/>}

        SendMsg->>Zendesk: POST /api/v2/tickets<br/>Authorization: Basic {base64(email:token)}<br/>{<br/>  ticket: {<br/>    subject: "Chatbot Escalation - User Frustration",<br/>    comment: {<br/>      body: "Chatbot Escalation - Automated\n\n<br/>        User: John Doe (instructor@example.com)\n<br/>        Role: Instructor\n<br/>        Conversation ID: conv-456\n<br/>        Started: 2025-12-20 10:25:00\n<br/>        Escalated: 2025-12-20 10:32:15\n\n<br/>        Reason: Negative sentiment (0.89)\n\n<br/>        Conversation Summary:\n<br/>        User: How do I submit an invoice?\n<br/>        AI: [response]\n<br/>        User: That doesn't answer my question!\n<br/>        AI: [another response]\n<br/>        User: This is frustrating!...\n\n<br/>        Original Question:\n<br/>        How do I submit an invoice for...<br/>      "<br/>    },<br/>    priority: "normal",<br/>    status: "new",<br/>    requester: {<br/>      name: "John Doe",<br/>      email: "instructor@example.com"<br/>    },<br/>    tags: ["chatbot", "escalation", "auto"],<br/>    custom_fields: [<br/>      {id: 360001234567, value: "chatbot_escalation"},<br/>      {id: 360001234568, value: "conv-456"}<br/>    ]<br/>  }<br/>}

        Zendesk-->>SendMsg: {<br/>  ticket: {<br/>    id: 12345,<br/>    url: "https://nationalcouncil.zendesk.com/...",<br/>    created_at: "2025-12-20T10:32:16Z",<br/>    status: "new",<br/>    priority: "normal"<br/>  }<br/>}

        SendMsg->>DDB: UpdateItem<br/>PK: USER#user-123<br/>SK: CONV#conv-456<br/>SET escalated = true<br/>SET zendeskTicketId = "12345"<br/>SET escalatedAt = "2025-12-20T10:32:16Z"<br/>SET escalationReason = "negative_sentiment"<br/>SET status = "escalated"

        SendMsg->>CloudWatch: PutLogEvents<br/>{<br/>  event: "conversation_escalated",<br/>  timestamp: "2025-12-20T10:32:16Z",<br/>  userId: "user-123",<br/>  conversationId: "conv-456",<br/>  zendeskTicketId: "12345",<br/>  reason: "negative_sentiment",<br/>  sentimentScore: 0.89,<br/>  messageCount: 6,<br/>  failedAttempts: 3<br/>}

        SendMsg-->>User: "I apologize that I wasn't able to<br/>help you effectively.\n\n<br/>I've escalated your question to our<br/>support team who will provide<br/>personalized assistance.\n\n<br/>Support Ticket #12345 has been created.\n\n<br/>Our team will respond via email within<br/>1 business day. You can track your<br/>ticket at:\n<br/>https://nationalcouncil.zendesk.com/tickets/12345\n\n<br/>Is there anything else I can help<br/>you with in the meantime?"

        Note over User: Duration: ~1-2 seconds<br/>Cost: ~$0.001

        rect rgb(255, 250, 240)
            Note over Zendesk: Meanwhile in Zendesk Dashboard...

            Zendesk->>Zendesk: Trigger notification<br/>Email support team<br/>Display in dashboard

            Note over Zendesk: Support Agent sees:<br/>- Ticket #12345<br/>- Priority: Normal<br/>- Source: Chatbot Escalation<br/>- Full conversation history<br/>- Sentiment: NEGATIVE (0.89)<br/>- Custom fields populated<br/>- User contact info
        end
    end
```

### Key Details
- **Duration**: ~1-2 seconds
- **Services**: Comprehend, Secrets Manager, Zendesk API, DynamoDB, CloudWatch
- **Cost**: ~$0.001
- **Triggers**: Negative sentiment > 0.7, failed attempts > 2, explicit request
- **Context**: Full conversation history passed to support team

---

## 6. Real-Time Streaming Flow

### Description
WebSocket-based real-time streaming of AI response tokens for improved user experience.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User as User
    participant React as React Chat UI
    participant WSGW as API Gateway WebSocket
    participant Stream as Lambda: streamResponse
    participant DDB as DynamoDB
    participant OpenSearch as OpenSearch
    participant Bedrock as Bedrock (Streaming)
    participant APIGW_Mgmt as API Gateway Management API

    Note over User,APIGW_Mgmt: Connection Establishment

    User->>React: Load chat page
    React->>WSGW: WebSocket connect<br/>wss://ws-api.learningnavigator.com<br/>?token={jwt_token}

    Note over WSGW: $connect route<br/>Validate JWT token

    WSGW->>React: Connection established<br/>ConnectionId: abc123xyz

    Note over User,APIGW_Mgmt: Message Exchange

    User->>React: Type message
    React->>WSGW: Send via WebSocket<br/>{<br/>  action: "sendMessage",<br/>  conversationId: "conv-456",<br/>  message: "How do I register?"<br/>}

    WSGW->>Stream: Invoke Lambda<br/>connectionId: abc123xyz<br/>message data

    Note over Stream: Step 1: Get context

    Stream->>DDB: Query conversation history<br/>PK: CONV#conv-456<br/>Limit: 10
    DDB-->>Stream: Last 10 messages

    Note over Stream: Step 2: Search knowledge base

    Stream->>OpenSearch: Search with embedding<br/>(simplified for streaming)
    OpenSearch-->>Stream: Top 5 documents

    Note over Stream: Step 3: Stream from Bedrock

    Stream->>Bedrock: InvokeModelWithResponseStream<br/>{<br/>  modelId: "anthropic.claude-3-sonnet",<br/>  body: {<br/>    anthropic_version: "bedrock-2023-05-31",<br/>    max_tokens: 2048,<br/>    messages: [...],<br/>    stream: true  ← Enable streaming<br/>  }<br/>}

    Note over Bedrock: Start generating response<br/>Token by token

    loop For each generated token
        Bedrock-->>Stream: Stream event<br/>{<br/>  chunk: {<br/>    type: "content_block_delta",<br/>    delta: {text: "To "}<br/>  }<br/>}

        Stream->>APIGW_Mgmt: PostToConnection<br/>{<br/>  ConnectionId: "abc123xyz",<br/>  Data: JSON.stringify({<br/>    type: "token",<br/>    content: "To ",<br/>    messageId: "msg-002"<br/>  })<br/>}

        APIGW_Mgmt->>React: WebSocket message<br/>{type: "token", content: "To "}

        React->>User: Append to display<br/>"To"

        Note over User: Sees text appear<br/>character by character

        Bedrock-->>Stream: Next token: "register "
        Stream->>APIGW_Mgmt: PostToConnection<br/>{type: "token", content: "register "}
        APIGW_Mgmt->>React: WebSocket message
        React->>User: Append: "To register"

        Bedrock-->>Stream: Next token: "for "
        Stream->>APIGW_Mgmt: PostToConnection<br/>{type: "token", content: "for "}
        APIGW_Mgmt->>React: WebSocket message
        React->>User: Append: "To register for"

        Note over User: Typewriter effect<br/>~20 tokens/second
    end

    Bedrock-->>Stream: Stream complete<br/>All tokens sent

    Note over Stream: Build full response

    Stream->>APIGW_Mgmt: PostToConnection<br/>{<br/>  type: "complete",<br/>  messageId: "msg-002",<br/>  fullContent: "To register for a course...",<br/>  citations: [<br/>    {id: 1, source: "MHFA Connect Guide", ...}<br/>  ],<br/>  metadata: {<br/>    inputTokens: 4823,<br/>    outputTokens: 287,<br/>    processingTime: 2143<br/>  }<br/>}

    APIGW_Mgmt->>React: Completion message

    React->>User: Display citations<br/>Show source references<br/>Enable feedback buttons

    Note over Stream: Save to database

    par Save messages to DynamoDB
        Stream->>DDB: PutItem (User message)
        Stream->>DDB: PutItem (AI response)
        Stream->>DDB: UpdateItem (Conversation metadata)
    end

    Note over User: Total duration: ~2-3 seconds<br/>Time to first token: ~300-500ms<br/>Much better UX than waiting!
```

### Key Details
- **Duration**: ~2-3 seconds (same as non-streaming)
- **Time to first token**: ~300-500ms
- **Benefits**: Improved perceived performance, better UX
- **Streaming rate**: ~20 tokens/second
- **Connection**: Persistent WebSocket connection
- **Services**: API Gateway WebSocket, Lambda, Bedrock (streaming), DynamoDB

---

## 7. Document Processing Flow

### Description
Background processing triggered when a PDF is uploaded to S3, extracting text, generating embeddings, and indexing.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant S3 as S3: national-council-s3-pdfs
    participant Lambda as Lambda: processDocument
    participant Textract as Amazon Textract
    participant Comprehend as Amazon Comprehend
    participant Bedrock as Bedrock: Titan Embeddings
    participant OpenSearch as OpenSearch
    participant CloudWatch as CloudWatch

    Admin->>S3: PUT new-invoicing-guide.pdf<br/>Path: instructor-guides/<br/>Size: 2.3 MB

    Note over S3: S3 Event Notification<br/>Event: s3:ObjectCreated:Put

    S3->>Lambda: Trigger Lambda<br/>Event: {<br/>  bucket: "national-council-s3-pdfs",<br/>  key: "instructor-guides/new-invoicing-guide.pdf",<br/>  size: 2411724<br/>}

    Note over Lambda: Lambda Config:<br/>Runtime: Node.js 20<br/>Memory: 2048 MB<br/>Timeout: 300s (5 minutes)

    Lambda->>Lambda: Log processing start

    Note over Lambda: Step 1: Extract Text from PDF

    Lambda->>Textract: DetectDocumentText<br/>{<br/>  Document: {<br/>    S3Object: {<br/>      Bucket: "national-council-s3-pdfs",<br/>      Name: "instructor-guides/new-invoicing-guide.pdf"<br/>    }<br/>  }<br/>}

    Note over Textract: OCR Processing:<br/>- Extract all text<br/>- Detect tables<br/>- Preserve structure<br/>- Return confidence scores

    Textract-->>Lambda: {<br/>  Blocks: [<br/>    {BlockType: "LINE",<br/>     Text: "Invoicing Guide for...",<br/>     Confidence: 99.2},<br/>    {BlockType: "LINE",<br/>     Text: "Follow these steps...",<br/>     Confidence: 98.7},<br/>    ...<br/>  ]<br/>}<br/><br/>Total text: ~50,000 characters

    Lambda->>Lambda: Concatenate all text blocks<br/>into single string

    Note over Lambda: Step 2: Detect Language

    Lambda->>Comprehend: DetectDominantLanguage<br/>Text: first 5000 characters

    Comprehend-->>Lambda: {<br/>  Languages: [<br/>    {LanguageCode: "en", Score: 0.99}<br/>  ]<br/>}

    Note over Lambda: Language: en ✓

    Note over Lambda: Step 3: Extract Metadata

    Lambda->>Lambda: Parse S3 key path:<br/>"instructor-guides/new-invoicing-guide.pdf"<br/><br/>Extract:<br/>- role: "instructor"<br/>- category: "invoicing"<br/>- documentType: "guide"<br/>- source: "new-invoicing-guide.pdf"

    Note over Lambda: Step 4: Chunk Document

    Lambda->>Lambda: chunkDocument({<br/>  text: extractedText,<br/>  maxChunkSize: 500,  // tokens<br/>  overlapSize: 50,    // tokens<br/>  strategy: "paragraph"<br/>})<br/><br/>Result: 30 chunks

    Note over Lambda: Chunk example:<br/>Index: 0<br/>Text: "Invoicing Guide...[~2000 chars]"<br/>Start: 0, End: 2000

    Note over Lambda: Step 5: Process Each Chunk (×30)

    loop For each chunk (30 iterations)
        Note over Lambda: Processing chunk #{i}

        Lambda->>Bedrock: InvokeModel<br/>{<br/>  modelId: "amazon.titan-embed-text-v1",<br/>  body: {<br/>    inputText: chunk.text<br/>  }<br/>}

        Bedrock-->>Lambda: {<br/>  embedding: [0.123, -0.456, ..., 0.234]<br/>}<br/>(1536 dimensions)

        Lambda->>OpenSearch: POST /knowledge-base/_doc<br/>{<br/>  documentId: "invoicing-guide-chunk-0",<br/>  chunkIndex: 0,<br/>  totalChunks: 30,<br/>  text: "Invoicing Guide for MHFA...",<br/>  embedding: [0.123, -0.456, ...],<br/>  source: "instructor-guides/new-invoicing-guide.pdf",<br/>  bucket: "national-council-s3-pdfs",<br/>  language: "en",<br/>  role: "instructor",<br/>  category: "invoicing",<br/>  documentType: "guide",<br/>  processedAt: "2025-12-20T10:45:00Z"<br/>}

        OpenSearch-->>Lambda: {<br/>  _index: "knowledge-base",<br/>  _id: "invoicing-guide-chunk-0",<br/>  result: "created",<br/>  _version: 1<br/>}

        Note over Lambda: Chunk {i} indexed ✓<br/>Progress: {i}/30
    end

    Note over Lambda: All chunks processed ✓

    Note over Lambda: Step 6: Log Completion

    Lambda->>CloudWatch: PutLogEvents<br/>{<br/>  event: "document_processed",<br/>  timestamp: "2025-12-20T10:45:30Z",<br/>  source: "new-invoicing-guide.pdf",<br/>  bucket: "national-council-s3-pdfs",<br/>  key: "instructor-guides/new-invoicing-guide.pdf",<br/>  textLength: 50000,<br/>  chunks: 30,<br/>  language: "en",<br/>  processingTime: 45000,  // 45 seconds<br/>  textractCost: 0.15,<br/>  embeddingCost: 0.03,<br/>  totalCost: 0.18<br/>}

    Lambda-->>S3: Processing complete ✓

    Note over Admin: Document now searchable!<br/>Users can ask questions about<br/>the new invoicing guide.<br/><br/>Duration: ~45 seconds<br/>Cost: ~$0.18 (one-time)
```

### Key Details
- **Duration**: ~30-60 seconds per PDF (depends on size)
- **Services**: S3, Lambda, Textract, Comprehend, Bedrock (Titan), OpenSearch, CloudWatch
- **Processing**: Automatic on S3 upload
- **Cost**: ~$0.15-0.30 per document (one-time)
- **Chunking**: 500 tokens with 50 token overlap
- **Embeddings**: 1536-dimensional vectors

---

## 8. Admin Analytics Flow

### Description
Admin dashboard loading conversation metrics, sentiment analysis, escalation data, and performance metrics.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant React as React Admin Dashboard
    participant APIGW as API Gateway
    participant Lambda as Lambda: getAnalytics
    participant DDB as DynamoDB
    participant CloudWatch as CloudWatch

    Admin->>React: Navigate to /admin/analytics
    React->>React: Check user role<br/>Verify "admins" group

    React->>APIGW: GET /api/admin/analytics<br/>?timeRange=last_30_days<br/>Authorization: Bearer {admin_token}

    Note over APIGW: Authorizer:<br/>1. Validate JWT ✓<br/>2. Check groups ✓<br/>3. Verify "admins" membership ✓<br/>4. Reject if not admin

    APIGW->>Lambda: Invoke with admin context<br/>{<br/>  userId: "admin-123",<br/>  role: "admin",<br/>  groups: ["admins"],<br/>  timeRange: "last_30_days"<br/>}

    Note over Lambda: Calculate date range:<br/>startDate = now - 30 days<br/>endDate = now

    Note over Lambda: Query 1: Conversation Metrics

    Lambda->>DDB: Query GSI1<br/>{<br/>  IndexName: "GSI1PK-GSI1SK-index",<br/>  KeyConditionExpression:<br/>    "GSI1PK BETWEEN :start AND :end",<br/>  ExpressionAttributeValues: {<br/>    ":start": "DATE#2025-11-20",<br/>    ":end": "DATE#2025-12-20"<br/>  }<br/>}

    DDB-->>Lambda: Conversations in range<br/>[{...}, {...}, ...] (1247 items)

    Lambda->>Lambda: Aggregate metrics:<br/>- totalConversations: 1247<br/>- totalMessages: 8935<br/>- avgMessagesPerConv: 7.16<br/>- activeUsers: 342<br/>- newUsers: 89

    Note over Lambda: Query 2: Sentiment Analysis

    Lambda->>Lambda: Process sentiment data<br/>from conversations:<br/><br/>For each conversation:<br/>  Count sentiment categories<br/>  Calculate avg satisfaction

    Lambda->>Lambda: Results:<br/>- positive: 734 (58.9%)<br/>- neutral: 423 (33.9%)<br/>- negative: 90 (7.2%)<br/>- avgSatisfaction: 4.2/5.0

    Note over Lambda: Query 3: Escalation Metrics

    Lambda->>DDB: Query escalated conversations<br/>{<br/>  FilterExpression: "escalated = :true",<br/>  ExpressionAttributeValues: {<br/>    ":true": true<br/>  }<br/>}

    DDB-->>Lambda: Escalated conversations (78 items)

    Lambda->>Lambda: Analyze escalations:<br/>- totalEscalations: 78<br/>- escalationRate: 6.25%<br/>- reasonBreakdown: {<br/>    negative_sentiment: 45,<br/>    repeated_failures: 21,<br/>    explicit_request: 12<br/>  }<br/>- avgTimeToEscalation: "4.3 min"

    Note over Lambda: Query 4: Performance Metrics

    Lambda->>CloudWatch: GetMetricStatistics<br/>{<br/>  Namespace: "AWS/Lambda",<br/>  MetricName: "Duration",<br/>  Dimensions: [{<br/>    Name: "FunctionName",<br/>    Value: "learning-navigator-*"<br/>  }],<br/>  StartTime: startDate,<br/>  EndTime: endDate,<br/>  Period: 3600,<br/>  Statistics: ["Average", "p95", "p99"]<br/>}

    CloudWatch-->>Lambda: Lambda performance data

    Lambda->>CloudWatch: GetMetricStatistics<br/>(API Gateway latency)
    CloudWatch-->>Lambda: API Gateway metrics

    Lambda->>CloudWatch: GetMetricStatistics<br/>(Error rates)
    CloudWatch-->>Lambda: Error rate data

    Lambda->>CloudWatch: GetMetricStatistics<br/>(Custom: Bedrock token usage)
    CloudWatch-->>Lambda: Token usage data

    Lambda->>Lambda: Calculate costs:<br/>- Bedrock tokens → cost<br/>- Lambda invocations → cost<br/>- Other services → cost<br/><br/>Total: $127.45 (Bedrock)<br/>       $412.33 (Total this month)

    Note over Lambda: Query 5: Top Topics

    Lambda->>Lambda: Analyze conversation content<br/>Extract common keywords/topics:<br/><br/>- "Course Registration": 234<br/>- "Invoicing": 187<br/>- "Certification": 156<br/>- "Platform Navigation": 143<br/>- "Course Materials": 89

    Note over Lambda: Compile Complete Response

    Lambda-->>APIGW: HTTP 200 OK<br/>{<br/>  period: {<br/>    start: "2025-11-20",<br/>    end: "2025-12-20",<br/>    days: 30<br/>  },<br/>  conversations: {<br/>    total: 1247,<br/>    totalMessages: 8935,<br/>    avgLength: 7.16,<br/>    dailyAvg: 41.6<br/>  },<br/>  users: {<br/>    active: 342,<br/>    new: 89,<br/>    retention: "73.2%"<br/>  },<br/>  sentiment: {<br/>    positive: 58.9,<br/>    neutral: 33.9,<br/>    negative: 7.2,<br/>    satisfaction: 4.2<br/>  },<br/>  escalations: {<br/>    total: 78,<br/>    rate: 6.25,<br/>    avgTimeToEscalation: "4.3 minutes"<br/>  },<br/>  performance: {<br/>    avgResponseTime: 2.3,<br/>    p95ResponseTime: 3.8,<br/>    errorRate: 0.8<br/>  },<br/>  costs: {<br/>    bedrock: 127.45,<br/>    total: 412.33<br/>  },<br/>  topTopics: [...]<br/>}

    APIGW-->>React: Analytics data

    React->>Admin: Render dashboard:<br/>- Conversation charts<br/>- Sentiment pie chart<br/>- Escalation trends<br/>- Performance graphs<br/>- Cost breakdown<br/>- Top topics list

    Note over Admin: Duration: ~1-2 seconds<br/>Cost: ~$0.001
```

### Key Details
- **Duration**: ~1-2 seconds
- **Services**: API Gateway, Lambda, DynamoDB (with GSI), CloudWatch
- **Authorization**: Admin-only (verified via Cognito groups)
- **Cost**: ~$0.001 per request
- **Metrics**: Conversations, sentiment, escalations, performance, costs, topics
- **Time ranges**: Last 7 days, 30 days, 90 days, custom

---

## Summary Table

| Flow | Duration | Services | Complexity | Cost |
|------|----------|----------|------------|------|
| Authentication | ~500ms | CloudFront, Cognito, API Gateway, Lambda, DynamoDB | Low | $0.0001 |
| Basic Chat | ~2-3s | API Gateway, Lambda (×2), DynamoDB, OpenSearch, Bedrock (×2), Comprehend (×2) | Medium | $0.02 |
| RAG Generation | ~2s | Comprehend, Bedrock (×2), OpenSearch, CloudWatch | Medium | $0.02 |
| Agent with Tools | ~4-5s | Bedrock (×2-3), OpenSearch, Zendesk, Secrets Manager, DynamoDB | High | $0.04-0.06 |
| Escalation | ~1-2s | Comprehend, Secrets Manager, Zendesk, DynamoDB, CloudWatch | Low | $0.001 |
| Streaming | ~2-3s | WebSocket API, Lambda, Bedrock (streaming), DynamoDB | Medium | $0.02 |
| Document Processing | ~30-60s | S3, Lambda, Textract, Bedrock, OpenSearch, CloudWatch | High | $0.18 (one-time) |
| Admin Analytics | ~1-2s | API Gateway, Lambda, DynamoDB, CloudWatch | Medium | $0.001 |

---

## Notes on Diagrams

### Rendering
These sequence diagrams use **Mermaid syntax** which renders in:
- ✅ GitHub/GitLab
- ✅ VS Code (with Mermaid extension)
- ✅ Notion
- ✅ Many markdown viewers

### Conventions
- **Participant names**: Short, descriptive
- **Messages**: Include HTTP method, endpoint, and key parameters
- **Notes**: Provide context and calculations
- **Alt/Par blocks**: Show conditional flows and parallel operations
- **Timing**: Included in final notes for each flow

### Integration with USER_FLOWS.md
- **USER_FLOWS.md**: ASCII art showing complete system visualization
- **SEQUENCE_DIAGRAMS.md** (this file): Formal sequence diagrams with exact message flows
- Use both together for complete understanding

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Related Documents**:
- [USER_FLOWS.md](USER_FLOWS.md) - Complete user flow visualizations
- [AWS_ARCHITECTURE_DETAILED.md](AWS_ARCHITECTURE_DETAILED.md) - AWS service configurations
- [CODE_STANDARDS.md](CODE_STANDARDS.md) - Implementation standards

---

*These sequence diagrams provide the exact interaction flows needed for implementation and debugging.*
