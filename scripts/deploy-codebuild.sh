#!/bin/bash

# Deploy NCWM Chatbot using AWS CodeBuild
# This script creates a CodeBuild project and triggers deployment
# Usage: ./deploy-codebuild.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Default values
REGION="us-west-2"
PROJECT_NAME="ncwm-chatbot-deployment"
GITHUB_LOCATION="https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot.git"

print_header "NCWM Chatbot - CodeBuild Deployment"

# Verify AWS credentials
print_info "Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>&1) || {
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}
print_success "AWS Account ID: $ACCOUNT_ID"
print_info "Region: $REGION"
echo ""

# Check if parameters exist
print_info "Checking AWS Systems Manager parameters..."
ADMIN_EMAIL=$(aws ssm get-parameter --name /learning-navigator/admin-email --region $REGION --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -z "$ADMIN_EMAIL" ]; then
    print_error "Required SSM parameters not found!"
    echo ""
    echo "Please run setup-params.sh first:"
    echo "  ./setup-params.sh --admin-email EMAIL"
    echo ""
    exit 1
fi

print_success "Parameters found:"
echo "  GitHub Repo: $GITHUB_LOCATION"
echo "  Admin Email: $ADMIN_EMAIL"
echo ""

# Check if CodeBuild project exists
print_info "Checking for existing CodeBuild project..."
PROJECT_EXISTS=$(aws codebuild batch-get-projects --names "$PROJECT_NAME" --region $REGION --query 'projects[0].name' --output text 2>/dev/null || echo "")

if [ "$PROJECT_EXISTS" = "$PROJECT_NAME" ]; then
    print_warning "CodeBuild project '$PROJECT_NAME' already exists"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws codebuild delete-project --name "$PROJECT_NAME" --region $REGION
        print_success "Deleted existing project"
        PROJECT_EXISTS=""  # Reset so new project gets created
    else
        print_info "Using existing project"
    fi
fi

# Create CodeBuild service role if it doesn't exist
print_info "Setting up CodeBuild service role..."
ROLE_NAME="ncwm-codebuild-service-role"
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    print_info "Creating CodeBuild service role..."

    # Create trust policy
    cat > /tmp/codebuild-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file:///tmp/codebuild-trust-policy.json \
        --description "Service role for NCWM Chatbot CodeBuild deployment" \
        > /dev/null

    # Attach policies
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

    print_success "Service role created: $ROLE_NAME"
    print_warning "Waiting 10 seconds for IAM role to propagate..."
    sleep 10
else
    print_success "Using existing service role: $ROLE_NAME"
fi

# Create CodeBuild project
if [ "$PROJECT_EXISTS" != "$PROJECT_NAME" ]; then
    print_header "Creating CodeBuild Project"

    aws codebuild create-project \
        --name "$PROJECT_NAME" \
        --description "Full-stack deployment of NCWM Chatbot (Backend + Frontend)" \
        --source type=GITHUB,location="$GITHUB_LOCATION" \
        --artifacts type=NO_ARTIFACTS \
        --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_MEDIUM,privilegedMode=true \
        --service-role "$ROLE_ARN" \
        --region $REGION \
        > /dev/null

    print_success "CodeBuild project created: $PROJECT_NAME"
fi

# Start build
print_header "Starting Deployment Build"
print_info "This will take approximately 20 minutes..."
echo ""

BUILD_ID=$(aws codebuild start-build \
    --project-name "$PROJECT_NAME" \
    --region $REGION \
    --query 'build.id' \
    --output text)

print_success "Build started: $BUILD_ID"
print_info "Monitoring build progress..."
echo ""

