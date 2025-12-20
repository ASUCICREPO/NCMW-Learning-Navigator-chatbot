# Learning Navigator - Infrastructure (CDK)

AWS CDK infrastructure code for the Learning Navigator backend.

## Prerequisites

- Python 3.9 or later
- AWS CLI configured with credentials
- AWS CDK CLI installed: `npm install -g aws-cdk`

## Setup

```bash
# Create virtual environment (recommended)
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# .venv\Scripts\activate.bat  # On Windows

# Install dependencies
pip install -r requirements.txt

# Verify CDK installation
cdk --version

# Bootstrap CDK (first time only, per account/region)
cdk bootstrap aws://ACCOUNT-ID/us-west-2
```

## Development Commands

```bash
# Activate virtual environment first!
source .venv/bin/activate

# Generate CloudFormation template (without deploying)
cdk synth

# Show differences between current and deployed stack
cdk diff

# Deploy to AWS
cdk deploy

# Deploy with approval prompts for security changes
cdk deploy --require-approval=broadening

# Destroy stack (delete all resources) - BE CAREFUL!
cdk destroy
```

## Project Structure

```
infrastructure/
├── app.py                  # CDK app entry point
├── stacks/
│   ├── __init__.py        # Python package
│   └── backend_stack.py   # Main infrastructure stack
├── requirements.txt        # Python dependencies
├── cdk.json               # CDK config
└── .venv/                 # Virtual environment (created during setup)
```

## Deployment Steps

### First Time Deployment

1. **Create and activate virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Bootstrap CDK** (one-time per AWS account/region):
   ```bash
   cdk bootstrap
   ```

4. **Deploy the stack**:
   ```bash
   cdk deploy
   ```

5. **Verify deployment**:
   - Check AWS CloudFormation console
   - Look for stack outputs (StackName, Region)

### Subsequent Deployments

1. **Activate virtual environment**:
   ```bash
   source .venv/bin/activate
   ```

2. **Check what will change**:
   ```bash
   cdk diff
   ```

3. **Deploy changes**:
   ```bash
   cdk deploy
   ```

## Current Status

**Step 1 Complete**: Project structure initialized ✅
**Step 2 Complete**: DynamoDB table with single-table design ✅
**Step 3 Complete**: S3 buckets (PDFs, frontend, logs) ✅
**Step 4 Complete**: Cognito User Pool (authentication) ✅
**Step 5 Complete**: Lambda functions (health check, chat) ✅
**Step 6 Complete**: API Gateway with Cognito authorizer ✅
**Step 7 Complete**: Bedrock Claude 3.5 Sonnet integration ✅

**Next Steps**:
- Step 8: Add OpenSearch for RAG
- Step 9: Build React frontend

## Resources Created

**Currently Deployed**:
- DynamoDB table: `learning-navigator` (Step 2)
- S3 bucket: `learning-navigator-frontend` (Step 3)
- S3 bucket: `learning-navigator-logs` (Step 3)
- S3 bucket reference: `national-council-s3-pdfs` (existing)
- Cognito User Pool: `learning-navigator-users` (Step 4)
- Cognito User Groups: instructors, staff, admins (Step 4)
- Cognito Client: `learning-navigator-web` (Step 4)
- Lambda function: `learning-navigator-health` (Step 5)
- Lambda function: `learning-navigator-chat` with Bedrock (Step 5 + 7)
- IAM Role with Bedrock permissions: `learning-navigator-lambda-role` (Step 5 + 7)
- API Gateway: `learning-navigator-api` (Step 6)
- Cognito Authorizer: JWT validation (Step 6)
- Endpoints: `GET /health`, `POST /chat` (Step 6)
- Bedrock: Claude 3.5 Sonnet integration (Step 7)

**Coming Next**:
- Step 8: OpenSearch for RAG
- Step 9: React frontend

## Environment Variables

```bash
# Optional: Set environment
export ENVIRONMENT=dev   # or 'staging', 'prod'

# Optional: Use specific AWS profile
export AWS_PROFILE=your-profile-name
```

## Troubleshooting

**CDK command not found**:
```bash
npm install -g aws-cdk
```

**AWS credentials not configured**:
```bash
aws configure
```

**Bootstrap required error**:
```bash
cdk bootstrap
```

**Region mismatch**:
Ensure you're deploying to `us-west-2` (matches S3 bucket location)

## Cost Estimation

Run this to estimate costs before deploying:
```bash
cdk synth --quiet && aws cloudformation estimate-template-cost \
  --template-body file://cdk.out/LearningNavigatorBackendStack.template.json
```

## Documentation

See main documentation at: `../../DOCUMENTATION_COMPLETE.md`

- [AWS Architecture](../../AWS_ARCHITECTURE_DETAILED.md)
- [Implementation Roadmap](../../IMPLEMENTATION_ROADMAP.md)
- [Code Standards](../../CODE_STANDARDS.md)
