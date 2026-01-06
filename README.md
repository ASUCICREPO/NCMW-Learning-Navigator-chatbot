# Learning Navigator - MHFA Learning Ecosystem AI Assistant

**Live Application:** https://main.d1disyogbqgwn4.amplifyapp.com

A comprehensive chatbot application that provides real-time guidance for the Mental Health First Aid (MHFA) Learning Ecosystem, powered by AWS Bedrock and featuring an administrative dashboard for content management and analytics.

This application combines natural language processing capabilities with a knowledge base of MHFA training resources to deliver accurate, context-aware responses to instructors, learners, and administrators. The system includes a user-friendly chat interface, multilingual support, and an administrative portal for managing content and monitoring user interactions.

The application features a serverless architecture built on AWS services, with real-time communication through WebSockets, secure file management, and detailed analytics. Key features include:
- AI-powered responses using AWS Bedrock with Claude 3.5 Sonnet
- **Personalized Recommendations** - Role-based content for Instructors, Staff, and Learners
- **Guest Access** - No login required for main chatbot (guest/anonymous mode)
- **Language Toggle** - Switch between English and Spanish with one click
- Automated email notifications for queries requiring expert attention
- Secure document management system for knowledge base updates
- Real-time chat with streaming responses
- Administrative dashboard with analytics and content management
- Multi-language support (English/Spanish) with Amazon Translate integration
- Session logging and sentiment analysis capabilities
- User profile management with role-specific quick actions

## Repository Structure
```
.
├── buildspec.yml              # AWS CodeBuild configuration for CI/CD
├── cdk_backend/              # AWS CDK infrastructure code
│   ├── bin/                  # CDK app entry point
│   ├── lambda/               # Lambda functions for various services
│   │   ├── adminFile/        # Admin file management handler
│   │   ├── cfEvaluator/      # Chat flow evaluation logic
│   │   ├── email/           # Email notification service
│   │   ├── logclassifier/   # Session log classification
│   │   ├── escalatedQueries/ # Escalated query management
│   │   ├── responseFeedback/ # User feedback collection
│   │   ├── userProfile/      # User profile management
│   │   └── websocketHandler/ # Real-time communication handler
│   └── lib/                 # CDK stack definitions
├── docs/                     # 📚 All project documentation
│   ├── architecture/         # Architecture diagrams and designs
│   ├── deployment/          # Deployment guides and configurations
│   ├── features/            # Feature documentation and guides
│   ├── guides/              # User and developer guides
│   └── testing/             # Test reports and quality assurance
├── scripts/                  # 🛠️ Utility scripts
│   ├── deploy.sh            # Automated deployment script
│   ├── extract_pdf_urls.py  # PDF URL extraction utility
│   └── test_admin_apis.py   # API testing script
└── frontend/                # React-based web application
    ├── public/              # Static assets (favicon, logos, manifest)
    └── src/
        ├── Components/      # React components for UI
        ├── Assets/          # Images, icons, and media files
        └── utilities/       # Shared utilities and contexts
```

# Deployment Instructions
## Common Prerequisites

- Fork this repository to your own GitHub account (required for deployment and CI/CD):
  1. Navigate to your forked repository URL
  2. Click the "Fork" button in the top right corner
  3. Select your GitHub account as the destination
  4. Wait for the forking process to complete
  5. You'll now have your own copy at https://github.com/YOUR-USERNAME/ncwm_chatbot_2

- **(Optional)** Obtain a GitHub personal access token (only required for private repositories):
  - **Note**: If your repository is public, you can skip this step
  - For private repositories only:
    1. Go to GitHub Settings > Developer Settings > Personal Access Tokens > Tokens (classic)
    2. Click "Generate new token (classic)"
    3. Give the token a name and select the "repo" and "admin:repo_hook" scope
    4. Click "Generate token" and save the token securely
  - For detailed instructions, see:
    - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

- Verify your admin email in SES:
  1. AWS Console → SES → Verified Identities
  2. Click **Create identity**
  3. Select **Email address** and enter your admin email
  4. Click **Create identity**
  5. Check your email inbox and click the verification link
  6. Wait until the identity status shows **Verified**

