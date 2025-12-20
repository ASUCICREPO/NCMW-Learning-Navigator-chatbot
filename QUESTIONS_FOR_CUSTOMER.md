# Questions & Clarifications Needed

## Customer Information
**Contact**: sunitau@thenationalcouncil.org
**Organization**: The National Council for Mental Wellbeing

---

## 🔴 CRITICAL QUESTIONS (Required for Project Start)

### 1. Knowledge Base & Content
**Q1.1**: ✅ **CONFIRMED** - Knowledge base documents analyzed
- **Bucket**: `arn:aws:s3:::national-council-s3-pdfs`
- **Region**: us-west-2 ✅
- **Documents**: 3 PDFs (7.1 MiB total) ✅
- **Access**: Read access verified ✅
- **Contents**:
  1. MHFA Learners Connect User Guide (1.7 MiB)
  2. MHFA Connect User Guide (4.9 MiB)
  3. MHFA Instructor Policy Handbook (531 KB)

- ⬜ **Still need to confirm**:
  - Languages: All appear to be English - are Spanish versions available?
  - Update frequency: How often are documents updated?
  - Additional documents: Are more documents planned to be added?
  - Document versioning: Should we enable S3 versioning?

**Q1.2**: What types of content are in the knowledge base?
- Instructor guides and manuals
- Course materials and curricula
- Administrative procedures
- FAQs
- Policy documents
- Training videos (transcripts?)
- Other resources?

### 2. Existing AWS Infrastructure
**Q2.1**: Do you already have an AWS Cognito user pool set up?
- If yes, can you provide:
  - User Pool ID
  - Region
  - Current user groups/roles
  - Number of existing users
- If no, we'll create a new one

**Q2.2**: What AWS accounts should we use?
- Do you have separate accounts for dev/staging/production?
- What are the account IDs?
- Can you provide IAM roles with necessary permissions?

**Q2.3**: Do you have any existing AWS infrastructure we need to integrate with?
- VPCs or networking requirements?
- Existing databases?
- Other services currently in use?

### 3. Zendesk Integration
**Q3.1**: Zendesk configuration details:
- Subdomain: _____________.zendesk.com
- Can you provide API credentials (API token)?
- Preferred ticket workflow:
  - Which queue should tickets go to?
  - Default priority level?
  - Custom fields needed?
  - Tags to apply?

**Q3.2**: Current support volume:
- How many support tickets do you receive per month?
- What percentage are related to MHFA training?
- Most common support topics?

### 4. User Base & Scale
**Q4.1**: Current user numbers:
- Active MHFA Instructors: ~______
- Internal staff users: ~______
- Expected growth rate: _____%

**Q4.2**: Expected usage patterns:
- Peak usage times (e.g., during training seasons)?
- Average messages per conversation?
- Estimated conversations per month?

### 5. Learning Management System (LMS)
**Q5.1**: What LMS platform are you using?
- Platform name: ____________
- Version: ____________
- Does it have an API?
- API documentation available?

**Q5.2**: What data do we need to pull from the LMS?
- Course catalog
- User enrollments
- Completion status
- Schedules
- Other?

### 6. Branding & Design
**Q6.1**: Can you provide:
- Brand guidelines document (colors, fonts, logos)
- Logo files (SVG, PNG)
- Existing UI/UX patterns from your Learning Ecosystem
- Screenshots of current system (for consistency)

**Q6.2**: Do you have a preferred UI framework or design system?
- Material-UI
- Chakra UI
- Custom design system
- Other preference?

---

## 🟡 HIGH PRIORITY QUESTIONS (Needed Soon)

### 7. Budget & Approvals
**Q7.1**: Budget approval:
- AWS operational costs: ~$1,000-1,500/month approved?
- Development costs: $150k-240k for 3 months approved?
- Any budget constraints we should know about?

**Q7.2**: Cost optimization preferences:
- Use OpenSearch ($100/month) vs Kendra ($810/month)?
- Willing to implement caching to reduce AI costs?
- Any AWS Reserved Instances or Savings Plans?

### 8. Security & Compliance
**Q8.1**: Compliance requirements:
- HIPAA compliance required? (We assume yes for mental health data)
- Any other compliance frameworks? (SOC 2, ISO 27001, etc.)
- Data residency requirements? (Must data stay in US?)

**Q8.2**: Security policies:
- MFA required for all users or optional?
- Password policy requirements?
- Session timeout preferences?
- IP whitelisting needed?

**Q8.3**: Data retention:
- How long should we keep conversation logs?
- Any data deletion requirements?
- Backup retention period?

### 9. Testing & Launch
**Q9.1**: Beta testing:
- How many beta testers available?
- Which instructors/staff can participate?
- Timeline for beta testing?

**Q9.2**: Launch plan:
- Soft launch date target: ____________
- Full launch date target: ____________
- Rollout strategy: (gradual vs all-at-once)
- Communications plan for users?

### 10. Team & Resources
**Q10.1**: Your internal team:
- Product owner/sponsor: ____________
- Technical point of contact: ____________
- Content manager (for knowledge base): ____________
- Training coordinator (for user onboarding): ____________

**Q10.2**: Your availability:
- Weekly sync meeting time preference?
- Response time expectations?
- Escalation contacts for urgent issues?

---

