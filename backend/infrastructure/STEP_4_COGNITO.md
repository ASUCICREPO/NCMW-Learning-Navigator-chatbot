# Step 4: Cognito User Pool - Detailed Explanation

## 🎯 What We Built

AWS Cognito User Pool for authentication and user management with:
- **User Pool**: Stores user accounts with email authentication
- **User Groups**: Role-based access (instructors, staff, admins)
- **User Pool Client**: OAuth configuration for React frontend
- **Hosted UI Domain**: Quick testing login page

---

## 🔐 Authentication Architecture

### Overview

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. User clicks "Login"                        │    │
│  │  2. Redirect to Cognito Hosted UI              │    │
│  │  3. User enters email/password                 │    │
│  │  4. Cognito validates credentials              │    │
│  │  5. Redirect back with authorization code      │    │
│  │  6. Exchange code for JWT tokens               │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ JWT tokens (access, ID, refresh)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  Cognito Authorizer validates JWT token        │    │
│  │  Checks signature, expiration, audience        │    │
│  │  Extracts user info (email, groups, etc.)      │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ Authorized request
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   LAMBDA FUNCTION                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Access user info from event.requestContext    │    │
│  │  Check user group for authorization            │    │
│  │  Process request                               │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### JWT Token Structure

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cognito:groups": ["instructors"],
  "email_verified": true,
  "iss": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_xxxxxx",
  "cognito:username": "john.doe@example.com",
  "given_name": "John",
  "aud": "abcdefghijklmnopqrstuvwxyz",
  "event_id": "xxx-yyy-zzz",
  "token_use": "id",
  "auth_time": 1703001234,
  "exp": 1703004834,
  "iat": 1703001234,
  "family_name": "Doe",
  "email": "john.doe@example.com",
  "custom:role": "instructor",
  "custom:organization": "The National Council"
}
```

---

## 🔄 Trade-offs Analysis

### 1. Cognito vs Auth0/Okta vs Custom Auth

**Our Choice: AWS Cognito**

| Factor | Cognito | Auth0 | Okta | Custom |
|--------|---------|-------|------|--------|
| **Cost (1000 MAU)** | $5.50 | $240/month | $240/month | Dev time |
| **Setup Time** | 1 day | 2-3 days | 2-3 days | 2-4 weeks |
| **AWS Integration** | ✅ Native | ⚠️ Via API | ⚠️ Via API | Custom |
| **Features** | ⚠️ Basic | ✅ Advanced | ✅ Enterprise | Custom |
| **Maintenance** | ✅ Managed | ✅ Managed | ✅ Managed | ❌ You maintain |
| **Compliance** | ✅ HIPAA | ✅ HIPAA/SOC2 | ✅ HIPAA/SOC2 | ❌ DIY |
| **Social Login** | Limited | ✅ Extensive | ✅ Extensive | ❌ Hard |
| **MFA** | SMS/TOTP | SMS/Push/TOTP | SMS/Push/TOTP | ❌ DIY |

**Why Cognito?**
- Perfect for AWS-native apps
- Extremely cost-effective (50K free MAU, then $0.0055/MAU)
- Zero maintenance overhead
- Seamless API Gateway integration
- Good enough for MVP

**When to use Auth0/Okta?**
- Need advanced features (passwordless, biometrics)
- Want better user management UI
- Have budget ($2,000+/year)
- Multi-cloud or need best-in-class auth

**When to build custom?**
- Very unique requirements
- Regulatory requirements prevent third-party
- Have dedicated security team
- **Not recommended** - security is hard!

**Code Comparison:**
```python
# Cognito (Our choice)
user_pool = cognito.UserPool(self, "Pool")
# That's it! Managed service handles everything

# Auth0 (Alternative - requires SDK integration)
# auth0_domain = "your-tenant.auth0.com"
# auth0_client_id = "..."  # From Auth0 dashboard
# Need to integrate Auth0 SDK in frontend and backend

