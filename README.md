# Learning Navigator - MHFA Learning Ecosystem AI Assistant

An intelligent AI-powered chatbot that provides real-time guidance for the Mental Health First Aid (MHFA) Learning Ecosystem. Built with AWS Bedrock Knowledge Base and a modern React frontend for the National Council for Mental Wellbeing.

**Live Application:** https://main.d1disyogbqgwn4.amplifyapp.com

## Demo Video

https://github.com/user-attachments/assets/4b51e7b5-d551-4d3c-9f90-70267e5b7106

## Index

| Description | Link |
|-------------|------|
| Overview | [Overview](docs/OVERVIEW.md) |
| Technical Architecture | [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md) |
| Deployment | [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) |
| User Guide | [User Guide](docs/USER_GUIDE.md) |
| API Documentation | [API Documentation](docs/API_DOCUMENTATION.md) |
| Modification Guide | [Modification Guide](docs/MODIFICATION_GUIDE.md) |
| Credits | [Credits](docs/CREDITS.md) |
| License | [License](docs/LICENSE.md) |

## Overview

Learning Navigator is a conversational AI assistant designed to provide comprehensive information about Mental Health First Aid training. It enables instructors, learners, and staff to get instant, accurate answers about MHFA courses, certification, resources, and best practices through natural language conversations.

### Key Features

- **AI-Powered Conversations** using AWS Bedrock with Claude 4 Sonnet
- **Knowledge Base Integration** with MHFA training materials and documentation
- **Bilingual Support** for English and Spanish users
- **Guest Access** - No login required for chatbot (works anonymously)
- **Personalized Recommendations** - Role-based content for Instructors, Staff, and Learners
- **Source Citations** with links to authoritative MHFA resources
- **Admin Dashboard** for monitoring conversations and managing data sources
- **Email Escalation** for queries requiring expert human attention
- **Responsive Design** optimized for both desktop and mobile devices

## Architecture Diagram

<img width="1156" height="878" alt="image" src="https://github.com/user-attachments/assets/f03c5711-8624-44b1-a170-d3c8aea7eaa0" />

The application implements a serverless architecture on AWS, combining:

- **Frontend**: React application hosted on AWS Amplify
- **Backend**: AWS CDK-deployed infrastructure with API Gateway and Lambda
- **AI Layer**: AWS Bedrock Agent with Knowledge Base for RAG (Retrieval-Augmented Generation)
- **Data Storage**: S3 for documents, DynamoDB for conversation history, OpenSearch Serverless for vectors
- **Authentication**: Amazon Cognito for admin dashboard access
- **Email**: Amazon SES for admin notifications and escalation workflow

For a detailed deep dive into the architecture, see [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md).

## Deployment

For detailed deployment instructions, including prerequisites and step-by-step guides, see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git
cd NCMW-Learning-Navigator-chatbot

# Configure your admin email
export ADMIN_EMAIL="your-email@domain.com"
./scripts/setup-params.sh --admin-email "$ADMIN_EMAIL"

