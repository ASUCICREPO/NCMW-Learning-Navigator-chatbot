# How Sentiment Analysis Works

## Overview

Your system uses **AI-powered sentiment analysis** through Amazon Bedrock (Claude) to automatically analyze every conversation and determine:
1. **Sentiment:** positive, neutral, or negative
2. **Satisfaction Score:** 0-100
3. **Reason:** Brief explanation

## The Analysis Process

### Step-by-Step Flow

```
User asks question → Bot responds → logclassifier Lambda triggered
                                           ↓
                          Amazon Bedrock (Claude Nova Lite) analyzes:
                          - User's question
                          - Bot's response
                          - Overall conversation quality
                                           ↓
                          Returns: { sentiment, score, reason }
                                           ↓
                          Stored in DynamoDB → Displayed in Admin Dashboard
```

## How It Determines Sentiment

### The AI Prompt

The system sends this prompt to Amazon Bedrock:

```
Analyze the sentiment of this chatbot conversation and determine user satisfaction.

User Question: [user's question]
Bot Response: [bot's answer]

Determine:
1. Overall Sentiment: positive, neutral, or negative
2. Satisfaction Score: 0-100 (0=very dissatisfied, 100=very satisfied)
3. Brief Reason (one sentence)

Respond in this exact JSON format:
{"sentiment": "positive", "score": 85, "reason": "User received helpful answer"}
```

### What the AI Considers

The AI model (Amazon Nova Lite) analyzes multiple factors:

#### 1. **Response Relevance**
- Did the bot understand the question?
- Was the answer relevant and helpful?
- Did it address the user's actual need?

**Example:**
```
❓ Question: "How do I become an MHFA instructor?"
✅ Good Response: "To become a certified MHFA instructor, you need to..."
   → Sentiment: POSITIVE (relevant, helpful)

❌ Poor Response: "I don't have information about that."
   → Sentiment: NEGATIVE (not helpful)
```

#### 2. **Response Completeness**
- Did the bot provide a complete answer?
- Were all parts of the question addressed?
- Was the information sufficient?

**Example:**
```
❓ Question: "What are the requirements and how long does certification take?"
✅ Complete: "Requirements are: 1) X, 2) Y. Certification takes 8 hours..."
   → Sentiment: POSITIVE (thorough)

⚠️ Partial: "You need to complete training."
   → Sentiment: NEUTRAL (incomplete)
```

#### 3. **Response Quality**
- Is the information accurate and detailed?
- Is the tone appropriate?
- Does it provide actionable guidance?

**Example:**
```
❓ Question: "Where can I find course materials?"
✅ Quality: "Course materials are available in MHFA Connect at..."
   → Sentiment: POSITIVE (specific, actionable)

⚠️ Vague: "You can find materials on the website."
   → Sentiment: NEUTRAL (not specific enough)
```

#### 4. **Conversation Tone**
- Does the response match the user's needs?
- Is it clear and easy to understand?
- Does it acknowledge the user's concern?

**Example:**
```
❓ Question: "I'm confused about recertification requirements"
✅ Empathetic: "I understand recertification can be confusing. Let me clarify..."
   → Sentiment: POSITIVE (acknowledges concern)

⚠️ Generic: "Recertification requirements are..."
   → Sentiment: NEUTRAL (functional but not empathetic)
```

## Sentiment Categories

### ✅ POSITIVE (Green)
**When assigned:**
- Bot provided helpful, relevant answer
- Question was fully understood and addressed
- User likely got what they needed
- Clear, actionable information provided

**Example Scenarios:**
```
Q: "What is MHFA?"
A: "Mental Health First Aid (MHFA) is an evidence-based training program..."
→ Sentiment: POSITIVE
→ Score: 85-95
→ Reason: "Comprehensive answer to basic question"

Q: "How do I register for a course?"
A: "To register: 1) Visit MHFA Connect, 2) Create account, 3) Browse courses..."
→ Sentiment: POSITIVE
→ Score: 90-100
→ Reason: "Clear step-by-step instructions provided"
```

### ⚠️ NEUTRAL (Yellow)
**When assigned:**
- Bot provided some information but not complete
- Answer was generic or vague
- Question partially addressed
- Functional response but not ideal

**Example Scenarios:**
```
Q: "What are the advanced certification options?"
A: "There are several advanced certifications available..."
→ Sentiment: NEUTRAL
→ Score: 50-60
→ Reason: "Acknowledged question but lacked specifics"

Q: "How much does training cost?"
A: "Training costs vary by location and course type."
→ Sentiment: NEUTRAL
→ Score: 40-55
→ Reason: "True but not actionable information"
```

### ❌ NEGATIVE (Red)
**When assigned:**
- Bot didn't understand the question
- Answer was irrelevant or unhelpful
- Bot couldn't provide needed information
- User likely frustrated or unsatisfied

**Example Scenarios:**
```
Q: "How do I contact support?"
A: "I don't have information about that."
→ Sentiment: NEGATIVE
→ Score: 10-25
→ Reason: "Failed to provide basic information"

Q: "What's the instructor certification process?"
A: "Mental Health First Aid offers various courses..."
→ Sentiment: NEGATIVE
→ Score: 20-30
→ Reason: "Response didn't address the specific question"
```

## Satisfaction Score (0-100)

### Score Ranges

