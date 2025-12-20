# LangChain & Agent Frameworks Integration Guide

## Overview

While the initial architecture uses direct AWS SDK calls, integrating **LangChain** (or similar frameworks) can significantly improve development speed, maintainability, and your learning experience.

---

## Why Use LangChain/Agent Frameworks?

### ✅ Benefits

1. **Abstraction Layer**: Simplifies complex RAG and agent workflows
2. **Built-in Patterns**: Pre-built chains for common use cases
3. **Flexibility**: Easy to swap LLM providers or vector stores
4. **Memory Management**: Built-in conversation memory
5. **Agent Capabilities**: ReAct, Tool-using agents out of the box
6. **Community**: Large ecosystem of integrations
7. **Learning**: Industry-standard framework - great for your career

### ⚠️ Considerations

- Adds dependency overhead
- Some AWS-specific features might be easier with direct SDK
- Need to learn the framework API

---

## Recommended Approach: Hybrid Architecture

Use **LangChain** for AI/RAG logic, **AWS SDK** for infrastructure:

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React)                                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  API Gateway + Lambda                                │
│  (AWS SDK - infrastructure)                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  LangChain Layer                                     │
│  ┌──────────────────────────────────────┐           │
│  │  • RAG Chain                          │           │
│  │  • Conversation Memory                │           │
│  │  • Agent with Tools                   │           │
│  │  • Prompt Templates                   │           │
│  └──────────────────────────────────────┘           │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌─────────┐  ┌────────┐
│Bedrock │  │OpenSearch│  │Zendesk│
└────────┘  └─────────┘  └────────┘
```

---

## LangChain Implementation Plan

### Phase 1: Basic RAG with LangChain (Week 5-6)

Replace direct Bedrock + OpenSearch calls with LangChain RAG chain.

### Phase 2: Agent Framework (Week 7-8)

Add agent capabilities for complex queries and tool usage.

### Phase 3: Advanced Features (Week 9+)

Memory, guardrails, evaluation, etc.

---

## Implementation Examples

### 1. Basic RAG Chain with LangChain

#### Installation

```bash
npm install langchain @langchain/aws @langchain/community
```

#### Lambda Function with LangChain RAG

```typescript
// backend/functions/ai/generateResponseWithLangChain.ts
import { ChatBedrockConverse } from "@langchain/aws";
import { OpenSearchVectorStore } from "@langchain/community/vectorstores/opensearch";
import { BedrockEmbeddings } from "@langchain/aws";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Client } from "@opensearch-project/opensearch";

// Initialize Bedrock LLM
const llm = new ChatBedrockConverse({
  model: "anthropic.claude-3-sonnet-20240229-v1:0",
  region: "us-west-2",
  temperature: 0.7,
  maxTokens: 2048,
});

// Initialize embeddings
const embeddings = new BedrockEmbeddings({
  model: "amazon.titan-embed-text-v1",
  region: "us-west-2",
});

// Initialize OpenSearch vector store
const vectorStore = new OpenSearchVectorStore(embeddings, {
  client: new Client({
    node: process.env.OPENSEARCH_ENDPOINT!,
    // ... auth config
  }),
  indexName: "knowledge-base",
});

// Create prompt template
const systemPrompt = `You are a helpful assistant for Mental Health First Aid (MHFA) instructors and staff.

Use the following pieces of context to answer the user's question.
If you don't know the answer, say you don't know - don't make up information.
Always cite your sources using the provided metadata.

Context:
{context}

Question: {input}

Answer:`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["human", "{input}"],
]);

// Create document chain
const documentChain = await createStuffDocumentsChain({
  llm,
  prompt,
});

// Create retrieval chain
const retrievalChain = await createRetrievalChain({
  retriever: vectorStore.asRetriever({
    k: 5, // Retrieve top 5 documents
    filter: {
      role: ["instructor", "all"], // Role-based filtering
    },
  }),
  combineDocsChain: documentChain,
});

