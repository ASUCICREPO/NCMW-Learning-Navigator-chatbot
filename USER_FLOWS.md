# Learning Navigator - Complete User Flows

## Overview

This document visualizes all user flows through the system, showing every service interaction and data flow.

---

## Table of Contents

1. [User Authentication Flow](#1-user-authentication-flow)
2. [Basic Chat Message Flow](#2-basic-chat-message-flow)
3. [AI Response Generation (RAG) Flow](#3-ai-response-generation-rag-flow)
4. [Agent with Tools Flow](#4-agent-with-tools-flow)
5. [Escalation to Zendesk Flow](#5-escalation-to-zendesk-flow)
6. [Real-Time Streaming Flow](#6-real-time-streaming-flow)
7. [Document Processing Flow](#7-document-processing-flow)
8. [Admin Analytics Flow](#8-admin-analytics-flow)

---

## 1. User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  User    │
│ (Browser)│
└────┬─────┘
     │
     │ 1. Navigate to https://app.learningnavigator.com
     ▼
┌─────────────────┐
│   CloudFront    │ ◄─── Serves React app from S3
└────┬────────────┘
     │
     │ 2. React app loads
     │
     ▼
┌─────────────────┐
│  React Login    │
│   Component     │
└────┬────────────┘
     │
     │ 3. User enters email + password
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Cognito User Pool                         │
│                                                                  │
│  POST /oauth2/token                                             │
│  ├─ Email: instructor@example.com                              │
│  ├─ Password: ************                                      │
│  └─ ClientId: <app-client-id>                                  │
│                                                                  │
│  Validation Steps:                                              │
│  1. ✓ Verify email exists in user pool                         │
│  2. ✓ Check password hash                                       │
│  3. ✓ Verify account is confirmed                              │
│  4. ✓ Check if MFA is required (optional)                      │
│  5. ✓ Check user group membership                              │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 4. Returns JWT tokens
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      JWT Tokens Returned                         │
│                                                                  │
│  {                                                               │
│    "IdToken": "eyJhbGc...",           // User identity          │
│    "AccessToken": "eyJhbGc...",       // API access             │
│    "RefreshToken": "eyJhbGc...",      // Refresh access         │
│    "ExpiresIn": 3600,                 // 1 hour                 │
│    "TokenType": "Bearer"                                        │
│  }                                                               │
│                                                                  │
│  ID Token Claims:                                               │
│  ├─ sub: "user-123"                                             │
│  ├─ email: "instructor@example.com"                             │
│  ├─ cognito:groups: ["instructors"]                             │
│  ├─ custom:role: "instructor"                                   │
│  └─ custom:language: "en"                                       │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 5. Store tokens in secure storage
     │
     ▼
┌─────────────────┐
│  React App      │
│  (Redux Store)  │
│                 │
│  • Stores tokens in memory                                      │
│  • Refresh token in httpOnly cookie                             │
│  • Sets user state                                              │
│  • Redirects to chat interface                                  │
└────┬────────────┘
     │
     │ 6. Fetch user profile
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Gateway (REST) + Lambda                         │
│                                                                  │
│  GET /api/user/profile                                          │
│  Headers:                                                        │
│  └─ Authorization: Bearer eyJhbGc...                            │
│                                                                  │
│  API Gateway Authorizer:                                        │
│  1. Extract JWT from Authorization header                       │
│  2. Validate signature with Cognito public keys                 │
│  3. Check expiration                                            │
│  4. Extract user claims (sub, email, groups)                    │
│  5. Pass to Lambda via event.requestContext.authorizer          │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 7. Query user data
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DynamoDB                                   │
│                                                                  │
│  GetItem:                                                        │
│  ├─ PK: "USER#user-123"                                         │
│  └─ SK: "PROFILE"                                               │
│                                                                  │
│  Returns:                                                        │
│  {                                                               │
│    "id": "user-123",                                            │
│    "email": "instructor@example.com",                           │
│    "name": "John Doe",                                          │
│    "role": "instructor",                                        │
│    "language": "en",                                            │
│    "preferences": {                                             │
│      "theme": "light",                                          │
│      "notifications": true                                      │
│    },                                                            │
│    "lastActive": "2025-12-20T10:00:00Z"                        │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 8. Return user profile
     │
     ▼
┌──────────┐
│  User    │ ◄─── Authenticated, profile loaded
│ (Chat UI)│      Ready to chat!
└──────────┘
```

**Flow Duration**: ~500ms
**Services Used**: CloudFront, S3, Cognito, API Gateway, Lambda, DynamoDB

---

## 2. Basic Chat Message Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BASIC CHAT MESSAGE FLOW                          │
│                  (Simple Q&A without tools)                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  User    │
└────┬─────┘
     │
     │ 1. User types: "How do I register for a course?"
     │
     ▼
┌─────────────────┐
│  React Chat UI  │
│                 │
│  Actions:                                                        │
│  • Display message in chat                                       │
│  • Show "AI is thinking..." indicator                           │
│  • Call API                                                      │
└────┬────────────┘
     │
     │ 2. POST /api/chat/message
     │    Authorization: Bearer <token>
     │    Body: {
     │      "message": "How do I register for a course?",
     │      "conversationId": "conv-456",
     │      "sessionId": "sess-789"
     │    }
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Gateway (REST)                             │
│                                                                  │
│  Rate Limiting: ✓ Check 100 req/min per user                   │
│  Authorization: ✓ Validate JWT with Cognito                    │
│  Validation:    ✓ Check request schema                         │
│  WAF:           ✓ Check for attacks                            │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 3. Invoke Lambda: sendMessage
     │    Context: { userId: "user-123", role: "instructor" }
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Lambda: sendMessage (sendMessage.ts)                      │
│                                                                  │
│  async function handler(event) {                                │
│    1. Extract user from JWT claims                              │
│    2. Validate message input                                    │
│    3. Get/create conversation                                   │
│    4. Save user message to DynamoDB                             │
│    5. Call AI service for response                              │
│    6. Save AI response to DynamoDB                              │
│    7. Return response                                           │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 4. Get conversation history
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DynamoDB Query                             │
│                                                                  │
│  Query:                                                          │
│  ├─ PK = "CONV#conv-456"                                        │
│  ├─ SK begins_with "MSG#"                                       │
│  ├─ Limit = 10 (last 10 messages)                              │
│  └─ ScanIndexForward = false (newest first)                    │
│                                                                  │
│  Returns: [                                                      │
│    { role: "user", content: "Previous question", ... },        │
│    { role: "assistant", content: "Previous answer", ... }      │
│  ]                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 5. Call AI service with message + history
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│      Lambda: generateResponse (AI Service)                       │
│               Uses LangChain RAG                                 │
│                                                                  │
│  Flow continues in next diagram...                              │
└─────────────────────────────────────────────────────────────────┘
     │
     │ [See "AI Response Generation Flow" below]
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response Generated                            │
│                                                                  │
│  "To register for a course, you can:                            │
│  1. Visit the MHFA Connect platform                             │
│  2. Browse available courses in your area                       │
│  3. Click 'Register' on your chosen course                      │
│  4. Complete the registration form                              │
│                                                                  │
│  For more details, see the MHFA Connect User Guide [1].        │
│                                                                  │
│  Sources:                                                        │
│  [1] MHFA Connect User Guide, Section 3.2"                      │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 6. Save messages to DynamoDB
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DynamoDB PutItem (x2)                          │
│                                                                  │
│  User Message:                                                   │
│  {                                                               │
│    PK: "CONV#conv-456",                                         │
│    SK: "MSG#2025-12-20T10:30:00.000Z",                         │
│    messageId: "msg-001",                                        │
│    role: "user",                                                │
│    content: "How do I register for a course?",                 │
│    userId: "user-123",                                          │
│    timestamp: "2025-12-20T10:30:00.000Z"                       │
│  }                                                               │
│                                                                  │
│  AI Response:                                                    │
│  {                                                               │
│    PK: "CONV#conv-456",                                         │
│    SK: "MSG#2025-12-20T10:30:02.500Z",                         │
│    messageId: "msg-002",                                        │
│    role: "assistant",                                           │
│    content: "To register for a course...",                     │
│    citations: [...],                                            │
│    generatedBy: "claude-3-sonnet",                             │
│    timestamp: "2025-12-20T10:30:02.500Z"                       │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 7. Update conversation metadata
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DynamoDB UpdateItem                             │
│                                                                  │
│  Update:                                                         │
│  ├─ PK: "USER#user-123"                                         │
│  ├─ SK: "CONV#conv-456"                                         │
│  └─ SET messageCount = messageCount + 2                        │
│      SET lastMessageAt = "2025-12-20T10:30:02.500Z"           │
│      SET status = "active"                                      │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 8. Analyze sentiment (async)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Amazon Comprehend (Background)                      │
│                                                                  │
│  DetectSentiment:                                               │
│  ├─ Text: "How do I register for a course?"                    │
│  └─ Language: "en"                                              │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    "Sentiment": "NEUTRAL",                                      │
│    "SentimentScore": {                                          │
│      "Positive": 0.05,                                          │
│      "Neutral": 0.90,                                           │
│      "Negative": 0.03,                                          │
│      "Mixed": 0.02                                              │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 9. Return response to client
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Response                                   │
│                                                                  │
│  HTTP 200 OK                                                     │
│  {                                                               │
│    "messageId": "msg-002",                                      │
│    "content": "To register for a course...",                   │
│    "citations": [                                               │
│      {                                                           │
│        "source": "MHFA Connect User Guide",                    │
│        "section": "Section 3.2",                               │
│        "url": "s3://docs/mhfa-connect-guide.pdf"              │
│      }                                                           │
│    ],                                                            │
│    "timestamp": "2025-12-20T10:30:02.500Z",                    │
│    "conversationId": "conv-456"                                │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ 10. Display response
     │
     ▼
┌──────────┐
│  User    │ ◄─── Sees AI response with citations
│ (Chat UI)│      Can click on source references
└──────────┘
```

**Flow Duration**: ~2-3 seconds
**Services Used**: API Gateway, Lambda (x2), DynamoDB, OpenSearch, Bedrock, Comprehend
**Cost per request**: ~$0.002

---

## 3. AI Response Generation (RAG) Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              AI RESPONSE GENERATION (RAG) FLOW                       │
│           Detailed breakdown of generateResponse Lambda             │
└─────────────────────────────────────────────────────────────────────┘

[Continuing from sendMessage Lambda...]

┌─────────────────────────────────────────────────────────────────┐
│     Lambda: generateResponse (generateResponse.ts)               │
│              Orchestrates RAG pipeline                           │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Input:
     │ • Query: "How do I register for a course?"
     │ • User role: "instructor"
     │ • Conversation history: [last 10 messages]
     │ • Language: "en"
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│            Step 1: Language Detection (if needed)                │
│                   Amazon Comprehend                              │
│                                                                  │
│  DetectDominantLanguage:                                        │
│  └─ Text: "How do I register for a course?"                    │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    "Languages": [                                               │
│      { "LanguageCode": "en", "Score": 0.99 }                   │
│    ]                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Language: en ✓
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│          Step 2: Generate Query Embedding                        │
│              Amazon Bedrock (Titan Embeddings)                   │
│                                                                  │
│  InvokeModel:                                                    │
│  ├─ Model: amazon.titan-embed-text-v1                          │
│  └─ Input: "How do I register for a course?"                   │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    "embedding": [0.234, -0.123, 0.456, ..., 0.789]            │
│  }                                                               │
│  (1536-dimensional vector)                                      │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query embedding: float[1536]
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│      Step 3: Search Knowledge Base (Vector + Keyword)           │
│              Amazon OpenSearch Service                           │
│                                                                  │
│  Hybrid Search Query:                                           │
│  {                                                               │
│    "size": 5,                                                   │
│    "query": {                                                   │
│      "bool": {                                                  │
│        "must": [                                                │
│          {                                                       │
│            "multi_match": {                                     │
│              "query": "register course",                        │
│              "fields": ["text^2", "title"],                    │
│              "type": "best_fields"                             │
│            }                                                     │
│          }                                                       │
│        ],                                                        │
│        "should": [                                              │
│          {                                                       │
│            "knn": {                                             │
│              "embedding": {                                     │
│                "vector": [0.234, -0.123, ...],                │
│                "k": 10                                         │
│              }                                                  │
│            }                                                     │
│          }                                                       │
│        ],                                                        │
│        "filter": [                                              │
│          {                                                       │
│            "terms": {                                           │
│              "role": ["instructor", "all"]                     │
│            }                                                     │
│          },                                                      │
│          {                                                       │
│            "term": { "language": "en" }                        │
│          }                                                       │
│        ]                                                         │
│      }                                                           │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Response (Top 5 Results):                                      │
│  [                                                               │
│    {                                                             │
│      "_score": 15.23,                                          │
│      "_source": {                                               │
│        "text": "To register for a course, log into...",       │
│        "source": "MHFA Connect User Guide",                   │
│        "section": "Section 3.2: Course Registration",         │
│        "role": ["instructor", "learner", "all"]               │
│      }                                                           │
│    },                                                            │
│    {                                                             │
│      "_score": 12.45,                                          │
│      "_source": {                                               │
│        "text": "Course registration process includes...",     │
│        "source": "MHFA Learner Guide",                        │
│        "section": "Getting Started"                           │
│      }                                                           │
│    },                                                            │
│    ... (3 more results)                                         │
│  ]                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Retrieved 5 relevant documents (total ~2000 tokens)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Step 4: Build Context from Retrieved Documents           │
│                    (In Lambda)                                   │
│                                                                  │
│  Context = join(documents.map(d => d.text))                    │
│                                                                  │
│  Context (formatted):                                           │
│  """                                                             │
│  Document 1: MHFA Connect User Guide, Section 3.2              │
│  To register for a course, log into the MHFA Connect...        │
│                                                                  │
│  Document 2: MHFA Learner Guide, Getting Started               │
│  Course registration process includes selecting a course...    │
│                                                                  │
│  [... 3 more documents]                                         │
│  """                                                             │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Context prepared (cached for 5 min)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│       Step 5: Build Prompt with LangChain                        │
│              ChatPromptTemplate                                  │
│                                                                  │
│  const prompt = ChatPromptTemplate.fromMessages([               │
│    ["system", systemPrompt],                                    │
│    ["human", "{context}\n\nQuestion: {question}"]              │
│  ]);                                                             │
│                                                                  │
│  System Prompt (role-based for instructor):                     │
│  """                                                             │
│  You are a helpful assistant for MHFA instructors.             │
│                                                                  │
│  Use the following context to answer questions.                │
│  If you don't know, say so - don't make up information.        │
│  Always cite your sources using [1], [2] notation.             │
│  Be professional and concise.                                   │
│  """                                                             │
│                                                                  │
│  Final Prompt:                                                   │
│  [System] You are a helpful assistant...                        │
│  [Human] Context: [documents...]                               │
│          Question: How do I register for a course?             │
│          Previous messages: [history...]                        │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Prompt ready (~5000 tokens total)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│      Step 6: Generate Response with Bedrock (Claude)            │
│                  LangChain + Bedrock                             │
│                                                                  │
│  const llm = new ChatBedrockConverse({                          │
│    model: "anthropic.claude-3-sonnet-20240229-v1:0",          │
│    region: "us-west-2",                                         │
│    temperature: 0.7,                                            │
│    maxTokens: 2048                                              │
│  });                                                             │
│                                                                  │
│  const response = await llm.invoke(messages);                   │
│                                                                  │
│  Bedrock API Call:                                              │
│  POST https://bedrock-runtime.us-west-2.amazonaws.com          │
│  {                                                               │
│    "anthropic_version": "bedrock-2023-05-31",                  │
│    "max_tokens": 2048,                                          │
│    "temperature": 0.7,                                          │
│    "system": "You are a helpful assistant...",                 │
│    "messages": [                                                │
│      {                                                           │
│        "role": "user",                                          │
│        "content": "Context: [...]\n\nQuestion: [...]"         │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
│                                                                  │
│  Bedrock Response:                                              │
│  {                                                               │
│    "content": [                                                 │
│      {                                                           │
│        "type": "text",                                          │
│        "text": "To register for a course, you can:\n          │
│                 1. Visit the MHFA Connect platform\n          │
│                 2. Browse available courses...\n              │
│                 \n                                             │
│                 For more details, see [1].\n                  │
│                 \n                                             │
│                 Sources:\n                                     │
│                 [1] MHFA Connect User Guide, Section 3.2"     │
│      }                                                           │
│    ],                                                            │
│    "usage": {                                                   │
│      "input_tokens": 4823,                                     │
│      "output_tokens": 287                                      │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Cost: (4823 × $0.003 + 287 × $0.015) / 1000 = $0.0189        │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Response generated in ~2 seconds
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│     Step 7: Extract Citations and Format Response               │
│                    (In Lambda)                                   │
│                                                                  │
│  Parse response to extract:                                     │
│  • Main content                                                 │
│  • Citation markers [1], [2], etc.                             │
│  • Map citations to source documents                           │
│                                                                  │
│  Formatted Response:                                            │
│  {                                                               │
│    "content": "To register for a course, you can:...",        │
│    "citations": [                                               │
│      {                                                           │
│        "id": 1,                                                 │
│        "source": "MHFA Connect User Guide",                   │
│        "section": "Section 3.2",                               │
│        "url": "s3://national-council-s3-pdfs/guide.pdf",      │
│        "excerpt": "To register for a course, log into..."     │
│      }                                                           │
│    ],                                                            │
│    "metadata": {                                                │
│      "inputTokens": 4823,                                      │
│      "outputTokens": 287,                                      │
│      "model": "claude-3-sonnet",                               │
│      "processingTime": 2143                                    │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Response formatted and ready
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│          Step 8: Log to CloudWatch (Observability)              │
│                                                                  │
│  Log Event:                                                      │
│  {                                                               │
│    "timestamp": "2025-12-20T10:30:02Z",                        │
│    "userId": "user-123",                                        │
│    "conversationId": "conv-456",                               │
│    "query": "How do I register for a course?",                │
│    "retrievedDocs": 5,                                          │
│    "inputTokens": 4823,                                         │
│    "outputTokens": 287,                                         │
│    "cost": 0.0189,                                              │
│    "processingTime": 2143,                                      │
│    "model": "claude-3-sonnet"                                   │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Return to sendMessage Lambda
     │
     ▼
[Flow continues back to Basic Chat Message Flow, Step 6]
```

**RAG Flow Duration**: ~2 seconds
**Services Used**: Comprehend, Bedrock (x2), OpenSearch
**Average Cost**: ~$0.02 per response

---

## 4. Agent with Tools Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              AGENT WITH TOOLS FLOW                                   │
│        (Complex query requiring multiple steps)                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  User    │
└────┬─────┘
     │
     │ User asks: "I need help with invoicing, if you can't
     │             help me create a support ticket"
     │
     ▼
[Follows same flow as Basic Chat until generateResponse Lambda...]

┌─────────────────────────────────────────────────────────────────┐
│      Lambda: agentExecutor (uses LangChain Agent)               │
│                                                                  │
│  Instead of simple RAG, uses Agent with Tools:                  │
│  • searchKnowledgeBaseTool                                      │
│  • createZendeskTicketTool                                      │
│  • getCourseTool (optional)                                     │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Initialize agent with tools
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│            Agent Decision: Step 1 (Reasoning)                    │
│                  Bedrock (Claude)                                │
│                                                                  │
│  Agent Prompt:                                                   │
│  """                                                             │
│  You have access to these tools:                                │
│  1. search_knowledge_base - Search documentation                │
│  2. create_support_ticket - Create Zendesk ticket              │
│  3. get_course_info - Fetch course data                        │
│                                                                  │
│  Question: I need help with invoicing, if you can't help       │
│            me create a support ticket                           │
│                                                                  │
│  Think step-by-step about how to answer this.                  │
│  """                                                             │
│                                                                  │
│  Claude's Reasoning (ReAct pattern):                            │
│  {                                                               │
│    "thought": "User needs help with invoicing. I should        │
│                first search the knowledge base for invoicing   │
│                information. If I can't find good info, I'll    │
│                create a support ticket as requested.",         │
│    "action": "search_knowledge_base",                          │
│    "action_input": "instructor invoicing process"              │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Tool: search_knowledge_base
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│         Tool Execution: searchKnowledgeBaseTool                  │
│              (KnowledgeBaseTool.ts)                              │
│                                                                  │
│  async execute(query: string) {                                 │
│    const results = await vectorStore.similaritySearch(         │
│      query, 5, { role: ["instructor", "all"] }                 │
│    );                                                            │
│    return JSON.stringify(results);                             │
│  }                                                               │
│                                                                  │
│  Searches OpenSearch → Returns results                          │
│                                                                  │
│  Tool Result:                                                    │
│  """                                                             │
│  Found 3 documents about invoicing:                            │
│  1. Instructor Handbook: Instructors should submit invoices... │
│  2. MHFA Connect Guide: Invoice submission through portal...   │
│  3. FAQ: Common invoicing questions...                         │
│  """                                                             │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Tool result returned to agent
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Agent Decision: Step 2 (Evaluation)                    │
│                  Bedrock (Claude)                                │
│                                                                  │
│  Agent receives tool result and evaluates:                      │
│                                                                  │
│  Input:                                                          │
│  """                                                             │
│  Previous thought: "Search knowledge base for invoicing info"  │
│  Action taken: search_knowledge_base                            │
│  Observation: [3 documents found about invoicing process...]   │
│  """                                                             │
│                                                                  │
│  Claude's Decision:                                             │
│  {                                                               │
│    "thought": "Great! I found detailed information about       │
│                invoicing in the knowledge base. I can provide  │
│                this to the user. No need to create a ticket.", │
│    "action": "Final Answer",                                    │
│    "action_input": "Based on the Instructor Handbook..."       │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Agent decides to provide final answer (no more tools needed)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Final Response Generated                        │
│                                                                  │
│  "Based on the Instructor Handbook, here's how to handle       │
│   invoicing:                                                    │
│                                                                  │
│   1. Log into MHFA Connect                                     │
│   2. Navigate to 'My Account' > 'Invoicing'                    │
│   3. Submit your invoice with course details                   │
│   4. Invoices are processed within 14 business days            │
│                                                                  │
│   For detailed instructions, see the Instructor Policy         │
│   Handbook [1], Section 5.3.                                   │
│                                                                  │
│   If you need additional help, I can create a support ticket  │
│   for you. Would you like me to do that?"                      │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Return response to user
     │
     ▼
┌──────────┐
│  User    │ ◄─── Sees answer, no ticket needed
└──────────┘

──────────────────────────────────────────────────────────────────

ALTERNATIVE PATH: If knowledge base search fails or user insists...

┌─────────────────────────────────────────────────────────────────┐
│      Agent Decision: Create Ticket (Alternative Path)            │
│                  Bedrock (Claude)                                │
│                                                                  │
│  {                                                               │
│    "thought": "Knowledge base doesn't have enough info, or     │
│                user explicitly requested ticket. I'll create    │
│                a support ticket.",                              │
│    "action": "create_support_ticket",                          │
│    "action_input": {                                            │
│      "subject": "Instructor Invoicing Assistance",             │
│      "description": "User needs help with invoicing process.   │
│                      Context: [conversation summary]",          │
│      "priority": "normal"                                       │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Tool: create_support_ticket
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│         Tool Execution: createZendeskTicketTool                  │
│              (ZendeskTool.ts)                                    │
│                                                                  │
│  async execute(input: string) {                                 │
│    const { subject, description, priority } = JSON.parse(input);│
│                                                                  │
│    // Get Zendesk credentials from Secrets Manager             │
│    const creds = await getZendeskCredentials();                │
│                                                                  │
│    // Create ticket via Zendesk API                            │
│    const ticket = await axios.post(                            │
│      `https://${creds.subdomain}.zendesk.com/api/v2/tickets`, │
│      {                                                          │
│        ticket: {                                               │
│          subject, comment: { body: description },             │
│          priority, status: 'new',                             │
│          custom_fields: [                                      │
│            { id: 123, value: 'chatbot_escalation' }          │
│          ]                                                      │
│        }                                                        │
│      },                                                         │
│      { auth: { username: creds.email, password: creds.token } }│
│    );                                                           │
│                                                                  │
│    return `Ticket ${ticket.data.ticket.id} created`;          │
│  }                                                               │
│                                                                  │
│  Zendesk Response:                                              │
│  {                                                               │
│    "ticket": {                                                  │
│      "id": 12345,                                              │
│      "url": "https://nationalcouncil.zendesk.com/tickets/...",│
│      "status": "new",                                           │
│      "priority": "normal"                                       │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Tool result: "Ticket 12345 created"
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│         Agent saves ticket ID to DynamoDB                        │
│                                                                  │
│  UpdateItem:                                                     │
│  ├─ PK: "USER#user-123"                                         │
│  ├─ SK: "CONV#conv-456"                                         │
│  └─ SET escalated = true                                        │
│      SET zendeskTicketId = "12345"                             │
│      SET escalatedAt = "2025-12-20T10:30:05Z"                 │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Final agent response
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Final Response                                  │
│                                                                  │
│  "I've created a support ticket for you to get personalized    │
│   help with invoicing.                                          │
│                                                                  │
│   Ticket #12345 has been submitted and our support team will  │
│   reach out to you within 1 business day.                      │
│                                                                  │
│   In the meantime, you can track your ticket at:              │
│   https://nationalcouncil.zendesk.com/tickets/12345           │
│                                                                  │
│   Is there anything else I can help you with?"                 │
└────┬────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐
│  User    │ ◄─── Gets ticket confirmation
└──────────┘
```

**Agent Flow Duration**: ~4-5 seconds (multiple LLM calls)
**Services Used**: Bedrock (x2-3), OpenSearch, Zendesk API, Secrets Manager, DynamoDB
**Cost per request**: ~$0.04-0.06

---

## 5. Escalation to Zendesk Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│             AUTOMATIC ESCALATION FLOW                                │
│         (Triggered by negative sentiment or repeated failures)       │
└─────────────────────────────────────────────────────────────────────┘

[User has negative experience, sentiment detected as NEGATIVE]

┌─────────────────────────────────────────────────────────────────┐
│       Sentiment Analysis detects negative sentiment              │
│                  Amazon Comprehend                               │
│                                                                  │
│  User message: "This is frustrating! I've asked 3 times and    │
│                 you're not helping!"                            │
│                                                                  │
│  DetectSentiment Response:                                      │
│  {                                                               │
│    "Sentiment": "NEGATIVE",                                     │
│    "SentimentScore": {                                          │
│      "Negative": 0.89,                                          │
│      "Mixed": 0.08,                                             │
│      "Neutral": 0.02,                                           │
│      "Positive": 0.01                                           │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Escalation criteria met:
     │ • Negative sentiment > 0.7
     │ • OR repeated failed queries (conversation.failedAttempts > 2)
     │ • OR user explicitly asks for human help
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│          Lambda: Escalation Logic Triggered                      │
│                                                                  │
│  if (shouldEscalate(sentiment, conversation)) {                 │
│    await escalateToHuman(conversation, user);                   │
│  }                                                               │
│                                                                  │
│  function shouldEscalate(sentiment, conversation) {             │
│    return (                                                      │
│      sentiment.Negative > 0.7 ||                               │
│      conversation.failedAttempts > 2 ||                        │
│      conversation.hasExplicitEscalationRequest                 │
│    );                                                            │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Prepare escalation data
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│      Gather Conversation Context for Ticket                      │
│                                                                  │
│  Query DynamoDB for full conversation:                          │
│  • All messages in conversation                                 │
│  • User profile and role                                        │
│  • Sentiment history                                            │
│  • Failed query attempts                                        │
│                                                                  │
│  Build Ticket Description:                                      │
│  """                                                             │
│  Chatbot Escalation - Automated                                │
│                                                                  │
│  User: John Doe (instructor@example.com)                       │
│  Role: Instructor                                               │
│  Conversation ID: conv-456                                      │
│  Started: 2025-12-20 10:25:00                                  │
│  Escalated: 2025-12-20 10:32:15                                │
│                                                                  │
│  Reason: Negative sentiment detected (0.89)                    │
│                                                                  │
│  Conversation Summary:                                          │
│  User: How do I submit an invoice?                             │
│  AI: [response about invoicing]                                │
│  User: That doesn't answer my question!                        │
│  AI: [another response]                                         │
│  User: This is frustrating! I've asked 3 times...              │
│                                                                  │
│  User's Original Question:                                      │
│  How do I submit an invoice for a course I taught last month? │
│  """                                                             │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Get Zendesk credentials
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│               AWS Secrets Manager                                │
│                                                                  │
│  GetSecretValue:                                                │
│  └─ SecretId: "learning-navigator/zendesk"                     │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    "subdomain": "nationalcouncil",                             │
│    "email": "api@nationalcouncil.org",                         │
│    "apiToken": "abc123...xyz"                                  │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Create Zendesk ticket
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Zendesk API Call                                │
│                                                                  │
│  POST https://nationalcouncil.zendesk.com/api/v2/tickets       │
│  Authorization: Basic [base64(email:token)]                     │
│                                                                  │
│  Request Body:                                                   │
│  {                                                               │
│    "ticket": {                                                  │
│      "subject": "Chatbot Escalation - Invoicing Help",         │
│      "comment": {                                               │
│        "body": "[Full conversation context...]"                │
│      },                                                          │
│      "priority": "normal",                                      │
│      "status": "new",                                           │
│      "requester": {                                             │
│        "name": "John Doe",                                     │
│        "email": "instructor@example.com"                       │
│      },                                                          │
│      "tags": ["chatbot", "escalation", "auto"],               │
│      "custom_fields": [                                         │
│        { "id": 360001234567, "value": "chatbot_escalation" }, │
│        { "id": 360001234568, "value": "conv-456" }            │
│      ]                                                           │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Zendesk Response:                                              │
│  {                                                               │
│    "ticket": {                                                  │
│      "id": 12345,                                              │
│      "url": "https://nationalcouncil.zendesk.com/agent/...",  │
│      "created_at": "2025-12-20T10:32:16Z",                    │
│      "status": "new",                                           │
│      "priority": "normal"                                       │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Ticket created: #12345
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Update Conversation in DynamoDB                           │
│                                                                  │
│  UpdateItem:                                                     │
│  {                                                               │
│    TableName: "learning-navigator",                            │
│    Key: {                                                        │
│      PK: "USER#user-123",                                      │
│      SK: "CONV#conv-456"                                       │
│    },                                                            │
│    UpdateExpression:                                            │
│      "SET escalated = :true,                                   │
│           zendeskTicketId = :ticketId,                         │
│           escalatedAt = :timestamp,                            │
│           escalationReason = :reason,                          │
│           status = :status",                                    │
│    ExpressionAttributeValues: {                                │
│      ":true": true,                                            │
│      ":ticketId": "12345",                                     │
│      ":timestamp": "2025-12-20T10:32:16Z",                    │
│      ":reason": "negative_sentiment",                          │
│      ":status": "escalated"                                    │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Log escalation event
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              CloudWatch Logs                                     │
│                                                                  │
│  {                                                               │
│    "event": "conversation_escalated",                          │
│    "timestamp": "2025-12-20T10:32:16Z",                       │
│    "userId": "user-123",                                        │
│    "conversationId": "conv-456",                               │
│    "zendeskTicketId": "12345",                                 │
│    "reason": "negative_sentiment",                             │
│    "sentimentScore": 0.89,                                      │
│    "messageCount": 6,                                           │
│    "failedAttempts": 3                                          │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Return response to user
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              User-Friendly Escalation Message                    │
│                                                                  │
│  "I apologize that I wasn't able to help you effectively.      │
│                                                                  │
│   I've escalated your question to our support team who will    │
│   provide personalized assistance.                              │
│                                                                  │
│   Support Ticket #12345 has been created.                      │
│                                                                  │
│   Our team will respond via email within 1 business day.       │
│   You can track your ticket at:                                │
│   https://nationalcouncil.zendesk.com/tickets/12345           │
│                                                                  │
│   Is there anything else I can help you with in the meantime?" │
└────┬────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐
│  User    │ ◄─── Receives escalation confirmation
│          │      Can continue conversation if needed
└──────────┘

──────────────────────────────────────────────────────────────────

[Meanwhile, in Zendesk...]

┌─────────────────────────────────────────────────────────────────┐
│                  Zendesk Agent Dashboard                         │
│                                                                  │
│  New Ticket Notification:                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ #12345 - Chatbot Escalation - Invoicing Help          │    │
│  │ Priority: Normal | Status: New                         │    │
│  │ Created: 2025-12-20 10:32 AM                          │    │
│  │                                                         │    │
│  │ Tags: chatbot, escalation, auto                       │    │
│  │                                                         │    │
│  │ Requester: John Doe (instructor@example.com)          │    │
│  │                                                         │    │
│  │ [Full conversation history displayed]                 │    │
│  │                                                         │    │
│  │ Custom Fields:                                         │    │
│  │ • Source: chatbot_escalation                          │    │
│  │ • Conversation ID: conv-456                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Support agent can:                                             │
│  • See full context                                             │
│  • Respond directly to user via email                          │
│  • View conversation sentiment history                         │
│  • Access user profile and past tickets                        │
└─────────────────────────────────────────────────────────────────┘
```

**Escalation Flow Duration**: ~1-2 seconds
**Services Used**: Comprehend, Secrets Manager, Zendesk API, DynamoDB, CloudWatch
**Cost per escalation**: ~$0.001

---

## 6. Real-Time Streaming Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              REAL-TIME STREAMING RESPONSE FLOW                       │
│            (WebSocket for live token streaming)                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  User    │
└────┬─────┘
     │
     │ User types message in chat
     │
     ▼
┌─────────────────┐
│  React Chat UI  │
│                 │
│  1. Establish WebSocket connection (if not connected)               │
│  2. Send message via WebSocket                                      │
└────┬────────────┘
     │
     │ WebSocket: wss://ws-api.learningnavigator.com
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Gateway (WebSocket)                             │
│                                                                  │
│  Route: $default                                                │
│  ConnectionId: abc123xyz (unique per client)                    │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Invoke Lambda: streamResponse
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Lambda: streamResponse (streamResponse.ts)                │
│                                                                  │
│  async function handler(event: WebSocketEvent) {                │
│    const connectionId = event.requestContext.connectionId;      │
│    const message = JSON.parse(event.body);                      │
│                                                                  │
│    // 1. Get conversation context                               │
│    const context = await getContext(message.conversationId);    │
│                                                                  │
│    // 2. Search knowledge base                                  │
│    const docs = await searchKnowledgeBase(message.content);     │
│                                                                  │
│    // 3. Stream response from Bedrock                           │
│    await streamBedrockResponse(                                 │
│      message.content,                                           │
│      docs,                                                       │
│      context,                                                    │
│      connectionId                                                │
│    );                                                            │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Call Bedrock with streaming
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│       Amazon Bedrock - Streaming Response                        │
│                                                                  │
│  const command = new InvokeModelWithResponseStreamCommand({     │
│    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",         │
│    contentType: "application/json",                             │
│    body: JSON.stringify({                                       │
│      anthropic_version: "bedrock-2023-05-31",                  │
│      max_tokens: 2048,                                          │
│      messages: [...],                                           │
│      stream: true  // ◄── Enable streaming                     │
│    })                                                            │
│  });                                                             │
│                                                                  │
│  const response = await bedrockClient.send(command);            │
│                                                                  │
│  // Process stream                                              │
│  for await (const event of response.body) {                     │
│    if (event.chunk) {                                           │
│      const chunk = JSON.parse(decoder.decode(event.chunk.bytes));│
│                                                                  │
│      if (chunk.type === 'content_block_delta') {               │
│        const token = chunk.delta.text;                          │
│        // Send token immediately to client                      │
│        await sendToWebSocket(connectionId, token);             │
│      }                                                           │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ For each token generated...
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│       Send Token to Client via WebSocket                         │
│                                                                  │
│  const apiGatewayManagementApi =                                │
│    new ApiGatewayManagementApiClient({                          │
│      endpoint: process.env.WEBSOCKET_ENDPOINT                   │
│    });                                                           │
│                                                                  │
│  await apiGatewayManagementApi.send(                            │
│    new PostToConnectionCommand({                                │
│      ConnectionId: connectionId,                                │
│      Data: JSON.stringify({                                     │
│        type: 'token',                                           │
│        content: 'To ',  // ◄── Single token                    │
│        messageId: 'msg-002'                                     │
│      })                                                          │
│    })                                                            │
│  );                                                              │
│                                                                  │
│  // Repeat for each token:                                      │
│  // "To " → "register " → "for " → "a " → "course" → ...       │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Tokens stream in real-time (~20 tokens/sec)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Client Receives Tokens                              │
│                                                                  │
│  WebSocket.onmessage = (event) => {                             │
│    const data = JSON.parse(event.data);                         │
│                                                                  │
│    if (data.type === 'token') {                                 │
│      // Append token to current message                         │
│      setCurrentMessage(prev => prev + data.content);           │
│    }                                                             │
│  };                                                              │
│                                                                  │
│  User sees text appear character by character:                  │
│  "T"                                                             │
│  "To "                                                           │
│  "To register "                                                  │
│  "To register for "                                              │
│  "To register for a "                                            │
│  "To register for a course"                                      │
│  "To register for a course, you can:"                           │
│  [... full response builds in real-time]                        │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ When streaming complete...
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Send Completion Message                                │
│                                                                  │
│  await apiGatewayManagementApi.send(                            │
│    new PostToConnectionCommand({                                │
│      ConnectionId: connectionId,                                │
│      Data: JSON.stringify({                                     │
│        type: 'complete',                                        │
│        messageId: 'msg-002',                                    │
│        fullContent: fullResponse,                               │
│        citations: [...],                                        │
│        metadata: {                                              │
│          inputTokens: 4823,                                     │
│          outputTokens: 287,                                     │
│          processingTime: 2143                                   │
│        }                                                         │
│      })                                                          │
│    })                                                            │
│  );                                                              │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Save complete message to DynamoDB
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Save Messages to DynamoDB                              │
│                                                                  │
│  [Same as Basic Chat Flow - save user + AI messages]           │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Final rendering
     │
     ▼
┌──────────┐
│  User    │ ◄─── Sees complete response with citations
│ (Chat UI)│      Smooth typewriter effect completed
└──────────┘
```

**Streaming Flow Benefits**:
- ✅ User sees response immediately (not waiting 2-3 seconds)
- ✅ Better perceived performance
- ✅ Users can stop generation if needed
- ✅ More engaging user experience

**Flow Duration**: ~2-3 seconds (same as non-streaming, but perceived as faster)
**Latency to first token**: ~300-500ms

---

## 7. Document Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│            DOCUMENT PROCESSING FLOW (BACKGROUND)                     │
│         (Triggered when PDF uploaded to S3)                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Admin   │
│  User    │
└────┬─────┘
     │
     │ Uploads new PDF to S3
     │ (or PDF is automatically synced)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              S3 Bucket: national-council-s3-pdfs                 │
│                                                                  │
│  PUT Object:                                                     │
│  ├─ Key: instructor-guides/new-invoicing-guide.pdf             │
│  ├─ Size: 2.3 MB                                               │
│  └─ ContentType: application/pdf                               │
│                                                                  │
│  S3 Event Notification triggered:                              │
│  └─ Event: s3:ObjectCreated:Put                                │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Lambda invoked automatically
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│      Lambda: processDocument (processDocument.ts)                │
│              Timeout: 5 minutes, Memory: 2048MB                  │
│                                                                  │
│  async function handler(event: S3Event) {                       │
│    for (const record of event.Records) {                        │
│      const bucket = record.s3.bucket.name;                      │
│      const key = record.s3.object.key;                          │
│                                                                  │
│      console.log(`Processing: s3://${bucket}/${key}`);         │
│                                                                  │
│      // 1. Extract text from PDF                               │
│      const text = await extractText(bucket, key);              │
│                                                                  │
│      // 2. Detect language                                     │
│      const language = await detectLanguage(text);              │
│                                                                  │
│      // 3. Extract metadata from path                          │
│      const metadata = extractMetadata(key);                     │
│                                                                  │
│      // 4. Chunk the document                                  │
│      const chunks = chunkDocument(text);                        │
│                                                                  │
│      // 5. Process each chunk                                  │
│      for (const chunk of chunks) {                              │
│        await processChunk(chunk, metadata, language);          │
│      }                                                           │
│    }                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 1: Extract text
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Amazon Textract                                     │
│                                                                  │
│  DetectDocumentText:                                            │
│  {                                                               │
│    Document: {                                                  │
│      S3Object: {                                                │
│        Bucket: "national-council-s3-pdfs",                     │
│        Name: "instructor-guides/new-invoicing-guide.pdf"       │
│      }                                                           │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Response (simplified):                                         │
│  {                                                               │
│    Blocks: [                                                    │
│      {                                                           │
│        BlockType: "LINE",                                       │
│        Text: "Invoicing Guide for MHFA Instructors",          │
│        Confidence: 99.2                                         │
│      },                                                          │
│      {                                                           │
│        BlockType: "LINE",                                       │
│        Text: "Follow these steps to submit invoices...",       │
│        Confidence: 98.7                                         │
│      },                                                          │
│      ... (all text from PDF)                                    │
│    ]                                                             │
│  }                                                               │
│                                                                  │
│  Extracted Text (~50,000 characters):                           │
│  "Invoicing Guide for MHFA Instructors\n\n                     │
│   Follow these steps to submit invoices...\n                   │
│   [... full document text ...]"                                 │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 2: Detect language
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Amazon Comprehend                                   │
│                                                                  │
│  DetectDominantLanguage (first 5000 chars):                    │
│  {                                                               │
│    Text: "Invoicing Guide for MHFA Instructors..."            │
│  }                                                               │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    Languages: [                                                 │
│      { LanguageCode: "en", Score: 0.99 }                       │
│    ]                                                             │
│  }                                                               │
│                                                                  │
│  Language: "en" ✓                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 3: Extract metadata from S3 key path
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Metadata Extraction (in Lambda)                        │
│                                                                  │
│  Key: "instructor-guides/new-invoicing-guide.pdf"              │
│                                                                  │
│  Parsed Metadata:                                               │
│  {                                                               │
│    role: "instructor",        // from "instructor-guides"      │
│    category: "invoicing",     // from filename                 │
│    documentType: "guide",     // from filename                 │
│    source: "new-invoicing-guide.pdf"                           │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 4: Chunk document
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│            Document Chunking (in Lambda)                         │
│                                                                  │
│  Strategy:                                                       │
│  • Split on paragraphs first                                    │
│  • Max chunk size: 500 tokens (~2000 characters)               │
│  • Overlap: 50 tokens (~200 characters)                        │
│                                                                  │
│  Input: 50,000 characters                                       │
│  Output: ~30 chunks                                             │
│                                                                  │
│  Chunk Example:                                                 │
│  {                                                               │
│    index: 0,                                                    │
│    text: "Invoicing Guide for MHFA Instructors\n\n            │
│           This guide explains how instructors should...         │
│           [~2000 characters]",                                  │
│    startOffset: 0,                                              │
│    endOffset: 2000                                              │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 5: Process each chunk (30 iterations)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│           For Each Chunk: Generate Embedding                     │
│              Amazon Bedrock (Titan Embeddings)                   │
│                                                                  │
│  InvokeModel (×30):                                             │
│  {                                                               │
│    modelId: "amazon.titan-embed-text-v1",                      │
│    body: {                                                      │
│      inputText: chunk.text                                      │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Response:                                                       │
│  {                                                               │
│    embedding: [0.123, -0.456, 0.789, ..., 0.234]              │
│  }                                                               │
│  (1536-dimensional vector per chunk)                           │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Step 6: Index each chunk in OpenSearch
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        For Each Chunk: Index in OpenSearch                       │
│                                                                  │
│  POST https://opensearch-endpoint/knowledge-base/_doc           │
│                                                                  │
│  Document (×30):                                                │
│  {                                                               │
│    documentId: "invoicing-guide-chunk-0",                      │
│    chunkIndex: 0,                                               │
│    totalChunks: 30,                                             │
│    text: "Invoicing Guide for MHFA Instructors...",           │
│    embedding: [0.123, -0.456, ...],                           │
│    source: "instructor-guides/new-invoicing-guide.pdf",        │
│    bucket: "national-council-s3-pdfs",                         │
│    language: "en",                                              │
│    role: "instructor",                                          │
│    category: "invoicing",                                       │
│    documentType: "guide",                                       │
│    processedAt: "2025-12-20T10:45:00Z"                        │
│  }                                                               │
│                                                                  │
│  OpenSearch Response:                                           │
│  {                                                               │
│    _index: "knowledge-base",                                    │
│    _id: "invoicing-guide-chunk-0",                            │
│    result: "created",                                           │
│    _version: 1                                                  │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ All 30 chunks indexed
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Log Processing Complete                             │
│                                                                  │
│  CloudWatch Log:                                                │
│  {                                                               │
│    event: "document_processed",                                 │
│    timestamp: "2025-12-20T10:45:30Z",                         │
│    source: "new-invoicing-guide.pdf",                          │
│    bucket: "national-council-s3-pdfs",                         │
│    key: "instructor-guides/new-invoicing-guide.pdf",          │
│    textLength: 50000,                                           │
│    chunks: 30,                                                  │
│    language: "en",                                              │
│    processingTime: 45000,  // 45 seconds                       │
│    textractCost: 0.15,                                          │
│    embeddingCost: 0.03,                                         │
│    totalCost: 0.18                                              │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Document now searchable!
     │
     ▼
┌──────────┐
│ Knowledge│ ◄─── New document available in search
│   Base   │      Users can now ask questions about invoicing
└──────────┘
```

**Processing Time**: ~30-60 seconds per PDF (depends on size)
**Services Used**: S3, Lambda, Textract, Comprehend, Bedrock (Titan), OpenSearch
**Cost per document**: ~$0.15-0.30 (one-time)

---

## 8. Admin Analytics Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                ADMIN ANALYTICS DASHBOARD FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│  Admin   │
│  User    │
└────┬─────┘
     │
     │ Navigates to Admin Dashboard
     │
     ▼
┌─────────────────┐
│  React Admin UI │
│                 │
│  useEffect(() => {                                               │
│    fetchAnalytics();                                            │
│  }, []);                                                         │
└────┬────────────┘
     │
     │ GET /api/admin/analytics?timeRange=last_30_days
     │ Authorization: Bearer <admin-token>
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Gateway + Lambda                                │
│                                                                  │
│  Authorizer:                                                    │
│  1. Verify JWT                                                  │
│  2. Check user.groups includes "admins"                        │
│  3. Reject if not admin                                         │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Invoke Lambda: getAnalytics
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Lambda: getAnalytics (getAnalytics.ts)                    │
│                                                                  │
│  async function handler(event) {                                │
│    const timeRange = event.queryStringParameters.timeRange;    │
│    const startDate = calculateStartDate(timeRange);            │
│                                                                  │
│    const analytics = await Promise.all([                        │
│      getConversationMetrics(startDate),                        │
│      getUserEngagementMetrics(startDate),                      │
│      getSentimentAnalysis(startDate),                          │
│      getEscalationMetrics(startDate),                          │
│      getPerformanceMetrics(startDate)                          │
│    ]);                                                           │
│                                                                  │
│    return formatAnalyticsResponse(analytics);                  │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query 1: Conversation Metrics
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        DynamoDB Query - Conversation Metrics                     │
│                                                                  │
│  Query GSI1:                                                    │
│  {                                                               │
│    IndexName: "GSI1PK-GSI1SK-index",                          │
│    KeyConditionExpression: "GSI1PK BETWEEN :start AND :end",  │
│    ExpressionAttributeValues: {                                │
│      ":start": "DATE#2025-11-20",                             │
│      ":end": "DATE#2025-12-20"                                │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  Aggregate Results:                                             │
│  {                                                               │
│    totalConversations: 1247,                                    │
│    totalMessages: 8935,                                         │
│    avgMessagesPerConversation: 7.16,                           │
│    activeUsers: 342,                                            │
│    newUsers: 89                                                 │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query 2: Sentiment Analysis
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Aggregate Sentiment Data from Conversations              │
│                                                                  │
│  Results:                                                        │
│  {                                                               │
│    positive: 734 (58.9%),                                       │
│    neutral: 423 (33.9%),                                        │
│    negative: 90 (7.2%),                                         │
│    avgSatisfaction: 4.2 / 5.0                                  │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query 3: Escalation Metrics
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│        Count Escalated Conversations                             │
│                                                                  │
│  Results:                                                        │
│  {                                                               │
│    totalEscalations: 78,                                        │
│    escalationRate: 6.25%,                                       │
│    reasonBreakdown: {                                           │
│      negative_sentiment: 45,                                    │
│      repeated_failures: 21,                                     │
│      explicit_request: 12                                       │
│    },                                                            │
│    avgTimeToEscalation: "4.3 minutes"                          │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query 4: Performance Metrics from CloudWatch
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              CloudWatch GetMetricStatistics                      │
│                                                                  │
│  Metrics:                                                        │
│  • Lambda duration (p50, p95, p99)                             │
│  • API Gateway latency                                          │
│  • Error rates                                                  │
│  • Bedrock token usage                                          │
│                                                                  │
│  Results:                                                        │
│  {                                                               │
│    avgResponseTime: 2.3,  // seconds                           │
│    p95ResponseTime: 3.8,                                        │
│    errorRate: 0.8%,                                             │
│    bedrockCost: 127.45,  // USD this month                     │
│    totalCost: 412.33      // USD this month                    │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Query 5: Top Topics (from conversation analysis)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│         Analyze Most Common Topics/Keywords                      │
│                                                                  │
│  Results:                                                        │
│  {                                                               │
│    topTopics: [                                                 │
│      { topic: "Course Registration", count: 234 },             │
│      { topic: "Invoicing", count: 187 },                       │
│      { topic: "Certification", count: 156 },                   │
│      { topic: "Platform Navigation", count: 143 },             │
│      { topic: "Course Materials", count: 89 }                  │
│    ]                                                             │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Compile all metrics
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Return Complete Analytics Response                  │
│                                                                  │
│  {                                                               │
│    "period": {                                                  │
│      "start": "2025-11-20",                                    │
│      "end": "2025-12-20",                                      │
│      "days": 30                                                 │
│    },                                                            │
│    "conversations": {                                           │
│      "total": 1247,                                            │
│      "totalMessages": 8935,                                    │
│      "avgLength": 7.16,                                         │
│      "dailyAvg": 41.6                                           │
│    },                                                            │
│    "users": {                                                   │
│      "active": 342,                                            │
│      "new": 89,                                                 │
│      "retention": "73.2%"                                       │
│    },                                                            │
│    "sentiment": {                                               │
│      "positive": 58.9,                                          │
│      "neutral": 33.9,                                           │
│      "negative": 7.2,                                           │
│      "satisfaction": 4.2                                        │
│    },                                                            │
│    "escalations": {                                             │
│      "total": 78,                                              │
│      "rate": 6.25,                                              │
│      "avgTimeToEscalation": "4.3 minutes"                      │
│    },                                                            │
│    "performance": {                                             │
│      "avgResponseTime": 2.3,                                    │
│      "p95ResponseTime": 3.8,                                    │
│      "errorRate": 0.8                                           │
│    },                                                            │
│    "costs": {                                                   │
│      "bedrock": 127.45,                                         │
│      "total": 412.33                                            │
│    },                                                            │
│    "topTopics": [...]                                           │
│  }                                                               │
└────┬────────────────────────────────────────────────────────────┘
     │
     │ Render in dashboard
     │
     ▼
┌──────────┐
│  Admin   │ ◄─── Sees comprehensive analytics dashboard
│Dashboard │      Charts, graphs, key metrics
└──────────┘
```

**Analytics Flow Duration**: ~1-2 seconds
**Services Used**: API Gateway, Lambda, DynamoDB, CloudWatch
**Cost per request**: ~$0.001

---

## Summary: Key Flows & Timings

| Flow | Duration | Services | Cost/Request |
|------|----------|----------|--------------|
| Authentication | ~500ms | Cognito, API Gateway, Lambda, DynamoDB | ~$0.0001 |
| Basic Chat | ~2-3s | API Gateway, Lambda (x2), DynamoDB, OpenSearch, Bedrock, Comprehend | ~$0.02 |
| RAG Generation | ~2s | Bedrock (x2), OpenSearch, Comprehend | ~$0.02 |
| Agent with Tools | ~4-5s | Bedrock (x2-3), OpenSearch, Zendesk, DynamoDB | ~$0.04-0.06 |
| Escalation | ~1-2s | Comprehend, Zendesk, Secrets Manager, DynamoDB | ~$0.001 |
| Streaming | ~2-3s | WebSocket API, Lambda, Bedrock (streaming) | ~$0.02 |
| Document Processing | ~30-60s | S3, Lambda, Textract, Bedrock, OpenSearch | ~$0.20 (one-time) |
| Analytics | ~1-2s | API Gateway, Lambda, DynamoDB, CloudWatch | ~$0.001 |

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Complete User Flow Documentation
