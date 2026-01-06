# Client Deployment Guide - Learning Navigator Chatbot

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Repository Setup](#repository-setup)
4. [Backend Deployment (AWS CDK)](#backend-deployment-aws-cdk)
5. [Knowledge Base Configuration](#knowledge-base-configuration)
6. [Frontend Deployment (AWS Amplify)](#frontend-deployment-aws-amplify)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Admin User Configuration](#admin-user-configuration)
9. [Testing & Verification](#testing--verification)
10. [Documentation & Handoff](#documentation--handoff)
11. [Post-Deployment Configuration](#post-deployment-configuration)
12. [Quick Reference](#quick-reference)
13. [Troubleshooting](#troubleshooting)
14. [Cost Estimation](#cost-estimation)

---

## Overview

This guide provides step-by-step instructions for deploying the **Learning Navigator - MHFA Learning Ecosystem AI Assistant** to a client's AWS account with a custom domain.

**Application Features:**
- AI-powered chatbot using AWS Bedrock (Claude 3.5 Sonnet)
- Guest access (no login required for main chatbot)
- Bilingual support (English/Spanish)
- Personalized recommendations based on user role
- Admin portal with analytics and content management
- Real-time WebSocket communication
- Email notifications for escalated queries

**Deployment Time:** 2-4 hours (depending on experience level)

---

## Prerequisites & Setup

### Step 1: AWS Account Setup

Ensure the client's AWS account has the following:

**Required Permissions:**
- Full access to: S3, Lambda, API Gateway, DynamoDB, Cognito, SES, Bedrock, Amplify, CloudFormation
- IAM permissions to create roles and policies
- CDK bootstrap permissions

**Recommended:** Use an IAM user with `AdministratorAccess` policy for deployment, then restrict permissions post-deployment.

### Step 2: Enable AWS Bedrock Models

Navigate to AWS Bedrock Console and enable the following models:

1. Go to AWS Console → Bedrock → Model access
2. Click "Manage model access"
3. Enable these models:
   - `TITAN_EMBED_TEXT_V2_1024` (for embeddings)
   - `ANTHROPIC_CLAUDE_HAIKU_V1_0` (for fast responses)
   - `ANTHROPIC_CLAUDE_3_5_SONNET_V2_0` (for main chatbot)
   - `NOVA_LITE` (for sentiment analysis)
4. Click "Save changes"
5. Wait for status to show "Access granted" (usually 1-5 minutes)

**Note:** If models are unavailable in your region, consider using `us-east-1` or `us-west-2`.

### Step 3: Verify Admin Email in Amazon SES

The admin email receives notifications for escalated queries.

1. Go to AWS Console → Amazon SES → Verified identities
2. Click "Create identity"
3. Select "Email address"
4. Enter the client's admin email (e.g., `admin@clientdomain.com`)
5. Click "Create identity"
6. Check the email inbox and click the verification link
7. Wait until status shows "Verified"

**Important:** SES starts in sandbox mode. For production, request production access:
- Go to SES → Account dashboard → Request production access
- Fill out the form with use case details
- Wait for AWS approval (usually 24-48 hours)

### Step 4: Install Required Tools

Install these tools on your deployment machine:

**AWS CLI:**
```bash
# Install AWS CLI
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download from: https://awscli.amazonaws.com/AWSCLIV2.msi

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-west-2), Output format (json)
```

**Node.js and npm:**
```bash
# Install Node.js (includes npm)
# macOS
brew install node

# Linux
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be v18 or higher
npm --version
```

**AWS CDK:**
```bash
# Install AWS CDK globally
npm install -g aws-cdk

# Verify installation
cdk --version
```

**Git:**
```bash
# macOS
brew install git

# Linux
sudo apt-get install git

# Windows
# Download from: https://git-scm.com/download/win

# Verify installation
git --version
```

---

## Repository Setup

### Step 5: Fork Repository to Client's GitHub

1. Have the client create a GitHub organization or use their personal account
2. Navigate to: https://github.com/KHemanthRaju/ncwm_chatbot_2
3. Click "Fork" in the top right
4. Select the client's GitHub account/organization as destination
5. Wait for forking to complete
6. New repository URL: `https://github.com/CLIENT_GITHUB_USERNAME/ncwm_chatbot_2`

**Optional: GitHub Token (for private repositories only)**

If the client's repository is private:
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "Amplify Deployment Token"
4. Select scopes:
   - `repo` (all)
   - `admin:repo_hook` (all)
5. Click "Generate token"
6. **Save the token securely** (you'll need it for deployment)

**Note:** Public repositories don't need a token.

### Step 6: Clone Repository Locally

```bash
# Clone the forked repository
git clone https://github.com/CLIENT_GITHUB_USERNAME/ncwm_chatbot_2.git
cd ncwm_chatbot_2
```

---

## Backend Deployment (AWS CDK)

### Step 7: Navigate to CDK Backend Directory

```bash
cd cdk_backend
```

### Step 8: Install CDK Dependencies

```bash
npm install
```

This installs all AWS CDK packages and dependencies defined in `package.json`.

### Step 9: Bootstrap AWS CDK

Bootstrap prepares your AWS account for CDK deployments.

**For Public Repositories (Recommended):**
```bash
cdk bootstrap --all \
  -c githubOwner=CLIENT_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=CLIENT_ADMIN_EMAIL@example.com
```

**For Private Repositories:**
```bash
cdk bootstrap --all \
  -c githubToken=YOUR_GITHUB_TOKEN_HERE \
  -c githubOwner=CLIENT_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=CLIENT_ADMIN_EMAIL@example.com
```

**Replace:**
- `CLIENT_GITHUB_USERNAME` → Client's GitHub username/org
- `CLIENT_ADMIN_EMAIL@example.com` → Client's admin email (already verified in SES)
- `YOUR_GITHUB_TOKEN_HERE` → GitHub token (if private repo)

**Expected Output:**
```
✅ Environment aws://123456789012/us-west-2 bootstrapped
```

### Step 10: Deploy CDK Stack

**For Public Repositories:**
```bash
cdk deploy --all \
  -c githubOwner=CLIENT_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=CLIENT_ADMIN_EMAIL@example.com
```

**For Private Repositories:**
```bash
cdk deploy --all \
  -c githubToken=YOUR_GITHUB_TOKEN_HERE \
  -c githubOwner=CLIENT_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=CLIENT_ADMIN_EMAIL@example.com
```

**Deployment Process:**
- CDK synthesizes CloudFormation templates
- Creates all AWS resources:
  - S3 buckets (document storage)
  - DynamoDB tables (user profiles, session logs)
  - Lambda functions (websocketHandler, cfEvaluator, email, adminFile, logclassifier, userProfile, escalatedQueries)
  - API Gateway (REST and WebSocket APIs)
  - Cognito User Pool (authentication)
  - Bedrock Knowledge Base and Agent
  - Amplify App (frontend hosting)
- Deployment takes 15-30 minutes

**Expected Output:**
```
✅ CdkBackendStack

Outputs:
CdkBackendStack.WebSocketApiUrl = wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
CdkBackendStack.RestApiUrl = https://xyz456abc.execute-api.us-west-2.amazonaws.com/prod
CdkBackendStack.UserPoolId = us-west-2_ABC123XYZ
CdkBackendStack.UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
CdkBackendStack.S3BucketName = national-council-s3-pdfs-abc123
CdkBackendStack.KnowledgeBaseId = KB123XYZ456
CdkBackendStack.AmplifyAppId = d1disyogbqgwn4
```

**⚠️ Important:** Save these output values! You'll need them for configuration and troubleshooting.

### Step 11: Verify Backend Deployment

Check that all resources were created successfully:

```bash
# List CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE

# Verify Lambda functions
aws lambda list-functions --query 'Functions[].FunctionName'

# Verify DynamoDB tables
aws dynamodb list-tables

# Verify S3 buckets
aws s3 ls

# Verify Cognito User Pool
aws cognito-idp list-user-pools --max-results 10

# Verify Bedrock Knowledge Base
aws bedrock-agent list-knowledge-bases
```

---

## Knowledge Base Configuration

### Step 12: Upload MHFA Documents to S3

Upload PDF documents containing MHFA training materials to the S3 bucket:

**Option 1: AWS Console**
1. Go to AWS Console → S3
2. Find bucket: `national-council-s3-pdfs-abc123` (from CDK outputs)
3. Click "Upload"
4. Select PDF files (course materials, instructor guides, FAQs, etc.)
5. Click "Upload"

**Option 2: AWS CLI**
```bash
# Upload a single file
aws s3 cp /path/to/document.pdf s3://national-council-s3-pdfs-abc123/

# Upload entire directory
aws s3 sync /path/to/documents/ s3://national-council-s3-pdfs-abc123/
```

**Recommended Documents:**
- MHFA course curriculum PDFs
- Instructor training guides
- Learner handbooks
- FAQs and troubleshooting guides
- Policy documents
- Assessment rubrics

### Step 13: Sync Knowledge Base

After uploading documents, sync the Bedrock Knowledge Base:

**Option 1: AWS Console**
1. Go to AWS Console → Bedrock → Knowledge bases
2. Select the knowledge base created by CDK
3. Click "Sync data sources"
4. Wait for sync to complete (status: "Available")
5. Check "Last sync" timestamp

**Option 2: AWS CLI**
```bash
# Get Knowledge Base ID from CDK outputs
KB_ID="KB123XYZ456"  # Replace with your KB ID

# Get Data Source ID
DATA_SOURCE_ID=$(aws bedrock-agent list-data-sources \
  --knowledge-base-id $KB_ID \
  --query 'dataSourceSummaries[0].dataSourceId' \
  --output text)

# Start ingestion job
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID

# Check ingestion job status
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --ingestion-job-id JOB_ID  # Replace with job ID from previous command
```

**Expected Sync Time:** 5-15 minutes (depending on document count and size)

---

## Frontend Deployment (AWS Amplify)

### Step 14: Verify Amplify App

The CDK deployment automatically created an Amplify app connected to the GitHub repository.

**Check Amplify App:**
1. Go to AWS Console → AWS Amplify
2. Find app: "National Council Chatbot"
3. Click on the app
4. Verify:
   - Repository: Connected to `CLIENT_GITHUB_USERNAME/ncwm_chatbot_2`
   - Branch: `main` (or `master`)
   - Build status: Should trigger automatically

**Amplify Auto-Build:**
- Amplify automatically builds the frontend on every git push to the main branch
- Build process:
  1. Installs dependencies (`npm install`)
  2. Builds React app (`npm run build`)
  3. Deploys to Amplify hosting
  4. Generates SSL certificate
  5. Provides public URL

### Step 15: Access Amplify App URL

1. In Amplify Console, click on the app
2. Find the default domain (e.g., `https://main.d1disyogbqgwn4.amplifyapp.com`)
3. Click the URL to open the chatbot
4. Verify:
   - Chat interface loads
   - Language toggle works (EN ↔ ES)
   - Profile icon appears in header
   - Guest access works (no login required)

**Test Basic Functionality:**
- Type a sample query: "What is Mental Health First Aid?"
- Verify response appears
- Test language toggle
- Click profile icon (should see role selection)

---

## Custom Domain Setup

### Step 16: Configure Custom Domain in Route 53

If the client wants to use a custom domain (e.g., `chatbot.clientdomain.com`):

**Prerequisites:**
- Client owns the domain
- Domain DNS is managed in AWS Route 53 (or can be migrated)

**Steps:**

1. **Verify Domain in Route 53:**
   - Go to AWS Console → Route 53 → Hosted zones
   - Ensure the client's domain is listed (e.g., `clientdomain.com`)
   - If not, create a hosted zone:
     - Click "Create hosted zone"
     - Enter domain name: `clientdomain.com`
     - Type: Public hosted zone
     - Click "Create"
     - Update domain registrar nameservers with Route 53 nameservers

2. **Add Custom Domain in Amplify:**
   - Go to Amplify Console → App → Domain management
   - Click "Add domain"
   - Enter domain: `clientdomain.com`
   - Select subdomain: `chatbot` (creates `chatbot.clientdomain.com`)
   - Click "Configure domain"
   - Amplify automatically:
     - Creates SSL certificate via ACM
     - Creates Route 53 DNS records
     - Validates domain ownership
   - Wait for SSL certificate validation (5-30 minutes)

3. **Verify SSL Certificate:**
   - Go to AWS Certificate Manager (ACM)
   - Find certificate for `chatbot.clientdomain.com`
   - Status should be "Issued"

### Step 17: Update Environment Variables

Update the frontend to use the custom domain:

1. Go to Amplify Console → App → Environment variables
2. Add/update:
   - `REACT_APP_WEBSOCKET_API`: `wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod`
   - `REACT_APP_ANALYTICS_API`: `https://xyz456abc.execute-api.us-west-2.amazonaws.com/prod`
   - `REACT_APP_COGNITO_USER_POOL_ID`: `us-west-2_ABC123XYZ`
   - `REACT_APP_COGNITO_CLIENT_ID`: `1a2b3c4d5e6f7g8h9i0j`

**Get values from CDK outputs in Step 10.**

3. Click "Save"
4. Trigger a new build:
   - Go to Amplify Console → App → Build settings
   - Click "Redeploy this version"

### Step 18: Test Custom Domain

1. Wait for Amplify build to complete (~5 minutes)
2. Navigate to `https://chatbot.clientdomain.com`
3. Verify:
   - SSL certificate is valid (green lock icon)
   - Chat interface loads correctly
   - All functionality works (language toggle, profile, chat)

---

## Admin User Configuration

### Step 19: Create Admin User in Cognito

Create an admin user for accessing the admin portal:

**Option 1: AWS Console**
1. Go to AWS Console → Cognito → User Pools
2. Select the user pool (from CDK outputs)
3. Click "Users" → "Create user"
4. Fill in:
   - Username: `admin` (or client's preferred username)
   - Email: `admin@clientdomain.com` (must match verified SES email)
   - Temporary password: Generate a strong password
   - Mark email as verified: ✓
5. Click "Create user"

**Option 2: AWS CLI**
```bash
# Replace with your User Pool ID from CDK outputs
USER_POOL_ID="us-west-2_ABC123XYZ"

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=admin@clientdomain.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Set permanent password (optional)
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin \
  --password "SecurePassword123!" \
  --permanent
```

### Step 20: Test Admin Portal Login

1. Navigate to the Amplify app URL (or custom domain)
2. Click "Admin Portal" link (or navigate to `/admin`)
3. Login with:
   - Username: `admin`
   - Password: (temporary or permanent password from Step 19)
4. If using temporary password, set a new permanent password
5. Verify admin portal loads:
   - Dashboard with analytics
   - Document management
   - Session logs
   - Escalated queries

---

## Testing & Verification

### Step 21: Test Main Chatbot (Guest Mode)

**Test Cases:**

1. **Basic Chat Functionality:**
   - Open chatbot URL
   - Type: "What is Mental Health First Aid?"
   - Verify: Response appears with relevant information from knowledge base
   - Check: Citations are included

2. **Language Toggle:**
   - Click language toggle button (globe icon)
   - Verify: UI switches to Spanish (or English)
   - Type a query in the selected language
   - Verify: Response is in the same language

3. **Guest Access:**
   - Open in incognito/private browser window
   - Verify: Chat works without login
   - Type a query
   - Verify: Response appears

4. **Personalized Recommendations:**
   - Click profile icon (person icon)
   - Select a role: Instructor / Staff / Learner
   - Click "Continue"
   - Verify: Recommendations tab shows role-specific quick actions
   - Click a sample query chip
   - Verify: Navigates to chat with query pre-filled

5. **WebSocket Connection:**
   - Open browser console (F12)
   - Type a query
   - Check console for WebSocket messages (should not show errors)
   - Verify: Streaming response appears in real-time

### Step 22: Test Admin Portal

**Test Cases:**

1. **Login:**
   - Navigate to `/admin`
   - Login with admin credentials
   - Verify: Dashboard loads

2. **Document Management:**
   - Go to Documents tab
   - Upload a PDF file
   - Verify: File appears in list
   - Trigger knowledge base sync
   - Wait for sync to complete

3. **Session Logs:**
   - Go to Session Logs tab
   - Verify: Chat sessions are logged
   - Check sentiment scores (0-100 scale)
   - Filter by date range

4. **Escalated Queries:**
   - Go to Escalated Queries tab
   - Verify: Low-confidence queries appear
   - Test email notification by triggering a low-confidence query

5. **Analytics:**
   - Go to Analytics tab
   - Verify: Charts display:
     - Total sessions
     - Average sentiment score
     - Queries per day
     - Top topics

### Step 23: Test Email Notifications

**Trigger Escalation:**

1. Ask a query the knowledge base cannot answer:
   - Example: "What is the meaning of life?"
   - Or: "Tell me about quantum physics"

2. Expected behavior:
   - Chatbot asks for email address
   - User provides email
   - Admin receives email notification:
     - Subject: "Learning Navigator - Query Requires Expert Attention"
     - Body: User query, user email, timestamp
     - Sent to: Admin email (verified in SES)

3. Verify email received:
   - Check admin email inbox
   - Verify email format and content

4. Admin replies:
   - Reply to the email
   - Include answer in email body
   - Answer should be indexed in knowledge base (for future queries)

---

## Documentation & Handoff

### Step 24: Compile Client Documentation

Create a handoff package for the client:

**Documents to Include:**

1. **AWS Resources List:**
   - S3 buckets (names and purposes)
   - Lambda functions (names and descriptions)
   - DynamoDB tables (names and schemas)
   - API Gateway endpoints (URLs)
   - Cognito User Pool (ID and settings)
   - Bedrock Knowledge Base (ID and data sources)
   - Amplify App (URL and domain)

2. **Admin Credentials:**
   - Cognito username
   - Instructions for password reset
   - Link to admin portal

3. **Application URLs:**
   - Production URL (Amplify or custom domain)
   - Admin portal URL
   - API endpoints

4. **Maintenance Procedures:**
   - How to upload new documents
   - How to sync knowledge base
   - How to create new admin users
   - How to view CloudWatch logs

5. **Cost Breakdown:**
   - Monthly cost estimate
   - Breakdown by service
   - Cost optimization tips

### Step 25: Train Client Team

Schedule a training session covering:

1. **Using the Admin Portal:**
   - Login and navigation
   - Uploading documents
   - Reviewing session logs
   - Monitoring escalated queries
   - Viewing analytics

2. **Managing Knowledge Base:**
   - Document best practices (format, size, content)
   - Syncing process
   - How long sync takes
   - Verifying sync success

3. **Monitoring & Troubleshooting:**
   - Checking CloudWatch logs
   - Understanding error messages
   - When to contact support
   - How to interpret analytics

4. **User Support:**
   - Common user issues
   - How to help users with role selection
   - Language toggle troubleshooting
   - WebSocket connection issues

---

## Post-Deployment Configuration

### Step 26: Set Up CloudWatch Alarms

Create alarms for critical metrics:

```bash
# Lambda error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "ChatbotLambdaErrors" \
  --alarm-description "Alert when Lambda error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name "ChatbotAPI5xxErrors" \
  --alarm-description "Alert when API returns 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# DynamoDB throttling
aws cloudwatch put-metric-alarm \
  --alarm-name "ChatbotDynamoDBThrottling" \
  --alarm-description "Alert when DynamoDB requests are throttled" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Step 27: Configure Backup Strategy

**S3 Bucket Versioning:**
```bash
# Enable versioning on PDF bucket
aws s3api put-bucket-versioning \
  --bucket national-council-s3-pdfs-abc123 \
  --versioning-configuration Status=Enabled

# Enable lifecycle policy to archive old versions to Glacier
aws s3api put-bucket-lifecycle-configuration \
  --bucket national-council-s3-pdfs-abc123 \
  --lifecycle-configuration file://lifecycle.json
```

**DynamoDB Backups:**
```bash
# Enable point-in-time recovery for session logs table
aws dynamodb update-continuous-backups \
  --table-name NCWMSessionLogs \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Enable point-in-time recovery for user profiles table
aws dynamodb update-continuous-backups \
  --table-name NCMWUserProfiles \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Step 28: Set Up Monitoring Dashboard

Create a CloudWatch dashboard for easy monitoring:

1. Go to AWS Console → CloudWatch → Dashboards
2. Click "Create dashboard"
3. Name: "Learning Navigator Monitoring"
4. Add widgets:
   - **Lambda Invocations** (line graph): All Lambda functions
   - **API Gateway Requests** (line graph): Total requests and error rate
   - **DynamoDB Operations** (line graph): Read/write operations
   - **Bedrock API Calls** (number): Total invocations
   - **WebSocket Connections** (number): Active connections
   - **Amplify Build Status** (log widget): Recent builds
5. Save dashboard

---

## Quick Reference

### Environment-Specific URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Production** | `https://chatbot.clientdomain.com` | Main chatbot (guest access) |
| **Admin Portal** | `https://chatbot.clientdomain.com/admin` | Admin dashboard (auth required) |
| **Default Amplify** | `https://main.d1disyogbqgwn4.amplifyapp.com` | Amplify default URL (before custom domain) |
| **WebSocket API** | `wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod` | Real-time chat WebSocket |
| **REST API** | `https://xyz456abc.execute-api.us-west-2.amazonaws.com/prod` | Admin and analytics API |

### Key AWS Resource IDs

| Resource | Example ID | How to Find |
|----------|-----------|-------------|
| **User Pool ID** | `us-west-2_ABC123XYZ` | Cognito → User Pools |
| **User Pool Client ID** | `1a2b3c4d5e6f7g8h9i0j` | Cognito → User Pool → App clients |
| **Knowledge Base ID** | `KB123XYZ456` | Bedrock → Knowledge bases |
| **S3 Bucket Name** | `national-council-s3-pdfs-abc123` | S3 → Buckets |
| **Amplify App ID** | `d1disyogbqgwn4` | Amplify → Apps |

### Common Commands

**Redeploy Backend:**
```bash
cd cdk_backend
cdk deploy --all \
  -c githubOwner=CLIENT_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=CLIENT_ADMIN_EMAIL@example.com
```

**Sync Knowledge Base:**
```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id KB123XYZ456 \
  --data-source-id DATA_SOURCE_ID
```

**View Lambda Logs:**
```bash
aws logs tail /aws/lambda/websocketHandler --follow
```

**Trigger Amplify Build:**
```bash
# From local repository
git add .
git commit -m "Trigger build"
git push origin main
```

---

## Troubleshooting

### Issue 1: Chatbot Not Responding

**Symptoms:**
- User types query, no response appears
- "Connecting..." message persists

**Diagnosis:**
```bash
# Check WebSocket Lambda logs
aws logs tail /aws/lambda/websocketHandler --follow

# Check Bedrock agent status
aws bedrock-agent get-agent --agent-id AGENT_ID

# Test WebSocket connection
wscat -c wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
```

**Solutions:**
- Verify Bedrock models are enabled (Step 2)
- Check Lambda function has Bedrock permissions
- Verify Knowledge Base is synced (Step 13)
- Check CloudWatch logs for error messages

### Issue 2: Admin Portal Login Fails

**Symptoms:**
- "Incorrect username or password" error
- User exists in Cognito but can't login

**Diagnosis:**
```bash
# Check user status
aws cognito-idp admin-get-user \
  --user-pool-id us-west-2_ABC123XYZ \
  --username admin
```

**Solutions:**
- Reset user password:
  ```bash
  aws cognito-idp admin-set-user-password \
    --user-pool-id us-west-2_ABC123XYZ \
    --username admin \
    --password "NewPassword123!" \
    --permanent
  ```
- Verify email is verified
- Check Cognito User Pool Client ID in environment variables

### Issue 3: Documents Not Appearing in Knowledge Base

**Symptoms:**
- Uploaded PDFs to S3 but chatbot doesn't have the information
- "I don't have enough information" responses

**Diagnosis:**
```bash
# Check S3 bucket contents
aws s3 ls s3://national-council-s3-pdfs-abc123/

# Check knowledge base sync status
aws bedrock-agent list-data-sources \
  --knowledge-base-id KB123XYZ456
```

**Solutions:**
- Sync knowledge base (Step 13)
- Verify PDFs are text-searchable (not scanned images)
- Check PDF file size (max 10 MB per file)
- Wait 5-15 minutes after sync for indexing to complete

### Issue 4: Email Notifications Not Sending

**Symptoms:**
- Escalated queries not triggering emails
- Admin email not received

**Diagnosis:**
```bash
# Check SES identity status
aws ses get-identity-verification-attributes \
  --identities admin@clientdomain.com

# Check Lambda email function logs
aws logs tail /aws/lambda/emailHandler --follow

# Check SES sending quota
aws ses get-send-quota
```

**Solutions:**
- Verify email in SES (Step 3)
- Request SES production access if in sandbox mode
- Check Lambda function has SES permissions
- Verify Lambda function environment variables include admin email

### Issue 5: Custom Domain SSL Certificate Pending

**Symptoms:**
- Custom domain shows "Certificate pending validation"
- Domain not accessible after 30+ minutes

**Diagnosis:**
```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Check Route 53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id HOSTED_ZONE_ID
```

**Solutions:**
- Verify Route 53 nameservers match domain registrar
- Wait up to 48 hours for DNS propagation
- Manually validate certificate:
  - Go to ACM → Certificate → Domains
  - Create CNAME record in Route 53 with values shown
- Delete and recreate custom domain in Amplify

---

## Cost Estimation

### Monthly Cost Breakdown

**Estimated Total: $80 - $315/month**

| Service | Usage Estimate | Cost Range |
|---------|---------------|-----------|
| **AWS Bedrock** | 100,000 tokens/month | $20 - $150 |
| **AWS Lambda** | 500,000 invocations/month | $5 - $15 |
| **API Gateway** | 1M WebSocket messages/month | $3 - $10 |
| **DynamoDB** | 10GB storage, 100K reads/writes | $5 - $20 |
| **S3** | 50GB storage, 10K requests | $3 - $8 |
| **Amplify Hosting** | 1 app, 50GB data transfer | $5 - $15 |
| **Cognito** | 1,000 monthly active users | $5 - $15 |
| **SES** | 1,000 emails/month | $1 - $5 |
| **CloudWatch** | 10GB logs, 10 metrics | $5 - $15 |
| **Route 53** | 1 hosted zone | $0.50/month |
| **ACM** | SSL certificate | Free |

**Cost Variables:**
- **Bedrock usage** is the largest cost factor (depends on query volume)
- **API Gateway WebSocket** costs scale with active connections
- **DynamoDB** costs scale with read/write operations

**Cost Optimization Tips:**
1. **Use Bedrock Haiku** for low-importance queries (10x cheaper than Sonnet)
2. **Enable DynamoDB on-demand pricing** for unpredictable workloads
3. **Set S3 lifecycle policies** to archive old documents to Glacier
4. **Configure Lambda reserved concurrency** to prevent runaway costs
5. **Use CloudWatch Logs retention policies** (7-30 days) to reduce storage costs

**Monitoring Costs:**
- Set up AWS Budgets alerts:
  ```bash
  aws budgets create-budget \
    --account-id 123456789012 \
    --budget file://budget.json \
    --notifications-with-subscribers file://notifications.json
  ```
- Create budget with $300/month threshold and email alerts

---

## Additional Resources

### Documentation Links

- **AWS Bedrock Documentation:** https://docs.aws.amazon.com/bedrock/
- **AWS CDK Documentation:** https://docs.aws.amazon.com/cdk/
- **AWS Amplify Documentation:** https://docs.amplify.aws/
- **React Documentation:** https://react.dev/
- **Material-UI Documentation:** https://mui.com/

### Support Contacts

**AWS Support:**
- Console: AWS Support Center in AWS Console
- Phone: Available with paid support plans
- Email: Available with paid support plans

**Application Support:**
- GitHub Repository: https://github.com/CLIENT_GITHUB_USERNAME/ncwm_chatbot_2
- Create issues for bugs or feature requests

### Maintenance Schedule

**Recommended Maintenance Tasks:**

**Weekly:**
- Review CloudWatch logs for errors
- Check session logs in admin portal
- Monitor escalated queries

**Monthly:**
- Review and optimize DynamoDB capacity
- Check AWS cost and usage reports
- Update knowledge base documents
- Review CloudWatch alarms and metrics

**Quarterly:**
- Update Lambda function dependencies
- Review and update Bedrock models (new versions)
- Test disaster recovery procedures
- Review user feedback and analytics

**Annually:**
- Review AWS service pricing (AWS often reduces prices)
- Optimize architecture based on usage patterns
- Update documentation
- Conduct security audit

---

## Success Criteria

After completing this deployment guide, verify the following:

✅ **Backend Deployed:**
- [ ] All CDK stacks deployed successfully
- [ ] Lambda functions operational
- [ ] API Gateway endpoints accessible
- [ ] DynamoDB tables created
- [ ] Bedrock Knowledge Base configured

✅ **Frontend Deployed:**
- [ ] Amplify app builds successfully
- [ ] Application accessible via URL
- [ ] Custom domain (if configured) resolves correctly
- [ ] SSL certificate valid

✅ **Functionality Tested:**
- [ ] Main chatbot responds to queries
- [ ] Language toggle works (EN ↔ ES)
- [ ] Personalized recommendations display
- [ ] Admin portal accessible
- [ ] Document upload works
- [ ] Email notifications send

✅ **Monitoring Configured:**
- [ ] CloudWatch dashboard created
- [ ] Alarms set up
- [ ] Cost monitoring enabled
- [ ] Backup strategy implemented

✅ **Documentation Complete:**
- [ ] Client handoff package prepared
- [ ] Admin credentials provided
- [ ] Training session completed
- [ ] Support contacts shared

---

## Conclusion

Congratulations! You have successfully deployed the **Learning Navigator - MHFA Learning Ecosystem AI Assistant** to the client's AWS account.

**Next Steps:**
1. Monitor the application for the first week
2. Collect user feedback
3. Schedule regular maintenance
4. Plan future enhancements

**For Questions or Issues:**
- Review the Troubleshooting section
- Check AWS CloudWatch logs
- Create a GitHub issue in the repository

**Thank you for using this deployment guide!**

---

**Document Version:** 1.0
**Last Updated:** January 2, 2026
**Prepared By:** Development Team
**Client:** Learning Navigator Deployment
