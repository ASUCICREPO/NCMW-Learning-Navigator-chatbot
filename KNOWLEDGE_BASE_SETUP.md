# Knowledge Base Setup Guide

## Overview

This guide details how to set up and process the knowledge base documents from the existing S3 bucket for use with the Learning Navigator chatbot.

---

## Existing S3 Bucket

**Bucket ARN**: `arn:aws:s3:::national-council-s3-pdfs`
**Bucket Name**: `national-council-s3-pdfs`
**Region**: `us-west-2` ✅ CONFIRMED
**Documents**: 3 PDFs (7.1 MiB total) ✅ VERIFIED
**Access**: Read access confirmed ✅

### Current Documents:
1. `25.04.11_MHFA_Learners-ConnectUserGuide_RW.pdf` (1.7 MiB) - Learner guide
2. `25.04.14_MHFA Connect User Guide_RW.pdf` (4.9 MiB) - General platform guide
3. `MHFA_InstructorPolicyHandbook_8.6.25.pdf` (531 KB) - Instructor policies

**Estimated Processing Cost**: ~$1.22 one-time
**Estimated Processing Time**: ~8-10 minutes

---

## Architecture for Knowledge Base Processing

```
┌──────────────────────────────────────────────────────────────┐
│  Existing S3 Bucket: national-council-s3-pdfs               │
│  - PDF documents                                             │
│  - Training materials                                        │
│  - FAQs and guides                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ S3 Event Notification
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Lambda: processDocument                                     │
│  - Triggered on S3 upload/update                            │
│  - Extracts text from PDFs                                   │
│  - Detects language                                          │
│  - Chunks documents                                          │
│  - Generates embeddings                                      │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Index documents
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  OpenSearch / Kendra                                         │
│  - Searchable index                                          │
│  - Vector embeddings                                         │
│  - Metadata (role, language, source)                        │
└──────────────────────────────────────────────────────────────┘
                     │
                     │ Query at runtime
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  RAG Pipeline                                                │
│  - User query → Search → Retrieve context → Bedrock         │
└──────────────────────────────────────────────────────────────┘
```

---

## Step 1: Initial Bucket Analysis

First, let's analyze what's in the bucket:

### CDK Code to Grant Access

```typescript
// infrastructure/lib/ai-stack.ts
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AIStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Reference existing S3 bucket (don't create new one)
    const knowledgeBaseBucket = s3.Bucket.fromBucketArn(
      this,
      'KnowledgeBaseBucket',
      'arn:aws:s3:::national-council-s3-pdfs'
    );

    // Lambda function to process documents
    const processDocFunction = new lambdaNodejs.NodejsFunction(
      this,
      'ProcessDocumentFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: 'backend/functions/knowledge-base/processDocument.ts',
        timeout: Duration.minutes(5), // PDF processing can be slow
        memorySize: 2048, // More memory for PDF processing
        environment: {
          OPENSEARCH_ENDPOINT: opensearchDomain.domainEndpoint,
          BEDROCK_REGION: 'us-east-1'
        }
      }
    );

    // Grant read access to the bucket
    knowledgeBaseBucket.grantRead(processDocFunction);

    // Add S3 event notification (optional - for automatic processing)
    knowledgeBaseBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processDocFunction),
      { suffix: '.pdf' } // Only trigger on PDF files
    );
  }
}
```

---

## Step 2: Document Processing Lambda Function

### Full Implementation

