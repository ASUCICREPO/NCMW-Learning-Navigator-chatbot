# Step 8 Testing Guide

This guide walks through testing the complete RAG implementation.

## Prerequisites

Before testing, you must:
1. ✅ Have AWS CLI configured with credentials
2. ✅ Have AWS CDK installed (`npm install -g aws-cdk`)
3. ✅ Have Python 3.9+ installed
4. ✅ Have a test PDF document ready

---

## Testing Plan

```
Step 1: Create Lambda Layer (30 min)
Step 2: Deploy Infrastructure (15 min)
Step 3: Wait for OpenSearch (10 min)
Step 4: Upload Test PDF (1 min)
Step 5: Process PDF (2 min)
Step 6: Test RAG Chat (1 min)
Step 7: Verify Results (1 min)

Total: ~60 minutes
```

---

## Step 1: Create Lambda Layer with RAG Dependencies

### Option A: Automated Script (Recommended)

```bash
cd /Users/etloaner/hemanth/Chatbot_vscode/backend

# Run the layer creation script
./create-lambda-layer.sh
```

### Option B: Manual Creation

```bash
cd /Users/etloaner/hemanth/Chatbot_vscode/backend

# 1. Create directory structure
mkdir -p lambda-layer/python

# 2. Install dependencies into layer
pip install \
  opensearch-py==2.4.2 \
  requests-aws4auth==1.2.3 \
  PyPDF2==3.0.1 \
  langchain==0.1.10 \
  langchain-aws==0.1.0 \
  langchain-community==0.0.24 \
  -t lambda-layer/python

# 3. Zip the layer
cd lambda-layer
zip -r ../rag-dependencies-layer.zip python
cd ..

# 4. Publish to AWS
aws lambda publish-layer-version \
  --layer-name learning-navigator-rag-dependencies \
  --description "RAG dependencies (opensearch-py, PyPDF2, langchain)" \
  --zip-file fileb://rag-dependencies-layer.zip \
  --compatible-runtimes python3.11 \
  --region us-west-2

# 5. Get the Layer ARN
export LAYER_ARN=$(aws lambda list-layer-versions \
  --layer-name learning-navigator-rag-dependencies \
  --region us-west-2 \
  --query 'LayerVersions[0].LayerVersionArn' \
  --output text)

echo "Lambda Layer ARN: $LAYER_ARN"
```

**Expected Output:**
```
{
    "LayerArn": "arn:aws:lambda:us-west-2:...:layer:learning-navigator-rag-dependencies",
    "LayerVersionArn": "arn:aws:lambda:us-west-2:...:layer:learning-navigator-rag-dependencies:1",
    "Version": 1,
    "Description": "RAG dependencies...",
    "CreatedDate": "2025-12-20T..."
}
```

---

## Step 2: Deploy Infrastructure

```bash
cd /Users/etloaner/hemanth/Chatbot_vscode/backend/infrastructure

# Activate virtual environment
source .venv/bin/activate

# Synthesize CloudFormation template (check for errors)
cdk synth

# Deploy (will take ~15 minutes)
cdk deploy --require-approval never

# Save outputs
cdk deploy --outputs-file outputs.json
```

**Expected Resources Created:**
- ✅ DynamoDB table
- ✅ S3 buckets (3)
- ✅ Cognito User Pool
- ✅ Lambda functions (3)
- ✅ API Gateway
- ✅ OpenSearch domain (takes 10-15 min)

**Sample Output:**
```
LearningNavigatorBackendStack.OpenSearchDomainEndpoint = search-learning-navigator-...us-west-2.es.amazonaws.com
LearningNavigatorBackendStack.APIGatewayURL = https://abc123.execute-api.us-west-2.amazonaws.com/prod
LearningNavigatorBackendStack.UserPoolId = us-west-2_ABC123
```

---

## Step 3: Attach Lambda Layer to Functions

```bash
# Get Layer ARN from Step 1
LAYER_ARN="arn:aws:lambda:us-west-2:...:layer:learning-navigator-rag-dependencies:1"

# Attach to Chat Lambda
aws lambda update-function-configuration \
  --function-name learning-navigator-chat \
  --layers $LAYER_ARN \
  --region us-west-2

# Attach to Document Processor Lambda
aws lambda update-function-configuration \
  --function-name learning-navigator-doc-processor \
  --layers $LAYER_ARN \
  --region us-west-2

# Verify layer attached
aws lambda get-function-configuration \
  --function-name learning-navigator-chat \
  --query 'Layers[*].Arn' \
  --region us-west-2
```

**Expected Output:**
```
[
    "arn:aws:lambda:us-west-2:...:layer:learning-navigator-rag-dependencies:1"
]
```

---

## Step 4: Wait for OpenSearch Domain

