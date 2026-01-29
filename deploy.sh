#!/bin/bash

# NCWM Chatbot Deployment Script
# This script automates the deployment process for a new AWS account
#
# Usage:
#   ./deploy.sh --github-owner YOUR_USERNAME --github-repo REPO_NAME --admin-email EMAIL@DOMAIN.COM
#
# Optional:
#   --github-token TOKEN     # For private repositories
#   --bucket-name NAME       # Custom S3 bucket name
#   --region REGION          # AWS region (default: us-west-2)
#   --skip-bootstrap         # Skip CDK bootstrap if already done

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGION="us-west-2"
SKIP_BOOTSTRAP=false
BUCKET_NAME=""

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --github-owner)
            GITHUB_OWNER="$2"
            shift 2
            ;;
        --github-repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        --admin-email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        --bucket-name)
            BUCKET_NAME="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --skip-bootstrap)
            SKIP_BOOTSTRAP=true
            shift
            ;;
        --help)
            echo "Usage: ./deploy.sh --github-owner USERNAME --github-repo REPO --admin-email EMAIL"
            echo ""
            echo "Required:"
            echo "  --github-owner     GitHub username or organization"
            echo "  --github-repo      GitHub repository name"
            echo "  --admin-email      Admin email for notifications"
            echo ""
            echo "Optional:"
            echo "  --github-token     GitHub personal access token (for private repos)"
            echo "  --bucket-name      Custom S3 bucket name (default: auto-generated)"
            echo "  --region           AWS region (default: us-west-2)"
            echo "  --skip-bootstrap   Skip CDK bootstrap step"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ] || [ -z "$ADMIN_EMAIL" ]; then
    print_error "Missing required arguments"
    echo "Usage: ./deploy.sh --github-owner USERNAME --github-repo REPO --admin-email EMAIL"
    echo "Use --help for more information"
    exit 1
fi

# Auto-generate bucket name if not provided
if [ -z "$BUCKET_NAME" ]; then
    BUCKET_NAME="${GITHUB_OWNER}-${GITHUB_REPO}-kb-docs-$(date +%s)"
    print_info "Auto-generated bucket name: $BUCKET_NAME"
fi

# Print configuration
print_header "Deployment Configuration"
echo "GitHub Owner:     $GITHUB_OWNER"
echo "GitHub Repo:      $GITHUB_REPO"
echo "Admin Email:      $ADMIN_EMAIL"
echo "S3 Bucket:        $BUCKET_NAME"
echo "AWS Region:       $REGION"
echo "Skip Bootstrap:   $SKIP_BOOTSTRAP"

# Confirmation
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Check prerequisites
print_header "Checking Prerequisites"

check_command "aws"
check_command "node"
check_command "npm"
check_command "cdk"
check_command "git"

print_success "All required tools are installed"

# Verify AWS credentials
print_info "Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>&1) || {
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}
print_success "AWS Account ID: $ACCOUNT_ID"

# Check Bedrock model access
print_info "Checking Bedrock model access..."
print_warning "Note: This requires manual verification in AWS Console"
print_info "Go to: https://console.aws.amazon.com/bedrock/ → Model access"
read -p "Have you enabled Claude, Titan, and Nova models? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please enable Bedrock models first and re-run this script"
    exit 1
fi

# Create S3 bucket
print_header "Creating S3 Bucket"
print_info "Creating bucket: $BUCKET_NAME"

if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
    print_success "Bucket created"

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    print_success "Versioning enabled"

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    print_success "Encryption enabled"
else
    print_info "Bucket already exists, skipping creation"
fi

# Update CDK stack with bucket name
print_header "Updating CDK Stack Configuration"
print_info "Updating bucket name in cdk_backend-stack.ts..."

# Backup original file
cp cdk_backend/lib/cdk_backend-stack.ts cdk_backend/lib/cdk_backend-stack.ts.backup

# Replace bucket name (line 69)
sed -i.tmp "s/'national-council-s3-pdfs'/'$BUCKET_NAME'/g" cdk_backend/lib/cdk_backend-stack.ts
rm -f cdk_backend/lib/cdk_backend-stack.ts.tmp

print_success "CDK stack updated"

# Install dependencies
print_header "Installing Dependencies"