# Monitor build
PREV_PHASE=""
while true; do
    BUILD_INFO=$(aws codebuild batch-get-builds --ids "$BUILD_ID" --region $REGION --output json)

    BUILD_STATUS=$(echo "$BUILD_INFO" | jq -r '.builds[0].buildStatus')
    CURRENT_PHASE=$(echo "$BUILD_INFO" | jq -r '.builds[0].currentPhase // "SUBMITTED"')

    # Print phase change
    if [ "$CURRENT_PHASE" != "$PREV_PHASE" ]; then
        case $CURRENT_PHASE in
            "SUBMITTED")
                print_info "Phase: Queued"
                ;;
            "PROVISIONING")
                print_info "Phase: Provisioning build environment..."
                ;;
            "DOWNLOAD_SOURCE")
                print_info "Phase: Downloading source code..."
                ;;
            "INSTALL")
                print_info "Phase: Installing dependencies (Node.js, Python, CDK)..."
                ;;
            "PRE_BUILD")
                print_info "Phase: Pre-build validation..."
                ;;
            "BUILD")
                print_info "Phase: Building and deploying (Backend + Frontend)..."
                ;;
            "POST_BUILD")
                print_info "Phase: Post-build and Amplify deployment..."
                ;;
            "UPLOAD_ARTIFACTS")
                print_info "Phase: Uploading artifacts..."
                ;;
            "FINALIZING")
                print_info "Phase: Finalizing..."
                ;;
            "COMPLETED")
                print_info "Phase: Completed"
                ;;
        esac
        PREV_PHASE="$CURRENT_PHASE"
    fi

    # Check if build is complete
    if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
        echo ""
        print_success "Build completed successfully!"
        break
    elif [ "$BUILD_STATUS" = "FAILED" ] || [ "$BUILD_STATUS" = "FAULT" ] || [ "$BUILD_STATUS" = "TIMED_OUT" ] || [ "$BUILD_STATUS" = "STOPPED" ]; then
        echo ""
        print_error "Build failed with status: $BUILD_STATUS"
        print_info "Check logs: aws codebuild batch-get-builds --ids $BUILD_ID --region $REGION"
        exit 1
    fi

    sleep 15
done

# Get deployment outputs
print_header "Deployment Outputs"

WEBSOCKET_URL=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

AMPLIFY_URL=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

KB_ID=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

AGENT_ID=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`AgentId`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?contains(OutputKey, `Bucket`)].OutputValue | [0]' \
    --output text 2>/dev/null || echo "Not found")

# Save outputs
cat > deployment-outputs.txt << EOF
NCWM Chatbot Deployment Outputs
================================
Deployment Date: $(date)
Build ID: $BUILD_ID
AWS Account: $ACCOUNT_ID
AWS Region: $REGION

Application URLs:
  Frontend:        $AMPLIFY_URL
  Admin Portal:    ${AMPLIFY_URL}/admin
  WebSocket API:   $WEBSOCKET_URL

AWS Resources:
  Knowledge Base ID:    $KB_ID
  Agent ID:            $AGENT_ID
  User Pool ID:        $USER_POOL_ID
  S3 Bucket:           $BUCKET_NAME

Configuration:
  GitHub Repo: $GITHUB_LOCATION
  Admin Email: $ADMIN_EMAIL
EOF

echo ""
echo "🌐 Frontend URL:     $AMPLIFY_URL"
echo "📊 Admin Portal:     ${AMPLIFY_URL}/admin"
echo "🔌 WebSocket API:    $WEBSOCKET_URL"
echo ""
echo "📚 Knowledge Base ID: $KB_ID"
echo "🤖 Agent ID:         $AGENT_ID"
echo "👤 User Pool ID:     $USER_POOL_ID"
echo "🪣 S3 Bucket:        $BUCKET_NAME"
echo ""

print_success "Deployment outputs saved to: deployment-outputs.txt"

# Next steps
print_header "Next Steps"
echo ""
echo "1. Upload documents to Knowledge Base:"
echo "   aws s3 sync ./your-documents/ s3://${BUCKET_NAME}/pdfs/"
echo ""
echo "2. Sync Knowledge Base:"
echo "   ./sync-knowledge-base.sh --kb-id $KB_ID --wait"
echo ""
echo "3. Create admin user:"
echo "   aws cognito-idp admin-create-user \\"
echo "     --user-pool-id $USER_POOL_ID \\"
echo "     --username $ADMIN_EMAIL \\"
echo "     --temporary-password 'TempPass123!' \\"
echo "     --region $REGION"
echo ""
echo "4. Access your application:"
echo "   $AMPLIFY_URL"
echo ""

print_success "Deployment complete! 🎉"
