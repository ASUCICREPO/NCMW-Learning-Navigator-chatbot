# NCWM Chatbot - Quick Deployment Checklist

## Pre-Deployment (1 hour)

### AWS Account Setup
- [ ] AWS account created with admin access
- [ ] AWS CLI installed and configured: `aws configure`
- [ ] Verify credentials: `aws sts get-caller-identity`
- [ ] Region set to `us-west-2` (or your preferred region)

### Enable AWS Services
- [ ] Amazon Bedrock enabled in AWS Console
- [ ] Request model access:
  - [ ] Anthropic Claude 3.5 Sonnet
  - [ ] Amazon Titan Embeddings G1 - Text v2
  - [ ] Amazon Nova Lite
- [ ] Model access approved (check Bedrock Console)

### Local Tools
- [ ] Node.js v18+ installed: `node --version`
- [ ] Python 3.12 installed: `python3 --version`
- [ ] AWS CDK installed: `npm install -g aws-cdk`
- [ ] Git installed: `git --version`

### Repository Setup
- [ ] Repository cloned/forked
- [ ] Backend dependencies installed: `cd cdk_backend && npm install`
- [ ] Frontend dependencies installed: `cd frontend && npm install`

---

## S3 Bucket Setup (15 minutes)

### Create Knowledge Base Bucket
```bash
# Set your bucket name
BUCKET_NAME="your-org-knowledge-base-docs"
REGION="us-west-2"

# Create bucket
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ${BUCKET_NAME} \
  --versioning-configuration Status=Enabled
```

- [ ] S3 bucket created
- [ ] Versioning enabled
- [ ] Bucket name noted: `_______________________________`

### Update CDK Stack
- [ ] Edit `cdk_backend/lib/cdk_backend-stack.ts` (line 69)
- [ ] Replace bucket name with your bucket: `'your-org-knowledge-base-docs'`

---

## CDK Bootstrap (5 minutes)

```bash
cd cdk_backend

# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Bootstrap CDK
cdk bootstrap aws://${ACCOUNT_ID}/us-west-2
```

- [ ] CDK bootstrapped successfully
- [ ] Confirmation message: `✅ Environment aws://ACCOUNT-ID/us-west-2 bootstrapped`

---

## Backend Deployment (20 minutes)

### Prepare Context Values
- [ ] GitHub username/organization: `_______________________________`
- [ ] GitHub repository name: `_______________________________`
- [ ] Admin email address: `_______________________________`
- [ ] GitHub token (optional for private repos): `_______________________________`

### Deploy CDK Stack
```bash
cd cdk_backend

cdk deploy \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=admin@yourdomain.com
```

- [ ] Deployment started (wait 15-20 minutes)
- [ ] Deployment completed: `✅ LearningNavigatorStack`
- [ ] Save CDK outputs:
  - [ ] WebSocket URL: `_______________________________`
  - [ ] Amplify App URL: `_______________________________`
  - [ ] Knowledge Base ID: `_______________________________`
  - [ ] Agent ID: `_______________________________`
  - [ ] Agent Alias ID: `_______________________________`

### Verify Deployment
```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].StackStatus'
```

- [ ] Stack status: `CREATE_COMPLETE`
- [ ] Lambda functions visible in AWS Console
- [ ] DynamoDB tables created
- [ ] API Gateway WebSocket created

---

## Upload Documents (30 minutes)

### Prepare Documents
- [ ] Documents organized in folders
- [ ] Formats verified (PDF, TXT, MD, HTML, DOCX)
- [ ] Total size < 10 GB

### Upload to S3
```bash
# Upload documents
aws s3 sync ./your-documents/ s3://your-bucket-name/pdfs/ \
  --region us-west-2

# Verify upload
aws s3 ls s3://your-bucket-name/pdfs/ --recursive
```

- [ ] Documents uploaded to S3
- [ ] File count verified: `_______ files`

### Sync Knowledge Base
```bash
KB_ID="YOUR_KB_ID"  # From CDK output

# Get Data Source ID
DATA_SOURCE_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id $KB_ID \
  --region us-west-2 \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text)

# Start ingestion
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --region us-west-2
```

- [ ] Ingestion job started
- [ ] Wait 5-10 minutes for completion
- [ ] Check status: `aws bedrock-agent list-ingestion-jobs --knowledge-base-id $KB_ID --data-source-id $DATA_SOURCE_ID --region us-west-2`
- [ ] Status: `COMPLETE`

---

## Frontend Configuration (15 minutes)

### Update Frontend Constants
Edit `frontend/src/utilities/constants.js`:

- [ ] `WEBSOCKET_API` updated with your WebSocket URL
- [ ] `FEEDBACK_API` updated with your API URL
- [ ] `DOCUMENTS_API` updated with your API URL

### Create Environment File
```bash
cd frontend

cat > .env.production << EOF
REACT_APP_WEBSOCKET_API=wss://YOUR_WEBSOCKET_URL
REACT_APP_REGION=us-west-2
EOF
```

- [ ] `.env.production` created
- [ ] Environment variables set

### Test Locally (Optional)
```bash
npm start
```