- Enable the following AWS Bedrock models in your AWS account:
  - `TITAN_EMBED_TEXT_V2_1024`
  - `ANTHROPIC_CLAUDE_HAIKU_V1_0`
  - `ANTHROPIC_CLAUDE_3_5_SONNET_V2_0`
  - `NOVA_LITE`

  To request access to these models:
  1. Navigate to the AWS Bedrock console
  2. Click "Model access" in the left navigation pane
  3. Click "Manage model access."
  4. Find each model in the list and select the checkbox next to it
  5. Click "Save changes" at the bottom of the page
  6. Wait for model access to be granted (usually within minutes)
  7. Verify access by checking the "Status" column shows "Access granted"

  Note: If you don't see the option to enable a model, ensure your AWS account
  and region support Bedrock model access. Contact AWS Support if needed.
- AWS Account Permissions
   - Ensure permissions to create and manage AWS resources like S3, Lambda, Knowledge Bases, AI Agents, Neptune, Amplify, Websocket, etc.
   - [AWS IAM Policies and Permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)


## Deployment Using AWS CodeBuild and AWS Cloudshell
### Prerequisites

- Have access to CodeBuild and AWS Cloudshell

### Deployment

1. Open AWS CloudShell in your AWS Console:
   - Click the CloudShell icon in the AWS Console navigation bar
   - Wait for the CloudShell environment to initialize

2. Clone the repository (Make sure to have your own forked copy of the repo and replace the link with the forked repository link):
```bash
git clone https://github.com/<YOUR-USERNAME>/ncwm_chatbot_2
cd ncwm_chatbot_2/
```

3. Deploy using the deployment script (recommended):
The script would prompt you for variables needed for deployment.
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual CDK Deployment
### Prerequisites

1. **AWS CLI**: To interact with AWS services and set up credentials.

   - [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)

