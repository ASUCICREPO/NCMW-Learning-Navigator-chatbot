# Step 2: DynamoDB Table - Detailed Explanation

## 🎯 What We Built

A single DynamoDB table named `learning-navigator` that stores ALL application data using a composite key design pattern.

---

## 📊 Single Table Design Pattern

### Key Structure

```
PK (Partition Key)          SK (Sort Key)                    Attributes
─────────────────────────────────────────────────────────────────────────
USER#user-123              PROFILE                          name, email, role
USER#user-123              CONV#conv-456                    lastMessage, unread
CONV#conv-456              METADATA                         userId, startedAt
CONV#conv-456              MSG#2025-12-20T10:30:00.000Z    role, content
CONV#conv-456              MSG#2025-12-20T10:30:02.500Z    role, content, citations
```

### Access Patterns

| Use Case | Query |
|----------|-------|
| Get user profile | `PK = USER#123, SK = PROFILE` |
| List user's conversations | `PK = USER#123, SK begins_with CONV#` |
| Get conversation metadata | `PK = CONV#456, SK = METADATA` |
| List messages in conversation | `PK = CONV#456, SK begins_with MSG#` |
| Get specific message | `PK = CONV#456, SK = MSG#timestamp` |

---

## 🔄 Trade-offs Analysis

### 1. Single Table vs Multiple Tables

**Our Choice: Single Table**

| Factor | Single Table | Multiple Tables |
|--------|-------------|-----------------|
| **Cost** | $1.25/month | $3.75/month |
| **Query Complexity** | Medium | Easy |
| **Related Data** | One query | Multiple queries |
| **Learning Curve** | Hard | Easy |
| **Best Practice** | ✅ Yes (DynamoDB) | ⚠️ Traditional approach |

**Why Single Table?**
- Lower cost (3x cheaper)
- Fetch user + conversations in one query
- DynamoDB best practice for serverless
- Scales better (no cross-table queries)

**When to Use Multiple Tables?**
- Team new to DynamoDB (easier to understand)
- Very different access patterns per entity
- Separate security requirements per table

**Code Comparison:**
```python
# Single Table
table = dynamodb.Table(
    self, "MainTable",
    partition_key={"name": "PK", "type": STRING},
    sort_key={"name": "SK", "type": STRING}
)

# Multiple Tables (NOT used)
users_table = dynamodb.Table(self, "Users", ...)
conversations_table = dynamodb.Table(self, "Conversations", ...)
messages_table = dynamodb.Table(self, "Messages", ...)
```

---

### 2. On-Demand vs Provisioned Billing

**Our Choice: On-Demand (PAY_PER_REQUEST)**

| Factor | On-Demand | Provisioned |
|--------|-----------|-------------|
| **Cost (low traffic)** | $1.25/million reads | $0.58/month minimum |
| **Cost (high traffic)** | Scales linearly | Cheaper at scale |
| **Capacity Planning** | None | Required |
| **Auto-Scaling** | Automatic | Need to configure |
| **Best For** | Unpredictable traffic | Steady traffic |

**Pricing Details:**
```
On-Demand:
- Read: $1.25 per million requests
- Write: $6.25 per million requests
- Storage: $0.25/GB/month

Provisioned:
- 1 Read Capacity Unit (RCU): $0.00065/hour = $0.47/month
- 1 Write Capacity Unit (WCU): $0.00325/hour = $2.35/month
- Storage: $0.25/GB/month
```

**Why On-Demand?**
- Chatbot traffic is unpredictable (burst patterns)
- No capacity planning needed
- Scales automatically to any load
- Better for MVP (optimize later if needed)

**When to Switch to Provisioned?**
- After 6 months with steady traffic patterns
- If spending >$50/month on DynamoDB
- Can save 20-40% with reserved capacity

**Code:**
```python
# On-Demand (Our choice)
billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST

# Provisioned (Alternative)
billing_mode=dynamodb.BillingMode.PROVISIONED,
read_capacity=5,    # 5 RCU = ~$2.35/month
write_capacity=5,   # 5 WCU = ~$11.75/month
```

---

### 3. Point-in-Time Recovery (PITR)

**Our Choice: Enabled**

| Factor | PITR Enabled | PITR Disabled |
|--------|-------------|---------------|
| **Cost** | +$0.20/GB/month | $0 |
| **Backup Window** | 35 days | None |
| **Recovery** | Any point in time | Manual backups only |
| **Best For** | Production | Development |

**Why Enabled?**
- Protects against accidental deletes
- No operational overhead (automatic)
- $0.20/GB is cheap insurance
- Essential for HIPAA compliance

