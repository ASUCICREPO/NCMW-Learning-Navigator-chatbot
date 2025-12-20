"""
BackendStack - Main Infrastructure Stack

This stack contains all backend infrastructure:
- DynamoDB table (Step 2) ✅
- S3 buckets (Step 3) ✅
- Cognito User Pool (Step 4) - Coming next
- Lambda functions (Step 5) - Coming next
- API Gateway (Step 6) - Coming next
"""

from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    Duration,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
)
from constructs import Construct


class BackendStack(Stack):
    """
    Main backend infrastructure stack.

    Resources:
    - DynamoDB table with single-table design (Step 2)
    - S3 buckets for PDFs, frontend, and logs (Step 3)
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
            projection=dynamodb.Projection.all(),
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