OpenSearch domain takes 10-15 minutes to initialize.

```bash
# Check OpenSearch status
aws opensearch describe-domain \
  --domain-name learning-navigator \
  --region us-west-2 \
  --query 'DomainStatus.[Processing,Endpoint]' \
  --output table

# Keep checking until Processing = False
watch -n 30 'aws opensearch describe-domain --domain-name learning-navigator --query "DomainStatus.[Processing,Endpoint]" --output table'
```

**Expected Output (when ready):**
```
----------------------------
|    DescribeDomain        |
+------------+-------------+
|  Processing|   Endpoint  |
+------------+-------------+
|  False     |  search-... |
+------------+-------------+
```

---

## Step 5: Create Test User

```bash
# Get User Pool ID from CDK outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Get Client ID
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Create test instructor user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username test-instructor@example.com \
  --user-attributes Name=email,Value=test-instructor@example.com \
  --temporary-password TempPassword123! \
  --region us-west-2

# Add to instructors group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username test-instructor@example.com \
  --group-name instructors \
  --region us-west-2

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username test-instructor@example.com \
  --password MySecurePassword123! \
  --permanent \
  --region us-west-2
```

---

## Step 6: Upload Test PDF to S3

### Option A: Use Existing PDF

```bash
# Upload a test PDF
aws s3 cp /path/to/your/test-document.pdf \
  s3://national-council-s3-pdfs/test-document.pdf \
  --region us-west-2
```

### Option B: Create Sample PDF

```bash
# Create a simple test document
cat > test-content.txt <<'EOF'
Mental Health First Aid (MHFA) Instructor Requirements

To become a certified MHFA instructor, you must:

1. Complete the MHFA Instructor Training Course
   - 8-hour online course
   - 4-day in-person training

2. Pass the Instructor Certification Exam
   - Minimum score: 80%
   - Multiple choice format

3. Background Check
   - Required for all instructors
   - Valid for 2 years

4. Annual Recertification
   - Required every year
   - Complete continuing education credits

5. Teaching Requirements
   - Must teach at least 2 courses per year
   - Maintain positive feedback ratings

Contact: instructor-support@mhfa.org for questions.
EOF

# Convert to PDF (requires pandoc or similar)
# Or manually save as PDF and upload

# Upload to S3
aws s3 cp test-content.txt \
  s3://national-council-s3-pdfs/instructor-requirements.txt \
  --region us-west-2
```

---

## Step 7: Process PDF with Document Processor

```bash
# Invoke document processor Lambda
aws lambda invoke \
  --function-name learning-navigator-doc-processor \
  --payload '{
    "bucket": "national-council-s3-pdfs",
    "key": "test-document.pdf"
  }' \
  --region us-west-2 \
  response.json

# Check response
cat response.json | jq '.'
```

**Expected Output:**
```json
{
  "statusCode": 200,
  "body": {
    "message": "Document processed successfully",
    "bucket": "national-council-s3-pdfs",
    "key": "test-document.pdf",
    "text_length": 1523,
    "chunks_created": 2,
    "chunks_indexed": 2,
    "timestamp": "2025-12-20T15:30:00.000Z"
  }
}
```

**Check CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/learning-navigator-doc-processor \
  --follow \
  --region us-west-2

# Look for:
# - "Extracted 1523 characters from PDF"
# - "Created 2 chunks"
# - "Indexed chunk 0 (doc_id: ...)"
# - "Indexed chunk 1 (doc_id: ...)"
```

---

## Step 8: Get JWT Token

```bash
# Authenticate and get JWT token
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters \
    USERNAME=test-instructor@example.com,PASSWORD=MySecurePassword123! \
  --region us-west-2 \
  --query 'AuthenticationResult.IdToken' \
  --output text)

echo "JWT Token (first 50 chars): ${TOKEN:0:50}..."
```

---

## Step 9: Test RAG-Enabled Chat

### Test 1: Question That Requires RAG

```bash
# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
  --output text)

# Test RAG query
curl -X POST \
  ${API_URL}/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the requirements to become an MHFA instructor?"
  }' | jq '.'
```

**Expected Output (with RAG):**
```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "According to Document 1, to become a certified MHFA instructor, you must:\n\n1. Complete the MHFA Instructor Training Course (8-hour online + 4-day in-person)\n2. Pass the Instructor Certification Exam with a minimum score of 80%\n3. Complete a background check (valid for 2 years)\n4. Maintain annual recertification\n5. Teach at least 2 courses per year\n\nFor more information, you can contact instructor-support@mhfa.org.",
  "sources": [
    {
      "source": "test-document.pdf",
      "chunk_id": 0,
      "score": 0.87
    }
  ],
  "rag_enabled": true,
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "user_id": "...",
  "timestamp": "2025-12-20T15:35:00.000Z"
}
```

### Test 2: Simple Question (No RAG Needed)

```bash
curl -X POST \
  ${API_URL}/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?"
  }' | jq '.'
