import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('FEEDBACK_TABLE', 'NCMWResponseFeedback')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    """
    Handle feedback submissions for chatbot responses

    Supports POST for creating/updating feedback
    Supports GET for retrieving feedback statistics
    """

    print(f"Received event: {json.dumps(event)}")

    http_method = event.get('httpMethod', '')

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }

    try:
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }

        elif http_method == 'POST':
            return handle_submit_feedback(event, headers)

        elif http_method == 'GET':
            return handle_get_feedback_stats(event, headers)

        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def handle_submit_feedback(event, headers):
    """
    Submit or update feedback for a specific message
    """
    try:
        body = json.loads(event.get('body', '{}'))

        message_id = body.get('messageId')
        session_id = body.get('sessionId')
        feedback = body.get('feedback')  # 'positive', 'negative', or null
        message = body.get('message', '')

        if not message_id or not session_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'messageId and sessionId are required'})
            }

        timestamp = datetime.utcnow().isoformat()

        # If feedback is null, delete the feedback entry
        if feedback is None:
            try:
                table.delete_item(
                    Key={
                        'message_id': message_id,
                        'timestamp': timestamp
                    }
                )
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Feedback removed successfully',
                        'messageId': message_id
                    })
                }
            except Exception as e:
                print(f"Error deleting feedback: {str(e)}")
                # Continue to update/create instead of delete

        # Create or update feedback entry
        item = {
            'message_id': message_id,
            'timestamp': timestamp,
            'session_id': session_id,
            'feedback': feedback,
            'message_preview': message[:200] if message else '',  # Store first 200 chars
            'created_at': timestamp
        }

        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Feedback submitted successfully',
                'messageId': message_id,
                'feedback': feedback
            })
        }

    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to submit feedback: {str(e)}'})
        }

def handle_get_feedback_stats(event, headers):
    """
    Get feedback statistics (for admin dashboard)
    """
    try:
        # Scan the table to get all feedback
        response = table.scan()
        items = response.get('Items', [])

        # Calculate statistics
        positive_count = sum(1 for item in items if item.get('feedback') == 'positive')
        negative_count = sum(1 for item in items if item.get('feedback') == 'negative')
        total_count = len(items)

        stats = {
            'total': total_count,
            'positive': positive_count,
            'negative': negative_count,
            'positive_percentage': round((positive_count / total_count * 100) if total_count > 0 else 0, 1),
            'negative_percentage': round((negative_count / total_count * 100) if total_count > 0 else 0, 1)
        }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'stats': stats,
                'recent_feedback': items[:10]  # Return 10 most recent items
            })
        }

    except Exception as e:
        print(f"Error getting feedback stats: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to get feedback stats: {str(e)}'})
        }
