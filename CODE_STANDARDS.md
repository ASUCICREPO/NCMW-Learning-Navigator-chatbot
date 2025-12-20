# Code Standards & Best Practices

## Overview

This document defines the coding standards, SOLID principles, and clean code practices for the Learning Navigator project.

---

## Table of Contents

1. [SOLID Principles](#solid-principles)
2. [Clean Code Practices](#clean-code-practices)
3. [Project Structure](#project-structure)
4. [Naming Conventions](#naming-conventions)
5. [TypeScript Guidelines](#typescript-guidelines)
6. [Testing Standards](#testing-standards)
7. [Error Handling](#error-handling)
8. [Code Review Checklist](#code-review-checklist)

---

## 1. SOLID Principles

### S - Single Responsibility Principle (SRP)

**Definition**: A class/module should have only one reason to change.

#### ✅ Good Example:

```typescript
// ❌ BAD: Multiple responsibilities
class UserService {
  async createUser(data: UserData) { /* ... */ }
  async sendEmail(to: string, message: string) { /* ... */ }
  async logActivity(action: string) { /* ... */ }
  async validateUser(user: User) { /* ... */ }
}

// ✅ GOOD: Single responsibility per class
class UserRepository {
  async create(data: UserData): Promise<User> {
    // Only responsible for user data persistence
    return await this.dynamoDB.put({ /* ... */ });
  }

  async findById(userId: string): Promise<User | null> {
    return await this.dynamoDB.get({ /* ... */ });
  }
}

class UserValidator {
  validate(user: UserData): ValidationResult {
    // Only responsible for validation logic
    const errors: string[] = [];
    if (!user.email) errors.push('Email is required');
    if (!user.role) errors.push('Role is required');
    return { isValid: errors.length === 0, errors };
  }
}

class EmailService {
  async send(to: string, message: string): Promise<void> {
    // Only responsible for sending emails
    await this.sesClient.sendEmail({ /* ... */ });
  }
}

class AuditLogger {
  async log(action: string, userId: string): Promise<void> {
    // Only responsible for logging
    await this.cloudWatch.putLogEvents({ /* ... */ });
  }
}
```

#### Application in Project:

```typescript
// backend/services/user/UserService.ts
export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly validator: UserValidator,
    private readonly logger: AuditLogger
  ) {}

  async createUser(data: UserData): Promise<User> {
    // Orchestrates, doesn't do everything
    const validation = this.validator.validate(data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    const user = await this.repository.create(data);
    await this.logger.log('user_created', user.id);

    return user;
  }
}
```

---

### O - Open/Closed Principle (OCP)

**Definition**: Software entities should be open for extension but closed for modification.

#### ✅ Good Example:

```typescript
// ❌ BAD: Modifying existing code for new providers
class MessageSender {
  async send(message: string, provider: string) {
    if (provider === 'email') {
      // Send email
    } else if (provider === 'sms') {
      // Send SMS
    } else if (provider === 'slack') {
      // Send to Slack - requires modifying this class!
    }
  }
}

// ✅ GOOD: Use abstraction and extend without modification
interface MessageProvider {
  send(message: string): Promise<void>;
}

class EmailProvider implements MessageProvider {
  async send(message: string): Promise<void> {
    // Email implementation
    await this.sesClient.sendEmail({ /* ... */ });
  }
}

class SMSProvider implements MessageProvider {
  async send(message: string): Promise<void> {
    // SMS implementation
    await this.snsClient.publish({ /* ... */ });
  }
}

class SlackProvider implements MessageProvider {
  async send(message: string): Promise<void> {
    // Slack implementation - no need to modify existing code!
    await this.slackClient.postMessage({ /* ... */ });
  }
}

class NotificationService {
  constructor(private readonly provider: MessageProvider) {}

  async notify(message: string): Promise<void> {
    await this.provider.send(message);
  }
}

// Usage
const emailNotifier = new NotificationService(new EmailProvider());
const slackNotifier = new NotificationService(new SlackProvider());
```

#### Application in Project (LangChain Tools):

```typescript
// backend/services/ai/tools/BaseTool.ts
export abstract class BaseTool {
  abstract name: string;
  abstract description: string;

  abstract execute(input: string): Promise<string>;

  // Common functionality for all tools
  protected logExecution(input: string, output: string): void {
    console.log(`Tool ${this.name} executed`);
  }
}

// backend/services/ai/tools/KnowledgeBaseTool.ts
export class KnowledgeBaseTool extends BaseTool {
  name = 'search_knowledge_base';
  description = 'Search MHFA documentation';

  constructor(private vectorStore: OpenSearchVectorStore) {
    super();
  }

  async execute(query: string): Promise<string> {
    const results = await this.vectorStore.similaritySearch(query, 5);
    this.logExecution(query, JSON.stringify(results));
    return JSON.stringify(results);
  }
}

// backend/services/ai/tools/ZendeskTool.ts
export class ZendeskTool extends BaseTool {
  name = 'create_support_ticket';
  description = 'Create Zendesk ticket';

  constructor(private zendeskClient: ZendeskClient) {
    super();
  }

  async execute(input: string): Promise<string> {
    const { subject, description } = JSON.parse(input);
    const ticket = await this.zendeskClient.createTicket({ subject, description });
    this.logExecution(input, ticket.id);
    return `Ticket ${ticket.id} created`;
  }
}

// Easy to add new tools without modifying existing code!
export class CourseTool extends BaseTool {
  name = 'get_course_info';
  description = 'Fetch course information';

  async execute(query: string): Promise<string> {
    // Implementation
  }
}
```

---

### L - Liskov Substitution Principle (LSP)

**Definition**: Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

#### ✅ Good Example:

```typescript
// ❌ BAD: Subclass changes behavior unexpectedly
abstract class DataStore {
  abstract save(data: any): Promise<void>;
  abstract find(id: string): Promise<any>;
}

class DynamoDBStore extends DataStore {
  async save(data: any): Promise<void> {
    await this.client.put({ /* ... */ });
  }

  async find(id: string): Promise<any> {
    return await this.client.get({ /* ... */ });
  }
}

class ReadOnlyStore extends DataStore {
  async save(data: any): Promise<void> {
    throw new Error('Cannot save to read-only store'); // Violates LSP!
  }

  async find(id: string): Promise<any> {
    return await this.client.get({ /* ... */ });
  }
}

// ✅ GOOD: Proper abstraction
interface ReadableStore {
  find(id: string): Promise<any>;
}

interface WritableStore extends ReadableStore {
  save(data: any): Promise<void>;
}

class DynamoDBStore implements WritableStore {
  async save(data: any): Promise<void> {
    await this.client.put({ /* ... */ });
  }

  async find(id: string): Promise<any> {
    return await this.client.get({ /* ... */ });
  }
}

class ReadOnlyStore implements ReadableStore {
  async find(id: string): Promise<any> {
    return await this.client.get({ /* ... */ });
  }
  // No save method - interface doesn't promise it
}

// Usage
function processData(store: WritableStore) {
  // Can safely call save on any WritableStore
  await store.save(data);
}

function readData(store: ReadableStore) {
  // Can safely call find on any ReadableStore (including WritableStore)
  return await store.find(id);
}
```

#### Application in Project:

```typescript
// backend/repositories/BaseRepository.ts
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// backend/repositories/ConversationRepository.ts
export class ConversationRepository implements Repository<Conversation> {
  constructor(private readonly dynamoDB: DynamoDBClient) {}

  async findById(id: string): Promise<Conversation | null> {
    const result = await this.dynamoDB.get({
      TableName: 'learning-navigator',
      Key: { PK: `CONV#${id}`, SK: 'METADATA' }
    });
    return result.Item as Conversation;
  }

  async findAll(): Promise<Conversation[]> {
    // Implementation
  }

  async save(conversation: Conversation): Promise<Conversation> {
    // Implementation
  }

  async delete(id: string): Promise<void> {
    // Implementation
  }
}

// Can substitute any Repository<T> implementation
function processRepository<T>(repo: Repository<T>) {
  // Works with any repository implementation
  const item = await repo.findById('123');
}
```

---

### I - Interface Segregation Principle (ISP)

**Definition**: Clients should not be forced to depend on interfaces they don't use.

#### ✅ Good Example:

```typescript
// ❌ BAD: Fat interface
interface AIService {
  generateResponse(query: string): Promise<string>;
  searchKnowledge(query: string): Promise<Document[]>;
  analyzeSentiment(text: string): Promise<Sentiment>;
  translateText(text: string, targetLang: string): Promise<string>;
  detectLanguage(text: string): Promise<string>;
  createEmbedding(text: string): Promise<number[]>;
}

// Client only needs response generation but forced to depend on everything
class ChatHandler {
  constructor(private aiService: AIService) {}

  async handleMessage(message: string) {
    return await this.aiService.generateResponse(message);
    // Doesn't use searchKnowledge, analyzeSentiment, etc.
  }
}

// ✅ GOOD: Segregated interfaces
interface ResponseGenerator {
  generateResponse(query: string): Promise<string>;
}

interface KnowledgeSearcher {
  searchKnowledge(query: string): Promise<Document[]>;
}

interface SentimentAnalyzer {
  analyzeSentiment(text: string): Promise<Sentiment>;
}

interface LanguageProcessor {
  translateText(text: string, targetLang: string): Promise<string>;
  detectLanguage(text: string): Promise<string>;
}

interface EmbeddingGenerator {
  createEmbedding(text: string): Promise<number[]>;
}

// Clients depend only on what they need
class ChatHandler {
  constructor(private responseGenerator: ResponseGenerator) {}

  async handleMessage(message: string) {
    return await this.responseGenerator.generateResponse(message);
  }
}

class DocumentProcessor {
  constructor(
    private embeddingGenerator: EmbeddingGenerator,
    private languageProcessor: LanguageProcessor
  ) {}

  async processDocument(text: string) {
    const language = await this.languageProcessor.detectLanguage(text);
    const embedding = await this.embeddingGenerator.createEmbedding(text);
    return { language, embedding };
  }
}

// Implementation can implement multiple interfaces
class AIService implements
  ResponseGenerator,
  KnowledgeSearcher,
  SentimentAnalyzer,
  LanguageProcessor,
  EmbeddingGenerator {
  // Implements all methods
}
```

#### Application in Project:

```typescript
// backend/services/ai/interfaces.ts
export interface RAGChain {
  invoke(query: string, context: ConversationContext): Promise<string>;
}

export interface VectorSearch {
  search(query: string, filters: SearchFilters): Promise<Document[]>;
}

export interface AgentExecutor {
  execute(input: string, tools: Tool[]): Promise<AgentResponse>;
}

// backend/services/chat/ChatService.ts
export class ChatService {
  constructor(
    private readonly ragChain: RAGChain,  // Only depends on what it needs
    private readonly vectorSearch: VectorSearch,
    private readonly conversationRepo: Repository<Conversation>
  ) {}

  async handleMessage(message: string, userId: string): Promise<string> {
    const context = await this.buildContext(userId);
    return await this.ragChain.invoke(message, context);
  }
}
```

---

### D - Dependency Inversion Principle (DIP)

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions.

#### ✅ Good Example:

```typescript
// ❌ BAD: Direct dependency on concrete implementation
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

class UserService {
  private dynamoDB = new DynamoDBClient({ region: 'us-west-2' });

  async getUser(id: string) {
    return await this.dynamoDB.get({ /* ... */ });
  }
}
// Tightly coupled to DynamoDB, hard to test, can't swap implementations

// ✅ GOOD: Depend on abstraction
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUser(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }
}

// Concrete implementations
class DynamoDBUserRepository implements UserRepository {
  constructor(private readonly dynamoDB: DynamoDBClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.dynamoDB.get({ /* ... */ });
    return result.Item as User;
  }

  async save(user: User): Promise<User> {
    await this.dynamoDB.put({ /* ... */ });
    return user;
  }
}

class MockUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
}

// Dependency injection
const dynamoRepository = new DynamoDBUserRepository(dynamoClient);
const userService = new UserService(dynamoRepository);

// Easy to test
const mockRepository = new MockUserRepository();
const testService = new UserService(mockRepository);
```

#### Application in Project:

```typescript
// backend/lambda/handlers/sendMessage.ts
import { Container } from 'typedi';

export const handler = async (event: APIGatewayProxyEvent) => {
  // Dependencies injected via container
  const chatService = Container.get(ChatService);
  const authService = Container.get(AuthService);

  const user = await authService.verifyToken(event.headers.Authorization);
  const response = await chatService.handleMessage(event.body, user.id);

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};

// backend/config/container.ts
import { Container } from 'typedi';

// Register dependencies
Container.set(UserRepository, new DynamoDBUserRepository(dynamoClient));
Container.set(ChatService, new ChatService(
  Container.get(RAGChain),
  Container.get(VectorSearch),
  Container.get(UserRepository)
));
```

---

## 2. Clean Code Practices

### Meaningful Names

```typescript
// ❌ BAD
const d = new Date();
const x = await getData();
function calc(a: number, b: number) { return a + b; }

// ✅ GOOD
const currentDate = new Date();
const conversationHistory = await getConversationHistory(userId);
function calculateTotalCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_PRICE) + (outputTokens * OUTPUT_PRICE);
}
```

### Small Functions

```typescript
// ❌ BAD: God function
async function handleChatMessage(event: any) {
  // Extract data
  const body = JSON.parse(event.body);
  const token = event.headers.Authorization;

  // Verify token
  const decoded = jwt.verify(token, SECRET);
  const user = await dynamoDB.get({ Key: { id: decoded.sub } });

  // Get history
  const history = await dynamoDB.query({ /* ... */ });

  // Search knowledge base
  const docs = await opensearch.search({ /* ... */ });

  // Generate response
  const response = await bedrock.invoke({ /* ... */ });

  // Analyze sentiment
  const sentiment = await comprehend.detectSentiment({ /* ... */ });

  // Save message
  await dynamoDB.put({ /* ... */ });

  // Check escalation
  if (sentiment.Sentiment === 'NEGATIVE') {
    await createZendeskTicket({ /* ... */ });
  }

  return { statusCode: 200, body: response };
}

