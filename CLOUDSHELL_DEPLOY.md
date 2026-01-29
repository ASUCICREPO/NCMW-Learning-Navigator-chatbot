# AWS CloudShell Deployment - 3 Commands

Deploy the entire MHFA Learning Navigator chatbot in **3 simple commands** using AWS CloudShell.

**Total Time:** ~25-30 minutes (automated)

---

## Prerequisites (5 minutes)

### 1. Enable Bedrock Models
Go to https://console.aws.amazon.com/bedrock/ → **Model access** → Enable:
- ✅ **Anthropic Claude 4 Sonnet**
- ✅ **Amazon Titan Embeddings Text v2**

### 2. Verify Admin Email in SES
Go to https://console.aws.amazon.com/ses/ → **Verified identities** → **Create identity**:
- Enter your admin email
- Check inbox and click verification link

### 3. Upload Documents to S3
Go to https://console.aws.amazon.com/s3/:
- Create a new bucket (e.g., `my-org-chatbot-docs-123`)
- Upload your PDF/TXT/MD documents to `pdfs/` folder
- **Note the bucket name** - you'll need it below

---

## Deployment (3 Commands)

### Step 1: Open AWS CloudShell

1. Go to AWS Console: https://console.aws.amazon.com/
2. Click the **CloudShell icon** (>_) in the top navigation bar
3. Wait for CloudShell to initialize (~30 seconds)

### Step 2: Run Deployment Commands

Copy and paste these 3 commands one at a time:

#### Command 1: Clone and Setup
```bash
git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git && \
cd NCMW-Learning-Navigator-chatbot && \
chmod +x *.sh
```

#### Command 2: Configure Deployment
```bash
# Set your values here:
export ADMIN_EMAIL="your-email@domain.com"           # Your verified SES email
export S3_BUCKET="your-bucket-name"                  # Your S3 bucket from prerequisites

# Update CDK stack with bucket name
sed -i "s/'national-council-s3-pdfs'/'${S3_BUCKET}'/g" cdk_backend/lib/cdk_backend-stack.ts

# Set parameter in AWS Systems Manager
aws ssm put-parameter \
  --name "/learning-navigator/admin-email" \
  --value "$ADMIN_EMAIL" \
  --type "String" \
  --overwrite \
  --region us-west-2

echo "✅ Configuration complete!"
```

#### Command 3: Deploy Everything
```bash
./deploy-codebuild.sh
```

This single command will:
- ✅ Create CodeBuild project
- ✅ Deploy backend infrastructure (Lambda, DynamoDB, API Gateway, Bedrock)
- ✅ Build React frontend
- ✅ Deploy to Amplify
- ✅ Output all URLs and IDs

**Wait:** This takes ~20-25 minutes. The script monitors progress automatically.

---

## Step 3: Get Your URLs

After deployment completes, the script will display:

```
========================================
✅ DEPLOYMENT SUCCESSFUL!
========================================

🌐 Frontend URL:     https://main.xxxxx.amplifyapp.com
📊 Admin Portal:     https://main.xxxxx.amplifyapp.com/admin
🔌 WebSocket API:    wss://xxxxx.execute-api.us-west-2.amazonaws.com/prod

📚 Knowledge Base ID: KB123ABC
🤖 Agent ID:         AGENT456XYZ
👤 User Pool ID:     us-west-2_AbCdEf
```

**Copy your Amplify URL** - that's your chatbot!

---

## Step 4: Sync Knowledge Base

After deployment, sync your uploaded documents:

```bash
# Get Knowledge Base ID from deployment output
KB_ID="KB123ABC"  # Replace with your actual ID from above

# Sync documents
./sync-knowledge-base.sh --kb-id ${KB_ID} --wait
```

This takes 5-10 minutes. When status shows **COMPLETE**, your knowledge base is ready!

---

## Step 5: Create Admin User

```bash
# Get User Pool ID from deployment output
USER_POOL_ID="us-west-2_AbCdEf"  # Replace with your actual ID

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username ${ADMIN_EMAIL} \
  --user-attributes Name=email,Value=${ADMIN_EMAIL} \
  --temporary-password "TempPass123!" \
  --region us-west-2

echo "✅ Admin user created! Check your email for login instructions."
```

---

## 🎉 Done!

Your chatbot is live at: `https://main.xxxxx.amplifyapp.com`

