import os
import json
from datetime import datetime, timedelta
import boto3
from boto3.dynamodb.conditions import Key, Attr

# ──────────────────────────────────────────────────────────────────────────────
#  Env & AWS clients
# ──────────────────────────────────────────────────────────────────────────────
TABLE_NAME = os.environ["ESCALATED_QUERIES_TABLE"]
ddb = boto3.resource("dynamodb")
table = ddb.Table(TABLE_NAME)

# ──────────────────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────────────────
def log(*msg):
    print("[ESCALATED-QUERIES]", *msg)


def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body),
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Lambda entry-point
# ──────────────────────────────────────────────────────────────────────────────
def lambda_handler(event, context):
    log("=== NEW INVOCATION ============================================")
    log("Event:", json.dumps(event, default=str))

    # Handle OPTIONS for CORS
    http_method = event.get("httpMethod") or event["requestContext"]["http"]["method"]
    if http_method == "OPTIONS":
        return cors_response(200, {"message": "OK"})

    # Parse query parameters
    params = event.get("queryStringParameters") or {}
    status_filter = params.get("status")  # pending, in_progress, resolved
    limit = int(params.get("limit", 50))

    # Get path parameters for single query lookup
    path_params = event.get("pathParameters") or {}
    query_id = path_params.get("queryId")

    try:
        # Single query lookup
        if query_id:
            log(f"Fetching single query: {query_id}")
            response = table.query(
                KeyConditionExpression=Key("query_id").eq(query_id)
            )
            items = response.get("Items", [])
            if not items:
                return cors_response(404, {"error": "Query not found"})
            return cors_response(200, items[0])

        # List queries with optional status filter
        if status_filter:
            log(f"Querying by status: {status_filter}")
            response = table.query(
                IndexName="StatusIndex",
                KeyConditionExpression=Key("status").eq(status_filter),
                ScanIndexForward=False,  # Most recent first
                Limit=limit
            )
        else:
            log("Scanning all queries")
            response = table.scan(Limit=limit)

        items = response.get("Items", [])

        # Sort by timestamp descending
        items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        # Calculate some summary stats
        total = len(items)
        pending_count = sum(1 for item in items if item.get("status") == "pending")
        in_progress_count = sum(1 for item in items if item.get("status") == "in_progress")
        resolved_count = sum(1 for item in items if item.get("status") == "resolved")

        return cors_response(200, {
            "queries": items[:limit],
            "total": total,
            "summary": {
                "pending": pending_count,
                "in_progress": in_progress_count,
                "resolved": resolved_count
            }
        })

    except Exception as e:
        log("ERROR:", str(e))
        return cors_response(500, {"error": str(e)})


def update_query_status(event, context):
    """
    Update the status of an escalated query
    """
    log("=== UPDATE STATUS ============================================")

    try:
        body = json.loads(event.get("body", "{}"))
        query_id = body.get("query_id")
        new_status = body.get("status")  # pending, in_progress, resolved
        admin_notes = body.get("admin_notes", "")

        if not query_id or not new_status:
            return cors_response(400, {"error": "query_id and status are required"})

        if new_status not in ["pending", "in_progress", "resolved"]:
            return cors_response(400, {"error": "Invalid status"})

        # Update the item
        table.update_item(
            Key={"query_id": query_id, "timestamp": body.get("timestamp")},
            UpdateExpression="SET #status = :status, admin_notes = :notes, updated_at = :updated",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": new_status,
                ":notes": admin_notes,
                ":updated": datetime.utcnow().isoformat() + "Z"
            }
        )

        return cors_response(200, {"message": "Status updated successfully"})

    except Exception as e:
        log("ERROR:", str(e))
        return cors_response(500, {"error": str(e)})