print_info "Installing CDK dependencies..."
cd cdk_backend
npm install
print_success "CDK dependencies installed"

print_info "Installing frontend dependencies..."
cd ../frontend
npm install
print_success "Frontend dependencies installed"
cd ..

# CDK Bootstrap
if [ "$SKIP_BOOTSTRAP" = false ]; then
    print_header "Bootstrapping CDK"
    print_info "Bootstrapping AWS environment..."

    cd cdk_backend
    cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
    print_success "CDK bootstrapped"
    cd ..
else
    print_info "Skipping CDK bootstrap (--skip-bootstrap flag)"
fi

# Deploy CDK stack
print_header "Deploying Backend Infrastructure"
print_warning "This will take 15-20 minutes..."

cd cdk_backend

# Build CDK context
CDK_CONTEXT="-c githubOwner=$GITHUB_OWNER -c githubRepo=$GITHUB_REPO -c adminEmail=$ADMIN_EMAIL"
if [ ! -z "$GITHUB_TOKEN" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c githubToken=$GITHUB_TOKEN"
fi

# Deploy
print_info "Starting CDK deployment..."
cdk deploy $CDK_CONTEXT --require-approval never

# Check deployment status
if [ $? -eq 0 ]; then
    print_success "Backend deployed successfully"
else
    print_error "CDK deployment failed"
    # Restore backup
    mv cdk_backend/lib/cdk_backend-stack.ts.backup cdk_backend/lib/cdk_backend-stack.ts
    exit 1
fi

# Get stack outputs
print_header "Retrieving Stack Outputs"

WEBSOCKET_URL=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiEndpoint`].OutputValue' \
    --output text)

AMPLIFY_URL=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
    --output text)

KB_ID=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseId`].OutputValue' \
    --output text)

AGENT_ID=$(aws cloudformation describe-stacks \
    --stack-name LearningNavigatorStack \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AgentId`].OutputValue' \
    --output text)

# Save outputs to file
cat > deployment-outputs.txt << EOF
NCWM Chatbot Deployment Outputs
================================
Deployment Date: $(date)
AWS Account: $ACCOUNT_ID
AWS Region: $REGION

S3 Bucket: $BUCKET_NAME
WebSocket API: $WEBSOCKET_URL
Amplify URL: $AMPLIFY_URL
Knowledge Base ID: $KB_ID
Agent ID: $AGENT_ID

GitHub Owner: $GITHUB_OWNER
GitHub Repo: $GITHUB_REPO
Admin Email: $ADMIN_EMAIL
EOF

print_success "Stack outputs saved to deployment-outputs.txt"

# Display important information
print_header "Deployment Summary"
echo ""
print_success "Backend deployment complete!"
echo ""
echo "Important URLs:"
echo "  WebSocket API:    $WEBSOCKET_URL"
echo "  Amplify Frontend: $AMPLIFY_URL"
echo ""
echo "Knowledge Base:"
echo "  Bucket:     s3://$BUCKET_NAME"
echo "  KB ID:      $KB_ID"
echo "  Agent ID:   $AGENT_ID"
echo ""

# Next steps
print_header "Next Steps"
echo ""
echo "1. Upload documents to Knowledge Base:"
echo "   aws s3 sync ./your-documents/ s3://$BUCKET_NAME/pdfs/ --region $REGION"
echo ""
echo "2. Sync Knowledge Base (after uploading documents):"
echo "   ./sync-knowledge-base.sh --kb-id $KB_ID --region $REGION"
echo ""
echo "3. Update frontend configuration:"
echo "   - Edit frontend/src/utilities/constants.js"
echo "   - Update WEBSOCKET_API with: $WEBSOCKET_URL"
echo ""
echo "4. Access your chatbot:"
echo "   - Frontend: $AMPLIFY_URL"
echo "   - Admin Portal: $AMPLIFY_URL/admin"
echo ""
echo "5. Create admin user:"
echo "   Follow instructions in DEPLOYMENT_GUIDE.md (Section: Post-Deployment Configuration)"
echo ""

print_success "Deployment complete! 🎉"
print_info "Review deployment-outputs.txt for all details"

# Cleanup backup
rm -f cdk_backend/lib/cdk_backend-stack.ts.backup

cd ..