// ✅ GOOD: Small, focused functions
async function handleChatMessage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = await authenticateUser(event);
  const message = parseMessageBody(event.body);
  const response = await processMessage(message, user);
  return createSuccessResponse(response);
}

async function authenticateUser(event: APIGatewayProxyEvent): Promise<User> {
  const token = extractAuthToken(event.headers);
  return await authService.verify(token);
}

function parseMessageBody(body: string): ChatMessage {
  const parsed = JSON.parse(body);
  return {
    content: parsed.message,
    conversationId: parsed.conversationId
  };
}

async function processMessage(message: ChatMessage, user: User): Promise<string> {
  const context = await buildConversationContext(message.conversationId);
  const response = await chatService.generateResponse(message.content, context);
  await saveMessage(message, response, user);
  await checkAndEscalate(response, user);
  return response;
}
```

### Don't Repeat Yourself (DRY)

```typescript
// ❌ BAD: Repeated code
async function getUserById(id: string) {
  try {
    const result = await dynamoDB.get({ /* ... */ });
    logger.info('User retrieved', { id });
    return result.Item;
  } catch (error) {
    logger.error('Error retrieving user', { id, error });
    throw error;
  }
}

async function getConversationById(id: string) {
  try {
    const result = await dynamoDB.get({ /* ... */ });
    logger.info('Conversation retrieved', { id });
    return result.Item;
  } catch (error) {
    logger.error('Error retrieving conversation', { id, error });
    throw error;
  }
}

