# MHFA Learning Navigator - Deployment Guide for Your AWS Environment

## Overview

The **MHFA Learning Navigator** is an AI-powered chatbot built on AWS Bedrock that provides real-time guidance for your Mental Health First Aid (MHFA) Learning Ecosystem. The solution includes:

- **AI Chatbot** with Claude 4 Sonnet for intelligent responses
- **Knowledge Base** powered by your training documents and resources
- **Admin Dashboard** for content management and analytics
- **Email Escalation** for complex queries requiring human expertise
- **Multilingual Support** (English/Spanish)
- **Guest Access** - no login required for end users

---

## 🚀 Quick Deployment Options

### Option 1: 4-Command Deploy (Fastest - ~30 minutes)
**Recommended for quick setup using automated AWS CodeBuild**

1. Upload your documents to an S3 bucket
2. Clone the repository and configure bucket name
3. Run automated deployment scripts
4. Sync Knowledge Base

**Full Guide:** [4-COMMAND-DEPLOY.md](4-COMMAND-DEPLOY.md)

### Option 2: Manual 5-Step Deploy (~2 hours)
**Recommended for those who prefer step-by-step control**

Detailed walkthrough with explanations for each deployment phase.

**Full Guide:** [QUICK_DEPLOY.md](QUICK_DEPLOY.md)

### Option 3: Comprehensive Deployment (~2-3 hours)
**For advanced configurations and customization**

Complete guide with troubleshooting, advanced settings, and optimization tips.

**Full Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📋 Prerequisites

Before deploying, ensure you have:

### AWS Account Requirements
- AWS account with administrator access
- AWS CLI configured (`aws configure`)
- AWS CDK installed (`npm install -g aws-cdk`)
- Docker installed (for CDK deployments)

### Bedrock Model Access
Enable these models in AWS Bedrock console:
- **Claude 4 Sonnet** (chat responses)
- **Titan Embeddings Text v2** (knowledge base)

> **Note:** Amazon Nova Lite is no longer required. The system uses manual user feedback (thumbs up/down) for sentiment tracking instead of AI analysis.

📍 Enable models at: https://console.aws.amazon.com/bedrock/home?region=us-west-2#/modelaccess

### GitHub Repository
- **Note:** This is a public repository - no GitHub personal access token required
- Fork this repository to your GitHub account (recommended)
- Repository URL: https://github.com/YOUR_USERNAME/ncwm_chatbot_2

### Email Configuration
- Verify your admin email in AWS SES (Simple Email Service)
- This email receives escalated queries from users

### Knowledge Base Documents
- Prepare your MHFA training PDFs, docs, and resources
- Upload to an S3 bucket before deployment

---

## 🎯 Deployment Summary

### What Gets Deployed

**Backend Infrastructure:**
- AWS Lambda functions (Node.js and Python)
- Amazon Bedrock Agent with Knowledge Base
- API Gateway (WebSocket and REST APIs)
- DynamoDB tables (session logs, analytics)
- Amazon SES (email notifications)
- Amazon Cognito (admin authentication)

**Frontend Application:**
- React web app hosted on AWS Amplify
- Real-time chat interface
- Admin dashboard
- Multilingual support (English/Spanish)

**Estimated Monthly Cost:**
- Low (1K conversations): $25-40/month
- Medium (10K conversations): $138-208/month ($168 typical)
- High (50K conversations): $648-948/month
- Enterprise (100K+ conversations): $1,198-1,698/month

> **With optimization:** Medium-tier costs can be reduced to $113-133/month through prompt optimization, caching, and reduced logging.

💰 **[Simple Cost Guide](COST_ESTIMATION_SIMPLE.md)** - Quick overview with pricing tiers
📊 **[Detailed Cost Analysis](COST_ESTIMATION.md)** - Complete breakdown and optimization strategies

---

## 📖 Documentation Resources

### Getting Started
- **[README.md](README.md)** - Project overview and quick start
- **[Technical Documentation](docs/TECHNICAL_DOCUMENTATION_SIMPLE.md)** - Architecture overview
- **[High-Level Design](docs/HIGH_LEVEL_DESIGN.md)** - System architecture diagrams

### Deployment Guides
- **[4-Command Deploy](4-COMMAND-DEPLOY.md)** ⚡ Fastest automated deployment (~30 min)
- **[Quick Deploy Guide](QUICK_DEPLOY.md)** 🚀 5-step manual deployment (~2 hours)
- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** 📚 Comprehensive guide with troubleshooting
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** ✅ Checkbox-style reference
- **[Simple Cost Guide](COST_ESTIMATION_SIMPLE.md)** 💰 Quick cost overview and pricing tiers
- **[Detailed Cost Analysis](COST_ESTIMATION.md)** 📊 Complete breakdown and optimization

