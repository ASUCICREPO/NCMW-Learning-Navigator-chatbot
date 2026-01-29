# 5-Step Deployment Guide

Deploy the NCWM chatbot to a new AWS account in 5 simple steps.

**Total Time:** ~2 hours | **Difficulty:** Easy

---

## Prerequisites (10 minutes)

Install these tools first:

```bash
# Check if installed
node --version   # Need v18+
aws --version    # Need v2+
cdk --version    # Need v2+

# Install if missing
npm install -g aws-cdk

# Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-west-2), Format (json)
```

✅ **Enable Bedrock Models** (IMPORTANT):
1. Go to https://console.aws.amazon.com/bedrock/
2. Click "Model access" → "Manage model access"
3. Enable:
   - ✅ Anthropic Claude 3.5 Sonnet
   - ✅ Amazon Titan Embeddings G1 - Text v2
   - ✅ Amazon Nova Lite
4. Click "Save changes" → Wait for "Access granted"

---

## Step 1: Prepare Configuration (5 minutes)

```bash
# Clone repository (if not already)
git clone https://github.com/YOUR_ORG/ncwm_chatbot_2.git
cd ncwm_chatbot_2

# Edit CDK stack to set your S3 bucket name
# Open: cdk_backend/lib/cdk_backend-stack.ts
# Line 69: Change bucket name to yours

# Option A: Create new bucket
BUCKET_NAME="your-org-chatbot-docs-$(date +%s)"
aws s3 mb s3://${BUCKET_NAME} --region us-west-2

# Save bucket name for later
echo "export BUCKET_NAME=${BUCKET_NAME}" > deployment.env
```

**Update CDK Stack:**

Edit `cdk_backend/lib/cdk_backend-stack.ts` (Line 69):

```typescript
// Replace this line:
const knowledgeBaseDataBucket = s3.Bucket.fromBucketName(this, 'KnowledgeBaseData', 'national-council-s3-pdfs');

// With your bucket name:
const knowledgeBaseDataBucket = s3.Bucket.fromBucketName(this, 'KnowledgeBaseData', 'YOUR_BUCKET_NAME');
```

**Prepare your values:**
- GitHub username: `_________________`
- GitHub repo: `_________________`
- Admin email: `_________________`

---

## Step 2: Deploy Backend (20 minutes)

```bash
cd cdk_backend

# Install dependencies
npm install

# Bootstrap CDK (one-time setup)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
cdk bootstrap aws://${ACCOUNT_ID}/us-west-2

# Deploy (replace with your values)
cdk deploy \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=admin@yourdomain.com \
  --require-approval never

# SAVE THE OUTPUTS! Copy these to a file:
# - WebSocketApiEndpoint
# - AmplifyAppUrl
# - KnowledgeBaseId
# - AgentId
```

**Expected Output:**
```
✅  LearningNavigatorStack

Outputs:
WebSocketApiEndpoint = wss://abc123.execute-api.us-west-2.amazonaws.com/prod
AmplifyAppUrl = https://main.d1disyogbqgwn4.amplifyapp.com
KnowledgeBaseId = KB123ABC
AgentId = AGENT456XYZ
...
```

**📝 Save outputs:**
```bash
# Run this to save outputs automatically
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs' > deployment-outputs.json

cat deployment-outputs.json
```

---

## Step 3: Upload Documents & Sync Knowledge Base (30 minutes)

```bash
# Source your bucket name
source deployment.env  # If you created one in Step 1

# Option A: Upload sample documents (for testing)
mkdir -p sample-docs
echo "How to register for MHFA courses: Visit the registration portal..." > sample-docs/registration-guide.txt
echo "Instructor certification requirements: Complete training..." > sample-docs/instructor-guide.txt
aws s3 sync sample-docs/ s3://${BUCKET_NAME}/pdfs/

# Option B: Upload your actual documents
# aws s3 sync /path/to/your/documents/ s3://${BUCKET_NAME}/pdfs/

# Get Knowledge Base ID from Step 2 output
KB_ID="YOUR_KB_ID"  # Replace with actual value from Step 2

# Get Data Source ID
DATA_SOURCE_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id ${KB_ID} \
  --region us-west-2 \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text)

# Start sync
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id ${KB_ID} \
  --data-source-id ${DATA_SOURCE_ID} \
  --region us-west-2

# Check status (wait until COMPLETE)
watch -n 10 "aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id ${KB_ID} \
  --data-source-id ${DATA_SOURCE_ID} \
  --region us-west-2 \
  --query 'ingestionJobSummaries[0].status'"

# When status shows "COMPLETE", press Ctrl+C and continue
```

**⏱️ Sync takes 5-10 minutes.** Status progression:
- `STARTING` → `IN_PROGRESS` → `COMPLETE`

---

## Step 4: Configure Frontend (10 minutes)

```bash
cd ../frontend

# Get WebSocket URL from Step 2 outputs
WEBSOCKET_URL="wss://YOUR_WEBSOCKET_URL"  # From deployment-outputs.json

# Update constants.js
# Edit: frontend/src/utilities/constants.js
```