# Deploy everything
./scripts/deploy-codebuild.sh
```

**Total Time:** ~25-30 minutes (automated)

### Prerequisites

- AWS Account with Bedrock model access
- Verified email address in Amazon SES
- S3 bucket with MHFA training documents
- AWS CLI configured with appropriate permissions

**Required Bedrock Models:**
- `ANTHROPIC_CLAUDE_4_SONNET_V1_0`
- `TITAN_EMBED_TEXT_V2_1024`

## Directory Structure

```
├── buildspec.yml              # AWS CodeBuild configuration for CI/CD
├── cdk_backend/              # AWS CDK infrastructure code
│   ├── bin/                  # CDK app entry point
│   ├── lambda/               # Lambda functions for various services
│   │   ├── adminFile/        # File management handler
│   │   ├── chatResponseHandler/   # Chat flow evaluation
│   │   ├── email/            # Email notification service
│   │   ├── kb-sync/          # Auto-sync Knowledge Base
│   │   ├── escalatedQueries/ # Escalated query management
│   │   ├── userProfile/      # User profile management
│   │   └── websocketHandler/ # Real-time WebSocket handler
│   └── lib/
│       └── cdk_backend-stack.ts   # Main CDK stack definition
├── frontend/                 # React-based web application
│   ├── src/
│   │   ├── Components/       # Reusable UI components
│   │   ├── Assets/           # Images, icons, and media files
│   │   ├── services/         # API and authentication services
│   │   └── utilities/        # Constants and helper functions
│   ├── public/
│   │   └── index.html
│   └── package.json
├── docs/                     # Documentation
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── USER_GUIDE.md
│   ├── API_DOCUMENTATION.md
│   └── infra.jpg             # Architecture diagram
├── scripts/                  # Utility scripts
│   ├── deploy-codebuild.sh   # Automated deployment via CodeBuild
│   ├── deploy.sh             # Manual deployment script
│   ├── deploy-from-cloudshell.sh  # CloudShell deployment
│   ├── setup-params.sh       # Parameter configuration
│   ├── sync-knowledge-base.sh     # KB sync utility
│   └── create-admin-user.sh  # Create Cognito admin users
├── LICENSE.md
└── README.md
```

## Features

### Core Functionality

- **Intelligent Q&A**: Natural language processing for MHFA training questions
- **Bilingual Support**: Full English and Spanish language support
- **Source Attribution**: Every response includes citations to authoritative sources
- **Real-time Updates**: Automated synchronization of knowledge base content
- **Email Escalation**: Queries requiring expert attention are forwarded to admins

### Data Sources

- **PDF Documents**: MHFA training materials, guidelines, and resources
- **S3 Storage**: Secure document storage with automatic ingestion
- **Auto-Sync**: S3 event notifications trigger automatic Knowledge Base updates

### Admin Features

- **Conversation Monitoring**: View and analyze chat interactions with sentiment analysis
- **Data Source Management**: Upload, delete, and manage knowledge base documents
- **Escalated Queries**: Track and respond to questions requiring human expert attention
- **System Analytics**: Usage statistics, popular questions, and conversation trends
- **User Management**: Cognito-based authentication and authorization

### Technical Features

- **Serverless Architecture**: Auto-scaling AWS Lambda functions
- **Vector Search**: Semantic search using Amazon OpenSearch Serverless
- **Advanced AI**: Claude 4 Sonnet with cross-region inference profile
- **WebSocket Communication**: Real-time bidirectional chat
- **Secure Authentication**: Amazon Cognito with JWT tokens

## Data Flow

### User Interaction

1. User sends question through React frontend via WebSocket
2. API Gateway routes request to WebSocket Handler Lambda
3. Lambda invokes Bedrock Agent with user query
4. Agent queries Knowledge Base for relevant information
5. OpenSearch performs semantic vector search on embeddings
6. Agent generates contextual response using Claude 4 Sonnet
7. Response with citations is returned to user in real-time

### Admin Workflow

1. Low-confidence queries trigger email escalation
2. Admin receives notification via Amazon SES
3. Admin responds with accurate information
4. Response is stored in S3 and ingested into Knowledge Base
5. Future similar queries receive improved answers

## User Guide

For detailed usage instructions with screenshots, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## API Documentation

For complete API reference including WebSocket chat, REST admin APIs, and authentication, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Modification Guide

For developers looking to extend or customize this project, see [docs/MODIFICATION_GUIDE.md](docs/MODIFICATION_GUIDE.md).

## Security & Compliance

- **Data Privacy**: Conversation logs do not store personal health information
- **Secure Authentication**: JWT-based admin authentication via Cognito
- **Encrypted Communication**: All data encrypted in transit (TLS 1.2+) and at rest
- **Access Control**: Fine-grained IAM permissions for all AWS resources
- **Content Filtering**: Bedrock Guardrails with HIGH input and MEDIUM output filtering

## Credits

This application was developed for the National Council for Mental Wellbeing to support their mission of delivering Mental Health First Aid training and resources.

**Project Team:**
- National Council for Mental Wellbeing (NCMW) - Project Sponsor
- Arizona State University (ASU) - Software Development

**Built with:**
- AWS Bedrock for AI/ML capabilities
- React and Material-UI for the frontend
- AWS CDK for infrastructure as code
- OpenSearch Serverless for vector search

For complete credits, see [docs/CREDITS.md](docs/CREDITS.md).

## License

This project is licensed under a Proprietary Software License - see [docs/LICENSE.md](docs/LICENSE.md) for details.