# Custom (Alternative - not recommended)
# class UserManager:
#     def register_user(...)  # Handle password hashing
#     def login(...)          # Generate JWT tokens
#     def validate_token(...) # Verify signatures
#     def reset_password(...) # Send emails
#     def handle_mfa(...)     # Implement TOTP
# Plus: Database, email service, security audits, etc.
```

---

### 2. Email vs Username vs Phone Sign-in

**Our Choice: Email Sign-in**

| Factor | Email | Username | Phone |
|--------|-------|----------|-------|
| **User-Friendly** | ✅ Easy to remember | ⚠️ Forget often | ⚠️ International issues |
| **Professional** | ✅ B2B standard | ⚠️ Casual | ⚠️ Personal |
| **Privacy** | ⚠️ Email exposed | ✅ Anonymous | ⚠️ Phone exposed |
| **Recovery** | ✅ Email reset | ⚠️ Need email anyway | ⚠️ SMS costs |
| **Cost** | Free | Free | $0.00645/SMS |

**Why Email?**
- Instructors and staff already use email professionally
- Easy password resets
- No SMS costs
- B2B standard practice

**Code:**
```python
# Email sign-in (Our choice)
sign_in_aliases=cognito.SignInAliases(
    email=True,
    username=False,
    phone=False
)

# Username (Alternative)
sign_in_aliases=cognito.SignInAliases(
    email=False,
    username=True,
    phone=False
)
# User would sign in with: "john_doe" instead of "john.doe@example.com"

# Phone (Alternative)
sign_in_aliases=cognito.SignInAliases(
    email=False,
    username=False,
    phone=True
)
# User would sign in with: "+1-555-123-4567"
# Cost: $0.00645 per SMS for MFA and password resets
```

---

### 3. Self Sign-up vs Admin-Only

**Our Choice: Admin-Only (Disabled Self Sign-up)**

| Factor | Self Sign-up | Admin-Only |
|--------|-------------|-----------|
| **Access Control** | ⚠️ Anyone | ✅ Controlled |
| **Spam/Abuse** | ⚠️ High risk | ✅ No risk |
| **User Onboarding** | ✅ Instant | ⚠️ Manual |
| **Verification** | Required | Optional |
| **Use Case** | Public apps | Internal/B2B |

**Why Admin-Only?**
- This is an internal tool for instructors and staff
- Limited audience (not a public app)
- Prevents spam accounts
- Admin invites users via email with temporary password

**When to Enable Self Sign-up?**
- Phase 2 when we add learner access (public)
- Would need email verification
- Consider reCAPTCHA to prevent abuse

**Code:**
```python
# Admin-only (Our choice)
self_sign_up_enabled=False

# Self sign-up (Alternative for public apps)
self_sign_up_enabled=True,
auto_verify=cognito.AutoVerifiedAttrs(email=True)
# Users can register themselves, must verify email
```

---

### 4. Password Policy: Strict vs Lenient

**Our Choice: Strict (HIPAA-Compatible)**

| Factor | Strict (12+ chars) | Medium (8+ chars) | Lenient (6+ chars) |
|--------|-------------------|-------------------|-------------------|
| **Security** | ✅ Very Strong | ⚠️ Good | ❌ Weak |
| **User Friction** | ⚠️ High | ⚠️ Medium | ✅ Low |
| **Password Resets** | ⚠️ More frequent | ⚠️ Some | ✅ Rare |
| **Compliance** | ✅ HIPAA/SOC2 | ⚠️ Basic | ❌ Not recommended |
| **Brute Force** | ✅ Resistant | ⚠️ Vulnerable | ❌ Easy to crack |

**Our Policy:**
- Minimum 12 characters
- Requires: Uppercase, lowercase, digit, symbol
- Temporary password valid for 7 days

**Why Strict?**
- HIPAA compliance (mental health data)
- Protects against brute force
- Industry best practice
- Better safe than sorry

**Cost of Resets:**
- Users forget complex passwords more often
- But: MFA reduces risk of compromise
- Trade-off: Slight UX friction for much better security

**Code:**
```python
# Strict policy (Our choice)
password_policy=cognito.PasswordPolicy(
    min_length=12,
    require_lowercase=True,
    require_uppercase=True,
    require_digits=True,
    require_symbols=True,
    temp_password_validity=Duration.days(7)
)

