import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Grid,
  Avatar,
  Typography,
  Box,
  Paper,
  Fade,
  Drawer,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useLocation } from "react-router-dom";
import {
  LocationOn as LocationIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  TipsAndUpdates as TipsIcon,
  QuestionAnswer as QuestionIcon,
  School as SchoolIcon,
  Support as SupportIcon
} from "@mui/icons-material";
import UserAvatar from "../Assets/UserAvatar.svg";
import MHFALogo from "../Assets/mhfa_logo.png";

import axios from "axios";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";
import BotFileCheckReply from "./BotFileCheckReply";
import createMessageBlock from "../utilities/createMessageBlock";
import { ALLOW_FILE_UPLOAD, WEBSOCKET_API, FEEDBACK_API } from "../utilities/constants";
import { useLanguage } from "../utilities/LanguageContext";
import { RECOMMENDATIONS_TEXT } from "../utilities/recommendationsTranslations";

/* ─────────────────────────── Memoized Components ───────────────────────────── */
const UserBubble = React.memo(({ text }) => (
  <Fade in={true} timeout={300}>
    <Box display="flex" justifyContent="flex-end" alignItems="flex-end" mb={2}>
      <Paper
        elevation={2}
        sx={{
          backgroundColor: (theme) => theme.palette.background.userMessage,
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 1, sm: 1.25, md: 1.5 },
          borderRadius: { xs: '16px 16px 4px 16px', sm: '20px 20px 4px 20px' },
          maxWidth: { xs: "85%", sm: "75%", md: "70%" },
          wordBreak: "break-word",
          boxShadow: '0 2px 8px rgba(6, 79, 128, 0.15)',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
            lineHeight: 1.5,
            color: (theme) => theme.palette.text.primary
          }}
        >
          {text}
        </Typography>
      </Paper>
      <Avatar
        src={UserAvatar}
        sx={{
          ml: { xs: 1, sm: 1.5 },
          width: { xs: 32, sm: 36, md: 40 },
          height: { xs: 32, sm: 36, md: 40 },
          bgcolor: (theme) => theme.palette.secondary.main,
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      />
    </Box>
  </Fade>
));

function ChatBody() {
  /* ───────────────────────────────── state ───────────────────────────── */
  const sessionId = useRef(uuidv4()).current;                     // stable per component mount
  const location = useLocation();
  const { language } = useLanguage();
  const TEXT = RECOMMENDATIONS_TEXT[language] || RECOMMENDATIONS_TEXT.EN;
  const initialQueryProcessedRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scrollRef = useRef(null);

  /* ────────────────────────────── auto-scroll ────────────────────────── */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ──────────────────── Handle initial query from recommendations ────── */
  useEffect(() => {
    if (location.state?.initialQuery && !initialQueryProcessedRef.current) {
      const query = location.state.initialQuery;
      initialQueryProcessedRef.current = true;
      // Clear the location state to prevent re-sending on refresh
      window.history.replaceState({}, document.title);
      // Send the initial query after a brief delay to ensure UI is ready
      setTimeout(() => {
        handleSend(query);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /* ─────────────────────────── helpers / UI ──────────────────────────── */
  const addMsg = (block) => setMessages((prev) => [...prev, block]);

  const replaceProcessing = (text) =>
    setMessages((prev) =>
      prev.map((m) =>
        m.status === "PROCESSING"
          ? createMessageBlock(text, "BOT", "TEXT", "RECEIVED")
          : m
      )
    );

  // Reset chat conversation (used when switching languages)
  const resetChat = () => {
    setMessages([]);
    setInputValue("");
    setProcessing(false);
    initialQueryProcessedRef.current = false;
  };

  const handleSend = (msgText) => {
    if (!msgText.trim()) return;

    /* Send question to WebSocket */
    setProcessing(true);
    addMsg(createMessageBlock(msgText, "USER", "TEXT", "SENT"));
    addMsg(createMessageBlock("", "BOT", "TEXT", "PROCESSING"));
    askBot(msgText.trim());
  };

  /* ──────────────────────────── WebSocket call ───────────────────────── */
  const askBot = (question) => {
    const authToken = localStorage.getItem("authToken") || "";
    const socket = new WebSocket(`${WEBSOCKET_API}?token=${authToken}`);

    socket.onopen = () => {
      const payload = {
        action:     "sendMessage",
        querytext:  question,
        session_id: sessionId,
      };
      console.log("🔵 Sent:", payload);
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      /* Ignore empty ping / heartbeat frames */
      if (!event.data || event.data.trim() === "") {
        console.log("📨 (ignored empty frame)");
        return;
      }

      try {
        console.log("📨 Raw:", event.data);
        const { responsetext, citations } = JSON.parse(event.data);

        // Replace processing message with response including citations
        setMessages((prev) =>
          prev.map((m) =>
            m.status === "PROCESSING"
              ? {
                  ...createMessageBlock(responsetext, "BOT", "TEXT", "RECEIVED"),
                  citations: citations || []
                }
              : m
          )
        );
      } catch (err) {
        console.error("❌ JSON parse error:", err);
        replaceProcessing("Error parsing response. Please try again.");
      } finally {
        setProcessing(false);
        socket.close();
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
      replaceProcessing("WebSocket error. Please try again.");
      setProcessing(false);
    };

    socket.onclose = (e) => {
      console.log(`🟠 Socket closed (${e.code})`);
    };
  };

  /* ────────────────────── suggested prompts ─────────────────────────── */
  const suggestedPrompts = [
    { icon: <TipsIcon />, text: TEXT.CHAT_PROMPT_ABOUT_MHFA_DESC, label: TEXT.CHAT_PROMPT_ABOUT_MHFA },
    { icon: <LocationIcon />, text: TEXT.CHAT_PROMPT_INSTRUCTOR_CERT_DESC, label: TEXT.CHAT_PROMPT_INSTRUCTOR_CERT },
    { icon: <AutoAwesomeIcon />, text: TEXT.CHAT_PROMPT_TRAINING_COURSES_DESC, label: TEXT.CHAT_PROMPT_TRAINING_COURSES }
  ];

  const handleSuggestedPrompt = (promptText) => {
    handleSend(promptText);
    setDrawerOpen(false); // Close drawer after selecting a query
  };

  /* ─────────────────────────── feedback handler ───────────────────────────── */
  const handleFeedback = async (feedbackData) => {
    try {
      console.log('Submitting feedback:', feedbackData);
      await axios.post(FEEDBACK_API, feedbackData);
      console.log('Feedback submitted successfully');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Silently fail - don't interrupt user experience
    }
  };

  /* ──────────────────────── sample queries ───────────────────────────── */
  const sampleQueries = language === 'ES' ? [
    {
      category: TEXT.NAV_CATEGORY_GETTING_STARTED,
      icon: <TipsIcon />,
      queries: [
        "¿Qué es Primeros Auxilios en Salud Mental?",
        "¿Cómo funciona la capacitación de MHFA?",
        "¿Cuáles son los beneficios de la certificación MHFA?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_FOR_INSTRUCTORS,
      icon: <SchoolIcon />,
      queries: [
        "¿Cómo me convierto en instructor certificado de MHFA?",
        "¿Cuáles son los requisitos para instructores?",
        "¿Cómo renuevo mi certificación de instructor?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_TRAINING_COURSES,
      icon: <QuestionIcon />,
      queries: [
        "¿Qué cursos de MHFA están disponibles?",
        "¿Cuánto tiempo dura la capacitación de MHFA?",
        "¿Qué temas se cubren en la capacitación de MHFA?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_SUPPORT_RESOURCES,
      icon: <SupportIcon />,
      queries: [
        "¿Dónde puedo encontrar materiales de capacitación?",
        "¿Cómo accedo a MHFA Connect?",
        "¿Qué recursos están disponibles para los estudiantes?"
      ]
    }
  ] : [
    {
      category: TEXT.NAV_CATEGORY_GETTING_STARTED,
      icon: <TipsIcon />,
      queries: [
        "What is Mental Health First Aid?",
        "How does MHFA training work?",
        "What are the benefits of MHFA certification?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_FOR_INSTRUCTORS,
      icon: <SchoolIcon />,
      queries: [
        "How do I become a certified MHFA instructor?",
        "What are the instructor requirements?",
        "How do I renew my instructor certification?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_TRAINING_COURSES,
      icon: <QuestionIcon />,
      queries: [
        "What MHFA courses are available?",
        "How long does MHFA training take?",
        "What topics are covered in MHFA training?"
      ]
    },
    {
      category: TEXT.NAV_CATEGORY_SUPPORT_RESOURCES,
      icon: <SupportIcon />,
      queries: [
        "Where can I find training materials?",
        "How do I access MHFA Connect?",
        "What resources are available for learners?"
      ]
    }
  ];

  /* ─────────────────────────── render helpers ────────────────────────── */
  const WelcomeScreen = useMemo(() => (
    <Fade in={true} timeout={800}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        px={{ xs: 2, sm: 3 }}
        py={{ xs: 3, sm: 4 }}
        sx={{ maxWidth: '800px', margin: '0 auto' }}
      >
        {/* Welcome Message */}
        <Box textAlign="center" mb={{ xs: 3, sm: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
              fontWeight: 600,
              color: (theme) => theme.palette.secondary.main,
              mb: { xs: 1.5, sm: 2 },
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            {TEXT.CHAT_WELCOME_TITLE}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
              color: (theme) => theme.palette.text.secondary,
              fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' },
              lineHeight: 1.6,
            }}
          >
            {TEXT.CHAT_WELCOME_SUBTITLE}
          </Typography>
        </Box>

        {/* Suggested Prompts */}
        <Box width="100%">
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                fontWeight: 600,
                color: (theme) => theme.palette.primary.main,
                mb: { xs: 1.5, sm: 2 },
                textAlign: 'center',
                fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' },
              }}
            >
              {TEXT.CHAT_TRY_ASKING}
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {suggestedPrompts.map((prompt, idx) => (
                <Grid item xs={12} sm={4} key={idx}>
                  <Paper
                    elevation={0}
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: { xs: '12px', sm: '16px' },
                      border: '2px solid',
                      borderColor: (theme) => theme.palette.primary.light + '40',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, rgba(234, 94, 41, 0.03) 0%, rgba(127, 211, 238, 0.03) 100%)',
                      '&:hover': {
                        borderColor: (theme) => theme.palette.primary.main,
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 16px rgba(234, 94, 41, 0.2)',
                        background: 'linear-gradient(135deg, rgba(234, 94, 41, 0.08) 0%, rgba(127, 211, 238, 0.08) 100%)',
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={{ xs: 1, sm: 1.5 }}>
                      <Box
                        sx={{
                          color: (theme) => theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          '& svg': { fontSize: { xs: 20, sm: 22, md: 24 } },
                        }}
                      >
                        {prompt.icon}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          ml: 1,
                          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                          fontWeight: 600,
                          color: (theme) => theme.palette.primary.main,
                          fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                        }}
                      >
                        {prompt.label}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                        color: (theme) => theme.palette.text.secondary,
                        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                        lineHeight: 1.5,
                      }}
                    >
                      {prompt.text}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
        </Box>
      </Box>
    </Fade>
  ), [TEXT, suggestedPrompts, handleSuggestedPrompt]);

  /* ───────────────────────────────── render ──────────────────────────── */

  // Left Navigation Content Component
  const LeftNavContent = ({ showCloseButton = false }) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #064F80 0%, #053E66 100%)',
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
          <Box
            sx={{
              height: { xs: 24, sm: 28 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={MHFALogo}
              alt="MHFA Logo"
              style={{
                height: '100%',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
              fontWeight: 600,
              color: 'white',
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {TEXT.NAV_MENU}
          </Typography>
        </Box>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
            display: showCloseButton ? 'inline-flex' : { xs: 'none', lg: 'inline-flex' },
          }}
        >
          <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
        </IconButton>
      </Box>

      {/* About Section */}
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600,
            color: (theme) => theme.palette.primary.main,
            mb: { xs: 1, sm: 1.5 },
            fontSize: { xs: '1rem', sm: '1.25rem' },
          }}
        >
          {TEXT.NAV_ABOUT_TITLE}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            color: (theme) => theme.palette.text.secondary,
            lineHeight: 1.6,
            mb: 2,
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          }}
        >
          {TEXT.NAV_ABOUT_DESC}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            color: (theme) => theme.palette.text.disabled,
            display: 'block',
            fontSize: { xs: '0.6875rem', sm: '0.75rem' },
          }}
        >
          {TEXT.NAV_POWERED_BY}
        </Typography>
      </Box>

      <Divider />

      {/* Sample Queries */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
            fontWeight: 600,
            color: (theme) => theme.palette.primary.main,
            mb: { xs: 1.5, sm: 2 },
            px: 1,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
          }}
        >
          {TEXT.NAV_SAMPLE_QUERIES}
        </Typography>
        {sampleQueries.map((category, catIdx) => (
          <Box key={catIdx} sx={{ mb: { xs: 1.5, sm: 2 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                mb: 1,
              }}
            >
              <Box sx={{
                color: (theme) => theme.palette.secondary.main,
                '& svg': { fontSize: { xs: 18, sm: 20 } }
              }}>
                {category.icon}
              </Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  fontWeight: 600,
                  color: (theme) => theme.palette.secondary.main,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                }}
              >
                {category.category}
              </Typography>
            </Box>
            <List dense>
              {category.queries.map((query, qIdx) => (
                <ListItem key={qIdx} disablePadding>
                  <ListItemButton
                    onClick={() => handleSuggestedPrompt(query)}
                    sx={{
                      borderRadius: '12px',
                      mb: 0.5,
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.primary.light + '20',
                      },
                    }}
                  >
                    <ListItemText
                      primary={query}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: {
                          fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                          color: (theme) => theme.palette.text.primary,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        background: (theme) => theme.palette.background.default,
        position: 'relative',
      }}
    >
      {/* Mobile/Tablet Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: { xs: '85%', sm: 360 },
            maxWidth: 360,
            background: (theme) => theme.palette.background.default,
          },
        }}
      >
        <LeftNavContent showCloseButton={true} />
      </Drawer>

      {/* Header */}
      <ChatHeader onMenuClick={() => setDrawerOpen(true)} onLanguageChange={resetChat} />

      {/* Main Content - Two Column Layout for Desktop */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Persistent Left Sidebar - Desktop Only */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            width: '320px',
            flexShrink: 0,
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            background: (theme) => theme.palette.background.paper,
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          }}
        >
          <LeftNavContent showCloseButton={false} />
        </Box>

        {/* Main Chat Container */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
          }}
        >
        {/* Messages Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
            py: 3,
            maxWidth: '100%',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: (theme) => theme.palette.grey[300],
              borderRadius: '4px',
              '&:hover': {
                background: (theme) => theme.palette.grey[400],
              },
            },
          }}
        >
          {/* Welcome screen with suggested prompts */}
          {messages.length === 0 && WelcomeScreen}

          {/* Regular chat messages */}
          {messages.length > 0 && messages.map((msg, idx) => {

            return (
              <Box key={msg.id || idx}>
                {msg.sender === "USER" ? (
                  <UserBubble text={msg.content} />
                ) : msg.status === "PROCESSING" ? (
                  <Box mb={2}>
                    <BotFileCheckReply
                      message=""
                      isLoading={true}
                      citations={[]}
                    />
                  </Box>
                ) : (
                  <Box mb={2}>
                    <BotFileCheckReply
                      message={msg.content}
                      fileName={msg.fileName}
                      fileStatus={msg.fileStatus}
                      messageType={msg.sender === "USER" ? "user_doc_upload" : "bot_response"}
                      citations={msg.citations}
                      messageId={msg.id}
                      sessionId={sessionId}
                      onFeedback={handleFeedback}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
          <div ref={scrollRef} />
        </Box>

        {/* Input Area - Fixed at bottom */}
        <Paper
          elevation={8}
          sx={{
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            background: (theme) => theme.palette.background.paper,
            px: { xs: 1.5, sm: 2, md: 3, lg: 6, xl: 8 },
            py: { xs: 1.5, sm: 2 },
            borderRadius: 0,
          }}
        >
          <Box maxWidth="100%" margin="0 auto">
            <Box display="flex" alignItems="flex-end" gap={1}>
              {/* Optional file upload slot */}
              {ALLOW_FILE_UPLOAD && (
                <Box sx={{ display: "flex" }}>
                  {/*  <Attachment onFileUploadComplete={…} /> */}
                </Box>
              )}

              <Box flex={1}>
                <ChatInput
                  onSendMessage={handleSend}
                  processing={processing}
                  message={inputValue}
                  setMessage={setInputValue}
                />
              </Box>
            </Box>

            {/* Powered by indicator */}
            <Box mt={{ xs: 1, sm: 1.5 }} textAlign="center">
              <Typography
                variant="caption"
                sx={{
                  color: (theme) => theme.palette.text.secondary,
                  fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                }}
              >
                Powered by Amazon Bedrock & Claude AI
              </Typography>
            </Box>
          </Box>
        </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default ChatBody;
