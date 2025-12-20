"""
Document Processor Lambda - PDF Embedding and Indexing

This Lambda function processes PDF documents from S3:
1. Reads PDF from S3
2. Extracts text using PyPDF2
3. Chunks text into smaller pieces
4. Generates embeddings using Bedrock Titan
5. Indexes embeddings in OpenSearch for RAG

Triggers:
- S3 event notification when new PDF is uploaded
- Manual invocation for reprocessing
"""

import json
import os
import boto3
from datetime import datetime
from typing import List, Dict
import hashlib

# Initialize AWS clients
s3_client = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-west-2'))
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-west-2'))

# For OpenSearch, we'll use opensearchpy (requires Lambda Layer)
try:
    from opensearchpy import OpenSearch, RequestsHttpConnection
    from requests_aws4auth import AWS4Auth
    OPENSEARCH_AVAILABLE = True
except ImportError:
    # Fallback if layer not attached yet
    OPENSEARCH_AVAILABLE = False
    print("WARNING: opensearchpy not available - install Lambda Layer")

# For PDF processing, we'll use PyPDF2 (requires Lambda Layer)
try:
    import PyPDF2
    from io import BytesIO
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("WARNING: PyPDF2 not available - install Lambda Layer")

# Environment variables
OPENSEARCH_ENDPOINT = os.environ.get('OPENSEARCH_ENDPOINT')
OPENSEARCH_INDEX = os.environ.get('OPENSEARCH_INDEX', 'learning-navigator-docs')
PDFS_BUCKET = os.environ.get('PDFS_BUCKET')
AWS_REGION = os.environ.get('AWS_REGION', 'us-west-2')
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"

# Chunking parameters
CHUNK_SIZE = 1000  # Characters per chunk
CHUNK_OVERLAP = 200  # Overlap between chunks


