# AWS Services Implementation Guide

## Table of Contents
1. [Amazon Bedrock Setup](#1-amazon-bedrock-setup)
2. [RAG Implementation Options](#2-rag-implementation-options)
3. [DynamoDB Design](#3-dynamodb-design)
4. [Lambda Best Practices](#4-lambda-best-practices)
5. [API Gateway Configuration](#5-api-gateway-configuration)
6. [Security & Compliance](#6-security--compliance)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Cost Optimization](#8-cost-optimization)

---

## 1. AMAZON BEDROCK SETUP

### 1.1 Model Selection

**Recommended: Claude 3 Sonnet or Claude 3.5 Sonnet**
- Good balance of performance, cost, and quality
- Excellent for conversational AI
- 200K token context window
- Streaming support
- Cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens

**Alternative: Claude 3 Haiku** (if budget is tight)
- Fastest and most cost-effective
- Good for simple queries
- Cost: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens

### 1.2 Bedrock Configuration

```typescript
// bedrock-client.ts
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1" // or your preferred region
});

// Model IDs
const MODELS = {
  CLAUDE_3_SONNET: "anthropic.claude-3-sonnet-20240229-v1:0",
  CLAUDE_3_5_SONNET: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  CLAUDE_3_HAIKU: "anthropic.claude-3-haiku-20240307-v1:0"
};

// Example configuration
const modelConfig = {
  modelId: MODELS.CLAUDE_3_SONNET,
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.9,
    messages: [
      {
        role: "user",
        content: "Your message here"
      }
    ],
    system: "Your system prompt here"
  })
};
```

### 1.3 Prompt Engineering

**System Prompt Template**:
```typescript
const SYSTEM_PROMPTS = {
  instructor: `You are a helpful assistant for Mental Health First Aid (MHFA) instructors.
You help with:
- Course management and scheduling
- Invoicing and administrative tasks
- Training resources and materials
- Best practices for teaching MHFA

Always be professional, supportive, and provide citations for your information.
If you don't know something, admit it and offer to escalate to human support.`,

  staff: `You are a helpful assistant for National Council internal staff.
You help with:
- Operational procedures
- System guidance
- Data insights
- Administrative workflows

Provide clear, actionable information and always cite your sources.`,

  admin: `You are an administrative assistant with full system access.
You can help with:
- System configuration
- Analytics and reporting
- User management
- All instructor and staff capabilities

Be precise and thorough in your responses.`
};

// Function to build full prompt with context
function buildPrompt(
  userMessage: string,
  role: string,
  ragContext: string[],
  conversationHistory: Message[]
): string {
  const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.instructor;

  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\nRelevant Information:\n${ragContext.join("\n\n")}`;
  }

  return `${systemPrompt}${contextSection}`;
}
```

### 1.4 Streaming Implementation

```typescript
// Lambda function for streaming responses
export async function streamBedrockResponse(
  prompt: string,
  connectionId: string,
  apiGatewayManagementApi: any
) {
  const command = new InvokeModelWithResponseStreamCommand({
    modelId: MODELS.CLAUDE_3_SONNET,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      stream: true
    })
  });

  const response = await client.send(command);

  let fullResponse = "";

  // Stream chunks to client via WebSocket
  for await (const event of response.body) {
    if (event.chunk) {
      const chunk = JSON.parse(
        new TextDecoder().decode(event.chunk.bytes)
      );

      if (chunk.type === "content_block_delta") {
        const text = chunk.delta.text;
        fullResponse += text;

        // Send to client via WebSocket
        await apiGatewayManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: "chunk",
            content: text
          })
        }).promise();
      }
    }
  }

  // Send completion message
  await apiGatewayManagementApi.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: "complete",
      fullContent: fullResponse
    })
  }).promise();

  return fullResponse;
}
```

### 1.5 Prompt Caching (Cost Optimization)

```typescript
// Use prompt caching to reduce costs for repeated context
const promptWithCaching = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPTS.instructor,
      cache_control: { type: "ephemeral" } // Cache this part
    },
    {
      type: "text",
      text: ragContext, // Fresh context each time
    }
  ],
  messages: conversationHistory
};

// Caching can reduce costs by 90% for cached portions
```

---

## 2. RAG IMPLEMENTATION OPTIONS

### 2.1 Option A: Amazon Kendra (Fully Managed)

**Pros**:
- Fully managed, no infrastructure
- Built-in ML for relevance
- Connectors for many data sources
- Natural language queries

**Cons**:
- Expensive: $810/month for Developer Edition
- Less flexible than alternatives

**Setup**:
```typescript
import { KendraClient, QueryCommand } from "@aws-sdk/client-kendra";

const kendraClient = new KendraClient({ region: "us-east-1" });

async function searchKendra(query: string, userRole: string) {
  const command = new QueryCommand({
    IndexId: process.env.KENDRA_INDEX_ID,
    QueryText: query,
    PageSize: 5,
    // Filter by user role
    AttributeFilter: {
      EqualsTo: {
        Key: "target_role",
        Value: { StringValue: userRole }
      }
    }
  });

  const response = await kendraClient.send(command);

  return response.ResultItems?.map(item => ({
    title: item.DocumentTitle?.Text,
    excerpt: item.DocumentExcerpt?.Text,
    uri: item.DocumentURI,
    score: item.ScoreAttributes?.ScoreConfidence
  }));
}
```

### 2.2 Option B: Amazon OpenSearch (Recommended)

**Pros**:
- More cost-effective (~$100-200/month for small cluster)
- Highly flexible and customizable
- Vector search support
- Good for hybrid search (keyword + semantic)

**Cons**:
- Requires more setup and management
- Need to manage embeddings yourself

**Setup**:
```typescript
import { Client } from '@opensearch-project/opensearch';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize OpenSearch client
const osClient = new Client({
  node: process.env.OPENSEARCH_ENDPOINT,
  // ... auth configuration
});

// Generate embeddings using Bedrock
async function generateEmbedding(text: string): Promise<number[]> {
  const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

  const command = new InvokeModelCommand({
    modelId: "amazon.titan-embed-text-v1",
    contentType: "application/json",
    body: JSON.stringify({
      inputText: text
    })
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}

// Hybrid search: keyword + semantic
async function hybridSearch(query: string, userRole: string) {
  const queryEmbedding = await generateEmbedding(query);

  const searchBody = {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: query,
              fields: ["title^2", "content"],
              type: "best_fields"
            }
          }
        ],
        should: [
          {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: 5
              }
            }
          }
        ],
        filter: [
          {
            term: { role: userRole }
          }
        ]
      }
    },
    size: 5
  };

  const response = await osClient.search({
    index: 'knowledge-base',
    body: searchBody
  });

  return response.body.hits.hits.map((hit: any) => ({
    title: hit._source.title,
    content: hit._source.content,
    score: hit._score,
    source: hit._source.source_document
  }));
}
```

**Index Mapping**:
```json
{
  "mappings": {
    "properties": {
      "title": { "type": "text" },
      "content": { "type": "text" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536
      },
      "role": { "type": "keyword" },
      "document_type": { "type": "keyword" },
      "language": { "type": "keyword" },
      "source_document": { "type": "keyword" },
      "updated_at": { "type": "date" }
    }
  }
}
```

### 2.3 Option C: Bedrock Knowledge Bases (New)

**Pros**:
- Managed RAG solution
- Integrated with Bedrock
- Automatic chunking and embedding
- S3 integration

**Cons**:
- Relatively new feature
- Less control over retrieval

**Setup**:
```typescript
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

async function retrieveFromKnowledgeBase(query: string) {
  const command = new RetrieveCommand({
    knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: query
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: 5
      }
    }
  });

  const response = await client.send(command);

  return response.retrievalResults?.map(result => ({
    content: result.content?.text,
    location: result.location?.s3Location,
    score: result.score
  }));
}
```

### 2.4 Document Processing Pipeline

```typescript
// Lambda function triggered by S3 upload
export async function processDocument(event: S3Event) {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // 1. Download document from S3
  const document = await s3.getObject({ Bucket: bucket, Key: key }).promise();

  // 2. Extract text based on file type
  let text: string;
  if (key.endsWith('.pdf')) {
    text = await extractTextFromPDF(document.Body);
  } else if (key.endsWith('.docx')) {
    text = await extractTextFromDOCX(document.Body);
  } else {
    text = document.Body.toString('utf-8');
  }

  // 3. Detect language
  const language = await detectLanguage(text);

  // 4. Chunk the text
  const chunks = chunkText(text, {
    maxChunkSize: 500, // tokens
    overlapSize: 50
  });

  // 5. Generate embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);

    // 6. Index in OpenSearch
    await osClient.index({
      index: 'knowledge-base',
      body: {
        title: extractTitle(chunk.text),
        content: chunk.text,
        embedding: embedding,
        source_document: key,
        language: language,
        chunk_index: chunk.index,
        updated_at: new Date().toISOString()
      }
    });
  }

  console.log(`Processed ${chunks.length} chunks from ${key}`);
}

function chunkText(text: string, options: ChunkOptions): Chunk[] {
  // Split on paragraphs first
  const paragraphs = text.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if ((currentChunk + para).length > options.maxChunkSize) {
      if (currentChunk) {
        chunks.push({
          text: currentChunk,
          index: chunkIndex++
        });
      }
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }

  if (currentChunk) {
    chunks.push({
      text: currentChunk,
      index: chunkIndex
    });
  }

  return chunks;
}
```

---

## 3. DYNAMODB DESIGN

### 3.1 Table Design Patterns

**Single Table Design** (Recommended for MVP):
```typescript
// Primary Key: PK (Partition Key) + SK (Sort Key)

// User Profile
{
  PK: "USER#user123",
  SK: "PROFILE",
  email: "instructor@example.com",
  role: "instructor",
  language: "en",
  createdAt: "2025-01-15T10:00:00Z"
}

// Conversation
{
  PK: "USER#user123",
  SK: "CONV#conv456",
  conversationId: "conv456",
  status: "active",
  startTime: "2025-01-20T14:30:00Z",
  messageCount: 5
}

// Message
{
  PK: "CONV#conv456",
  SK: "MSG#2025-01-20T14:35:00Z",
  messageId: "msg789",
  role: "assistant",
  content: "Here's how to...",
  citations: [...]
}

// Feedback
{
  PK: "MSG#msg789",
  SK: "FEEDBACK",
  rating: "positive",
  comment: "Very helpful!",
  timestamp: "2025-01-20T14:36:00Z"
}
```

### 3.2 Access Patterns & Indexes

**Primary Access Patterns**:
1. Get user profile: `PK = USER#userId, SK = PROFILE`
2. Get user conversations: `PK = USER#userId, SK begins_with CONV#`
3. Get conversation messages: `PK = CONV#convId, SK begins_with MSG#`
4. Get message feedback: `PK = MSG#msgId, SK = FEEDBACK`

**GSI for Analytics** (Global Secondary Index):
```typescript
// GSI: GSI1PK-GSI1SK-index
{
  GSI1PK: "DATE#2025-01-20",
  GSI1SK: "CONV#conv456",
  // ... other attributes
}

// Query all conversations on a specific date
// Useful for admin dashboard analytics
```

### 3.3 DynamoDB Client Wrapper

```typescript
// dynamodb-client.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

export class ConversationRepository {
  async createConversation(userId: string, conversationId: string) {
    const item = {
      PK: `USER#${userId}`,
      SK: `CONV#${conversationId}`,
      conversationId,
      status: "active",
      startTime: new Date().toISOString(),
      messageCount: 0,
      GSI1PK: `DATE#${new Date().toISOString().split('T')[0]}`,
      GSI1SK: `CONV#${conversationId}`
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return item;
  }

  async addMessage(
    conversationId: string,
    message: Message
  ) {
    const item = {
      PK: `CONV#${conversationId}`,
      SK: `MSG#${new Date().toISOString()}`,
      messageId: message.messageId,
      role: message.role,
      content: message.content,
      citations: message.citations,
      timestamp: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    // Increment message count
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${message.userId}`,
        SK: `CONV#${conversationId}`
      },
      UpdateExpression: "SET messageCount = messageCount + :inc",
      ExpressionAttributeValues: {
        ":inc": 1
      }
    }));

    return item;
  }

  async getConversationHistory(
    conversationId: string,
    limit: number = 20
  ) {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONV#${conversationId}`,
        ":sk": "MSG#"
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    }));

    return response.Items || [];
  }
}
```

### 3.4 Capacity Planning

**On-Demand Mode** (Recommended for MVP):
- No capacity planning required
- Auto-scales with traffic
- Pay per request
- Cost: $1.25 per million write requests, $0.25 per million read requests

**Provisioned Mode** (For predictable workloads):
- Set RCU and WCU
- More cost-effective at scale
- Requires capacity planning

---

## 4. LAMBDA BEST PRACTICES

### 4.1 Function Configuration

```typescript
// cdk/lambda-stack.ts
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

