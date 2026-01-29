import os
import json
import uuid
from datetime import datetime
from decimal import Decimal
import boto3

# ─── Configuration ────────────────────────────────────────────────────────────
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']

# ─── AWS Clients ───────────────────────────────────────────────────────────────
ddb   = boto3.resource('dynamodb')
table = ddb.Table(DYNAMODB_TABLE)


def lambda_handler(event, context):
    """
    Logs conversation data to DynamoDB.
    Expects a single-record event with keys:
      session_id, timestamp, query, response, location, [confidence]

    Note: AI sentiment analysis and question classification have been removed.
    The system now relies on manual user feedback (thumbs up/down) for sentiment
    tracking, which provides more accurate user satisfaction data at zero AI cost.
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

    # 4) Build item (sentiment and category fields removed)
    item = {
        "session_id": session_id,   # PK
        "timestamp":  sort_key,      # SK
        "original_ts": iso_ts,
        "query":       question,
        "response":    response_text,
        "location":    location
    }
    if confidence is not None:
        try:
            item["confidence"] = Decimal(str(confidence))
        # amazonq-ignore-next-line
        except:
            pass

    # 5) Write to DynamoDB
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
            "timestamp":  sort_key
        })
    }