**Cost Example:**
```
5GB database = $0.20 × 5 = $1.00/month

Benefit: Can recover from:
- Accidental table deletion
- Bad deployment that corrupts data
- Ransomware attack
```

**Code:**
```python
# PITR Enabled (Our choice - production safety)
point_in_time_recovery=True

# PITR Disabled (Alternative - dev environments)
point_in_time_recovery=False
```

---

### 4. Encryption at Rest

**Our Choice: AWS-Managed Keys**

| Factor | AWS-Managed | Customer-Managed (KMS) |
|--------|------------|----------------------|
| **Cost** | Free | $1/month + $0.03/10k requests |
| **Key Rotation** | Automatic | Manual/Automatic |
| **Compliance** | Basic | Advanced (audit logs) |
| **Control** | AWS controls | You control |

**Why AWS-Managed?**
- Free (no additional cost)
- Automatic encryption
- Sufficient for MVP
- Can upgrade to KMS later if needed

**When to Use KMS?**
- Need audit logs of key usage
- Compliance requires customer-managed keys
- Want cross-region encryption
- Need to disable/delete keys

**Code:**
```python
# AWS-Managed (Our choice - free)
encryption=dynamodb.TableEncryption.AWS_MANAGED

# Customer-Managed (Alternative - more control)
encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
encryption_key=kms.Key(self, "TableKey")
```

---

### 5. Time-to-Live (TTL)

**Our Choice: Enabled with `expiresAt` attribute**

**What is TTL?**
- DynamoDB automatically deletes items after expiration
- Zero cost (no additional charges)
- Items deleted within 48 hours of expiration

**Use Cases:**
```python
# Example 1: Temporary session (1 hour)
{
    "PK": "SESSION#abc123",
    "SK": "DATA",
    "userId": "user-123",
    "expiresAt": 1703001234  # Unix timestamp (now + 1 hour)
}

# Example 2: Email verification token (24 hours)
{
    "PK": "TOKEN#verify-xyz",
    "SK": "EMAIL",
    "email": "user@example.com",
    "expiresAt": 1703087634  # Unix timestamp (now + 24 hours)
}

# Example 3: Permanent data (no expiration)
{
    "PK": "USER#user-123",
    "SK": "PROFILE",
    "name": "John Doe",
    # No expiresAt attribute = never expires
}
```

**Benefits:**
- Free automatic cleanup
- No Lambda needed for deletion
- Reduces storage costs
- Perfect for temporary data

**Code:**
```python
# Enable TTL (Our choice)
time_to_live_attribute="expiresAt"

# Disable TTL (Manual deletion needed)
# Don't set this parameter
```

---

### 6. Global Secondary Index (GSI)

**Our Choice: GSI for Date-Based Analytics**

**What is GSI?**
- Alternative query path (different partition/sort keys)
- Enables queries that main table can't do
- Adds ~30% to storage cost
- Eventually consistent (slight delay)

**Main Table vs GSI:**
```
Main Table:
PK=USER#123, SK=CONV#456  ← Can query by user
PK=CONV#456, SK=MSG#...   ← Can query by conversation

GSI (GSI1PK-GSI1SK-index):
GSI1PK=DATE#2025-12-20, GSI1SK=CONV#456  ← Can query by date!
GSI1PK=USER#123, GSI1SK=timestamp        ← Can query user by time!
```

**Use Cases:**
```python
# Query 1: All conversations on a date (admin analytics)
query(
    IndexName="GSI1PK-GSI1SK-index",
    KeyConditionExpression="GSI1PK = :date",
    ExpressionAttributeValues={":date": "DATE#2025-12-20"}
)

# Query 2: All conversations in date range
query(
    IndexName="GSI1PK-GSI1SK-index",
    KeyConditionExpression="GSI1PK BETWEEN :start AND :end",
    ExpressionAttributeValues={
        ":start": "DATE#2025-11-20",
        ":end": "DATE#2025-12-20"
    }
)
```

**Projection Types:**
```python
# ALL - Copy everything (Our choice)
projection=dynamodb.Projection.all()
# Pro: Fastest queries (no main table lookup)
# Con: 2x storage (base + GSI)

# KEYS_ONLY - Copy only keys
projection=dynamodb.Projection.keys_only()
# Pro: Cheapest (minimal storage)
# Con: Slower (need main table lookup for attributes)

# INCLUDE - Copy specific attributes
projection=dynamodb.Projection.include(["userId", "createdAt"])
# Pro: Balance between speed and cost
# Con: Need to choose attributes carefully
```

**Why We Chose ALL:**
- Admin dashboard needs full data
- Storage cost is low ($0.25/GB)
- Query speed is critical for UX
- Can optimize later if cost becomes issue