### Test It:
1. Open the Amplify URL in your browser
2. Select a role (Instructor/Staff/Learner)
3. Ask: "How do I register for a course?"
4. You should get an AI-powered response with citations!

### Access Admin Portal:
1. Go to: `https://main.xxxxx.amplifyapp.com/admin`
2. Login with `$ADMIN_EMAIL` / `TempPass123!`
3. Change password when prompted
4. Manage documents, view analytics, handle escalated queries

---

## Quick Reference

### View Deployment Status
```bash
aws codebuild list-builds --sort-order DESCENDING --max-items 1
```

### Check Amplify Deployment
```bash
aws amplify list-apps --region us-west-2
```

### View Logs
```bash
# Backend logs
aws logs tail /aws/lambda/chatResponseHandler --follow

# WebSocket logs
aws logs tail /aws/lambda/web-socket-handler --follow
```

### Get All Outputs Again
```bash
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs'
```

---

## Troubleshooting

### Issue: "Parameter already exists"
**Solution:** Delete and recreate:
```bash
aws ssm delete-parameter --name /learning-navigator/admin-email --region us-west-2
# Then re-run Command 2
```

### Issue: "CodeBuild project already exists"
**Solution:** Delete and recreate:
```bash
aws codebuild delete-project --name ncwm-chatbot-deployment --region us-west-2
# Then re-run Command 3
```

### Issue: "Bedrock Access Denied"
**Solution:** Enable models at:
https://console.aws.amazon.com/bedrock/home?region=us-west-2#/modelaccess

### Issue: "SES Email Not Verified"
**Solution:**
1. Go to https://console.aws.amazon.com/ses/
2. Verify Identities → Create identity
3. Check inbox and click verification link
4. Wait for "Verified" status

---

## CloudShell Tips

### Upload Files to CloudShell
If you need to upload local files:
1. Click **Actions** → **Upload file** in CloudShell
2. Select files and upload
3. Files appear in `/home/cloudshell-user/`

### Download Deployment Info
```bash
cat deployment-outputs.txt
```

### Extend Session
CloudShell sessions timeout after 20 minutes of inactivity.
- To keep alive: Type a command like `date` every 10 minutes
- Or use: `watch -n 600 date` (updates every 10 minutes)

### Increase CloudShell Storage
Default: 1GB persistent storage
- Stored files remain between sessions
- Located at: `/home/cloudshell-user/`

---

## Alternative: One-Line Super Quick Deploy

If you just want to test the deployment quickly:

```bash
git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git && \
cd NCMW-Learning-Navigator-chatbot && chmod +x *.sh && \
export ADMIN_EMAIL="your-email@domain.com" && \
export S3_BUCKET="your-bucket-name" && \
sed -i "s/'national-council-s3-pdfs'/'${S3_BUCKET}'/g" cdk_backend/lib/cdk_backend-stack.ts && \
aws ssm put-parameter --name "/learning-navigator/admin-email" --value "$ADMIN_EMAIL" --type "String" --overwrite --region us-west-2 && \
./deploy-codebuild.sh
```

Just replace the email and bucket name, paste, and go! ☕

---

## Cost Estimate

**Monthly cost** for ~10K conversations:
- Amazon Bedrock: $50-100
- Lambda: $1-5
- DynamoDB: $5-10
- API Gateway: $5
- S3 + Amplify: $3-8
- Other: $10-20
- **Total: $80-150/month**

---

## What Gets Deployed

**Backend (AWS):**
- 9+ Lambda functions (Node.js & Python)
- DynamoDB tables (sessions, feedback, escalations)
- API Gateway (WebSocket + REST)
- Amazon Bedrock Agent + Knowledge Base
- Cognito User Pool
- SES email notifications
- CloudWatch logs

**Frontend (Amplify):**
- React web application
- Real-time chat interface
- Admin dashboard
- Multilingual support (English/Spanish)

---

## Security Notes

✅ All credentials stay in your AWS account
✅ PDFs remain in your private S3 bucket
✅ Admin portal requires Cognito authentication
✅ API Gateway endpoints secured with IAM
✅ Frontend hosted on Amplify with HTTPS

---

## Support

**Documentation:**
- [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)
- [4-Command Deploy](4-COMMAND-DEPLOY.md)
- [Cost Analysis](COST_ESTIMATION_SIMPLE.md)

**Repository:**
https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot

---

**Questions?** Check CloudWatch logs or review the troubleshooting section above.

**Ready?** Open CloudShell and run the 3 commands! 🚀
