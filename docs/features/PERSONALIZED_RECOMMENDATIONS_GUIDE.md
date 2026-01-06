# Personalized Recommendations Feature - User Guide

## Overview

Your Learning Navigator chatbot now includes **personalized recommendations** tailored to each user's role in the MHFA ecosystem. This feature provides role-specific quick actions, suggested topics, and curated content to help users get the most relevant information quickly.

## Target User Roles

### 1. **MHFA Instructors**
Certified Mental Health First Aid instructors who deliver training courses.

### 2. **Internal Staff**
Administrative and support staff who manage training operations, coordinate instructors, and oversee programs.

### 3. **Learners**
Individuals taking MHFA courses to become certified in Mental Health First Aid.

---

## How It Works

### **Step 1: Access the Chatbot**
- **No login required** - Works for all users (guest access)
- Available at: https://main.d1disyogbqgwn4.amplifyapp.com
- Role preferences stored in browser localStorage

### **Step 2: Select Your Role**
1. Click the **Profile icon** (person icon) in the chat header
2. First-time users see the **Role Selection** page
3. Choose your role from three beautifully designed cards:
   - 🎓 **MHFA Instructor** - Teach and deliver training
   - 💼 **Internal Staff** - Support training operations
   - 👤 **Learner** - Take MHFA courses

4. Click **Continue** to save your role

### **Step 3: View Personalized Recommendations**
After selecting a role, you'll see:
- **Quick Actions**: Role-specific tasks with sample queries
- **Suggested Topics**: Relevant subjects to explore
- **Recent Updates**: Latest news and announcements

### **Step 4: Use Recommendations in Chat**
- Click any suggested query chip
- It automatically navigates to the chat with that query pre-filled
- Get instant, relevant answers tailored to your role

---

## Role-Specific Features

### 🎓 **For MHFA Instructors**

#### Quick Actions:
1. **Course Planning**
   - Sample queries:
     - "Show me the latest MHFA course curriculum"
     - "What are best practices for teaching mental health first aid?"
     - "How do I prepare for an upcoming MHFA course?"

2. **Student Management**
   - Sample queries:
     - "How do I track student attendance?"
     - "What are the assessment criteria for MHFA certification?"
     - "How can I support struggling learners?"

3. **Training Resources**
   - Sample queries:
     - "Show me instructor training resources"
     - "What materials do I need for blended courses?"
     - "Where can I find updated training videos?"

4. **Certification & Credits**
   - Sample queries:
     - "How do I maintain my instructor certification?"
     - "What are the requirements for recertification?"
     - "How do I earn CEUs for teaching MHFA?"

#### Suggested Topics:
- Blended Course Delivery
- Virtual Training Best Practices
- Student Assessment Methods
- Crisis Intervention Techniques
- Cultural Competency in Training

#### Recent Updates:
- New curriculum updates for Mental Health First Aid USA
- Updated assessment rubrics available
- Virtual training platform enhancements

---

### 💼 **For Internal Staff**

#### Quick Actions:
1. **Operations Dashboard**
   - Sample queries:
     - "Show me current course enrollment numbers"
     - "What are the training completion rates?"
     - "How many instructors are active this month?"

2. **Instructor Support**
   - Sample queries:
     - "How do I onboard new instructors?"
     - "What support resources are available for instructors?"
     - "How do I handle instructor certification renewals?"

3. **Course Management**
   - Sample queries:
     - "How do I schedule a new MHFA course?"
     - "What are the requirements for blended courses?"
     - "How do I update course information?"

4. **Reporting & Analytics**
   - Sample queries:
     - "Show me monthly training statistics"
     - "What are the most popular MHFA courses?"
     - "Generate a report on instructor performance"

#### Suggested Topics:
- Learning Management System
- Course Scheduling Procedures
- Instructor Credentialing
- Program Quality Assurance
- Stakeholder Communication

#### Recent Updates:
- New LMS features released
- Updated staff training protocols
- Improved reporting dashboard

---

### 👤 **For Learners**

#### Quick Actions:
1. **My Courses**
   - Sample queries:
     - "Show me my enrolled MHFA courses"
     - "What is my course completion status?"
     - "How do I access my course materials?"

