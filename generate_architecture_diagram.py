from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb, RDS
from diagrams.aws.storage import S3
from diagrams.aws.network import CloudFront, APIGateway
from diagrams.aws.security import Cognito, IAM, KMS, WAF
from diagrams.aws.ml import Bedrock
from diagrams.aws.analytics import Quicksight
from diagrams.aws.database import ElasticsearchService
from diagrams.aws.integration import Eventbridge, SES
from diagrams.aws.management import Cloudwatch, Cloudtrail
from diagrams.aws.storage import Backup
from diagrams.aws.mobile import Amplify
from diagrams.generic.blank import Blank

with Diagram("MHFA Learning Navigator - AWS Architecture", show=False, direction="TB", filename="mhfa_architecture"):
    
    # Users Layer
    with Cluster("Users"):
        instructors = Blank("MHFA Instructors")
        learners = Blank("Learners")
        staff = Blank("Internal Staff")
        admin = Blank("Admin Users")
    
    # Edge & Security Layer
    with Cluster("Edge & Security"):
        cloudfront = CloudFront("CloudFront CDN")
        waf = WAF("AWS WAF")
    
    # Frontend Layer
    with Cluster("Frontend"):
        s3_web = S3("S3 Static Website")
        amplify = Amplify("Amplify Hosting")
    
    # API Layer
    with Cluster("API Gateway"):
        api_gateway = APIGateway("REST API")
        websocket = APIGateway("WebSocket API")
    
    # Authentication
    with Cluster("Auth & Security"):
        cognito = Cognito("Cognito User Pool")
        iam = IAM("IAM Roles")
        kms = KMS("KMS Encryption")
    
    # Core AI Services
    with Cluster("Bedrock AI Core"):
        bedrock_agent = Bedrock("Bedrock Agent\n(Claude-3)")
        knowledge_base = ElasticsearchService("Knowledge Base\n(OpenSearch)")
        guardrails = Bedrock("Bedrock Guardrails")
    
    # Action Groups
    with Cluster("Action Groups"):
        crm_action = Lambda("CRM Integration")
        zendesk_action = Lambda("Zendesk Escalation")
        analytics_action = Lambda("Analytics Query")
        feedback_action = Lambda("Feedback Handler")
    
    # Data Storage
    with Cluster("Data Storage"):
        dynamodb = Dynamodb("DynamoDB\n(Sessions)")
        rds = RDS("RDS PostgreSQL\n(User Data)")
        s3_data = S3("S3 Data Lake\n(Content)")
    
    # External Systems
    with Cluster("External Systems"):
        zendesk = Blank("Zendesk")
        dynamics = Blank("Microsoft Dynamics")
        email = SES("SES Email")
    
    # Analytics & Monitoring
    with Cluster("Analytics & Monitoring"):
        cloudwatch = Cloudwatch("CloudWatch")
        quicksight = Quicksight("QuickSight")
        eventbridge = Eventbridge("EventBridge")
    
    # Compliance
    with Cluster("Compliance"):
        cloudtrail = Cloudtrail("CloudTrail")
        backup = Backup("AWS Backup")
    
    # Flow Connections
    instructors >> Edge(label="1") >> cloudfront
    learners >> Edge(label="1") >> cloudfront
    staff >> Edge(label="1") >> cloudfront
    admin >> Edge(label="1") >> cloudfront
    
    cloudfront >> Edge(label="2") >> waf
    waf >> Edge(label="3") >> s3_web
    s3_web >> Edge(label="4") >> api_gateway
    
    api_gateway >> Edge(label="5") >> cognito
    cognito >> Edge(label="6") >> bedrock_agent
    
    bedrock_agent >> Edge(label="7") >> knowledge_base
    bedrock_agent >> Edge(label="8") >> guardrails
    
    bedrock_agent >> Edge(label="9a") >> crm_action
    bedrock_agent >> Edge(label="9b") >> zendesk_action
    bedrock_agent >> Edge(label="9c") >> analytics_action
    bedrock_agent >> Edge(label="9d") >> feedback_action
    
    crm_action >> Edge(label="10a") >> dynamics
    zendesk_action >> Edge(label="10b") >> zendesk
    analytics_action >> Edge(label="10c") >> dynamodb
    feedback_action >> Edge(label="10d") >> dynamodb
    
    knowledge_base >> s3_data
    bedrock_agent >> dynamodb
    api_gateway >> rds
    
    bedrock_agent >> cloudwatch
    dynamodb >> quicksight
    eventbridge >> email
    
    iam >> bedrock_agent
    kms >> dynamodb
    cloudtrail >> cloudwatch

print("Architecture diagram generated: mhfa_architecture.png")