const chatFunction = new lambdaNodejs.NodejsFunction(this, 'ChatFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handler',
  entry: 'functions/chat/sendMessage/handler.ts',

  // Performance
  memorySize: 1024, // Increase for faster cold starts
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 10, // Prevent runaway costs

  // Environment variables
  environment: {
    TABLE_NAME: table.tableName,
    BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
    OPENSEARCH_ENDPOINT: opensearchDomain.domainEndpoint,
    LOG_LEVEL: 'INFO'
  },

  // Bundling
  bundling: {
    minify: true,
    sourceMap: true,
    target: 'es2020',
    externalModules: ['@aws-sdk/*'] // Use AWS SDK v3 from Lambda runtime
  },

  // X-Ray tracing
  tracing: lambda.Tracing.ACTIVE,

  // VPC (only if accessing RDS or private resources)
  // vpc: vpc,
  // vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
});

// Grant permissions
table.grantReadWriteData(chatFunction);
```

### 4.2 Cold Start Optimization

```typescript
// Initialize clients outside handler (reused across invocations)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const dynamoClient = new DynamoDBClient({});
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

// Handler
export async function handler(event: APIGatewayProxyEvent) {
  // Lazy load heavy dependencies
  const opensearchClient = await getOpenSearchClient();

  // Your logic here
}