// ✅ GOOD: Extract common pattern
async function getItemFromDynamoDB<T>(
  tableName: string,
  key: Record<string, any>,
  entityName: string
): Promise<T> {
  try {
    const result = await dynamoDB.get({
      TableName: tableName,
      Key: key
    });

    logger.info(`${entityName} retrieved`, { key });
    return result.Item as T;
  } catch (error) {
    logger.error(`Error retrieving ${entityName}`, { key, error });
    throw error;
  }
}

// Usage
const user = await getItemFromDynamoDB<User>(
  'learning-navigator',
  { PK: `USER#${id}`, SK: 'PROFILE' },
  'User'
);

const conversation = await getItemFromDynamoDB<Conversation>(
  'learning-navigator',
  { PK: `CONV#${id}`, SK: 'METADATA' },
  'Conversation'
);
```

### Comments That Explain "Why", Not "What"

```typescript
// ❌ BAD: Obvious comments
// Increment counter
counter++;

// Get user from database
const user = await userRepository.findById(id);

// ✅ GOOD: Explain reasoning
// Use exponential backoff to avoid overwhelming the API during high traffic
await retry(apiCall, { maxAttempts: 3, backoff: 'exponential' });

// Cache for 5 minutes to balance freshness with reduced Bedrock costs
const cacheKey = generateCacheKey(query);
const cached = await cache.get(cacheKey, { ttl: 300 });

