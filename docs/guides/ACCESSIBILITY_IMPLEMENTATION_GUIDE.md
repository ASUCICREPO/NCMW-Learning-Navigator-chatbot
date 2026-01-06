# Accessibility Implementation Guide

**Learning Navigator Chatbot - WCAG 2.1 AA Compliance**

---

## Overview

This guide provides detailed instructions for implementing and maintaining WCAG 2.1 Level AA accessibility standards in the Learning Navigator chatbot application.

---

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install --save-dev jest-axe @testing-library/jest-dom
```

### 2. Import Accessibility Utilities

```javascript
import {
  SkipLink,
  LiveRegion,
  VisuallyHidden,
  focusVisibleStyles,
  announceToScreenReader
} from '../utilities/accessibility';
```

### 3. Add Skip Navigation

```jsx
import SkipNavigation from './Components/SkipNavigation';

function App() {
  return (
    <>
      <SkipNavigation />
      <main id="main-content">
        {/* Your content */}
      </main>
    </>
  );
}
```

---

## Implementation Checklist

### Phase 1: Critical (MUST HAVE)

#### ✅ Skip Navigation Links
**File:** `frontend/src/Components/SkipNavigation.jsx`
**Status:** ✅ Created

**Usage:**
```jsx
import SkipNavigation from './Components/SkipNavigation';

// Add at the very beginning of your app
<SkipNavigation />

// Ensure target elements have IDs:
<main id="main-content">...</main>
<div id="chat-input">...</div>
```

**Testing:**
- Press Tab key after page loads
- Skip links should appear
- Pressing Enter should jump to target section

---

#### ✅ ARIA Live Regions for Chat Messages
**What:** Announce new messages to screen readers
**Status:** ⚠️ Needs implementation in ChatBody.jsx

**Implementation:**
```jsx
import { LiveRegion } from '../utilities/accessibility';

function ChatBody() {
  return (
    <main id="main-content">
      <LiveRegion
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.content}
          </div>
        ))}
      </LiveRegion>
    </main>
  );
}
```

**Testing:**
- Use NVDA/JAWS screen reader
- Send a message
- Screen reader should announce new messages

---

#### ✅ Keyboard Navigation
**Status:** ⚠️ Needs enhancement

**Requirements:**
1. All interactive elements must be keyboard accessible
2. Tab order must be logical
3. Focus indicators must be visible
4. Escape key should close modals

**Implementation:**
```jsx
// Add to all interactive components
import { focusVisibleStyles } from '../utilities/accessibility';

<Button
  sx={{
    ...focusVisibleStyles(theme),
    // other styles
  }}
>
  Click Me
