# Bedrock Agent Fix - January 5, 2026

## Issue Summary

The chatbot stopped working with the following error:
```
An error occurred (validationException) when calling the InvokeAgent operation:
Invocation of model ID anthropic.claude-sonnet-4-20250514-v1:0 with on-demand throughput isn't supported.
Retry your request with the ID or ARN of an inference profile that contains this model.
```

## Root Cause

After investigation, the actual root cause was **NOT** the model ID issue, but rather:

**The agent's instruction field was accidentally deleted or set to null.**

Error message from AWS:
```
"failureReasons": [
    "Exception: Agent Instruction cannot be null"
]
```

## Solution Applied

1. **Retrieved the correct agent instruction** from the CDK stack file:
   - Source: `/Users/etloaner/hemanth/ncwm_chatbot_2/cdk_backend/lib/cdk_backend-stack.ts`
   - Variable: `prompt_for_agent` (lines 182-227)

2. **Updated the agent** with the correct configuration:
   - Agent ID: `Q1HPKAJXXL`
   - Agent Name: `Learning-Navigator`
   - Foundation Model: `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (inference profile)
   - Instruction: Restored full agent instruction (see below)

3. **Prepared the agent** successfully:
   - Status: PREPARED ✅
   - Version: DRAFT
   - AgentTestAlias: Points to DRAFT and is PREPARED ✅

## Agent Instruction (Restored)

```
You are Learning Navigator, an AI-powered assistant integrated into the MHFA Learning Ecosystem. You support instructors, learners, and administrators by helping them navigate training resources, answer FAQs, and provide real-time guidance.

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

         • If confidence ≥ 90:
             - Reply with the direct answer and include "(confidence: X%)".
             - Cite specific source documents from the knowledge base that support your answer.
             - If the source contains any URLs, links, forms, or web addresses, include them EXACTLY in your response.
             - Do not ask for email or escalate.
         • If confidence < 90:
             - Say: "I'm sorry, I don't have a reliable answer right now.
                      Could you please share your email so I can escalate this to an administrator for further help?"
             - Wait for the user to supply an email address.


      2. Once you receive a valid email address:
         • Call the action group function notify-admin with these parameters:
             - **email**: the user's email
             - **querytext**: the original question they asked
             - **agentResponse**: the best partial answer or summary you produced (even if low confidence)
         • After invoking, reply to the user:
             - "Thanks! An administrator has been notified and will follow up at [email]. Would you like to ask any other questions?"

      3. Your scope includes: 'MHFA training', 'certification', 'MHFA Connect platform', 'instructor policies',
        'learner courses', 'administrative procedures', 'National Council programs', 'mental wellness',
        'crisis support', 'Learning Ecosystem navigation', 'data insights', 'chatBOT', 'chatbot'.
        For out-of-scope questions, say: "I'm Learning Navigator for the MHFA Learning Ecosystem. I help with training resources, courses, instructor/learner support, and administrative guidance. I'm sorry, I don't have a reliable answer for your question. Could you please share your email so I can escalate this to an administrator for further help?"
        Then wait for the user to supply an email address and follow the escalation procedure in step 2.

      Always maintain a helpful, professional, and supportive tone that empowers users in their learning journey.
```

## Commands Used

```bash
# 1. Retrieve agent instruction from CDK stack
grep -A 50 "prompt_for_agent" /Users/etloaner/hemanth/ncwm_chatbot_2/cdk_backend/lib/cdk_backend-stack.ts

# 2. Update agent with instruction
aws bedrock-agent update-agent \
  --agent-id Q1HPKAJXXL \
  --agent-name "Learning-Navigator" \
  --foundation-model "us.anthropic.claude-sonnet-4-5-20250929-v1:0" \
  --instruction file:///tmp/agent-instruction.txt \
  --agent-resource-role-arn "arn:aws:iam::315895719626:role/BlueberryStackLatest-BedrockRole38184958E-OuOZAsjzLv2t"

# 3. Prepare agent
aws bedrock-agent prepare-agent --agent-id Q1HPKAJXXL

