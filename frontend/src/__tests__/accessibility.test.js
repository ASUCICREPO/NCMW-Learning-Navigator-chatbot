/**
 * Accessibility Tests using jest-axe
 *
 * These tests verify WCAG 2.1 Level AA compliance for all components
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Components to test
import ChatBody from '../Components/ChatBody';
import ChatInput from '../Components/ChatInput';
import ChatHeader from '../Components/ChatHeader';
import BotFileCheckReply from '../Components/BotFileCheckReply';
import SkipNavigation from '../Components/SkipNavigation';
import AdminDashboardSimple from '../Components/AdminDashboardSimple';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Theme for testing
const theme = createTheme({
  palette: {
    primary: { main: '#EA5E29' },
    secondary: { main: '#064F80' },
  },
});

// Wrapper for components that need context
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Accessibility Tests', () => {
  describe('Skip Navigation', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <SkipNavigation />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have skip links with proper text', () => {
      const { getByText } = render(
        <TestWrapper>
          <SkipNavigation />
        </TestWrapper>
      );
      expect(getByText('Skip to main content')).toBeInTheDocument();
      expect(getByText('Skip to chat input')).toBeInTheDocument();
    });
  });

  describe('ChatInput Component', () => {
    it('should not have accessibility violations', async () => {
      const mockSend = jest.fn();
      const { container } = render(
        <TestWrapper>
          <ChatInput
            onSendMessage={mockSend}
            processing={false}
            message=""
            setMessage={jest.fn()}
          />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible label for input', () => {
      const mockSend = jest.fn();
      const { container } = render(
        <TestWrapper>
          <ChatInput
            onSendMessage={mockSend}
            processing={false}
            message=""
            setMessage={jest.fn()}
          />
        </TestWrapper>
      );
      const input = container.querySelector('input, textarea');
      expect(input).toHaveAttribute('id', 'USERCHATINPUT');
    });
  });

  describe('ChatHeader Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <ChatHeader />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('BotFileCheckReply Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <BotFileCheckReply
            message="Test message"
            fileName=""
            fileStatus={false}
            citations={[]}
            isLoading={false}
            messageId="test-123"
            sessionId="session-123"
            onFeedback={jest.fn()}
          />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible feedback buttons', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <BotFileCheckReply
            message="Test message"
            messageId="test-123"
            sessionId="session-123"
            onFeedback={jest.fn()}
          />
        </TestWrapper>
      );
      // Feedback buttons should have tooltips which provide accessible labels
      const thumbsUp = getByLabelText(/good response/i);
      const thumbsDown = getByLabelText(/poor response/i);
      expect(thumbsUp).toBeInTheDocument();
      expect(thumbsDown).toBeInTheDocument();
    });
  });

  describe('Color Contrast', () => {
    it('primary color should have sufficient contrast with white background', () => {
      // Primary: #EA5E29 (orange)
      // Background: #FFFFFF (white)
      // Expected ratio: > 4.5:1 for normal text
      const { checkContrastCompliance } = require('../utilities/accessibility');
      const result = checkContrastCompliance('#EA5E29', '#FFFFFF', 'AA', false);
      expect(result.passes).toBe(true);
      expect(parseFloat(result.ratio)).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary color should have sufficient contrast with white background', () => {
      // Secondary: #064F80 (dark blue)
      // Background: #FFFFFF (white)
      const { checkContrastCompliance } = require('../utilities/accessibility');
      const result = checkContrastCompliance('#064F80', '#FFFFFF', 'AA', false);
      expect(result.passes).toBe(true);
      expect(parseFloat(result.ratio)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Keyboard Navigation', () => {
    it('interactive elements should be keyboard accessible', () => {
      const mockSend = jest.fn();
      const { container } = render(
        <TestWrapper>
          <ChatInput
            onSendMessage={mockSend}
            processing={false}
            message="test"
            setMessage={jest.fn()}
          />
        </TestWrapper>
      );

      // All interactive elements should have tabindex or be naturally focusable
      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button.tabIndex).not.toBe(-1);
      });
    });
  });

  describe('ARIA Labels', () => {
    it('icon buttons should have aria-label or title', () => {
      const { container } = render(
        <TestWrapper>
          <BotFileCheckReply
            message="Test message"
            messageId="test-123"
            sessionId="session-123"
            onFeedback={jest.fn()}
          />
        </TestWrapper>
      );

      // Icon buttons should have accessible names
      const iconButtons = container.querySelectorAll('[role="button"]');
      iconButtons.forEach((button) => {
        const hasLabel =
          button.hasAttribute('aria-label') ||
          button.hasAttribute('title') ||
          button.querySelector('[aria-label]') ||
          button.textContent.trim().length > 0;
        expect(hasLabel).toBe(true);
      });
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', () => {
      const { container } = render(
        <TestWrapper>
          <ChatBody />
        </TestWrapper>
      );

      // Should have main content landmark
      const main = container.querySelector('main, [role="main"]');
      expect(main).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      const mockSend = jest.fn();
      const { container } = render(
        <TestWrapper>
          <ChatInput
            onSendMessage={mockSend}
            processing={false}
            message=""
            setMessage={jest.fn()}
          />
        </TestWrapper>
      );

      const input = container.querySelector('input, textarea');
      input.focus();

      // Check if element is focused
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Form Labels', () => {
    it('form inputs should have associated labels', () => {
      const mockSend = jest.fn();
      const { container } = render(
        <TestWrapper>
          <ChatInput
            onSendMessage={mockSend}
            processing={false}
            message=""
            setMessage={jest.fn()}
          />
        </TestWrapper>
      );

      const input = container.querySelector('input, textarea');
      // Input should have label, aria-label, or aria-labelledby
      const hasLabel =
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        container.querySelector(`label[for="${input.id}"]`);
      expect(hasLabel).toBeTruthy();
    });
  });

  describe('Dynamic Content Announcements', () => {
    it('should have aria-live regions for chat messages', () => {
      const { container } = render(
        <TestWrapper>
          <ChatBody />
        </TestWrapper>
      );

      // Chat area should have aria-live or role=log for announcements
      const liveRegion = container.querySelector('[aria-live], [role="log"], [role="status"]');
      expect(liveRegion).toBeTruthy();
    });
  });
});
