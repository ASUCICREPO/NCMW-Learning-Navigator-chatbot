# Learning Navigator - Project Summary

## Quick Overview

**Project**: Learning Navigator - AI-Powered Chatbot for Mental Health First Aid (MHFA)
**Customer**: The National Council for Mental Wellbeing
**Timeline**: 2-3 months for MVP
**Platform**: AWS Cloud (Serverless Architecture)
**LLM**: Amazon Bedrock (Claude 3 Sonnet)
**Budget**: ~$1,000-1,500/month (AWS operational costs)

---

## What We're Building

An intelligent chatbot assistant that helps:
- **MHFA Instructors**: Course management, invoicing, training resources
- **Internal Staff**: Operational guidance, system support, data insights
- **Admins**: Full system access, analytics, configuration
- **Learners** (Phase 2): Course information, learning resources

---

## Key Features (MVP)

✅ **Conversational AI** - Natural language interface with Amazon Bedrock (Claude)
✅ **Bilingual Support** - Full English and Spanish functionality
✅ **Role-Based Personalization** - Different responses based on user role
✅ **Knowledge Base** - RAG (Retrieval-Augmented Generation) for accurate answers
✅ **Source Citations** - Every response includes source references
✅ **Real-Time Streaming** - Live response generation via WebSocket
✅ **Smart Escalation** - Auto-creates Zendesk tickets when needed
✅ **Admin Dashboard** - Analytics, conversation logs, sentiment analysis
✅ **Feedback System** - Thumbs up/down for response quality
✅ **Accessibility** - WCAG 2.1 Level AA compliant
✅ **Security** - HIPAA-compatible, encrypted, secure authentication

---

## Architecture Summary

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **Tailwind CSS / Material-UI** for styling
- **AWS Amplify** for authentication
- **WebSocket** for real-time chat
- **i18next** for internationalization

### Backend (Serverless)
- **AWS Lambda** - All business logic (Node.js 20)
- **API Gateway** - REST + WebSocket APIs
- **DynamoDB** - Primary database (NoSQL)
- **S3** - Document storage, static hosting
- **CloudFront** - CDN for global delivery

### AI/ML
- **Amazon Bedrock** - LLM (Claude 3 Sonnet)
- **OpenSearch** - Vector search for RAG (recommended)
  - *Alternative*: Amazon Kendra ($810/month, fully managed)
- **Amazon Comprehend** - Sentiment analysis
- **Amazon Translate** - English ↔ Spanish

### Security & Auth
- **AWS Cognito** - User authentication & authorization
- **AWS WAF** - Web application firewall
- **AWS KMS** - Encryption key management
- **AWS Secrets Manager** - API credentials

### Integrations
- **Zendesk API** - Support ticket creation
- **Microsoft Dynamics 365** (Phase 2) - CRM integration

### Monitoring
- **CloudWatch** - Logs, metrics, dashboards
- **X-Ray** - Distributed tracing
- **CloudWatch Alarms** - Automated alerts

---

## Development Phases

### Phase 0: Pre-Development (Week 1)
- Finalize requirements and architecture
- Set up AWS accounts and GitHub repo
- Configure CI/CD pipeline
- Establish team and workflows

### Phase 1: Foundation (Weeks 2-4)
- AWS infrastructure setup (CDK)
- Authentication with Cognito
- Frontend React app with basic UI
- Backend Lambda functions and API Gateway
- DynamoDB tables and data access

### Phase 2: AI Integration (Weeks 5-7)
- Amazon Bedrock integration
- RAG with OpenSearch (or Kendra)
- Real-time chat with WebSocket streaming
- Bilingual support (English/Spanish)
- Citation implementation

### Phase 3: Core Features (Weeks 8-9)
- Role-based personalization
- Escalation logic and sentiment analysis
- Zendesk integration
- Feedback collection system
- Basic admin dashboard with analytics

### Phase 4: Polish & Testing (Weeks 10-11)
- Comprehensive testing (unit, integration, e2e)
- WCAG 2.1 AA accessibility compliance
- Performance optimization
- Security hardening
- Load testing