</Button>
```

**Focus Indicator Styles:**
```css
:focus-visible {
  outline: 3px solid #EA5E29;
  outline-offset: 2px;
  border-radius: 4px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

**Testing:**
- Disconnect mouse
- Navigate entire app using only keyboard:
  - Tab: Move forward
  - Shift+Tab: Move backward
  - Enter/Space: Activate buttons
  - Escape: Close modals

---

#### ✅ Semantic HTML & Landmarks
**Status:** ⚠️ Needs implementation

**Required Landmarks:**
```jsx
<body>
  <SkipNavigation />

  <header role="banner">
    {/* Page header */}
  </header>

  <nav role="navigation" aria-label="Main navigation">
    {/* Navigation menu */}
  </nav>

  <main id="main-content" role="main">
    {/* Primary content */}

    <section aria-labelledby="chat-heading">
      <h1 id="chat-heading">Chat with Learning Navigator</h1>
      {/* Chat interface */}
    </section>
  </main>

  <aside role="complementary" aria-label="Recommendations">
    {/* Sidebar content */}
  </aside>

  <footer role="contentinfo">
    {/* Footer */}
  </footer>
</body>
```

**Testing:**
- Use screen reader landmark navigation (NVDA: D key)
- All major sections should be identified

---

#### ✅ Form Labels & Input Purpose
**Status:** ⚠️ Needs implementation

**Chat Input Enhancement:**
```jsx
<TextField
  id="chat-input"
  inputRef={inputRef}
  multiline
  fullWidth
  label="Type your message"
  aria-label="Chat message input"
  aria-describedby="chat-input-help"
  autoComplete="off"
  inputProps={{
    'aria-required': false,
    'aria-multiline': true,
  }}
/>
<span id="chat-input-help" style={srOnlyStyles}>
  Press Enter to send, Shift+Enter for new line
</span>
```

**Login Form Example:**
```jsx
<TextField
  id="email"
  type="email"
  label="Email Address"
  autoComplete="email"
  required
  aria-required="true"
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

---

### Phase 2: High Priority

#### ✅ Color Contrast Audit
**Tool:** `frontend/src/utilities/accessibility.js` - `checkContrastCompliance()`

**Required Ratios:**
- Normal text (< 18pt): 4.5:1
- Large text (≥ 18pt or ≥ 14pt bold): 3:1
- UI components: 3:1

**Current Color Palette:**
```javascript
const colors = {
  primary: '#EA5E29',      // Orange
  secondary: '#064F80',    // Dark Blue
  accent: '#7FD3EE',       // Light Blue
  success: '#4CAF50',      // Green
  error: '#F44336',        // Red
  warning: '#FF9800',      // Amber
  text: {
    primary: '#212121',    // Almost Black
    secondary: '#757575',  // Gray
  },
  background: {
    default: '#FFFFFF',    // White
    paper: '#F5F5F5',      // Light Gray
    userMessage: '#EAF2F4',
    botMessage: '#F4EFE8',
  }
};
```

**Audit Script:**
```javascript
import { checkContrastCompliance } from './utilities/accessibility';

const auditContrast = () => {
  const checks = [
    { fg: '#EA5E29', bg: '#FFFFFF', name: 'Primary on White' },
    { fg: '#064F80', bg: '#FFFFFF', name: 'Secondary on White' },
    { fg: '#212121', bg: '#FFFFFF', name: 'Text on White' },
    { fg: '#FFFFFF', bg: '#EA5E29', name: 'White on Primary' },
    { fg: '#FFFFFF', bg: '#064F80', name: 'White on Secondary' },
  ];

  checks.forEach(({ fg, bg, name }) => {
    const result = checkContrastCompliance(fg, bg);
    console.log(`${name}: ${result.ratio}:1 - ${result.passes ? '✅ PASS' : '❌ FAIL'}`);
  });
};
```

**Fixing Low Contrast:**
- Darken text colors
- Lighten background colors
- Add borders/outlines
- Use different design patterns

---

#### ✅ Alternative Text for Images
**Status:** ⚠️ Needs implementation

**Guidelines:**
- Decorative images: `alt=""`
- Informative images: Descriptive alt text
- Functional images (buttons): Describe action
- Complex images: Long description in text

**Implementation:**
```jsx
// Logo
<img
  src={MHFALogo}
  alt="Mental Health First Aid - Learning Navigator Logo"
  aria-label="MHFA Learning Navigator Home"
/>

// Icon buttons
<IconButton
  aria-label="Send message"
  title="Send message"
>
  <SendIcon aria-hidden="true" />
</IconButton>

// Decorative icons
<PsychologyIcon aria-hidden="true" />

// User avatar
<Avatar
  src={UserAvatar}
  alt="User profile picture"
/>
```

---

#### ✅ Error Handling & Messages
**Status:** ⚠️ Needs enhancement

**Implementation:**
```jsx
function LoginForm() {
  const [errors, setErrors] = useState({});

  return (
    <form>
      <TextField
        id="email"
        error={Boolean(errors.email)}
        aria-invalid={errors.email ? 'true' : 'false'}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />
      {errors.email && (
        <Typography
          id="email-error"
          role="alert"
          color="error"
          variant="caption"
        >
          {errors.email}
        </Typography>
      )}
    </form>
  );
}

// Success messages
<LiveRegion role="status" aria-live="polite">
  Message sent successfully!
</LiveRegion>

// Critical errors
<LiveRegion role="alert" aria-live="assertive">
  Connection lost. Please check your internet.
</LiveRegion>
```

---

### Phase 3: Testing

#### ✅ Automated Testing
**File:** `frontend/src/__tests__/accessibility.test.js`
**Status:** ✅ Created

**Run Tests:**
```bash
npm test -- --testPathPattern=accessibility
```

**Add to CI/CD:**
```yaml
# .github/workflows/ci.yml
- name: Run accessibility tests
  run: npm run test:a11y

# package.json
{
  "scripts": {
    "test:a11y": "jest --testPathPattern=accessibility"
  }
}
```

---

#### ✅ Manual Testing Checklist

**Keyboard Navigation:**
- [ ] All interactive elements accessible via Tab
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals

**Screen Reader Testing:**

**NVDA (Windows - Free):**
```
Download: https://www.nvaccess.org/download/
Testing Steps:
1. Start NVDA (Ctrl+Alt+N)
2. Navigate with arrow keys
3. Test headings (H key)
4. Test landmarks (D key)
5. Test links (K key)
6. Test forms (F key)
7. Verify announcements for dynamic content
```

**JAWS (Windows - Paid):**
```
Download: https://www.freedomscientific.com/products/software/jaws/
Similar testing to NVDA
```

**VoiceOver (Mac - Built-in):**
```
Enable: Cmd+F5
Navigate: VO+Arrow Keys (VO = Ctrl+Option)
Test landmarks: VO+U
Test headings: VO+Cmd+H
Test forms: VO+Cmd+J
```

**Mobile Screen Readers:**
- iOS: VoiceOver (Settings > Accessibility)
- Android: TalkBack (Settings > Accessibility)

---

#### ✅ Color Blindness Testing

**Tools:**
- Color Oracle (Windows/Mac/Linux) - Simulator
- Sim Daltonism (Mac) - Real-time filter
- Chrome DevTools > Rendering > Emulate vision deficiencies

**Types to Test:**
- Protanopia (Red-blind)
- Deuteranopia (Green-blind)
- Tritanopia (Blue-blind)
- Achromatopsia (Complete color blindness)

**Verification:**
- All information conveyed by color should have alternative indicators
- Status messages: Use icons + color
- Form validation: Use text + color
- Links: Use underline + color

---

## Common WCAG Violations & Fixes

### 1. Missing Alt Text
```jsx
// ❌ Bad
<img src={logo} />

// ✅ Good
<img src={logo} alt="Company Logo" />

// ✅ Decorative
<img src={decoration} alt="" aria-hidden="true" />
```

### 2. Low Color Contrast
```jsx
// ❌ Bad (gray on white = 2.5:1)
<Typography sx={{ color: '#999' }}>Text</Typography>

// ✅ Good (dark gray on white = 7:1)
<Typography sx={{ color: '#333' }}>Text</Typography>
```

### 3. Missing Form Labels
```jsx
// ❌ Bad
<input type="text" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// ✅ Also Good (with aria-label)
<input type="text" aria-label="Email address" />
```

### 4. Icon-Only Buttons
```jsx
// ❌ Bad
<IconButton>
  <CloseIcon />
</IconButton>

// ✅ Good
<IconButton aria-label="Close dialog" title="Close">
  <CloseIcon aria-hidden="true" />
</IconButton>
```

### 5. No Skip Links
```jsx
// ❌ Bad - User must tab through entire header

// ✅ Good
<SkipNavigation />
<header>...</header>
<main id="main-content">...</main>
```

### 6. Missing ARIA Live Regions
```jsx
// ❌ Bad - Screen reader doesn't announce new messages
<div>{messages}</div>

// ✅ Good
<div role="log" aria-live="polite" aria-atomic="false">
  {messages}
</div>
```

### 7. Poor Focus Indicators
```jsx
// ❌ Bad
button:focus {
  outline: none; /* NEVER DO THIS */
}

// ✅ Good
button:focus-visible {
  outline: 3px solid #EA5E29;
  outline-offset: 2px;
}
```

---

## Resources

### WCAG 2.1 Guidelines
- Official: https://www.w3.org/WAI/WCAG21/quickref/
- Understanding WCAG: https://www.w3.org/WAI/WCAG21/Understanding/

### Testing Tools
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
- Lighthouse: Built into Chrome DevTools
- Pa11y: https://pa11y.org/

### Screen Readers
- NVDA (Free): https://www.nvaccess.org/
- JAWS: https://www.freedomscientific.com/products/software/jaws/
- VoiceOver: Built into Mac/iOS

### Learning Resources
- WebAIM: https://webaim.org/
- A11y Project: https://www.a11yproject.com/
- Deque University: https://dequeuniversity.com/

---

## Maintenance

### Regular Audits
- [ ] Run automated tests in CI/CD
- [ ] Quarterly manual screen reader testing
- [ ] Annual comprehensive WCAG audit
- [ ] Test new features before release

### User Feedback
- [ ] Provide accessibility feedback mechanism
- [ ] Monitor accessibility-related support tickets
- [ ] Conduct user testing with people with disabilities

---

**Last Updated:** January 6, 2026
**Status:** Implementation in Progress
**Target Completion:** End of January 2026
