# Admin Dashboard - Quick Start Guide

## 🚀 Getting Started

### Accessing the Admin Dashboard

1. Navigate to: `https://your-app-url.com/admin`
2. Log in with your admin credentials
3. You'll be redirected to the Admin Dashboard

---

## 📊 Dashboard Overview

The admin dashboard shows **Today's Activity** at a glance:

### Current Statistics (as of test data):
- **Total Users:** Tracked in real-time
- **Sentiment Analysis:**
  - 🟢 Positive: 19 interactions
  - 🟡 Neutral: 13 interactions
  - 🔴 Negative: 1 interaction
- **Average Satisfaction Score:** 74/100
- **Recent Conversations:** 65 logged sessions

### Auto-Refresh
- Dashboard automatically refreshes every **30 seconds**
- Shows real-time updates of user interactions

---

## 🔧 Admin Tools (Navigation Cards)

Click on any card to access the specific admin tool:

### 1. 🔔 Escalated Queries
**Current Status:** 3 queries
- 1 Pending
- 1 In Progress
- 1 Resolved

**What you can do:**
- View all user queries that couldn't be answered by the AI
- Filter by status (Pending, In Progress, Resolved)
- Click "View Details" to see full query information
- Update status and add admin notes
- Track resolution progress

**Workflow:**
```
Pending → In Progress → Resolved
```

### 2. 📄 Manage Documents
**Current Status:** 4 documents in knowledge base

**What you can do:**
- Upload new PDF or Markdown documents
- View existing documents in the knowledge base
- Delete outdated documents
- Trigger knowledge base synchronization
- Monitor document ingestion status

**Supported Formats:**
- PDF files (up to 10 MB)
- Markdown (.md) files

### 3. 💬 Conversation Logs
**Current Status:** 65 conversations logged

**What you can do:**
- View detailed conversation history
- See individual user queries and AI responses
- Analyze conversation quality and user satisfaction
- Identify patterns in user questions
- Export conversation data (coming soon)

**Data Includes:**
- Session ID
- Timestamp
- User query
- AI response
- Sentiment (positive/neutral/negative)
- Satisfaction score

### 4. 📊 Analytics
**What you can do:**
- View detailed usage statistics
- Analyze trends over time
- Track user engagement metrics
- Monitor AI performance
- Generate reports (coming soon)

---

## 🔔 Working with Escalated Queries

### Viewing Queries

1. Click on **"Escalated Queries"** card
2. Use the tabs to filter:
   - **All** - Show all queries
   - **Pending** - New queries needing review
   - **In Progress** - Queries you're working on
   - **Resolved** - Completed queries

### Responding to a Query

1. Click the **👁️ View** icon next to any query
2. Review the query details:
   - User email
   - Original question
   - AI's response (why it couldn't answer)
3. Update the **Status** dropdown:
   - Set to "In Progress" when you start working
   - Set to "Resolved" when completed
4. Add **Admin Notes** to track your actions
5. Click **"Update Status"**

### Best Practices

- ✅ Set status to "In Progress" immediately when you start working
- ✅ Add detailed notes about your resolution
- ✅ Check pending queries at least once per day
- ✅ Respond to users via the email provided
- ✅ Set to "Resolved" only after user confirms satisfaction

---

## 📄 Managing Documents

### Uploading New Documents

1. Click on **"Manage Documents"** card
2. Click **"Upload Document"** or drag & drop
3. Select your PDF or Markdown file
4. Wait for upload to complete
5. Click **"Sync Knowledge Base"** to make it available to the AI

### Important Notes

- 📌 After uploading, always click **"Sync Knowledge Base"**
- 📌 Sync takes 5-10 minutes to complete
- 📌 Users will see new information after sync completes
- 📌 Keep document names descriptive and organized

### When to Upload Documents

- ✅ New MHFA policies or procedures
- ✅ Updated user guides or manuals
- ✅ FAQ documents
- ✅ Training materials
- ✅ Reference documents that users commonly ask about

---

## 💬 Using Conversation Logs

### Finding Specific Conversations

