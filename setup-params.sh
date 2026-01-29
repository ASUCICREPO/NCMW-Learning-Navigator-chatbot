#!/bin/bash

# Setup AWS Systems Manager Parameters for Deployment
# Usage: ./setup-params.sh --admin-email EMAIL
#
# Note: This repository is public, so GitHub credentials are not required

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

# Default values
REGION="us-west-2"
GITHUB_REPO_URL="https://github.com/ASUCICREPO/NCMW-Learning-Navigator-chatbot"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --admin-email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./setup-params.sh --admin-email EMAIL"
            echo ""
            echo "Required:"
            echo "  --admin-email      Admin email for notifications"
            echo ""
            echo "Optional:"
            echo "  --region           AWS region (default: us-west-2)"
            echo ""
            echo "Note: This repository is public at:"
            echo "  $GITHUB_REPO_URL"
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
if [ -z "$ADMIN_EMAIL" ]; then
    print_error "Missing required arguments"
    echo "Usage: ./setup-params.sh --admin-email EMAIL"
    exit 1
fi

print_info "Setting up AWS Systems Manager Parameters..."
echo ""
echo "Configuration:"
echo "  GitHub Repo:   $GITHUB_REPO_URL"
echo "  Admin Email:   $ADMIN_EMAIL"
echo "  AWS Region:    $REGION"
echo ""

# Verify AWS credentials
print_info "Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>&1) || {
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}
print_success "AWS Account ID: $ACCOUNT_ID"
echo ""

# Create parameters
print_info "Creating SSM parameters..."

# Admin Email
aws ssm put-parameter \
    --name "/learning-navigator/admin-email" \
    --value "$ADMIN_EMAIL" \
    --type "String" \
    --overwrite \
    --region "$REGION" \
    --description "Admin email for Learning Navigator notifications" \
    > /dev/null

print_success "Parameter created: /learning-navigator/admin-email"

echo ""
print_success "All parameters created successfully!"
echo ""
print_info "Verify parameters:"
echo "  aws ssm get-parameters-by-path --path /learning-navigator --region $REGION"
echo ""
print_info "Next step:"
echo "  ./deploy-codebuild.sh"