## 🟢 MEDIUM PRIORITY QUESTIONS (Can be answered later)

### 11. Instructor Pain Points
**Q11.1**: Top 5 most common questions from instructors:
1. ________________________________
2. ________________________________
3. ________________________________
4. ________________________________
5. ________________________________

**Q11.2**: Top 5 most common questions from staff:
1. ________________________________
2. ________________________________
3. ________________________________
4. ________________________________
5. ________________________________

### 12. Analytics Requirements
**Q12.1**: What specific metrics do you want to track?
- User engagement metrics
- Content effectiveness
- Instructor satisfaction
- Support ticket reduction
- Other KPIs?

**Q12.2**: Reporting frequency:
- Daily dashboard?
- Weekly reports?
- Monthly executive summaries?
- Quarterly reviews?

### 13. Microsoft Dynamics 365 (Phase 2)
**Q13.1**: Dynamics 365 setup:
- Which Dynamics modules are you using?
  - Sales
  - Customer Service
  - Marketing
  - Other?
- API access available?
- Data we need to sync:
  - Contact information
  - Leads
  - Opportunities
  - Other entities?

**Q13.2**: Priority for Dynamics integration:
- Must-have for MVP?
- Can wait for Phase 2?
- Timeline preference?

### 14. Learner-Facing Features (Phase 2)
**Q14.1**: When do you want to roll out learner features?
- Immediately after MVP?
- 3-6 months after launch?
- No specific timeline yet?

**Q14.2**: What should learners be able to do?
- Find courses
- Register for training
- Track progress
- Ask questions about content
- Other?

### 15. Multi-language Support
**Q15.1**: Beyond English and Spanish:
- Any other languages needed in the future?
- Priority order?
- Timeline?

**Q15.2**: Translation approach:
- Professional human translation preferred?
- Machine translation acceptable?
- Mix of both?

---

## 💡 RECOMMENDATIONS & CLARIFICATIONS

### Architecture Decisions

**Decision 1: OpenSearch vs Amazon Kendra**
- **Recommendation**: Start with OpenSearch
- **Rationale**:
  - Cost: $100/month vs $810/month
  - Flexibility: More control over search
  - Sufficient for MVP
- **Question**: Do you agree, or prefer Kendra for fully-managed solution?

**Decision 2: DynamoDB vs RDS**
- **Recommendation**: Use DynamoDB (NoSQL)
- **Rationale**:
  - Serverless, auto-scaling
  - Fast and cost-effective
  - Simple data model sufficient
- **Question**: Any reason you'd prefer a relational database (PostgreSQL/MySQL)?

**Decision 3: Deployment Regions**
- **Recommendation**: US East (N. Virginia) - us-east-1
- **Rationale**:
  - Lowest latency for US users
  - All AWS services available
  - Cost-effective
- **Question**: Any preference for specific AWS region?

**Decision 4: Development Approach**
- **Recommendation**: Phased MVP approach (12 weeks)
- **Alternative**: We could build a proof-of-concept (POC) first (4 weeks) to validate AI quality
- **Question**: Would you like a POC before full MVP, or proceed directly to MVP?

---

## 📋 ACTION ITEMS FOR CUSTOMER

### Immediate (Before Project Start)
- [ ] Review and approve [REQUIREMENTS.md](REQUIREMENTS.md)
- [ ] Review and approve [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
- [ ] Review and approve [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)
- [ ] Grant access to knowledge base documents
- [ ] Provide AWS account details
- [ ] Provide Zendesk API credentials
- [ ] Provide branding guidelines
- [ ] Approve budget for AWS costs

### Week 1
- [ ] Assign internal team members (product owner, technical POC)
- [ ] Schedule kickoff meeting
- [ ] Set up communication channels (Slack, email)
- [ ] Identify beta testers
- [ ] Provide LMS details and API documentation

### Week 2-3
- [ ] Review initial infrastructure setup
- [ ] Review frontend mockups
- [ ] Provide feedback on AI prompts and responses
- [ ] Prioritize knowledge base document indexing

---

## 🤔 ASSUMPTIONS WE'RE MAKING

Please confirm or correct these assumptions:

1. **Users have email addresses** for authentication
2. **Most users are in the United States** (for latency optimization)
3. **Instructors access the system via desktop/laptop** primarily (not mobile-first)
4. **Knowledge base documents are in English** (Spanish translations needed)
5. **You have rights to use all knowledge base content** for AI training
6. **Zendesk is your primary support system** (no other ticketing systems)
7. **You want to start with AWS Cognito** (not SSO via Microsoft/Google)
8. **Conversations can be stored for 90 days** before archiving
9. **Admin users can view all conversations** (privacy policy allows)
10. **You're comfortable with Bedrock's data handling** (AWS doesn't train on your data)

---

## 📞 Next Steps

1. **Review this document** and answer the critical questions (🔴)
2. **Schedule a kickoff call** to discuss:
   - Requirements clarifications
   - Timeline alignment
   - Team introductions
   - Access and credentials
3. **Approve project documentation**:
   - Requirements
   - Architecture
   - Roadmap
   - Budget

---

## 📧 Contact

Please send answers to these questions and any additional information to:

**Development Team**: [Insert your contact email]

We're excited to build Learning Navigator with you! 🚀

---

**Document Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Awaiting Customer Response