```typescript
// backend/functions/knowledge-base/processDocument.ts
import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  TextractClient,
  DetectDocumentTextCommand
} from '@aws-sdk/client-textract';
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';
import {
  ComprehendClient,
  DetectDominantLanguageCommand
} from '@aws-sdk/client-comprehend';
import { Client } from '@opensearch-project/opensearch';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

// Initialize clients
const s3Client = new S3Client({});
const textractClient = new TextractClient({});
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const comprehendClient = new ComprehendClient({});

// OpenSearch client with AWS Sigv4 signing
const osClient = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION!,
    service: 'es',
    getCredentials: () => {
      const credentialsProvider = defaultProvider();
      return credentialsProvider();
    },
  }),
  node: process.env.OPENSEARCH_ENDPOINT,
});

export const handler: S3Handler = async (event: S3Event) => {
  console.log('Processing S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
      console.log(`Processing document: s3://${bucket}/${key}`);

      // Step 1: Extract text from PDF
      const text = await extractTextFromPDF(bucket, key);
      console.log(`Extracted ${text.length} characters from PDF`);

      // Step 2: Detect language
      const language = await detectLanguage(text);
      console.log(`Detected language: ${language}`);

      // Step 3: Extract metadata from path/filename
      const metadata = extractMetadata(key);
      console.log(`Extracted metadata:`, metadata);

      // Step 4: Chunk the document
      const chunks = chunkDocument(text, {
        maxChunkSize: 500, // tokens (roughly 2000 characters)
        overlapSize: 50
      });
      console.log(`Split into ${chunks.length} chunks`);

      // Step 5: Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await generateEmbedding(chunk.text);

        // Index in OpenSearch
        await indexChunk({
          documentId: generateDocumentId(key, i),
          chunkIndex: i,
          totalChunks: chunks.length,
          text: chunk.text,
          embedding: embedding,
          source: key,
          bucket: bucket,
          language: language,
          ...metadata,
          processedAt: new Date().toISOString()
        });

        console.log(`Indexed chunk ${i + 1}/${chunks.length}`);
      }

      console.log(`Successfully processed: ${key}`);
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      // Don't throw - continue processing other documents
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Documents processed' })
  };
};

/**
 * Extract text from PDF using Amazon Textract
 */
async function extractTextFromPDF(bucket: string, key: string): Promise<string> {
  // For PDFs in S3, use Textract's start job approach for better results
  const command = new DetectDocumentTextCommand({
    Document: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    }
  });

  const response = await textractClient.send(command);

  // Extract text from blocks
  const textBlocks = response.Blocks?.filter(
    block => block.BlockType === 'LINE'
  ) || [];

  const text = textBlocks
    .map(block => block.Text)
    .filter(text => text)
    .join('\n');

  return text;
}

/**
 * Detect document language
 */
async function detectLanguage(text: string): Promise<string> {
  // Use first 5000 characters for language detection
  const sample = text.substring(0, 5000);

  const command = new DetectDominantLanguageCommand({
    Text: sample
  });

  const response = await comprehendClient.send(command);
  const dominantLanguage = response.Languages?.[0];

  // Map language codes
  const languageCode = dominantLanguage?.LanguageCode || 'en';
  return languageCode === 'es' ? 'es' : 'en';
}

/**
 * Extract metadata from S3 key path
 */
function extractMetadata(key: string): {
  role?: string;
  category?: string;
  documentType?: string;
} {
  // Example key patterns:
  // - instructors/course-management/invoicing-guide.pdf
  // - staff/operations/system-procedures.pdf
  // - general/faqs/common-questions.pdf

  const parts = key.split('/');
  const metadata: any = {};

  // First part might indicate target role
  if (parts[0]) {
    const roleMap: { [key: string]: string } = {
      'instructors': 'instructor',
      'instructor': 'instructor',
      'staff': 'staff',
      'admin': 'admin',
      'general': 'all',
      'learners': 'learner'
    };

    metadata.role = roleMap[parts[0].toLowerCase()] || 'all';
  }

  // Second part might be category
  if (parts[1]) {
    metadata.category = parts[1].replace(/-/g, ' ');
  }

  // Determine document type from filename
  const filename = parts[parts.length - 1].toLowerCase();
  if (filename.includes('faq')) {
    metadata.documentType = 'faq';
  } else if (filename.includes('guide')) {
    metadata.documentType = 'guide';
  } else if (filename.includes('manual')) {
    metadata.documentType = 'manual';
  } else if (filename.includes('policy')) {
    metadata.documentType = 'policy';
  } else {
    metadata.documentType = 'document';
  }

  return metadata;
}

/**
 * Chunk document into smaller pieces
 */
function chunkDocument(
  text: string,
  options: { maxChunkSize: number; overlapSize: number }
): Array<{ text: string; index: number }> {
  const chunks: Array<{ text: string; index: number }> = [];

  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const proposedChunk = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    // Rough token estimation: 1 token ≈ 4 characters
    const estimatedTokens = proposedChunk.length / 4;

    if (estimatedTokens > options.maxChunkSize && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++
      });

      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-options.overlapSize);
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk = proposedChunk;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex
    });
  }

  return chunks;
}