# Medium policy (Alternative)
password_policy=cognito.PasswordPolicy(
    min_length=8,
    require_lowercase=True,
    require_uppercase=True,
    require_digits=True,
    require_symbols=False  # Easier to remember
)

# Lenient policy (Not recommended)
password_policy=cognito.PasswordPolicy(
    min_length=6,
    require_lowercase=False,
    require_uppercase=False,
    require_digits=True,
    require_symbols=False
)
# Insecure! Easy to brute force
```

---

### 5. MFA: Required vs Optional vs Off

**Our Choice: Optional MFA**

| Factor | Required | Optional | Off |
|--------|----------|----------|-----|
| **Security** | ✅ Highest | ⚠️ Good | ❌ Vulnerable |
| **User Adoption** | ⚠️ Friction | ✅ Choice | ✅ Easy |
| **Admin Burden** | ⚠️ Support tickets | ⚠️ Some | ✅ None |
| **Cost (SMS)** | $6.45/1000 SMS | Variable | $0 |
| **Compliance** | ✅ Best | ⚠️ Good | ❌ Risky |

**Why Optional?**
- Let users decide based on their comfort level
- Admins should enable it (we'll encourage)
- Instructors may not need it for non-sensitive queries
- Balance security with usability

**MFA Methods Available:**
- **SMS**: Text message codes ($0.00645/SMS)
- **TOTP**: Authenticator apps (Google Authenticator, Authy) - Free!

**When to Make MFA Required?**
- If handling very sensitive data (PHI, financial)
- For admin accounts (always require)
- If compliance mandates it

**Code:**
```python
# Optional MFA (Our choice)
mfa=cognito.Mfa.OPTIONAL,
mfa_second_factor=cognito.MfaSecondFactor(
    sms=True,   # SMS codes
    otp=True    # TOTP apps (free!)
)

# Required MFA (Alternative - highest security)
mfa=cognito.Mfa.REQUIRED,
mfa_second_factor=cognito.MfaSecondFactor(
    sms=False,  # Disable SMS to save money
    otp=True    # Force TOTP (free!)
)

# No MFA (Alternative - not recommended)
mfa=cognito.Mfa.OFF
# Vulnerable to password leaks!
```

---

### 6. User Groups vs Custom Attributes

**Our Choice: Both (Groups for Auth, Attributes for Data)**

| Factor | Groups | Custom Attributes | Both |
|--------|--------|-------------------|------|
| **Authorization** | ✅ In JWT | ❌ Not in JWT | ✅ Groups |
| **Flexible Data** | ❌ Fixed roles | ✅ Any data | ✅ Attributes |
| **Lambda Access** | ✅ Easy | ⚠️ Need to fetch | ✅ Best |
| **API Gateway** | ✅ Works | ❌ Doesn't work | ✅ Groups |
| **IAM Mapping** | ✅ Can map | ❌ Can't map | ✅ Groups |

**Why Groups?**
- JWT includes group membership
- Lambda can check: `if "admins" in user_groups`
- API Gateway can authorize by group
- Can assign IAM roles to groups

**Why Custom Attributes Too?**
- Store extra data (organization, preferences)
- Can be updated without changing groups
- Good for personalization

**Use Cases:**
```python
# Groups (for authorization)
if "admins" in event['requestContext']['authorizer']['claims']['cognito:groups']:
    # User is admin, allow access to analytics
    return get_all_conversations()

# Custom attributes (for personalization)
organization = event['requestContext']['authorizer']['claims']['custom:organization']
# Customize response based on organization
```

**Code:**
```python
# Groups (Our choice - for auth)
cognito.CfnUserPoolGroup(
    self, "InstructorsGroup",
    user_pool_id=user_pool.user_pool_id,
    group_name="instructors",
    precedence=1
)

# Custom attributes (Our choice - for data)
custom_attributes={
    "role": cognito.StringAttribute(max_len=50, mutable=True),
    "organization": cognito.StringAttribute(max_len=100, mutable=True)
}

