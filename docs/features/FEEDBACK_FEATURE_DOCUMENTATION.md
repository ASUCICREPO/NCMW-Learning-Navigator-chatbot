# Response Feedback Feature Documentation

## Overview
The chatbot now includes a thumbs up/thumbs down feedback feature that allows users to rate bot responses. This helps track user satisfaction and identify areas for improvement.

---

## Features

### User Experience
- **Thumbs Up/Down Buttons**: Appear below every bot response
- **Visual Feedback**: Buttons highlight when clicked with appropriate colors:
  - Thumbs Up: Green highlight
  - Thumbs Down: Red highlight
- **Toggle Functionality**: Users can change their feedback or remove it by clicking again
- **Thank You Message**: Brief acknowledgment appears after feedback is submitted
- **Non-Intrusive**: Feedback submission happens silently without disrupting the chat flow

### Data Collection
- **Message ID**: Unique identifier for each bot response
- **Session ID**: Links feedback to specific chat sessions
- **Feedback Type**: 'positive' or 'negative'
- **Message Preview**: First 200 characters of the response (for context)
- **Timestamp**: When the feedback was submitted

---

## Technical Architecture

### Frontend Components

#### 1. **BotFileCheckReply.jsx** (Updated)
Added feedback UI to bot message component:

**New Props:**
- `messageId`: Unique identifier for the message
- `sessionId`: Current chat session ID
- `onFeedback`: Callback function to handle feedback submission

**UI Elements:**
```javascript
- "Was this helpful?" text label
- Thumbs Up IconButton (green when active)
- Thumbs Down IconButton (red when active)
- "Thank you!" confirmation message
```

**State Management:**
- `feedback`: Current feedback state (null, 'positive', or 'negative')
- `feedbackSubmitting`: Loading state during API call

#### 2. **ChatBody.jsx** (Updated)
Integrated feedback handler and passed props to BotFileCheckReply:

**New Imports:**
- `axios` for API calls
- `FEEDBACK_API` constant

**New Function:**
```javascript
const handleFeedback = async (feedbackData) => {
  try {
    await axios.post(FEEDBACK_API, feedbackData);
    console.log('Feedback submitted successfully');
  } catch (error) {
    console.error('Error submitting feedback:', error);
    // Silently fail - don't interrupt user experience
  }
};
```

**Props Passed to BotFileCheckReply:**
- `messageId={msg.id}`
- `sessionId={sessionId}`
- `onFeedback={handleFeedback}`

### Backend Infrastructure

#### 1. **DynamoDB Table: NCMWResponseFeedback**

**Table Structure:**
```javascript
{
  message_id: STRING (HASH KEY),
  timestamp: STRING (RANGE KEY),
  session_id: STRING,
  feedback: STRING ('positive' or 'negative'),
  message_preview: STRING (first 200 chars),
  created_at: STRING (ISO timestamp)
}
```

**Billing Mode:** PAY_PER_REQUEST
**Region:** us-west-2
**ARN:** arn:aws:dynamodb:us-west-2:315895719626:table/NCMWResponseFeedback

#### 2. **Lambda Function: NCMWFeedbackFunction**

**Location:** `/cdk_backend/lambda/feedback/handler.py`

**Runtime:** Python 3.12

**Environment Variables:**
- `FEEDBACK_TABLE`: NCMWResponseFeedback

**Supported Methods:**

##### POST /feedback
Submit or update feedback for a message

**Request Body:**
```json
{
  "messageId": "string",
  "sessionId": "string",
  "feedback": "positive" | "negative" | null,
  "message": "string",
  "timestamp": "ISO 8601 timestamp"
}
```

**Response:**
```json
{
  "message": "Feedback submitted successfully",
  "messageId": "string",
  "feedback": "positive" | "negative"
}
```

##### GET /feedback
Retrieve feedback statistics (for admin dashboard)

