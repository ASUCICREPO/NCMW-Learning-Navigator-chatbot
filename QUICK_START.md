# Quick Start Guide

## 🚀 Getting Started

**New to this project?** Read this page first, then dive into the detailed documentation.

---

## Project Overview

**What**: AI-powered chatbot for MHFA instructors, staff, and learners
**Platform**: AWS Serverless (Lambda, Bedrock, OpenSearch, DynamoDB)
**AI Framework**: LangChain + Amazon Bedrock (Claude 3 Sonnet)
**Timeline**: 12 weeks to MVP
**Budget**: ~$400-500/month operational costs

---

## Key Information

### S3 Knowledge Base ✅
- **Bucket**: `s3://national-council-s3-pdfs` (us-west-2)
- **Documents**: 3 PDFs (7.1 MiB)
  - Learner Connect Guide (1.7 MiB)
  - MHFA Connect Guide (4.9 MiB)
  - Instructor Policy Handbook (531 KB)

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: AWS Lambda (Node.js 20)
- **AI**: LangChain + Bedrock (Claude) + OpenSearch (RAG)
- **Database**: DynamoDB
- **Auth**: AWS Cognito
- **IaC**: AWS CDK

---

## Documentation Map

### 📖 Must Read (In Order)
1. **[README.md](README.md)** - Project overview and architecture diagrams
2. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Executive summary
3. **[REQUIREMENTS.md](REQUIREMENTS.md)** - What we're building
4. **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - How it works
5. **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - Step-by-step plan

### 🔧 Technical Implementation
- **[AWS_SERVICES_GUIDE.md](AWS_SERVICES_GUIDE.md)** - AWS setup with code
- **[LANGCHAIN_INTEGRATION_GUIDE.md](LANGCHAIN_INTEGRATION_GUIDE.md)** - LangChain RAG & agents
- **[KNOWLEDGE_BASE_SETUP.md](KNOWLEDGE_BASE_SETUP.md)** - Process S3 documents

### 📚 Learning & Planning
- **[LEARNING_PATH.md](LEARNING_PATH.md)** - Week-by-week learning guide
- **[QUESTIONS_FOR_CUSTOMER.md](QUESTIONS_FOR_CUSTOMER.md)** - Open questions

---

## Next Steps

### Before Development
- [ ] Read core documentation (README → PROJECT_SUMMARY → REQUIREMENTS)
- [ ] Review architecture and roadmap
- [ ] Answer questions in QUESTIONS_FOR_CUSTOMER.md
- [ ] Get stakeholder approval

### Week 1 (Pre-Development)
- [ ] Set up AWS accounts (dev, staging, prod)
- [ ] Create GitHub repository
- [ ] Configure CI/CD pipeline
- [ ] Obtain Zendesk API credentials
- [ ] Complete LangChain quickstart tutorial

### Week 2-4 (Foundation)
- [ ] Deploy AWS infrastructure (CDK)
- [ ] Set up Cognito authentication
- [ ] Build React frontend skeleton
- [ ] Create Lambda functions

### Week 5-7 (AI Integration)
- [ ] Process S3 documents → OpenSearch
- [ ] Implement LangChain RAG
- [ ] Build agent with tools
- [ ] Enable streaming chat

### Week 8-12 (Features & Launch)
- [ ] Testing and optimization
- [ ] Accessibility compliance
- [ ] Production deployment
- [ ] Beta testing and launch

---

## Key Decisions Made

✅ **Use LangChain** - For RAG and agents (better than raw SDK)
✅ **OpenSearch over Kendra** - Saves $700/month, sufficient for MVP
✅ **Deploy in us-west-2** - Same region as S3 bucket
✅ **DynamoDB over RDS** - Serverless, fast, cost-effective
✅ **12-week timeline** - Realistic for MVP with quality

---

## Cost Summary

### Development (One-Time)
- Team (3 months): $150k-240k
- S3 document processing: $1.22

### Operations (Monthly)
- AWS services: $400-500
- OpenSearch: $100
- Bedrock (usage-based): $150
- Other services: $150-250

**Total**: ~$400-500/month for MVP

---

## Success Metrics

- **Adoption**: 60% of active instructors using within 3 months
- **Resolution**: 70% queries without escalation
- **Satisfaction**: 4/5 average rating
- **Performance**: <3s response time (95th percentile)
- **Uptime**: 99.5% availability

---

## Common Questions

**Q: Do I need to learn LangChain?**
A: Yes! Start with the quickstart (2-3 hours) before Week 5.

**Q: Can I use Claude 3.5 Sonnet instead of 3 Sonnet?**
A: Yes, either works. 3.5 is slightly better but costs the same.

**Q: What if we want to add more documents later?**
A: Easy! Just upload to S3, Lambda auto-processes them.

**Q: Is this HIPAA compliant?**
A: Yes, when properly configured. All AWS services are HIPAA-eligible.

**Q: Can we scale beyond 100 concurrent users?**
A: Yes! Lambda and DynamoDB auto-scale to thousands of users.

---

## Getting Help

- **AWS**: [AWS Documentation](https://docs.aws.amazon.com/)
- **LangChain**: [LangChain Docs](https://js.langchain.com/docs/)
- **Claude**: [Anthropic Documentation](https://docs.anthropic.com/)
- **Questions**: Refer to QUESTIONS_FOR_CUSTOMER.md

---

**Ready to build? Start with [README.md](README.md)!** 🚀
