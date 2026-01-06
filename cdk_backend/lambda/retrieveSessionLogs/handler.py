import os
import json
from datetime import datetime, timedelta
from collections import defaultdict

import boto3
from boto3.dynamodb.conditions import Attr

# ──────────────────────────────────────────────────────────────────────────────
#  Env & AWS clients
# ──────────────────────────────────────────────────────────────────────────────
TABLE_NAME = os.environ["DYNAMODB_TABLE"]
ddb   = boto3.resource("dynamodb")
table = ddb.Table(TABLE_NAME)

# ──────────────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────────────
def log(*msg):
    print("[ANALYTICS]", *msg)


def bad_request(msg):
    return {
        "statusCode": 400,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({"error": msg}),
    }


def ok(body_dict):
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict),
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Lambda entry-point
# ──────────────────────────────────────────────────────────────────────────────
def lambda_handler(event, context):
    log("=== NEW INVOCATION ============================================")
    log("Raw queryStringParameters :", event.get("queryStringParameters"))

    # 1) Parse timeframe
    params = event.get("queryStringParameters") or {}
    tf = (params.get("timeframe") or "today").lower()

    now = datetime.utcnow()
    if tf == "today":
        start = datetime(now.year, now.month, now.day)
    elif tf == "weekly":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif tf == "monthly":
        start = datetime(now.year, now.month, 1)
    elif tf == "yearly":
        start = datetime(now.year, 1, 1)
    else:
        return bad_request(f'Invalid timeframe "{tf}"')

    end = now
    log("Timeframe                 :", tf)
    log("Start / End UTC           :", start, "/", end)

    # 2) Build filter & projection
    start_iso, end_iso = start.isoformat(), end.isoformat()
    filter_exp = Attr("original_ts").between(start_iso, end_iso)
    projection = "session_id, #loc, category, sentiment, satisfaction_score, #q, #r, original_ts"
    expr_names = { "#loc": "location", "#q": "query", "#r": "response" }

    # 3) Scan in pages
    items = []
    resp = table.scan(
        FilterExpression=filter_exp,
        ProjectionExpression=projection,
        ExpressionAttributeNames=expr_names,
    )
    items.extend(resp.get("Items", []))
    log("Page 1 items              :", len(resp.get("Items", [])))

    while "LastEvaluatedKey" in resp:
        resp = table.scan(
            FilterExpression=filter_exp,
            ProjectionExpression=projection,
            ExpressionAttributeNames=expr_names,
            ExclusiveStartKey=resp["LastEvaluatedKey"],
        )
        log("…Next page items          :", len(resp.get("Items", [])))
        items.extend(resp.get("Items", []))

    log("TOTAL items scanned       :", len(items))

    # 4) Aggregate
    sessions = set()
    loc_counts = defaultdict(int)
    cat_counts = defaultdict(int)
    sentiment_counts = defaultdict(int)
    satisfaction_scores = []
    conversations = []

    for it in items:
        if sid := it.get("session_id"):
            sessions.add(sid)
        if loc := it.get("location"):
            if isinstance(loc, str) and loc:  # Only count valid location strings
                loc_counts[loc] += 1
        if cat := it.get("category"):
            cat_counts[cat] += 1
        if sent := it.get("sentiment"):
            sentiment_counts[sent] += 1
        if score := it.get("satisfaction_score"):
            satisfaction_scores.append(float(score))

        # Build conversation log entry
        conversations.append({
            "session_id": it.get("session_id"),
            "timestamp": it.get("original_ts"),
            "query": it.get("query", ""),
            "response": it.get("response", ""),
            "category": it.get("category", "Unknown"),
            "sentiment": it.get("sentiment", "neutral"),
            "satisfaction_score": float(it.get("satisfaction_score", 50))
        })

    # Calculate average satisfaction
    avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0

    # Sort conversations by timestamp (most recent first)
    conversations.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    result = {
        "timeframe":  tf,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date":   end.strftime("%Y-%m-%d"),
        "user_count": len(sessions),
        "locations":  list(loc_counts.keys()),
        "categories": dict(cat_counts),
        "sentiment": dict(sentiment_counts),
        "avg_satisfaction": round(avg_satisfaction, 1),
        "conversations": conversations[:50]  # Return latest 50 conversations
    }

    log("Distinct sessions         :", len(sessions))
    log("Distinct locations        :", len(loc_counts))
    log("Distinct categories       :", len(cat_counts))
    log("Returning 200")
    return ok(result)