**Response:**
```json
{
  "stats": {
    "total": 2,
    "positive": 1,
    "negative": 1,
    "positive_percentage": 50.0,
    "negative_percentage": 50.0
  },
  "recent_feedback": [
    {
      "message_id": "string",
      "session_id": "string",
      "feedback": "positive",
      "message_preview": "string",
      "timestamp": "ISO timestamp",
      "created_at": "ISO timestamp"
    }
  ]
}
```

#### 3. **API Gateway Endpoint**

**Endpoint:** `https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod/feedback`

**Methods:**
- POST: Submit feedback
- GET: Retrieve statistics
- OPTIONS: CORS preflight

**CORS Configuration:**
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Headers: Content-Type, Authorization
- Access-Control-Allow-Methods: GET, POST, OPTIONS

**Integration:** AWS_PROXY with Lambda function

**Permissions:** Public access (no authorization required)

---

## Testing Results

### Test 1: Positive Feedback
```bash
curl -X POST https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "test-msg-001",
    "sessionId": "test-session-001",
    "feedback": "positive",
    "message": "This is a test bot response about MHFA instructor certification requirements."
  }'
```

**Result:** ✅ Success
```json
{
  "message": "Feedback submitted successfully",
  "messageId": "test-msg-001",
  "feedback": "positive"
}
```

### Test 2: Negative Feedback
```bash
curl -X POST https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "test-msg-002",
    "sessionId": "test-session-002",
    "feedback": "negative",
    "message": "This is another test bot response."
  }'
```

**Result:** ✅ Success
```json
{
  "message": "Feedback submitted successfully",
  "messageId": "test-msg-002",
  "feedback": "negative"
}
```

### Test 3: Get Statistics
```bash
curl -X GET https://tuvw7wkl4l.execute-api.us-west-2.amazonaws.com/prod/feedback
```

**Result:** ✅ Success
```json
{
  "stats": {
    "total": 2,
    "positive": 1,
    "negative": 1,
    "positive_percentage": 50.0,
    "negative_percentage": 50.0
  },
  "recent_feedback": [...]
}
```

### Test 4: DynamoDB Data Verification
```bash
aws dynamodb scan --table-name NCMWResponseFeedback --limit 5
```

**Result:** ✅ Success - Both feedback entries stored correctly

### Test 5: Frontend Build
```bash
cd frontend && npm run build
```

**Result:** ✅ Success - Build completed with no errors
**Bundle Size:** 967.35 kB (gzipped) - slight increase of 536B for feedback feature

---

## Usage Guide

### For Users

1. **Providing Feedback:**
   - Read the bot's response
   - Click thumbs up 👍 if the response was helpful
   - Click thumbs down 👎 if the response was unhelpful
   - You'll see a "Thank you!" message confirming your feedback

2. **Changing Feedback:**
   - Click the same thumb again to remove your feedback
   - Click the opposite thumb to change your feedback

3. **When Feedback Appears:**
   - Feedback buttons appear only on bot responses
   - They do not appear on file upload messages
   - They do not appear during "Thinking..." loading states

### For Admins

1. **Viewing Feedback Statistics:**
   ```javascript
   GET /feedback
   ```
   Returns overall satisfaction metrics:
   - Total feedback count
   - Positive/negative counts
   - Percentage breakdowns
   - Recent feedback samples

2. **Analyzing Feedback:**
   - Monitor positive_percentage to track user satisfaction
   - Review recent_feedback for specific messages users liked/disliked
   - Use message_preview to understand context
   - Cross-reference session_id with session logs for full context

3. **Recommended Monitoring:**
   - Track daily positive_percentage trend
   - Target: >70% positive feedback
   - Alert if negative feedback spikes
   - Review negative feedback messages for improvement opportunities

---

## Future Enhancements

### Planned Features

1. **Detailed Feedback Form:**
   - Optional text field for negative feedback
   - Categorize reasons (incorrect info, unhelpful, unclear, etc.)