1. Click on **"Conversation Logs"** card
2. Use search/filter options to find specific:
   - Sessions
   - Date ranges
   - User queries
   - Response types

### Analyzing Conversations

**Look for patterns:**
- Frequently asked questions → Consider adding to FAQ
- Low satisfaction scores → Identify knowledge gaps
- Escalated queries → Update knowledge base
- Negative sentiment → Priority for improvement

**Actionable Insights:**
- If many users ask the same question → Add document or update KB
- If satisfaction scores are low → Review AI responses
- If sentiment is negative → Investigate and improve

---

## 📊 Understanding Analytics

### Key Metrics to Monitor

1. **Sentiment Distribution**
   - Target: >70% positive sentiment
   - Action if below: Review negative interactions

2. **Average Satisfaction Score**
   - Target: >80/100
   - Current: 74/100 (good baseline)

3. **Escalation Rate**
   - Monitor: # of escalated queries / total queries
   - Lower is better (means AI is more effective)

4. **User Count**
   - Track growth and engagement trends

---

## 🔐 Security Best Practices

### Access Control
- ✅ Keep your admin credentials secure
- ✅ Log out when not using the dashboard
- ✅ Don't share admin access with unauthorized users

### Data Privacy
- ✅ User queries may contain sensitive information
- ✅ Handle all conversation data with confidentiality
- ✅ Follow HIPAA and data protection guidelines

---

## ⚡ Quick Actions Reference

| Task | Steps |
|------|-------|
| Check pending queries | Dashboard → Escalated Queries → Pending tab |
| Upload new document | Dashboard → Manage Documents → Upload → Sync |
| View today's stats | Dashboard (main page shows real-time data) |
| Find specific conversation | Dashboard → Conversation Logs → Search |
| Update query status | Escalated Queries → View → Update Status |

---

## 🆘 Troubleshooting

### Issue: No data showing on dashboard
**Solution:** Wait 30 seconds for auto-refresh, or refresh your browser

### Issue: Can't upload document
**Solution:**
- Check file size (must be <10 MB)
- Verify file format (PDF or .md only)
- Check internet connection

### Issue: Escalated query not appearing
**Solution:**
- Check "All" tab to see all queries
- Verify query was properly escalated by user
- Check DynamoDB table directly if needed

### Issue: Knowledge base sync not working
**Solution:**
- Wait 5-10 minutes for ingestion to complete
- Check S3 bucket to verify file uploaded
- Check CloudWatch logs for errors

---

## 📞 Support Information

### For Technical Issues
- Check CloudWatch logs for Lambda functions
- Verify API Gateway endpoints are responding
- Review DynamoDB table data

### For Feature Requests
- Document the requested feature
- Consider user impact and priority
- Add to development backlog

---

## 📈 Success Metrics

### Weekly Goals
- ✅ Respond to all pending queries within 24 hours
- ✅ Maintain average satisfaction score >80
- ✅ Keep knowledge base updated with new content
- ✅ Review analytics for improvement opportunities

### Monthly Goals
- ✅ Reduce escalation rate by improving knowledge base
- ✅ Increase positive sentiment percentage
- ✅ Add commonly requested documents to KB
- ✅ Identify and address knowledge gaps

---

## 🎯 Current Test Data Summary

**Escalated Queries:** 3 queries (1 pending, 1 in progress, 1 resolved)
**Session Logs:** 65 conversations logged
**Sentiment:** 19 positive, 13 neutral, 1 negative
**Average Score:** 74/100
**User Profiles:** 3 profiles (1 Instructor, 1 Learner, 1 Staff)
**Documents:** 4 files in knowledge base

**Status:** ✅ All features operational and ready for production use

---

## 🚦 Next Steps

1. ✅ Log in to admin dashboard
2. ✅ Review pending escalated queries
3. ✅ Check today's analytics
4. ✅ Verify knowledge base documents are current
5. ✅ Set up regular check-in schedule

**Recommended Schedule:**
- **Daily:** Check escalated queries (morning)
- **Weekly:** Review analytics and conversation logs
- **Monthly:** Update knowledge base and assess trends

---

*Last Updated: January 5, 2026*
*Version: 1.0*
