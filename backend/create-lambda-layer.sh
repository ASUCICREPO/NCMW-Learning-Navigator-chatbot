#!/bin/bash

# Lambda Layer Creation Script for RAG Dependencies
# This script creates a Lambda Layer with opensearch-py, PyPDF2, and langchain

set -e  # Exit on error

echo "=================================================="
echo "Creating Lambda Layer for RAG Dependencies"
echo "=================================================="
echo ""

# Configuration
LAYER_NAME="learning-navigator-rag-dependencies"
REGION="${AWS_REGION:-us-west-2}"
PYTHON_VERSION="3.11"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: python3 not found. Please install Python 3.9+${NC}"
    exit 1
fi

if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo -e "${RED}ERROR: pip not found. Please install pip${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: aws CLI not found. Please install AWS CLI${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}ERROR: AWS credentials not configured. Run 'aws configure'${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 2: Create directory structure
echo -e "${YELLOW}Step 2: Creating directory structure...${NC}"

# Clean up old layer if exists
if [ -d "lambda-layer" ]; then
    echo "Removing old lambda-layer directory..."
    rm -rf lambda-layer
fi

if [ -f "rag-dependencies-layer.zip" ]; then
    echo "Removing old zip file..."
    rm -f rag-dependencies-layer.zip
fi

mkdir -p lambda-layer/python
echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing dependencies (this may take 2-3 minutes)...${NC}"

pip install \
  opensearch-py==2.4.2 \
  requests-aws4auth==1.2.3 \
  PyPDF2==3.0.1 \
  langchain==0.1.10 \
  langchain-aws==0.1.0 \
  langchain-community==0.0.24 \
  -t lambda-layer/python \
  --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}ERROR: Failed to install dependencies${NC}"
    exit 1
fi

# Check size
LAYER_SIZE=$(du -sh lambda-layer/python | awk '{print $1}')
echo "Layer size: ${LAYER_SIZE}"
echo ""

# Step 4: Zip the layer
echo -e "${YELLOW}Step 4: Creating zip archive...${NC}"

cd lambda-layer
zip -r ../rag-dependencies-layer.zip python -q
cd ..

ZIP_SIZE=$(du -h rag-dependencies-layer.zip | awk '{print $1}')
echo "Zip size: ${ZIP_SIZE}"

if [ ! -f "rag-dependencies-layer.zip" ]; then
    echo -e "${RED}ERROR: Failed to create zip file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Zip archive created${NC}"
echo ""

# Step 5: Publish to AWS Lambda
echo -e "${YELLOW}Step 5: Publishing Lambda Layer to AWS...${NC}"

PUBLISH_OUTPUT=$(aws lambda publish-layer-version \
  --layer-name $LAYER_NAME \
  --description "RAG dependencies (opensearch-py, PyPDF2, langchain) for Learning Navigator" \
  --zip-file fileb://rag-dependencies-layer.zip \
  --compatible-runtimes python${PYTHON_VERSION} \
  --region $REGION \
  2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Lambda Layer published successfully${NC}"

    # Extract Layer ARN
    LAYER_ARN=$(echo "$PUBLISH_OUTPUT" | jq -r '.LayerVersionArn')
    LAYER_VERSION=$(echo "$PUBLISH_OUTPUT" | jq -r '.Version')

    echo ""
    echo "=================================================="
    echo -e "${GREEN}SUCCESS!${NC}"
    echo "=================================================="
    echo ""
    echo "Layer Name: $LAYER_NAME"
    echo "Layer Version: $LAYER_VERSION"
    echo "Layer ARN: $LAYER_ARN"
    echo ""
    echo "Next steps:"
    echo "1. Deploy CDK stack: cd infrastructure && cdk deploy"
    echo "2. Attach layer to Lambda functions:"
    echo ""
    echo "   aws lambda update-function-configuration \\"
    echo "     --function-name learning-navigator-chat \\"
    echo "     --layers $LAYER_ARN \\"
    echo "     --region $REGION"
    echo ""
    echo "   aws lambda update-function-configuration \\"
    echo "     --function-name learning-navigator-doc-processor \\"
    echo "     --layers $LAYER_ARN \\"
    echo "     --region $REGION"
    echo ""

    # Save to file for later use
    echo "$LAYER_ARN" > lambda-layer-arn.txt
    echo "Layer ARN saved to: lambda-layer-arn.txt"

else
    echo -e "${RED}ERROR: Failed to publish Lambda Layer${NC}"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

# Step 6: Clean up (optional)
echo ""
read -p "Do you want to clean up local files (lambda-layer/)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf lambda-layer
    echo -e "${GREEN}✓ Cleanup complete${NC}"
else
    echo "Keeping lambda-layer/ directory for reference"
fi

echo ""
echo "=================================================="
echo "Lambda Layer creation complete!"
echo "=================================================="
