# Admin Dashboard - Real-Time Features

## Overview
The admin dashboard provides real-time monitoring of the Learning Navigator chatbot with three essential features:

1. **Basic Analytics** - Key metrics and counts
2. **Conversation Logs** - Detailed chat history with expandable view
3. **Sentiment Analysis** - User satisfaction tracking

## Access

**URL:** https://main.d1disyogbqgwn4.amplifyapp.com/admin

### Login Credentials
Use your Cognito admin credentials to access the admin portal.

## Features

### 1. Basic Analytics (Real-Time)

Displays today's key metrics:

- **Total Users** - Number of unique sessions today
- **Positive Sentiment** - Count of positive interactions
- **Neutral Sentiment** - Count of neutral interactions
- **Negative Sentiment** - Count of negative interactions
- **Average Satisfaction Score** - Overall satisfaction (0-100)

**Refresh Rate:** Auto-refreshes every 30 seconds

### 2. Conversation Logs

Interactive table showing recent conversations with:

**Columns:**
- Session ID (first 8 characters)
- Timestamp (when the conversation occurred)
- Category (e.g., "Training & Courses", "Instructor Certification")
- Sentiment (positive/neutral/negative with color-coded chips)
- Satisfaction Score (0-100)
- Expand button to view full details

**Expandable Details:**
- Full user query
- Complete bot response
- All metadata

**Features:**
- Shows latest 50 conversations
- Click any row to expand and view full Q&A
- Color-coded sentiment chips:
  - 🟢 Green = Positive
  - 🟡 Yellow = Neutral
  - 🔴 Red = Negative

### 3. Sentiment Analysis

Visual breakdown of user sentiment:

- **Card-based display** with sentiment counts
- **Real-time updates** from conversation data
- **Color-coded cards:**
  - Positive (Green gradient)
  - Neutral (Yellow gradient)
  - Negative (Red gradient)

## Backend API

### Endpoint
```
GET /session-logs?timeframe=today
```

### Parameters
- `timeframe`: today | weekly | monthly | yearly

### Response Format
```json
{
  "timeframe": "today",
  "start_date": "2026-01-02",
  "end_date": "2026-01-02",
  "user_count": 15,
  "sentiment": {
    "positive": 10,
    "neutral": 3,
    "negative": 2
  },
  "avg_satisfaction": 75.5,
  "conversations": [
    {
      "session_id": "abc123...",
      "timestamp": "2026-01-02T21:30:00Z",
      "query": "What is MHFA?",
      "response": "Mental Health First Aid (MHFA) is...",
      "category": "Training & Courses",
      "sentiment": "positive",
      "satisfaction_score": 85
    }
  ]
}
```

## Data Flow

### 1. Conversation Logging
```
User Query → WebSocket → cfEvaluator Lambda → Bedrock Agent
     ↓
Response ← WebSocket ← cfEvaluator Lambda ← Bedrock Agent
     ↓
Log Classifier Lambda → Analyzes sentiment & category
     ↓
DynamoDB (SessionLogs table) → Stores structured data
```

### 2. Admin Dashboard Retrieval
```
Admin Dashboard → GET /session-logs → retrieveSessionLogs Lambda
     ↓
DynamoDB Scan (filtered by timeframe)
     ↓
Aggregated Analytics + Conversation List
     ↓
Admin Dashboard Display
```

## Lambda Functions

### retrieveSessionLogs Lambda
**File:** `cdk_backend/lambda/retrieveSessionLogs/handler.py`

**Responsibilities:**
- Scan DynamoDB for conversations in timeframe
- Aggregate sentiment counts
- Calculate average satisfaction
- Return formatted analytics

**Environment Variables:**
- `DYNAMODB_TABLE`: SessionLogs table name

### logclassifier Lambda
**File:** `cdk_backend/lambda/logclassifier/handler.py`

**Responsibilities:**
- Classify conversation category
- Analyze sentiment (positive/neutral/negative)
- Calculate satisfaction score
- Store enriched data in DynamoDB

## DynamoDB Schema