# Only custom attributes (Alternative - less powerful)
# Can't use in API Gateway authorizer
# Have to query DynamoDB for permissions
```

---

### 7. Token Validity: Short vs Long

**Our Choice: Standard (1 hour access, 30 days refresh)**

| Token Type | Short | Standard | Long |
|------------|-------|----------|------|
| **Access** | 5-15 min | 1 hour | 24 hours |
| **ID** | 5-15 min | 1 hour | 24 hours |
| **Refresh** | 1 day | 30 days | 60 days |
| **Security** | ✅ Best | ⚠️ Good | ❌ Risky |
| **UX** | ⚠️ Frequent re-auth | ✅ Balanced | ✅ Seamless |
| **API Calls** | ⚠️ More refreshes | ⚠️ Some refreshes | ✅ Fewer refreshes |

**Why 1 Hour Access?**
- Industry standard (OAuth 2.0 recommendation)
- If token is stolen, attacker has 1 hour of access
- Refresh token handles seamless renewal
- Good balance

**Why 30 Days Refresh?**
- Users stay logged in for a month
- After 30 days, must log in again
- If refresh token stolen, longer risk window
- But: Better UX

**Code:**
```python
# Standard (Our choice)
access_token_validity=Duration.hours(1),
id_token_validity=Duration.hours(1),
refresh_token_validity=Duration.days(30)

# Short (High security, lower UX)
access_token_validity=Duration.minutes(15),
id_token_validity=Duration.minutes(15),
refresh_token_validity=Duration.days(1)
# Users re-auth daily

# Long (Better UX, lower security)
access_token_validity=Duration.hours(24),
id_token_validity=Duration.hours(24),
refresh_token_validity=Duration.days(60)
# Stolen tokens valid for 24 hours!
```

---

### 8. Cognito Hosted UI vs Custom Login Page

**Our Choice: Hosted UI for MVP, Custom Later**

| Factor | Hosted UI | Custom Page |
|--------|-----------|-------------|
| **Development Time** | ✅ 5 minutes | ⚠️ 2-5 days |
| **Branding** | ⚠️ Limited CSS | ✅ Full control |
| **Features** | ⚠️ Basic | ✅ Advanced |
| **Maintenance** | ✅ AWS handles | ❌ You maintain |
| **Security** | ✅ AWS tested | ⚠️ Your responsibility |
| **Social Login** | ✅ Built-in | ⚠️ Need to integrate |

**Why Hosted UI for MVP?**
- Get authentication working in 5 minutes
- Focus on core features first
- Can customize with CSS
- Secure by default

**When to Build Custom?**
- After MVP validation
- When branding matters
- Need custom flows (passwordless, biometrics)
- Want seamless UX

**Hosted UI URL:**
```
https://learning-navigator-ncmw.auth.us-west-2.amazoncognito.com/login
  ?client_id=<client-id>
  &response_type=code
  &scope=email+openid+profile
  &redirect_uri=https://app.learningnavigator.com/callback
```

**Code:**
```python
# Hosted UI (Our choice - quick MVP)
user_pool_domain = user_pool.add_domain(
    "Domain",
    cognito_domain=cognito.CognitoDomainOptions(
        domain_prefix="learning-navigator-ncmw"
    )
)
# Frontend redirects to Cognito URL

# Custom login page (Alternative - future)
# Build React login form
# Use AWS Amplify or AWS SDK to call Cognito API
# More work, but full branding control
```

---

### 9. Cognito Email vs Amazon SES

**Our Choice: Cognito Email (50/day limit) for MVP**

| Factor | Cognito Email | Amazon SES |
|--------|--------------|------------|
| **Cost** | Free | $0.10 per 1,000 emails |
| **Daily Limit** | 50 emails/day | Unlimited |
| **Customization** | ⚠️ Limited | ✅ Full control |
| **Setup** | ✅ Zero config | ⚠️ Verify domain |
| **Deliverability** | ⚠️ Good | ✅ Better |
| **Templates** | Basic | ✅ Advanced |

**Why Cognito Email for MVP?**
- Zero configuration
- Free
- 50 emails/day enough for MVP
- Can upgrade to SES later

**When to Upgrade to SES?**
- More than 50 users/day signing up
- Need custom email templates
- Want better deliverability
- Need to track email metrics

**Cost Calculation:**
```
Scenario: 200 new users/month

Cognito Email:
- 50 emails/day = 1,500 emails/month (enough!)
- Cost: $0

