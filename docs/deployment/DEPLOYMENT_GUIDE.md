# NCWM Chatbot - Deployment Guide for New AWS Account

This guide walks you through deploying the NCWM (National Council for Mental Wellbeing) chatbot to a new AWS account from scratch.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [S3 Bucket Setup (Knowledge Base Documents)](#s3-bucket-setup)
4. [Local Development Environment](#local-development-environment)
5. [CDK Bootstrap](#cdk-bootstrap)
6. [Deploy Backend Infrastructure](#deploy-backend-infrastructure)
7. [Upload Documents to Knowledge Base](#upload-documents-to-knowledge-base)
8. [Configure Frontend](#configure-frontend)
9. [Deploy Frontend (Amplify)](#deploy-frontend-amplify)
10. [Post-Deployment Configuration](#post-deployment-configuration)
11. [Testing & Verification](#testing-verification)
12. [Troubleshooting](#troubleshooting)
13. [Cost Estimation](#cost-estimation)

---

## Prerequisites

### Required Accounts & Access

- [ ] AWS Account with administrator access
- [ ] GitHub account (for frontend deployment via Amplify)
- [ ] Forked/cloned copy of this repository

### Required Tools

Install the following tools on your local machine:

```bash
# Node.js (v18 or later)
node --version  # Should show v18.x or higher

# AWS CLI (v2)
aws --version  # Should show aws-cli/2.x

# AWS CDK
npm install -g aws-cdk
cdk --version  # Should show 2.x

# Git
git --version

# Python (3.12 for Lambda functions)
python3 --version  # Should show 3.12.x
```

---

## AWS Account Setup

### 1. Enable Required AWS Services

**Navigate to AWS Console and enable:**

#### **Amazon Bedrock**
```
Region: us-west-2 (Oregon) - Recommended for Bedrock availability
Console: https://console.aws.amazon.com/bedrock/
```

1. Go to Bedrock Console → Model Access
2. Request access to the following models:
   - ✅ **Anthropic Claude 3.5 Sonnet** (for chat responses)
   - ✅ **Amazon Titan Embeddings G1 - Text v2** (for knowledge base embeddings)
   - ✅ **Amazon Nova Lite** (for sentiment analysis)
3. Wait for approval (usually instant, but can take 24 hours)

#### **AWS Amplify**
```
Console: https://console.aws.amazon.com/amplify/
```
- No setup needed, but verify it's available in your region

### 2. Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter:
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-west-2
# Default output format: json

# Verify credentials
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### 3. Create IAM User (if not using admin account)

**Recommended permissions:**
- `AdministratorAccess` (for initial setup)
- Or create custom policy with:
  - CloudFormation full access
  - Lambda full access
  - S3 full access
  - Bedrock full access
  - DynamoDB full access
  - API Gateway full access
  - Amplify full access
  - IAM (limited to creating roles)

---

## S3 Bucket Setup

### 1. Create S3 Bucket for Knowledge Base Documents

```bash
# Replace with your desired bucket name
BUCKET_NAME="your-org-knowledge-base-docs"
REGION="us-west-2"

# Create bucket
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket ${BUCKET_NAME} \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket ${BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 2. Create Folder Structure

```bash
# Create folders for different data sources
aws s3api put-object --bucket ${BUCKET_NAME} --key pdfs/
aws s3api put-object --bucket ${BUCKET_NAME} --key documents/
```

### 3. Update CDK Stack with Your Bucket Name

Edit `cdk_backend/lib/cdk_backend-stack.ts`:

```typescript
// Line 69 - Replace with your bucket name
const knowledgeBaseDataBucket = s3.Bucket.fromBucketName(
  this,
  'KnowledgeBaseData',
  'your-org-knowledge-base-docs'  // <-- CHANGE THIS
);
```

---

## Local Development Environment

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/ncwm_chatbot_2.git
cd ncwm_chatbot_2
```

### 2. Install Backend Dependencies

```bash
cd cdk_backend
npm install

# Install Python dependencies for Lambda functions
cd lambda/chatResponseHandler
pip install -r requirements.txt -t .
cd ../..

# Repeat for other Lambda functions
for dir in lambda/*/; do
  if [ -f "${dir}requirements.txt" ]; then
    echo "Installing dependencies for ${dir}"
    pip install -r "${dir}requirements.txt" -t "${dir}"
  fi
done
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## CDK Bootstrap

**One-time setup** per AWS account/region:

```bash
cd cdk_backend

# Bootstrap CDK (creates S3 bucket for CDK assets)
cdk bootstrap aws://ACCOUNT-ID/us-west-2

# Example:
# cdk bootstrap aws://123456789012/us-west-2
```

**Expected output:**
```
 ✅  Environment aws://123456789012/us-west-2 bootstrapped.
```

---

## Deploy Backend Infrastructure

### 1. Prepare Context Values

Create a file `cdk_backend/cdk.context.json`:

```json
{
  "githubOwner": "YOUR_GITHUB_USERNAME",
  "githubRepo": "ncwm_chatbot_2",
  "adminEmail": "admin@yourdomain.com"
}
```

**Or** pass via command line (see step 3).

### 2. Review What Will Be Created

```bash
cd cdk_backend

# Preview changes (dry run)
cdk diff \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=admin@yourdomain.com
```

**Resources that will be created:**
- ✅ Bedrock Knowledge Base
- ✅ Bedrock Agent
- ✅ 9+ Lambda Functions
- ✅ DynamoDB Tables (SessionLogs, Feedback, EscalatedQueries)
- ✅ API Gateway (WebSocket)
- ✅ S3 Buckets (email, supplemental data)
- ✅ Cognito User Pool
- ✅ CloudWatch Log Groups
- ✅ IAM Roles and Policies
- ✅ Amplify App (frontend hosting)
- ✅ EventBridge Rules (for scheduled tasks)

### 3. Deploy Stack

```bash
# Deploy everything
cdk deploy \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=admin@yourdomain.com

# Note: This is a public repository, so no GitHub token is required
```

**Deployment time:** 15-20 minutes

**Expected output (last lines):**
```
✅  LearningNavigatorStack

Outputs:
LearningNavigatorStack.WebSocketApiEndpoint = wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
LearningNavigatorStack.AmplifyAppUrl = https://main.d1disyogbqgwn4.amplifyapp.com
LearningNavigatorStack.KnowledgeBaseId = KB123ABC456
LearningNavigatorStack.AgentId = AGENT123ABC
...

Stack ARN:
arn:aws:cloudformation:us-west-2:123456789012:stack/LearningNavigatorStack/...
```

**IMPORTANT:** Save these outputs! You'll need them later.

### 4. Verify Deployment

```bash
# Check if stack was created
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].StackStatus'

# Should output: "CREATE_COMPLETE"

# List all resources
aws cloudformation list-stack-resources \
  --stack-name LearningNavigatorStack \
  --region us-west-2
```

---

## Upload Documents to Knowledge Base

### 1. Prepare Your Documents

Supported formats:
- PDF
- TXT
- MD (Markdown)
- HTML
- DOCX

**Organize your documents:**
```
documents/
├── course-registration/
│   ├── how-to-register.pdf
│   └── registration-faq.pdf
├── instructor-guides/
│   ├── instructor-certification.pdf
│   └── course-delivery-guide.pdf
└── policies/
    ├── recertification-policy.pdf
    └── code-of-conduct.pdf
```

### 2. Upload to S3

```bash
# Upload all documents
aws s3 sync ./documents/ s3://your-org-knowledge-base-docs/pdfs/ \
  --region us-west-2

# Verify upload
aws s3 ls s3://your-org-knowledge-base-docs/pdfs/ --recursive
```

### 3. Sync Knowledge Base

```bash
# Get Knowledge Base ID from CDK output
KB_ID="KB123ABC456"  # Replace with your actual ID

# Get Data Source ID
DATA_SOURCE_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id $KB_ID \
  --region us-west-2 \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text)

# Start ingestion job
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --region us-west-2

# Monitor progress (takes 5-10 minutes)
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --region us-west-2 \
  --query 'ingestionJobSummaries[0].status'

# Wait for status: "COMPLETE"
```

---

## Configure Frontend

### 1. Get WebSocket API Endpoint

```bash
# From CDK output (or query CloudFormation)
WEBSOCKET_URL=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiEndpoint`].OutputValue' \
  --output text)

echo $WEBSOCKET_URL
# Example: wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
```

### 2. Update Frontend Constants

Edit `frontend/src/utilities/constants.js`:

```javascript
// Update with your WebSocket endpoint
export const WEBSOCKET_API = "wss://YOUR_WEBSOCKET_URL";

// Update with your API endpoints
export const FEEDBACK_API = "https://YOUR_API_GATEWAY_URL/feedback";
export const DOCUMENTS_API = "https://YOUR_API_GATEWAY_URL/documents";
```

**To get API endpoints:**
```bash
# Get REST API URL
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' \
  --output text
```

### 3. Create Environment File

```bash
cd frontend

# Create .env.production
cat > .env.production << EOF
REACT_APP_WEBSOCKET_API=${WEBSOCKET_URL}
REACT_APP_FEEDBACK_API=https://your-api-id.execute-api.us-west-2.amazonaws.com/prod/feedback
REACT_APP_DOCUMENTS_API=https://your-api-id.execute-api.us-west-2.amazonaws.com/prod/documents
REACT_APP_REGION=us-west-2
EOF
```

---

## Deploy Frontend (Amplify)

### 1. Connect GitHub Repository to Amplify

**Option A: AWS Console (Recommended for first deployment)**

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "Host web app"
3. Select "GitHub"
4. Authorize AWS Amplify to access your GitHub
5. Select repository: `ncwm_chatbot_2`
6. Select branch: `main`
7. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
8. Click "Save and deploy"

**Option B: AWS CLI**

```bash
# Get Amplify App ID from CDK output
AMPLIFY_APP_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppId`].OutputValue' \
  --output text)

# Manually trigger a build
aws amplify start-job \
  --app-id $AMPLIFY_APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region us-west-2
```

### 2. Configure Amplify Environment Variables

Add environment variables in Amplify Console:

1. Go to Amplify Console → Your App → Environment variables
2. Add:
   - `REACT_APP_WEBSOCKET_API` = `wss://your-websocket-url`
   - `REACT_APP_FEEDBACK_API` = `https://your-api-url/feedback`
   - `REACT_APP_REGION` = `us-west-2`

3. Click "Save"
4. Redeploy: Go to "Build settings" → "Redeploy this version"

### 3. Get Frontend URL

```bash
# From CDK output
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
  --output text

# Example: https://main.d1disyogbqgwn4.amplifyapp.com
```

---

## Post-Deployment Configuration

### 1. Create Admin User (Cognito)

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPassword123!" \
  --region us-west-2

# User will need to change password on first login
```

### 2. Configure SES Email (for notifications)

```bash
# Verify admin email for SES
aws ses verify-email-identity \
  --email-address admin@yourdomain.com \
  --region us-west-2

# Check inbox for verification email and click link

# Verify status
aws ses get-identity-verification-attributes \
  --identities admin@yourdomain.com \
  --region us-west-2
```

### 3. Test Bedrock Agent

```bash
# Get Agent ID and Alias ID
AGENT_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentId`].OutputValue' \
  --output text)

AGENT_ALIAS_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentAliasId`].OutputValue' \
  --output text)

# Test agent
aws bedrock-agent-runtime invoke-agent \
  --agent-id $AGENT_ID \
  --agent-alias-id $AGENT_ALIAS_ID \
  --session-id test-session-123 \
  --input-text "How do I register for a course?" \
  --region us-west-2 \
  --output-file response.txt

cat response.txt
```

---

## Testing & Verification

### 1. Backend Health Checks

```bash
# Check Lambda functions are deployed
aws lambda list-functions \
  --region us-west-2 \
  --query 'Functions[?contains(FunctionName, `chatResponse`) || contains(FunctionName, `websocket`)].FunctionName'

# Check DynamoDB tables exist
aws dynamodb list-tables \
  --region us-west-2 \
  --query 'TableNames[?contains(@, `Session`) || contains(@, `Feedback`)]'

# Check API Gateway
aws apigatewayv2 get-apis \
  --region us-west-2 \
  --query 'Items[?contains(Name, `WebSocket`)].{Name:Name,ApiEndpoint:ApiEndpoint}'
```

### 2. Frontend Health Check

```bash
# Test frontend is accessible
AMPLIFY_URL="https://main.YOUR_APP_ID.amplifyapp.com"
curl -I $AMPLIFY_URL

# Should return: HTTP/2 200
```

### 3. End-to-End Test

1. **Open frontend URL** in browser
2. **Select role:** Learner
3. **Send test message:** "How do I register for a course?"
4. **Expected:**
   - ✅ Message appears in chat
   - ✅ Bot response streams in real-time
   - ✅ Citations appear below response
   - ✅ No errors in browser console

5. **Check CloudWatch Logs:**
   ```bash
   # WebSocket handler logs
   aws logs tail /aws/lambda/web-socket-handler --follow

   # Chat response handler logs
   aws logs tail /aws/lambda/chatResponseHandler --follow
   ```

---

## Troubleshooting

### Issue: CDK Deploy Fails with "Access Denied"

**Solution:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions
aws iam get-user
```

### Issue: Bedrock Model Access Denied

**Solution:**
1. Go to [Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in sidebar
3. Click "Manage model access"
4. Enable required models:
   - Anthropic Claude 3.5 Sonnet
   - Amazon Titan Embeddings
   - Amazon Nova Lite
5. Wait for "Access granted" status

### Issue: Knowledge Base Ingestion Fails

**Solution:**
```bash
# Check S3 bucket permissions
aws s3api get-bucket-policy --bucket your-bucket-name

# Verify documents are in correct format (PDF, TXT, MD)
aws s3 ls s3://your-bucket-name/pdfs/ --recursive

# Check ingestion job error logs
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --ingestion-job-id JOB_ID
```

### Issue: WebSocket Connection Fails

**Solution:**
```bash
# Check API Gateway is deployed
aws apigatewayv2 get-apis --region us-west-2

# Test WebSocket manually
wscat -c "wss://your-websocket-url?token=test"

# Check Lambda execution role has API Gateway permissions
aws iam get-role --role-name LearningNavigatorStack-chatResponseHandlerRole
```

### Issue: Amplify Build Fails

**Solution:**
1. Check build logs in Amplify Console
2. Common fixes:
   ```bash
   # Missing environment variables
   # → Add in Amplify Console → Environment variables

   # Node version mismatch
   # → Set in amplify.yml:
   #   frontend:
   #     phases:
   #       preBuild:
   #         commands:
   #           - nvm use 18

   # Dependency conflicts
   # → Clear npm cache and reinstall
   ```

### Issue: "CORS Error" in Browser

**Solution:**
1. Check API Gateway CORS settings
2. Update Lambda responses to include CORS headers:
   ```javascript
   headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'Content-Type',
     'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
   }
   ```

---

## Cost Estimation

### Monthly Costs (for moderate usage ~10k conversations/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Amazon Bedrock** | ~10k requests | ~$50-100 |
| **Lambda** | ~50k invocations | ~$1-5 |
| **DynamoDB** | On-demand | ~$5-10 |
| **API Gateway** | WebSocket | ~$5 |
| **S3** | Storage + requests | ~$2-5 |
| **Amplify** | Hosting | ~$1-3 |
| **CloudWatch Logs** | Log storage | ~$5 |
| **Bedrock Knowledge Base** | Storage + queries | ~$10-20 |
| **SES** | Email notifications | ~$1 |
| **Total** | | **~$80-150/month** |

**Cost optimization tips:**
- Use Bedrock on-demand pricing initially
- Enable S3 lifecycle policies for old logs
- Set DynamoDB TTL for old sessions
- Use CloudWatch Logs retention policies (7-30 days)

---

## Security Best Practices

### 1. Restrict S3 Bucket Access

```bash
# Block public access
aws s3api put-public-access-block \
  --bucket your-bucket-name \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2. Enable API Gateway Throttling

```bash
# Set rate limits to prevent abuse
aws apigatewayv2 update-stage \
  --api-id YOUR_API_ID \
  --stage-name prod \
  --throttle-settings RateLimit=100,BurstLimit=200
```

### 3. Rotate Secrets

```bash
# Note: This is a public repository, so GitHub token rotation is not needed
# For private repositories only - rotate GitHub token in Secrets Manager
# aws secretsmanager rotate-secret --secret-id github-secret-token
```

### 4. Enable CloudTrail

```bash
# Track all API calls for auditing
aws cloudtrail create-trail \
  --name ncwm-chatbot-trail \
  --s3-bucket-name your-cloudtrail-bucket
```

---

## Next Steps After Deployment

1. **Upload your documents** to S3 and sync Knowledge Base
2. **Create admin users** in Cognito
3. **Test chatbot** with real questions
4. **Monitor CloudWatch metrics** for errors
5. **Set up alarms** for Lambda errors and throttling
6. **Configure backup** for DynamoDB tables
7. **Document your** specific configuration and customizations

---

## Additional Resources

- **AWS Bedrock Documentation:** https://docs.aws.amazon.com/bedrock/
- **AWS CDK Documentation:** https://docs.aws.amazon.com/cdk/
- **AWS Amplify Documentation:** https://docs.aws.amazon.com/amplify/
- **Troubleshooting Guide:** See CloudWatch Logs Insights queries in AWS Console

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section above
2. Review CloudWatch logs for specific errors
3. Check AWS Service Health Dashboard
4. Contact your AWS support team

---

**Deployment Complete! 🎉**

Your NCWM chatbot should now be fully deployed and operational in your AWS account.