2. **npm**
   - npm is required to install AWS CDK. Install npm by installing Node.js:
     - [Download Node.js](https://nodejs.org/) (includes npm).
   - Verify npm installation:
     ```bash
     npm --version
     ```
3. **AWS CDK**: For defining cloud infrastructure in code.
   - [Install AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
     ```bash
     npm install -g aws-cdk
     ```

4. **Docker**: Required to build and run Docker images for the ECS tasks.
   - [Install Docker](https://docs.docker.com/get-docker/)
   - Verify installation:
     ```bash
     docker --version
     ```

### Deployment

1. Clone the repository (Make sure to fork the repository first):
```bash
git clone https://github.com/<YOUR-USERNAME>/ncwm_chatbot_2
cd ncwm_chatbot_2/
```

2. **Set Up Your Environment**:
Configure AWS CLI with your AWS account credentials:
  ```bash
  aws configure
  ```

3. Install dependencies:
```bash
cd cdk_backend
npm install
```

4. Bootstrap CDK:
```bash
# For public repositories (recommended):
cdk bootstrap --all \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=YOUR_ADMIN_EMAIL

# For private repositories (add githubToken):
cdk bootstrap --all \
  -c githubToken=YOUR_GITHUB_TOKEN \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=YOUR_ADMIN_EMAIL
```

5. Deploy the stack:
```bash
# For public repositories (recommended):
cdk deploy --all \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=YOUR_ADMIN_EMAIL

# For private repositories (add githubToken):
cdk deploy --all \
  -c githubToken=YOUR_GITHUB_TOKEN \
  -c githubOwner=YOUR_GITHUB_USERNAME \
  -c githubRepo=ncwm_chatbot_2 \
  -c adminEmail=YOUR_ADMIN_EMAIL
```

## Usage

Once the infrastructure is deployed using either of the two approaches:

1. Upload any PDF files to the S3 Bucket (national-council-s3-pdfs)

2. Sync the Knowledge Base:
   - Go to AWS Console > Bedrock > Knowledge bases
   - Select the knowledge base created by the stack
   - Click the "Sync data sources" button
   - Wait for sync to complete (status will show "Available")

3. SES Email Verification (Post-Deployment)
   - An email will be sent from AWS to the provided admin email address for verification.
   - If you can't find the email, check the Spam folder and verify by clicking the given link.

5. Add User in Cognito (Post-Deployment)

    - AWS Console → Cognito → **User Pools** → `YOUR_USER_POOL_ID`
    - Select **Users and groups** → **Create user**
    - Fill in **Username**, **Temporary password**, and required attributes (e.g., email)
    - Click **Create user** (the user will reset their password on first login)

6. Deploy the Frontend:
   - Go to AWS Console > AWS Amplify
   - Select the app created by the stack
   - Access the application URL provided by Amplify

7. Using the Application:
   - Once frontend deployment is complete, navigate to the Amplify URL
   - The chat interface will load with example queries about MHFA training and resources
   - **No login required** - Chat works immediately in guest mode
   - Click the **Profile icon** to select your role and view personalized recommendations
   - Use the **Language toggle** button to switch between English and Spanish

## Features

### Personalized Recommendations
The chatbot provides role-based personalized recommendations to enhance user experience:

**Target User Roles:**
- 🎓 **MHFA Instructors** - Certified instructors who deliver training courses
- 💼 **Internal Staff** - Administrative and support staff managing training operations
- 👤 **Learners** - Individuals taking MHFA courses for certification

**How It Works:**
1. Click the **Profile icon** (person icon) in the chat header
2. Select your role from three beautifully designed cards
3. View personalized quick actions with sample queries
4. Click any query chip to use it in the chat instantly
5. Access suggested topics and recent updates relevant to your role

**Key Benefits:**
- ✅ **No login required** - Works with guest access using browser localStorage
- ✅ **12 quick actions** - 4 per role with 3 sample queries each
- ✅ **36+ curated queries** - Pre-written questions tailored to each role
- ✅ **Suggested topics** - 5 relevant topics per role to explore
- ✅ **Recent updates** - Latest news and announcements per role
- ✅ **Bilingual support** - Full English and Spanish translations

For detailed information, see [PERSONALIZED_RECOMMENDATIONS_GUIDE.md](docs/features/PERSONALIZED_RECOMMENDATIONS_GUIDE.md)

### Multilingual Support
Switch between English and Spanish seamlessly:
- **Language Toggle Button** in chat header with globe icon
- One-click switch with instant UI updates
- Preferences saved to localStorage and cookies
- All UI elements, recommendations, and responses update automatically
- Tooltips: "Cambiar a Español" / "Switch to English"

### Sentiment Analysis
AI-powered sentiment analysis evaluates chat interactions:
- **4 evaluation factors**: Relevance (30%), Completeness (30%), Clarity (20%), Actionability (20%)
- **Score ranges**: 0-100 with categorical ratings (Excellent, Good, Acceptable, etc.)
- **Admin dashboard** displays sentiment trends and low-score conversations
- Powered by Amazon Bedrock (Nova Lite model)

For detailed information, see [SENTIMENT_ANALYSIS_EXPLAINED.md](docs/features/SENTIMENT_ANALYSIS_EXPLAINED.md)

### Admin Portal Features
Secure administrative dashboard (requires Cognito authentication):
- **Document Management** - Upload and manage knowledge base PDFs
- **Analytics Dashboard** - View chat metrics and sentiment analysis
- **Escalated Queries** - Manage questions requiring human expert attention
- **Conversation Logs** - Review detailed chat transcripts with sentiment scores
- **Email Notifications** - Automated alerts via Amazon SES

For detailed information, see [ADMIN_FEATURES.md](docs/features/ADMIN_FEATURES.md)

### Troubleshooting
1. WebSocket Connection Issues
- Error: "WebSocket connection failed"
  - Check if the AWS API Gateway WebSocket API is deployed correctly
  - Verify the WebSocket URL in the frontend environment variables
  - Ensure your AWS credentials have appropriate permissions

2. Lambda Function Errors
- Error: "Lambda function timed out"
  - Check CloudWatch logs for detailed error messages
  - Increase the Lambda function timeout in the CDK stack
  - Verify memory allocation is sufficient

3. AI Response Issues
- Error: "Knowledge base not responding"
  - Verify the Bedrock knowledge base is properly configured
  - Check if the S3 bucket contains the required MHFA data files
  - Ensure the Lambda function has proper IAM permissions

## Data Flow
The application processes user queries through a multi-stage pipeline that ensures accurate and contextual responses.

```ascii
User Query → WebSocket API → Lambda → Bedrock Agent → Knowledge Base
     ↑                                     ↓
     └──────────── Response ←─────── Email Notification
```

Component interactions:
1. User submits query through WebSocket connection
2. Lambda function processes request and invokes Bedrock Agent
3. Agent queries knowledge base and evaluates confidence
4. High confidence responses (>90%) are returned directly with citations
5. Low confidence queries trigger admin notification workflow
6. Session logs are stored in DynamoDB for analytics
7. File uploads are processed and ingested into knowledge base

## Infrastructure

![Infrastructure diagram](./docs/infra.jpg)

### Architecture Diagram Explanation

- **User → Amplify Front-End**
  - **1.1** User submits question and later their email if needed.
  - **1.9** Amplify returns the Bedrock agent's answer or asks for the email when escalation is needed.

- **Amplify → Amazon API Gateway**
  - **1.2** API Gateway receives the request from Amplify and acts as the single entry point for back-end services.

- **API Gateway → Amazon Bedrock Agent**
  - **1.3** Gateway forwards the query to the Bedrock Agent.
  - **1.4** Agent inspects the query and decides whether it can answer directly from its **Bedrock Knowledge Base**.

- **Bedrock Agent ↔ Knowledge Base (S3 Data Source)**
  - A **sync-up workflow** keeps reference docs in an **S3 bucket** synchronized with the Knowledge Base.
  - **1.6** Agent retrieves the answer and returns it to API Gateway (**1.7**), which then responds to Amplify (**1.8**).

- **Human-in-the-Loop Escalation via Amazon SES**
  - **3.2** If the Agent cannot answer, API Gateway uses **Amazon SES** to email the question (and the user's email) to an **Admin**.
  - **3.3** Admin receives the email.
  - **4.1 / 4.2** Admin replies to the user *and* the bot.
  - **5** Admin's answer is indexed—written to S3 and ingested into the Knowledge Base, improving future responses.

- **Admin Authentication & Document Management**
  - **6.1 / 7.1** Admin authenticates through **Amazon Cognito** and accesses an Amplify-hosted portal.
  - **6.3** Within the portal, the Admin uploads or edits docs in the S3 data source feeding the Knowledge Base.

- **Observability & Analytics Pipeline**
  - **DynamoDB** stores structured logs/metrics from the Bedrock Agent; raw logs are archived in **S3**.
  - A lightweight **LLM process** mines those S3 logs for insights.
  - **Dashboard (7.3)** pulls aggregated data from DynamoDB to provide real-time analytics.
  - **CloudWatch** captures infrastructure-level logs across the entire stack.

- **Data-Flow Summary**
  1. **Primary path:** *User → Amplify → API Gateway → Bedrock Agent → Knowledge Base/S3 → User*
  2. **Escalation path:** *API Gateway → SES → Admin → SES → Knowledge Base/S3*
  3. **Admin management:** *Cognito-authenticated Amplify app → S3 (documents) + DynamoDB/S3 (logs) → Dashboard*

> This architecture combines a serverless web front-end, a Bedrock-powered retrieval agent, human-in-the-loop escalation, and a full observability layer—yielding immediate answers for users while letting admins curate content and monitor system health in one cohesive workflow.


Lambda Functions:
- `adminFile`: Manages document uploads and knowledge base updates
- `cfEvaluator`: Evaluates chat flow and confidence scores
- `email`: Handles admin notifications and escalated queries
- `logclassifier`: Categorizes and analyzes session logs with AI sentiment analysis
- `websocketHandler`: Manages real-time WebSocket communication
- `userProfile`: Manages user profiles and personalized recommendations
- `escalatedQueries`: Handles escalated query workflow and tracking

AWS Services:
- Bedrock: AI model and knowledge base
- API Gateway: WebSocket and REST APIs
- DynamoDB: Session and analytics data
- S3: Document storage
- SES: Email notifications
- Cognito: User authentication

Environment Variables:
- `REACT_APP_WEBSOCKET_API`: WebSocket API endpoint
- `REACT_APP_ANALYTICS_API`: Analytics API endpoint
- `REACT_APP_COGNITO_USER_POOL_ID`: Cognito user pool ID
- `REACT_APP_COGNITO_CLIENT_ID`: Cognito client ID