// Use provisioned concurrency for critical functions
// CDK:
chatFunction.addAlias('live', {
  provisionedConcurrentExecutions: 5 // Always warm
});
```

### 4.3 Error Handling & Retries

```typescript
// Exponential backoff for retries
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// Graceful error responses
export async function handler(event: APIGatewayProxyEvent) {
  try {
    // Your logic
    const result = await processMessage(event.body);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Error processing message:", error);

    // Don't expose internal errors to users
    const statusCode = error.statusCode || 500;
    const message = statusCode < 500
      ? error.message
      : "An unexpected error occurred";

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        error: message,
        requestId: event.requestContext.requestId
      })
    };
  }
}
```

### 4.4 Logging & Observability

```typescript
// Structured logging
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'learning-navigator',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

export async function handler(event: APIGatewayProxyEvent) {
  logger.addContext(event.requestContext);

  logger.info("Processing message", {
    userId: event.requestContext.authorizer?.claims.sub,
    conversationId: JSON.parse(event.body).conversationId
  });

  try {
    const result = await processMessage(event.body);

    logger.info("Message processed successfully", {
      messageId: result.messageId,
      duration: result.duration
    });

    return successResponse(result);
  } catch (error) {
    logger.error("Failed to process message", error as Error);
    throw error;
  }
}

