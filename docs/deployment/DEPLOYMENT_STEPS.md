# AWS Project Deployment - Step-by-Step Explained

**Total Time:** ~25-30 minutes (mostly automated)
**Difficulty:** Beginner-friendly

---

## 📋 Table of Contents

1. [Prerequisites Explained](#prerequisites-explained)
2. [Step 1: Clone and Setup](#step-1-clone-and-setup)
3. [Step 2: Configure Deployment](#step-2-configure-deployment)
4. [Step 3: Deploy Everything](#step-3-deploy-everything)
5. [What Happens Behind the Scenes](#what-happens-behind-the-scenes)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Understanding the Output](#understanding-the-output)

---

## Prerequisites Explained

Before deploying, you need to prepare 3 things. Here's why each is important:

### 1️⃣ Enable Bedrock AI Models (5 minutes)

**Why:** The chatbot uses Amazon Bedrock AI models to understand questions and generate intelligent responses.

**How to do it:**
1. Go to https://console.aws.amazon.com/bedrock/
2. Click **"Model access"** in the left sidebar
3. Click **"Manage model access"** button
4. Enable these 2 models:
   - ✅ **Anthropic Claude 4 Sonnet** - Powers the intelligent chat responses
   - ✅ **Amazon Titan Embeddings Text v2** - Converts documents into searchable data
5. Click **"Save changes"**

**What this means:** These models are free to enable but you pay only when they're used (per request). Claude 4 Sonnet generates human-like responses, while Titan Embeddings helps search through your documents.

---

### 2️⃣ Verify Admin Email in SES (2 minutes)

**Why:** The chatbot sends email notifications when users ask complex questions that need human expert attention.

**How to do it:**
1. Go to https://console.aws.amazon.com/ses/
2. Click **"Verified identities"** → **"Create identity"**
3. Select **"Email address"**
4. Enter your admin email (e.g., `admin@yourdomain.com`)
5. Click **"Create identity"**
6. Check your email inbox
7. Click the verification link in the email from AWS
8. Wait until status shows **"Verified"** (refresh the page)

**What this means:** AWS requires email verification to prevent spam. This ensures only legitimate emails can be sent from your account. Your admin will receive escalated questions at this email address.

---

### 3️⃣ Upload Documents to S3 (10 minutes)

**Why:** Your documents (PDFs, Word docs, etc.) become the chatbot's knowledge base. The AI searches these documents to answer questions.

**How to do it:**
1. Go to https://console.aws.amazon.com/s3/
2. Click **"Create bucket"**
3. Enter a unique bucket name (e.g., `mhfa-chatbot-docs-2026`)
   - Must be globally unique
   - Use lowercase letters, numbers, and hyphens only
4. Select region: **US West (Oregon) us-west-2**
5. Keep all other defaults
6. Click **"Create bucket"**
7. Click on your new bucket name
8. Click **"Create folder"** → Name it `pdfs`
9. Click into the `pdfs/` folder
10. Click **"Upload"** → **"Add files"**
11. Select your training documents (PDF, TXT, MD, DOCX, HTML)
12. Click **"Upload"**
13. **Write down your bucket name** - you'll need it in Step 2!

**What this means:** Your documents stay private in your AWS account. The chatbot will read these to answer user questions with accurate, source-backed information.

---

## Step 1: Clone and Setup

### Open AWS CloudShell

**What is CloudShell?**
AWS CloudShell is a free, pre-configured Linux terminal that runs directly in your web browser. It comes with:
- ✅ AWS CLI already installed and configured with your credentials
- ✅ Git, Python, Node.js pre-installed
- ✅ 1GB persistent storage that saves between sessions
- ✅ No need to install anything on your local computer

**How to open CloudShell:**
1. Log into AWS Console: https://console.aws.amazon.com/
2. Look for the **CloudShell icon** (>_) in the top navigation bar (next to the search box)
3. Click it
4. Wait 15-30 seconds for CloudShell to initialize

You'll see a terminal prompt like: `[cloudshell-user@ip-xxx ~]$`

---

### Command 1: Clone and Setup

**Copy and paste this entire command:**

```bash
git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git && \
cd NCMW-Learning-Navigator-chatbot && \
chmod +x scripts/*.sh
```

**What this does - Line by Line:**

#### Line 1: `git clone https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git`
- **What:** Downloads the chatbot source code from GitHub to your CloudShell
- **Why:** You need the deployment scripts and application code
- **What happens:** Creates a folder called `NCMW-Learning-Navigator-chatbot` with all the files
- **Output you'll see:**
  ```
  Cloning into 'NCMW-Learning-Navigator-chatbot'...
  remote: Enumerating objects: 1234, done.
  remote: Counting objects: 100% (1234/1234), done.
  ```

#### Line 2: `cd NCMW-Learning-Navigator-chatbot`
- **What:** Changes directory into the downloaded folder
- **Why:** All the deployment scripts are inside this folder
- **What happens:** Your terminal prompt will change to show you're in the project folder
- **Output you'll see:** Prompt changes to `[cloudshell-user@ip-xxx NCMW-Learning-Navigator-chatbot]$`

#### Line 3: `chmod +x scripts/*.sh`
- **What:** Makes all shell scripts in the scripts folder executable (runnable)
- **Why:** Downloaded scripts aren't executable by default for security
- **What happens:** Adds execute permissions to all scripts in the `scripts/` folder
- **Output you'll see:** Nothing (success is silent)

**Summary:** After this command, you have all the code and scripts ready to run in CloudShell.

---

## Step 2: Configure Deployment

### Command 2: Configure (Replace with Your Values)

**⚠️ IMPORTANT: Replace these values before running:**
- `your-email@domain.com` → Your verified SES email from Prerequisites
- `your-bucket-name` → Your S3 bucket name from Prerequisites

```bash
export ADMIN_EMAIL="your-email@domain.com"
export S3_BUCKET="your-bucket-name"

sed -i "s/'national-council-s3-pdfs'/'${S3_BUCKET}'/g" cdk_backend/lib/cdk_backend-stack.ts

aws ssm put-parameter \
  --name "/learning-navigator/admin-email" \
  --value "$ADMIN_EMAIL" \
  --type "String" \
  --overwrite \
  --region us-west-2
```

**What this does - Line by Line:**

#### Line 1-2: Export Variables
```bash
export ADMIN_EMAIL="your-email@domain.com"
export S3_BUCKET="your-bucket-name"
```
- **What:** Creates temporary environment variables in your CloudShell session
- **Why:** Makes it easy to use these values in multiple places without retyping
- **What happens:** These values are stored in memory (disappear when you close CloudShell)
- **Example:**
  ```bash
  export ADMIN_EMAIL="admin@mhfa.org"
  export S3_BUCKET="mhfa-chatbot-docs-2026"
  ```

#### Line 3: Update CDK Configuration
```bash
sed -i "s/'national-council-s3-pdfs'/'${S3_BUCKET}'/g" cdk_backend/lib/cdk_backend-stack.ts
```
- **What:** Finds and replaces the default bucket name with YOUR bucket name in the infrastructure code
- **Why:** The CDK stack needs to know which S3 bucket contains your documents
- **What happens:**
  - Opens the file `cdk_backend/lib/cdk_backend-stack.ts`
  - Finds the line with `'national-council-s3-pdfs'`
  - Replaces it with your `$S3_BUCKET` value
  - Saves the file
- **Example:** If your bucket is `mhfa-chatbot-docs-2026`, the code changes from:
  ```typescript
  'national-council-s3-pdfs'  // Default
  ```
  to:
  ```typescript
  'mhfa-chatbot-docs-2026'    // Your bucket
  ```
- **Output you'll see:** Nothing (success is silent)

#### Line 4-9: Store Admin Email in AWS Parameter Store
```bash
aws ssm put-parameter \
  --name "/learning-navigator/admin-email" \
  --value "$ADMIN_EMAIL" \
  --type "String" \
  --overwrite \
  --region us-west-2
```
- **What:** Stores your admin email in AWS Systems Manager Parameter Store
- **Why:** The deployment script needs to read this email during deployment
- **What happens:**
  - Connects to AWS Systems Manager in us-west-2 region
  - Creates (or overwrites) a parameter named `/learning-navigator/admin-email`
  - Stores your email as a String type
  - This parameter is encrypted and secure
- **Output you'll see:**
  ```
  {
      "Version": 1,
      "Tier": "Standard"
  }
  ```

**Summary:** After this command, your configuration is saved and ready for deployment.

---

## Step 3: Deploy Everything

### Command 3: Deploy Everything

**Copy and paste this command:**

```bash
./scripts/deploy-codebuild.sh
```

**What this does:**

This single script orchestrates the **entire deployment** automatically. Here's what happens step-by-step:

### Phase 1: Validation (30 seconds)
```
✅ Verifying AWS credentials...
✅ AWS Account ID: 123456789012
ℹ️  Region: us-west-2
ℹ️  Checking AWS Systems Manager parameters...
✅ Parameters found:
    GitHub Repo: https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git
    Admin Email: admin@mhfa.org
```

**What's happening:**
- Checks your AWS account ID is valid
- Confirms the region is us-west-2
- Verifies your admin email was saved in Step 2
- Confirms the GitHub repository URL

---

### Phase 2: CodeBuild Project Setup (1 minute)
```
ℹ️  Setting up CodeBuild service role...
✅ Service role created: ncwm-codebuild-service-role
ℹ️  Creating CodeBuild project...
✅ CodeBuild project created: ncwm-chatbot-deployment
```

**What's happening:**
1. **Creates IAM Role:**
   - Name: `ncwm-codebuild-service-role`
   - Permissions: AdministratorAccess (needed to create all AWS resources)
   - Trust policy: Allows CodeBuild service to assume this role

2. **Creates CodeBuild Project:**
   - Name: `ncwm-chatbot-deployment`
   - Source: Your GitHub repository (public, no credentials needed)
   - Build spec: Uses `buildspec.yml` from the repository
   - Environment: Linux container with Node.js 18, Python 3.12
   - Compute: Medium instance (sufficient for deployment)

---

### Phase 3: Automated Build (20-25 minutes)
```
✅ Build started: ncwm-chatbot-deployment:1234abcd-5678-90ef-ghij-klmnopqrstuv
ℹ️  Monitoring build progress...

ℹ️  Phase: Queued
ℹ️  Phase: Provisioning build environment...
ℹ️  Phase: Downloading source code...
ℹ️  Phase: Installing dependencies (Node.js, Python, CDK)...
ℹ️  Phase: Pre-build validation...
ℹ️  Phase: Building and deploying (Backend + Frontend)...
ℹ️  Phase: Post-build and Amplify deployment...
ℹ️  Phase: Finalizing...
✅ Build completed successfully!
```

**What's happening behind the scenes:**

#### Install Phase (2-3 minutes)
- Installs Node.js 18 and Python 3.12
- Installs AWS CDK globally (`npm install -g aws-cdk`)
- Installs AWS CLI latest version
- Installs Amplify CLI
- **Output:** All tools needed for deployment are ready

#### Pre-Build Phase (1 minute)
- Validates AWS credentials work
- Checks admin email parameter exists
- Confirms GitHub repository is accessible
- Validates required environment variables
- **Output:** All prerequisites are satisfied

#### Build Phase - Backend Deployment (12-15 minutes)
This is where the magic happens! The build process:

1. **Installs Backend Dependencies (1 min):**
   ```
   cd cdk_backend
   npm install
   ```
   - Installs AWS CDK libraries
   - Installs Lambda function dependencies

2. **Synthesizes CDK Stack (30 seconds):**
   ```
   cdk synth
   ```
   - Converts TypeScript infrastructure code into CloudFormation templates
   - Validates all resource configurations
   - Creates deployment artifacts

3. **Bootstraps CDK (1 min - first time only):**
   ```
   cdk bootstrap aws://ACCOUNT_ID/us-west-2
   ```
   - Creates S3 bucket for CDK assets
   - Sets up IAM roles for CDK deployments
   - Only runs if not already bootstrapped

4. **Deploys CDK Stack (10-12 minutes):**
   ```
   cdk deploy --require-approval never
   ```

   **Creates 50+ AWS resources in this order:**

   **Storage (1 min):**
   - DynamoDB Table: `SessionLogs` (stores chat conversations)
   - DynamoDB Table: `Feedback` (stores user ratings)
   - DynamoDB Table: `EscalatedQueries` (stores questions needing expert help)
   - S3 Bucket: For email attachments
   - S3 Bucket: For supplemental data

   **AI & Knowledge Base (2 min):**
   - Bedrock Knowledge Base (connects to your S3 bucket)
   - Bedrock Agent (orchestrates AI responses)
   - OpenSearch Serverless Collection (indexes your documents)
   - Vector Index (enables semantic search)

   **Lambda Functions (3 min):**
   - `websocketHandler` - Manages real-time chat connections
   - `chatResponseHandler` - Processes user messages and gets AI responses
   - `logclassifier` - Analyzes sentiment of conversations
   - `retrieveSessionLogs` - Fetches chat history for admin
   - `responseFeedback` - Handles thumbs up/down ratings
   - `userProfile` - Manages user roles and preferences
   - `escalatedQueries` - Handles complex questions
   - `email` - Sends notification emails
   - `adminFile` - Manages document uploads

   **API Gateway (1 min):**
   - WebSocket API (for real-time chat)
   - REST API (for admin operations)
   - Routes and integrations
   - IAM authorization

   **Authentication (1 min):**
   - Cognito User Pool (admin logins)
   - Cognito User Pool Client
   - User Pool Domain

   **Monitoring (1 min):**
   - CloudWatch Log Groups (one per Lambda)
   - CloudWatch Alarms
   - EventBridge Rules (scheduled tasks)

   **Frontend Hosting (2 min):**
   - Amplify App (hosts React frontend)
   - Amplify Branch (main branch)
   - GitHub integration (public repo)

5. **Captures Stack Outputs:**
   ```
   --outputs-file outputs.json
   ```
   - Saves all important values (URLs, IDs) to a file
   - These are used by the frontend deployment

#### Build Phase - Frontend Deployment (5-7 minutes)

1. **Extracts API Endpoints (30 seconds):**
   - Reads `outputs.json`
   - Extracts WebSocket URL, API Gateway URL, User Pool ID, Amplify App ID
   - Creates environment variables

2. **Creates Production Environment (30 seconds):**
   ```
   cat > .env.production << EOF
   REACT_APP_API_ENDPOINT=$API_GATEWAY_URL
   REACT_APP_WS_ENDPOINT=$WEBSOCKET_URL
   REACT_APP_COGNITO_USER_POOL_ID=$USER_POOL_ID
   ...
   EOF
   ```
   - Configures frontend to connect to your backend
   - Sets production flags
   - Disables debug logging

3. **Installs Frontend Dependencies (1 min):**
   ```
   cd frontend
   npm ci --production=false
   ```
   - Installs all React dependencies
   - Installs build tools

4. **Builds Production Bundle (2 min):**
   ```
   npm run build
   ```
   - Compiles React TypeScript to JavaScript
   - Minifies and optimizes code
   - Creates production-ready static files
   - Output: `build/` folder with optimized app

5. **Deploys to Amplify (2-3 min):**
   ```
   zip -q -r build.zip build/
   aws amplify create-deployment --app-id $AMPLIFY_APP_ID
   curl -H "Content-Type: application/zip" "$UPLOAD_URL" --upload-file build.zip
   aws amplify start-deployment
   ```
   - Zips the build folder
   - Uploads to Amplify
   - Deploys to production
   - Waits for deployment to complete

#### Post-Build Phase (1 minute)
- Saves deployment information
- Displays all URLs and IDs
- Creates deployment report

---

### Phase 4: Deployment Complete! 🎉

After 20-25 minutes, you'll see:

```
==========================================
✅ DEPLOYMENT SUCCESSFUL!
==========================================

🌐 Application URL:
   https://main.d1disyogbqgwn4.amplifyapp.com

📊 Admin Dashboard:
   https://main.d1disyogbqgwn4.amplifyapp.com/admin

🔗 Backend APIs:
   WebSocket: wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
   REST API: https://xyz789abc.execute-api.us-west-2.amazonaws.com/prod

👤 Admin Login:
   Email: admin@mhfa.org
   (Check email for temporary password)

==========================================
```

**What you've just deployed:**

**Backend (15+ AWS services):**
- ✅ 9 Lambda functions processing requests
- ✅ 3 DynamoDB tables storing data
- ✅ 2 API Gateways (WebSocket + REST)
- ✅ 1 Bedrock Knowledge Base with AI agent
- ✅ 1 Cognito User Pool for admin authentication
- ✅ 1 OpenSearch collection for document search
- ✅ 1 Amplify app hosting the frontend
- ✅ CloudWatch logs and monitoring
- ✅ EventBridge scheduled tasks

**Frontend (React Application):**
- ✅ Real-time chat interface
- ✅ Admin dashboard with analytics
- ✅ Document management system
- ✅ Multilingual support (English/Spanish)
- ✅ Role-based recommendations
- ✅ Responsive design (mobile-friendly)

---

## What Happens Behind the Scenes

### Detailed Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Your CloudShell                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Clone repository from GitHub                      │  │
│  │  2. Configure with your email & S3 bucket            │  │
│  │  3. Run deploy-codebuild.sh                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 AWS CodeBuild                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Creates build container with:                        │  │
│  │  • Node.js 18                                         │  │
│  │  • Python 3.12                                        │  │
│  │  • AWS CDK                                            │  │
│  │  • Runs buildspec.yml                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS CDK Deploy                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Creates CloudFormation stack with 50+ resources:     │  │
│  │                                                        │  │
│  │  Step 1: Storage                                      │  │
│  │  └─> DynamoDB tables, S3 buckets                     │  │
│  │                                                        │  │
│  │  Step 2: AI Services                                  │  │
│  │  └─> Bedrock Agent, Knowledge Base, OpenSearch       │  │
│  │                                                        │  │
│  │  Step 3: Compute                                      │  │
│  │  └─> 9 Lambda functions                              │  │
│  │                                                        │  │
│  │  Step 4: Networking                                   │  │
│  │  └─> API Gateway (WebSocket + REST)                  │  │
│  │                                                        │  │
│  │  Step 5: Security                                     │  │
│  │  └─> Cognito User Pool, IAM roles                    │  │
│  │                                                        │  │
│  │  Step 6: Monitoring                                   │  │
│  │  └─> CloudWatch logs, EventBridge                    │  │
│  │                                                        │  │
│  │  Step 7: Frontend Hosting                            │  │
│  │  └─> Amplify App                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend Build & Deploy                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Install React dependencies                        │  │
│  │  2. Create production config with API URLs           │  │
│  │  3. Build optimized React bundle                     │  │
│  │  4. Upload to Amplify                                │  │
│  │  5. Deploy to production                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              🎉 Deployment Complete!                         │
│                                                              │
│  Your chatbot is now live at:                               │
│  https://main.xxxxx.amplifyapp.com                          │
│                                                              │
│  Users can start chatting immediately!                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Post-Deployment Steps

After deployment completes, you need to do 2 more things:

### 1️⃣ Sync Knowledge Base (5-10 minutes)

**Why:** Your documents are in S3, but the AI hasn't indexed them yet. This step makes them searchable.

**Command:**
```bash
# Get Knowledge Base ID from deployment output above
KB_ID="KB123ABC"  # Replace with your actual ID

# Sync documents
./scripts/sync-knowledge-base.sh --kb-id ${KB_ID} --wait
```

**What happens:**
1. Script finds your Knowledge Base
2. Gets the Data Source ID
3. Starts an ingestion job
4. Bedrock reads all PDFs from your S3 bucket
5. Extracts text from each document
6. Creates embeddings (mathematical representations)
7. Stores embeddings in OpenSearch
8. Status changes: `STARTING` → `IN_PROGRESS` → `COMPLETE`

**Time:** 5-10 minutes depending on document count
**Output:**
```
✅ Knowledge Base synced successfully!
   Documents indexed: 47
   Status: COMPLETE
```

---

### 2️⃣ Create Admin User (1 minute)

**Why:** Someone needs to log into the admin dashboard to manage documents and view analytics.

**Command:**
```bash
# Get User Pool ID from deployment output above
USER_POOL_ID="us-west-2_AbCdEf"  # Replace with your actual ID

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username ${ADMIN_EMAIL} \
  --user-attributes Name=email,Value=${ADMIN_EMAIL} \
  --temporary-password "TempPass123!" \
  --region us-west-2
```

**What happens:**
1. Creates a new user in Cognito
2. Username is your admin email
3. Sets temporary password: `TempPass123!`
4. Sends welcome email to admin
5. Admin must change password on first login

**Output:**
```
{
    "User": {
        "Username": "admin@mhfa.org",
        "UserStatus": "FORCE_CHANGE_PASSWORD",
        ...
    }
}
```

**Check your email:** You'll receive login instructions from AWS.

---

## Understanding the Output

After deployment, you get several important URLs and IDs. Here's what each one means:

### 🌐 Application URL (Frontend)
```
https://main.d1disyogbqgwn4.amplifyapp.com
```
**What it is:** Your live chatbot website
**Who uses it:** End users (instructors, staff, learners)
**What they can do:**
- Chat with the AI assistant
- Get answers from your documents
- Switch languages (English/Spanish)
- Select their role for personalized recommendations
- Rate responses with thumbs up/down
- Escalate complex questions

**No login required!** Anyone with the URL can use the chatbot.

---

### 📊 Admin Dashboard
```
https://main.d1disyogbqgwn4.amplifyapp.com/admin
```
**What it is:** Administrative control panel
**Who uses it:** Administrators only
**Login required:** Yes (Cognito username/password)
**What they can do:**
- Upload new documents to knowledge base
- View conversation logs and analytics
- See sentiment analysis trends
- Manage escalated queries
- Download chat transcripts
- Monitor usage statistics

---

### 🔌 WebSocket API
```
wss://abc123xyz.execute-api.us-west-2.amazonaws.com/prod
```
**What it is:** Real-time communication endpoint
**Who uses it:** The frontend application (not humans directly)
**What it does:**
- Maintains persistent connection between browser and backend
- Enables streaming responses (text appears word-by-word)
- Allows instant message delivery
- Supports real-time notifications

**Technical:** The React app connects to this URL when a user starts chatting.

---

### 📚 Knowledge Base ID
```
KB123ABC456
```
**What it is:** Unique identifier for your Bedrock Knowledge Base
**Who uses it:** Administrators and deployment scripts
**What it's used for:**
- Syncing new documents
- Triggering ingestion jobs
- Monitoring indexing status
- API calls to update knowledge base

**Important:** Save this ID - you'll need it when adding new documents.

---

### 🤖 Agent ID
```
AGENT789XYZ123
```
**What it is:** Unique identifier for your Bedrock AI Agent
**Who uses it:** Backend Lambda functions
**What it does:**
- Orchestrates AI responses
- Coordinates with Knowledge Base
- Manages conversation context
- Applies reasoning and logic

**Technical:** The chatResponseHandler Lambda invokes this agent for every user message.

---

### 👤 User Pool ID
```
us-west-2_AbCdEf123
```
**What it is:** Cognito User Pool identifier
**Who uses it:** Administrators creating new admin users
**What it's used for:**
- Creating admin accounts
- Resetting passwords
- Managing user permissions
- Authentication for admin dashboard

---

### 🪣 S3 Buckets

**Knowledge Base Documents:**
```
your-bucket-name (the one you created)
```
**What it is:** Storage for your PDF/Word/TXT documents
**Access:** Private (only your AWS account)
**Usage:** Upload new documents here, then run sync script

**Email Attachments:**
```
learningnavigatorstack-emailbucket-abc123
```
**What it is:** Stores email attachments (auto-created)
**Access:** Private
**Usage:** Automatic - no manual interaction needed

**Supplemental Data:**
```
learningnavigatorstack-supplementaldatabucket-xyz789
```
**What it is:** Additional data files (auto-created)
**Access:** Private
**Usage:** Automatic - no manual interaction needed

---

## Cost Breakdown

Understanding what you're paying for:

### Monthly Costs (for 10,000 conversations)

| Service | What It Does | Cost |
|---------|--------------|------|
| **Bedrock Claude 4** | AI responses | $40-80 |
| **Bedrock Titan Embeddings** | Document indexing | $5-10 |
| **Lambda Functions** | Request processing | $1-5 |
| **DynamoDB** | Data storage | $5-10 |
| **OpenSearch Serverless** | Document search | $10-15 |
| **API Gateway** | WebSocket + REST | $5 |
| **Amplify** | Frontend hosting | $1-3 |
| **S3** | File storage | $2-5 |
| **Cognito** | Admin authentication | $0 (free tier) |
| **CloudWatch** | Logs and monitoring | $5-10 |
| **SES** | Email notifications | $1 |
| **Total** | | **$80-150/month** |

**Cost Optimization Tips:**
- Most costs scale with usage (pay-per-use)
- Test with small document sets first
- Monitor usage in AWS Cost Explorer
- Set up billing alarms
- Use CloudWatch log retention (delete old logs)

---

## Security & Privacy

### What's Private (Stays in Your AWS Account)
✅ All documents (PDFs, Word files, etc.)
✅ All user conversations and chat logs
✅ All user feedback and ratings
✅ Admin credentials and user data
✅ API keys and configuration
✅ Database contents

### What's Public
⚠️ Frontend URL (https://main.xxxxx.amplifyapp.com)
   - Anyone with the link can use the chatbot
   - No login required for basic chat
   - No sensitive data exposed

### Security Features
✅ **Encryption at rest** - DynamoDB and S3 encrypted
✅ **Encryption in transit** - All API calls use HTTPS/WSS
✅ **IAM roles** - Least privilege access
✅ **VPC isolation** - OpenSearch in private network
✅ **Cognito authentication** - Admin dashboard protected
✅ **WAF ready** - Can add Web Application Firewall

---

## Troubleshooting Common Issues

### Issue: "Parameter already exists"
**Cause:** You've deployed before and the parameter wasn't deleted
**Solution:**
```bash
aws ssm delete-parameter --name /learning-navigator/admin-email --region us-west-2
# Then re-run Command 2
```

---

### Issue: "CodeBuild project already exists"
**Cause:** Previous deployment created the project
**Solution:**
```bash
aws codebuild delete-project --name ncwm-chatbot-deployment --region us-west-2
# Then re-run Command 3
```

---

### Issue: "Bedrock Access Denied"
**Cause:** Models not enabled in your account
**Solution:**
1. Go to https://console.aws.amazon.com/bedrock/
2. Click "Model access"
3. Enable Claude 4 Sonnet and Titan Embeddings
4. Wait for "Access granted" status (may take a few minutes)
5. Re-run deployment

---

### Issue: "SES Email Not Verified"
**Cause:** Email verification not completed
**Solution:**
1. Check your spam folder for AWS verification email
2. Click the verification link
3. Wait until status shows "Verified" in SES console
4. Re-run Command 2

---

### Issue: "Build Failed in CodeBuild"
**Cause:** Various (check logs for details)
**Solution:**
```bash
# View build logs
aws codebuild batch-get-builds \
  --ids $(aws codebuild list-builds --sort-order DESCENDING --max-items 1 --query 'ids[0]' --output text)

# Common fixes:
# 1. Check Bedrock model access
# 2. Check S3 bucket exists and has documents
# 3. Check IAM permissions
# 4. Try deployment again (some issues are transient)
```

---

### Issue: "Knowledge Base Sync Timeout"
**Cause:** Too many documents or large files
**Solution:**
```bash
# Check sync status manually
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID \
  --region us-west-2

# If stuck, start new sync
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID \
  --region us-west-2
```

---

## Next Steps

After deployment, here's what to do:

### Immediate (Today)
1. ✅ Test the chatbot - visit your Amplify URL
2. ✅ Ask a test question: "How do I register for a course?"
3. ✅ Verify response includes citations from your documents
4. ✅ Log into admin dashboard and explore features
5. ✅ Create additional admin users if needed

### This Week
1. 📝 Upload more documents if needed
2. 📊 Monitor usage in admin dashboard
3. 🧪 Test different types of questions
4. 👥 Share URL with beta testers
5. 📈 Review analytics and sentiment trends

### Ongoing
1. 🔄 Regular document updates (upload and sync)
2. 📧 Respond to escalated queries
3. 📊 Review conversation logs for improvements
4. 💰 Monitor costs in AWS Cost Explorer
5. 🛡️ Review security settings periodically

---

## Useful Commands Reference

### View Deployment Status
```bash
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].StackStatus'
```

### Get All Outputs Again
```bash
aws cloudformation describe-stacks \
  --stack-name LearningNavigatorStack \
  --region us-west-2 \
  --query 'Stacks[0].Outputs'
```

### View Lambda Logs
```bash
# Chat response logs
aws logs tail /aws/lambda/chatResponseHandler --follow

# WebSocket logs
aws logs tail /aws/lambda/web-socket-handler --follow
```

### Check Knowledge Base Status
```bash
aws bedrock-agent get-knowledge-base \
  --knowledge-base-id YOUR_KB_ID \
  --region us-west-2
```

### List All Created Resources
```bash
aws cloudformation list-stack-resources \
  --stack-name LearningNavigatorStack \
  --region us-west-2
```

---

## Summary

**What you just did:**
1. ✅ Cloned chatbot code to CloudShell
2. ✅ Configured with your email and S3 bucket
3. ✅ Deployed 50+ AWS resources automatically
4. ✅ Got a live chatbot in 25-30 minutes

**What you can now do:**
- 💬 Let users chat with your AI assistant
- 📚 Answer questions from your documents
- 📊 Monitor usage and analytics
- 📝 Manage content through admin dashboard
- 📧 Handle escalated queries via email

**Your chatbot is live at:**
```
https://main.xxxxx.amplifyapp.com
```

**Questions?** Review the [Complete Deployment Guide](DEPLOYMENT_GUIDE.md) or [Troubleshooting section](#troubleshooting-common-issues) above.

---

🎉 **Congratulations! You've successfully deployed the MHFA Learning Navigator chatbot!**
