import React, { useState } from 'react';
import {
  Box,
  Container,
  Button,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as ProfileIcon,
  Recommend as RecommendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import RoleSelector from './RoleSelector';
import PersonalizedRecommendations from './PersonalizedRecommendations';
import { useLanguage } from '../utilities/LanguageContext';
import { RECOMMENDATIONS_TEXT } from '../utilities/recommendationsTranslations';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const TEXT = RECOMMENDATIONS_TEXT[language] || RECOMMENDATIONS_TEXT.EN;
  const [activeTab, setActiveTab] = useState(0);
  const [roleSelected, setRoleSelected] = useState(false);

  const handleRoleSelected = (role) => {
    console.log('Role selected:', role);
    setRoleSelected(true);
    // Automatically switch to recommendations tab
    setActiveTab(1);
  };

  const handleQuerySelect = (query) => {
    // Navigate to chat with the selected query
    navigate('/chat', { state: { initialQuery: query } });
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #064F80 0%, #053E66 100%)',
          color: 'white',
          py: 3,
          px: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  fontWeight: 700,
                }}
              >
                {TEXT.PAGE_TITLE}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  mt: 0.5,
                }}
              >
                {TEXT.PAGE_SUBTITLE}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleBackToChat}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#EA5E29',
                  backgroundColor: 'rgba(234, 94, 41, 0.1)',
                },
              }}
            >
              {TEXT.BACK_TO_CHAT}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Tabs */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderBottom: '1px solid #ddd',
        }}
      >
        <Container maxWidth="lg">
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
              },
            }}
          >
            <Tab
              icon={<ProfileIcon />}
              iconPosition="start"
              label={TEXT.TAB_MY_ROLE}
            />
            <Tab
              icon={<RecommendIcon />}
              iconPosition="start"
              label={TEXT.TAB_RECOMMENDATIONS}
              disabled={!roleSelected}
            />
          </Tabs>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            minHeight: '500px',
          }}
        >
          {activeTab === 0 && (
            <RoleSelector onRoleSelected={handleRoleSelected} />
          )}
          {activeTab === 1 && (
            <PersonalizedRecommendations onQuerySelect={handleQuerySelect} />
          )}
        </Box>
      </Container>
    </Box>
  );
}