// X-Ray annotations for filtering
import * as AWSXRay from 'aws-xray-sdk-core';

AWSXRay.captureFunc('processMessage', (subsegment) => {
  subsegment?.addAnnotation('userId', userId);
  subsegment?.addAnnotation('role', userRole);
  subsegment?.addMetadata('requestDetails', { /* ... */ });
});
```

---

## 5. API GATEWAY CONFIGURATION

### 5.1 REST API Setup

```typescript
// cdk/api-stack.ts
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const api = new apigateway.RestApi(this, 'LearningNavigatorAPI', {
  restApiName: 'Learning Navigator API',
  description: 'API for Learning Navigator chatbot',

  // CORS
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict in production
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Amz-Date',
      'X-Api-Key',
      'X-Amz-Security-Token'
    ]
  },

  // CloudWatch logging
  deployOptions: {
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
    dataTraceEnabled: true,
    tracingEnabled: true,
    metricsEnabled: true,

    // Throttling
    throttlingRateLimit: 100, // requests per second
    throttlingBurstLimit: 200
  },

  // API key (if needed)
  apiKeySourceType: apigateway.ApiKeySourceType.HEADER
});

// Cognito authorizer
const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
  this,
  'CognitoAuthorizer',
  {
    cognitoUserPools: [userPool]
  }
);

