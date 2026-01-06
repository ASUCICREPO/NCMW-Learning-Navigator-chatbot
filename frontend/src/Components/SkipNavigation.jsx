/**
 * Skip Navigation Links Component
 *
 * Provides keyboard users with the ability to skip repetitive content
 * and jump directly to main content areas.
 *
 * WCAG 2.1 Success Criterion 2.4.1 - Bypass Blocks (Level A)
 */

import React from 'react';
import { Box } from '@mui/material';

const SkipNavigation = () => {
  const skipLinkStyle = {
    position: 'absolute',
    left: '-9999px',
    top: '10px',
    zIndex: 10000,
    padding: '12px 20px',
    backgroundColor: '#EA5E29',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1rem',
    borderRadius: '4px',
    border: '3px solid #064F80',
    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'left 0.2s ease',
    '&:focus': {
      left: '10px',
      outline: '3px solid #064F80',
      outlineOffset: '2px',
    },
  };

  const handleSkipClick = (e, targetId) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Skip navigation links"
      sx={{
        position: 'relative',
        '& a:focus': {
          position: 'absolute',
          left: '10px',
        },
      }}
    >
      <a
        href="#main-content"
        onClick={(e) => handleSkipClick(e, 'main-content')}
        sx={skipLinkStyle}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '10px',
          zIndex: 10000,
          padding: '12px 20px',
          backgroundColor: '#EA5E29',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: '4px',
          border: '3px solid #064F80',
          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        onFocus={(e) => {
          e.target.style.left = '10px';
        }}
        onBlur={(e) => {
          e.target.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>
      <a
        href="#chat-input"
        onClick={(e) => handleSkipClick(e, 'chat-input')}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '60px',
          zIndex: 10000,
          padding: '12px 20px',
          backgroundColor: '#EA5E29',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: '4px',
          border: '3px solid #064F80',
          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        onFocus={(e) => {
          e.target.style.left = '10px';
        }}
        onBlur={(e) => {
          e.target.style.left = '-9999px';
        }}
      >
        Skip to chat input
      </a>
      <a
        href="#admin-navigation"
        onClick={(e) => handleSkipClick(e, 'admin-navigation')}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '110px',
          zIndex: 10000,
          padding: '12px 20px',
          backgroundColor: '#EA5E29',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: '4px',
          border: '3px solid #064F80',
          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        onFocus={(e) => {
          e.target.style.left = '10px';
        }}
        onBlur={(e) => {
          e.target.style.left = '-9999px';
        }}
      >
        Skip to navigation menu
      </a>
    </Box>
  );
};

export default SkipNavigation;
