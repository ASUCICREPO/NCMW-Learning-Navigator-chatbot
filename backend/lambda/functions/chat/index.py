"""
Chat Lambda Function - With Bedrock + RAG Integration

Handles chat requests from users using Amazon Bedrock Claude with RAG.

Flow:
1. Validate JWT token (done by API Gateway)
2. Extract user info from token
3. Parse chat message
4. Search OpenSearch for relevant documents (RAG)
5. Query Bedrock Claude 3.5 Sonnet with context
6. Save conversation to DynamoDB
7. Return response with sources
"""

import json
import os
from datetime import datetime
import uuid
import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Optional

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-west-2'))
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-west-2'))

# OpenSearch client (requires Lambda Layer)
try:
    from opensearchpy import OpenSearch, RequestsHttpConnection
    from requests_aws4auth import AWS4Auth
    OPENSEARCH_AVAILABLE = True
except ImportError:
    OPENSEARCH_AVAILABLE = False
    print("WARNING: opensearchpy not available - RAG disabled")

# Environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
OPENSEARCH_ENDPOINT = os.environ.get('OPENSEARCH_ENDPOINT')
OPENSEARCH_INDEX = os.environ.get('OPENSEARCH_INDEX', 'learning-navigator-docs')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
AWS_REGION = os.environ.get('AWS_REGION', 'us-west-2')
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"