// Routes
const chatResource = api.root.addResource('chat');

chatResource.addMethod('POST',
  new apigateway.LambdaIntegration(sendMessageFunction),
  {
    authorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO
  }
);

// Request validation
const requestValidator = new apigateway.RequestValidator(
  this,
  'RequestValidator',
  {
    restApi: api,
    validateRequestBody: true,
    validateRequestParameters: true
  }
);

// Model for request validation
const messageModel = api.addModel('MessageModel', {
  contentType: 'application/json',
  schema: {
    type: apigateway.JsonSchemaType.OBJECT,
    required: ['conversationId', 'message'],
    properties: {
      conversationId: { type: apigateway.JsonSchemaType.STRING },
      message: {
        type: apigateway.JsonSchemaType.STRING,
        minLength: 1,
        maxLength: 2000
      }
    }
  }
});
```

### 5.2 WebSocket API Setup

```typescript
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

const webSocketApi = new apigatewayv2.WebSocketApi(this, 'ChatWebSocket', {
  apiName: 'Learning Navigator WebSocket',

  // Routes
  connectRouteOptions: {
    integration: new integrations.WebSocketLambdaIntegration(
      'ConnectIntegration',
      connectFunction
    )
  },
  disconnectRouteOptions: {
    integration: new integrations.WebSocketLambdaIntegration(
      'DisconnectIntegration',
      disconnectFunction
    )
  },
  defaultRouteOptions: {
    integration: new integrations.WebSocketLambdaIntegration(
      'DefaultIntegration',
      messageFunction
    )
  }
});

// Stage
const stage = new apigatewayv2.WebSocketStage(this, 'ProdStage', {
  webSocketApi,
  stageName: 'prod',
  autoDeploy: true
});

// Connection handler
export async function connectHandler(event: APIGatewayWebSocketEvent) {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;

  // Verify JWT token
  const claims = await verifyToken(token);

  // Store connection
  await dynamoClient.send(new PutCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      connectionId,
      userId: claims.sub,
      connectedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 7200 // 2 hours
    }
  }));

  return { statusCode: 200, body: 'Connected' };
}

// Send message to connection
export async function sendToConnection(
  connectionId: string,
  data: any
) {
  const apiGatewayManagementApi = new ApiGatewayManagementApiClient({
    endpoint: process.env.WEBSOCKET_ENDPOINT
  });

  try {
    await apiGatewayManagementApi.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }));
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is gone, clean up
      await deleteConnection(connectionId);
    } else {
      throw error;
    }
  }
}
```

---

## 6. SECURITY & COMPLIANCE

### 6.1 Cognito Configuration

```typescript
import * as cognito from 'aws-cdk-lib/aws-cognito';

const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'learning-navigator-users',

  // Sign-in
  signInAliases: {
    email: true,
    username: false
  },

  // Security
  passwordPolicy: {
    minLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true,
    tempPasswordValidity: Duration.days(3)
  },

  // MFA
  mfa: cognito.Mfa.OPTIONAL,
  mfaSecondFactor: {
    sms: true,
    otp: true
  },

  // Account recovery
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

  // Email
  email: cognito.UserPoolEmail.withSES({
    fromEmail: 'noreply@nationalcouncil.org',
    fromName: 'Learning Navigator',
    sesRegion: 'us-east-1'
  }),

  // Advanced security
  advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,

  // User attributes
  standardAttributes: {
    email: {
      required: true,
      mutable: true
    },
    givenName: {
      required: true,
      mutable: true
    },
    familyName: {
      required: true,
      mutable: true
    }
  },

  customAttributes: {
    role: new cognito.StringAttribute({ mutable: true }),
    language: new cognito.StringAttribute({ mutable: true })
  },

  // Removal policy (be careful!)
  removalPolicy: RemovalPolicy.RETAIN // Don't delete user data
});

// User groups for RBAC
const instructorGroup = new cognito.CfnUserPoolGroup(this, 'InstructorGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'instructors',
  description: 'MHFA Instructors'
});

const staffGroup = new cognito.CfnUserPoolGroup(this, 'StaffGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'staff',
  description: 'Internal Staff'
});

