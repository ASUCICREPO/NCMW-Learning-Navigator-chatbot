#!/bin/bash

# Knowledge Base Sync Script
# Triggers ingestion of documents from S3 to Bedrock Knowledge Base
#
# Usage:
#   ./sync-knowledge-base.sh --kb-id YOUR_KB_ID --region us-west-2

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
KB_ID=""
WAIT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --kb-id)
            KB_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --wait)
            WAIT=true
            shift
            ;;
        --help)
            echo "Usage: ./sync-knowledge-base.sh --kb-id KB_ID [OPTIONS]"
            echo ""
            echo "Required:"
            echo "  --kb-id     Knowledge Base ID"
            echo ""
            echo "Optional:"
            echo "  --region    AWS region (default: us-west-2)"
            echo "  --wait      Wait for sync to complete"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate
if [ -z "$KB_ID" ]; then
    print_error "Missing required argument: --kb-id"
    echo "Usage: ./sync-knowledge-base.sh --kb-id KB_ID"
    exit 1
fi

print_info "Knowledge Base ID: $KB_ID"
print_info "Region: $REGION"

# Get data source ID
print_info "Getting data source ID..."
DATA_SOURCE_ID=$(aws bedrock-agent list-data-sources \
    --knowledge-base-id "$KB_ID" \
    --region "$REGION" \
    --query 'dataSourceSummaries[0].dataSourceId' \
    --output text)

if [ -z "$DATA_SOURCE_ID" ] || [ "$DATA_SOURCE_ID" = "None" ]; then
    print_error "No data source found for Knowledge Base: $KB_ID"
    exit 1
fi

print_success "Data Source ID: $DATA_SOURCE_ID"

# Start ingestion job
print_info "Starting ingestion job..."
JOB_OUTPUT=$(aws bedrock-agent start-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DATA_SOURCE_ID" \
    --region "$REGION" \
    --output json)

JOB_ID=$(echo "$JOB_OUTPUT" | jq -r '.ingestionJob.ingestionJobId')
JOB_STATUS=$(echo "$JOB_OUTPUT" | jq -r '.ingestionJob.status')

print_success "Ingestion job started"
print_info "Job ID: $JOB_ID"
print_info "Status: $JOB_STATUS"

# Wait for completion if --wait flag is set
if [ "$WAIT" = true ]; then
    print_info "Waiting for ingestion to complete..."

    while true; do
        CURRENT_STATUS=$(aws bedrock-agent get-ingestion-job \
            --knowledge-base-id "$KB_ID" \
            --data-source-id "$DATA_SOURCE_ID" \
            --ingestion-job-id "$JOB_ID" \
            --region "$REGION" \
            --query 'ingestionJob.status' \
            --output text)

        case "$CURRENT_STATUS" in
            "COMPLETE")
                print_success "Ingestion completed successfully!"

                # Get statistics
                STATS=$(aws bedrock-agent get-ingestion-job \
                    --knowledge-base-id "$KB_ID" \
                    --data-source-id "$DATA_SOURCE_ID" \
                    --ingestion-job-id "$JOB_ID" \
                    --region "$REGION" \
                    --query 'ingestionJob.statistics' \
                    --output json)

                echo ""
                print_info "Ingestion Statistics:"
                echo "$STATS" | jq '.'
                break
                ;;
            "FAILED")
                print_error "Ingestion failed"

                # Get failure reasons
                FAILURE=$(aws bedrock-agent get-ingestion-job \
                    --knowledge-base-id "$KB_ID" \
                    --data-source-id "$DATA_SOURCE_ID" \
                    --ingestion-job-id "$JOB_ID" \
                    --region "$REGION" \
                    --query 'ingestionJob.failureReasons' \
                    --output json)

                echo ""
                print_error "Failure Reasons:"
                echo "$FAILURE" | jq '.'
                exit 1
                ;;
            "STARTING"|"IN_PROGRESS")
                echo -ne "\rStatus: $CURRENT_STATUS ... (waiting)"
                sleep 10
                ;;
            *)
                print_warning "Unknown status: $CURRENT_STATUS"
                sleep 10
                ;;
        esac
    done
else
    echo ""
    print_info "Ingestion job is running in the background"
    print_info "Check status with:"
    echo ""
    echo "  aws bedrock-agent get-ingestion-job \\"
    echo "    --knowledge-base-id $KB_ID \\"
    echo "    --data-source-id $DATA_SOURCE_ID \\"
    echo "    --ingestion-job-id $JOB_ID \\"
    echo "    --region $REGION"
    echo ""
    print_info "Or re-run with --wait flag to monitor progress"
fi

echo ""
print_success "Done! 🎉"