### Phase 5: Deployment & Launch (Week 12)
- Production deployment
- Monitoring and alerting setup
- User documentation
- Beta testing with instructors
- Full launch

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, TypeScript, Redux, Tailwind CSS, WebSocket |
| **Backend** | AWS Lambda (Node.js), API Gateway, DynamoDB |
| **AI/ML** | Bedrock (Claude), OpenSearch, Comprehend, Translate |
| **Storage** | DynamoDB, S3, (Optional: RDS for analytics) |
| **Auth** | AWS Cognito |
| **CDN** | CloudFront |
| **IaC** | AWS CDK (TypeScript) |
| **CI/CD** | GitHub Actions / AWS CodePipeline |
| **Monitoring** | CloudWatch, X-Ray |
| **Security** | WAF, KMS, Secrets Manager, Shield |

---

## Cost Breakdown (Monthly - MVP)

| Service | Cost | Notes |
|---------|------|-------|
| Lambda | $50 | 1M invocations, 512MB |
| API Gateway | $35 | REST + WebSocket |
| **Bedrock (Claude)** | **$150** | Varies with usage |
| **OpenSearch** | **$100** | Small cluster (recommended) |
| *Kendra (alternative)* | *$810* | *Developer edition* |
| DynamoDB | $25 | On-demand, 5GB |
| S3 | $10 | 50GB storage |
| CloudFront | $15 | 100GB transfer |
| Cognito | $5 | < 50k MAUs |
| CloudWatch | $20 | Logs, metrics |
| **TOTAL (with OpenSearch)** | **~$410** | |
| **TOTAL (with Kendra)** | **~$1,120** | |

**Recommendation**: Start with OpenSearch to save ~$700/month

---

## Key Decisions & Rationale

### Why Serverless?
- **Low initial traffic** - No need for always-on servers
- **Auto-scaling** - Handles traffic spikes automatically
- **Cost-effective** - Pay only for what you use
- **No ops overhead** - AWS manages infrastructure

### Why Amazon Bedrock?
- **Fully managed** - No model hosting required
- **Enterprise-ready** - SOC 2, HIPAA-eligible
- **Multiple models** - Can switch between Claude versions
- **Easy integration** - Native AWS service

### Why OpenSearch over Kendra?
- **Cost**: $100/month vs $810/month
- **Flexibility**: More control over search and ranking
- **Hybrid search**: Keyword + semantic search
- **Sufficient for MVP**: Can upgrade to Kendra later if needed

### Why DynamoDB over RDS?
- **Serverless** - No capacity planning
- **Fast** - Single-digit millisecond latency
- **Auto-scaling** - Handles traffic automatically
- **Simple data model** - Key-value and document storage sufficient

---

## Success Metrics

### Technical KPIs
- ✅ **Uptime**: 99.5% SLA
- ✅ **Response Time**: < 3 seconds (95th percentile)
- ✅ **Error Rate**: < 1%
- ✅ **API Success**: > 99%

### Product KPIs
- 🎯 **Adoption**: 60% of active instructors using chatbot (3 months)
- 🎯 **Resolution Rate**: 70% queries resolved without escalation
- 🎯 **User Satisfaction**: 4/5 average rating
- 🎯 **Engagement**: 5+ messages per user per week

### Business Impact
- 📉 **Support Tickets**: 40% reduction
- ⏱️ **Time to Information**: 60% faster
- 📈 **Instructor Activation**: 15% increase
- 💰 **Cost per Conversation**: Track and optimize

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **High Bedrock costs** | High | Implement caching, prompt optimization, monitoring |
| **Poor RAG quality** | High | Extensive testing, feedback loop, knowledge base curation |
| **Zendesk integration failures** | Medium | Circuit breaker, fallback email, retry logic |
| **Security vulnerabilities** | Critical | Security audits, penetration testing, best practices |
| **Performance at scale** | Medium | Load testing, auto-scaling, performance monitoring |

