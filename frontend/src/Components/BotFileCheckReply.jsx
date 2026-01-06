import React, { useState, useEffect } from "react";
import {
  Typography,
  CircularProgress,
  Box,
  Chip,
  Paper,
  Fade,
  Link,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import PdfIcon from "../Assets/pdf_logo.svg";
import MHFALogo from "../Assets/mhfa_logo.png";

function BotFileCheckReply({ message, fileName, fileStatus, citations, isLoading, messageId, sessionId, onFeedback }) {
  const theme = useTheme();
  const [animationState, setAnimationState] = useState("checking");
  const [dots, setDots] = useState("");
  const [feedback, setFeedback] = useState(null); // null, 'positive', or 'negative'
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const handleFeedback = async (type) => {
    if (feedbackSubmitting || !messageId) return;

    setFeedbackSubmitting(true);
    const newFeedback = feedback === type ? null : type; // Toggle if same type clicked
    setFeedback(newFeedback);

    if (onFeedback) {
      await onFeedback({
        messageId,
        sessionId,
        feedback: newFeedback,
        message,
        timestamp: new Date().toISOString()
      });
    }

    setFeedbackSubmitting(false);
  };

  // Function to convert URLs in text to clickable links
  const renderMessageWithLinks = (text) => {
    if (!text) return null;

    // Regular expression to match URLs
    // eslint-disable-next-line no-useless-escape
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <Link
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              borderBottom: `2px solid ${theme.palette.primary.main}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: theme.palette.primary.dark,
                borderBottomColor: theme.palette.primary.dark,
                backgroundColor: theme.palette.primary.main + '08',
              },
            }}
          >
            {part}
            <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
          </Link>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    let timeout;
    if (animationState === "checking") {
      if (fileStatus === "File page limit check succeeded.") {
        timeout = setTimeout(() => setAnimationState("success"), 1000);
      } else if (fileStatus === "File size limit exceeded." || fileStatus === "Network Error. Please try again later.") {
        timeout = setTimeout(() => setAnimationState("fail"), 1000);
      }
    }
    return () => clearTimeout(timeout);
  }, [animationState, fileStatus]);

  // Animated dots for loading state
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? "" : prev + ".");
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);


  // Loading state
  if (isLoading) {
    return (
      <Fade in={true} timeout={300}>
        <Box display="flex" alignItems="flex-start" mb={2}>
          <Box
            sx={{
              width: { xs: 32, sm: 36, md: 40 },
              height: { xs: 32, sm: 36, md: 40 },
              mr: { xs: 1, sm: 1.5 },
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid',
              borderColor: theme.palette.primary.main,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(234,94,41,0.1) 100%)',
                pointerEvents: 'none',
                zIndex: 1,
              },
            }}
          >
            <img
              src={MHFALogo}
              alt="MHFA"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'relative',
                zIndex: 0,
              }}
            />
          </Box>
          <Paper
            elevation={2}
            sx={{
              backgroundColor: theme.palette.background.botMessage,
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 1, sm: 1.25, md: 1.5 },
              borderRadius: { xs: '16px 16px 16px 4px', sm: '20px 20px 20px 4px' },
              maxWidth: { xs: "85%", sm: "75%", md: "70%" },
              boxShadow: '0 2px 8px rgba(234, 94, 41, 0.1)',
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress
                size={{ xs: 16, sm: 18, md: 20 }}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  color: theme.palette.text.secondary,
                  fontStyle: 'italic',
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                }}
              >
                Thinking{dots}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in={true} timeout={300}>
      <Box display="flex" alignItems="flex-start" mb={2}>
        <Box
          sx={{
            width: { xs: 32, sm: 36, md: 40 },
            height: { xs: 32, sm: 36, md: 40 },
            mr: { xs: 1, sm: 1.5 },
            position: 'relative',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderColor: theme.palette.primary.main,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(234,94,41,0.1) 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            },
          }}
        >
          <img
            src={MHFALogo}
            alt="MHFA"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 0,
            }}
          />
        </Box>
        <Paper
          elevation={2}
          sx={{
            backgroundColor: theme.palette.background.botMessage,
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 1, sm: 1.25, md: 1.5 },
            borderRadius: { xs: '16px 16px 16px 4px', sm: '20px 20px 20px 4px' },
            maxWidth: { xs: "85%", sm: "75%", md: "70%" },
            wordBreak: "break-word",
            boxShadow: '0 2px 8px rgba(234, 94, 41, 0.1)',
          }}
        >
          {fileStatus ? (
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <img
                  src={PdfIcon}
                  alt="PDF Icon"
                  style={{ width: 36, height: 36, borderRadius: "50%" }}
                />
                <Typography
                  sx={{
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  {fileName}
                </Typography>
              </Box>
              <Box className={`file-status-box ${animationState}`}>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif' }}
                >
                  {animationState === "checking" ? "Checking file size..." : fileStatus}
                </Typography>
                {animationState === "checking" && (
                  <CircularProgress size={20} sx={{ ml: 1 }} />
                )}
              </Box>
              {animationState === "success" && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: theme.palette.success.main,
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  }}
                >
                  File uploaded successfully
                </Typography>
              )}
              {animationState === "fail" && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: theme.palette.error.main,
                    fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  }}
                >
                  {fileStatus}
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Typography
                variant="body1"
                component="div"
                sx={{
                  fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
                  lineHeight: 1.6,
                  color: theme.palette.text.primary,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {renderMessageWithLinks(message)}
              </Typography>
              {citations && citations.length > 0 && (
                <Box
                  mt={{ xs: 1.5, sm: 2 }}
                  pt={{ xs: 1, sm: 1.5 }}
                  sx={{
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      display: 'block',
                      mb: 1,
                      fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                      fontSize: { xs: '0.75rem', sm: '0.8rem' },
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    📚 Sources
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75 } }}>
                    {citations.map((citation, idx) =>
                      citation.references && citation.references.map((ref, refIdx) => (
                        <Chip
                          key={`${idx}-${refIdx}`}
                          icon={<ArticleIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
                          label={ref.title || `Document ${idx + 1}`}
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => {
                            if (ref.source) {
                              window.open(ref.source, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          sx={{
                            fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                            fontWeight: 500,
                            backgroundColor: theme.palette.primary.main + '08',
                            transition: 'all 0.2s ease',
                            cursor: ref.source ? 'pointer' : 'default',
                            '& .MuiChip-icon': {
                              color: theme.palette.primary.main,
                            },
                            '&:hover': {
                              backgroundColor: theme.palette.primary.main + '15',
                              borderColor: theme.palette.primary.dark,
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(234, 94, 41, 0.2)',
                            },
                          }}
                        />
                      ))
                    )}
                  </Box>
                </Box>
              )}
              {/* Feedback Buttons - Only show for actual bot responses, not file uploads */}
              {!fileStatus && messageId && (
                <Box
                  mt={{ xs: 1, sm: 1.5 }}
                  pt={{ xs: 0.75, sm: 1 }}
                  sx={{
                    borderTop: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                      color: theme.palette.text.secondary,
                      fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                      mr: 0.5,
                    }}
                  >
                    Was this helpful?
                  </Typography>
                  <Tooltip title="Good response" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback('positive')}
                      disabled={feedbackSubmitting}
                      sx={{
                        padding: { xs: '4px', sm: '6px' },
                        color: feedback === 'positive' ? theme.palette.success.main : theme.palette.text.secondary,
                        backgroundColor: feedback === 'positive' ? theme.palette.success.main + '15' : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.palette.success.main + '20',
                          color: theme.palette.success.main,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ThumbUpIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Poor response" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback('negative')}
                      disabled={feedbackSubmitting}
                      sx={{
                        padding: { xs: '4px', sm: '6px' },
                        color: feedback === 'negative' ? theme.palette.error.main : theme.palette.text.secondary,
                        backgroundColor: feedback === 'negative' ? theme.palette.error.main + '15' : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.palette.error.main + '20',
                          color: theme.palette.error.main,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ThumbDownIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
                    </IconButton>
                  </Tooltip>
                  {feedback && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                        color: theme.palette.text.secondary,
                        fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                        ml: 0.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Thank you!
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Fade>
  );
}

export default BotFileCheckReply;