// Split into smaller chunks to stay within Claude's context window
const chunks = splitIntoChunks(document, MAX_CHUNK_SIZE);
```

### Error Handling

```typescript
// ❌ BAD: Silent failures, generic errors
async function getUser(id: string) {
  try {
    return await dynamoDB.get({ /* ... */ });
  } catch (error) {
    console.log('Error');  // Silent failure
    return null;
  }
}

async function processPayment() {
  throw new Error('Something went wrong');  // Generic
}

// ✅ GOOD: Specific, descriptive errors
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

class DatabaseConnectionError extends Error {
  constructor(cause: Error) {
    super(`Failed to connect to database: ${cause.message}`);
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}

async function getUser(id: string): Promise<User> {
  try {
    const result = await dynamoDB.get({
      TableName: 'learning-navigator',
      Key: { PK: `USER#${id}`, SK: 'PROFILE' }
    });

    if (!result.Item) {
      throw new UserNotFoundError(id);
    }

    return result.Item as User;
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      throw error;  // Re-throw domain errors
    }

    // Wrap infrastructure errors
    throw new DatabaseConnectionError(error as Error);
  }
}

// Custom error handler middleware
function errorHandler(error: Error): APIGatewayProxyResult {
  if (error instanceof UserNotFoundError) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: error.message })
    };
  }

  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message, details: error.details })
    };
  }

  // Don't expose internal errors
  logger.error('Unhandled error', { error });
  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' })
  };
}
```

---

## 3. Project Structure

```
learning-navigator/
├── backend/
│   ├── functions/                    # Lambda handlers
│   │   ├── chat/
│   │   │   ├── sendMessage.ts
│   │   │   ├── getHistory.ts
│   │   │   └── streamResponse.ts
│   │   ├── ai/
│   │   │   └── generateResponse.ts
│   │   └── admin/
│   │       └── getAnalytics.ts
│   │
│   ├── services/                     # Business logic (SOLID)
│   │   ├── chat/
│   │   │   ├── ChatService.ts
│   │   │   ├── ConversationManager.ts
│   │   │   └── MessageProcessor.ts
│   │   ├── ai/
│   │   │   ├── RAGChainService.ts
│   │   │   ├── AgentService.ts
│   │   │   ├── tools/
│   │   │   │   ├── BaseTool.ts
│   │   │   │   ├── KnowledgeBaseTool.ts
│   │   │   │   └── ZendeskTool.ts
│   │   │   └── prompts/
│   │   │       └── PromptTemplates.ts
│   │   └── user/
│   │       └── UserService.ts
│   │
│   ├── repositories/                 # Data access layer
│   │   ├── BaseRepository.ts
│   │   ├── UserRepository.ts
│   │   ├── ConversationRepository.ts
│   │   └── MessageRepository.ts
│   │
│   ├── domain/                       # Domain models
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   ├── Conversation.ts
│   │   │   └── Message.ts
│   │   ├── value-objects/
│   │   │   ├── Email.ts
│   │   │   └── UserRole.ts
│   │   └── interfaces/
│   │       ├── IUserRepository.ts
│   │       └── IChatService.ts
│   │
│   ├── infrastructure/               # External services
│   │   ├── aws/
│   │   │   ├── DynamoDBClient.ts
│   │   │   ├── BedrockClient.ts
│   │   │   └── OpenSearchClient.ts
│   │   ├── zendesk/
│   │   │   └── ZendeskClient.ts
│   │   └── langchain/
│   │       ├── RAGChain.ts
│   │       └── VectorStore.ts
│   │
│   ├── shared/                       # Shared utilities
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   ├── ValidationError.ts
│   │   │   └── NotFoundError.ts
│   │   ├── validators/
│   │   │   └── MessageValidator.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── retry.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── config/                       # Configuration
│   │   ├── container.ts              # DI container
│   │   ├── aws.ts
│   │   └── constants.ts
│   │
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── frontend/
│   ├── src/
│   │   ├── features/                 # Feature-based organization
│   │   │   ├── chat/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── types/
│   │   │   ├── auth/
│   │   │   └── admin/
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── App.tsx
│   └── tests/
│
└── infrastructure/                   # AWS CDK
    ├── lib/
    │   ├── stacks/
    │   └── constructs/
    └── bin/
        └── app.ts
