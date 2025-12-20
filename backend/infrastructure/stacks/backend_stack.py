"""
BackendStack - Main Infrastructure Stack

This stack contains all backend infrastructure:
- DynamoDB table (Step 2) ✅
- S3 buckets (Step 3) ✅
- Cognito User Pool (Step 4) ✅
- Lambda functions (Step 5) ✅
- API Gateway (Step 6) ✅
- Bedrock integration (Step 7) ✅
- OpenSearch + RAG (Step 8) ✅
"""

from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    Duration,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_cognito as cognito,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_apigateway as apigateway,
    aws_opensearchservice as opensearch,  # Added for Step 8
    aws_ec2 as ec2,  # Added for OpenSearch VPC (optional)
)
from constructs import Construct
import os


class BackendStack(Stack):
    """
    Main backend infrastructure stack.

    Resources:
    - DynamoDB table with single-table design (Step 2)
    - S3 buckets for PDFs, frontend, and logs (Step 3)
    - Cognito User Pool for authentication (Step 4)
    - Lambda functions for API endpoints (Step 5)
    - API Gateway with Cognito authorizer (Step 6)
    - Bedrock Claude integration (Step 7)
    - OpenSearch domain for RAG vector search (Step 8)
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # =====================================================================
        # STEP 2: DYNAMODB TABLE
        # =====================================================================

        """
        DynamoDB Single Table Design

        Access Patterns:
        1. Get user profile: PK=USER#<userId>, SK=PROFILE
        2. List conversations for user: PK=USER#<userId>, SK begins_with CONV#
        3. Get conversation: PK=CONV#<convId>, SK=METADATA
        4. List messages in conversation: PK=CONV#<convId>, SK begins_with MSG#
        5. Get message: PK=CONV#<convId>, SK=MSG#<timestamp>

        Why this design?
        - Single table = lower cost ($1.25/month vs $3.75 for 3 tables)
        - Related data in one query (no joins needed)
        - DynamoDB best practice for serverless apps
        """

        self.main_table = dynamodb.Table(
            self,
            "MainTable",

            # Table name that appears in AWS Console
            table_name="learning-navigator",

            # Partition Key (PK) - Primary identifier
            # Examples: USER#user-123, CONV#conv-456
            partition_key=dynamodb.Attribute(
                name="PK",
                type=dynamodb.AttributeType.STRING
            ),

            # Sort Key (SK) - Secondary identifier for sorting/filtering
            # Examples: PROFILE, CONV#conv-456, MSG#2025-12-20T10:30:00Z
            sort_key=dynamodb.Attribute(
                name="SK",
                type=dynamodb.AttributeType.STRING
            ),

            # Billing Mode: PAY_PER_REQUEST (On-Demand)
            # Trade-off: Pay per request vs provisioned capacity
            # - On-Demand: $1.25/million reads, $6.25/million writes
            # - Provisioned: Fixed monthly cost, needs capacity planning
            # We chose On-Demand because traffic is unpredictable
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,

            # Point-in-Time Recovery (PITR)
            # Trade-off: +$0.20/GB/month for backups
            # Enables recovery to any point in last 35 days
            # Essential for production (protects against accidental deletes)
            point_in_time_recovery=True,

            # Encryption at rest
            # Trade-off: AWS-managed vs Customer-managed keys
            # - AWS-managed: Free, automatic
            # - Customer-managed (KMS): $1/month + $0.03 per 10k requests
            # We chose AWS-managed for MVP (can upgrade later)
            encryption=dynamodb.TableEncryption.AWS_MANAGED,

            # Time-to-Live (TTL) attribute
            # Automatically deletes items after expiration
            # Use for: temporary sessions, expired tokens
            # No additional cost!
            time_to_live_attribute="expiresAt",

            # Removal Policy: What happens when we delete the stack?
            # Trade-off: RETAIN vs DESTROY
            # - RETAIN: Table survives stack deletion (safe, but manual cleanup)
            # - DESTROY: Table deleted with stack (clean, but risky)
            # We use RETAIN for production safety
            removal_policy=RemovalPolicy.RETAIN,

            # Stream specification (optional, disabled for now)
            # Would enable real-time change tracking
            # Cost: $0.02 per 100k read request units
            # We'll enable this later if we need real-time analytics
            # stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        )

        # =====================================================================
        # GLOBAL SECONDARY INDEX (GSI)
        # =====================================================================

        """
        GSI for Date-Based Queries (Analytics)

        Use case: Admin dashboard needs to query:
        - "Show all conversations from last 30 days"
        - "Count messages per day"

        Why GSI?
        - DynamoDB can't query by attributes other than PK/SK
        - GSI creates alternative query path

        Trade-off:
        - Adds ~30% to storage cost
        - Enables fast time-range queries
        - Worth it for analytics features
        """

        self.main_table.add_global_secondary_index(
            index_name="GSI1PK-GSI1SK-index",

            # GSI Partition Key: Type of entity (for analytics)
            # Examples: DATE#2025-12-20, USER#user-123
            partition_key=dynamodb.Attribute(
                name="GSI1PK",
                type=dynamodb.AttributeType.STRING
            ),

            # GSI Sort Key: Additional sorting dimension
            # Examples: CONV#conv-456, timestamp
            sort_key=dynamodb.Attribute(
                name="GSI1SK",
                type=dynamodb.AttributeType.STRING
            ),

            # Projection: What attributes to copy to GSI?
            # Trade-off:
            # - ALL: Copy everything (fastest queries, +100% storage)
            # - KEYS_ONLY: Copy only keys (cheapest, may need main table lookup)
            # - INCLUDE: Copy specific attributes (balanced)
            # We chose ALL for analytics speed
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # =====================================================================
        # CLOUDFORMATION OUTPUTS
        # =====================================================================

        # Output table name (useful for Lambda functions)
        CfnOutput(
            self,
            "DynamoDBTableName",
            value=self.main_table.table_name,
            description="DynamoDB table name for all data",
            export_name="LearningNavigatorTableName",
        )

        # Output table ARN (for IAM permissions)
        CfnOutput(
            self,
            "DynamoDBTableArn",
            value=self.main_table.table_arn,
            description="DynamoDB table ARN",
            export_name="LearningNavigatorTableArn",
        )

        # Stack info outputs
        CfnOutput(
            self,
            "StackName",
            value=self.stack_name,
            description="Name of the CloudFormation stack",
            export_name="LearningNavigatorStackName",
        )

        CfnOutput(
            self,
            "Region",
            value=self.region,
            description="AWS Region where stack is deployed",
            export_name="LearningNavigatorRegion",
        )

        # =====================================================================
        # STEP 3: S3 BUCKETS
        # =====================================================================

        """
        S3 Buckets for Different Storage Needs

        Why 3 separate buckets?
        - Separation of concerns (different access patterns)
        - Different security policies per bucket
        - Independent lifecycle policies
        - Easier to audit and manage

        Alternative: Single bucket with prefixes
        - Pro: Simpler management
        - Con: Same lifecycle/permissions for all data
        - We chose separate buckets for better security isolation
        """

        # ---------------------------------------------------------------------
        # 1. PDFs Bucket (Knowledge Base - Already Exists)
        # ---------------------------------------------------------------------

        """
        PDFs Bucket: Stores source documents for RAG

        Why import existing bucket instead of creating new one?
        - Bucket already created in previous setup
        - Contains existing PDFs we want to keep
        - CDK can't manage resources it didn't create (would error)

        Use Bucket.from_bucket_name() to reference existing resources
        """

        self.pdfs_bucket = s3.Bucket.from_bucket_name(
            self,
            "PDFsBucket",
            bucket_name="national-council-s3-pdfs"
        )

        # ---------------------------------------------------------------------
        # 2. Frontend Bucket (React App Hosting - NEW)
        # ---------------------------------------------------------------------

        """
        Frontend Bucket: Hosts static React application

        Why S3 for frontend hosting?
        - Cost: ~$0.023/GB storage + $0.09/GB transfer = ~$1/month
        - Performance: Pairs with CloudFront CDN (low latency globally)
        - Scalability: Auto-scales to any traffic
        - No servers to manage

        Trade-off: S3 + CloudFront vs EC2/ECS
        - S3: Cheap, simple, static only
        - EC2: More control, can run backend, $5-20/month minimum
        - We chose S3 since React is static files after build
        """

        self.frontend_bucket = s3.Bucket(
            self,
            "FrontendBucket",

            # Bucket name (must be globally unique across ALL AWS accounts)
            bucket_name="learning-navigator-frontend",

            # Versioning: Keep history of object changes
            # Trade-off: +20-50% storage cost for safety
            # Benefit: Can restore previous version if bad deploy
            # Essential for production websites
            versioned=True,

            # Encryption: AWS-managed keys (free)
            # Trade-off: S3-managed vs KMS vs customer-provided keys
            # - S3-managed: Free, automatic, sufficient for public website
            # - KMS: $1/month, audit logs, overkill for frontend assets
            encryption=s3.BucketEncryption.S3_MANAGED,

            # Block public access: Disabled to allow website hosting
            # Trade-off: Public vs CloudFront-only access
            # - Public: Simple, works immediately
            # - CloudFront OAI: More secure, requires CloudFront setup
            # We'll use public for MVP, add CloudFront + OAI later
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),

            # Website hosting configuration
            # Enables S3 to serve index.html for React routing
            website_index_document="index.html",
            website_error_document="index.html",  # React handles routing

            # CORS: Allow frontend to call API Gateway
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                    ],
                    allowed_origins=["*"],  # Will restrict to domain later
                    allowed_headers=["*"],
                    max_age=3000,
                )
            ],

            # Lifecycle rules: Optimize costs for old versions
            # Trade-off: Storage cost vs version retention
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="delete-old-versions",
                    # Keep current version forever
                    # Delete non-current versions after 30 days
                    noncurrent_version_expiration=Duration.days(30),
                    enabled=True,
                )
            ],

            # Removal policy: Keep bucket if stack deleted
            # Trade-off: RETAIN vs DESTROY
            # - RETAIN: Safe, manual cleanup needed
            # - DESTROY: Clean, but risky for production
            removal_policy=RemovalPolicy.RETAIN,

            # Auto-delete objects on bucket deletion?
            # Trade-off: Convenience vs safety
            # - True: Stack delete removes everything (dangerous!)
            # - False: Must empty bucket manually before deletion (safe)
            # We use False for production safety
            auto_delete_objects=False,
        )

        # ---------------------------------------------------------------------
        # 3. Logs Bucket (CloudWatch Log Archives - NEW)
        # ---------------------------------------------------------------------

        """
        Logs Bucket: Long-term storage for application logs

        Why separate logs bucket?
        - CloudWatch Logs: $0.50/GB storage + $0.03/GB ingestion
        - S3 Storage: $0.023/GB (22x cheaper!)
        - Move logs to S3 after 30 days for cost savings

        Trade-off: CloudWatch only vs CloudWatch + S3
        - CloudWatch only: Simple, but expensive long-term
        - CloudWatch + S3: Complex setup, saves 95% on old logs
        - We chose hybrid approach for cost optimization
        """

        self.logs_bucket = s3.Bucket(
            self,
            "LogsBucket",

            bucket_name="learning-navigator-logs",

            # No versioning for logs (not needed, saves cost)
            versioned=False,

            # Encryption: Required for compliance
            encryption=s3.BucketEncryption.S3_MANAGED,

            # Block all public access (logs should never be public!)
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,

            # Lifecycle rules: Aggressive cost optimization
            # Trade-off: Retention period vs cost vs compliance
            lifecycle_rules=[
                # Move to cheaper storage tiers over time
                s3.LifecycleRule(
                    id="archive-old-logs",
                    enabled=True,

                    # After 90 days: Move to Glacier (1/5th the cost)
                    # Standard: $0.023/GB → Glacier: $0.004/GB
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=Duration.days(90)
                        ),
                        # After 180 days: Move to Deep Archive (1/20th cost)
                        # Standard: $0.023/GB → Deep Archive: $0.00099/GB
                        s3.Transition(
                            storage_class=s3.StorageClass.DEEP_ARCHIVE,
                            transition_after=Duration.days(180)
                        ),
                    ],

                    # After 1 year: Delete logs entirely
                    # Adjust based on compliance requirements
                    # (Some industries require 7 years retention)
                    expiration=Duration.days(365),
                )
            ],

            # Keep bucket if stack deleted (logs are important!)
            removal_policy=RemovalPolicy.RETAIN,
            auto_delete_objects=False,
        )

        # =====================================================================
        # CLOUDFORMATION OUTPUTS (S3)
        # =====================================================================

        # PDFs bucket (existing)
        CfnOutput(
            self,
            "PDFsBucketName",
            value=self.pdfs_bucket.bucket_name,
            description="S3 bucket for PDF documents (knowledge base)",
            export_name="LearningNavigatorPDFsBucket",
        )

        # Frontend bucket (new)
        CfnOutput(
            self,
            "FrontendBucketName",
            value=self.frontend_bucket.bucket_name,
            description="S3 bucket for React frontend hosting",
            export_name="LearningNavigatorFrontendBucket",
        )

        CfnOutput(
            self,
            "FrontendBucketWebsiteURL",
            value=self.frontend_bucket.bucket_website_url,
            description="Frontend website URL",
            export_name="LearningNavigatorFrontendURL",
        )

        # Logs bucket (new)
        CfnOutput(
            self,
            "LogsBucketName",
            value=self.logs_bucket.bucket_name,
            description="S3 bucket for log archives",
            export_name="LearningNavigatorLogsBucket",
        )

        # =====================================================================
        # STEP 3.5: OPENSEARCH DOMAIN (STEP 8)
        # =====================================================================

        """
        OpenSearch Service: Vector Search for RAG (Retrieval-Augmented Generation)

        Why OpenSearch?
        - Vector search for semantic similarity
        - Hybrid search (keyword + semantic)
        - AWS-managed (no server maintenance)
        - Integrates with Bedrock for embeddings

        Trade-off: OpenSearch vs Pinecone vs FAISS
        - OpenSearch: AWS-native, full-featured, $50-100/month (t3.small)
        - Pinecone: Serverless, simple, $70-140/month
        - FAISS: Self-hosted, free, requires management
        - We chose OpenSearch for AWS integration and flexibility

        Architecture:
        - Single-node cluster for MVP (t3.small.search)
        - No VPC (publicly accessible with IAM auth)
        - EBS storage for vectors and documents
        - Upgrade to multi-node for production
        """

        # ---------------------------------------------------------------------
        # OpenSearch Domain Configuration
        # ---------------------------------------------------------------------

        self.opensearch_domain = opensearch.Domain(
            self,
            "OpenSearchDomain",

            # Domain name (must be lowercase, no underscores)
            domain_name="learning-navigator",

            # Version: OpenSearch 2.11 (latest stable)
            # Supports vector search with k-NN plugin
            version=opensearch.EngineVersion.OPENSEARCH_2_11,

            # Cluster Configuration
            # Trade-off: Single-node vs Multi-node
            # - Single-node: $50/month, good for MVP, no HA
            # - Multi-node: $150+/month, production-ready, HA
            # We chose single-node for cost savings in MVP
            capacity=opensearch.CapacityConfig(
                # Instance type: t3.small.search
                # - 2 vCPU, 2 GB RAM
                # - Good for <100K documents
                # - Can scale to t3.medium (4GB) or m6g later
                data_node_instance_type="t3.small.search",

                # Number of data nodes
                # 1 = single-node (no HA, lower cost)
                # 3 = multi-node (HA, higher cost)
                data_nodes=1,

                # Master nodes (optional, for large clusters)
                # Not needed for single-node MVP
                # master_node_instance_type="t3.small.search",
                # master_nodes=0,
            ),

            # EBS Storage Configuration
            ebs=opensearch.EbsOptions(
                # Enable EBS storage (required for persistent data)
                enabled=True,

                # Volume size: 10 GB for MVP
                # Enough for ~50K-100K document embeddings
                # Can scale to 100 GB+ later
                volume_size=10,

                # Volume type: gp3 (General Purpose SSD)
                # Trade-off: gp3 vs gp2 vs io1
                # - gp3: $0.08/GB/month, 3000 IOPS baseline, best value
                # - gp2: $0.10/GB/month, variable IOPS
                # - io1: $0.125/GB/month + $0.065/IOPS, for high performance
                volume_type=ec2.EbsDeviceVolumeType.GP3,
            ),

            # Network Configuration
            # Trade-off: Public vs VPC
            # - Public (no VPC): Simpler, cheaper, IAM auth only
            # - VPC: More secure, requires NAT Gateway ($32/month)
            # We chose public with IAM for MVP simplicity
            # vpc=None means publicly accessible

            # Access Policy: Allow Lambda to access
            # Will be updated after Lambda role is created
            access_policies=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    principals=[iam.AnyPrincipal()],
                    actions=["es:*"],
                    resources=[f"arn:aws:es:{self.region}:{self.account}:domain/learning-navigator/*"],
                    conditions={
                        "IpAddress": {
                            # Allow from Lambda (all AWS IPs)
                            # Will be restricted to specific Lambda role later
                            "aws:SourceIp": ["0.0.0.0/0"]
                        }
                    }
                )
            ],

            # Encryption
            # All data encrypted at rest (AWS-managed keys)
            encryption_at_rest=opensearch.EncryptionAtRestOptions(
                enabled=True
            ),

            # Node-to-node encryption (TLS)
            node_to_node_encryption=True,

            # Enforce HTTPS for API calls
            enforce_https=True,

            # Fine-grained access control (optional, adds complexity)
            # Disabled for MVP (using IAM only)
            fine_grained_access_control=opensearch.AdvancedSecurityOptions(
                master_user_arn=None  # Disabled
            ),

            # Automated snapshots (daily backups)
            # Retention: 14 days (default)
            automated_snapshot_start_hour=2,  # 2 AM UTC

            # Logging (optional, adds cost)
            # Enable for production debugging
            logging=opensearch.LoggingOptions(
                slow_search_log_enabled=False,  # Disabled for MVP
                app_log_enabled=False,  # Disabled for MVP
                slow_index_log_enabled=False,  # Disabled for MVP
            ),

            # Advanced options
            # k-NN plugin enabled by default in OpenSearch 2.x
            advanced_options={
                # Enable k-NN for vector search
                "knn.algo_param.index_thread_qty": "2",
                "knn.memory.circuit_breaker.enabled": "true",
                "knn.memory.circuit_breaker.limit": "50%",
            },

            # Removal policy
            # DESTROY = delete domain when stack deleted (good for dev)
            # RETAIN = keep domain when stack deleted (good for prod)
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ---------------------------------------------------------------------
        # CloudFormation Outputs (OpenSearch)
        # ---------------------------------------------------------------------

        CfnOutput(
            self,
            "OpenSearchDomainEndpoint",
            value=self.opensearch_domain.domain_endpoint,
            description="OpenSearch domain endpoint for RAG",
            export_name="LearningNavigatorOpenSearchEndpoint",
        )

        CfnOutput(
            self,
            "OpenSearchDomainArn",
            value=self.opensearch_domain.domain_arn,
            description="OpenSearch domain ARN",
            export_name="LearningNavigatorOpenSearchArn",
        )

        # =====================================================================
        # STEP 4: COGNITO USER POOL
        # =====================================================================

        """
        Cognito User Pool: Authentication and User Management

        Why Cognito?
        - Managed service (no auth server to maintain)
        - OAuth 2.0 / OpenID Connect compliant
        - Built-in security features (MFA, password policies)
        - Integrates seamlessly with API Gateway, Lambda
        - Cost: $0.0055 per MAU (Monthly Active User) after 50K free tier

        Trade-off: Cognito vs Auth0/Okta vs Custom
        - Cognito: AWS-native, cheap, good for MVP
        - Auth0/Okta: More features, better UX, $240-1200/month
        - Custom: Full control, high maintenance, security risk
        - We chose Cognito for cost and AWS integration
        """

        # ---------------------------------------------------------------------
        # User Pool Configuration
        # ---------------------------------------------------------------------

        self.user_pool = cognito.UserPool(
            self,
            "UserPool",

            # Pool name visible in AWS Console
            user_pool_name="learning-navigator-users",

            # Sign-in: Email as username
            # Trade-off: Email vs Username vs Phone
            # - Email: User-friendly, easy to remember, standard for B2B
            # - Username: More private, but users forget them
            # - Phone: Good for SMS MFA, but international issues
            # We chose email for instructor/staff ease of use
            sign_in_aliases=cognito.SignInAliases(
                email=True,
                username=False,
                phone=False
            ),

            # Self sign-up: Disabled (admin invites only)
            # Trade-off: Self sign-up vs Admin-only
            # - Self sign-up: Open registration, needs verification
            # - Admin-only: Controlled access, less spam/abuse
            # We chose admin-only for internal staff/instructor system
            self_sign_up_enabled=False,

            # Email verification required
            # Trade-off: Email verification vs Phone vs None
            # - Email: Standard, reliable, free
            # - Phone: Faster, but SMS costs $0.00645/message
            # - None: Risky (fake accounts)
            # We chose email for zero cost and reliability
            auto_verify=cognito.AutoVerifiedAttrs(email=True),

            # Standard attributes (built-in Cognito fields)
            # Trade-off: Standard vs Custom attributes
            # - Standard: Pre-defined, work everywhere, can't change
            # - Custom: Flexible, but mutable and searchable limits
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(
                    required=True,
                    mutable=True  # Users can update email
                ),
                given_name=cognito.StandardAttribute(
                    required=True,
                    mutable=True
                ),
                family_name=cognito.StandardAttribute(
                    required=True,
                    mutable=True
                ),
                preferred_username=cognito.StandardAttribute(
                    required=False,
                    mutable=True
                ),
            ),

            # Custom attributes for our use case
            # Trade-off: Custom attributes limitations
            # - Mutable: Can be changed (good for role)
            # - Not searchable: Can't filter users by custom attributes
            # - Max 50 custom attributes per pool
            custom_attributes={
                "role": cognito.StringAttribute(
                    min_len=1,
                    max_len=50,
                    mutable=True  # Admin can change user role
                ),
                "organization": cognito.StringAttribute(
                    min_len=0,
                    max_len=100,
                    mutable=True
                ),
            },

            # Password policy
            # Trade-off: Security vs User Experience
            # - Strict: More secure, but users forget/reset more
            # - Lenient: Better UX, but less secure
            # We chose balanced approach (HIPAA-compatible)
            password_policy=cognito.PasswordPolicy(
                min_length=12,  # HIPAA recommends 12+
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
                temp_password_validity=Duration.days(7)
            ),

            # Account recovery
            # Trade-off: Email vs Phone vs Admin-only
            # - Email: Free, easy, standard
            # - Phone: Faster, but SMS costs
            # - Admin-only: Most secure, but support burden
            # We chose email for balance of security and UX
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,

            # MFA (Multi-Factor Authentication)
            # Trade-off: Required vs Optional vs Off
            # - Required: Most secure, but friction for users
            # - Optional: Users choose (recommended)
            # - Off: Easier UX, less secure
            # We chose optional to let users decide
            mfa=cognito.Mfa.OPTIONAL,

            # MFA methods available
            # Trade-off: SMS vs TOTP vs Both
            # - SMS: Easy, but costs $0.00645/message
            # - TOTP (authenticator apps): Free, more secure
            # - Both: Best UX, users choose
            # We enable both for flexibility
            mfa_second_factor=cognito.MfaSecondFactor(
                sms=True,
                otp=True  # Time-based one-time password (Google Authenticator, etc.)
            ),

            # Email settings
            # Trade-off: Cognito email vs SES
            # - Cognito default: 50 emails/day limit, free
            # - SES: Unlimited, $0.10 per 1000 emails
            # We start with Cognito default, upgrade to SES later
            email=cognito.UserPoolEmail.with_cognito(),

            # Advanced security features
            # Trade-off: Cost vs Security
            # - OFF: Free
            # - AUDIT: Track suspicious activity, free
            # - ENFORCED: Block suspicious activity, $0.05/MAU
            # We chose AUDIT for visibility without extra cost
            advanced_security_mode=cognito.AdvancedSecurityMode.AUDIT,

            # User invitation email
            user_invitation=cognito.UserInvitationConfig(
                email_subject="Welcome to Learning Navigator!",
                email_body=(
                    "Hello {username},<br><br>"
                    "You've been invited to join Learning Navigator, "
                    "the AI-powered assistant for MHFA instructors.<br><br>"
                    "Your temporary password is: <strong>{####}</strong><br><br>"
                    "Please sign in at: https://app.learningnavigator.com<br><br>"
                    "You'll be asked to change your password on first login.<br><br>"
                    "Best regards,<br>"
                    "The National Council Team"
                )
            ),

            # User verification email
            user_verification=cognito.UserVerificationConfig(
                email_subject="Verify your email for Learning Navigator",
                email_body=(
                    "Hello {username},<br><br>"
                    "Please verify your email address by clicking this link:<br>"
                    "{##Verify Email##}<br><br>"
                    "If you didn't request this, please ignore this email.<br><br>"
                    "Best regards,<br>"
                    "The National Council Team"
                ),
                email_style=cognito.VerificationEmailStyle.LINK
            ),

            # Keep users after stack deletion
            # Trade-off: RETAIN vs DESTROY
            # - RETAIN: Users survive (can't recreate pool with same name)
            # - DESTROY: Clean deletion (lose all users!)
            # We use RETAIN for production safety
            removal_policy=RemovalPolicy.RETAIN,

            # Deletion protection
            # Prevents accidental deletion via console/CLI
            deletion_protection=True,
        )

        # ---------------------------------------------------------------------
        # User Pool Groups (Role-Based Access)
        # ---------------------------------------------------------------------

        """
        User Groups: Organize users by role

        Why groups?
        - Easy role-based access control
        - Assign IAM roles to groups (fine-grained permissions)
        - Group membership included in JWT token
        - Lambda can check user group for authorization

        Alternative: Custom attributes only
        - Pro: Simpler
        - Con: Have to check DynamoDB for permissions
        - Groups are better for authorization logic
        """

        # Instructors group
        instructors_group = cognito.CfnUserPoolGroup(
            self,
            "InstructorsGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="instructors",
            description="MHFA Instructors - can ask about courses, invoices, resources",
            precedence=1  # Lower number = higher priority
        )

        # Staff group
        staff_group = cognito.CfnUserPoolGroup(
            self,
            "StaffGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="staff",
            description="Internal staff - can ask about operations, systems, processes",
            precedence=2
        )

        # Admins group
        admins_group = cognito.CfnUserPoolGroup(
            self,
            "AdminsGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="admins",
            description="Administrators - full access to analytics, user management",
            precedence=0  # Highest priority
        )

        # ---------------------------------------------------------------------
        # User Pool Client (Frontend App)
        # ---------------------------------------------------------------------

        """
        User Pool Client: How frontend authenticates users

        Why separate client?
        - Each app (web, mobile, admin) gets own client
        - Different OAuth flows per client
        - Can revoke client without affecting others

        Trade-off: Client secret vs No secret
        - With secret: More secure, but can't use in browser
        - No secret: Required for SPA (React), less secure
        - We use no secret since React can't hide secrets
        """

        self.user_pool_client = self.user_pool.add_client(
            "WebAppClient",

            # Client name
            user_pool_client_name="learning-navigator-web",

            # No client secret (required for React SPA)
            # Trade-off: See above
            generate_secret=False,

            # OAuth flows
            # Trade-off: Different flows for different use cases
            # - Authorization Code: Most secure, requires backend
            # - Implicit: Deprecated, tokens in URL
            # - Client Credentials: For machine-to-machine
            # We use Authorization Code with PKCE for SPA
            auth_flows=cognito.AuthFlow(
                user_password=True,  # Allow username/password auth
                user_srp=True,       # Secure Remote Password (more secure)
                custom=False,        # No custom auth flows (yet)
                admin_user_password=False  # Admins can't auth as users
            ),

            # OAuth 2.0 configuration
            o_auth=cognito.OAuthSettings(
                # OAuth flows enabled
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,  # Standard OAuth flow
                    implicit_code_grant=False,      # Deprecated
                ),

                # OAuth scopes
                # Trade-off: Which user info to expose
                scopes=[
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.COGNITO_ADMIN,  # For user management
                ],

                # Callback URLs (where OAuth redirects after login)
                # Add production URL later
                callback_urls=[
                    "http://localhost:3000/callback",  # Local development
                    "https://app.learningnavigator.com/callback",  # Production
                ],

                # Logout URLs
                logout_urls=[
                    "http://localhost:3000",
                    "https://app.learningnavigator.com",
                ],
            ),

            # Token validity periods
            # Trade-off: Security vs UX
            # - Short tokens: More secure, but frequent re-auth
            # - Long tokens: Better UX, but more risk if stolen
            # We use standard durations (1 hour access, 30 days refresh)
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1),
            refresh_token_validity=Duration.days(30),

            # Prevent user existence errors
            # Trade-off: User enumeration vs Clear errors
            # - True: Can't tell if user exists (more secure)
            # - False: Clear "user not found" errors (better UX)
            # We prevent enumeration for security
            prevent_user_existence_errors=True,
        )

        # ---------------------------------------------------------------------
        # Domain for hosted UI (optional, for quick testing)
        # ---------------------------------------------------------------------

        """
        Cognito Domain: For hosted login UI

        Why?
        - Quick testing without building login page
        - AWS provides pre-built login UI
        - Can customize with CSS later

        Alternative: Custom login page
        - Pro: Full control, better branding
        - Con: More work, need to implement
        - We use hosted UI for MVP, build custom later
        """

        self.user_pool_domain = self.user_pool.add_domain(
            "UserPoolDomain",
            cognito_domain=cognito.CognitoDomainOptions(
                # Domain prefix (must be globally unique)
                domain_prefix="learning-navigator-ncmw"
            )
        )

        # =====================================================================
        # CLOUDFORMATION OUTPUTS (COGNITO)
        # =====================================================================

        # User Pool ID
        CfnOutput(
            self,
            "UserPoolId",
            value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID",
            export_name="LearningNavigatorUserPoolId",
        )

        # User Pool ARN
        CfnOutput(
            self,
            "UserPoolArn",
            value=self.user_pool.user_pool_arn,
            description="Cognito User Pool ARN",
            export_name="LearningNavigatorUserPoolArn",
        )

        # Client ID (for frontend)
        CfnOutput(
            self,
            "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID (for frontend)",
            export_name="LearningNavigatorUserPoolClientId",
        )

        # Hosted UI domain
        CfnOutput(
            self,
            "UserPoolDomain",
            value=f"https://{self.user_pool_domain.domain_name}.auth.{self.region}.amazoncognito.com",
            description="Cognito Hosted UI domain",
            export_name="LearningNavigatorUserPoolDomain",
        )

        # =====================================================================
        # STEP 5: LAMBDA FUNCTIONS
        # =====================================================================

        """
        Lambda Functions: Serverless compute for API endpoints

        Why Lambda?
        - Serverless: No servers to manage, AWS handles scaling
        - Cost: Pay per request ($0.20 per 1M requests)
        - Integration: Works seamlessly with API Gateway, DynamoDB, S3
        - Scalability: Auto-scales from 0 to thousands of concurrent executions

        Trade-off: Lambda vs EC2/ECS
        - Lambda: Cheap at low scale, cold starts, 15min timeout
        - EC2: Consistent performance, always-on costs, no timeout
        - We chose Lambda for serverless architecture and cost

        We'll create two Lambdas for MVP:
        1. Health Check: Simple endpoint to verify API is running
        2. Chat: Main chatbot logic (mock for now, Bedrock later)
        """

        # Get Lambda code path (relative to this file)
        # From: backend/infrastructure/stacks/backend_stack.py
        # To: backend/lambda/functions
        lambda_code_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'lambda',
            'functions'
        )

        # ---------------------------------------------------------------------
        # IAM Role for Lambda Functions
        # ---------------------------------------------------------------------

        """
        Lambda Execution Role: Permissions for Lambda functions

        Why custom role?
        - Grant access to DynamoDB, S3, CloudWatch
        - Fine-grained permissions (least privilege)
        - Can attach multiple policies

        Trade-off: Single role vs Role per function
        - Single: Simpler, but all Lambdas have same permissions
        - Per-function: Most secure, but more complex
        - We use single role for MVP (all Lambdas need similar access)
        """

        lambda_role = iam.Role(
            self,
            "LambdaExecutionRole",
            role_name="learning-navigator-lambda-role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for Learning Navigator Lambda functions",
            managed_policies=[
                # CloudWatch Logs (for Lambda logging)
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        )

        # Grant DynamoDB read/write permissions
        self.main_table.grant_read_write_data(lambda_role)

        # Grant S3 read permissions for PDFs bucket
        self.pdfs_bucket.grant_read(lambda_role)

        # Grant S3 write permissions for logs bucket
        self.logs_bucket.grant_write(lambda_role)

        # Grant Bedrock permissions (Step 7)
        # Trade-off: Specific model ARN vs wildcard
        # - Specific ARN: Most secure, but need to know model ID
        # - Wildcard (*): Easier to change models, less secure
        # We use wildcard for MVP flexibility
        lambda_role.add_to_policy(iam.PolicyStatement(
            actions=[
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",  # For streaming (future)
            ],
            resources=["*"],  # Allow all Bedrock models
            effect=iam.Effect.ALLOW,
        ))

        # Grant OpenSearch permissions (Step 8)
        # Lambda needs to search vectors and index documents
        lambda_role.add_to_policy(iam.PolicyStatement(
            actions=[
                "es:ESHttpGet",      # Search queries
                "es:ESHttpPost",     # Index documents
                "es:ESHttpPut",      # Create indices
                "es:ESHttpDelete",   # Delete documents (admin)
            ],
            resources=[
                self.opensearch_domain.domain_arn,
                f"{self.opensearch_domain.domain_arn}/*"
            ],
            effect=iam.Effect.ALLOW,
        ))

        # ---------------------------------------------------------------------
        # 1. Health Check Lambda
        # ---------------------------------------------------------------------

        """
        Health Check Lambda: Simple endpoint to verify API is running

        Why?
        - Quick way to test deployment
        - Monitoring/alerting can ping this endpoint
        - Returns 200 OK if everything is working

        No authentication required (public endpoint)
        """

        self.health_lambda = lambda_.Function(
            self,
            "HealthCheckFunction",

            # Function name in AWS Console
            function_name="learning-navigator-health",

            # Runtime: Python 3.11 (latest stable)
            # Trade-off: Python 3.11 vs 3.9
            # - 3.11: Faster, latest features
            # - 3.9: More stable, longer support
            # We chose 3.11 for performance
            runtime=lambda_.Runtime.PYTHON_3_11,

            # Handler: filename.function_name
            handler="index.handler",

            # Code location
            code=lambda_.Code.from_asset(
                os.path.join(lambda_code_path, "health")
            ),

            # Execution role
            role=lambda_role,

            # Memory: 128 MB (smallest, cheapest)
            # Trade-off: Memory vs Cost vs Performance
            # - 128 MB: $0.0000000021 per ms
            # - 1024 MB: $0.0000166667 per ms (8x cost, but faster)
            # Health check is simple, 128 MB is enough
            memory_size=128,

            # Timeout: 10 seconds
            # Trade-off: Timeout vs Risk
            # - Short: Save money, prevent runaway functions
            # - Long: Handle slow operations
            # Health check should be instant, 10s is generous
            timeout=Duration.seconds(10),

            # Environment variables
            environment={
                "ENVIRONMENT": os.environ.get("ENVIRONMENT", "dev"),
                "TABLE_NAME": self.main_table.table_name,
            },

            # Description
            description="Health check endpoint for Learning Navigator API",
        )

        # ---------------------------------------------------------------------
        # 2. Chat Lambda
        # ---------------------------------------------------------------------

        """
        Chat Lambda: Main chatbot endpoint

        Current: Returns mock response
        Future (Step 7): Integrate with Bedrock Claude

        Flow:
        1. API Gateway validates JWT token
        2. Lambda receives authenticated request
        3. Parse user message
        4. Query Bedrock (future)
        5. Save to DynamoDB
        6. Return response

        Requires authentication (JWT from Cognito)
        """

        self.chat_lambda = lambda_.Function(
            self,
            "ChatFunction",

            function_name="learning-navigator-chat",

            # Runtime: Python 3.11
            runtime=lambda_.Runtime.PYTHON_3_11,

            handler="index.handler",

            # Code location
            code=lambda_.Code.from_asset(
                os.path.join(lambda_code_path, "chat")
            ),

            # Execution role (same as health check)
            role=lambda_role,

            # Memory: 2048 MB (increased for RAG + Bedrock)
            # Trade-off: Cost vs Performance
            # - 512 MB: Good for mock responses
            # - 1024 MB: Needed for Bedrock SDK + JSON processing
            # - 2048 MB: Needed for RAG (OpenSearch + embeddings + LangChain)
            # Step 7: Increased to 1024 MB for Bedrock integration
            # Step 8: Increased to 2048 MB for RAG operations
            memory_size=2048,

            # Timeout: 60 seconds (increased for Bedrock)
            # Trade-off: Cost vs Bedrock latency
            # - Bedrock can take 5-20 seconds for complex queries
            # - 60s allows for longer responses and retries
            # Step 7: Increased to 60s for Bedrock integration
            timeout=Duration.seconds(60),

            # Environment variables
            environment={
                "ENVIRONMENT": os.environ.get("ENVIRONMENT", "dev"),
                "TABLE_NAME": self.main_table.table_name,
                "PDFS_BUCKET": self.pdfs_bucket.bucket_name,
                # Bedrock configuration (Step 7)
                "BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20241022-v2:0",
                "AWS_REGION": self.region,
                # OpenSearch for RAG (Step 8)
                "OPENSEARCH_ENDPOINT": self.opensearch_domain.domain_endpoint,
                "OPENSEARCH_INDEX": "learning-navigator-docs",  # Index name for documents
            },

            # Description
            description="Chat endpoint for Learning Navigator chatbot with RAG",
        )

        # ---------------------------------------------------------------------
        # 3. Document Processor Lambda (Step 8)
        # ---------------------------------------------------------------------

        """
        Document Processor Lambda: PDF Embedding and Indexing for RAG

        Why?
        - Processes PDF documents from S3
        - Extracts text using PyPDF2
        - Chunks text for embedding
        - Generates embeddings using Bedrock Titan
        - Indexes in OpenSearch for vector search

        Triggered by:
        - S3 event notifications (automatic processing)
        - Manual invocation for reprocessing
        """

        self.doc_processor_lambda = lambda_.Function(
            self,
            "DocumentProcessorFunction",

            function_name="learning-navigator-doc-processor",

            runtime=lambda_.Runtime.PYTHON_3_11,

            handler="index.handler",

            # Code location
            code=lambda_.Code.from_asset(
                os.path.join(lambda_code_path, "document-processor")
            ),

            # Execution role (same as other Lambdas)
            role=lambda_role,

            # Memory: 1024 MB (PDF processing + embeddings)
            memory_size=1024,

            # Timeout: 5 minutes (processing large PDFs)
            # Trade-off: Longer timeout for large documents
            # - Small PDF (10 pages): 30-60 seconds
            # - Large PDF (100 pages): 2-4 minutes
            timeout=Duration.minutes(5),

            # Environment variables
            environment={
                "ENVIRONMENT": os.environ.get("ENVIRONMENT", "dev"),
                "OPENSEARCH_ENDPOINT": self.opensearch_domain.domain_endpoint,
                "OPENSEARCH_INDEX": "learning-navigator-docs",
                "PDFS_BUCKET": self.pdfs_bucket.bucket_name,
                "AWS_REGION": self.region,
            },

            description="Document processor for PDF embedding and indexing",
        )

        # Grant S3 event notification permission
        # This allows S3 to invoke the Lambda when new PDFs are uploaded
        self.doc_processor_lambda.add_permission(
            "AllowS3Invocation",
            principal=iam.ServicePrincipal("s3.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=self.pdfs_bucket.bucket_arn,
        )

        # Note: S3 event notification configuration will be added separately
        # (requires bucket to be created first, can cause circular dependency)

        # =====================================================================
        # CLOUDFORMATION OUTPUTS (LAMBDA)
        # =====================================================================

        # Health Lambda ARN
        CfnOutput(
            self,
            "HealthLambdaArn",
            value=self.health_lambda.function_arn,
            description="Health check Lambda function ARN",
            export_name="LearningNavigatorHealthLambdaArn",
        )

        # Chat Lambda ARN
        CfnOutput(
            self,
            "ChatLambdaArn",
            value=self.chat_lambda.function_arn,
            description="Chat Lambda function ARN",
            export_name="LearningNavigatorChatLambdaArn",
        )

        # Document Processor Lambda ARN
        CfnOutput(
            self,
            "DocProcessorLambdaArn",
            value=self.doc_processor_lambda.function_arn,
            description="Document processor Lambda function ARN",
            export_name="LearningNavigatorDocProcessorLambdaArn",
        )

        # Lambda Role ARN
        CfnOutput(
            self,
            "LambdaRoleArn",
            value=lambda_role.role_arn,
            description="Lambda execution role ARN",
            export_name="LearningNavigatorLambdaRoleArn",
        )

        # =====================================================================
        # STEP 6: API GATEWAY
        # =====================================================================

        """
        API Gateway: REST API for chatbot endpoints

        Why API Gateway?
        - Managed service for exposing Lambda functions as HTTP APIs
        - Built-in authentication (Cognito authorizer)
        - Request validation, throttling, caching
        - CORS support for frontend
        - CloudWatch integration for monitoring

        Trade-off: REST API vs HTTP API vs WebSocket API
        - REST API: Full features, $3.50 per million requests
        - HTTP API: Cheaper ($1 per million), fewer features
        - WebSocket API: Real-time streaming (for future Step 7)
        - We chose REST API for Cognito authorizer support
        """

        # ---------------------------------------------------------------------
        # REST API Configuration
        # ---------------------------------------------------------------------

        """
        REST API: Main API for chatbot

        Why REST API over HTTP API?
        - Supports Cognito User Pool authorizer (HTTP API has limitations)
        - Request/response transformation
        - API keys and usage plans (for future rate limiting)
        - More mature, battle-tested
        """

        self.api = apigateway.RestApi(
            self,
            "ChatbotAPI",

            # API name in AWS Console
            rest_api_name="learning-navigator-api",
            description="Learning Navigator chatbot API",

            # Deployment stage
            # Trade-off: Single stage vs Multiple stages
            # - Single: Simpler, deploy to prod directly
            # - Multiple (dev/staging/prod): Safer, test before prod
            # We use single stage for MVP, will add staging later
            deploy_options=apigateway.StageOptions(
                stage_name="prod",

                # Throttling: Prevent abuse
                # Trade-off: High limits vs Low limits
                # - High: Better UX, but higher costs if abused
                # - Low: Protects budget, but may block legitimate users
                # We set conservative limits for MVP
                throttling_rate_limit=100,  # Requests per second
                throttling_burst_limit=200,  # Burst capacity

                # Logging
                # Trade-off: Full logging vs Errors only
                # - Full: Detailed debugging, but expensive ($0.50/GB)
                # - Errors: Cheaper, but harder to debug
                # We log errors + info for MVP
                logging_level=apigateway.MethodLoggingLevel.INFO,
                data_trace_enabled=True,  # Log full request/response (disable in prod)
                metrics_enabled=True,  # CloudWatch metrics

                # Caching (disabled for now)
                # Trade-off: Caching vs Fresh data
                # - Caching: Faster, cheaper, but stale data
                # - No caching: Always fresh, but more Lambda invocations
                # We disable caching for chatbot (each query is unique)
                caching_enabled=False,
            ),

            # CORS configuration
            # Trade-off: Permissive vs Restrictive
            # - Permissive (*): Easy development, less secure
            # - Restrictive (specific domains): More secure, harder to test
            # We use permissive for MVP, will restrict later
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["*"],  # Will change to specific domain later
                allow_methods=["GET", "POST", "OPTIONS"],
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
                allow_credentials=True,
                max_age=Duration.hours(1),
            ),

            # CloudWatch role for logging
            # API Gateway needs permission to write CloudWatch logs
            cloud_watch_role=True,

            # Binary media types (for file uploads in future)
            # binary_media_types=["multipart/form-data", "application/pdf"],
        )

        # ---------------------------------------------------------------------
        # Cognito Authorizer
        # ---------------------------------------------------------------------

        """
        Cognito Authorizer: JWT token validation

        Why Cognito authorizer?
        - API Gateway validates JWT before invoking Lambda
        - Lambda doesn't need to validate tokens (less code)
        - Automatically extracts user info from token
        - Free (no extra cost)

        Trade-off: Cognito vs Lambda authorizer vs API keys
        - Cognito: Best for user authentication, free
        - Lambda: Custom logic, but costs $0.20/million authorizations
        - API keys: Good for service-to-service, not user auth
        """

        cognito_authorizer = apigateway.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuthorizer",
            cognito_user_pools=[self.user_pool],
            authorizer_name="learning-navigator-authorizer",

            # Identity source: Where to find the token
            # Trade-off: Header vs Query string
            # - Header: Standard, more secure
            # - Query string: Easier for testing, less secure
            # We use header (Authorization: Bearer <token>)
            identity_source="method.request.header.Authorization",

            # Token caching
            # Trade-off: Cache vs Validate every time
            # - Cache: Faster, fewer Cognito API calls, but stale tokens
            # - No cache: Always fresh, but slower and more API calls
            # We cache for 5 minutes (good balance)
            results_cache_ttl=Duration.minutes(5),
        )

        # ---------------------------------------------------------------------
        # API Resources and Routes
        # ---------------------------------------------------------------------

        """
        API Structure:

        /
        ├── /health (GET) - Public endpoint, no auth
        └── /chat (POST) - Authenticated endpoint, requires JWT
        """

        # ---------------------------------------------------------------------
        # 1. Health Check Endpoint (Public)
        # ---------------------------------------------------------------------

        """
        Health Check: /health (GET)

        Why public endpoint?
        - Monitoring systems need to check API availability
        - No sensitive data returned
        - Quick way to verify deployment

        No authentication required
        """

        # Create /health resource
        health_resource = self.api.root.add_resource("health")

        # Add GET method
        health_integration = apigateway.LambdaIntegration(
            self.health_lambda,

            # Proxy integration: Lambda handles request/response format
            # Trade-off: Proxy vs Custom integration
            # - Proxy: Simple, Lambda handles everything
            # - Custom: Can transform request/response in API Gateway
            # We use proxy for simplicity
            proxy=True,

            # Allow test invocation from AWS Console
            allow_test_invoke=True,
        )

        health_resource.add_method(
            "GET",
            health_integration,
            authorization_type=apigateway.AuthorizationType.NONE,  # Public endpoint
        )

        # ---------------------------------------------------------------------
        # 2. Chat Endpoint (Authenticated)
        # ---------------------------------------------------------------------

        """
        Chat: /chat (POST)

        Why authenticated?
        - Users must log in to access chatbot
        - Prevents abuse and unauthorized access
        - Tracks usage per user

        Requires valid JWT token from Cognito
        """

        # Create /chat resource
        chat_resource = self.api.root.add_resource("chat")

        # Add POST method with Cognito authorizer
        chat_integration = apigateway.LambdaIntegration(
            self.chat_lambda,
            proxy=True,
            allow_test_invoke=True,
        )

        chat_resource.add_method(
            "POST",
            chat_integration,
            authorization_type=apigateway.AuthorizationType.COGNITO,
            authorizer=cognito_authorizer,

            # Request validation
            # Trade-off: Validate in API Gateway vs Lambda
            # - API Gateway: Faster rejection, saves Lambda cost
            # - Lambda: More flexible validation logic
            # We do basic validation here, detailed validation in Lambda
            request_validator=apigateway.RequestValidator(
                self,
                "ChatRequestValidator",
                rest_api=self.api,
                request_validator_name="chat-request-validator",
                validate_request_body=True,  # Ensure body exists
                validate_request_parameters=False,  # No query params needed
            ),

            # Request model (basic validation)
            # Trade-off: Strict schema vs Flexible
            # - Strict: Catches errors early, but harder to change
            # - Flexible: Easy to iterate, but errors caught in Lambda
            # We use flexible for MVP
            request_models={
                "application/json": apigateway.Model(
                    self,
                    "ChatRequestModel",
                    rest_api=self.api,
                    model_name="ChatRequest",
                    description="Chat request model",
                    schema=apigateway.JsonSchema(
                        schema=apigateway.JsonSchemaVersion.DRAFT4,
                        type=apigateway.JsonSchemaType.OBJECT,
                        properties={
                            "message": apigateway.JsonSchema(
                                type=apigateway.JsonSchemaType.STRING,
                                min_length=1,
                                max_length=5000,
                            ),
                            "conversation_id": apigateway.JsonSchema(
                                type=apigateway.JsonSchemaType.STRING,
                            ),
                        },
                        required=["message"],
                    ),
                )
            },
        )

        # =====================================================================
        # CLOUDFORMATION OUTPUTS (API GATEWAY)
        # =====================================================================

        # API Gateway URL
        CfnOutput(
            self,
            "ApiGatewayUrl",
            value=self.api.url,
            description="API Gateway endpoint URL",
            export_name="LearningNavigatorApiUrl",
        )

        # API Gateway ID
        CfnOutput(
            self,
            "ApiGatewayId",
            value=self.api.rest_api_id,
            description="API Gateway REST API ID",
            export_name="LearningNavigatorApiId",
        )

        # API Gateway Stage
        CfnOutput(
            self,
            "ApiGatewayStage",
            value="prod",
            description="API Gateway deployment stage",
            export_name="LearningNavigatorApiStage",
        )

        # Health endpoint URL
        CfnOutput(
            self,
            "HealthEndpoint",
            value=f"{self.api.url}health",
            description="Health check endpoint URL",
        )

        # Chat endpoint URL
        CfnOutput(
            self,
            "ChatEndpoint",
            value=f"{self.api.url}chat",
            description="Chat endpoint URL (requires authentication)",
        )