Amazon SES:
- 200 invites + 20 password resets = 220 emails/month
- Cost: $0.10 per 1,000 = $0.022/month
- Still extremely cheap!

Decision: Start with Cognito, upgrade when we hit 50/day
```

**Code:**
```python
# Cognito email (Our choice - MVP)
email=cognito.UserPoolEmail.with_cognito()

# SES (Alternative - production scale)
email=cognito.UserPoolEmail.with_ses(
    from_email="noreply@learningnavigator.com",
    from_name="Learning Navigator",
    reply_to_email="support@learningnavigator.com"
)
# Requires: Verify domain in SES first
```

---

### 10. Advanced Security: Audit vs Enforced

**Our Choice: Audit Mode (Free)**

| Factor | Off | Audit | Enforced |
|--------|-----|-------|----------|
| **Cost** | Free | Free | $0.05/MAU |
| **Visibility** | ❌ None | ✅ Track risks | ✅ Track risks |
| **Protection** | ❌ None | ❌ Only log | ✅ Block attacks |
| **False Positives** | N/A | ⚠️ No impact | ⚠️ Blocks real users |

**What is Advanced Security?**
- Detects suspicious activity (impossible travel, leaked passwords, etc.)
- Uses ML to identify risky logins
- Can log or block suspicious attempts

**Why Audit Mode?**
- See suspicious activity for free
- Learn patterns before blocking
- No risk of false positives blocking real users
- Can upgrade to Enforced later

**What It Detects:**
- Leaked credentials (password found in breach database)
- Impossible travel (login from US, then China 5 minutes later)
- Unusual device/IP patterns
- Brute force attempts

**Cost Analysis:**
```
Audit Mode (Our choice):
- Free
- Logs all suspicious activity
- Can review in CloudWatch

Enforced Mode:
- $0.05 per MAU
- 1,000 MAU = $50/month
- Automatically blocks suspicious logins
- Good for production at scale
```

**Code:**
```python
# Audit mode (Our choice)
advanced_security_mode=cognito.AdvancedSecurityMode.AUDIT

# Enforced mode (Alternative - costs money)
advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED
# Blocks suspicious logins automatically
# Cost: $0.05 per MAU

