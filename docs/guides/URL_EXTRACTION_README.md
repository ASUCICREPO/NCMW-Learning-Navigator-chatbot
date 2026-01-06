# URL Extraction and Reference Guide

This guide explains how to extract hyperlinks from PDF files and ensure the Learning Navigator agent can access and share URLs with users.

## Problem

When PDF files contain hyperlinks (like "Request Assistance Form" linking to a URL), the text extraction process used by AWS Bedrock Knowledge Base typically loses these links. Users only see the text "Request Assistance Form" without the actual URL.

## Solution

We've created a three-part solution:

### 1. PDF URL Extraction Tool (`extract_pdf_urls.py`)

A Python script that extracts hyperlinks from PDF files and creates a reference document.

**Usage:**
```bash
# Extract URLs from one PDF
python3 extract_pdf_urls.py path/to/document.pdf

# Extract URLs from multiple PDFs
python3 extract_pdf_urls.py knowledge_base/*.pdf

# Extract from specific files
python3 extract_pdf_urls.py file1.pdf file2.pdf file3.pdf
```

**Output:**
- `mhfa_url_reference.md` - Markdown document with all extracted URLs
- `mhfa_url_reference.json` - JSON format for programmatic access

### 2. Pre-created URL Reference Document

We've created `mhfa_url_reference.md` with common MHFA URLs including:
- MHFA Connect platform
- Request Assistance Form
- Store/purchasing
- Course finder
- Instructor resources
- Support contacts

### 3. Agent Instructions

The agent has been configured with URL preservation rules that instruct it to:
- Always include URLs when they appear in knowledge base sources
- Never say "visit the website" without providing the actual URL
- Copy URLs exactly as they appear

## How to Use

### Step 1: Extract URLs from Your PDFs

If you have MHFA knowledge base PDFs with hyperlinks:

```bash
# Download PDFs from S3 (if stored there)
aws s3 sync s3://your-knowledge-base-bucket ./pdfs/

# Extract URLs
python3 extract_pdf_urls.py pdfs/*.pdf
```

This creates `mhfa_url_reference.md` with all extracted URLs.

### Step 2: Review and Edit the Reference Document

1. Open `mhfa_url_reference.md`
2. Verify all URLs are correct
3. Add any missing URLs you know about
4. Add context about when each URL should be used

### Step 3: Upload to Knowledge Base

Upload the reference document to your knowledge base S3 bucket:

```bash
# Find your knowledge base bucket
aws s3 ls | grep -i "data\|knowledge"

# Upload the reference document
aws s3 cp mhfa_url_reference.md s3://your-bucket-name/mhfa_url_reference.md
```

### Step 4: Sync Knowledge Base

After uploading, trigger a knowledge base sync:

```bash
# Get knowledge base ID
aws bedrock-agent list-knowledge-bases --query 'knowledgeBaseSummaries[0].knowledgeBaseId' --output text

# Get data source ID
aws bedrock-agent list-data-sources --knowledge-base-id YOUR_KB_ID --query 'dataSourceSummaries[0].dataSourceId' --output text

# Start ingestion job
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id YOUR_KB_ID \
  --data-source-id YOUR_DS_ID
```

## Testing

After uploading and syncing, test the agent:

1. Ask: "Where is the Request Assistance Form?"
   - **Expected**: Agent provides the URL https://www.mentalhealthfirstaid.org/request-assistance/

2. Ask: "How do I submit custom voucher orders?"
   - **Expected**: Agent mentions the Request Assistance Form with the URL

3. Ask: "Where can I buy course materials?"
   - **Expected**: Agent provides https://store.mentalhealthfirstaid.org/

## Maintaining URLs

### When to Update

Update the URL reference document when:
- New forms or resources are added
- URLs change (redirects, new domains)
- New training programs launch
- You notice the agent missing URLs in responses

### Best Practices

1. **Keep URLs in the source PDFs**: When creating new documentation, include URLs directly in the text:
   ```
   Submit the form at: https://www.mentalhealthfirstaid.org/request-assistance/
   ```

2. **Test regularly**: Periodically test common queries to ensure URLs are being provided

3. **Version control**: Keep the URL reference document in git so you can track changes

4. **Document context**: In the reference document, explain when each URL should be used

## Troubleshooting

### Agent doesn't provide URLs

**Problem**: Agent says "visit the website" but doesn't include the URL

**Solutions**:
1. Check if `mhfa_url_reference.md` is uploaded to S3
2. Verify knowledge base sync completed successfully
3. Check agent instructions include URL preservation rules
4. Test with a query that should definitely return a URL

### Extracted URLs are incomplete

**Problem**: PDF extractor misses some URLs

**Solutions**:
1. Manually add missing URLs to `mhfa_url_reference.md`
2. Check if URLs in PDF are actual hyperlinks (not just text)
3. Try opening PDF in different viewer to see actual links

### Wrong URLs in responses

**Problem**: Agent provides outdated or incorrect URLs

**Solutions**:
1. Update `mhfa_url_reference.md` with correct URLs
2. Upload updated version to S3
3. Trigger knowledge base sync
4. Wait 5-10 minutes for changes to propagate

## Files Created

- `extract_pdf_urls.py` - URL extraction script
- `mhfa_url_reference.md` - Pre-created reference document with common MHFA URLs
- `URL_EXTRACTION_README.md` - This guide

## Next Steps

1. ✅ Extract URLs from your MHFA knowledge base PDFs
2. ✅ Review and complete the reference document
3. ⏳ Upload to S3 knowledge base bucket
4. ⏳ Sync knowledge base
5. ⏳ Test with users

## Need Help?

If URLs still aren't appearing correctly:
1. Check CloudWatch logs for the agent
2. Test retrieval directly from knowledge base
3. Verify PDF parsing is working correctly
4. Contact AWS Bedrock support if needed