### Administration
- **[Admin Features Guide](docs/features/ADMIN_FEATURES.md)** - Complete admin portal capabilities
- **[Admin Workflows](docs/ADMIN_WORKFLOWS.md)** - 10 common admin operations

### Testing
- **[Client Testing Package](docs/CLIENT_TESTING_PACKAGE.md)** - Complete testing guide
- **[User Workflows](docs/USER_WORKFLOWS.md)** - 9 user interaction flows

---

## 🛠️ Deployment Scripts

The repository includes automated deployment scripts:

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-params.sh` | Configure AWS parameters | `./setup-params.sh --github-owner USERNAME --github-repo REPO --admin-email EMAIL` |
| `deploy-codebuild.sh` | Deploy via CodeBuild | `./deploy-codebuild.sh` |
| `sync-knowledge-base.sh` | Sync documents to KB | `./sync-knowledge-base.sh --kb-id KB_ID --wait` |
| `deploy.sh` | Manual CDK deployment | `./deploy.sh` |

All scripts are located in the repository root directory.

---

## 🎓 Key Features

### For End Users
- **Guest Access** - Start chatting immediately, no login required
- **Role-Based Recommendations** - Personalized for Instructors, Staff, and Learners
- **Language Toggle** - Switch between English and Spanish
- **Real-Time Responses** - Streaming AI-powered answers
- **Source Citations** - See which documents support each answer

### For Administrators
- **Document Management** - Upload and manage knowledge base PDFs
- **Analytics Dashboard** - View usage metrics and sentiment analysis
- **Escalated Queries** - Manage questions requiring expert attention
- **Conversation Logs** - Review detailed chat transcripts
- **Email Notifications** - Automated alerts for low-confidence queries

---

## 📞 Support & Next Steps

### Deployment Support
1. Review the deployment guide that matches your preference (4-command, quick, or comprehensive)
2. Ensure all prerequisites are met
3. Follow the step-by-step instructions
4. Use the troubleshooting section if you encounter issues

### Post-Deployment
After successful deployment, you'll receive:
- **Frontend URL** - Public chatbot interface
- **Admin Portal URL** - Dashboard for content management
- **API Endpoints** - WebSocket and REST API URLs
- **Resource IDs** - Knowledge Base ID, Agent ID, User Pool ID

### Testing Your Deployment
1. Access the frontend URL
2. Try asking MHFA-related questions
3. Test the admin portal with your Cognito credentials
4. Upload additional documents as needed
5. Monitor analytics and conversation logs

---

## 🔒 Security Considerations

- All AWS credentials stay in your AWS account (never shared)
- PDF documents remain in your private S3 bucket
- Admin portal requires Cognito authentication
- Email notifications use verified SES identities
- API Gateway endpoints are secured with IAM
- Frontend hosted on Amplify with HTTPS

---

## 📊 Estimated Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Prerequisites | 15-30 min | AWS setup, model access, document prep |
| Backend Deployment | 15-20 min | CDK stack deployment (automated) |
| Frontend Deployment | 10-15 min | Amplify build and deploy (automated) |
| Knowledge Base Sync | 5-15 min | Document ingestion (depends on doc count) |
| Testing & Verification | 10-15 min | Test chatbot and admin features |
| **Total** | **55-95 min** | End-to-end deployment |

---

## 📧 Contact

For questions or assistance with deployment:
- Review the [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)
- Check the [Troubleshooting section](DEPLOYMENT_GUIDE.md#troubleshooting)
- Refer to [AWS Documentation](https://docs.aws.amazon.com/bedrock/)

---

**Repository:** https://github.com/YOUR_USERNAME/ncwm_chatbot_2
**License:** See [LICENSE](LICENSE) file
**Documentation:** All guides available in the repository

---

## ✅ Quick Start Checklist

- [ ] Fork repository to your GitHub account
- [ ] Configure AWS CLI with credentials
- [ ] Enable Bedrock models (Claude, Titan, Nova)
- [ ] Verify admin email in AWS SES
- [ ] Upload documents to S3 bucket
- [ ] Choose deployment method (4-command, quick, or comprehensive)
- [ ] Follow deployment guide
- [ ] Test chatbot functionality
- [ ] Configure admin portal
- [ ] Add additional users if needed

**Ready to deploy?** Start with [4-COMMAND-DEPLOY.md](4-COMMAND-DEPLOY.md) for the fastest setup!