**Cost Impact:**
```
Without GSI: $0.25/GB storage
With GSI (ALL projection): $0.50/GB storage

For 5GB database:
- Without GSI: $1.25/month
- With GSI: $2.50/month
- Difference: $1.25/month

Worth it for fast analytics!
```

---

## 🎤 Interview Talking Points

### Question: "Why did you use DynamoDB instead of RDS?"

**Your Answer:**
> "We chose DynamoDB for three main reasons:
>
> 1. **Performance**: Consistent sub-10ms latency regardless of scale. Our chatbot needs fast response times.
>
> 2. **Serverless Integration**: No connection pooling complexity with Lambda. Each Lambda invocation can directly query DynamoDB without managing connections.
>
> 3. **Cost at Scale**: At our expected load (100K requests/month), DynamoDB costs ~$1.25/month vs RDS at ~$30-50/month minimum. We're paying for what we use.
>
> The trade-off is a steeper learning curve with composite keys and limited query patterns, but our access patterns (get user, list conversations, get messages) fit DynamoDB's strengths perfectly."

---

### Question: "Explain your single-table design. Why not separate tables?"

**Your Answer:**
> "Single-table design is a DynamoDB best practice that reduces costs and improves performance:
>
> **Benefits:**
> - One query to fetch related data (user + their conversations)
> - Lower cost: $1.25/month vs $3.75 for multiple tables
> - Better performance: No cross-table queries needed
>
> **Trade-off:**
> It's more complex to understand. We use composite keys like `PK=USER#123, SK=CONV#456` to store different entity types in one table. The learning curve is steeper, but the performance and cost benefits are worth it.
>
> If the team was completely new to DynamoDB, I'd consider multiple tables initially for easier onboarding, then migrate to single-table later."

---

### Question: "How does your table scale?"

**Your Answer:**
> "DynamoDB auto-scales automatically with on-demand billing:
>
> **Scalability:**
> - Handles any traffic spike (0 to millions of requests)
> - No capacity planning needed
> - Partitions data automatically based on PK
> - Can handle TB of data with consistent performance
>
> **Cost Model:**
> We pay per request: $1.25 per million reads, $6.25 per million writes. For unpredictable chatbot traffic, this is better than provisioned capacity where we'd over-provision for peak traffic.
>
> If traffic becomes predictable (after 6 months), we can switch to provisioned capacity and save 20-40% with reserved capacity."

---

### Question: "What happens if you accidentally delete data?"

**Your Answer:**
> "We have two layers of protection:
>
> 1. **Point-in-Time Recovery (PITR)**: Enabled on the table. Can restore to any point in the last 35 days. Costs $0.20/GB/month - cheap insurance.
>
> 2. **RemovalPolicy.RETAIN**: Even if we delete the CloudFormation stack, the table survives. We have to manually delete it, preventing accidental deletion.
>
> We can also enable DynamoDB Streams to send changes to S3 for long-term archival if needed."

---

## 📈 Next Steps

After deploying this DynamoDB table, we'll:

1. **Step 3**: Add S3 buckets for document storage
2. **Step 4**: Add Cognito for user authentication
3. **Step 5**: Add Lambda functions that read/write to this table
4. **Step 6**: Add API Gateway to expose Lambda functions

---

## 🚀 How to Deploy

```bash
# Activate virtual environment
source .venv/bin/activate

# See what will be created (no changes made)
cdk diff

# Deploy to AWS (creates DynamoDB table)
cdk deploy

# Check outputs
# You'll see: Table name, Table ARN, Region
```

---

## 💰 Cost Estimate

| Component | Cost |
|-----------|------|
| DynamoDB table (on-demand) | $0 (base) |
| Read requests (100K/month) | $0.13 |
| Write requests (20K/month) | $0.13 |
| Storage (1GB) | $0.25 |
| PITR (1GB) | $0.20 |
| GSI storage (1GB) | $0.25 |
| **Total** | **~$0.96/month** |

**At scale (1M requests/month):**
- Reads: $1.25
- Writes: $0.13
- Storage/PITR/GSI: $0.70
- **Total: ~$2.08/month**

Much cheaper than RDS ($30-50/month minimum)!

---

## 🎯 Summary

✅ **Created**: Single DynamoDB table with composite key design
✅ **Enabled**: On-demand billing, PITR, encryption, TTL
✅ **Added**: GSI for date-based analytics queries
✅ **Cost**: ~$1/month for MVP, scales linearly
✅ **Performance**: Sub-10ms queries, auto-scales
✅ **Interview Ready**: Full trade-offs and alternatives explained