def handler(event, context):
    """
    Lambda handler for chat endpoint with RAG.

    Args:
        event: API Gateway event with user message
        context: Lambda context object

    Returns:
        dict: API Gateway response with chat reply and sources
    """

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '')
        conversation_id = body.get('conversation_id')  # Optional: for continuing conversations

        if not user_message:
            return error_response(400, 'Message is required')

        # Extract user info from Cognito authorizer
        # API Gateway includes this after JWT validation
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})

        user_id = claims.get('sub', 'unknown')
        user_email = claims.get('email', 'unknown')
        user_groups_str = claims.get('cognito:groups', '')
        user_groups = user_groups_str.split(',') if user_groups_str else []

        # Generate or use existing conversation ID
        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        print(f"Processing message for user {user_id} in conversation {conversation_id}")

        # RAG: Search for relevant documents
        context_docs = []
        sources = []

        if OPENSEARCH_AVAILABLE and OPENSEARCH_ENDPOINT:
            try:
                context_docs, sources = search_relevant_documents(user_message)
                print(f"Found {len(context_docs)} relevant documents")
            except Exception as e:
                print(f"OpenSearch error (continuing without RAG): {str(e)}")
        else:
            print("OpenSearch not available - using Bedrock without RAG")

        # Query Bedrock Claude with RAG context
        try:
            assistant_message = query_bedrock_with_rag(
                user_message=user_message,
                context_docs=context_docs,
                user_groups=user_groups,
                conversation_id=conversation_id,
                user_id=user_id
            )
        except Exception as e:
            print(f"Bedrock error: {str(e)}")
            # Fallback to mock response if Bedrock fails
            assistant_message = generate_fallback_response(user_message, user_groups)

        # Save conversation to DynamoDB
        try:
            save_to_dynamodb(
                conversation_id=conversation_id,
                user_id=user_id,
                user_message=user_message,
                assistant_message=assistant_message,
                user_email=user_email,
                sources=sources
            )
        except Exception as e:
            print(f"DynamoDB save error: {str(e)}")
            # Continue even if save fails

        # Build response
        response_body = {
            'conversation_id': conversation_id,
            'message': assistant_message,
            'sources': sources,  # Include sources for citations
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'model': BEDROCK_MODEL_ID,
            'rag_enabled': len(context_docs) > 0
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            'body': json.dumps(response_body)
        }

    except Exception as e:
        print(f"Error processing chat request: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(500, 'Internal server error')


def search_relevant_documents(query: str, top_k: int = 5) -> tuple[List[str], List[Dict]]:
    """
    Search OpenSearch for relevant documents using vector similarity.

    Args:
        query: User's search query
        top_k: Number of top results to return

    Returns:
        Tuple of (context_docs, sources)
        - context_docs: List of relevant text chunks
        - sources: List of source metadata for citations
    """
    if not OPENSEARCH_AVAILABLE:
        return [], []

    # Generate query embedding
    query_embedding = generate_embedding(query)

    # Initialize OpenSearch client
    opensearch_client = get_opensearch_client()

    # k-NN search query
    search_body = {
        "size": top_k,
        "query": {
            "knn": {
                "embedding": {
                    "vector": query_embedding,
                    "k": top_k
                }
            }
        },
        "_source": ["text", "source_key", "chunk_id", "source_bucket"]
    }

    try:
        response = opensearch_client.search(
            index=OPENSEARCH_INDEX,
            body=search_body
        )

        context_docs = []
        sources = []

        for hit in response['hits']['hits']:
            source = hit['_source']
            context_docs.append(source['text'])
            sources.append({
                'source': source.get('source_key', 'unknown'),
                'chunk_id': source.get('chunk_id', 0),
                'score': hit['_score']
            })

        return context_docs, sources

    except Exception as e:
        print(f"OpenSearch search error: {str(e)}")
        return [], []


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding using Bedrock Titan.

    Args:
        text: Text to embed

    Returns:
        List of floats representing the embedding vector
    """
    # Truncate text if too long (Titan has 8K token limit)
    if len(text) > 8000:
        text = text[:8000]

    request_body = {
        "inputText": text
    }

    try:
        response = bedrock_runtime.invoke_model(
            modelId=EMBEDDING_MODEL_ID,
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        return response_body.get('embedding', [])
    except Exception as e:
        print(f"Embedding generation error: {str(e)}")
        return []


def get_opensearch_client():
    """
    Create OpenSearch client with IAM authentication.

    Returns:
        OpenSearch client
    """
    # Get AWS credentials for signing requests
    credentials = boto3.Session().get_credentials()
    aws_auth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        AWS_REGION,
        'es',
        session_token=credentials.token
    )

    # Parse endpoint (remove https:// if present)
    host = OPENSEARCH_ENDPOINT.replace('https://', '').replace('http://', '')

    return OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=aws_auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30
    )


def query_bedrock_with_rag(user_message: str, context_docs: List[str], user_groups: list,
                           conversation_id: str, user_id: str) -> str:
    """
    Query Amazon Bedrock Claude 3.5 Sonnet with RAG context.

    Args:
        user_message: User's message
        context_docs: Relevant document chunks from RAG
        user_groups: User's Cognito groups
        conversation_id: Conversation ID
        user_id: User ID

    Returns:
        str: Claude's response

    Raises:
        ClientError: If Bedrock invocation fails
    """

    # Build system prompt based on user role
    system_prompt = build_system_prompt(user_groups, context_docs)

    # Build user message with context
    if context_docs:
        # Include context in user message
        context_text = "\n\n".join([f"Document {i+1}:\n{doc}" for i, doc in enumerate(context_docs)])
        enhanced_message = f"""Based on the following documents from our knowledge base, please answer the user's question.

Documents:
{context_text}

User Question: {user_message}

Please provide a helpful answer based on the documents above. If the documents don't contain relevant information, let the user know and provide general guidance if possible. Always cite which document(s) you're referring to."""
    else:
        enhanced_message = user_message

    # Prepare request body for Claude 3.5 Sonnet
    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
        "temperature": 0.7,
        "top_p": 0.9,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": enhanced_message
            }
        ]
    }

    print(f"Invoking Bedrock model: {BEDROCK_MODEL_ID} with RAG={len(context_docs) > 0}")

    # Invoke Bedrock
    response = bedrock_runtime.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(request_body)
    )

    # Parse response
    response_body = json.loads(response['body'].read())

    # Extract text from Claude's response
    content_blocks = response_body.get('content', [])
    if content_blocks and len(content_blocks) > 0:
        assistant_message = content_blocks[0].get('text', '')
    else:
        assistant_message = "I apologize, but I couldn't generate a response. Please try again."

    print(f"Bedrock response received ({len(assistant_message)} chars)")

    return assistant_message


def build_system_prompt(user_groups: list, context_docs: List[str]) -> str:
    """
    Build role-specific system prompt for Claude with RAG awareness.

    Args:
        user_groups: User's Cognito groups
        context_docs: Relevant document chunks (to adjust prompt)

    Returns:
        str: System prompt tailored to user role and RAG availability
    """

    base_prompt = """You are Learning Navigator, an AI assistant for the Mental Health First Aid (MHFA) program by The National Council for Mental Wellbeing.

Your purpose is to help users by providing accurate information about MHFA courses, resources, and operational guidance.

Guidelines:
- Be helpful, professional, and empathetic
- Provide clear and concise answers
- If you don't know something, say so honestly
- For sensitive topics, recommend contacting support
- Always maintain confidentiality and privacy"""

    # Add RAG-specific guidance if context is available
    if context_docs:
        rag_guidance = """
- When answering, prioritize information from the provided documents
- Cite which document(s) you're referencing (e.g., "According to Document 1...")
- If documents conflict, acknowledge the discrepancy
- If documents are insufficient, say so and provide general guidance"""
        base_prompt += rag_guidance

    # Add role-specific guidance
    if 'instructors' in user_groups:
        role_guidance = """

Your current user is an MHFA Instructor. Focus on:
- Course scheduling and logistics
- Invoicing and payment questions
- Teaching resources and materials
- Certification and recertification information
- Technical support for the learning platform"""

    elif 'staff' in user_groups:
        role_guidance = """

Your current user is Internal Staff. Focus on:
- Operational processes and procedures
- System troubleshooting and support
- Administrative guidance
- Organizational policies
- Interdepartmental coordination"""

    elif 'admins' in user_groups:
        role_guidance = """

Your current user is an Administrator. Focus on:
- System analytics and reporting
- User management and permissions
- Strategic planning support
- Platform configuration
- High-level operational oversight"""

    else:
        role_guidance = """

Your current user is a general user. Provide:
- General MHFA information
- Course availability
- Basic support
- Guidance on getting started"""

    return base_prompt + role_guidance


def generate_fallback_response(message: str, user_groups: list) -> str:
    """
    Generate fallback response if Bedrock fails.

    Args:
        message: User's message
        user_groups: User's Cognito groups

    Returns:
        str: Fallback response
    """

    role = "Instructor" if 'instructors' in user_groups else \
           "Staff Member" if 'staff' in user_groups else \
           "Admin" if 'admins' in user_groups else "there"

    return (
        f"Hello{' ' + role if role != 'there' else ''}! "
        f"I received your message but I'm experiencing technical difficulties connecting to my AI service. "
        f"Please try again in a moment. If the issue persists, contact support."
    )


def save_to_dynamodb(conversation_id: str, user_id: str, user_message: str,
                     assistant_message: str, user_email: str, sources: List[Dict]):
    """
    Save conversation messages to DynamoDB with sources.

    Uses single-table design:
    - PK: CONV#<conversation_id>
    - SK: MSG#<timestamp>

    Args:
        conversation_id: Conversation ID
        user_id: User ID
        user_message: User's message
        assistant_message: Assistant's response
        user_email: User's email
        sources: List of source documents used (for RAG)

    Raises:
        ClientError: If DynamoDB operation fails
    """

    if not TABLE_NAME:
        print("Warning: TABLE_NAME not set, skipping DynamoDB save")
        return

    table = dynamodb.Table(TABLE_NAME)
    timestamp = datetime.utcnow().isoformat() + 'Z'

    # Save user message
    user_message_item = {
        'PK': f'CONV#{conversation_id}',
        'SK': f'MSG#{timestamp}#USER',
        'conversationId': conversation_id,
        'userId': user_id,
        'userEmail': user_email,
        'role': 'user',
        'message': user_message,
        'timestamp': timestamp,
        'GSI1PK': f'USER#{user_id}',
        'GSI1SK': f'CONV#{conversation_id}#{timestamp}',
    }

    table.put_item(Item=user_message_item)
    print(f"Saved user message to DynamoDB")

    # Save assistant message
    assistant_message_item = {
        'PK': f'CONV#{conversation_id}',
        'SK': f'MSG#{timestamp}#ASSISTANT',
        'conversationId': conversation_id,
        'userId': user_id,
        'userEmail': user_email,
        'role': 'assistant',
        'message': assistant_message,
        'timestamp': timestamp,
        'model': BEDROCK_MODEL_ID,
        'sources': json.dumps(sources) if sources else '[]',  # Store sources as JSON string
        'rag_enabled': len(sources) > 0,
        'GSI1PK': f'USER#{user_id}',
        'GSI1SK': f'CONV#{conversation_id}#{timestamp}',
    }

    table.put_item(Item=assistant_message_item)
    print(f"Saved assistant message to DynamoDB")


def error_response(status_code: int, message: str) -> dict:
    """
    Generate error response.

    Args:
        status_code: HTTP status code
        message: Error message

    Returns:
        dict: API Gateway error response
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps({
            'error': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    }
