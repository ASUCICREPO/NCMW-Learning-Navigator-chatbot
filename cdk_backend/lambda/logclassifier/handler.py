import os
import json
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

# ─── Configuration ────────────────────────────────────────────────────────────
DYNAMODB_TABLE   = os.environ['DYNAMODB_TABLE']
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'us.amazon.nova-lite-v1:0')

# ─── AWS Clients ───────────────────────────────────────────────────────────────
ddb      = boto3.resource('dynamodb')
table    = ddb.Table(DYNAMODB_TABLE)
bedrock  = boto3.client('bedrock-runtime')


def classify_question(question: str) -> str:
    """
    Use Bedrock Converse to classify into one category.
    """
    prompt = (
        "Classify this MHFA Learning Ecosystem question into exactly one category:\n\n"
        "[Training & Courses, Instructor Certification, Learner Support, Administrative Procedures, "
        "Course Materials, MHFA Connect Platform, Recertification, Mental Health Resources, "
        "Scheduling & Registration, Policies & Guidelines, Technical Support]\n\n"
        f"Question: {question}\n\n"
        "- Respond ONLY with the category name in quotes (e.g., \"Training & Courses\").\n"
        "- No explanations or additional text.\n"
        "- If it doesn't fit, return \"Unknown\"."
    )
    try:
        resp = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 16, "temperature": 0.0, "topP": 1.0}
        )
        out = resp["output"]["message"]["content"][0]["text"].strip().strip('"')
    except ClientError as e:
        print(f"[classify_question] error: {e}")
        out = "Unknown"

    valid = {
        "Training & Courses","Instructor Certification","Learner Support","Administrative Procedures",
        "Course Materials","MHFA Connect Platform","Recertification","Mental Health Resources",
        "Scheduling & Registration","Policies & Guidelines","Technical Support","Unknown"
    }
    return out if out in valid else "Unknown"


def analyze_sentiment(question: str, response: str) -> dict:
    """
    Analyze sentiment of the conversation to gauge user satisfaction.
    Returns: {sentiment: positive|neutral|negative, score: 0-100, reason: str}
    """
    prompt = (
        "Analyze the sentiment of this chatbot conversation and determine user satisfaction.\n\n"
        f"User Question: {question}\n"
        f"Bot Response: {response}\n\n"
        "Determine:\n"
        "1. Overall Sentiment: positive, neutral, or negative\n"
        "2. Satisfaction Score: 0-100 (0=very dissatisfied, 100=very satisfied)\n"
        "3. Brief Reason (one sentence)\n\n"
        "Respond in this exact JSON format:\n"
        '{"sentiment": "positive", "score": 85, "reason": "User received helpful answer"}'
    )

    try:
        resp = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 128, "temperature": 0.1, "topP": 1.0}
        )
        out = resp["output"]["message"]["content"][0]["text"].strip()

        # Try to parse JSON response
        if "{" in out and "}" in out:
            json_start = out.index("{")
            json_end = out.rindex("}") + 1
            result = json.loads(out[json_start:json_end])

            # Validate sentiment
            if result.get("sentiment") not in ["positive", "neutral", "negative"]:
                result["sentiment"] = "neutral"

            # Validate score
            score = result.get("score", 50)
            result["score"] = max(0, min(100, int(score)))

            return result
        else:
            raise ValueError("No JSON in response")

    except Exception as e:
        print(f"[analyze_sentiment] error: {e}")
        return {
            "sentiment": "neutral",
            "score": 50,
            "reason": "Could not analyze sentiment"
        }


def lambda_handler(event, context):
    """
    Expects a single‐record event with keys:
      session_id, timestamp, query, response, location, [confidence]
    """
    print("Received event:", json.dumps(event))

    # 1) Session ID
    session_id = event.get("session_id") or str(uuid.uuid4())

    # 2) Timestamp + unique suffix for SK
    iso_ts = event.get("timestamp") or datetime.utcnow().isoformat()
    sort_key = f"{iso_ts}#{uuid.uuid4().hex[:8]}"

    # 3) Pull fields
    question      = event.get("query", "")
    response_text = event.get("response", "")
    location      = event.get("location", "")
    confidence    = event.get("confidence", None)

    if not question or not response_text:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing query or response"})
        }

    # 4) Classify category
    category = classify_question(question)

    # 5) Analyze sentiment
    sentiment_result = analyze_sentiment(question, response_text)

    # 6) Build item
    item = {
        "session_id": session_id,   # PK
        "timestamp":  sort_key,     # SK
        "original_ts": iso_ts,
        "query":       question,
        "response":    response_text,
        "location":    location,
        "category":    category,
        "sentiment":   sentiment_result["sentiment"],
        "satisfaction_score": Decimal(str(sentiment_result["score"])),
        "sentiment_reason": sentiment_result["reason"]
    }
    if confidence is not None:
        try:
            item["confidence"] = Decimal(str(confidence))
        # amazonq-ignore-next-line
        except:
            pass

    # 6) Write to DynamoDB
    try:
        # amazonq-ignore-next-line
        table.put_item(Item=item)
    except Exception as e:
        print(f"[lambda_handler] DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Failed to write to DynamoDB"})
        }

    return {
        "statusCode": 200,
        "body": json.dumps({
            "session_id": session_id,
            "timestamp":  sort_key,
            "category":   category,
            "sentiment":  sentiment_result["sentiment"],
            "satisfaction_score": sentiment_result["score"]
        })
    }
