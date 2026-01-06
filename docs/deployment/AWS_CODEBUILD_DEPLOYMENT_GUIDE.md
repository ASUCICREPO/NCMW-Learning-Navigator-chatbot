# AWS CodeBuild Deployment Guide

**Project:** Learning Navigator - MHFA Learning Ecosystem
**Deployment Type:** Client Domain with Custom Domain
**Date:** January 6, 2026

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Custom Domain Configuration](#custom-domain-configuration)
5. [CodeBuild Configuration](#codebuild-configuration)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)
8. [Post-Deployment](#post-deployment)

---

## Prerequisites

### Required AWS Services
- ✅ AWS Account with admin access
- ✅ AWS CodeBuild
- ✅ AWS S3 (for hosting frontend)
- ✅ AWS CloudFront (CDN for frontend)
- ✅ AWS CDK (for backend infrastructure)
- ✅ Route 53 (for custom domain DNS)
- ✅ ACM (AWS Certificate Manager for SSL)

### Required Tools
- ✅ AWS CLI configured (`aws configure`)
- ✅ Node.js 18+ and npm
- ✅ Git
- ✅ Python 3.9+
- ✅ AWS CDK CLI (`npm install -g aws-cdk`)

### Required Credentials
- ✅ GitHub repository access (or your Git provider)
- ✅ AWS IAM user with deployment permissions
- ✅ Domain registrar access (for DNS configuration)

---

## Architecture Overview

```
┌─────────────────┐
│   GitHub Repo   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AWS CodeBuild  │
│  (CI/CD)        │
└────────┬────────┘
         │
         ├──────────────────┬────────────────┐
         ▼                  ▼                ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Frontend    │   │   Backend    │   │  Bedrock     │
│  (S3 +       │   │   (CDK)      │   │  Agent       │
│  CloudFront) │   │  - Lambda    │   │              │
└──────┬───────┘   │  - API GW    │   └──────────────┘
       │           │  - DynamoDB  │
       │           │  - Cognito   │
       │           └──────────────┘
       ▼
┌──────────────────┐
│  Route 53 DNS    │
│  (Custom Domain) │
└──────────────────┘
```

---

## Step-by-Step Deployment

### Phase 1: Prepare AWS Account

#### 1.1 Create IAM User for Deployment

```bash
# Create IAM user
aws iam create-user --user-name codebuild-deployer

# Attach required policies
aws iam attach-user-policy \
  --user-name codebuild-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name codebuild-deployer
```

**Save the output:**
- Access Key ID
- Secret Access Key

#### 1.2 Bootstrap AWS CDK

```bash
# Set your AWS account and region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-west-2  # Change to your preferred region

# Bootstrap CDK
cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
```

---

### Phase 2: Configure GitHub Repository

#### 2.1 Add GitHub Secrets

Navigate to: `GitHub Repo > Settings > Secrets and variables > Actions`

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | Your access key | CodeBuild AWS access |
| `AWS_SECRET_ACCESS_KEY` | Your secret key | CodeBuild AWS secret |
| `AWS_REGION` | `us-west-2` | Deployment region |
| `AWS_ACCOUNT_ID` | Your account ID | AWS account number |
| `GITHUB_TOKEN` | GitHub PAT | For Amplify/CodeBuild |
| `ADMIN_EMAIL` | `admin@clientdomain.com` | Admin email |

#### 2.2 Update Repository Settings

Add these environment-specific files to your repo:

**`.env.production`** (Frontend):
```bash
REACT_APP_API_URL=https://api.clientdomain.com
REACT_APP_USER_POOL_ID=us-west-2_XXXXX
REACT_APP_USER_POOL_CLIENT_ID=XXXXX
REACT_APP_BEDROCK_AGENT_ID=XXXXX
REACT_APP_BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

**`cdk.context.json`** (Backend):
```json
{
  "domainName": "clientdomain.com",
  "apiSubdomain": "api",
  "hostedZoneId": "XXXXX",
  "certificateArn": "arn:aws:acm:us-east-1:XXXXX:certificate/XXXXX"
}
```

---

### Phase 3: Create CodeBuild Project

#### 3.1 Create buildspec.yml

Create `buildspec.yml` in the root of your repository:

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
      python: 3.9
    commands:
      - echo "Installing dependencies..."
      - npm install -g aws-cdk
      - pip3 install aws-cdk-lib constructs

  pre_build:
    commands:
      - echo "Pre-build phase started on $(date)"
      - echo "Current directory: $(pwd)"
      - echo "Listing files..."
      - ls -la

      # Install frontend dependencies
      - echo "Installing frontend dependencies..."
      - cd frontend
      - npm ci
      - cd ..

      # Install backend dependencies
      - echo "Installing backend dependencies..."
      - cd cdk_backend
      - npm ci
      - cd ..

  build:
    commands:
      - echo "Build phase started on $(date)"

      # Build frontend
      - echo "Building frontend..."
      - cd frontend
      - npm run build
      - cd ..

      # Deploy backend infrastructure
      - echo "Deploying backend with CDK..."
      - cd cdk_backend
      - cdk synth
      - cdk deploy --all --require-approval never \
          -c githubToken=${GITHUB_TOKEN} \
          -c githubOwner=${GITHUB_OWNER} \
          -c githubRepo=${GITHUB_REPO} \
          -c adminEmail=${ADMIN_EMAIL}
      - cd ..

      # Get API Gateway URL from CDK outputs
      - export API_URL=$(aws cloudformation describe-stacks \
          --stack-name BlueberryStackLatest \
          --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
          --output text)
      - echo "API Gateway URL: $API_URL"

      # Update frontend environment variables
      - cd frontend/build
      - |
        cat > env-config.js << EOF
        window._env_ = {
          REACT_APP_API_URL: "$API_URL",
          REACT_APP_USER_POOL_ID: "$USER_POOL_ID",
          REACT_APP_USER_POOL_CLIENT_ID: "$USER_POOL_CLIENT_ID",
          REACT_APP_BEDROCK_AGENT_ID: "$BEDROCK_AGENT_ID",
          REACT_APP_BEDROCK_AGENT_ALIAS_ID: "TSTALIASID"
        };
        EOF
      - cd ../..

  post_build:
    commands:
      - echo "Post-build phase started on $(date)"

      # Deploy frontend to S3
      - echo "Deploying frontend to S3..."
      - aws s3 sync frontend/build/ s3://${S3_BUCKET_NAME}/ --delete

      # Invalidate CloudFront cache
      - echo "Invalidating CloudFront cache..."
      - aws cloudfront create-invalidation \
          --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
          --paths "/*"

      - echo "Build completed on $(date)"

artifacts:
  files:
    - '**/*'
  base-directory: frontend/build
  name: frontend-build

cache:
  paths:
    - 'frontend/node_modules/**/*'
    - 'cdk_backend/node_modules/**/*'
```

#### 3.2 Create CodeBuild Project via AWS Console

1. **Navigate to AWS CodeBuild Console**
   - Go to: https://console.aws.amazon.com/codebuild

2. **Create Build Project**
   - Click "Create build project"

   **Project Configuration:**
   - Project name: `learning-navigator-deploy`
   - Description: `CI/CD pipeline for Learning Navigator`

3. **Source Configuration**
   - Source provider: `GitHub`
   - Repository: Connect to your GitHub repository
   - Source version: `main` (or your default branch)
   - Webhook events: ✅ Enable webhook
     - Event type: `PUSH`
     - Branch filter: `^refs/heads/main$`

4. **Environment Configuration**
   - Environment image: `Managed image`
   - Operating system: `Amazon Linux 2`
   - Runtime: `Standard`
   - Image: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
   - Image version: `Always use the latest`
   - Environment type: `Linux`
   - Privileged: ✅ Enable (for Docker if needed)
   - Service role: Create new service role
   - Role name: `codebuild-learning-navigator-service-role`

5. **Buildspec Configuration**
   - Build specifications: `Use a buildspec file`
   - Buildspec name: `buildspec.yml`

6. **Artifacts Configuration**
   - Type: `Amazon S3`
   - Bucket name: Create new or select existing
   - Name: `frontend-build`
   - Artifacts packaging: `None`

7. **Logs Configuration**
   - CloudWatch logs: ✅ Enable
   - Group name: `/aws/codebuild/learning-navigator`
   - Stream name: `build-logs`

#### 3.3 Create CodeBuild Project via AWS CLI

Alternatively, use AWS CLI:

```bash
# Create CodeBuild project
aws codebuild create-project \
  --name learning-navigator-deploy \
  --source type=GITHUB,location=https://github.com/KHemanthRaju/ncwm_chatbot.git \
  --artifacts type=S3,location=learning-navigator-artifacts \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/amazonlinux2-x86_64-standard:5.0,computeType=BUILD_GENERAL1_SMALL \
  --service-role arn:aws:iam::${AWS_ACCOUNT_ID}:role/codebuild-service-role
```

---

### Phase 4: Configure S3 Bucket for Frontend

#### 4.1 Create S3 Bucket

```bash
# Set your domain name
DOMAIN_NAME="clientdomain.com"
BUCKET_NAME="learning-navigator-${DOMAIN_NAME}"

# Create bucket
aws s3 mb s3://${BUCKET_NAME} --region us-west-2

# Enable static website hosting
aws s3 website s3://${BUCKET_NAME}/ \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for public read
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket ${BUCKET_NAME} \
  --policy file://bucket-policy.json
```

---

### Phase 5: Configure CloudFront Distribution

#### 5.1 Request SSL Certificate

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name ${DOMAIN_NAME} \
  --subject-alternative-names "*.${DOMAIN_NAME}" \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
CERTIFICATE_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[?DomainName==`'${DOMAIN_NAME}'`].CertificateArn' \
  --output text)

echo "Certificate ARN: $CERTIFICATE_ARN"
```

**Validate Certificate:**
1. Go to ACM console in us-east-1
2. Find your certificate
3. Add CNAME records to your DNS provider
4. Wait for validation (usually 5-30 minutes)

#### 5.2 Create CloudFront Distribution

```bash
# Create CloudFront distribution configuration
cat > cloudfront-config.json << EOF
{
  "CallerReference": "learning-navigator-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["${DOMAIN_NAME}"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${BUCKET_NAME}",
        "DomainName": "${BUCKET_NAME}.s3-website-us-west-2.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET_NAME}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["HEAD", "GET"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["HEAD", "GET"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Comment": "Learning Navigator CloudFront Distribution",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERTIFICATE_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
EOF

# Create distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --region us-east-1
```

**Get Distribution ID:**
```bash
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[0]=='${DOMAIN_NAME}'].Id" \
  --output text)

echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
```

---

### Phase 6: Configure Custom Domain (Route 53)

#### 6.1 Create Hosted Zone

```bash
# Create hosted zone for your domain
aws route53 create-hosted-zone \
  --name ${DOMAIN_NAME} \
  --caller-reference $(date +%s)

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id" \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

#### 6.2 Get CloudFront Distribution Domain

```bash
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id ${DISTRIBUTION_ID} \
  --query 'Distribution.DomainName' \
  --output text)

echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
```

#### 6.3 Create DNS Records

```bash
# Create A record (alias to CloudFront)
cat > route53-record.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "${DOMAIN_NAME}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "${CLOUDFRONT_DOMAIN}",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.${DOMAIN_NAME}",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "${DOMAIN_NAME}"
          }
        ]
      }
    }
  ]
}
EOF

# Apply DNS changes
aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch file://route53-record.json
```

#### 6.4 Update Nameservers at Domain Registrar

```bash
# Get nameservers from Route 53
aws route53 get-hosted-zone \
  --id ${HOSTED_ZONE_ID} \
  --query 'DelegationSet.NameServers' \
  --output table
```

**Action Required:**
1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update nameservers to the Route 53 nameservers shown above
3. Wait for DNS propagation (24-48 hours, usually faster)

---

### Phase 7: Configure Environment Variables in CodeBuild

#### 7.1 Add Environment Variables to CodeBuild Project

```bash
# Update CodeBuild environment variables
aws codebuild update-project \
  --name learning-navigator-deploy \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "environmentVariables": [
      {"name": "S3_BUCKET_NAME", "value": "'${BUCKET_NAME}'", "type": "PLAINTEXT"},
      {"name": "CLOUDFRONT_DISTRIBUTION_ID", "value": "'${DISTRIBUTION_ID}'", "type": "PLAINTEXT"},
      {"name": "AWS_REGION", "value": "us-west-2", "type": "PLAINTEXT"},
      {"name": "GITHUB_TOKEN", "value": "YOUR_GITHUB_TOKEN", "type": "PARAMETER_STORE"},
      {"name": "GITHUB_OWNER", "value": "KHemanthRaju", "type": "PLAINTEXT"},
      {"name": "GITHUB_REPO", "value": "ncwm_chatbot", "type": "PLAINTEXT"},
      {"name": "ADMIN_EMAIL", "value": "admin@'${DOMAIN_NAME}'", "type": "PLAINTEXT"}
    ]
  }'
```

#### 7.2 Store Sensitive Variables in AWS Systems Manager Parameter Store

```bash
# Store GitHub token securely
aws ssm put-parameter \
  --name /codebuild/learning-navigator/github-token \
  --value "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" \
  --type "SecureString" \
  --overwrite

# Store other secrets
aws ssm put-parameter \
  --name /codebuild/learning-navigator/admin-email \
  --value "admin@${DOMAIN_NAME}" \
  --type "String" \
  --overwrite
```

---

### Phase 8: Deploy Backend Infrastructure

#### 8.1 Update CDK Stack for Custom Domain

Edit `/cdk_backend/lib/cdk_backend-stack.ts`:

```typescript
// Add custom domain configuration
const domainName = this.node.tryGetContext('domainName') || 'clientdomain.com';
const apiSubdomain = this.node.tryGetContext('apiSubdomain') || 'api';
const hostedZoneId = this.node.tryGetContext('hostedZoneId');
const certificateArn = this.node.tryGetContext('certificateArn');

// API Gateway custom domain
const customDomain = new apigateway.DomainName(this, 'CustomDomain', {
  domainName: `${apiSubdomain}.${domainName}`,
  certificate: acm.Certificate.fromCertificateArn(
    this,
    'Certificate',
    certificateArn
  ),
  endpointType: apigateway.EndpointType.EDGE,
});

// Map custom domain to API
new apigateway.BasePathMapping(this, 'ApiMapping', {
  domainName: customDomain,
  restApi: api,
});

// Add Route 53 record for API
const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
  hostedZoneId: hostedZoneId,
  zoneName: domainName,
});

new route53.ARecord(this, 'ApiAliasRecord', {
  zone: zone,
  recordName: apiSubdomain,
  target: route53.RecordTarget.fromAlias(
    new targets.ApiGatewayDomain(customDomain)
  ),
});
```

#### 8.2 Deploy Backend

```bash
cd cdk_backend

# Deploy with custom domain context
cdk deploy --all --require-approval never \
  -c domainName=${DOMAIN_NAME} \
  -c apiSubdomain=api \
  -c hostedZoneId=${HOSTED_ZONE_ID} \
  -c certificateArn=${CERTIFICATE_ARN} \
  -c githubToken=dummy \
  -c githubOwner=KHemanthRaju \
  -c githubRepo=ncwm_chatbot \
  -c adminEmail=admin@${DOMAIN_NAME}
```

---

### Phase 9: Trigger First Deployment

#### 9.1 Push to GitHub (Automatic Deployment)

```bash
# Commit buildspec.yml
git add buildspec.yml
git commit -m "Add CodeBuild configuration for automated deployment"
git push origin main
```

**CodeBuild will automatically:**
1. Detect the push to main branch
2. Start build process
3. Install dependencies
4. Build frontend
5. Deploy backend with CDK
6. Upload frontend to S3
7. Invalidate CloudFront cache

#### 9.2 Monitor Build Progress

```bash
# Get latest build ID
BUILD_ID=$(aws codebuild list-builds-for-project \
  --project-name learning-navigator-deploy \
  --query 'ids[0]' \
  --output text)

# Watch build logs
aws codebuild batch-get-builds \
  --ids ${BUILD_ID} \
  --query 'builds[0].currentPhase'
```

Or monitor in AWS Console:
https://console.aws.amazon.com/codebuild/home?region=us-west-2#/projects/learning-navigator-deploy/history

---

### Phase 10: Configure Cognito for Custom Domain

#### 10.1 Update Cognito User Pool

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cognito-idp list-user-pools \
  --max-results 10 \
  --query "UserPools[?Name=='Blueberry-User-Pool'].Id" \
  --output text)

# Update app client callback URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id ${USER_POOL_ID} \
  --client-id ${USER_POOL_CLIENT_ID} \
  --callback-urls "https://${DOMAIN_NAME}/callback" "http://localhost:3000/callback" \
  --logout-urls "https://${DOMAIN_NAME}/" "http://localhost:3000/" \
  --allowed-o-auth-flows "code" "implicit" \
  --allowed-o-auth-scopes "email" "openid" "profile"
```

---

## Environment Variables Reference

### CodeBuild Environment Variables

| Variable | Example Value | Source |
|----------|---------------|--------|
| `S3_BUCKET_NAME` | `learning-navigator-clientdomain.com` | Created in Phase 4 |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1234567890ABC` | Created in Phase 5 |
| `AWS_REGION` | `us-west-2` | Your choice |
| `GITHUB_TOKEN` | `ghp_xxxx` | GitHub PAT |
| `GITHUB_OWNER` | `KHemanthRaju` | GitHub username |
| `GITHUB_REPO` | `ncwm_chatbot` | Repository name |
| `ADMIN_EMAIL` | `admin@clientdomain.com` | Admin email |
| `USER_POOL_ID` | `us-west-2_XXXXX` | From Cognito |
| `USER_POOL_CLIENT_ID` | `xxxxx` | From Cognito |
| `BEDROCK_AGENT_ID` | `Q1HPKAJXXL` | From Bedrock |

### Frontend Environment Variables (.env.production)

```bash
REACT_APP_API_URL=https://api.clientdomain.com
REACT_APP_USER_POOL_ID=us-west-2_XXXXX
REACT_APP_USER_POOL_CLIENT_ID=XXXXX
REACT_APP_BEDROCK_AGENT_ID=Q1HPKAJXXL
REACT_APP_BEDROCK_AGENT_ALIAS_ID=TSTALIASID
```

---

## Troubleshooting

### Build Fails: "Access Denied"

**Problem:** CodeBuild service role lacks permissions

**Solution:**
```bash
# Attach AdministratorAccess policy (for initial setup)
aws iam attach-role-policy \
  --role-name codebuild-learning-navigator-service-role \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### CloudFront Not Serving Latest Build

**Problem:** Cache not invalidated

**Solution:**
```bash
# Manual cache invalidation
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

### Domain Not Resolving

**Problem:** DNS not propagated or nameservers not updated

**Solution:**
```bash
# Check DNS propagation
dig ${DOMAIN_NAME}
nslookup ${DOMAIN_NAME}

# Verify nameservers
whois ${DOMAIN_NAME} | grep "Name Server"
```

### SSL Certificate Validation Stuck

**Problem:** DNS validation records not added

**Solution:**
1. Check ACM console for CNAME records
2. Add CNAME records to your DNS provider
3. Wait 5-30 minutes for validation

### API Gateway Returns 403

**Problem:** CORS not configured or API not deployed

**Solution:**
```bash
# Redeploy CDK stack
cd cdk_backend
cdk deploy --all --require-approval never
```

---

## Post-Deployment Checklist

### Verify Deployment

- [ ] Frontend accessible at https://clientdomain.com
- [ ] SSL certificate valid (green padlock)
- [ ] API endpoint accessible at https://api.clientdomain.com
- [ ] Admin login works
- [ ] Chatbot responds to queries
- [ ] Escalation emails sending
- [ ] Analytics dashboard loading
- [ ] Mobile responsive

### Security Checks

- [ ] All secrets in Parameter Store (not hardcoded)
- [ ] S3 bucket not publicly writable
- [ ] CloudFront enforcing HTTPS
- [ ] API Gateway has rate limiting
- [ ] Cognito user pool secured
- [ ] DynamoDB encryption enabled

### Performance Checks

- [ ] CloudFront cache hit ratio > 80%
- [ ] API response time < 1 second
- [ ] Frontend load time < 3 seconds
- [ ] Lighthouse score > 90

### Monitoring Setup

- [ ] CloudWatch logs enabled
- [ ] CloudWatch alarms configured
- [ ] SNS notifications for errors
- [ ] Budget alerts set up

---

## Maintenance & Updates

### Deploying Updates

1. **Make code changes**
2. **Commit and push to main branch**
3. **CodeBuild automatically deploys**
4. **Monitor build in CodeBuild console**

### Manual Deployment

```bash
# Trigger build manually
aws codebuild start-build \
  --project-name learning-navigator-deploy
```

### Rolling Back

```bash
# Frontend rollback (restore previous S3 version)
aws s3 sync s3://${BUCKET_NAME}/ s3://${BUCKET_NAME}-backup/
aws s3 sync s3://${BUCKET_NAME}-backup/ s3://${BUCKET_NAME}/ --delete

# Backend rollback
cd cdk_backend
cdk deploy --all --require-approval never --previous
```

---

## Cost Estimation

### Monthly AWS Costs (Approximate)

| Service | Usage | Cost |
|---------|-------|------|
| S3 | 1 GB storage | $0.02 |
| CloudFront | 10 GB transfer | $0.85 |
| Route 53 | 1 hosted zone | $0.50 |
| API Gateway | 1M requests | $3.50 |
| Lambda | 1M invocations | $0.20 |
| DynamoDB | On-demand | $1.25 |
| Cognito | <50K MAU | Free |
| Bedrock | Pay per use | Variable |
| CodeBuild | 100 min/month | Free tier |
| **Total** | | **~$6-10/month** |

---

## Support & Resources

### AWS Documentation
- CodeBuild: https://docs.aws.amazon.com/codebuild/
- CloudFront: https://docs.aws.amazon.com/cloudfront/
- Route 53: https://docs.aws.amazon.com/route53/
- CDK: https://docs.aws.amazon.com/cdk/

### Project Documentation
- README.md
- CLIENT_DEPLOYMENT_GUIDE.md
- ARCHITECTURE_DIAGRAMS.md

### Contact
- **Project Lead:** hkoneti@asu.edu
- **GitHub:** https://github.com/KHemanthRaju/ncwm_chatbot

---

**Created By:** AI Assistant (Claude)
**Last Updated:** January 6, 2026
**Status:** ✅ Production Ready
