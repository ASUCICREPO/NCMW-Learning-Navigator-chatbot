import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Button,
  Snackbar,
  Alert
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChatBubbleOutline as ChatIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import axios from "axios";
import { DOCUMENTS_API } from "../utilities/constants";
import { getIdToken, logout } from "../utilities/auth";
import MHFALogo from "../Assets/mhfa_logo.png";
import AccessibleColors from "../utilities/accessibleColors";

const ANALYTICS_API = `${DOCUMENTS_API}session-logs`;

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [analytics, setAnalytics] = useState({
    sentiment: { positive: 0, negative: 0 },
    avg_satisfaction: 0,
    user_count: 0,
    total_queries: 0,
    avg_response_time: 0,
    conversations: []
  });
  const [usageTrends, setUsageTrends] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchAnalytics();

    // Check if we just logged in
    if (location.state?.loginSuccess) {
      setToastMessage('Login successful! Welcome to the admin dashboard.');
      setShowToast(true);
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();

      // Fetch data for the last 7 days
      const promises = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        promises.push(
          axios.get(ANALYTICS_API, {
            params: {
              timeframe: 'custom',
              start_date: dateStr,
              end_date: dateStr
            },
            headers: { Authorization: `Bearer ${token}` },
          }).then(response => ({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            queries: response.data.user_count || 0,
            rawData: response.data
          })).catch(() => ({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            queries: 0,
            rawData: null
          }))
        );
      }

      const results = await Promise.all(promises);
      setUsageTrends(results);

      // Fetch today's data for the metric cards
      const { data } = await axios.get(ANALYTICS_API, {
        params: { timeframe: 'today' },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Calculate total queries including neutral (no feedback) conversations
      const totalSentiment = (data.sentiment?.positive || 0) +
                            (data.sentiment?.negative || 0) +
                            (data.sentiment?.neutral || 0);

      setAnalytics({
        sentiment: data.sentiment || { positive: 0, negative: 0, neutral: 0 },
        avg_satisfaction: data.avg_satisfaction || 0,
        user_count: data.user_count || 0,
        total_queries: totalSentiment,
        avg_response_time: 1.2,
        conversations: data.conversations || []
      });
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      // Set empty trends data on error
      const emptyTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        emptyTrends.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          queries: 0
        });
      }
      setUsageTrends(emptyTrends);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setToastMessage('Logout successful! Redirecting...');
    setShowToast(true);

    // Wait for toast to show, then logout and navigate
    setTimeout(() => {
      logout();
      navigate('/admin', { state: { logoutSuccess: true } });
    }, 1000);
  };

  // Calculate percentage changes (mock)
  const getPercentageChange = (type) => {
    const changes = {
      queries: 12,
      users: 8,
      satisfaction: 3,
      response_time: -5
    };
    return changes[type] || 0;
  };

  // Prepare pie chart data (positive, negative, and neutral)
  const sentimentData = [
    { name: 'Positive', value: analytics.sentiment.positive, color: '#10B981' },  // Green
    { name: 'Neutral', value: analytics.sentiment.neutral || 0, color: '#6B7280' },  // Gray
    { name: 'Negative', value: analytics.sentiment.negative, color: '#EF4444' }  // Red
  ].filter(item => item.value > 0);  // Only show categories with data

  const MetricCard = ({ icon, title, value, change, suffix = '' }) => (
    <Card
      sx={{
        p: 3,
        height: '100%',
        background: 'white',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
            {title}
          </Typography>
        </Box>
        {change !== undefined && (
          <Chip
            icon={change >= 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
            label={`${change > 0 ? '+' : ''}${change}% from last week`}
            size="small"
            sx={{
              background: change >= 0 ? '#D1FAE5' : '#FEE2E2',
              color: change >= 0 ? '#065F46' : '#991B1B',
              fontWeight: 600,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: change >= 0 ? '#065F46' : '#991B1B'
              }
            }}
          />
        )}
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
        {value}{suffix}
      </Typography>
      {change !== undefined && change < 0 && (
        <Typography variant="caption" sx={{ color: '#EF4444' }}>
          Within target range
        </Typography>
      )}
    </Card>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: '#F9FAFB',
        pb: 4
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'white',
          borderBottom: '1px solid #E5E7EB',
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  padding: 1,
                  background: 'white',
                  borderRadius: '8px',
                }}
              >
                <img
                  src={MHFALogo}
                  alt="Mental Health First Aid Logo"
                  style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
                />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
                  Learning Navigator
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Admin"
                sx={{
                  background: AccessibleColors.primary.main,
                  color: 'white',
                  fontWeight: 600
                }}
              />
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  color: '#DC2626',
                  borderColor: '#FCA5A5',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#DC2626',
                    background: '#FEF2F2'
                  }
                }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Metric Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <MetricCard
                  icon={<ChatIcon sx={{ color: '#3B82F6', fontSize: 24 }} />}
                  title="Total Queries"
                  value={analytics.total_queries}
                  change={getPercentageChange('queries')}
                />
              </Grid>
            </Grid>

            {/* Tabs */}
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    '&.Mui-selected': {
                      color: AccessibleColors.primary.main
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: AccessibleColors.primary.main,
                    height: 3
                  }
                }}
              >
                <Tab label="Overview" />
                <Tab label="Top Questions" />
                <Tab label="Conversation Logs" />
                <Tab label="User Management" />
              </Tabs>
            </Box>

            {/* Overview Tab Content */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* Usage Trends Chart */}
                <Grid item xs={12} md={8}>
                  <Card
                    sx={{
                      p: 3,
                      height: '400px',
                      background: 'white',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        Usage Trends
                      </Typography>
                      <IconButton onClick={fetchAnalytics} size="small">
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={usageTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '0.75rem' }} />
                        <YAxis stroke="#6B7280" style={{ fontSize: '0.75rem' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="queries"
                          stroke="#EA5E29"
                          strokeWidth={3}
                          dot={{ fill: '#EA5E29', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* User Sentiment Pie Chart */}
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{
                      p: 3,
                      height: '400px',
                      background: 'white',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3 }}>
                      User Sentiment
                    </Typography>
                    <ResponsiveContainer width="100%" height="60%">
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 3 }}>
                      {sentimentData.map((item) => (
                        <Box
                          key={item.name}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '4px',
                                background: item.color
                              }}
                            />
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                            {item.value > 0
                              ? `${Math.round((item.value / analytics.total_queries) * 100)}%`
                              : '0%'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card
                        onClick={() => navigate("/admin-documents")}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: AccessibleColors.primary.main
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Manage Documents
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          Upload and organize knowledge base PDFs
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card
                        onClick={() => navigate("/admin-analytics")}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: AccessibleColors.primary.main
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Analytics
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          View detailed usage statistics
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card
                        onClick={() => navigate("/admin-queries")}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: AccessibleColors.primary.main
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Escalated Queries
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          Review queries requiring attention
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card
                        onClick={() => navigate("/admin-conversations")}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: AccessibleColors.primary.main
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Conversation Logs
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          View chat history with sentiment
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}

            {/* Top Questions Tab */}
            {activeTab === 1 && (
              <Card sx={{ p: 3, background: 'white', border: '1px solid #E5E7EB' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3 }}>
                  Most Frequent Questions
                </Typography>
                {analytics.conversations.length > 0 ? (
                  <Box>
                    {(() => {
                      // Aggregate questions by query text and count frequency
                      const questionFrequency = {};
                      analytics.conversations.forEach(conv => {
                        const query = (conv.query || '').trim();
                        if (query) {
                          if (!questionFrequency[query]) {
                            questionFrequency[query] = {
                              count: 0,
                              sentiments: { positive: 0, negative: 0, neutral: 0 },
                              lastAsked: conv.timestamp
                            };
                          }
                          questionFrequency[query].count += 1;
                          const sentiment = conv.sentiment || 'neutral';
                          questionFrequency[query].sentiments[sentiment] = (questionFrequency[query].sentiments[sentiment] || 0) + 1;
                          // Keep track of most recent timestamp
                          if (new Date(conv.timestamp) > new Date(questionFrequency[query].lastAsked)) {
                            questionFrequency[query].lastAsked = conv.timestamp;
                          }
                        }
                      });

                      // Convert to array and sort by frequency (most asked first)
                      const sortedQuestions = Object.entries(questionFrequency)
                        .map(([query, data]) => ({ query, ...data }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 10); // Top 10 most frequent

                      return sortedQuestions.map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 2,
                            mb: 2,
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            '&:hover': {
                              background: '#F9FAFB'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                {item.query}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                                  Asked {item.count} {item.count === 1 ? 'time' : 'times'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                                  •
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                                  Last asked: {new Date(item.lastAsked).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                              </Box>
                              {/* Sentiment breakdown */}
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                {item.sentiments.positive > 0 && (
                                  <Chip
                                    label={`👍 ${item.sentiments.positive}`}
                                    size="small"
                                    sx={{
                                      background: '#D1FAE5',
                                      color: '#065F46',
                                      fontWeight: 600,
                                      height: '20px',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                )}
                                {item.sentiments.negative > 0 && (
                                  <Chip
                                    label={`👎 ${item.sentiments.negative}`}
                                    size="small"
                                    sx={{
                                      background: '#FEE2E2',
                                      color: '#991B1B',
                                      fontWeight: 600,
                                      height: '20px',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                )}
                                {item.sentiments.neutral > 0 && (
                                  <Chip
                                    label={`😐 ${item.sentiments.neutral}`}
                                    size="small"
                                    sx={{
                                      background: '#F3F4F6',
                                      color: '#6B7280',
                                      fontWeight: 600,
                                      height: '20px',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                            <Chip
                              label={`#${idx + 1}`}
                              sx={{
                                background: '#064F80',
                                color: 'white',
                                fontWeight: 700,
                                minWidth: '40px'
                              }}
                            />
                          </Box>
                        </Box>
                      ));
                    })()}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: '#6B7280' }}>
                      No questions recorded yet
                    </Typography>
                  </Box>
                )}
              </Card>
            )}

            {/* Conversation Logs Tab */}
            {activeTab === 2 && (
              <Card sx={{ p: 3, background: 'white', border: '1px solid #E5E7EB' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                    Recent Conversations
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/admin-conversations')}
                    sx={{
                      background: AccessibleColors.primary.main,
                      '&:hover': {
                        background: AccessibleColors.primary.dark
                      }
                    }}
                  >
                    View All
                  </Button>
                </Box>
                {analytics.conversations.length > 0 ? (
                  <Box>
                    {analytics.conversations.slice(0, 5).map((conv, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 3,
                          mb: 2,
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          '&:hover': {
                            background: '#F9FAFB'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            Session: {conv.session_id?.substring(0, 12)}...
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {new Date(conv.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Q: {conv.query}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6B7280',
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          A: {conv.response}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={conv.sentiment || 'neutral'}
                            size="small"
                            sx={{
                              background:
                                conv.sentiment === 'positive'
                                  ? '#D1FAE5'
                                  : conv.sentiment === 'negative'
                                  ? '#FEE2E2'
                                  : '#F3F4F6',
                              color:
                                conv.sentiment === 'positive'
                                  ? '#065F46'
                                  : conv.sentiment === 'negative'
                                  ? '#991B1B'
                                  : '#6B7280',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: '#6B7280' }}>
                      No conversations recorded yet
                    </Typography>
                  </Box>
                )}
              </Card>
            )}

            {/* User Management Tab */}
            {activeTab === 3 && (
              <Card sx={{ p: 3, background: 'white', border: '1px solid #E5E7EB' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3 }}>
                  User Statistics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                        Total Active Users
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: '#111827' }}>
                        {analytics.user_count}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                        Total Interactions
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: '#111827' }}>
                        {analytics.conversations.length}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                      User Engagement by Sentiment
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Card sx={{ flex: 1, minWidth: 200, p: 2, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                        <Typography variant="body2" sx={{ color: '#065F46', mb: 0.5 }}>
                          Positive Interactions
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#065F46' }}>
                          {analytics.sentiment.positive}
                        </Typography>
                      </Card>
                      <Card sx={{ flex: 1, minWidth: 200, p: 2, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <Typography variant="body2" sx={{ color: '#991B1B', mb: 0.5 }}>
                          Negative Interactions
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#991B1B' }}>
                          {analytics.sentiment.negative}
                        </Typography>
                      </Card>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            )}
          </>
        )}
      </Container>

      {/* Toast Notification */}
      <Snackbar
        open={showToast}
        autoHideDuration={3000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowToast(false)}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