// Handler
export async function handler(event: any) {
  const { query, userId, conversationId, userRole } = JSON.parse(event.body);

  try {
    // Invoke the chain
    const response = await retrievalChain.invoke({
      input: query,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        answer: response.answer,
        sourceDocuments: response.sourceDocuments.map((doc) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate response" }),
    };
  }
}
```

---

### 2. Conversational RAG with Memory

```typescript
// backend/functions/ai/conversationalRAG.ts
import { ChatBedrockConverse } from "@langchain/aws";
import { OpenSearchVectorStore } from "@langchain/community/vectorstores/opensearch";
import { DynamoDBChatMessageHistory } from "@langchain/community/stores/message/dynamodb";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";

// Initialize chat history (stored in DynamoDB)
const chatHistory = new DynamoDBChatMessageHistory({
  tableName: process.env.DYNAMODB_TABLE_NAME!,
  partitionKey: "conversationId",
  sessionId: conversationId, // Passed from request
  config: {
    region: "us-west-2",
  },
});

// Create memory
const memory = new BufferMemory({
  chatHistory,
  returnMessages: true,
  memoryKey: "chat_history",
});

// Create conversational chain
const conversationChain = new ConversationChain({
  llm,
  memory,
  verbose: true, // Useful for debugging
});

// Use in conversation
const response = await conversationChain.invoke({
  input: query,
});

console.log("Response:", response.response);
```

---

### 3. Agent with Tools (Advanced)

Create an agent that can use multiple tools (search knowledge base, create Zendesk ticket, etc.)

```typescript
// backend/functions/ai/agentWithTools.ts
import { ChatBedrockConverse } from "@langchain/aws";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { DynamicTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Define tools
const searchKnowledgeBaseTool = new DynamicTool({
  name: "search_knowledge_base",
  description: "Search the MHFA knowledge base for information about courses, policies, and procedures. Input should be a search query.",
  func: async (query: string) => {
    // Search OpenSearch
    const results = await vectorStore.similaritySearch(query, 3);
    return JSON.stringify(
      results.map((doc) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
      }))
    );
  },
});

const createZendeskTicketTool = new DynamicTool({
  name: "create_zendesk_ticket",
  description: "Create a support ticket in Zendesk when the user needs human help. Input should be a JSON string with 'subject' and 'description'.",
  func: async (input: string) => {
    const { subject, description } = JSON.parse(input);

    // Call Zendesk API
    const ticketId = await createZendeskTicket({
      subject,
      description,
      userId: currentUserId,
    });

    return `Ticket created successfully with ID: ${ticketId}`;
  },
});

const getCourseInfoTool = new DynamicTool({
  name: "get_course_info",
  description: "Get information about MHFA courses from the LMS. Input should be a course name or ID.",
  func: async (courseQuery: string) => {
    // Call LMS API
    const courses = await fetchCoursesFromLMS(courseQuery);
    return JSON.stringify(courses);
  },
});

// Create agent
const tools = [
  searchKnowledgeBaseTool,
  createZendeskTicketTool,
  getCourseInfoTool,
];

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant for MHFA instructors and staff. Use the available tools to answer questions."],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

const agent = await createToolCallingAgent({
  llm,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true,
});

// Handler
export async function handler(event: any) {
  const { query, userId, conversationId } = JSON.parse(event.body);

  const response = await agentExecutor.invoke({
    input: query,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      answer: response.output,
      intermediateSteps: response.intermediateSteps, // Shows tool usage
    }),
  };
}
```

---

### 4. Prompt Templates & Role-Based Responses

```typescript
// backend/functions/ai/prompts.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const ROLE_BASED_PROMPTS = {
  instructor: ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant for MHFA instructors.

Focus on:
- Course management and scheduling
- Invoicing and administrative tasks
- Training resources and best practices
- Policy compliance

Use the following context to answer questions:
{context}

