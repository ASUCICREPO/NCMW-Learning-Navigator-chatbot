import React from "react";
import { Typography, Box, IconButton, Tooltip, Button } from "@mui/material";
import {
  Info as InfoIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../utilities/LanguageContext";
import { TEXT } from "../utilities/constants";
import { RECOMMENDATIONS_TEXT } from "../utilities/recommendationsTranslations";
import { useTheme } from "@mui/material/styles";

function ChatHeader({ selectedLanguage, onMenuClick, onLanguageChange }) {
  const navigate = useNavigate();
  const { language: contextLanguage, setLanguage } = useLanguage();
  const language = selectedLanguage || contextLanguage || 'EN';
  const PROFILE_TEXT = RECOMMENDATIONS_TEXT[language] || RECOMMENDATIONS_TEXT.EN;
  const theme = useTheme();

  const handleLanguageToggle = () => {
    const newLanguage = language === 'EN' ? 'ES' : 'EN';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);

    // Reset the chat conversation when switching languages
    if (onLanguageChange) {
      onLanguageChange();
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #064F80 0%, #053E66 100%)',
        py: { xs: 1.5, sm: 2, md: 2.5 },
        px: { xs: 1.5, sm: 2, md: 3 },
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `3px solid ${theme.palette.primary.main}`,
      }}
    >
      {/* Decorative petal shapes */}
      <Box
        sx={{
          position: 'absolute',
          right: -30,
          top: -30,
          width: 100,
          height: 100,
          borderRadius: '50% 50% 0 50%',
          background: 'rgba(234, 94, 41, 0.15)',
          transform: 'rotate(45deg)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: -40,
          bottom: -40,
          width: 120,
          height: 120,
          borderRadius: '50% 50% 50% 0',
          background: 'rgba(127, 211, 238, 0.1)',
          transform: 'rotate(-15deg)',
        }}
      />

      <Box
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left side - Menu Button and Title */}
        <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1, md: 2 }}>
          {/* Menu Button - Hidden on desktop when sidebar is visible */}
          <Tooltip title="Open Menu" arrow sx={{ display: { xs: 'inline-flex', lg: 'none' } }}>
            <IconButton
              onClick={onMenuClick}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: { xs: '6px', sm: '8px' },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <MenuIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.3px',
                lineHeight: 1.2,
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.5rem' },
              }}
            >
              {TEXT[language]?.CHAT_TITLE || "Learning Navigator"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: { xs: '0.65rem', sm: '0.65rem', md: '0.75rem' },
                letterSpacing: '0.5px',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              MHFA Learning Ecosystem
            </Typography>
          </Box>
        </Box>

        {/* Right side - Language, Profile and Info buttons */}
        <Box display="flex" gap={{ xs: 0.5, sm: 0.75, md: 1 }} alignItems="center">
          {/* Language Toggle Button */}
          <Tooltip
            title={
              <Box sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {language === 'EN' ? 'Cambiar a Español' : 'Switch to English'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#ffeb3b', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  {language === 'EN'
                    ? '⚠️ La conversación actual se perderá'
                    : '⚠️ Current conversation will be lost'}
                </Typography>
              </Box>
            }
            arrow
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                  '& .MuiTooltip-arrow': {
                    color: 'rgba(0, 0, 0, 0.9)',
                  },
                },
              },
            }}
          >
            <Button
              onClick={handleLanguageToggle}
              startIcon={<LanguageIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '20px',
                padding: { xs: '4px 10px', sm: '5px 14px', md: '6px 16px' },
                textTransform: 'none',
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                minWidth: { xs: 'auto', sm: 'auto' },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              {language === 'EN' ? 'ES' : 'EN'}
            </Button>
          </Tooltip>

          <Tooltip title={PROFILE_TEXT.TOOLTIP_PROFILE || "My Profile"} arrow>
            <IconButton
              onClick={() => navigate('/profile')}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: { xs: '6px', sm: '8px' },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <PersonIcon sx={{ fontSize: { xs: 20, sm: 22, md: 24 } }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={PROFILE_TEXT.TOOLTIP_INFO || "About Learning Navigator"} arrow sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            <IconButton
              sx={{
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: { xs: '6px', sm: '8px' },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <InfoIcon sx={{ fontSize: { xs: 20, sm: 22, md: 24 } }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default ChatHeader;