- [ ] Frontend starts successfully
- [ ] Opens in browser at `http://localhost:3000`
- [ ] Can send test messages (if backend is ready)

---

## Amplify Deployment (15 minutes)

### Connect GitHub to Amplify
- [ ] Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- [ ] Click "Host web app"
- [ ] Select "GitHub" and authorize
- [ ] Select repository: `ncwm_chatbot_2`
- [ ] Select branch: `main`
- [ ] Build settings configured (default should work)
- [ ] Click "Save and deploy"

### Set Environment Variables
In Amplify Console → Environment variables:

- [ ] `REACT_APP_WEBSOCKET_API` = `wss://your-websocket-url`
- [ ] `REACT_APP_REGION` = `us-west-2`
- [ ] Click "Save"

### Wait for Build
- [ ] Build started
- [ ] Build completed (5-10 minutes)
- [ ] Frontend URL accessible: `_______________________________`

---

## Post-Deployment Setup (15 minutes)

### Create Admin User
```bash
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPassword123!" \
  --region us-west-2
```

- [ ] Admin user created
- [ ] Username: `_______________________________`
- [ ] Temporary password saved (change on first login)

### Configure Email (SES)
```bash
aws ses verify-email-identity \
  --email-address admin@yourdomain.com \
  --region us-west-2
```

- [ ] Verification email sent
- [ ] Email clicked and verified
- [ ] SES status: `Success`

---

## Testing & Verification (20 minutes)

### Backend Tests
```bash
# Check Lambda functions
aws lambda list-functions \
  --region us-west-2 \
  --query 'Functions[?contains(FunctionName, `chatResponse`)].FunctionName'

# Check DynamoDB tables
aws dynamodb list-tables \
  --region us-west-2 \
  --query 'TableNames[?contains(@, `Session`)]'
```

- [ ] Lambda functions listed (9+ functions)
- [ ] DynamoDB tables listed (3 tables)

### Frontend Tests
- [ ] Open Amplify URL in browser
- [ ] Select role: Learner
- [ ] Send message: "How do I register for a course?"
- [ ] Expected results:
  - [ ] Message appears in chat
  - [ ] Bot responds with streaming text
  - [ ] Citations appear below response
  - [ ] No errors in browser console (F12)

### CloudWatch Logs
```bash
# Watch logs in real-time
aws logs tail /aws/lambda/chatResponseHandler --follow
```

- [ ] Logs showing successful invocations
- [ ] No error messages
- [ ] Response times < 5 seconds

---

## Final Checklist

### Documentation
- [ ] All CDK outputs saved in secure location
- [ ] Admin credentials documented
- [ ] S3 bucket name documented
- [ ] Amplify URL shared with team

### Security
- [ ] S3 bucket public access blocked
- [ ] API Gateway throttling enabled
- [ ] CloudTrail enabled (optional but recommended)
- [ ] Admin password changed from temporary

### Monitoring
- [ ] CloudWatch alarms set up for:
  - [ ] Lambda errors
  - [ ] API Gateway 5xx errors
  - [ ] DynamoDB throttling
- [ ] Cost Explorer budget alerts configured

### Next Steps
- [ ] Upload more documents to Knowledge Base
- [ ] Create additional admin users
- [ ] Test with real questions from your organization
- [ ] Monitor costs for first month
- [ ] Schedule regular knowledge base syncs

---

## Deployment Time Summary

| Phase | Time |
|-------|------|
| Pre-deployment setup | 1 hour |
| S3 bucket setup | 15 minutes |
| CDK bootstrap | 5 minutes |
| Backend deployment | 20 minutes |
| Upload documents | 30 minutes |
| Frontend configuration | 15 minutes |
| Amplify deployment | 15 minutes |
| Post-deployment setup | 15 minutes |
| Testing & verification | 20 minutes |
| **TOTAL** | **~2.5 hours** |

---

## Quick Reference Commands

```bash
# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs'

# Trigger Amplify deployment
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region us-west-2

# Sync Knowledge Base
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DATA_SOURCE_ID \
  --region us-west-2

# View Lambda logs
aws logs tail /aws/lambda/chatResponseHandler --follow

# Check costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CDK deploy fails | Check AWS credentials: `aws sts get-caller-identity` |
| Bedrock access denied | Enable models in Bedrock Console → Model access |
| Knowledge base sync fails | Verify documents are in correct format (PDF, TXT, MD) |
| WebSocket connection fails | Check API Gateway endpoint in constants.js |
| Amplify build fails | Check build logs, verify environment variables |
| CORS errors | Verify API Gateway CORS settings |

### Get Help
- Review CloudWatch logs: `/aws/lambda/FUNCTION_NAME`
- Check AWS Service Health Dashboard
- Review deployment guide: `DEPLOYMENT_GUIDE.md`

---

## Success Criteria ✅

Your deployment is successful when:
- [ ] Frontend loads without errors
- [ ] Can send and receive messages
- [ ] Citations appear for knowledge-based answers
- [ ] Admin portal accessible with login
- [ ] No errors in CloudWatch logs
- [ ] Monthly cost estimate < $150

---

**Congratulations! Your NCWM chatbot is deployed! 🎉**
