import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  Grid,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  SentimentVerySatisfied as HappyIcon,
  SentimentNeutral as NeutralIcon,
  SentimentVeryDissatisfied as SadIcon,
} from "@mui/icons-material";
import axios from "axios";
import AdminAppHeader from "./AdminAppHeader";
import { DOCUMENTS_API } from "../utilities/constants";
import { getIdToken } from "../utilities/auth";

const ANALYTICS_API = `${DOCUMENTS_API}session-logs`;

const sentimentColors = {
  positive: "#4CAF50",
  neutral: "#FFC107",
  negative: "#F44336",
};

const sentimentIcons = {
  positive: <HappyIcon />,
  neutral: <NeutralIcon />,
  negative: <SadIcon />,
};

function ConversationLogs() {
  const [timeframe, setTimeframe] = useState("today");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedConv, setSelectedConv] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sentiment, setSentiment] = useState({});
  const [avgSatisfaction, setAvgSatisfaction] = useState(0);

  useEffect(() => {
    fetchConversations();
  }, [timeframe]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getIdToken();
      const { data } = await axios.get(ANALYTICS_API, {
        params: { timeframe },
        headers: { Authorization: `Bearer ${token}` },
      });

      setConversations(data.conversations || []);
      setSentiment(data.sentiment || {});
      setAvgSatisfaction(data.avg_satisfaction || 0);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Failed to load conversation logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (conv) => {
    setSelectedConv(conv);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedConv(null);
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getSentimentChipColor = (score) => {
    if (score >= 70) return "#4CAF50";
    if (score >= 40) return "#FFC107";
    return "#F44336";
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Fixed header */}
      <Box sx={{ position: "fixed", width: "100%", zIndex: 1200 }}>
        <AdminAppHeader showSwitch={false} />
      </Box>

      {/* Main content */}
      <Box sx={{ pt: "6rem", px: 4, pb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Calibri, Ideal Sans, Arial, sans-serif",
            fontWeight: 700,
            color: "#064F80",
            mb: 3,
          }}
        >
          Conversation Logs & Sentiment Analysis
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Timeframe selector */}
        <FormControl sx={{ mb: 3, minWidth: 200 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            label="Timeframe"
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="weekly">This Week</MenuItem>
            <MenuItem value="monthly">This Month</MenuItem>
            <MenuItem value="yearly">This Year</MenuItem>
          </Select>
        </FormControl>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)", color: "white" }}>
              <HappyIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {sentiment.positive || 0}
              </Typography>
              <Typography variant="body1">Positive</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, #FFC107 0%, #FFA000 100%)", color: "white" }}>
              <NeutralIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {sentiment.neutral || 0}
              </Typography>
              <Typography variant="body1">Neutral</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, #F44336 0%, #D32F2F 100%)", color: "white" }}>
              <SadIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {sentiment.negative || 0}
              </Typography>
              <Typography variant="body1">Negative</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, textAlign: "center", background: "linear-gradient(135deg, #064F80 0%, #053E66 100%)", color: "white" }}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>Average Satisfaction</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {avgSatisfaction}
              </Typography>
              <Typography variant="body1">out of 100</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Conversations Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : conversations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No conversations found for this timeframe.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F4EFE8" }}>
                  <TableCell><strong>Time</strong></TableCell>
                  <TableCell><strong>Session</strong></TableCell>
                  <TableCell><strong>Query</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Sentiment</strong></TableCell>
                  <TableCell><strong>Score</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conversations.map((conv, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{formatTimestamp(conv.timestamp)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {conv.session_id?.substring(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {conv.query}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={conv.category}
                        size="small"
                        sx={{ backgroundColor: "#7FD3EE", color: "white" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={sentimentIcons[conv.sentiment]}
                        label={conv.sentiment.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: sentimentColors[conv.sentiment],
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${conv.satisfaction_score}/100`}
                        size="small"
                        sx={{
                          backgroundColor: getSentimentChipColor(conv.satisfaction_score),
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleViewDetails(conv)}
                        sx={{ color: "#064F80" }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Conversation Detail Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #064F80 0%, #053E66 100%)",
            color: "white",
            fontFamily: "Calibri, Ideal Sans, Arial, sans-serif",
          }}
        >
          Conversation Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedConv && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Session ID
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: "monospace", mb: 2 }}>
                {selectedConv.session_id}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Timestamp
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {formatTimestamp(selectedConv.timestamp)}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">
                Category
              </Typography>
              <Chip
                label={selectedConv.category}
                sx={{ mb: 2, backgroundColor: "#7FD3EE", color: "white" }}
              />

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                User Question
              </Typography>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: "#F4EFE8" }} elevation={0}>
                <Typography variant="body1">{selectedConv.query}</Typography>
              </Paper>

              <Typography variant="subtitle2" color="text.secondary">
                Bot Response
              </Typography>
              <Paper sx={{ p: 2, mb: 3, backgroundColor: "#EAF2F4" }} elevation={0}>
                <Typography variant="body1">{selectedConv.response}</Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sentiment
                  </Typography>
                  <Chip
                    icon={sentimentIcons[selectedConv.sentiment]}
                    label={selectedConv.sentiment.toUpperCase()}
                    sx={{
                      backgroundColor: sentimentColors[selectedConv.sentiment],
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Satisfaction Score
                  </Typography>
                  <Chip
                    label={`${selectedConv.satisfaction_score}/100`}
                    sx={{
                      backgroundColor: getSentimentChipColor(selectedConv.satisfaction_score),
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ConversationLogs;
