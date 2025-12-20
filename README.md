# Learning Navigator - AI-Powered Chatbot

> An intelligent assistant for the Mental Health First Aid (MHFA) Learning Ecosystem

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com/)
[![Bedrock](https://img.shields.io/badge/Bedrock-Claude%203-blue)](https://aws.amazon.com/bedrock/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> **📖 New to the project?** Start with [QUICK_START.md](QUICK_START.md) for a guided tour!

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Technology Stack](#technology-stack)
- [Project Status](#project-status)

---

## 🎯 Overview

**Learning Navigator** is an AI-powered chatbot designed to support The National Council for Mental Wellbeing's MHFA program by:

- Reducing administrative burden on instructors and staff
- Providing instant access to training resources and information
- Automating support ticket creation and escalation
- Improving mental health education accessibility

### Target Users
- 🎓 **MHFA Instructors** - Course management, resources, invoicing
- 👥 **Internal Staff** - Operational guidance, system support
- 👨‍💼 **Administrators** - Analytics, configuration, user management
- 📚 **Learners** *(Phase 2)* - Course information, learning resources

---

## ✨ Features

### Core Capabilities
- ✅ **Conversational AI** - Natural language understanding with Claude 3 Sonnet
- ✅ **Bilingual Support** - Full English and Spanish functionality
- ✅ **Role-Based Personalization** - Customized responses based on user role
- ✅ **Smart Knowledge Base** - RAG (Retrieval-Augmented Generation) for accurate answers
- ✅ **Source Citations** - Every response includes verifiable sources
- ✅ **Real-Time Streaming** - Live response generation for better UX
- ✅ **Intelligent Escalation** - Auto-creates Zendesk tickets when human help is needed
- ✅ **Analytics Dashboard** - Conversation logs, metrics, sentiment analysis
- ✅ **Feedback System** - Thumbs up/down for continuous improvement
- ✅ **Accessibility** - WCAG 2.1 Level AA compliant
- ✅ **Enterprise Security** - HIPAA-compatible, encrypted, secure authentication

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┏━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━┓          │
│  ┃  Web App   ┃  ┃   Admin    ┃  ┃  Mobile    ┃          │
│  ┃  (React)   ┃  ┃ Dashboard  ┃  ┃ Responsive ┃          │
│  ┗━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━┛          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/WSS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (REST + WebSocket)                  │
│  • Authentication (Cognito)  • Rate Limiting  • Validation  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┏━━━━━━━━━━━━━┓   ┏━━━━━━━━━━━━━┓   ┏━━━━━━━━━━━━━┓
┃ APPLICATION ┃   ┃   AI/ML     ┃   ┃ INTEGRATION ┃
┃   LAYER     ┃   ┃   LAYER     ┃   ┃    LAYER    ┃
┣━━━━━━━━━━━━━┫   ┣━━━━━━━━━━━━━┫   ┣━━━━━━━━━━━━━┫
┃   Lambda    ┃   ┃  Bedrock    ┃   ┃  Zendesk    ┃
┃ Functions   ┃◄──┃  (Claude)   ┃   ┃     API     ┃
┃             ┃   ┃             ┃   ┃             ┃
┃ • Chat API  ┃   ┃ OpenSearch  ┃   ┃ Dynamics    ┃
┃ • Auth      ┃   ┃  (Vector    ┃   ┃    365      ┃
┃ • Analytics ┃   ┃   Search)   ┃   ┃ (Phase 2)   ┃
┃ • Admin     ┃   ┃             ┃   ┃             ┃
┗━━━━━━━━━━━━━┛   ┗━━━━━━━━━━━━━┛   ┗━━━━━━━━━━━━━┛
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┏━━━━━━━━━━━┓   ┏━━━━━━━━━━━┓   ┏━━━━━━━━━━━┓           │
│  ┃ DynamoDB  ┃   ┃ S3 Buckets┃   ┃    RDS    ┃           │
│  ┃           ┃   ┃           ┃   ┃ (Optional)┃           │
│  ┃ Sessions  ┃   ┃ Documents ┃   ┃           ┃           │
│  ┃ Users     ┃   ┃ Logs      ┃   ┃ Analytics ┃           │
│  ┃ Chats     ┃   ┃ Knowledge ┃   ┃ Reporting ┃           │
│  ┃ Feedback  ┃   ┃ Base      ┃   ┃           ┃           │
│  ┗━━━━━━━━━━━┛   ┗━━━━━━━━━━━┛   ┗━━━━━━━━━━━┛           │
└─────────────────────────────────────────────────────────────┘
```

### RAG (Retrieval-Augmented Generation) Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Query Processing                 │
│    • Language detection             │
│    • Intent classification          │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 2. Knowledge Base Search            │
│    • Generate query embedding       │
│    • Hybrid search (keyword +       │
│      semantic) in OpenSearch        │
│    • Filter by user role            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 3. Context Retrieval                │
│    • Top 5 relevant documents       │
│    • Extract text chunks            │
│    • Include source metadata        │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 4. Prompt Construction              │
│    • System prompt (role-based)     │
│    • Retrieved context              │
│    • Conversation history           │
│    • User query                     │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 5. Bedrock (Claude) Invocation      │
│    • Stream response generation     │
│    • Include citations              │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 6. Post-Processing                  │
│    • Sentiment analysis             │
│    • Escalation check               │
│    • Save to database               │
│    • Stream to user (WebSocket)     │
└─────────────────────────────────────┘
```

---

## 📚 Documentation

### Core Documentation (Start Here)
| Document | Description | Priority |
|----------|-------------|----------|
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Executive overview - read this first! | ⭐ High |
| **[REQUIREMENTS.md](REQUIREMENTS.md)** | Complete functional & non-functional requirements | ⭐ High |
| **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** | Full architecture design with AWS services | ⭐ High |
| **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** | 12-week development plan | ⭐ High |

### Technical Guides
| Document | Description | Priority |
|----------|-------------|----------|
| **[AWS_SERVICES_GUIDE.md](AWS_SERVICES_GUIDE.md)** | AWS implementation with code examples | High |
| **[LANGCHAIN_INTEGRATION_GUIDE.md](LANGCHAIN_INTEGRATION_GUIDE.md)** | LangChain RAG & agents implementation | High |
| **[KNOWLEDGE_BASE_SETUP.md](KNOWLEDGE_BASE_SETUP.md)** | S3 document processing pipeline | Medium |

### Planning & Learning
| Document | Description | Priority |
|----------|-------------|----------|
| **[LEARNING_PATH.md](LEARNING_PATH.md)** | Your week-by-week learning guide | Medium |
| **[QUESTIONS_FOR_CUSTOMER.md](QUESTIONS_FOR_CUSTOMER.md)** | Questions needing answers | High |

---

## 🚀 Quick Start

### Prerequisites

- **AWS Account** with appropriate permissions
- **Node.js** 20.x or later
- **AWS CLI** configured
- **AWS CDK** installed (`npm install -g aws-cdk`)
- **Git** for version control

### Setup (Coming Soon)

```bash
# Clone the repository
git clone https://github.com/national-council/learning-navigator.git
cd learning-navigator

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AWS credentials and configuration

# Deploy infrastructure (dev environment)
cd infrastructure
cdk deploy --all --profile dev

# Start frontend development server
cd ../frontend
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### Project Structure

```
learning-navigator/
├── README.md                      # This file
├── PROJECT_SUMMARY.md             # Executive summary
├── REQUIREMENTS.md                # Requirements specification
├── SYSTEM_ARCHITECTURE.md         # Architecture documentation
├── IMPLEMENTATION_ROADMAP.md      # Development roadmap
├── AWS_SERVICES_GUIDE.md          # AWS implementation guide
│
├── infrastructure/                # AWS CDK infrastructure code
│   ├── bin/
│   │   └── app.ts                 # CDK app entry point
│   ├── lib/
│   │   ├── api-stack.ts           # API Gateway, Lambda
│   │   ├── data-stack.ts          # DynamoDB, S3, RDS
│   │   ├── ai-stack.ts            # Bedrock, OpenSearch
│   │   ├── auth-stack.ts          # Cognito
│   │   ├── monitoring-stack.ts    # CloudWatch, X-Ray
│   │   └── frontend-stack.ts      # S3, CloudFront
│   └── cdk.json
│
├── frontend/                      # React application
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── services/              # API clients
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── store/                 # Redux store
│   │   ├── utils/                 # Utilities
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
├── backend/                       # Lambda functions
│   ├── functions/
│   │   ├── chat/                  # Chat-related functions
│   │   ├── ai/                    # AI service functions
│   │   ├── user/                  # User management
│   │   ├── admin/                 # Admin functions
│   │   └── integrations/          # External integrations
│   ├── shared/                    # Shared code/layers
│   │   ├── db/                    # Database utilities
│   │   ├── auth/                  # Authentication helpers
│   │   └── utils/                 # Common utilities
│   └── package.json
│
├── docs/                          # Additional documentation
│   ├── api/                       # API documentation
│   ├── user-guides/               # User manuals
│   └── admin-guides/              # Admin documentation
│
└── tests/                         # Test suites
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    └── e2e/                       # End-to-end tests
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS / Material-UI
- **Routing**: React Router v6
- **Authentication**: AWS Amplify
- **Real-Time**: Native WebSocket API
- **Internationalization**: i18next
- **Testing**: Jest, React Testing Library, Playwright

### Backend
- **Compute**: AWS Lambda (Node.js 20.x)
- **API**: Amazon API Gateway (REST + WebSocket)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **CDN**: Amazon CloudFront

### AI/ML
- **LLM**: Amazon Bedrock (Claude 3 Sonnet)
- **Vector Search**: Amazon OpenSearch
- **Embeddings**: Amazon Titan Embeddings
- **Sentiment Analysis**: Amazon Comprehend
- **Translation**: Amazon Translate

### Security & Auth
- **Authentication**: AWS Cognito
- **WAF**: AWS WAF
- **Encryption**: AWS KMS
- **Secrets**: AWS Secrets Manager

### Infrastructure & DevOps
- **IaC**: AWS CDK (TypeScript)
- **CI/CD**: GitHub Actions / AWS CodePipeline
- **Monitoring**: CloudWatch, X-Ray
- **Version Control**: Git / GitHub

### Integrations
- **Support Ticketing**: Zendesk API
- **CRM**: Microsoft Dynamics 365 (Phase 2)
- **LMS**: Custom integration (based on customer's LMS)

---

## 📊 Project Status

### Current Phase: **Pre-Development** 📋

- ✅ Requirements gathering complete
- ✅ Architecture design complete
- ✅ Implementation roadmap defined
- ⬜ Stakeholder approval pending
- ⬜ Team assembly in progress
- ⬜ AWS infrastructure setup - not started
- ⬜ Development - not started

### Timeline

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 0: Pre-Dev          │ Week 1                          │
│  Phase 1: Foundation       │ Weeks 2-4                       │
│  Phase 2: AI Integration   │ Weeks 5-7                       │
│  Phase 3: Core Features    │ Weeks 8-9                       │
│  Phase 4: Polish & Testing │ Weeks 10-11                     │
│  Phase 5: Launch           │ Week 12                         │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  You are here ▲                                              │
└─────────────────────────────────────────────────────────────┘
```

### MVP Target: **End of Month 3** 🎯

---

## 💰 Estimated Costs

### Development (One-Time)
- **Team**: $150k - $240k (3 months, varies by location)
- **Third-Party**: ~$5k (security audit, accessibility testing)

### Operations (Monthly)
| Component | Cost |
|-----------|------|
| AWS Lambda | $50 |
| API Gateway | $35 |
| Bedrock (Claude) | $150 |
| OpenSearch | $100 |
| DynamoDB | $25 |
| S3 + CloudFront | $25 |
| CloudWatch | $20 |
| Other Services | $20 |
| **Total** | **~$425/month** |

**Note**: Costs scale with usage. Budget $1,000-1,500/month for production.

---

## 🎯 Success Metrics

### Technical KPIs
- ✅ **99.5% uptime** SLA
- ✅ **< 3 seconds** response time (95th percentile)
- ✅ **< 1% error rate**
- ✅ **> 99% API success rate**

### Product KPIs
- 🎯 **60% adoption** by active instructors (3 months)
- 🎯 **70% resolution rate** without human escalation
- 🎯 **4/5 average** user satisfaction rating
- 🎯 **5+ messages** per user per week

### Business Impact
- 📉 **40% reduction** in support tickets
- ⏱️ **60% faster** time to find information
- 📈 **15% increase** in instructor activation
- 💰 **Cost per conversation** tracked and optimized

---

## 🔒 Security & Compliance

- ✅ **HIPAA-Compatible** - Sensitive mental health data protection
- ✅ **WCAG 2.1 Level AA** - Full accessibility compliance
- ✅ **SOC 2 Type II** - Enterprise security standards
- ✅ **Data Encryption** - At rest (KMS) and in transit (TLS 1.3)
- ✅ **Zero Trust Architecture** - Defense in depth
- ✅ **Regular Audits** - Security and penetration testing

---

## 🤝 Contributing

This is a private project for The National Council for Mental Wellbeing. Contributing guidelines will be established during development.

---

## 📄 License

Proprietary - The National Council for Mental Wellbeing

---

## 📧 Contact

**Customer Contact**: sunitau@thenationalcouncil.org
**Organization**: The National Council for Mental Wellbeing
**Website**: [thenationalcouncil.org](https://www.thenationalcouncil.org)

---

## 🙏 Acknowledgments

- **The National Council for Mental Wellbeing** - Project sponsor and partner
- **Mental Health First Aid (MHFA)** - Core program being supported
- **AWS** - Cloud infrastructure and AI services
- **Anthropic** - Claude AI model via AWS Bedrock

---

**Built with ❤️ to support mental health awareness and education**

---

*Last Updated: 2025-12-20*