/**
 * Generate embedding using Amazon Bedrock (Titan Embeddings)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text
    })
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  return result.embedding;
}

/**
 * Index chunk in OpenSearch
 */
async function indexChunk(document: any): Promise<void> {
  await osClient.index({
    index: 'knowledge-base',
    id: document.documentId,
    body: document,
    refresh: true
  });
}

/**
 * Generate unique document ID
 */
function generateDocumentId(key: string, chunkIndex: number): string {
  const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '-');
  return `${cleanKey}-chunk-${chunkIndex}`;
}
```

---

## Step 3: Batch Processing Existing Documents

For documents already in the bucket, create a one-time processing script:

```typescript
// scripts/process-existing-documents.ts
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const s3Client = new S3Client({});
const lambdaClient = new LambdaClient({});

const BUCKET_NAME = 'national-council-s3-pdfs';
const PROCESS_FUNCTION_NAME = 'learning-navigator-processDocument';

async function processAllDocuments() {
  console.log(`Listing objects in bucket: ${BUCKET_NAME}`);

  let continuationToken: string | undefined;
  let totalProcessed = 0;

  do {
    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    console.log(`Found ${objects.length} objects in this batch`);

    // Process each PDF
    for (const obj of objects) {
      if (!obj.Key || !obj.Key.endsWith('.pdf')) {
        console.log(`Skipping non-PDF: ${obj.Key}`);
        continue;
      }

      try {
        console.log(`Processing: ${obj.Key}`);

        // Invoke Lambda function with synthetic S3 event
        const event = {
          Records: [
            {
              s3: {
                bucket: { name: BUCKET_NAME },
                object: { key: obj.Key }
              }
            }
          ]
        };

        const invokeCommand = new InvokeCommand({
          FunctionName: PROCESS_FUNCTION_NAME,
          InvocationType: 'Event', // Async
          Payload: JSON.stringify(event)
        });

        await lambdaClient.send(invokeCommand);
        totalProcessed++;

        console.log(`✓ Queued: ${obj.Key}`);

        // Rate limiting - don't overwhelm Lambda
        await sleep(100);
      } catch (error) {
        console.error(`✗ Failed to process ${obj.Key}:`, error);
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log(`\n✓ Total documents queued for processing: ${totalProcessed}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
processAllDocuments()
  .then(() => console.log('Done!'))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
```

**Run with**:
```bash
cd backend
npm install
npx ts-node scripts/process-existing-documents.ts
```

---

## Step 4: OpenSearch Index Setup

### Create Index with Mapping

```typescript
// scripts/setup-opensearch-index.ts
import { Client } from '@opensearch-project/opensearch';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION || 'us-east-1',
    service: 'es',
    getCredentials: () => {
      const credentialsProvider = defaultProvider();
      return credentialsProvider();
    },
  }),
  node: process.env.OPENSEARCH_ENDPOINT!,
});

async function setupIndex() {
  const indexName = 'knowledge-base';

  // Check if index exists
  const exists = await client.indices.exists({ index: indexName });

  if (exists.body) {
    console.log(`Index ${indexName} already exists. Deleting...`);
    await client.indices.delete({ index: indexName });
  }

  // Create index with mappings
  console.log(`Creating index: ${indexName}`);

  await client.indices.create({
    index: indexName,
    body: {
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        'index.knn': true, // Enable k-NN for vector search
        'index.knn.algo_param.ef_search': 512
      },
      mappings: {
        properties: {
          documentId: { type: 'keyword' },
          chunkIndex: { type: 'integer' },
          totalChunks: { type: 'integer' },
          text: {
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          embedding: {
            type: 'knn_vector',
            dimension: 1536, // Titan embeddings dimension
            method: {
              name: 'hnsw',
              space_type: 'l2',
              engine: 'nmslib',
              parameters: {
                ef_construction: 512,
                m: 16
              }
            }
          },
          source: { type: 'keyword' },
          bucket: { type: 'keyword' },
          language: { type: 'keyword' },
          role: { type: 'keyword' },
          category: { type: 'keyword' },
          documentType: { type: 'keyword' },
          processedAt: { type: 'date' }
        }
      }
    }
  });

  console.log(`✓ Index ${indexName} created successfully`);
}

setupIndex()
  .then(() => console.log('Done!'))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
```

---

## Step 5: Testing the Knowledge Base

### Test Search Function

```typescript
// scripts/test-search.ts
async function testSearch(query: string, userRole: string = 'instructor') {
  const queryEmbedding = await generateEmbedding(query);

  const searchResponse = await osClient.search({
    index: 'knowledge-base',
    body: {
      size: 5,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['text^2', 'category'],
                type: 'best_fields'
              }
            }
          ],
          should: [
            {
              knn: {
                embedding: {
                  vector: queryEmbedding,
                  k: 10
                }
              }
            }
          ],
          filter: [
            {
              terms: {
                role: [userRole, 'all']
              }
            }
          ]
        }
      },
      _source: ['text', 'source', 'category', 'role']
    }
  });

  const hits = searchResponse.body.hits.hits;

  console.log(`\nQuery: "${query}"`);
  console.log(`Found ${hits.length} results:\n`);

  hits.forEach((hit: any, index: number) => {
    console.log(`${index + 1}. Score: ${hit._score}`);
    console.log(`   Source: ${hit._source.source}`);
    console.log(`   Category: ${hit._source.category}`);
    console.log(`   Text: ${hit._source.text.substring(0, 200)}...`);
    console.log('');
  });
}

// Test queries
const testQueries = [
  'How do I submit an invoice?',
  'What are the requirements for teaching MHFA?',
  'How do I register for a course?',
  'What is the refund policy?'
];

for (const query of testQueries) {
  await testSearch(query);
}
```

---

## Step 6: Monitoring and Maintenance

### CloudWatch Dashboard for Knowledge Base

```typescript
// Add to monitoring-stack.ts
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Knowledge Base Processing',
    left: [
      processDocFunction.metricInvocations(),
      processDocFunction.metricErrors(),
      processDocFunction.metricDuration()
    ]
  }),

  new cloudwatch.SingleValueWidget({
    title: 'Total Documents Processed',
    metrics: [
      processDocFunction.metricInvocations({
        statistic: 'Sum',
        period: Duration.days(30)
      })
    ]
  })
);
```

### Reprocessing Strategy

When documents are updated:
1. S3 event triggers Lambda automatically
2. Lambda detects if document already exists (by source key)
3. Deletes old chunks from OpenSearch
4. Processes and indexes new version

---

## Cost Estimation for Knowledge Base Processing

### One-Time Processing (Assume 1000 PDFs)

| Service | Usage | Cost |
|---------|-------|------|
| Textract | 1000 pages @ $1.50/1000 | $1.50 |
| Bedrock Embeddings | 500K tokens @ $0.0001/1K | $0.05 |
| Lambda | 1000 invocations × 2min | $0.20 |
| OpenSearch indexing | Included in cluster | $0 |
| **Total** | | **~$2** |

### Ongoing Costs

- OpenSearch cluster: ~$100/month (small cluster)
- Document updates: ~$0.10/month (minimal)

---

## Security Considerations

### IAM Policy for Lambda

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::national-council-s3-pdfs",
        "arn:aws:s3:::national-council-s3-pdfs/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v1"
    },
    {
      "Effect": "Allow",
      "Action": [
        "comprehend:DetectDominantLanguage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpGet"
      ],
      "Resource": "arn:aws:es:us-east-1:*:domain/learning-navigator/*"
    }
  ]
}
```

---

## Next Steps

1. **Analyze bucket contents**: Run script to list all files and structure
2. **Set up OpenSearch index**: Create index with proper mappings
3. **Deploy Lambda function**: Process document function with permissions
4. **Initial processing**: Run batch script to process all existing PDFs
5. **Test search quality**: Run test queries and validate results
6. **Set up monitoring**: CloudWatch dashboards and alarms
7. **Enable auto-processing**: S3 event notifications for new uploads

---

## Questions to Answer

1. **Bucket Region**: What AWS region is `national-council-s3-pdfs` in?
2. **Document Structure**: How are documents organized in the bucket? (folders? naming convention?)
3. **Access Permissions**: Do we have read access to this bucket?
4. **Document Count**: Approximately how many PDFs are in the bucket?
5. **Update Frequency**: How often are new documents added or updated?
6. **Sensitive Data**: Do any documents contain PII or sensitive information we should redact?

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-20
**Status**: Ready for Implementation