const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'admins',
  description: 'Administrators'
});
```

### 6.2 WAF Configuration

```typescript
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
  scope: 'REGIONAL', // Use 'CLOUDFRONT' for CloudFront
  defaultAction: { allow: {} },

  rules: [
    // Rate limiting
    {
      name: 'RateLimitRule',
      priority: 1,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit: 2000, // requests per 5 minutes per IP
          aggregateKeyType: 'IP'
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule'
      }
    },

    // AWS Managed Rules - Core Rule Set
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 2,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet'
        }
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesCommonRuleSet'
      }
    },

    // Known bad inputs
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 3,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet'
        }
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'KnownBadInputs'
      }
    }
  ],

  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'WebACL'
  }
});

// Associate with API Gateway
new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
  resourceArn: api.arnForExecuteApi(),
  webAclArn: webAcl.attrArn
});
```

### 6.3 Secrets Management

```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Store Zendesk API credentials
const zendeskSecret = new secretsmanager.Secret(this, 'ZendeskSecret', {
  secretName: 'learning-navigator/zendesk',
  description: 'Zendesk API credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      subdomain: 'nationalcouncil',
      email: 'api@nationalcouncil.org'
    }),
    generateStringKey: 'apiToken'
  }
});

// Grant Lambda access
zendeskSecret.grantRead(integrationFunction);

// Use in Lambda
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getZendeskCredentials() {
  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({
    SecretId: 'learning-navigator/zendesk'
  }));

  return JSON.parse(response.SecretString!);
}
```

---

## 7. MONITORING & LOGGING

### 7.1 CloudWatch Dashboard

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
  dashboardName: 'LearningNavigator'
});

// API metrics
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'API Requests',
    left: [
      api.metricCount(),
      api.metric4XXError(),
      api.metric5XXError()
    ]
  }),

  new cloudwatch.GraphWidget({
    title: 'API Latency',
    left: [
      api.metricLatency({ statistic: 'p50' }),
      api.metricLatency({ statistic: 'p95' }),
      api.metricLatency({ statistic: 'p99' })
    ]
  })
);

// Lambda metrics
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Lambda Invocations',
    left: [
      chatFunction.metricInvocations(),
      chatFunction.metricErrors(),
      chatFunction.metricThrottles()
    ]
  }),

  new cloudwatch.GraphWidget({
    title: 'Lambda Duration',
    left: [
      chatFunction.metricDuration({ statistic: 'Average' }),
      chatFunction.metricDuration({ statistic: 'Maximum' })
    ]
  })
);

// DynamoDB metrics
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'DynamoDB Operations',
    left: [
      table.metricConsumedReadCapacityUnits(),
      table.metricConsumedWriteCapacityUnits()
    ]
  })
);
```

### 7.2 Alarms

```typescript
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';

// SNS topic for alerts
const alertTopic = new sns.Topic(this, 'AlertTopic', {
  displayName: 'Learning Navigator Alerts'
});

// High error rate alarm
const errorAlarm = new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: api.metric5XXError({
    statistic: 'Sum',
    period: Duration.minutes(5)
  }),
  threshold: 10,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Alert when error rate is too high'
});

errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

// High latency alarm
const latencyAlarm = new cloudwatch.Alarm(this, 'HighLatency', {
  metric: api.metricLatency({
    statistic: 'p95',
    period: Duration.minutes(5)
  }),
  threshold: 3000, // 3 seconds
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
});

latencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
```

### 7.3 Log Insights Queries

```typescript
// Useful CloudWatch Logs Insights queries

// Error analysis
const errorQuery = `
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
`;

// Slow requests
const slowRequestQuery = `
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| filter @duration > 3000
| sort @duration desc
| limit 20
`;

// User activity
const userActivityQuery = `
fields @timestamp, userId, action
| filter action = "send_message"
| stats count() by userId
| sort count desc
| limit 10
`;

// Bedrock costs
const bedrockCostQuery = `
fields @timestamp, inputTokens, outputTokens
| stats sum(inputTokens) as totalInput, sum(outputTokens) as totalOutput
| eval cost = (totalInput * 0.003 / 1000) + (totalOutput * 0.015 / 1000)
`;
```

