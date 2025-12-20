"""
Health Check Lambda Function

Simple Lambda to verify API is running.
Returns 200 OK with system information.

This is the simplest Lambda - good for testing deployment.
"""

import json
import os
from datetime import datetime


def handler(event, context):
    """
    Lambda handler for health check endpoint.

    Args:
        event: API Gateway event object
        context: Lambda context object

    Returns:
        dict: API Gateway response with status and health info
    """

    # Get environment info
    region = os.environ.get('AWS_REGION', 'unknown')
    function_name = context.function_name if context else 'unknown'

    # Build response
    response_body = {
        'status': 'healthy',
        'service': 'Learning Navigator API',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'region': region,
        'function': function_name,
        'version': '1.0.0'
    }

    # Return API Gateway response
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # CORS - will restrict later
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps(response_body)
    }