| Score Range | Meaning | User Experience |
|-------------|---------|-----------------|
| 90-100 | Excellent | User got exactly what they needed, clearly and completely |
| 75-89 | Good | Helpful answer, minor improvements possible |
| 60-74 | Acceptable | Answer provided but could be better |
| 40-59 | Below Average | Partial answer, user may need to ask again |
| 20-39 | Poor | Not helpful, user likely frustrated |
| 0-19 | Very Poor | Bot failed to help at all |

### Score Calculation Factors

The AI considers:

1. **Relevance** (30%)
   - How well does the answer match the question?

2. **Completeness** (30%)
   - Did it cover all aspects of the question?

3. **Clarity** (20%)
   - Was the answer easy to understand?

4. **Actionability** (20%)
   - Can the user take action based on this answer?

## Real Examples from Your System

### Example 1: Excellent Interaction
```json
{
  "query": "What is Mental Health First Aid?",
  "response": "Mental Health First Aid (MHFA) is an evidence-based training program that teaches you how to identify, understand, and respond to signs of mental illness and substance use disorders. The training gives you the skills to reach out and provide initial help and support to someone who may be developing a mental health or substance use problem or experiencing a crisis...",
  "sentiment": "positive",
  "satisfaction_score": 92,
  "reason": "Comprehensive, educational answer with actionable information"
}
```

### Example 2: Neutral Interaction
```json
{
  "query": "Where can I find instructor resources?",
  "response": "Instructor resources are available through MHFA Connect platform.",
  "sentiment": "neutral",
  "satisfaction_score": 55,
  "reason": "Correct but lacks specific details about access or what's available"
}
```

### Example 3: Negative Interaction
```json
{
  "query": "How do I reset my password?",
  "response": "I'm not sure about that. Can you provide more details?",
  "sentiment": "negative",
  "satisfaction_score": 25,
  "reason": "Failed to provide help with basic technical question"
}
```

## Code Implementation

### File: `lambda/logclassifier/handler.py`

**Function: `analyze_sentiment(question, response)`**

```python
def analyze_sentiment(question: str, response: str) -> dict:
    """
    Analyze sentiment using Amazon Bedrock (Claude)

    Args:
        question: User's question
        response: Bot's response

    Returns:
        {
            "sentiment": "positive|neutral|negative",
            "score": 0-100,
            "reason": "Brief explanation"
        }
    """
    # Send to Bedrock for AI analysis
    # Model: us.amazon.nova-lite-v1:0
    # Temperature: 0.1 (consistent results)
```

**Key Points:**
- Uses Amazon Nova Lite model (fast, cost-effective)
- Temperature 0.1 (low = more consistent)
- Max 128 tokens (concise response)
- Fallback: neutral/50 if analysis fails

## Admin Dashboard Display

### How Counts Are Calculated

```python
# In retrieveSessionLogs Lambda
sentiment_counts = defaultdict(int)

for conversation in all_conversations:
    sentiment = conversation.get("sentiment")
    sentiment_counts[sentiment] += 1

# Result:
{
    "positive": 10,   # Count of positive conversations
    "neutral": 3,     # Count of neutral conversations
    "negative": 2     # Count of negative conversations
}
```

### Average Satisfaction Score

```python
satisfaction_scores = []

for conversation in all_conversations:
    score = conversation.get("satisfaction_score")
    if score:
        satisfaction_scores.append(float(score))

# Calculate average
avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores)
# Result: 75.5 (out of 100)
```

## Improving Sentiment Scores

### To Get More Positive Sentiment:

1. **Knowledge Base Quality**
   - Add more comprehensive documents
   - Update outdated information
   - Cover common questions thoroughly

2. **Bot Responses**
   - Ensure clear, actionable answers
   - Provide step-by-step instructions
   - Include relevant links/resources

3. **Agent Configuration**
   - Train agent to acknowledge confusion
   - Provide fallback responses
   - Offer to escalate when needed

### Red Flags (Negative Sentiment Triggers):

- ❌ "I don't have information about that"
- ❌ Generic answers that don't address the question
- ❌ Contradictory or confusing information
- ❌ Missing critical details
- ❌ No actionable guidance

## Monitoring & Alerts

### When to Pay Attention:

1. **High Negative Rate** (>20%)
   - Knowledge base gaps
   - Bot understanding issues
   - Need to review specific topics

2. **Low Average Score** (<60)
   - Overall quality concerns
   - May need agent retraining
   - Review common queries

3. **Specific Category Issues**
   - If one category has low scores
   - Focus improvements there

## Testing Sentiment Analysis

### Test Cases:

**Test 1: Should be POSITIVE**
```
Q: "What is Mental Health First Aid?"
Expected: 85-95 score, positive sentiment
```

**Test 2: Should be NEUTRAL**
```
Q: "Tell me about advanced topics"
Expected: 50-60 score, neutral sentiment (vague question)
```

**Test 3: Should be NEGATIVE**
```
Q: "How do I download my certificate?"
A: "I don't know."
Expected: 10-30 score, negative sentiment
```

## Summary

Your sentiment analysis works by:

1. **AI-Powered Analysis** - Amazon Bedrock (Claude Nova Lite) analyzes every conversation
2. **Multiple Factors** - Considers relevance, completeness, clarity, and tone
3. **Automatic Categorization** - Assigns positive/neutral/negative + score 0-100
4. **Real-Time Tracking** - All data stored in DynamoDB and displayed in admin dashboard
5. **No Manual Work** - Fully automated for every conversation

The system is designed to give you objective, AI-driven insights into how well your chatbot is serving users!
