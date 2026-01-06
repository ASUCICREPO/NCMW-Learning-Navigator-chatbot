/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 *
 * This file contains utility functions and components to ensure
 * the application meets WCAG 2.1 Level AA standards.
 */

import React from 'react';

/**
 * Generate unique IDs for accessibility labels
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export const generateA11yId = (prefix = 'a11y') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check if element is visible to screen readers
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if visible to screen readers
 */
export const isA11yVisible = (element) => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
};

/**
 * Focus trap for modals and dialogs
 * @param {HTMLElement} container - Container element
 * @returns {Function} Cleanup function
 */
export const createFocusTrap = (container) => {
  if (!container) return () => {};

  const focusableElements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Get color contrast ratio
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio
 */
export const getContrastRatio = (color1, color2) => {
  const getLuminance = (hexColor) => {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @param {string} level - 'AA' or 'AAA'
 * @param {boolean} largeText - Is text large (18pt+ or 14pt+ bold)
 * @returns {Object} Compliance status
 */
export const checkContrastCompliance = (foreground, background, level = 'AA', largeText = false) => {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = level === 'AAA' ? (largeText ? 4.5 : 7) : (largeText ? 3 : 4.5);

  return {
    ratio: ratio.toFixed(2),
    required: requiredRatio,
    passes: ratio >= requiredRatio,
    level
  };
};

/**
 * Screen Reader Only (sr-only) styles
 */
export const srOnlyStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Focus visible styles for WCAG compliance
 */
export const focusVisibleStyles = (theme) => ({
  '&:focus-visible': {
    outline: `3px solid ${theme?.palette?.primary?.main || '#EA5E29'}`,
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  '&:focus:not(:focus-visible)': {
    outline: 'none',
  },
});

/**
 * Skip Link Component for keyboard navigation
 */
export const SkipLink = ({ href, children, ...props }) => {
  return (
    <a
      href={href}
      {...props}
      style={{
        ...srOnlyStyles,
        '&:focus': {
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 9999,
          backgroundColor: '#EA5E29',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          width: 'auto',
          height: 'auto',
          clip: 'auto',
          overflow: 'visible',
          whiteSpace: 'normal',
          outline: '3px solid #064F80',
          outlineOffset: '2px',
        },
      }}
      onFocus={(e) => {
        e.target.style.position = 'fixed';
        e.target.style.top = '10px';
        e.target.style.left = '10px';
        e.target.style.zIndex = '9999';
        e.target.style.backgroundColor = '#EA5E29';
        e.target.style.color = 'white';
        e.target.style.padding = '12px 20px';
        e.target.style.borderRadius = '4px';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
        e.target.style.clip = 'auto';
        e.target.style.overflow = 'visible';
        e.target.style.whiteSpace = 'normal';
        e.target.style.outline = '3px solid #064F80';
        e.target.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        Object.assign(e.target.style, srOnlyStyles);
      }}
    >
      {children}
    </a>
  );
};

/**
 * Live Region Component for dynamic content announcements
 */
export const LiveRegion = ({
  children,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = 'true',
  ...props
}) => {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Visually Hidden Component (accessible to screen readers)
 */
export const VisuallyHidden = ({ children, ...props }) => {
  return (
    <span style={srOnlyStyles} {...props}>
      {children}
    </span>
  );
};

export default {
  generateA11yId,
  announceToScreenReader,
  isA11yVisible,
  createFocusTrap,
  getContrastRatio,
  checkContrastCompliance,
  srOnlyStyles,
  focusVisibleStyles,
  SkipLink,
  LiveRegion,
  VisuallyHidden,
};