def handler(event, context):
    """
    Lambda handler for document processing.

    Event types:
    1. S3 event notification (automatic processing)
    2. Manual invocation with bucket/key

    Args:
        event: S3 event or custom event with bucket/key
        context: Lambda context

    Returns:
        dict: Processing results
    """

    try:
        # Check if dependencies are available
        if not OPENSEARCH_AVAILABLE or not PDF_AVAILABLE:
            return error_response(500, "Missing dependencies - Lambda Layer not attached")

        # Parse event (S3 event vs manual invocation)
        if 'Records' in event:
            # S3 event notification
            bucket = event['Records'][0]['s3']['bucket']['name']
            key = event['Records'][0]['s3']['object']['key']
        else:
            # Manual invocation
            bucket = event.get('bucket', PDFS_BUCKET)
            key = event.get('key')

        if not bucket or not key:
            return error_response(400, "Missing bucket or key parameter")

        print(f"Processing document: s3://{bucket}/{key}")

        # 1. Download PDF from S3
        pdf_bytes = download_pdf(bucket, key)

        # 2. Extract text from PDF
        text = extract_text_from_pdf(pdf_bytes)

        if not text or len(text) < 50:
            return error_response(400, f"No text extracted from PDF or text too short ({len(text)} chars)")

        print(f"Extracted {len(text)} characters from PDF")

        # 3. Chunk text
        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
        print(f"Created {len(chunks)} chunks")

        # 4. Generate embeddings and index in OpenSearch
        indexed_count = index_chunks(bucket, key, chunks)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Document processed successfully',
                'bucket': bucket,
                'key': key,
                'text_length': len(text),
                'chunks_created': len(chunks),
                'chunks_indexed': indexed_count,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
        }

    except Exception as e:
        print(f"Error processing document: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(500, f"Processing error: {str(e)}")


def download_pdf(bucket: str, key: str) -> bytes:
    """
    Download PDF from S3.

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        bytes: PDF file contents
    """
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return response['Body'].read()


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF using PyPDF2.

    Args:
        pdf_bytes: PDF file contents

    Returns:
        str: Extracted text
    """
    pdf_file = BytesIO(pdf_bytes)
    pdf_reader = PyPDF2.PdfReader(pdf_file)

    text = ""
    for page_num in range(len(pdf_reader.pages)):
        page = pdf_reader.pages[page_num]
        text += page.extract_text() + "\n"

    return text.strip()


def chunk_text(text: str, chunk_size: int, overlap: int) -> List[Dict[str, str]]:
    """
    Split text into overlapping chunks.

    Args:
        text: Full text to chunk
        chunk_size: Maximum characters per chunk
        overlap: Overlap between consecutive chunks

    Returns:
        List of chunks with metadata
    """
    chunks = []
    start = 0
    chunk_id = 0

    while start < len(text):
        # Get chunk
        end = start + chunk_size
        chunk = text[start:end]

        # Find last sentence boundary to avoid cutting mid-sentence
        if end < len(text):
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            boundary = max(last_period, last_newline)

            if boundary > chunk_size // 2:  # Only adjust if boundary is reasonable
                end = start + boundary + 1
                chunk = text[start:end]

        chunks.append({
            'chunk_id': chunk_id,
            'text': chunk.strip(),
            'start_pos': start,
            'end_pos': end,
        })

        # Move to next chunk with overlap
        start = end - overlap
        chunk_id += 1

    return chunks


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

    response = bedrock_runtime.invoke_model(
        modelId=EMBEDDING_MODEL_ID,
        body=json.dumps(request_body)
    )

    response_body = json.loads(response['body'].read())
    return response_body.get('embedding', [])


def index_chunks(bucket: str, key: str, chunks: List[Dict]) -> int:
    """
    Index chunks in OpenSearch with embeddings.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        chunks: List of text chunks

    Returns:
        int: Number of chunks indexed
    """
    # Initialize OpenSearch client
    opensearch_client = get_opensearch_client()

    # Create index if it doesn't exist
    create_index_if_not_exists(opensearch_client)

    indexed_count = 0

    for chunk in chunks:
        # Generate embedding
        embedding = generate_embedding(chunk['text'])

        # Create document ID (unique per chunk)
        doc_id = hashlib.md5(f"{bucket}/{key}/{chunk['chunk_id']}".encode()).hexdigest()

        # Create document
        document = {
            'source_bucket': bucket,
            'source_key': key,
            'chunk_id': chunk['chunk_id'],
            'text': chunk['text'],
            'embedding': embedding,
            'start_pos': chunk['start_pos'],
            'end_pos': chunk['end_pos'],
            'indexed_at': datetime.utcnow().isoformat() + 'Z',
            'text_length': len(chunk['text'])
        }

        # Index document
        opensearch_client.index(
            index=OPENSEARCH_INDEX,
            id=doc_id,
            body=document
        )

        indexed_count += 1
        print(f"Indexed chunk {chunk['chunk_id']} (doc_id: {doc_id})")

    # Refresh index to make documents searchable
    opensearch_client.indices.refresh(index=OPENSEARCH_INDEX)

    return indexed_count


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


def create_index_if_not_exists(opensearch_client):
    """
    Create OpenSearch index with k-NN settings if it doesn't exist.

    Args:
        opensearch_client: OpenSearch client
    """
    if opensearch_client.indices.exists(index=OPENSEARCH_INDEX):
        print(f"Index {OPENSEARCH_INDEX} already exists")
        return

    # Index settings for k-NN vector search
    index_body = {
        'settings': {
            'index': {
                'knn': True,  # Enable k-NN
                'knn.algo_param.ef_search': 512,  # Search quality
            },
            'number_of_shards': 1,
            'number_of_replicas': 0  # Single-node cluster
        },
        'mappings': {
            'properties': {
                'source_bucket': {'type': 'keyword'},
                'source_key': {'type': 'keyword'},
                'chunk_id': {'type': 'integer'},
                'text': {'type': 'text'},
                'embedding': {
                    'type': 'knn_vector',
                    'dimension': 1024,  # Titan embeddings are 1024-dimensional
                    'method': {
                        'name': 'hnsw',  # Hierarchical Navigable Small World
                        'space_type': 'cosinesimil',
                        'engine': 'nmslib',
                        'parameters': {
                            'ef_construction': 512,
                            'm': 16
                        }
                    }
                },
                'start_pos': {'type': 'integer'},
                'end_pos': {'type': 'integer'},
                'indexed_at': {'type': 'date'},
                'text_length': {'type': 'integer'}
            }
        }
    }

    opensearch_client.indices.create(index=OPENSEARCH_INDEX, body=index_body)
    print(f"Created index {OPENSEARCH_INDEX}")


def error_response(status_code: int, message: str) -> dict:
    """
    Generate error response.

    Args:
        status_code: HTTP status code
        message: Error message

    Returns:
        dict: Error response
    """
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'error': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    }