**Edit `frontend/src/utilities/constants.js`:**

Find these lines and update:

```javascript
// Line ~5: Update WebSocket API
export const WEBSOCKET_API = "wss://YOUR_WEBSOCKET_URL_FROM_STEP2";

// Example:
export const WEBSOCKET_API = "wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod";
```

**Commit changes:**

```bash
git add src/utilities/constants.js
git commit -m "Update WebSocket endpoint for new deployment"
git push origin main
```

**✅ Amplify will auto-deploy** (takes 5-10 minutes)

---

## Step 5: Test & Verify (10 minutes)

### **5.1 Wait for Frontend Build**

```bash
# Get Amplify App ID
AMPLIFY_APP_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppId`].OutputValue' \
  --output text)

# Check build status
aws amplify list-jobs \
  --app-id ${AMPLIFY_APP_ID} \
  --branch-name main \
  --max-results 1 \
  --region us-west-2
```

**Wait for:**
- `status: "RUNNING"` → Wait
- `status: "SUCCEED"` → Ready! ✅

### **5.2 Open & Test**

```bash
# Get your Amplify URL from Step 2 outputs
AMPLIFY_URL="https://main.YOUR_APP_ID.amplifyapp.com"

# Open in browser
open ${AMPLIFY_URL}  # Mac
# OR visit manually
```

**Test Checklist:**

1. ✅ **Open URL** - Page loads without errors
2. ✅ **Select Role** - Choose "Learner"
3. ✅ **Send Message** - Type: "How do I register for a course?"
4. ✅ **See Response** - Bot responds with streaming text
5. ✅ **Check Citations** - Sources appear below response
6. ✅ **Browser Console** - Open DevTools (F12), check for errors

**Expected Result:**

```
User: How do I register for a course?

Bot: To register for an MHFA course, you can...
    [response streams in real-time]

📚 Sources:
    - registration-guide.txt
```

### **5.3 Check Logs (if issues)**

```bash
# View Lambda logs
aws logs tail /aws/lambda/chatResponseHandler --follow

# View WebSocket logs
aws logs tail /aws/lambda/web-socket-handler --follow
```

---

## ✅ Success Checklist

You're done when:

- [x] Backend deployed (Step 2 completed)
- [x] Documents uploaded to S3 (Step 3)
- [x] Knowledge Base synced (status: COMPLETE)
- [x] Frontend updated with WebSocket URL (Step 4)
- [x] Amplify build succeeded (check AWS Console)
- [x] Can send/receive messages (Step 5.2)
- [x] Citations appear in responses
- [x] No errors in browser console

---

## 🎉 You're Live!

**Your URLs:**
- **Chatbot:** `https://main.YOUR_APP_ID.amplifyapp.com`
- **Admin Portal:** `https://main.YOUR_APP_ID.amplifyapp.com/admin`

**Next Steps:**
1. Create admin user (see below)
2. Upload more documents
3. Test with real questions
4. Monitor CloudWatch for errors

---

## Bonus: Create Admin User (2 minutes)

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Create admin
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPass123!" \
  --region us-west-2

# Login at: https://your-amplify-url/admin
# Username: admin@yourdomain.com
# Password: TempPass123! (will be prompted to change)
```

---

## Quick Troubleshooting

### Issue: "CDK deploy failed"

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check CDK is installed
cdk --version

# Try with verbose output
cdk deploy --verbose
```

### Issue: "Bedrock Access Denied"

1. Go to https://console.aws.amazon.com/bedrock/
2. Click "Model access"
3. Verify all 3 models show "Access granted" ✅

### Issue: "Knowledge Base sync failed"

```bash
# Check if documents uploaded
aws s3 ls s3://${BUCKET_NAME}/pdfs/ --recursive

# Check document formats (must be PDF, TXT, MD, HTML)
# Max file size: 50MB per file
```

### Issue: "Frontend not loading"

```bash
# Check Amplify build status
aws amplify list-jobs \
  --app-id ${AMPLIFY_APP_ID} \
  --branch-name main \
  --region us-west-2

# If failed, check build logs in AWS Console
# Amplify → Your App → Build history
```

### Issue: "WebSocket connection failed"

- Verify WebSocket URL in `constants.js` matches Step 2 output
- Check browser console (F12) for exact error
- Verify API Gateway in AWS Console

---

## Cost Estimate

**Monthly cost** for ~10k conversations:
- Amazon Bedrock: $50-100
- Lambda: $1-5
- DynamoDB: $5-10
- API Gateway: $5
- S3 + CloudFront: $2-5
- Amplify: $1-3
- Other: $10-20
- **Total: $80-150/month**

---

## Full Documentation

For detailed info, see:
- 📖 **Full Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- 📋 **Checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- 🤖 **Automated:** `./deploy.sh --help`

---

## Support

**Need help?**
1. Check logs: `aws logs tail /aws/lambda/chatResponseHandler --follow`
2. Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) troubleshooting
3. Check AWS Service Health: https://status.aws.amazon.com/

---

**That's it! 5 steps to a deployed chatbot. 🚀**