---

## Team Structure (Recommended)

- **Product Manager** (1)
- **Technical Lead / Architect** (1)
- **Full-Stack Engineers** (2-3)
- **DevOps Engineer** (1)
- **QA Engineer** (1)
- **UI/UX Designer** (0.5 FTE)
- **Data Scientist / ML Engineer** (0.5 FTE)

**Consultants**:
- Security Specialist (penetration testing)
- Accessibility Specialist (WCAG compliance)
- Technical Writer (documentation)

---

## Next Steps

### Immediate Actions
1. ✅ **Review Requirements** - [REQUIREMENTS.md](REQUIREMENTS.md)
2. ✅ **Review Architecture** - [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
3. ✅ **Review Roadmap** - [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)
4. ✅ **Review AWS Guide** - [AWS_SERVICES_GUIDE.md](AWS_SERVICES_GUIDE.md)

### Before Development
5. ⬜ **Get stakeholder approval** on requirements and architecture
6. ⬜ **Assemble development team** and assign roles
7. ⬜ **Set up AWS accounts** (dev, staging, prod)
8. ⬜ **Obtain access to**:
   - Knowledge base documents (Google Drive)
   - Zendesk API credentials
   - Branding guidelines
   - Existing AWS Cognito (if applicable)
9. ⬜ **Create GitHub repository** with branch protection
10. ⬜ **Set up project tracking** (Jira / GitHub Projects)

### Week 1 Kickoff
11. ⬜ **Initialize AWS CDK project**
12. ⬜ **Set up CI/CD pipeline**
13. ⬜ **Create DynamoDB tables (dev)**
14. ⬜ **Configure Cognito user pools**
15. ⬜ **Initialize React application**
16. ⬜ **First team sync meeting**

---

## Important Notes & Clarifications

### Out of Scope (MVP)
❌ Voice/audio interface
❌ Video content generation
❌ Mobile native apps (web responsive only)
❌ Microsoft Dynamics 365 integration (Phase 2)
❌ Learner-facing features (Phase 2)
❌ Multi-tenancy / white-labeling

### Nice-to-Have Features (Lower Priority)
⭐ Response feedback (thumbs up/down)
⭐ Microsoft Dynamics 365 integration
⭐ Advanced sentiment analysis
⭐ Proactive notifications

### Questions to Clarify with Customer
1. **Knowledge Base**: Are documents ready? In what formats?
2. **Cognito**: Existing user pool or need to create new one?
3. **Zendesk**: API credentials available? Ticket workflow preferences?
4. **Branding**: Access to brand guidelines document?
5. **Budget**: Approval for ~$1,000-1,500/month AWS costs?
6. **LMS Integration**: What LMS platform? API documentation available?
7. **User Testing**: Beta testers available for soft launch?

---

## Documentation

All project documentation is in this repository:

1. **[REQUIREMENTS.md](REQUIREMENTS.md)** - Functional and non-functional requirements
2. **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - High-level and detailed architecture
3. **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - Week-by-week implementation plan
4. **[AWS_SERVICES_GUIDE.md](AWS_SERVICES_GUIDE.md)** - AWS-specific implementation details
5. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - This document (executive summary)

---

## Conclusion

The Learning Navigator project is well-scoped for a 2-3 month MVP delivery. The serverless AWS architecture provides:

✅ **Scalability** - Grows with demand
✅ **Cost-effectiveness** - Pay-per-use model
✅ **Reliability** - Managed services with high uptime
✅ **Security** - Enterprise-grade security and compliance
✅ **Developer velocity** - Focus on features, not infrastructure

**Key Success Factors**:
1. Clear requirements (documented)
2. Proven AWS services (Bedrock, Lambda, DynamoDB)
3. Phased approach (MVP → enhancements)
4. Strong team with defined roles
5. Continuous testing and feedback

**Ready to start building!** 🚀

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Author**: Project Planning Team
**Status**: Ready for Review & Approval
