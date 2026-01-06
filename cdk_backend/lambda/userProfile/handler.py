"""
User Profile and Personalized Recommendations Lambda Handler

This Lambda function manages user profiles and generates personalized recommendations
based on user roles (Instructor, Staff, Learner).
"""

import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

USER_PROFILE_TABLE = os.environ.get('USER_PROFILE_TABLE')
USER_POOL_ID = os.environ.get('USER_POOL_ID')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Max-Age': '600',
}

# Role-specific recommendations
RECOMMENDATIONS = {
    'instructor': {
        'quick_actions': [
            {
                'title': 'Course Planning',
                'description': 'Access course materials and lesson plans',
                'icon': 'school',
                'queries': [
                    'Show me the latest MHFA course curriculum',
                    'What are best practices for teaching mental health first aid?',
                    'How do I prepare for an upcoming MHFA course?'
                ]
            },
            {
                'title': 'Student Management',
                'description': 'Track student progress and engagement',
                'icon': 'people',
                'queries': [
                    'How do I track student attendance?',
                    'What are the assessment criteria for MHFA certification?',
                    'How can I support struggling learners?'
                ]
            },
            {
                'title': 'Training Resources',
                'description': 'Access instructor guides and materials',
                'icon': 'library_books',
                'queries': [
                    'Show me instructor training resources',
                    'What materials do I need for blended courses?',
                    'Where can I find updated training videos?'
                ]
            },
            {
                'title': 'Certification & Credits',
                'description': 'Manage certifications and continuing education',
                'icon': 'verified',
                'queries': [
                    'How do I maintain my instructor certification?',
                    'What are the requirements for recertification?',
                    'How do I earn CEUs for teaching MHFA?'
                ]
            }
        ],
        'suggested_topics': [
            'Blended Course Delivery',
            'Virtual Training Best Practices',
            'Student Assessment Methods',
            'Crisis Intervention Techniques',
            'Cultural Competency in Training'
        ],
        'recent_updates': [
            'New curriculum updates for Mental Health First Aid USA',
            'Updated assessment rubrics available',
            'Virtual training platform enhancements'
        ]
    },
    'staff': {
        'quick_actions': [
            {
                'title': 'Operations Dashboard',
                'description': 'View training operations and metrics',
                'icon': 'dashboard',
                'queries': [
                    'Show me current course enrollment numbers',
                    'What are the training completion rates?',
                    'How many instructors are active this month?'
                ]
            },
            {
                'title': 'Instructor Support',
                'description': 'Manage instructor requests and issues',
                'icon': 'support_agent',
                'queries': [
                    'How do I onboard new instructors?',
                    'What support resources are available for instructors?',
                    'How do I handle instructor certification renewals?'
                ]
            },
            {
                'title': 'Course Management',
                'description': 'Schedule and coordinate training courses',
                'icon': 'event',
                'queries': [
                    'How do I schedule a new MHFA course?',
                    'What are the requirements for blended courses?',
                    'How do I update course information?'
                ]
            },
            {
                'title': 'Reporting & Analytics',
                'description': 'Access program metrics and insights',
                'icon': 'analytics',
                'queries': [
                    'Show me monthly training statistics',
                    'What are the most popular MHFA courses?',
                    'Generate a report on instructor performance'
                ]
            }
        ],
        'suggested_topics': [
            'Learning Management System',
            'Course Scheduling Procedures',
            'Instructor Credentialing',
            'Program Quality Assurance',
            'Stakeholder Communication'
        ],
        'recent_updates': [
            'New LMS features released',
            'Updated staff training protocols',
            'Improved reporting dashboard'
        ]
    },
    'learner': {
        'quick_actions': [
            {
                'title': 'My Courses',
                'description': 'View enrolled courses and progress',
                'icon': 'school',
                'queries': [
                    'Show me my enrolled MHFA courses',
                    'What is my course completion status?',
                    'How do I access my course materials?'
                ]
            },
            {
                'title': 'Find Training',
                'description': 'Search for available MHFA courses',
                'icon': 'search',
                'queries': [
                    'What MHFA courses are available near me?',
                    'How do I enroll in a Mental Health First Aid course?',
                    'What are the different types of MHFA training?'
                ]
            },
            {
                'title': 'Certification',
                'description': 'Track certification and renewal',
                'icon': 'verified',
                'queries': [
                    'How do I get my MHFA certification?',
                    'When does my certification expire?',
                    'How do I renew my Mental Health First Aid certification?'
                ]
            },
            {
                'title': 'Resources & Support',
                'description': 'Access learning materials and help',
                'icon': 'help',
                'queries': [
                    'Where can I find additional MHFA resources?',
                    'How do I contact my instructor?',
                    'What support is available for learners?'
                ]
            }
        ],
        'suggested_topics': [
            'Course Enrollment Process',
            'Blended Learning Format',
            'Certification Requirements',
            'Mental Health Resources',
            'Community Support Groups'
        ],
        'recent_updates': [
            'New online course modules available',
            'Updated certification process',
            'Mobile app for course access launched'
        ]
    }
}