Always cite your sources and be professional.`,
    ],
    ["human", "{input}"],
  ]),

  staff: ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant for National Council internal staff.

Focus on:
- Operational procedures
- System guidance and troubleshooting
- Data insights and reporting
- Administrative workflows

Use the following context to answer questions:
{context}`,
    ],
    ["human", "{input}"],
  ]),

  learner: ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant for MHFA learners.

Focus on:
- Course enrollment and registration
- Learning resources and materials
- Platform navigation
- Certificate information

Use the following context to answer questions:
{context}

Be friendly and encouraging.`,
    ],
    ["human", "{input}"],
  ]),
};

// Usage
const userRole = "instructor";
const prompt = ROLE_BASED_PROMPTS[userRole];

const chain = await createRetrievalChain({
  retriever: vectorStore.asRetriever(),
  combineDocsChain: await createStuffDocumentsChain({
    llm,
    prompt,
  }),
});
```

---

### 5. Streaming Responses with LangChain

```typescript
// backend/functions/ai/streamingRAG.ts
import { ChatBedrockConverse } from "@langchain/aws";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});

// Stream handler for WebSocket
export async function streamHandler(event: any) {
  const connectionId = event.requestContext.connectionId;
  const { query } = JSON.parse(event.body);

  // Get context from vector store
  const docs = await vectorStore.similaritySearch(query, 5);
  const context = docs.map((doc) => doc.pageContent).join("\n\n");

  // Create streaming LLM
  const llm = new ChatBedrockConverse({
    model: "anthropic.claude-3-sonnet-20240229-v1:0",
    region: "us-west-2",
    streaming: true,
    callbacks: [
      {
        handleLLMNewToken: async (token: string) => {
          // Send each token to WebSocket client
          await apiGatewayClient.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: JSON.stringify({
                type: "token",
                content: token,
              }),
            })
          );
        },
      },
    ],
  });

  // Invoke with streaming
  const response = await llm.invoke([
    {
      role: "system",
      content: `Context: ${context}`,
    },
    {
      role: "user",
      content: query,
    },
  ]);

  // Send completion message
  await apiGatewayClient.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        type: "complete",
        sources: docs.map((doc) => doc.metadata),
      }),
    })
  );

  return { statusCode: 200, body: "Streaming complete" };
}
```

---

### 6. Evaluation & Monitoring with LangSmith

LangSmith is LangChain's observability platform (great for learning!)

```typescript
// Initialize LangSmith tracing
import { Client } from "langsmith";

const langsmithClient = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
});

// Automatically traces all LangChain calls
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_PROJECT = "learning-navigator";

// Your chain will now be traced in LangSmith dashboard
const response = await retrievalChain.invoke({ input: query });

// You can see:
// - Token usage
// - Latency
// - Retrieved documents
// - Full conversation flow
```

---

## Learning Path for This Project

### Week 1-2: LangChain Basics
- [ ] Complete LangChain quickstart tutorial
- [ ] Understand chains, prompts, and LLMs
- [ ] Build simple RAG example locally

### Week 3-4: AWS + LangChain Integration
- [ ] Learn Bedrock integration with LangChain
- [ ] OpenSearch vector store setup
- [ ] Deploy first Lambda with LangChain

### Week 5-6: Advanced Patterns
- [ ] Conversational memory
- [ ] Agent framework with tools
- [ ] Streaming responses

### Week 7-8: Production Features
- [ ] Error handling and retries
- [ ] Evaluation with LangSmith
- [ ] Performance optimization

---

## Alternative: LlamaIndex

**LlamaIndex** is another excellent option, especially for RAG:

```typescript
import { OpenAI, OpenSearchVectorStore, VectorStoreIndex } from "llamaindex";

// Similar to LangChain but more RAG-focused
const index = await VectorStoreIndex.fromVectorStore(vectorStore);

const queryEngine = index.asQueryEngine();

const response = await queryEngine.query({
  query: "How do I submit an invoice?",
});

console.log(response.toString());
```

**LlamaIndex pros**:
- Simpler API for RAG specifically
- Great documentation
- Strong retrieval features

**LangChain pros**:
- More comprehensive (agents, tools, memory)
- Larger ecosystem
- Better for complex workflows

---

## Recommended Tech Stack (Updated)

### Backend AI Layer

```typescript
// package.json
{
  "dependencies": {
    // LangChain
    "langchain": "^0.1.0",
    "@langchain/aws": "^0.0.5",
    "@langchain/community": "^0.0.35",
    "@langchain/core": "^0.1.0",

    // AWS SDK (infrastructure)
    "@aws-sdk/client-s3": "^3.490.0",
    "@aws-sdk/client-dynamodb": "^3.490.0",
    "@aws-sdk/client-apigatewaymanagementapi": "^3.490.0",

    // OpenSearch
    "@opensearch-project/opensearch": "^2.5.0",

    // Optional: LangSmith for observability
    "langsmith": "^0.0.48"
  }
}
```

---

## Project Structure with LangChain

```
backend/
├── functions/
│   ├── ai/
│   │   ├── generateResponse.ts        # Main handler
│   │   ├── ragChain.ts                # LangChain RAG setup
│   │   ├── agentTools.ts              # Custom tools
│   │   ├── prompts.ts                 # Prompt templates
│   │   └── memory.ts                  # Conversation memory
│   ├── chat/
│   │   └── streamResponse.ts          # Streaming handler
│   └── integrations/
│       └── zendesk.ts
├── shared/
│   ├── langchain/
│   │   ├── bedrock.ts                 # Bedrock LLM config
│   │   ├── opensearch.ts              # Vector store config
│   │   └── chains.ts                  # Reusable chains
│   └── utils/
└── tests/
    ├── chains.test.ts
    └── agents.test.ts
```

---

## Learning Resources

### Official Documentation
- **LangChain**: https://js.langchain.com/docs/
- **LangChain AWS**: https://js.langchain.com/docs/integrations/platforms/aws
- **LangSmith**: https://docs.smith.langchain.com/

### Tutorials
- [LangChain Crash Course](https://www.youtube.com/watch?v=LbT1yp6quS8)
- [Building RAG with LangChain](https://js.langchain.com/docs/tutorials/rag)
- [Agents with LangChain](https://js.langchain.com/docs/tutorials/agents)

### Practice Projects (Before Starting)
1. Build a simple Q&A bot with LangChain + OpenAI
2. Create a RAG system with local PDFs
3. Build an agent that can use 2-3 tools
4. Implement streaming chat with memory

---

## Recommendation for Your Project

### Approach: **Incremental Adoption**

**Phase 1 (Weeks 5-6)**: Start with basic LangChain RAG
- Replace direct Bedrock calls with LangChain
- Use OpenSearchVectorStore
- Keep everything else the same

**Phase 2 (Weeks 7-8)**: Add memory and better prompts
- DynamoDB chat history
- Role-based prompt templates
- Basic evaluation

**Phase 3 (Week 9+)**: Agent capabilities
- Tools for Zendesk, LMS integration
- Multi-step reasoning
- Advanced features

This way, you:
- ✅ Learn LangChain progressively
- ✅ Ship working code each week
- ✅ Can fall back to direct SDK if needed
- ✅ Build production-ready skills

---

## Final Recommendation

**YES! Absolutely use LangChain for this project.**

**Why:**
1. **Learning**: You'll gain industry-relevant skills
2. **Speed**: Faster development once you learn the patterns
3. **Flexibility**: Easy to add features like agents, memory, tools
4. **Career**: LangChain is widely used in production AI apps
5. **Community**: Great ecosystem and resources

**Start with:**
- Week 5: Replace direct Bedrock with LangChain RAG
- Week 7: Add agent capabilities
- Week 9: Advanced features (evaluation, guardrails)

**This project is a perfect opportunity to learn LangChain in a real-world production context!** 🚀

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Learning Guide & Implementation Plan