2. **Admin Dashboard Integration:**
   - Add feedback metrics to AdminDashboardSimple
   - Display feedback trend graph
   - Show most helpful/unhelpful responses
   - Filter by time range

3. **Feedback-Driven Improvements:**
   - Automatically flag messages with negative feedback
   - Integrate with escalated queries system
   - Suggest knowledge base updates based on feedback patterns

4. **Analytics Enhancements:**
   - Track feedback by user role (instructor, learner, staff)
   - Correlate feedback with query categories
   - Measure improvement over time

5. **Email Notifications:**
   - Notify admins of negative feedback spikes
   - Weekly summary reports

---

## Configuration

### Environment Variables

**Frontend (constants.js):**
```javascript
export const FEEDBACK_API = `${DOCUMENTS_API}feedback`;
```

**Backend (Lambda):**
```javascript
FEEDBACK_TABLE=NCMWResponseFeedback
```

### Permissions

**IAM Role:** NCMWEscalatedQueriesLambdaRole

**Policies:**
- AWSLambdaBasicExecutionRole (AWS managed)
- FeedbackDynamoDBPolicy (inline):
  ```json
  {
    "Effect": "Allow",
    "Action": [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ],
    "Resource": [
      "arn:aws:dynamodb:us-west-2:315895719626:table/NCMWResponseFeedback",
      "arn:aws:dynamodb:us-west-2:315895719626:table/NCMWResponseFeedback/*"
    ]
  }
  ```

---

## Troubleshooting

### Issue: Feedback buttons not appearing
**Possible Causes:**
- Message is a file upload (buttons intentionally hidden)
- Message is still loading (buttons appear after response completes)
- messageId prop not passed to BotFileCheckReply

**Solution:** Check that bot responses have unique msg.id values

### Issue: Feedback not submitting
**Possible Causes:**
- Network connectivity issues
- CORS configuration problems
- Lambda function not running

**Debug Steps:**
1. Check browser console for API errors
2. Verify FEEDBACK_API constant points to correct endpoint
3. Test API directly with curl
4. Check Lambda CloudWatch logs

### Issue: Statistics show incorrect counts
**Possible Causes:**
- DynamoDB scan pagination not implemented
- Duplicate entries for same message_id

**Solution:** Implement pagination in GET /feedback endpoint if item count exceeds 100

---

## Code References

### Key Files Modified/Created

1. **Frontend:**
   - [BotFileCheckReply.jsx](frontend/src/Components/BotFileCheckReply.jsx) - Added feedback UI
   - [ChatBody.jsx](frontend/src/Components/ChatBody.jsx) - Integrated feedback handler
   - [constants.js](frontend/src/utilities/constants.js) - Added FEEDBACK_API constant

2. **Backend:**
   - [handler.py](cdk_backend/lambda/feedback/handler.py) - Feedback Lambda function
   - API Gateway: `/feedback` resource with POST, GET, OPTIONS methods

3. **Infrastructure:**
   - DynamoDB: NCMWResponseFeedback table
   - Lambda: NCMWFeedbackFunction
   - IAM: FeedbackDynamoDBPolicy

---

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review feedback statistics
   - Identify patterns in negative feedback
   - Update knowledge base based on feedback

2. **Monthly:**
   - Analyze feedback trends
   - Calculate satisfaction improvement
   - Generate reports for stakeholders

3. **Quarterly:**
   - Review and optimize DynamoDB costs
   - Consider implementing feedback archival strategy
   - Evaluate need for additional feedback features

### Cost Considerations

- **DynamoDB:** PAY_PER_REQUEST billing (~$1.25 per million writes)
- **Lambda:** Free tier covers most usage (~$0.20 per million requests)
- **API Gateway:** ~$3.50 per million requests
- **Expected Monthly Cost:** < $5 for typical usage (1000 conversations/day)

---

**Status:** ✅ Feature Complete and Production Ready
**Last Updated:** January 5, 2026
**Version:** 1.0
