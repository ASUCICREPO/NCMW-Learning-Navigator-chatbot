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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  CheckCircle as ResolveIcon,
  PlayArrow as InProgressIcon,
  Pending as PendingIcon,
} from "@mui/icons-material";
import axios from "axios";
import AdminAppHeader from "./AdminAppHeader";
import { DOCUMENTS_API } from "../utilities/constants";
import { getIdToken } from "../utilities/auth";

const ESCALATED_QUERIES_API = `${DOCUMENTS_API}escalated-queries`;

const statusColors = {
  pending: "#EA5E29",
  in_progress: "#7FD3EE",
  resolved: "#4CAF50",
};

const statusIcons = {
  pending: <PendingIcon />,
  in_progress: <InProgressIcon />,
  resolved: <ResolveIcon />,
};

function EscalatedQueries() {
  const [queries, setQueries] = useState([]);
  const [filteredQueries, setFilteredQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [currentTab, setCurrentTab] = useState("all");
  const [summary, setSummary] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, queries]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getIdToken();
      const { data } = await axios.get(ESCALATED_QUERIES_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQueries(data.queries || []);
      setSummary(data.summary || { pending: 0, in_progress: 0, resolved: 0 });
    } catch (err) {
      console.error("Failed to fetch escalated queries:", err);
      setError(
        err.response?.data?.error ||
          "Failed to load escalated queries. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const filterQueries = () => {
    if (currentTab === "all") {
      setFilteredQueries(queries);
    } else {
      setFilteredQueries(queries.filter((q) => q.status === currentTab));
    }
  };

  const handleViewDetails = (query) => {
    setSelectedQuery(query);
    setUpdateStatus(query.status);
    setAdminNotes(query.admin_notes || "");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedQuery(null);
    setUpdateStatus("");
    setAdminNotes("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedQuery) return;

    try {
      setUpdating(true);
      const token = await getIdToken();
      await axios.put(
        ESCALATED_QUERIES_API,
        {
          query_id: selectedQuery.query_id,
          timestamp: selectedQuery.timestamp,
          status: updateStatus,
          admin_notes: adminNotes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refresh the queries list
      await fetchQueries();
      handleCloseDialog();
    } catch (err) {
      console.error("Failed to update query status:", err);
      setError(
        err.response?.data?.error ||
          "Failed to update query status. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
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
          Escalated User Queries
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              background: "linear-gradient(135deg, #EA5E29 0%, #CB5223 100%)",
              color: "white",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.pending}
            </Typography>
            <Typography variant="body1">Pending</Typography>
          </Paper>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              background: "linear-gradient(135deg, #7FD3EE 0%, #4FB3D4 100%)",
              color: "white",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.in_progress}
            </Typography>
            <Typography variant="body1">In Progress</Typography>
          </Paper>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
              color: "white",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.resolved}
            </Typography>
            <Typography variant="body1">Resolved</Typography>
          </Paper>
        </Box>

        {/* Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
          >
            <Tab label="All" value="all" />
            <Tab label="Pending" value="pending" />
            <Tab label="In Progress" value="in_progress" />
            <Tab label="Resolved" value="resolved" />
          </Tabs>
        </Box>

        {/* Queries Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredQueries.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No escalated queries found.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#F4EFE8" }}>
                  <TableCell>
                    <strong>Query ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Timestamp</strong>
                  </TableCell>
                  <TableCell>
                    <strong>User Email</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Question</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Actions</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQueries.map((query) => (
                  <TableRow key={query.query_id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {query.query_id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{formatTimestamp(query.timestamp)}</TableCell>
                    <TableCell>{query.user_email}</TableCell>
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
                        {query.question}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcons[query.status]}
                        label={query.status.replace("_", " ").toUpperCase()}
                        sx={{
                          backgroundColor: statusColors[query.status],
                          color: "white",
                          fontWeight: 600,
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleViewDetails(query)}
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

      {/* Query Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #064F80 0%, #053E66 100%)",
            color: "white",
            fontFamily: "Calibri, Ideal Sans, Arial, sans-serif",
          }}
        >
          Query Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedQuery && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Query ID
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontFamily: "monospace", mb: 2 }}
                >
                  {selectedQuery.query_id}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Timestamp
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {formatTimestamp(selectedQuery.timestamp)}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  User Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedQuery.user_email}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Question
                </Typography>
                <Paper
                  sx={{ p: 2, mb: 2, backgroundColor: "#F4EFE8" }}
                  elevation={0}
                >
                  <Typography variant="body1">
                    {selectedQuery.question}
                  </Typography>
                </Paper>

                <Typography variant="subtitle2" color="text.secondary">
                  Agent Response
                </Typography>
                <Paper
                  sx={{ p: 2, mb: 3, backgroundColor: "#EAF2F4" }}
                  elevation={0}
                >
                  <Typography variant="body1">
                    {selectedQuery.agent_response}
                  </Typography>
                </Paper>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Admin Notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about actions taken or resolution details..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={updating}
            sx={{
              background:
                "linear-gradient(135deg, #EA5E29 0%, #CB5223 100%)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #CB5223 0%, #B3421C 100%)",
              },
            }}
          >
            {updating ? <CircularProgress size={24} /> : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EscalatedQueries;
