#!/usr/bin/env python3
"""
Learning Navigator - CDK Application Entry Point

This file is the entry point for AWS CDK.
It creates the CDK App and instantiates our infrastructure stacks.
"""

import os
import aws_cdk as cdk
from stacks.backend_stack import BackendStack


# Create CDK App
app = cdk.App()

# Get environment from environment variable or default to 'dev'
environment = os.environ.get('ENVIRONMENT', 'dev')

# Get AWS account and region
account = os.environ.get('CDK_DEFAULT_ACCOUNT')
region = 'us-west-2'  # US West (Oregon) - same as our S3 bucket

"""
BackendStack - Main infrastructure stack

Contains:
- DynamoDB table (Step 2)
- S3 buckets (Step 3)
- Cognito User Pool (Step 4)
- Lambda functions (Step 5)
- API Gateway (Step 6)

Environment configuration:
- Region: us-west-2 (matches S3 bucket location)
- Account: Uses default AWS credentials
"""
BackendStack(
    app,
    "LearningNavigatorBackendStack",
    stack_name="learning-navigator-backend",
    description="Learning Navigator Backend Infrastructure - DynamoDB, Lambda, API Gateway, Cognito",
    env=cdk.Environment(
        account=account,
        region=region
    ),
    tags={
        "Project": "LearningNavigator",
        "Environment": environment,
        "ManagedBy": "CDK",
        "Customer": "TheNationalCouncil",
    }
)

# Synthesize CloudFormation template
# This converts our Python code into CloudFormation JSON
app.synth()