---

## 8. COST OPTIMIZATION

### 8.1 Cost Monitoring

```typescript
import * as budgets from 'aws-cdk-lib/aws-budgets';

const monthlyBudget = new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: 'learning-navigator-monthly',
    budgetType: 'COST',
    timeUnit: 'MONTHLY',
    budgetLimit: {
      amount: 2000,
      unit: 'USD'
    }
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80 // 80% of budget
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'engineering@nationalcouncil.org'
        }
      ]
    },
    {
      notification: {
        notificationType: 'FORECASTED',
        comparisonOperator: 'GREATER_THAN',
        threshold: 100
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'engineering@nationalcouncil.org'
        }
      ]
    }
  ]
});
```

### 8.2 Cost Optimization Strategies

**1. Bedrock Optimization**:
```typescript
// Implement response caching
import { createHash } from 'crypto';

async function getCachedResponse(query: string, context: string) {
  const cacheKey = createHash('sha256')
    .update(query + context)
    .digest('hex');

  // Check DynamoDB cache
  const cached = await getFromCache(cacheKey);
  if (cached && !isExpired(cached, 3600)) { // 1 hour TTL
    return cached.response;
  }

  // Call Bedrock
  const response = await callBedrock(query, context);

  // Cache the response
  await saveToCache(cacheKey, response);

  return response;
}

// Use smaller models for simple queries
async function selectModel(query: string) {
  const complexity = analyzeComplexity(query);

  if (complexity === 'simple') {
    return MODELS.CLAUDE_3_HAIKU; // Cheaper
  } else {
    return MODELS.CLAUDE_3_SONNET;
  }
}
```

**2. Lambda Optimization**:
- Use ARM64 (Graviton2) for 20% cost savings
- Right-size memory allocation
- Use Lambda layers for shared dependencies

**3. DynamoDB Optimization**:
- Use on-demand for unpredictable workloads
- Enable TTL for temporary data
- Use DynamoDB Streams instead of polling

**4. S3 Optimization**:
```typescript
// S3 lifecycle policy
bucket.addLifecycleRule({
  id: 'ArchiveOldLogs',
  enabled: true,

  // Archive logs after 30 days
  transitions: [
    {
      storageClass: s3.StorageClass.INTELLIGENT_TIERING,
      transitionAfter: Duration.days(30)
    },
    {
      storageClass: s3.StorageClass.GLACIER,
      transitionAfter: Duration.days(90)
    }
  ],

  // Delete after 1 year
  expiration: Duration.days(365)
});
```

**5. API Gateway Caching**:
```typescript
api.root.addMethod('GET', integration, {
  methodResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.Cache-Control': true
    }
  }],
  requestParameters: {
    'method.request.querystring.cache': false
  }
});

api.deploymentStage.methodSettings = [{
  resourcePath: '/*',
  httpMethod: '*',
  cachingEnabled: true,
  cacheTtl: Duration.minutes(5),
  cacheDataEncrypted: true
}];
```

---

## 9. DISASTER RECOVERY

### 9.1 Backup Strategy

```typescript
import * as backup from 'aws-cdk-lib/aws-backup';

// Backup plan
const backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
  backupPlanName: 'LearningNavigatorBackup'
});

// Daily backup rule
backupPlan.addRule(new backup.BackupPlanRule({
  ruleName: 'DailyBackup',
  scheduleExpression: events.Schedule.cron({
    hour: '2',
    minute: '0'
  }),
  deleteAfter: Duration.days(30),
  moveToColdStorageAfter: Duration.days(7)
}));

// Add DynamoDB table to backup
backupPlan.addSelection('DynamoDBSelection', {
  resources: [
    backup.BackupResource.fromArn(table.tableArn)
  ]
});

// Point-in-time recovery for DynamoDB
const table = new dynamodb.Table(this, 'Table', {
  // ... other config
  pointInTimeRecovery: true
});
```

### 9.2 Multi-Region (Optional - Future)

For high availability, consider multi-region deployment:
- Use DynamoDB Global Tables
- Replicate S3 buckets with Cross-Region Replication
- Deploy Lambda functions in multiple regions
- Use Route 53 for failover routing

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Author**: AWS Architecture Team
**Status**: Reference Guide