```

---

## 4. Naming Conventions

### TypeScript/JavaScript

```typescript
// Classes: PascalCase
class UserService {}
class ConversationRepository {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUserRepository {}
interface ChatService {}

// Types: PascalCase
type UserRole = 'instructor' | 'staff' | 'learner' | 'admin';
type ConversationContext = { /* ... */ };

// Functions/Methods: camelCase, verb-based
function getUserById(id: string): Promise<User> {}
async function processMessage(message: string): Promise<string> {}

// Variables: camelCase, descriptive
const userProfile = await getUserProfile(userId);
const isAuthenticated = checkAuthentication(token);

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

// Private members: prefix with underscore (optional)
class UserService {
  private _repository: UserRepository;
  private _logger: Logger;
}

// Boolean variables: use is/has/can prefix
const isValid = validateInput(data);
const hasPermission = checkPermission(user, 'admin');
const canEdit = user.role === 'admin';

// Arrays: plural nouns
const users = await getUsers();
const messages = conversation.messages;

// Event handlers: use 'handle' or 'on' prefix
function handleSubmit(event: FormEvent) {}
const onClick = () => {};
```

### File Names

```
// Components: PascalCase
ChatWindow.tsx
MessageList.tsx
UserProfile.tsx

// Services/Utils: camelCase
userService.ts
chatProcessor.ts
validationUtils.ts

// Types/Interfaces: PascalCase
User.ts
Conversation.ts
ChatMessage.ts

// Constants: camelCase or UPPER_SNAKE_CASE
constants.ts
config.ts

// Tests: same as source + .test or .spec
userService.test.ts
ChatWindow.spec.tsx
```

---

## 5. TypeScript Guidelines

### Use Strict Type Checking

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Avoid `any`, use proper types

```typescript
// ❌ BAD
function processData(data: any) {
  return data.value;
}

// ✅ GOOD
interface DataInput {
  value: string;
  timestamp: number;
}

function processData(data: DataInput): string {
  return data.value;
}

// Use unknown for truly unknown types, then narrow
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

const data = parseJSON(jsonString);
if (isUserData(data)) {
  // TypeScript knows data is UserData here
  console.log(data.name);
}
```

### Use utility types

```typescript
// Partial, Required, Pick, Omit, etc.
type UserUpdate = Partial<User>;
type UserWithoutPassword = Omit<User, 'password'>;
type UserIdAndEmail = Pick<User, 'id' | 'email'>;

// Record for objects with known value types
type UserRolePermissions = Record<UserRole, string[]>;

// ReturnType, Parameters
type ServiceResponse = ReturnType<typeof userService.getUser>;
type ServiceParams = Parameters<typeof userService.updateUser>;
```

---

## 6. Testing Standards

### Unit Tests

```typescript
// userService.test.ts
import { UserService } from './UserService';
import { MockUserRepository } from '../__mocks__/UserRepository';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: MockUserRepository;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    userService = new UserService(mockRepository);
  });

  describe('getUser', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const expectedUser = { id: '123', name: 'John' };
      mockRepository.users.set('123', expectedUser);

      // Act
      const result = await userService.getUser('123');

      // Assert
      expect(result).toEqual(expectedUser);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      // Act & Assert
      await expect(userService.getUser('999')).rejects.toThrow(UserNotFoundError);
    });
  });
});
```

### Integration Tests

```typescript
// chat.integration.test.ts
describe('Chat Integration', () => {
  let chatService: ChatService;
  let dynamoDB: DynamoDBDocumentClient;

  beforeAll(async () => {
    // Set up real AWS services in test environment
    dynamoDB = createTestDynamoDBClient();
    chatService = new ChatService(/* real dependencies */);
  });

  it('should process message end-to-end', async () => {
    const message = 'How do I register for a course?';
    const userId = 'test-user-123';

    const response = await chatService.handleMessage(message, userId);

    expect(response).toContain('register');
    expect(response.length).toBeGreaterThan(0);

    // Verify message was saved
    const conversation = await getConversationFromDB(userId);
    expect(conversation.messages).toHaveLength(2); // User + AI
  });
});
```

### Test Coverage Requirements

- **Unit Tests**: 80% minimum
- **Integration Tests**: Critical paths
- **E2E Tests**: Main user flows

---

## 7. Error Handling

### Custom Error Classes

```typescript
// shared/errors/AppError.ts
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;

  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// shared/errors/ValidationError.ts
