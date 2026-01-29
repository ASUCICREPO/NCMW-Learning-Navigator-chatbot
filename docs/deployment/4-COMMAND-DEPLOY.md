# 4-Command Deployment

Deploy the NCWM chatbot to AWS in just **4 commands** using AWS CodeBuild automation.

**Total Time:** ~30 minutes (most time is automated deployment)

> **Note:** This repository is public, so no GitHub personal access token is required for deployment.

---

## Prerequisites (5 minutes)

1. **AWS CLI configured** with admin credentials:
   ```bash
   aws configure
   ```

2. **Enable Bedrock Models** in AWS Console:
   - Go to https://console.aws.amazon.com/bedrock/
   - Click "Model access" → "Manage model access"
   - Enable: Claude 3.5 Sonnet, Titan Embeddings, Nova Lite
   - Click "Save changes"

3. **Upload your documents to S3:**
   - Go to AWS Console → S3
   - Create a new bucket or use existing one
   - Upload your PDF/TXT/MD documents to a folder (e.g., `pdfs/`)
   - **Note the bucket name** - you'll need it below

4. **Prepare your values:**
   - Admin email: `_________________`
   - S3 bucket name (with your documents): `_________________`

---

## The 4 Commands

### Command 1: Clone Repository
```bash
git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git
cd NCMW-Learning-Navigator-chatbot
```

### Command 2: Update CDK Stack with Your S3 Bucket
Edit `cdk_backend/lib/cdk_backend-stack.ts` (Line 69):
```typescript
// Replace with your S3 bucket name (the one you uploaded documents to)
const knowledgeBaseDataBucket = s3.Bucket.fromBucketName(
  this,
  'KnowledgeBaseData',
  'YOUR_BUCKET_NAME_HERE'  // <-- Change this
);
```

### Command 3: Set AWS Parameters and Deploy
```bash
# Set deployment parameters (only admin email required - repo is public!)
./setup-params.sh --admin-email admin@yourdomain.com

# Deploy everything (Backend + Frontend)
./deploy-codebuild.sh
```

This will:
- Create CodeBuild project
- Deploy CDK backend (Lambda, DynamoDB, API Gateway, Bedrock Agent, Knowledge Base)
- Build and deploy React frontend to Amplify
- Connect Knowledge Base to your existing S3 bucket
- Output all URLs and IDs
- **Time: ~20 minutes** (automated)

### Command 4: Sync Knowledge Base
```bash
# Get Knowledge Base ID from deployment output
KB_ID=$(aws cloudformation describe-stacks --stack-name LearningNavigatorStack --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' --output text)

# Sync your documents and wait for completion
./sync-knowledge-base.sh --kb-id ${KB_ID} --wait
```

---

## That's It! 🎉

Your chatbot is now deployed and ready to use.

**Access your application:**
```bash
# Get your Amplify URL
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
  --output text
```

**Create admin user:**
```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name LearningNavigatorStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)

# Create admin
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username admin@yourdomain.com \
  --temporary-password "TempPass123!" \
  --region us-west-2
```

---

## What Each Command Does

### Command 1: Clone Repository
- Downloads the codebase to your local machine
- Simple git clone operation

### Command 2: Update CDK Stack Configuration
- Opens the CDK stack configuration file
- Updates it to reference your existing S3 bucket
- This tells the Knowledge Base where to find your documents
- **Important:** Use the bucket where you already uploaded your documents in Prerequisites

### Command 3: Set Parameters and Deploy
- **Part A: Setup Parameters**
  - Stores your GitHub and email configuration in AWS Systems Manager Parameter Store
  - These parameters are used by CodeBuild during deployment
  - Secure and encrypted storage

- **Part B: Deploy Everything**
  - Creates an AWS CodeBuild project
  - Runs the buildspec.yml which:
    - Installs dependencies (CDK, Node.js, Python)
    - Bootstraps CDK in your AWS account
    - Deploys backend infrastructure (Lambda, DynamoDB, API Gateway, Bedrock Agent, Knowledge Base)
    - Connects Knowledge Base to your existing S3 bucket
    - Builds React frontend
    - Deploys frontend to AWS Amplify
  - Outputs all URLs, IDs, and credentials
  - Fully automated - just wait for completion (~20 minutes)

### Command 4: Sync Knowledge Base
- Retrieves the Knowledge Base ID from CDK output
- Triggers AWS Bedrock to ingest and index all documents from your S3 bucket
- Waits for completion (5-10 minutes)
- Documents are now searchable by the chatbot

---

## Troubleshooting

### Command 2 fails: "Parameter already exists"
**Solution:** Parameters already exist from previous deployment. Either:
- Add `--overwrite` flag (already included above)
- Or delete existing parameter:
  ```bash
  aws ssm delete-parameter --name /learning-navigator/admin-email
  ```

### Command 3 fails: "CodeBuild project already exists"
**Solution:** Delete existing project and retry:
```bash
aws codebuild delete-project --name ncwm-chatbot-deployment
./deploy-codebuild.sh
```

### Command 3 fails: "Bedrock Access Denied"
**Solution:** Enable Bedrock models (see Prerequisites step 2)

### Command 4: Can't find bucket name
**Solution:** Stack may not be deployed. Check stack status:
```bash
aws cloudformation describe-stacks --stack-name LearningNavigatorStack --query 'Stacks[0].StackStatus'
```
Expected: `CREATE_COMPLETE`

### Command 5: Sync fails or times out
**Solution:** Check ingestion job status:
```bash
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id ${KB_ID} \
  --data-source-id $(aws bedrock-agent list-data-sources --knowledge-base-id ${KB_ID} --query 'dataSourceSummaries[0].dataSourceId' --output text)
```

---

## Cost Estimate

**Monthly cost** for ~10k conversations:
- Amazon Bedrock: $50-100
- Lambda: $1-5
- DynamoDB: $5-10
- API Gateway: $5
- S3 + Amplify: $3-8
- Other: $10-20
- **Total: $80-150/month**

---

## Full Documentation

For detailed information:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Detailed checklist
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - 5-step manual deployment

---

**Questions?** Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/chatResponseHandler --follow
```
