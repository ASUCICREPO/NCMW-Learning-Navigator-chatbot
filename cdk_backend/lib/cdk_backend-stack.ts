/**
 * Learning Navigator - NCMW Chatbot Infrastructure Stack
 *
 * This stack deploys the complete infrastructure for the Learning Navigator chatbot,
 * including AWS Bedrock Agent, Knowledge Base, Lambda functions, API Gateway,
 * Cognito authentication, and supporting services.
 *
 * @module LearningNavigatorStack
 * @author NCMW Team
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as os from 'os';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

/**
 * Configuration constants for the Learning Navigator stack
 */
const CONFIG = {
  // Bedrock Models
  BEDROCK_AGENT_MODEL: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_4_SONNET_V1_0,
  BEDROCK_EMBEDDING_MODEL: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,

  // DynamoDB Tables
  DYNAMODB_SESSION_LOGS_TABLE: 'NCMWDashboardSessionlogs',
  DYNAMODB_ESCALATED_QUERIES_TABLE: 'NCMWEscalatedQueries',
  DYNAMODB_USER_PROFILES_TABLE: 'NCMWUserProfiles',
  DYNAMODB_FEEDBACK_TABLE: 'NCMWResponseFeedback',

  // S3 Buckets
  KNOWLEDGE_BASE_BUCKET: 'national-council',

  // SES
  SES_RECEIPT_RULE_SET_NAME: 'learning-navigator-email-rules',

  // Lambda
  LAMBDA_TIMEOUT_SECONDS: 120,
  LAMBDA_TIMEOUT_EMAIL: 120,

  // Cognito
  COGNITO_PASSWORD_MIN_LENGTH: 8,

  // EventBridge Schedule
  LOGS_CRON_MINUTE: '59',
  LOGS_CRON_HOUR: '23',
} as const;

/**
 * Learning Navigator Infrastructure Stack
 *
 * Deploys a complete AI-powered chatbot solution using AWS Bedrock, Lambda,
 * API Gateway, Cognito, and other AWS services.
 *
 * @class LearningNavigatorStack
 * @extends {cdk.Stack}
 *
 * @example
 * ```bash
 * cdk deploy \
 *   -c githubOwner=your-org \
 *   -c githubRepo=your-repo \
 *   -c adminEmail=admin@example.com
 * ```
 */