# 4. Verify status
aws bedrock-agent get-agent --agent-id Q1HPKAJXXL
```

## Additional Issue Found

After fixing the agent instruction, a second error appeared:
```
An error occurred (accessDeniedException) when calling the InvokeAgent operation:
Access denied when calling Bedrock. Check your request permissions and retry the request.
```

**Root Cause:** The cfEvaluator Lambda function (`BlueberryStackLatest-cfEvaluatorFC18B8AA-IHPtXe2az5N8`) did not have permission to invoke the Bedrock agent. This is the function that actually calls `bedrock_agent.invoke_agent()`.

**Solution:** Added inline IAM policy to BOTH Lambda roles (websocketHandler and cfEvaluator):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": [
        "arn:aws:bedrock:us-west-2:315895719626:agent/Q1HPKAJXXL",
        "arn:aws:bedrock:us-west-2:315895719626:agent-alias/*/*"
      ]
    }
  ]
}
```

**Commands Used:**
```bash
# Add permission to cfEvaluator (the function that invokes Bedrock)
aws iam put-role-policy \
  --role-name BlueberryStackLatest-cfEvaluatorServiceRoleDB58196F-VRU4ZBHxFjoj \
  --policy-name BedrockAgentInvokePolicy \
  --policy-document file:///tmp/bedrock-agent-policy.json

# Also added to websocketHandler (redundant but safe)
aws iam put-role-policy \
  --role-name BlueberryStackLatest-websockethandlerServiceRole61D-1Ep3XEM8mLXu \
  --policy-name BedrockAgentInvokePolicy \
  --policy-document file:///tmp/bedrock-agent-policy.json
```

## Additional Issue #3: Bedrock Agent Role Missing Model Invocation Permissions

After fixing Lambda permissions, the error persisted. Investigation revealed the Bedrock agent's execution role didn't have permission to invoke the foundation model.

**Root Cause:** The Bedrock agent role (`BlueberryStackLatest-BedrockRole38184958E-OuOZAsjzLv2t`) had knowledge base and guardrail permissions but was missing `bedrock:InvokeModel` permissions.

**Solution:** Added model invocation permissions to the Bedrock agent role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-west-2::foundation-model/*",
        "arn:aws:bedrock:*::foundation-model/*"
      ]
    }
  ]
}
```

**Command Used:**
```bash
aws iam put-role-policy \
  --role-name BlueberryStackLatest-BedrockRole38184958E-OuOZAsjzLv2t \
  --policy-name BedrockModelInvokePolicy \
  --policy-document file:///tmp/bedrock-model-invoke-policy.json
```

## Current Status

✅ **FIXED - Chatbot is fully operational**

- Agent Status: **PREPARED**
- Foundation Model: `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (Claude Sonnet 4.5 via inference profile)
- Instruction: Restored and validated
- Test Alias: PREPARED and pointing to DRAFT
- **Lambda Permissions:** Added `bedrock:InvokeAgent` and runtime permissions ✅
- **Bedrock Agent Role Permissions:** Added `bedrock:InvokeModel` permissions ✅
- Ready for production use

## Prevention

To avoid this issue in the future:

1. **Never manually update agents** without also updating the instruction field
2. **Always use CDK for infrastructure changes** when possible
3. **Verify agent configuration** after any updates:
   ```bash
   aws bedrock-agent get-agent --agent-id Q1HPKAJXXL | grep -E '"agentStatus"|"instruction"'
   ```

## Related Files

- [CDK Backend Stack](cdk_backend/lib/cdk_backend-stack.ts) - Agent configuration source of truth
- [Feedback Feature Summary](FEEDBACK_FEATURE_SUMMARY.md) - Recent feature implementation
- [Feedback Feature Documentation](FEEDBACK_FEATURE_DOCUMENTATION.md) - Technical details

---

**Fixed:** January 6, 2026, 02:19 UTC
**Agent ID:** Q1HPKAJXXL
**Region:** us-west-2
