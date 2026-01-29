# Simple Cost Estimation - MHFA Learning Navigator

**Last Updated:** January 2025

---

## 💰 Quick Cost Summary

| Monthly Conversations | Estimated Cost | Cost per Conversation |
|----------------------|----------------|----------------------|
| 1,000 | **$25-40** | $0.025-0.040 |
| 10,000 | **$138-208** | $0.014-0.021 |
| 50,000 | **$650-950** | $0.013-0.019 |
| 100,000+ | **$1,200-1,700** | $0.012-0.017 |

---

## 📊 What You're Paying For

### Main Costs (10,000 conversations/month example)

| Service | What It Does | Monthly Cost | % of Total |
|---------|--------------|--------------|-----------|
| **Amazon Bedrock (AI)** | Claude 4 Sonnet chatbot responses | $62 | 49% |
| **AWS Lambda** | Run chatbot code | $26 | 21% |
| **CloudWatch Logs** | Store conversation logs | $26 | 21% |
| **API Gateway** | WebSocket connections | $8 | 6% |
| **AWS Amplify** | Host website | $2 | 2% |
| **Other** | Storage, database, email | $2 | 2% |
| **Total** | | **~$126** | **100%** |

---

## 🎯 Simple Pricing Tiers

### Starter (1,000 conversations/month)
**$25-40/month**
- Good for: Pilot programs, small teams
- Includes: Full chatbot, admin dashboard, knowledge base

### Business (10,000 conversations/month)
**$138-208/month**
- Good for: Growing organizations
- Includes: Everything + analytics, email escalations

### Professional (50,000 conversations/month)
**$650-950/month**
- Good for: Large organizations
- Includes: Everything + priority support

### Enterprise (100,000+ conversations/month)
**$1,200-1,700/month**
- Good for: Enterprise deployments
- Includes: Everything + custom optimization

---

## 🔍 Cost Factors

### Higher costs if you have:
- ✅ Long conversations (5+ messages)
- ✅ Peak traffic (3x normal during business hours)
- ✅ Large knowledge base (500+ documents)
- ✅ Frequent document updates
- ✅ High logging retention (90+ days)

### Lower costs if you have:
- ✅ Short conversations (2-3 messages)
- ✅ Steady traffic (no major spikes)
- ✅ Smaller knowledge base (100 documents)
- ✅ Optimized prompts
- ✅ Reduced log retention (7-14 days)

---

## 💡 Cost Savings Tips

### 1. Optimize Prompts (Save 20-30%)
- Shorter system prompts
- Concise role contexts
- **Savings: $26-40/month** (10K conversations)

### 2. Cache Common Questions (Save 10-15%)
- Store frequent Q&A in database
- Serve from cache instead of AI
- **Savings: $13-20/month** (10K conversations)

### 3. Reduce Log Retention (Save 30-50%)
- Change from 30 days to 7 days
- Archive old logs to S3
- **Savings: $8-13/month** (10K conversations)

### Total Potential Savings: $47-73/month (36-56%)

---

## 📅 Annual Costs

| Tier | Monthly | Annual | Annual (with growth) |
|------|---------|--------|---------------------|
| Starter | $25-40 | $300-480 | $330-528 |
| Business | $138-208 | $1,656-2,496 | $1,822-2,746 |
| Professional | $648-948 | $7,776-11,376 | $8,554-12,514 |
| Enterprise | $1,198-1,698 | $14,376-20,376 | $15,814-22,414 |

---

## 🆚 Cost Comparison

### vs. Building In-House
- **In-house:** $5,000-15,000/month (developer salaries + infrastructure)
- **This solution:** $126-206/month
- **Savings:** 96-98%

### vs. ChatGPT API Only (No AWS)
- **ChatGPT API:** ~$80/month (10K conversations)
- **This solution:** $126/month
- **Extra features:** Knowledge base, admin dashboard, email escalation, analytics
- **Worth it:** Yes, for enterprise features

### vs. Self-Hosted LLM
- **Self-hosted:** $780/month (GPU server + maintenance)
- **This solution:** $126/month
- **Break-even:** At 50,000+ conversations

---

## ❓ FAQ

### Q: What's included in the cost?
**A:** Everything - AI chatbot, knowledge base, admin dashboard, analytics, email notifications, hosting.

### Q: Are there any hidden fees?
**A:** No. Only pay for AWS services used. No licensing, no per-user fees.

### Q: What if I go over my estimate?
**A:** AWS charges only for what you use. Set up billing alerts at your budget limit.

### Q: Can I reduce costs?
**A:** Yes! See the 3 optimization tips above. Can save 36-56%.

### Q: What's the minimum cost?
**A:** ~$10-15/month for minimal usage (<100 conversations).

### Q: Do costs scale linearly?
**A:** Yes, mostly. Cost per conversation decreases slightly at higher volumes.

---

## 📊 Example: Real-World Costs

### Small Organization (2,000 conversations/month)
```
Base AWS costs:        $40
Peak traffic buffer:   $8
Total:                 $48/month
Per conversation:      $0.024
```

### Medium Organization (15,000 conversations/month)
```
Base AWS costs:        $192
Peak traffic buffer:   $30
Total:                 $222/month
Per conversation:      $0.015
```

### Large Organization (75,000 conversations/month)
```
Base AWS costs:        $950
Peak traffic buffer:   $100
Total:                 $1,050/month
Per conversation:      $0.014
```

---

## 🎯 Which Tier Should You Choose?

### Choose **Starter** if:
- Just testing the chatbot
- Small team (<50 people)
- Low usage expected

### Choose **Business** if:
- Active deployment
- Medium organization (50-500 people)
- Regular daily usage

### Choose **Professional** if:
- Large organization (500+ people)
- High traffic expected
- Mission-critical application

### Choose **Enterprise** if:
- Very large organization (1000+ people)
- Multiple departments/locations
- Need custom optimization

---

## 📞 Need Help Estimating?

**Use this formula:**
```
Estimated conversations/month =
  (Number of users) × (Usage rate) × (Conversations per user per month)

Example:
  200 users × 50% usage rate × 5 conversations/month = 500 conversations
  Estimated cost: $25-35/month
```

---

## ⚠️ Important Notes

1. **Free Tier:** AWS Free Tier covers ~$10-15 of costs for the first 12 months
2. **Development:** Testing/development adds ~20-30% to production costs
3. **Seasonality:** Costs may vary based on usage patterns
4. **One-Time:** $10-15 one-time setup cost for initial knowledge base embedding

---

## 📈 Cost Growth Projections

| Year | Conversations/Month | Monthly Cost | Annual Cost |
|------|-------------------|--------------|-------------|
| Year 1 | 10,000 | $138-208 | $1,656-2,496 |
| Year 2 (10% growth) | 11,000 | $152-229 | $1,822-2,746 |
| Year 3 (20% growth) | 13,200 | $183-275 | $2,194-3,295 |

---

## 🔗 More Details

For detailed service-by-service breakdown: [COST_ESTIMATION.md](COST_ESTIMATION.md)

---

**Bottom Line:**
- **Most common usage (10K conversations):** $138-208/month ($168 typical)
- **Optimized costs:** Can reduce to $113-133/month with optimizations
- **Very predictable:** AWS charges only for what you use
- **No surprises:** Set up billing alerts
- **Great value:** Enterprise features at fraction of in-house cost