### Table: SessionLogs

**Keys:**
- `date` (Partition Key)
- `session_id` (Sort Key)

**Attributes:**
- `original_ts`: ISO timestamp
- `query`: User question
- `response`: Bot answer
- `category`: Classification (e.g., "Training & Courses")
- `sentiment`: positive | neutral | negative
- `satisfaction_score`: Number (0-100)
- `location`: User location (if available)

## Testing the Admin Dashboard

### 1. Generate Test Data

Have some conversations in the chatbot:

```
# Test Query 1
"What is Mental Health First Aid?"

# Test Query 2
"How do I become a certified instructor?"

# Test Query 3 (Spanish)
"¿Cuáles son los cursos de capacitación disponibles?"
```

### 2. View Admin Dashboard

1. Navigate to https://main.d1disyogbqgwn4.amplifyapp.com/admin
2. Login with admin credentials
3. View dashboard at `/admin-dashboard`

### 3. Verify Features

**Check Basic Analytics:**
- User count should match number of unique sessions
- Sentiment counts should be > 0
- Average score should be between 0-100

**Check Conversation Logs:**
- Table should show recent conversations
- Click expand icon to view full Q&A
- Verify timestamps are recent
- Check sentiment chips match conversation tone

**Check Real-Time Updates:**
- Have a conversation in another tab
- Wait 30 seconds for auto-refresh
- New conversation should appear in logs

## API Gateway Routes

The admin features use these routes:

```
GET  /session-logs?timeframe=today
└─> retrieveSessionLogs Lambda
    └─> Returns aggregated analytics

POST /session-logs (internal)
└─> sessionLogs Lambda
    └─> Stores conversation data
```

## Security

- All admin endpoints protected by Cognito authorizer
- Only users in the admin group can access
- JWT token required in Authorization header

## Monitoring

### CloudWatch Logs

**Log Groups:**
- `/aws/lambda/retrieveSessionLogs`
- `/aws/lambda/logclassifier`
- `/aws/lambda/cfEvaluator`

**Useful Queries:**
```
# Check sentiment analysis
fields @timestamp, sentiment, satisfaction_score
| filter sentiment = "positive"
| stats count() by sentiment

# Check categories
fields @timestamp, category
| stats count() by category

# Check errors
fields @message
| filter @message like /ERROR/
```

### Metrics to Monitor

- **Lambda Invocations:** retrieveSessionLogs, logclassifier
- **DynamoDB Operations:** Scan operations on SessionLogs table
- **API Gateway:** Request count, 4xx/5xx errors
- **Response Times:** Lambda duration, API latency

## Troubleshooting

### No Data Showing

**Cause:** No conversations logged yet
**Solution:** Have some test conversations in the chatbot

### Old Data Showing

**Cause:** Auto-refresh not working
**Solution:** Manually refresh the page (Cmd+R / Ctrl+R)

### Missing Sentiment Data

**Cause:** logclassifier Lambda not running
**Solution:** Check CloudWatch logs for errors

### High Response Times

**Cause:** DynamoDB scan on large dataset
**Solution:**
- Consider adding GSI for timeframe queries
- Implement pagination for conversation logs
- Cache frequent queries

## Future Enhancements

Potential additions (not currently implemented):

1. **Time Range Selector** - View data for different timeframes
2. **Export to CSV** - Download conversation logs
3. **Advanced Filters** - Filter by category, sentiment, score range
4. **Trend Charts** - Visualize sentiment over time
5. **Alert System** - Notify on negative sentiment spikes
6. **Search Functionality** - Search conversations by keyword

## Summary

The simplified admin dashboard provides essential real-time monitoring with:

✅ **Real-time metrics** - Updates every 30 seconds
✅ **Detailed conversation logs** - Expandable table with full Q&A
✅ **Sentiment tracking** - Visual sentiment breakdown
✅ **Clean, focused UI** - Only essential features
✅ **Mobile responsive** - Works on all screen sizes
✅ **Secure access** - Cognito authentication required

All data is live from DynamoDB with automatic refresh for real-time monitoring.
