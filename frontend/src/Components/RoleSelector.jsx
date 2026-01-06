import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  School as InstructorIcon,
  Work as StaffIcon,
  Person as LearnerIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { DOCUMENTS_API } from '../utilities/constants';
import { getIdToken } from '../utilities/auth';
import { useLanguage } from '../utilities/LanguageContext';
import { RECOMMENDATIONS_TEXT } from '../utilities/recommendationsTranslations';

const PROFILE_API = `${DOCUMENTS_API}user-profile`;

export default function RoleSelector({ onRoleSelected }) {
  const { language } = useLanguage();
  const TEXT = RECOMMENDATIONS_TEXT[language] || RECOMMENDATIONS_TEXT.EN;

  const roleOptions = [
    {
      value: 'instructor',
      label: TEXT.ROLE_INSTRUCTOR,
      description: TEXT.ROLE_INSTRUCTOR_DESC,
      icon: <InstructorIcon sx={{ fontSize: 60, color: '#EA5E29' }} />,
    },
    {
      value: 'staff',
      label: TEXT.ROLE_STAFF,
      description: TEXT.ROLE_STAFF_DESC,
      icon: <StaffIcon sx={{ fontSize: 60, color: '#064F80' }} />,
    },
    {
      value: 'learner',
      label: TEXT.ROLE_LEARNER,
      description: TEXT.ROLE_LEARNER_DESC,
      icon: <LearnerIcon sx={{ fontSize: 60, color: '#7FD3EE' }} />,
    },
  ];
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingRole, setExistingRole] = useState(null);

  useEffect(() => {
    fetchExistingProfile();
  }, []);

  const fetchExistingProfile = async () => {
    try {
      setLoading(true);

      // For guest users, check localStorage
      const guestMode = localStorage.getItem("guestMode");
      if (guestMode === "true" || !localStorage.getItem("idToken")) {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          setExistingRole(storedRole);
          setSelectedRole(storedRole);
          // Auto-advance if role is already set
          if (onRoleSelected) {
            onRoleSelected(storedRole);
          }
        }
        setLoading(false);
        return;
      }

      // For authenticated admin users, fetch from backend
      const token = await getIdToken();
      const response = await axios.get(PROFILE_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.role) {
        setExistingRole(response.data.role);
        setSelectedRole(response.data.role);
        // Auto-advance if role is already set
        if (onRoleSelected) {
          onRoleSelected(response.data.role);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      // Not a critical error - user can still select role
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) {
      setError(TEXT.SELECT_ROLE_ERROR);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // For guest users (main chatbot), store role in localStorage
      const guestMode = localStorage.getItem("guestMode");
      if (guestMode === "true" || !localStorage.getItem("idToken")) {
        localStorage.setItem('userRole', selectedRole);
        localStorage.setItem('userRoleTimestamp', new Date().toISOString());

        if (onRoleSelected) {
          onRoleSelected(selectedRole);
        }
        setLoading(false);
        return;
      }

      // For authenticated admin users, save to backend
      const token = await getIdToken();
      await axios.post(
        PROFILE_API,
        {
          role: selectedRole,
          preferences: {},
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (onRoleSelected) {
        onRoleSelected(selectedRole);
      }
    } catch (err) {
      console.error('Failed to save role:', err);
      setError(err.response?.data?.error || 'Failed to save role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedRole) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 4,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
          fontWeight: 700,
          color: '#064F80',
          textAlign: 'center',
          mb: 2,
        }}
      >
        {TEXT.ROLE_WELCOME_TITLE}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          textAlign: 'center',
          color: '#666',
          mb: 4,
        }}
      >
        {existingRole
          ? TEXT.ROLE_UPDATE_SUBTITLE
          : TEXT.ROLE_WELCOME_SUBTITLE}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <Grid container spacing={3}>
            {roleOptions.map((option) => (
              <Grid item xs={12} md={4} key={option.value}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    border: selectedRole === option.value ? '3px solid #EA5E29' : '1px solid #ddd',
                    boxShadow: selectedRole === option.value ? '0 8px 20px rgba(234, 94, 41, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => setSelectedRole(option.value)}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2 }}>
                      {option.icon}
                    </Box>

                    <FormControlLabel
                      value={option.value}
                      control={<Radio sx={{ display: 'none' }} />}
                      label=""
                      sx={{ m: 0 }}
                    />

                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                        fontWeight: 600,
                        color: '#064F80',
                        mb: 1,
                      }}
                    >
                      {option.label}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: '#666',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {option.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveRole}
          disabled={!selectedRole || loading}
          sx={{
            background: 'linear-gradient(135deg, #EA5E29 0%, #CB5223 100%)',
            color: 'white',
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600,
            padding: '12px 48px',
            fontSize: '1.1rem',
            borderRadius: '8px',
            textTransform: 'none',
            boxShadow: '0px 4px 12px rgba(234, 94, 41, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #CB5223 0%, #B3421C 100%)',
              boxShadow: '0px 6px 16px rgba(234, 94, 41, 0.4)',
            },
            '&:disabled': {
              background: '#ccc',
              color: '#666',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : existingRole ? (
            TEXT.UPDATE_ROLE_BUTTON
          ) : (
            TEXT.CONTINUE_BUTTON
          )}
        </Button>
      </Box>
    </Box>
  );
}