# Off (Alternative - not recommended)
advanced_security_mode=cognito.AdvancedSecurityMode.OFF
# No visibility into attacks
```

---

## 🎤 Interview Talking Points

### Question: "Why Cognito instead of Auth0 or building custom auth?"

**Your Answer:**
> "We chose AWS Cognito for three main reasons:
>
> 1. **Cost**: At our expected scale (500 MAU), Cognito costs $2.75/month vs Auth0 at $240/month. That's 87x cheaper. Even with 10K users, we'd only pay $55/month.
>
> 2. **AWS Integration**: Cognito integrates seamlessly with API Gateway and Lambda. API Gateway can validate JWT tokens automatically without Lambda code. It's native to our stack.
>
> 3. **Sufficient Features**: While Auth0 has more advanced features, Cognito provides everything we need for MVP: email/password auth, MFA, groups, OAuth 2.0, and hosted UI.
>
> **Trade-off**: Auth0 has better UX and more features, but those aren't critical for our internal tool. We can always migrate later if needed, but the $2,000+/year savings matters for an MVP."

---

### Question: "Explain your user groups vs custom attributes strategy"

**Your Answer:**
> "We use both, but for different purposes:
>
> **Groups** (for authorization):
> - Groups are included in the JWT token automatically
> - API Gateway can authorize requests by group
> - Lambda can check: `if 'admins' in user_groups`
> - Three groups: instructors, staff, admins with precedence (priority)
>
> **Custom Attributes** (for data/personalization):
> - Store extra info like organization, preferences
> - Custom attributes are also in JWT, but not used for authorization
> - More flexible for personalization
>
> **Why not just attributes?** Groups are better for authorization because:
> 1. API Gateway supports group-based authorization out of the box
> 2. Can map IAM roles to groups for fine-grained AWS permissions
> 3. Changing permissions doesn't require attribute updates
>
> **Alternative**: Could use only custom attributes and check DynamoDB for permissions, but that's slower and more complex."

---

### Question: "How do users reset passwords?"

**Your Answer:**
> "We have a three-layer password recovery system:
>
> **Layer 1: Email Recovery** (Primary method)
> - User clicks 'Forgot Password' in login UI
> - Cognito sends verification code to email
> - User enters code + new password
> - Cost: Free (using Cognito email)
>
> **Layer 2: Admin Reset** (If email fails)
> - User contacts support
> - Admin can reset password via AWS Console or Lambda
> - Admin sends new temporary password
> - User must change on first login
>
> **Layer 3: Account Recovery** (Nuclear option)
> - If email is compromised, admin can update email
> - Send new invitation
>
> **Security Features:**
> - Temporary passwords expire in 7 days
> - Verification codes expire in 1 hour
> - Rate limiting on reset attempts (prevents brute force)
> - MFA required if enabled (even for password reset)
>
> **Trade-off**: Email recovery is standard but relies on email security. That's why MFA is important."

---

### Question: "What happens if your JWT token is stolen?"

**Your Answer:**
> "This is a critical security concern. Here's our multi-layer mitigation:
>
> **Immediate Mitigations:**
> 1. **Short Token Lifespan**: Access tokens expire in 1 hour. Attacker has limited time.
> 2. **HTTPS Only**: Tokens never transmitted over unencrypted connections.
> 3. **HttpOnly Cookies** (when we implement custom frontend): Tokens not accessible to JavaScript (prevents XSS attacks).
>
> **Detection & Response:**
> 1. **Advanced Security Audit Mode**: Detects suspicious activity like impossible travel (login from US, then Asia minutes later).
> 2. **CloudWatch Monitoring**: Alert on unusual patterns.
> 3. **Admin Can Revoke**: Admin can globally sign out user, invalidating all tokens.
>
> **Recovery Process:**
> 1. User notices suspicious activity, reports it
> 2. Admin revokes user's tokens via Cognito API
> 3. User resets password
> 4. User re-authenticates with new credentials
> 5. All old tokens immediately invalid
>
> **Limitations:**
> - Can't revoke individual tokens (only all tokens for a user)
> - 1-hour window of exposure for access token
> - 30-day window for refresh token (if stolen)
>
> **Trade-off**: Shorter token expiration = better security but more frequent refreshes. We chose 1 hour as industry standard balance."

---

### Question: "How does frontend authentication flow work?"

**Your Answer:**
> "We use OAuth 2.0 Authorization Code Grant with PKCE (Proof Key for Code Exchange). Here's the complete flow:
>
> **Login Flow:**
> 1. User clicks 'Login' in React app
> 2. Frontend redirects to Cognito Hosted UI:
>    ```
>    https://learning-navigator-ncmw.auth.us-west-2.amazoncognito.com/login
>    ```
> 3. User enters email/password (optionally MFA)
> 4. Cognito validates credentials
> 5. Redirects back to app with authorization code:
>    ```
>    https://app.learningnavigator.com/callback?code=abc123
>    ```
> 6. Frontend exchanges code for tokens (backend call)
> 7. Receives three tokens:
>    - **Access Token**: Used for API calls (1 hour)
>    - **ID Token**: User info (1 hour)
>    - **Refresh Token**: Get new tokens (30 days)
> 8. Store tokens in memory (or HttpOnly cookies)
>
> **API Call Flow:**
> 1. Frontend makes API request with Access Token in Authorization header:
>    ```
>    Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
>    ```
> 2. API Gateway validates token (checks signature, expiration)
> 3. Extracts user info from token
> 4. Passes request to Lambda with user context
> 5. Lambda processes request with user identity
>
> **Token Refresh Flow:**
> 1. Access Token expires (after 1 hour)
> 2. Frontend automatically uses Refresh Token to get new Access Token
> 3. User stays logged in (seamless)
> 4. After 30 days, Refresh Token expires → user must log in again
>
> **Why PKCE?**
> - More secure for Single Page Apps (SPAs)
> - Prevents authorization code interception
> - Industry best practice for React/mobile apps"

---

## 💰 Cost Estimate

### Monthly Costs (Typical Usage)

| Users | Cost Formula | Monthly Cost |
|-------|-------------|--------------|
| **50 users** | 50K free tier | $0 |
| **500 users** | (500 - 50,000) × $0.0055 = 0 | $0 |
| **60,000 users** | (60,000 - 50,000) × $0.0055 | $55 |
| **100,000 users** | (100,000 - 50,000) × $0.0055 | $275 |

### Additional Costs

| Feature | Cost |
|---------|------|
| **MFA SMS** | $0.00645 per SMS |
| **Advanced Security (Enforced)** | $0.05 per MAU |
| **Custom SES Email** | $0.10 per 1,000 emails |

### Example Scenario

```
Assumptions:
- 1,000 monthly active users (instructors + staff)
- 200 use MFA via SMS (20%)
- 100 new user invitations/month
- 50 password resets/month

