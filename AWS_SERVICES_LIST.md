# AWS Services - Quick Reference

## Learning Navigator Project

### Core Services

| Service | Usage |
|---------|-------|
| **AWS Lambda** | Serverless compute for all backend logic (chat, AI, integrations) |
| **API Gateway (REST)** | HTTP API endpoints for chat, user management, and admin functions |
| **API Gateway (WebSocket)** | Real-time streaming of AI responses to users |
| **Amazon DynamoDB** | NoSQL database for users, conversations, messages, and sessions |
| **Amazon S3** | Storage for frontend assets, PDFs, logs, and knowledge base documents |
| **Amazon CloudFront** | CDN for serving React frontend with global low latency |
| **Amazon Cognito** | User authentication, JWT tokens, and role-based access control |

### AI/ML Services

| Service | Usage |
|---------|-------|
| **Amazon Bedrock (Claude 3 Sonnet)** | LLM for generating conversational AI responses |
| **Amazon Bedrock (Titan Embeddings)** | Generate 1536-dimensional vectors for document chunks |
| **Amazon OpenSearch** | Vector database for hybrid search (keyword + semantic) |
| **Amazon Comprehend** | Sentiment analysis and language detection |
| **Amazon Translate** | English ↔ Spanish translation for bilingual support |
| **Amazon Textract** | Extract text from PDF documents with OCR |

### Security & Configuration

| Service | Usage |
|---------|-------|
| **AWS Secrets Manager** | Store Zendesk and LMS API credentials securely |
| **AWS KMS** | Encryption keys for DynamoDB, S3, and Secrets Manager |
| **AWS WAF** | Web application firewall for rate limiting and attack protection |
| **IAM** | Roles and policies for service-to-service authentication |

### Monitoring & Operations

| Service | Usage |
|---------|-------|
| **Amazon CloudWatch Logs** | Centralized logging for all Lambda functions and API Gateway |
| **Amazon CloudWatch Metrics** | Performance metrics, token usage, and custom business metrics |
| **Amazon CloudWatch Alarms** | Alerts for errors, latency, and budget thresholds |
| **AWS X-Ray** | Distributed tracing and performance bottleneck identification |

### Infrastructure & Deployment

| Service | Usage |
|---------|-------|
| **AWS CDK** | Infrastructure as Code for deploying all AWS resources |
| **AWS CloudFormation** | Underlying service used by CDK for stack management |

---

## Total Services: 21

**Monthly Cost**: ~$400-500 (operational)

**Primary Region**: us-west-2 (US West - Oregon)