2. **Find Training**
   - Sample queries:
     - "What MHFA courses are available near me?"
     - "How do I enroll in a Mental Health First Aid course?"
     - "What are the different types of MHFA training?"

3. **Certification**
   - Sample queries:
     - "How do I get my MHFA certification?"
     - "When does my certification expire?"
     - "How do I renew my Mental Health First Aid certification?"

4. **Resources & Support**
   - Sample queries:
     - "Where can I find additional MHFA resources?"
     - "How do I contact my instructor?"
     - "What support is available for learners?"

#### Suggested Topics:
- Course Enrollment Process
- Blended Learning Format
- Certification Requirements
- Mental Health Resources
- Community Support Groups

#### Recent Updates:
- New online course modules available
- Updated certification process
- Mobile app for course access launched

---

## Technical Architecture

### Frontend Components

**1. UserProfilePage.jsx**
- Main profile page with tab navigation
- Two tabs: "My Role" and "Recommendations"
- Handles user navigation between role selection and recommendations

**2. RoleSelector.jsx**
- Beautiful card-based role selection interface
- Three cards with icons, titles, and descriptions
- Saves role to backend via POST /user-profile
- Updates Cognito user pool attributes

**3. PersonalizedRecommendations.jsx**
- Displays role-specific recommendations
- Quick action cards with sample queries
- Expandable accordion sections for topics and updates
- Clickable query chips that navigate to chat

**4. ChatHeader.jsx**
- Added profile button (person icon) next to info button
- Clicking profile button navigates to /profile route
- Displays in both English and Spanish

### Backend Infrastructure

**1. DynamoDB Table: NCMWUserProfiles**
```
Partition Key: userId (String)
Attributes:
  - role: instructor | staff | learner
  - preferences: {} (for future customization)
  - created_at: ISO timestamp
  - updated_at: ISO timestamp
```

**2. Lambda Function: userProfile**
```python
# Handles:
- GET /user-profile - Fetch user profile
- POST /user-profile - Create user profile
- PUT /user-profile - Update user profile
- GET /recommendations - Get role-specific recommendations
```

**3. API Gateway Endpoints**
```
GET  /user-profile       → Get current user's profile
POST /user-profile       → Create/update user profile
PUT  /user-profile       → Update user profile
GET  /recommendations    → Get personalized recommendations
```

**4. Cognito Integration**
- Saves role to Cognito user attribute: `profile`
- Enables role-based access control in future features

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User logs into Learning Navigator                         │
│  (Cognito authentication)                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  User clicks Profile icon in chat header                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Has role set? │
         └───────┬───────┘
                 │
        ┌────────┴─────────┐
        │                  │
       NO                 YES
        │                  │
        ▼                  ▼
┌──────────────────┐  ┌────────────────────────┐
│  Role Selection  │  │  Recommendations Tab   │
│                  │  │  (auto-switched)       │
│  User chooses:   │  └────────────────────────┘
│  - Instructor    │
│  - Staff         │
│  - Learner       │
│                  │
│  Click Continue  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /user-profile                                         │
│  { role: "instructor", preferences: {} }                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend saves to DynamoDB                                  │
│  Updates Cognito user attribute                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /recommendations                                       │
│  Returns role-specific content                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  User sees personalized recommendations:                    │
│  - Quick actions with sample queries                        │
│  - Suggested topics                                         │
│  - Recent updates                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  User clicks a query chip                                   │
│  → Navigates to /chat with query pre-filled                │
│  → Chatbot provides role-specific answer                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits

### ✅ For Users:
1. **Faster Access**: Get relevant information quickly without searching
2. **Personalized Experience**: See only content relevant to your role
3. **Guided Exploration**: Discover features you might not know about
4. **Time Savings**: Pre-written queries eliminate typing

### ✅ For Organization:
1. **Improved Engagement**: Users find value faster
2. **Reduced Support Load**: Common questions answered proactively
3. **Better Analytics**: Track which features each user type needs most
4. **Scalable Content**: Easy to update recommendations as needs change

---

## Customization

### Adding New Quick Actions

Edit `cdk_backend/lambda/userProfile/handler.py`:

```python
RECOMMENDATIONS = {
    'instructor': {
        'quick_actions': [
            {
                'title': 'Your New Action',
                'description': 'Description here',
                'icon': 'icon_name',  # Material-UI icon name
                'queries': [
                    'Sample query 1',
                    'Sample query 2',
                    'Sample query 3'
                ]
            },
            # ... existing actions
        ],
        # ... rest of config
    }
}
```

### Adding New Suggested Topics

```python
'suggested_topics': [
    'New Topic Name',
    'Another Topic',
    # ... existing topics
]
```

### Adding New Updates

```python
'recent_updates': [
    'New feature or announcement here',
    # ... existing updates
]
```

After editing, redeploy:
```bash
cd cdk_backend
cdk deploy
```

---

## Troubleshooting

### Issue: Profile button not showing in chat
**Solution**:
- Clear browser cache
- Check that user is logged in
- Verify Amplify build completed successfully

### Issue: "Please set your role" message
**Solution**:
- User hasn't selected a role yet
- Click profile button and select a role
- If role was selected but message persists, check DynamoDB table

### Issue: Recommendations not loading
**Solution**:
- Check CloudWatch logs for userProfile Lambda
- Verify DynamoDB table exists: NCMWUserProfiles
- Check API Gateway endpoint: GET /recommendations

### Issue: Query chips not working
**Solution**:
- Check console for JavaScript errors
- Verify navigation routing in App.jsx
- Ensure ChatBody component accepts initialQuery prop

---

## Future Enhancements

Potential additions (not currently implemented):

1. **Preference Customization**
   - Let users hide/show specific quick actions
   - Reorder quick actions by preference
   - Star favorite queries

2. **Learning Path Tracking**
   - Track which queries users click most
   - Suggest next steps based on history
   - Progress indicators for common tasks

3. **Dynamic Content**
   - Fetch recommendations from CMS instead of hardcoded
   - A/B test different recommendation layouts
   - Personalize based on user behavior

4. **Multi-Role Support**
   - Allow users to have multiple roles
   - Quick switcher between role contexts
   - Merged recommendations from multiple roles

5. **Social Features**
   - Share recommendations with colleagues
   - Comment on helpful queries
   - Rate usefulness of recommendations

---

## Security & Privacy

### Authentication:
- ✅ **Guest Mode**: No login required for main chatbot users
- ✅ **Admin Mode**: Cognito authentication for admin portal users
- ✅ API endpoints protected by Cognito authorizer (for admin users)

### Data Storage:
- ✅ **Guest Users**: Role stored in browser localStorage (client-side only)
- ✅ **Admin Users**: Profiles stored in DynamoDB with encryption at rest
- ✅ Only stores role and preferences (no sensitive data)
- ✅ User can change role at any time

### Access Control:
- ✅ Guest users: Data isolated per browser/device
- ✅ Admin users: Can only access their own profile
- ✅ Backend validates userId from JWT token (admin only)
- ✅ No cross-user data access

---

## Monitoring

### CloudWatch Metrics:
- **Lambda Invocations**: userProfile function calls
- **API Requests**: /user-profile and /recommendations endpoint hits
- **DynamoDB Operations**: Read/write operations on NCMWUserProfiles

### Useful CloudWatch Queries:

**Check role distribution:**
```
fields @timestamp, role
| stats count() by role
```

**Monitor profile updates:**
```
fields @timestamp, userId, role
| filter @message like /Profile updated/
| sort @timestamp desc
```

**Track recommendation requests:**
```
fields @timestamp, userId, role
| filter @message like /get_recommendations/
| stats count() by role
```

---

## Summary

The Personalized Recommendations feature transforms your Learning Navigator from a generic chatbot into a **role-aware assistant** that understands each user's context and provides targeted, relevant information.

**Key Statistics:**
- 📊 **3 user roles** supported
- 🎯 **12 quick actions** (4 per role)
- 💡 **15 suggested topics** (5 per role)
- 📰 **9 recent updates** (3 per role)
- ⚡ **36+ sample queries** ready to use

This feature significantly improves user experience by reducing the time to find relevant information and increasing engagement with the chatbot!
