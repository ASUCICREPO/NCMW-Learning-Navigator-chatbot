import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  SentimentVerySatisfied as HappyIcon,
  SentimentNeutral as NeutralIcon,
  SentimentVeryDissatisfied as SadIcon,
  TrendingUp as TrendingIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  NotificationsActive as NotificationIcon,
  Description as DocumentIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DOCUMENTS_API } from "../utilities/constants";
import { getIdToken } from "../utilities/auth";
import AdminAppHeader from "./AdminAppHeader";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const ANALYTICS_API = `${DOCUMENTS_API}session-logs`;

// Chart color schemes
const SENTIMENT_COLORS = {
  positive: '#4CAF50',
  neutral: '#FFC107',
  negative: '#F44336'
};

function AdminDashboardSimple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    avg_satisfaction: 0,
    user_count: 0,
    conversations: []
  });
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds for real-time data
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      const { data } = await axios.get(ANALYTICS_API, {
        params: { timeframe: 'today' },
        headers: { Authorization: `Bearer ${token}` },
      });

      setAnalytics({
        sentiment: data.sentiment || { positive: 0, neutral: 0, negative: 0 },
        avg_satisfaction: data.avg_satisfaction || 0,
        user_count: data.user_count || 0,
        conversations: data.conversations || []
      });
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (sessionId) => {
    setExpandedRows(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#F44336';
      default: return '#FFC107';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <HappyIcon />;
      case 'negative': return <SadIcon />;
      default: return <NeutralIcon />;
    }
  };

  // Prepare chart data
  const sentimentChartData = [
    { name: 'Positive', value: analytics.sentiment.positive || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: analytics.sentiment.neutral || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: analytics.sentiment.negative || 0, color: SENTIMENT_COLORS.negative },
  ];

  // Category distribution
  const categoryData = analytics.conversations.reduce((acc, conv) => {
    const category = conv.category || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value
  }));

  // Satisfaction score distribution
  const satisfactionRanges = {
    'Excellent (80-100)': 0,
    'Good (60-79)': 0,
    'Fair (40-59)': 0,
    'Poor (0-39)': 0
  };

  analytics.conversations.forEach(conv => {
    const score = conv.satisfaction_score || 50;
    if (score >= 80) satisfactionRanges['Excellent (80-100)']++;
    else if (score >= 60) satisfactionRanges['Good (60-79)']++;
    else if (score >= 40) satisfactionRanges['Fair (40-59)']++;
    else satisfactionRanges['Poor (0-39)']++;
  });

  const satisfactionChartData = Object.entries(satisfactionRanges).map(([name, value]) => ({
    name,
    value
  }));

  // Hourly activity
  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8; // 8 AM to 7 PM
    const conversations = analytics.conversations.filter(conv => {
      const convHour = new Date(conv.timestamp).getHours();
      return convHour === hour;
    }).length;
    return {
      hour: `${hour}:00`,
      conversations
    };
  });

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          background: 'white',
          border: '2px solid #064F80',
          borderRadius: '8px',
          p: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#064F80' }}>
            {payload[0].name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {payload[0].value} {payload[0].name === 'conversations' ? 'conversations' : ''}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ minHeight: "100vh", background: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ position: "fixed", width: "100%", zIndex: 1200 }}>
        <AdminAppHeader showSwitch={false} />
      </Box>

      <Container maxWidth="xl" sx={{ pt: '100px', pb: 4 }}>
        {/* Page Title */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 700,
            color: '#064F80',
            mb: 4,
          }}
        >
          Admin Dashboard - Today's Activity
        </Typography>

        {/* Basic Analytics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* User Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #064F80 0%, #053E66 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(6, 79, 128, 0.3)',
              }}
            >
              <PeopleIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                {loading ? <CircularProgress size={30} sx={{ color: 'white' }} /> : analytics.user_count}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Total Users
              </Typography>
            </Card>
          </Grid>

          {/* Positive Sentiment */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
              }}
            >
              <HappyIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                {loading ? <CircularProgress size={30} sx={{ color: 'white' }} /> : analytics.sentiment.positive || 0}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Positive
              </Typography>
            </Card>
          </Grid>

          {/* Neutral Sentiment */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #FFC107 0%, #FFA000 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
              }}
            >
              <NeutralIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                {loading ? <CircularProgress size={30} sx={{ color: 'white' }} /> : analytics.sentiment.neutral || 0}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Neutral
              </Typography>
            </Card>
          </Grid>

          {/* Negative Sentiment */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
              }}
            >
              <SadIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                {loading ? <CircularProgress size={30} sx={{ color: 'white' }} /> : analytics.sentiment.negative || 0}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Negative
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Average Satisfaction Score */}
        <Card sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #7FD3EE 0%, #4FB3D4 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Average Satisfaction Score
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {loading ? <CircularProgress size={30} sx={{ color: 'white' }} /> : `${analytics.avg_satisfaction}/100`}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Analytics Charts Section */}
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600,
            color: '#064F80',
            mb: 3,
          }}
        >
          Analytics & Trends
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Sentiment Distribution Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '400px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#064F80', mb: 2 }}>
                Sentiment Distribution
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Grid>

          {/* Satisfaction Score Distribution Bar Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '400px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#064F80', mb: 2 }}>
                Satisfaction Score Distribution
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={satisfactionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="name"
                      angle={-15}
                      textAnchor="end"
                      height={80}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#064F80" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Grid>

          {/* Category Distribution Bar Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '400px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#064F80', mb: 2 }}>
                Query Categories
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#EA5E29" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Grid>

          {/* Hourly Activity Area Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, height: '400px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#064F80', mb: 2 }}>
                Hourly Activity (Today)
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7FD3EE" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#7FD3EE" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="hour"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      stroke="#7FD3EE"
                      fillOpacity={1}
                      fill="url(#colorConversations)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* Navigation Cards */}
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600,
            color: '#064F80',
            mb: 3,
          }}
        >
          Admin Tools
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Escalated Queries Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => navigate("/admin-queries")}
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'white',
                border: '3px solid transparent',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(234, 94, 41, 0.3)',
                  borderColor: '#EA5E29',
                },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EA5E29 0%, #CB5223 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}
                >
                  <NotificationIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    fontWeight: 600,
                    color: '#064F80',
                    mb: 1,
                  }}
                >
                  Escalated Queries
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    color: '#666',
                  }}
                >
                  Review and respond to user queries requiring admin attention
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Manage Documents Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => navigate("/admin-documents")}
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'white',
                border: '3px solid transparent',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(127, 211, 238, 0.3)',
                  borderColor: '#7FD3EE',
                },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7FD3EE 0%, #4FB3D4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}
                >
                  <DocumentIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    fontWeight: 600,
                    color: '#064F80',
                    mb: 1,
                  }}
                >
                  Manage Documents
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    color: '#666',
                  }}
                >
                  Upload, edit, and organize knowledge base documents
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Conversation Logs Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => navigate("/admin-conversations")}
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'white',
                border: '3px solid transparent',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(234, 94, 41, 0.3)',
                  borderColor: '#EA5E29',
                },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EA5E29 0%, #CB5223 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}
                >
                  <ChatIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    fontWeight: 600,
                    color: '#064F80',
                    mb: 1,
                  }}
                >
                  Conversation Logs
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    color: '#666',
                  }}
                >
                  View detailed conversation logs with sentiment analysis
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Analytics Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => navigate("/admin-analytics")}
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'white',
                border: '3px solid transparent',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(127, 211, 238, 0.3)',
                  borderColor: '#7FD3EE',
                },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7FD3EE 0%, #4FB3D4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}
                >
                  <AnalyticsIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    fontWeight: 600,
                    color: '#064F80',
                    mb: 1,
                  }}
                >
                  Analytics
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    color: '#666',
                  }}
                >
                  View usage statistics and user query insights
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Conversation Logs */}
        <Card sx={{ p: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
              fontWeight: 600,
              color: '#064F80',
              mb: 3,
            }}
          >
            Recent Conversations ({analytics.conversations.length})
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : analytics.conversations.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4, color: '#666' }}>
              No conversations yet today
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Session ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Sentiment</TableCell>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Score</TableCell>
                    <TableCell sx={{ fontWeight: 600, background: '#f5f5f5' }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.conversations.map((conv, index) => (
                    <React.Fragment key={`${conv.session_id}-${index}`}>
                      <TableRow hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {conv.session_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {new Date(conv.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={conv.category || 'Unknown'}
                            size="small"
                            sx={{
                              background: '#7FD3EE',
                              color: 'white',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getSentimentIcon(conv.sentiment)}
                            label={conv.sentiment || 'neutral'}
                            size="small"
                            sx={{
                              background: getSentimentColor(conv.sentiment),
                              color: 'white',
                              fontWeight: 500,
                              '& .MuiChip-icon': {
                                color: 'white'
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {conv.satisfaction_score || 50}/100
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRow(`${conv.session_id}-${index}`)}
                          >
                            {expandedRows[`${conv.session_id}-${index}`] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedRows[`${conv.session_id}-${index}`] ? undefined : 'none' }}>
                          <Collapse in={expandedRows[`${conv.session_id}-${index}`]} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, px: 3, background: '#f9f9f9' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#064F80', mb: 1 }}>
                                Query:
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 2, color: '#333' }}>
                                {conv.query || 'No query text'}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#064F80', mb: 1 }}>
                                Response:
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#666', whiteSpace: 'pre-wrap' }}>
                                {conv.response || 'No response text'}
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Container>
    </Box>
  );
}

export default AdminDashboardSimple;