Costs:
- User Pool: (1,000 - 50,000) × $0.0055 = $0 (under free tier)
- MFA SMS: 200 users × 4 logins/month × $0.00645 = $5.16
- Email invites: 150 emails × $0 (Cognito email) = $0
- Total: ~$5/month

With Enforced Security:
- Add: 1,000 MAU × $0.05 = $50/month
- Total: ~$55/month
```

**Comparison:**
- Cognito: $0-55/month
- Auth0: $240-1,200/month
- Okta: $240-2,000/month

**Cognito wins for cost!**

---

## 🚀 Next Steps

After deploying Cognito User Pool, we'll:

1. **Step 5**: Add Lambda functions (starting with health check, then chat API)
2. **Step 6**: Add API Gateway with Cognito authorizer
3. **Step 7**: Build React frontend with Cognito authentication
4. **Step 8**: Test end-to-end authentication flow

---

## 🔧 How to Deploy

```bash
# Activate virtual environment
source .venv/bin/activate

# Preview changes
cdk diff

# Deploy to AWS (creates Cognito User Pool)
cdk deploy

# Check outputs - you'll see:
# - User Pool ID
# - User Pool ARN
# - Client ID (for frontend)
# - Hosted UI URL
```

---

## 🧪 How to Test Authentication

### 1. Create a test user via AWS CLI

```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id us-west-2_xxxxxx \
  --username john.doe@example.com \
  --user-attributes \
    Name=email,Value=john.doe@example.com \
    Name=given_name,Value=John \
    Name=family_name,Value=Doe \
    Name=custom:role,Value=instructor \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Add user to group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-west-2_xxxxxx \
  --username john.doe@example.com \
  --group-name instructors
```

### 2. Test login via Hosted UI

1. Open browser to:
   ```
   https://learning-navigator-ncmw.auth.us-west-2.amazoncognito.com/login?
     client_id=<your-client-id>&
     response_type=code&
     scope=email+openid+profile&
     redirect_uri=http://localhost:3000/callback
   ```
2. Enter email + temporary password
3. You'll be prompted to change password
4. After changing, you'll be redirected with authorization code

### 3. Exchange code for tokens (using curl)

```bash
curl -X POST \
  https://learning-navigator-ncmw.auth.us-west-2.amazoncognito.com/oauth2/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code' \
  -d 'client_id=<your-client-id>' \
  -d 'code=<authorization-code-from-redirect>' \
  -d 'redirect_uri=http://localhost:3000/callback'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 4. Decode JWT token (jwt.io)

Copy the `id_token` and paste it at https://jwt.io to see:
```json
{
  "sub": "a1b2c3d4-...",
  "cognito:groups": ["instructors"],
  "email": "john.doe@example.com",
  "given_name": "John",
  "family_name": "Doe",
  "custom:role": "instructor"
}
```

---

## 🎯 Summary

✅ **Created**: Cognito User Pool with groups and client
✅ **Configured**: Email sign-in, strict password policy, optional MFA
✅ **Groups**: instructors, staff, admins with precedence
✅ **Client**: React SPA client with OAuth 2.0
✅ **Hosted UI**: Quick testing login page
✅ **Cost**: $0-5/month for MVP (under 50K MAU free tier)
✅ **Security**: HIPAA-compatible, audit mode, deletion protection
✅ **Interview Ready**: Full trade-offs and alternatives explained

**Ready for Step 5: Lambda Functions!** 🚀