export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;

  constructor(
    message: string,
    public readonly details: ValidationDetails[]
  ) {
    super(message);
  }
}

// shared/errors/NotFoundError.ts
export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;

  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
  }
}

// shared/errors/UnauthorizedError.ts
export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}
```

### Global Error Handler

```typescript
// shared/middleware/errorHandler.ts
export function errorHandler(error: Error, logger: Logger): APIGatewayProxyResult {
  // Log all errors
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });

  // Handle known application errors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: error.message,
        details: (error as any).details
      })
    };
  }

  // Handle AWS SDK errors
  if (error.name === 'ResourceNotFoundException') {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Resource not found' })
    };
  }

  // Default to 500 for unknown errors
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: 'An unexpected error occurred',
      requestId: logger.requestId
    })
  };
}
```

---

## 8. Code Review Checklist

### General
- [ ] Code follows SOLID principles
- [ ] Functions are small and focused (< 20 lines ideally)
- [ ] No code duplication (DRY)
- [ ] Meaningful variable and function names
- [ ] No magic numbers (use named constants)
- [ ] Comments explain "why", not "what"

### TypeScript
- [ ] No use of `any` type
- [ ] Proper type annotations
- [ ] Interfaces/types defined for complex objects
- [ ] No unused variables or imports

### Testing
- [ ] Unit tests cover main logic paths
- [ ] Edge cases tested
- [ ] Mocks used appropriately
- [ ] Tests are readable and maintainable

### Error Handling
- [ ] Errors are caught and handled properly
- [ ] Custom error classes used
- [ ] Error messages are descriptive
- [ ] Errors are logged with context

### Performance
- [ ] No unnecessary API calls
- [ ] Proper use of caching
- [ ] Database queries optimized
- [ ] Async/await used correctly

### Security
- [ ] Input validation implemented
- [ ] No sensitive data in logs
- [ ] Authentication/authorization checks
- [ ] SQL injection prevention (parameterized queries)

---

## Summary

Following these standards ensures:
- ✅ **Maintainable** code that's easy to understand and modify
- ✅ **Testable** code with clear dependencies
- ✅ **Scalable** architecture that grows with requirements
- ✅ **Reliable** system with proper error handling
- ✅ **Professional** codebase ready for production

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Code Standards - Ready for Implementation