export class LearningNavigatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTEXT PARAMETERS & VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    const githubToken = this.node.tryGetContext('githubToken');
    const githubOwner = this.node.tryGetContext('githubOwner');
    const githubRepo = this.node.tryGetContext('githubRepo');
    const adminEmail = this.node.tryGetContext('adminEmail');

    // Validate required parameters
    this.validateRequiredContext({ githubOwner, githubRepo, adminEmail });

    // ═══════════════════════════════════════════════════════════════════════════
    // INFRASTRUCTURE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const awsRegion = cdk.Stack.of(this).region;
    const awsAccountId = cdk.Stack.of(this).account;

    // Detect host architecture for Lambda compilation
    const hostArchitecture = os.arch();
    const lambdaArchitecture = hostArchitecture === 'arm64'
      ? lambda.Architecture.ARM_64
      : lambda.Architecture.X86_64;

    console.log(`[Stack] AWS Region: ${awsRegion}`);
    console.log(`[Stack] AWS Account: ${awsAccountId}`);
    console.log(`[Stack] Lambda Architecture: ${lambdaArchitecture.name}`);

    // Create GitHub token secret only if token is provided (for private repos)
    if (githubToken) {
      new secretsmanager.Secret(this, 'GitHubToken', {
        secretName: 'github-secret-token',
        description: 'GitHub Personal Access Token for Amplify (optional for public repos)',
        secretStringValue: cdk.SecretValue.unsafePlainText(githubToken),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // S3 BUCKETS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Knowledge Base Data Bucket
     * Existing bucket containing training materials, PDFs, and knowledge base documents
     */
    const knowledgeBaseDataBucket = s3.Bucket.fromBucketName(
      this,
      'KnowledgeBaseDataBucket',
      CONFIG.KNOWLEDGE_BASE_BUCKET
    );

    /**
     * Email Storage Bucket
     * Stores incoming emails from SES for processing
     */
    const emailBucket = new s3.Bucket(this, 'EmailStorageBucket', {
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    /**
     * Supplemental Data Bucket
     * Stores multimodal data extracted from input files for Bedrock Knowledge Base
     * Must be separate from the data source bucket per AWS requirements
     */
    const supplementalBucket = new s3.Bucket(this, 'SupplementalDataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    /**
     * Dashboard Logs Bucket
     * Stores exported logs from CloudWatch for dashboard analytics
     */
    const dashboardLogsBucket = new s3.Bucket(this, 'DashboardLogsBucket', {
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Configure supplemental data storage location for Bedrock
    const supplementalS3Storage = bedrock.SupplementalDataStorageLocation.s3({
      uri: `s3://${supplementalBucket.bucketName}`,
    });
    
    const cris_sonnet_4 = bedrock.CrossRegionInferenceProfile.fromConfig({
      geoRegion: bedrock.CrossRegionInferenceProfileRegion.US,
      model: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_4_SONNET_V1_0,
    });

    

    const kb = new bedrock.VectorKnowledgeBase(this, 'LearningNavigatorKB', {
      description: 'Learning Navigator - MHFA Learning Ecosystem knowledge base for instructors, learners, and administrators',
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
      instruction: "Support MHFA Learning Ecosystem users with training resources, course navigation, and administrative guidance.",
      supplementalDataStorageLocations: [supplementalS3Storage],

    });

    supplementalBucket.grantReadWrite(kb.role);

    const knowledgeBaseDataSource = new bedrock.S3DataSource(this, 'DataSource', {
        bucket: knowledgeBaseDataBucket,
        knowledgeBase: kb,
        parsingStrategy: bedrock.ParsingStrategy.bedrockDataAutomation(),
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // DYNAMODB TABLES
      // ═══════════════════════════════════════════════════════════════════════════

      /**
       * Session Logs Table
       * Stores chatbot conversation sessions for analytics and monitoring
       */
      const sessionLogsTable = new dynamodb.Table(this, 'SessionLogsTable', {
        tableName: CONFIG.DYNAMODB_SESSION_LOGS_TABLE,
        partitionKey: { name: 'session_id', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Use RETAIN for production
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

      /**
       * Escalated Queries Table
       * Stores user queries that require admin follow-up
       */
      const escalatedQueriesTable = new dynamodb.Table(this, 'EscalatedQueriesTable', {
        tableName: CONFIG.DYNAMODB_ESCALATED_QUERIES_TABLE,
        partitionKey: { name: 'query_id', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Use RETAIN for production
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

      // Global Secondary Index for querying escalated queries by status
      escalatedQueriesTable.addGlobalSecondaryIndex({
        indexName: 'StatusIndex',
        partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      });

      /**
       * User Profile Table
       * Stores user preferences and personalized recommendations
       */
      const userProfileTable = new dynamodb.Table(this, 'UserProfileTable', {
        tableName: CONFIG.DYNAMODB_USER_PROFILES_TABLE,
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Use RETAIN for production
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

    const bedrockRoleAgent = new iam.Role(this, 'BedrockRole3', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        // amazonq-ignore-next-line
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccessV2'),
      ]});


      const guardrail = new bedrock.Guardrail(this, 'LearningNavigatorGuardrail', {
        name: 'LearningNavigator-Guardrails',
        blockedOutputsMessaging: 'I can only assist with MHFA Learning Ecosystem topics: training, courses, instructor/learner support, and administrative guidance.',
      });
      
      const DEFAULT_INPUT  = bedrock.ContentFilterStrength.HIGH;
      const DEFAULT_OUTPUT = bedrock.ContentFilterStrength.MEDIUM;
      const INPUT_MODS  = [bedrock.ModalityType.TEXT, bedrock.ModalityType.IMAGE];
      const OUTPUT_MODS = [bedrock.ModalityType.TEXT];

      // Grab just the string‐enum members
      const allFilters = Object
        .values(bedrock.ContentFilterType)
        .filter((f): f is bedrock.ContentFilterType => typeof f === 'string');

      for (const type of allFilters) {
        const responseStrength =
          type === bedrock.ContentFilterType.PROMPT_ATTACK
            ? bedrock.ContentFilterStrength.NONE
            : DEFAULT_OUTPUT;

        guardrail.addContentFilter({
          type,
          inputStrength:  DEFAULT_INPUT,
          outputStrength: responseStrength,
          inputModalities:  INPUT_MODS,
          outputModalities: OUTPUT_MODS,
        });
      }
      


      const prompt_for_agent =
      `You are Learning Navigator, an AI-powered assistant integrated into the MHFA Learning Ecosystem. You support instructors, learners, and administrators by helping them navigate training resources, answer FAQs, and provide real-time guidance.

      1. On every user question:
         • Query the KB and compute a confidence score (1-100).
         • ALWAYS include citations and source references from the knowledge base when providing information.

         • **CRITICAL URL PRESERVATION RULES - FOLLOW THESE EXACTLY:**
           1. When the knowledge base contains a URL, hyperlink, form link, or web address, you MUST copy it EXACTLY into your response
           2. NEVER say "submit the form" or "visit the website" without including the actual URL
           3. NEVER paraphrase URLs - copy them character-by-character including http:// or https://
           4. Place URLs on their own line or clearly embedded in your response text
           5. If a source says "complete the form at https://example.com/form", include that exact URL in your answer

         • **EXAMPLES OF CORRECT URL HANDLING:**
           - GOOD: "Submit your certificate at: https://www.mentalhealthfirstaid.org/tax-exemption-form"
           - GOOD: "Visit the store at https://store.MentalHealthFirstAid.org to purchase materials"
           - BAD: "Submit the form online" (missing URL)
           - BAD: "Visit the MHFA store" (missing URL)

         • **RESPONSE STRATEGY BASED ON SCOPE AND CONFIDENCE:**

           A. FOR OUT-OF-SCOPE QUESTIONS (not related to MHFA training, certification, courses, instructor/learner support, etc.):
              - Say: "This is out of scope. I don't have information regarding this."
              - Do NOT ask for email or escalate out-of-scope questions.
              - Do NOT provide any answer for out-of-scope topics.

           B. FOR IN-SCOPE QUESTIONS with confidence ≥ 90:
              - Reply with the direct answer and include "(confidence: X%)".
              - Cite specific source documents from the knowledge base that support your answer.
              - If the source contains any URLs, links, forms, or web addresses, include them EXACTLY in your response.
              - Do not ask for email or escalate.

           C. FOR IN-SCOPE QUESTIONS with confidence < 90:
              - Say: "I don't have much information on this. Could you please share your email so I can escalate this to an administrator for further follow-up?"
              - Wait for the user to supply an email address.


      2. Once you receive a valid email address (after a low-confidence in-scope question):
         • Call the action group function notify-admin with these parameters:
             - **email**: the user's email
             - **querytext**: the original question they asked
             - **agentResponse**: the best partial answer or summary you produced (even if low confidence)
         • After invoking, reply to the user:
             - "Thanks! An administrator has been notified and will follow up at [email]. Would you like to ask any other questions?"

      3. Your scope includes: 'MHFA training', 'certification', 'MHFA Connect platform', 'instructor policies',
        'learner courses', 'administrative procedures', 'National Council programs', 'mental wellness',
        'crisis support', 'Learning Ecosystem navigation', 'data insights', 'chatBOT', 'chatbot'.

      Always maintain a helpful, professional, and supportive tone that empowers users in their learning journey.`
      

    const agent = new bedrock.Agent(this, 'Agent', {
      name: 'Learning-Navigator',
      description: 'AI-powered Learning Navigator for MHFA ecosystem - supports instructors, learners, and administrators.',
      foundationModel: cris_sonnet_4,
      shouldPrepareAgent: true,
      userInputEnabled:true,
      knowledgeBases: [kb],
      existingRole: bedrockRoleAgent,
      instruction: prompt_for_agent,
      guardrail:guardrail
    });

    const AgentAlias = new bedrock.AgentAlias(this, 'AgentAlias', {
      agent: agent,
      description: 'Production alias for the agent',
    })

    // Import existing SES email identity instead of creating a new one
    // This prevents conflicts if the email identity already exists
    const senderIdentity = ses.EmailIdentity.fromEmailIdentityName(
      this,
      'SenderIdentity',
      adminEmail
    );

    const notificationFn = new lambda.Function(this, 'NotifyAdminFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromDockerBuild('lambda/email'),
      architecture: lambdaArchitecture,
      environment: {
        VERIFIED_SOURCE_EMAIL: adminEmail,
        ADMIN_EMAIL: adminEmail,
        ESCALATED_QUERIES_TABLE: escalatedQueriesTable.tableName,
      },
      timeout: cdk.Duration.seconds(60),
    });

    // Grant permissions to write to escalated queries table
    escalatedQueriesTable.grantWriteData(notificationFn);
    
    // 2) Create the Action Group
    const notifyActionGroup = new bedrock.AgentActionGroup({
      name: 'notify-admin',
      description: 'Sends an admin email when the agent needs assistance.',
      executor: bedrock.ActionGroupExecutor.fromlambdaFunction(notificationFn),
      enabled: true,
      apiSchema: bedrock.ApiSchema.fromLocalAsset(path.join(__dirname, '../lambda/notify-admin-schema.yaml')),
    });
    
    // 3) Attach to your Bedrock Agent
    agent.addActionGroup(notifyActionGroup);

    notificationFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
      ],
      resources: [ senderIdentity.emailIdentityArn ],  // restricts to this verified address
    }));

    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'web-socket-api', {
      apiName: 'web-socket-api',
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'web-socket-stage', {
      webSocketApi,
      stageName: 'production',
      autoDeploy: true,
    });

    const logclassifier = new lambda.Function(this, 'logclassifier', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/logclassifier'),  
      timeout: cdk.Duration.seconds(30),
      environment: {  
        BUCKET:     dashboardLogsBucket.bucketName,
        DYNAMODB_TABLE: sessionLogsTable.tableName,
      },
    });

    sessionLogsTable.grantReadWriteData(logclassifier)
    dashboardLogsBucket.grantRead(logclassifier);
    // Note: Bedrock access removed - logclassifier no longer uses Nova Lite for sentiment/classification

    const chatResponseHandler = new lambda.Function(this, 'chatResponseHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('lambda/chatResponseHandler'),
      architecture: lambdaArchitecture,
      environment: {
        WS_API_ENDPOINT: webSocketStage.callbackUrl,
        AGENT_ID: agent.agentId,
        AGENT_ALIAS_ID: AgentAlias.aliasId,
        LOG_CLASSIFIER_FN_NAME: logclassifier.functionName
      },
      timeout: cdk.Duration.seconds(120),
    });

    knowledgeBaseDataBucket.grantRead(chatResponseHandler);
    logclassifier.grantInvoke(chatResponseHandler);

    chatResponseHandler.role?.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
    );
    // api gateway
    chatResponseHandler.role?.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess'),
    );

    const webSocketHandler = new lambda.Function(this, 'web-socket-handler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lambda/websocketHandler'),
      handler: 'handler.lambda_handler',
      timeout: cdk.Duration.seconds(120),
      environment: {
        RESPONSE_FUNCTION_ARN: chatResponseHandler.functionArn
      }
    });

    chatResponseHandler.grantInvoke(webSocketHandler)

    const webSocketIntegration = new apigatewayv2_integrations.WebSocketLambdaIntegration('web-socket-integration', webSocketHandler);

    webSocketApi.addRoute('sendMessage',
      {
        integration: webSocketIntegration,
        returnResponse: true
      }
    );

    const emailHandler = new lambda.Function(this, 'EmailReplyHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lambda/emailReply'),
      handler: 'handler.lambda_handler',
      memorySize: 2048,
      timeout: cdk.Duration.minutes(2),
      environment: {
        SOURCE_BUCKET_NAME: emailBucket.bucketName,
        DESTINATION_BUCKET_NAME: knowledgeBaseDataBucket.bucketName,
        KNOWLEDGE_BASE_ID: kb.knowledgeBaseId,
        DATA_SOURCE_ID: knowledgeBaseDataSource.dataSourceId,
        ADMIN_EMAIL: adminEmail,
      },
    })

    // Import existing SES Receipt Rule Set instead of creating new one
    const sesRuleSet = ses.ReceiptRuleSet.fromReceiptRuleSetName(
      this,
      'EmailReceiptRuleSet',
      'learning-navigator-email-rules'
    );

    // Use admin email for receiving replies instead of requiring a custom domain
    const sesRule = sesRuleSet.addRule('ProcessIncomingEmail', {
      recipients: [adminEmail],
      scanEnabled: true,
      tlsPolicy: ses.TlsPolicy.OPTIONAL,
    });

    // Add actions to the rule
    sesRule.addAction(new sesActions.S3({
      bucket: emailBucket,
      objectKeyPrefix: 'incoming/',
    }));

    sesRule.addAction(new sesActions.Lambda({
      function: emailHandler,
    }));

    const activate = new AwsCustomResource(this, 'ActivateReceiptRuleSet', {
      onCreate: {
        service: 'SES',
        action: 'setActiveReceiptRuleSet',
        parameters: {
          RuleSetName: sesRuleSet.receiptRuleSetName,  // matches your rule set’s name
        },
        // ensure this runs on every deploy if the name changes:
        physicalResourceId: PhysicalResourceId.of(sesRuleSet.receiptRuleSetName),
      },
      // give it permission to call SES
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    

    emailHandler.addPermission('AllowSESInvoke', {
      principal: new iam.ServicePrincipal('ses.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceAccount: this.account,
    });
    
    knowledgeBaseDataBucket.grantReadWrite(emailHandler)
    emailBucket.grantRead(emailHandler)

    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:*'],
      resources: ['*'],
    });

    emailHandler.addToRolePolicy(bedrockPolicy);


    const userPool = new cognito.UserPool(this, 'LearningNavigatorUserPool', {
      userPoolName: 'LearningNavigator-UserPool',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireDigits: false,
        requireSymbols: false,
        requireUppercase: false,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });


    const userPoolClient = userPool.addClient('LearningNavigatorClient', {
      userPoolClientName: 'LearningNavigator-Client',
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.PROFILE
        ],
        // callbackUrls: [`${appUrl}/callback`,"http://localhost:3000/callback"],
        // logoutUrls: [`${appUrl}/home`, "http://localhost:3000/home"],
        callbackUrls: ["http://localhost:3000/admin-dashboard"],
        logoutUrls: ["http://localhost:3000/"],
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ]
    });


    const identityPool = new cognito.CfnIdentityPool(this, 'LearningNavigatorIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    const authenticatedRole = new iam.Role(this, 'CognitoDefaultAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });


    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:GetObject',
        ],
        resources: [
          knowledgeBaseDataBucket.bucketArn + '/*',
        ],
      }),
    );

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });


    const fileHandler = new lambda.Function(this, 'FileApiHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/adminFile'),  
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET_NAME:         knowledgeBaseDataBucket.bucketName,
        KNOWLEDGE_BASE_ID:   kb.knowledgeBaseId,
        DATA_SOURCE_ID:      knowledgeBaseDataSource.dataSourceId,
      }
    });

    knowledgeBaseDataBucket.grantReadWrite(fileHandler);
    fileHandler.role?.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
    );

    // ──────────────────────────────────────────────────────────────────────────────
    // Knowledge Base Auto-Sync Lambda
    // Automatically syncs KB when documents are added/deleted from S3
    // ──────────────────────────────────────────────────────────────────────────────
    const kbSyncLambda = new lambda.Function(this, 'KBSyncFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/kb-sync'),
      timeout: cdk.Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: kb.knowledgeBaseId,
        DATA_SOURCE_ID: knowledgeBaseDataSource.dataSourceId,
        // Optional: Add SNS topic ARN for admin notifications if needed
        // ADMIN_NOTIFICATION_TOPIC_ARN: adminNotificationTopic.topicArn,
      },
    });

    // Grant permissions to start Bedrock ingestion jobs
    kbSyncLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:StartIngestionJob',
        'bedrock:GetIngestionJob',
        'bedrock:GetKnowledgeBase',
        'bedrock:GetDataSource',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${kb.knowledgeBaseId}`,
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${kb.knowledgeBaseId}/data-source/*`,
      ],
    }));

    // Configure S3 bucket to trigger Lambda on PUT and DELETE events
    // Note: Since we're using an imported bucket (fromBucketName), we need to cast it
    // to allow adding event notifications
    const kbBucketWithNotifications = s3.Bucket.fromBucketName(
      this,
      'KnowledgeBaseDataWithNotifications',
      'national-council'
    ) as s3.Bucket;

    // Add S3 event notifications to trigger the Lambda function
    kbBucketWithNotifications.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(kbSyncLambda)
    );

    kbBucketWithNotifications.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(kbSyncLambda)
    );

    // Grant Lambda permission to be invoked by S3
    kbSyncLambda.addPermission('AllowS3Invoke', {
      principal: new iam.ServicePrincipal('s3.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceAccount: this.account,
      sourceArn: `arn:aws:s3:::national-council`,
    });


    const AdminApi = new apigateway.RestApi(this, 'admin_api', {
      restApiName: 'AdminApi',
      description: 'API to fetch S3 files',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const userPoolAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
      cognitoUserPools: [userPool], 
    });

    const files = AdminApi.root.addResource('files');

    const single = files.addResource('{key}');

    const sync   = AdminApi.root.addResource('sync');


    const integ = new apigateway.LambdaIntegration(fileHandler, {
      proxy: true,
    });

    // Attach methods with Cognito auth
    [ 'GET', 'POST' ].forEach(method => {
      files.addMethod(method, integ, {
        authorizer: userPoolAuthorizer, 
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    });

    [ 'GET', 'DELETE' ].forEach(method => {
      single.addMethod(method, integ, {
        authorizer: userPoolAuthorizer, 
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    });

    sync.addMethod('POST', integ, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add presigned-url endpoint for secure PDF access
    const presignedUrl = AdminApi.root.addResource('presigned-url');
    presignedUrl.addMethod('POST', integ, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const logGroupNameChatResponseHandler = `/aws/lambda/${chatResponseHandler.functionName}`;

    const sessionLogsFn = new lambda.Function(this, 'SessionLogsHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/sessionLogs'),
      timeout: cdk.Duration.seconds(30),
      environment: {
        GROUP_NAME: logGroupNameChatResponseHandler,
        BUCKET:     dashboardLogsBucket.bucketName,
        DYNAMODB_TABLE: sessionLogsTable.tableName,
      },
    });

    sessionLogsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:StartQuery',
        'logs:GetQueryResults',
      ],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:${logGroupNameChatResponseHandler}:*`],
    }));

    dashboardLogsBucket.grantPut(sessionLogsFn);
    sessionLogsTable.grantReadWriteData(sessionLogsFn);

    const dailyRule = new events.Rule(this, 'DailySessionLogsScheduler', {
      description: 'Trigger session-logs Lambda every night at 8:20 PM UTC',
      schedule: events.Schedule.cron({
        minute: '59',
        hour:   '23',
        day:    '*',    // every day of month
        month:  '*',    // every month
        year:   '*',    // every year
      }),
    });

    dailyRule.addTarget(new targets.LambdaFunction(sessionLogsFn));

    const retrieveSessionLogsFn = new lambda.Function(this, 'RetrieveSessionLogsFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code:    lambda.Code.fromAsset('lambda/retrieveSessionLogs'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        DYNAMODB_TABLE: sessionLogsTable.tableName,
        FEEDBACK_TABLE: 'NCMWResponseFeedback',
      },
    });

    // Allow it to read from the sessions table and feedback table
    sessionLogsTable.grantReadData(retrieveSessionLogsFn);

    // Grant permission to read from feedback table
    retrieveSessionLogsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Scan', 'dynamodb:Query', 'dynamodb:GetItem'],
      resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/NCMWResponseFeedback`],
    }));

    // 2) Hook it into API Gateway
    const sessionLogs = AdminApi.root.addResource('session-logs');
    const statsIntegration = new apigateway.LambdaIntegration(retrieveSessionLogsFn, { proxy: true });

    sessionLogs.addMethod('GET', statsIntegration, {
      authorizer:        userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });


    const singleSession = sessionLogs.addResource('{sessionId}');
    singleSession.addMethod('GET', statsIntegration, {
      authorizer:        userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ──────────────────────────────────────────────────────────────────────────────
    // Escalated Queries API (Admin email notifications management)
    // ──────────────────────────────────────────────────────────────────────────────
    const escalatedQueriesFn = new lambda.Function(this, 'EscalatedQueriesFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code:    lambda.Code.fromAsset('lambda/escalatedQueries'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        ESCALATED_QUERIES_TABLE: escalatedQueriesTable.tableName,
      },
    });

    // Allow it to read from the escalated queries table
    escalatedQueriesTable.grantReadData(escalatedQueriesFn);

    // Update status function
    const updateQueryStatusFn = new lambda.Function(this, 'UpdateQueryStatusFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.update_query_status',
      code:    lambda.Code.fromAsset('lambda/escalatedQueries'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        ESCALATED_QUERIES_TABLE: escalatedQueriesTable.tableName,
      },
    });

    // Allow it to write to the escalated queries table
    escalatedQueriesTable.grantReadWriteData(updateQueryStatusFn);

    // Hook into API Gateway
    const escalatedQueries = AdminApi.root.addResource('escalated-queries');
    const escalatedQueriesIntegration = new apigateway.LambdaIntegration(escalatedQueriesFn, { proxy: true });
    const updateStatusIntegration = new apigateway.LambdaIntegration(updateQueryStatusFn, { proxy: true });

    // GET /escalated-queries - List all queries with optional status filter
    escalatedQueries.addMethod('GET', escalatedQueriesIntegration, {
      authorizer:        userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /escalated-queries - Update query status
    escalatedQueries.addMethod('PUT', updateStatusIntegration, {
      authorizer:        userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /escalated-queries/{queryId} - Get single query
    const singleQuery = escalatedQueries.addResource('{queryId}');
    singleQuery.addMethod('GET', escalatedQueriesIntegration, {
      authorizer:        userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // USER PROFILE & PERSONALIZED RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * User Profile Management Lambda
     * Handles user profile creation, updates, and personalized recommendations
     */
    const userProfileFn = new lambda.Function(this, 'UserProfileFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/userProfile'),
      timeout: cdk.Duration.seconds(30),
      environment: {
        USER_PROFILE_TABLE: userProfileTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    // Grant permissions
    userProfileTable.grantReadWriteData(userProfileFn);
    userProfileFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminGetUser',
      ],
      resources: [userPool.userPoolArn],
    }));

    // API Gateway resources
    const userProfileResource = AdminApi.root.addResource('user-profile');
    const recommendationsResource = AdminApi.root.addResource('recommendations');
    const userProfileIntegration = new apigateway.LambdaIntegration(userProfileFn, { proxy: true });

    // GET /user-profile - Get user profile
    userProfileResource.addMethod('GET', userProfileIntegration, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /user-profile - Create/update user profile
    userProfileResource.addMethod('POST', userProfileIntegration, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /user-profile - Update user profile
    userProfileResource.addMethod('PUT', userProfileIntegration, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /recommendations - Get personalized recommendations
    recommendationsResource.addMethod('GET', userProfileIntegration, {
      authorizer: userPoolAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });


    // AMPLIFY DEPLOYMENT MOVED TO BUILDSPEC
    // Amplify app will be created and managed by CodeBuild buildspec.yml
    // This avoids GitHub token requirements and enables CodePipeline CI/CD integration

    // ──────────────────────────────────────────────────────────────────────────────
    // Stack Outputs
    // ──────────────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: webSocketStage.url,
      description: 'WebSocket API endpoint URL',
      exportName: `${this.stackName}-WebSocketURL`,
    });

    new cdk.CfnOutput(this, 'RestAPIURL', {
      value: AdminApi.url,
      description: 'REST API Gateway endpoint URL',
      exportName: `${this.stackName}-RestAPIURL`,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${this.stackName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: `${this.stackName}-IdentityPoolId`,
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: kb.knowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
      exportName: `${this.stackName}-KnowledgeBaseId`,
    });

    new cdk.CfnOutput(this, 'DataSourceId', {
      value: knowledgeBaseDataSource.dataSourceId,
      description: 'Knowledge Base Data Source ID',
      exportName: `${this.stackName}-DataSourceId`,
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseBucket', {
      value: knowledgeBaseDataBucket.bucketName,
      description: 'S3 bucket name for Knowledge Base documents',
      exportName: `${this.stackName}-KnowledgeBaseBucket`,
    });

    new cdk.CfnOutput(this, 'AgentId', {
      value: agent.agentId,
      description: 'Bedrock Agent ID',
      exportName: `${this.stackName}-AgentId`,
    });

    new cdk.CfnOutput(this, 'AgentAliasId', {
      value: AgentAlias.aliasId,
      description: 'Bedrock Agent Alias ID',
      exportName: `${this.stackName}-AgentAliasId`,
    });

    new cdk.CfnOutput(this, 'KBSyncLambdaArn', {
      value: kbSyncLambda.functionArn,
      description: 'ARN of the Knowledge Base Auto-Sync Lambda function',
    });

    new cdk.CfnOutput(this, 'KBSyncLambdaName', {
      value: kbSyncLambda.functionName,
      description: 'Name of the Knowledge Base Auto-Sync Lambda function',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: AdminApi.url,
      description: 'Admin API Gateway endpoint URL',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validates required CDK context parameters
   *
   * @private
   * @param {object} params - Context parameters to validate
   * @throws {Error} If required parameters are missing
   */
  private validateRequiredContext(params: {
    githubOwner: string;
    githubRepo: string;
    adminEmail: string;
  }): void {
    const { githubOwner, githubRepo, adminEmail } = params;

    if (!githubOwner || !githubRepo || !adminEmail) {
      throw new Error(
        '❌ Missing required context values\n\n' +
        'Required parameters:\n' +
        '  • githubOwner: GitHub organization/owner name\n' +
        '  • githubRepo: GitHub repository name\n' +
        '  • adminEmail: Administrator email address\n\n' +
        'Usage:\n' +
        '  cdk deploy \\\n' +
        '    -c githubOwner=your-github-owner \\\n' +
        '    -c githubRepo=your-github-repo \\\n' +
        '    -c adminEmail=alerts@yourdomain.com\n\n' +
        'Note: githubToken is optional for public repositories'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error(`❌ Invalid email format: ${adminEmail}`);
    }
  }
}