```

**Expected Output (no RAG):**
```json
{
  "conversation_id": "...",
  "message": "Hello! I'm Learning Navigator, and I'm here to help you with Mental Health First Aid information...",
  "sources": [],
  "rag_enabled": false,
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  ...
}
```

### Test 3: Question About Non-Existent Topic

```bash
curl -X POST \
  ${API_URL}/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the refund policy for courses?"
  }' | jq '.'
```

**Expected Output:**
```json
{
  "conversation_id": "...",
  "message": "I searched our knowledge base but couldn't find specific information about the refund policy. I recommend contacting our support team directly at...",
  "sources": [],
  "rag_enabled": true,
  "model": "..."
}
```

---

## Step 10: Verify OpenSearch Index

```bash
# Get OpenSearch endpoint
OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain \
  --domain-name learning-navigator \
  --region us-west-2 \
  --query 'DomainStatus.Endpoint' \
  --output text)

# Check index stats (requires awscurl or similar for IAM auth)
# Install awscurl: pip install awscurl

awscurl --service es \
  "https://${OPENSEARCH_ENDPOINT}/learning-navigator-docs/_stats" \
  --region us-west-2 | jq '.indices."learning-navigator-docs".total.docs.count'

# Expected: Number of chunks indexed (e.g., 2, 10, 25)
```

---

## Step 11: Monitor CloudWatch Logs

### Chat Lambda Logs

```bash
aws logs tail /aws/lambda/learning-navigator-chat \
  --follow \
  --region us-west-2 \
  --filter-pattern "RAG"

# Look for:
# - "Found 5 relevant documents"
# - "Invoking Bedrock model with RAG=true"
# - "Bedrock response received"
```

### Document Processor Logs

```bash
aws logs tail /aws/lambda/learning-navigator-doc-processor \
  --follow \
  --region us-west-2

# Look for:
# - "Processing document: s3://..."
# - "Extracted X characters from PDF"
# - "Created X chunks"
# - "Indexed chunk X"
```

---

## Troubleshooting

### Issue: "opensearchpy not found"

**Solution:** Lambda Layer not attached
```bash
# Verify layer
aws lambda get-function-configuration \
  --function-name learning-navigator-chat \
  --query 'Layers'

# If empty, attach layer (see Step 3)
```

### Issue: "No text extracted from PDF"

**Causes:**
1. PDF is scanned image (no text layer)
2. PDF is encrypted
3. Wrong file format

**Solution:**
```bash
# Test PDF locally
python3 -c "
import PyPDF2
with open('test.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    print(f'Pages: {len(reader.pages)}')
    print(f'Text: {reader.pages[0].extract_text()[:100]}')
"
```

### Issue: "OpenSearch timeout"

**Causes:**
1. Domain still initializing
2. IAM permissions issue

**Solution:**
```bash
# Check domain status
aws opensearch describe-domain \
  --domain-name learning-navigator \
  --query 'DomainStatus.[Processing,Endpoint]'

# Check Lambda IAM role
aws iam get-role-policy \
  --role-name learning-navigator-lambda-role \
  --policy-name ...
```

### Issue: "Empty search results"

**Causes:**
1. No documents indexed yet
2. Query embedding failed

**Solution:**
```bash
# Check if documents indexed
awscurl --service es \
  "https://${OPENSEARCH_ENDPOINT}/learning-navigator-docs/_count"

# Should return: {"count": X} where X > 0
```

---

## Success Criteria

✅ **Lambda Layer created and attached**
✅ **Infrastructure deployed successfully**
✅ **OpenSearch domain active (Processing = false)**
✅ **Test user created and can authenticate**
✅ **PDF uploaded to S3**
✅ **Document processed and indexed (chunks created)**
✅ **Chat returns RAG-enabled responses with sources**
✅ **Source citations match uploaded documents**
✅ **CloudWatch logs show RAG operations**

---

## Cost Warning

**This deployment will incur costs:**
- OpenSearch: ~$0.90/day ($28/month)
- Lambda: <$0.10/day
- Bedrock: Pay-per-use (~$0.01/query)
- Other services: <$0.05/day

**Total: ~$1/day during testing**

**Remember to destroy stack when done testing:**
```bash
cdk destroy
```

---

## Next Steps After Testing

1. **S3 Event Notifications** - Auto-trigger doc processor on upload
2. **Batch Processing** - Process all existing PDFs in bucket
3. **Monitoring** - Set up CloudWatch alarms
4. **Optimization** - Tune OpenSearch parameters
5. **Production** - Scale to multi-node cluster

---

**Happy Testing!** 🚀