def lambda_handler(event, context):
    """Main Lambda handler"""
    print(f"[USER_PROFILE] Event: {json.dumps(event)}")

    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    # Handle OPTIONS for CORS
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }

    try:
        # Extract user from authorizer context or JWT
        user_id = extract_user_id(event)

        if '/profile' in path:
            if http_method == 'GET':
                return get_user_profile(user_id)
            elif http_method == 'POST' or http_method == 'PUT':
                return update_user_profile(user_id, event)

        elif '/recommendations' in path:
            if http_method == 'GET':
                return get_recommendations(user_id, event)

        return {
            'statusCode': 404,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Not found'})
        }

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }


def extract_user_id(event):
    """Extract user ID from event"""
    # Try authorizer context first
    authorizer_context = event.get('requestContext', {}).get('authorizer', {})
    principal_id = authorizer_context.get('principalId')

    if principal_id and principal_id != 'guest-user':
        return principal_id

    # For guest users
    if principal_id == 'guest-user':
        return 'guest'

    # Fallback: try to extract from JWT (if custom authorizer passes it)
    claims = authorizer_context.get('claims', {})
    sub = claims.get('sub')
    if sub:
        return sub

    raise Exception('Unable to extract user ID from request')


def get_user_profile(user_id):
    """Get user profile from DynamoDB"""
    try:
        table = dynamodb.Table(USER_PROFILE_TABLE)
        response = table.get_item(Key={'userId': user_id})

        if 'Item' in response:
            profile = response['Item']
            # Convert Decimal to float for JSON serialization
            profile = json.loads(json.dumps(profile, default=decimal_default))
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(profile)
            }
        else:
            # Return default profile
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'userId': user_id,
                    'role': None,
                    'preferences': {},
                    'created_at': datetime.utcnow().isoformat()
                })
            }

    except Exception as e:
        print(f"[ERROR] get_user_profile: {str(e)}")
        raise


def update_user_profile(user_id, event):
    """Update user profile in DynamoDB"""
    try:
        body = json.loads(event.get('body', '{}'))
        role = body.get('role')
        preferences = body.get('preferences', {})

        if not role or role not in ['instructor', 'staff', 'learner']:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Invalid role. Must be: instructor, staff, or learner'})
            }

        table = dynamodb.Table(USER_PROFILE_TABLE)

        item = {
            'userId': user_id,
            'role': role,
            'preferences': preferences,
            'updated_at': datetime.utcnow().isoformat()
        }

        # If this is a new profile, add created_at
        existing = table.get_item(Key={'userId': user_id})
        if 'Item' not in existing:
            item['created_at'] = datetime.utcnow().isoformat()

        table.put_item(Item=item)

        # Also update Cognito user pool profile attribute
        try:
            if user_id != 'guest':
                cognito.admin_update_user_attributes(
                    UserPoolId=USER_POOL_ID,
                    Username=user_id,
                    UserAttributes=[
                        {'Name': 'profile', 'Value': role}
                    ]
                )
        except Exception as cognito_error:
            print(f"[WARNING] Could not update Cognito profile: {cognito_error}")

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Profile updated successfully',
                'profile': item
            })
        }

    except Exception as e:
        print(f"[ERROR] update_user_profile: {str(e)}")
        raise


def get_recommendations(user_id, event):
    """Get personalized recommendations based on user role"""
    try:
        # Get user profile to determine role
        table = dynamodb.Table(USER_PROFILE_TABLE)
        response = table.get_item(Key={'userId': user_id})

        role = None
        if 'Item' in response:
            role = response['Item'].get('role')

        # If no role set, return default recommendations
        if not role:
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'role': None,
                    'message': 'Please set your role to get personalized recommendations',
                    'available_roles': ['instructor', 'staff', 'learner']
                })
            }

        # Get recommendations for the user's role
        recommendations = RECOMMENDATIONS.get(role, {})

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'role': role,
                'recommendations': recommendations
            })
        }

    except Exception as e:
        print(f"[ERROR] get_recommendations: {str(e)}")
        raise


def decimal_default(obj):
    """Helper function to convert Decimal to float"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError
