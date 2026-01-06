import React, { useState, useRef, useEffect } from "react";
import { TextField, Box, IconButton, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useTheme } from "@mui/material/styles";

function ChatInput({ onSendMessage, processing, message, setMessage }) {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleTyping = (event) => {
    setMessage(event.target.value);
  };

  const handleSendMessage = () => {
    if (message?.trim() !== "" && !processing) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: { xs: 1, sm: 1.5 },
        position: 'relative',
      }}
    >
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: theme.palette.background.paper,
          borderRadius: { xs: '20px', sm: '24px' },
          border: `2px solid ${isFocused ? theme.palette.primary.main : theme.palette.divider}`,
          transition: 'all 0.3s ease',
          boxShadow: isFocused ? '0 4px 12px rgba(234, 94, 41, 0.15)' : '0 2px 6px rgba(0,0,0,0.08)',
          '&:hover': {
            borderColor: theme.palette.primary.light,
            boxShadow: '0 4px 12px rgba(234, 94, 41, 0.12)',
          },
        }}
      >
        <TextField
          inputRef={inputRef}
          multiline
          maxRows={4}
          fullWidth
          placeholder={!processing ? "Type your message here... (Press Enter to send, Shift+Enter for new line)" : "Processing..."}
          id="USERCHATINPUT"
          value={message || ""}
          disabled={processing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !processing) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          onChange={handleTyping}
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: { xs: "10px 14px", sm: "12px 18px", md: "14px 20px" },
              fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
              fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
              "& fieldset": {
                border: "none",
              },
            },
            "& .MuiInputBase-input": {
              "&::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 0.7,
                fontFamily: 'Calibri, Ideal Sans, Arial, sans-serif',
                fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.95rem' },
              },
            },
            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: theme.palette.text.disabled,
            },
          }}
        />
      </Box>

      <IconButton
        aria-label="send"
        disabled={processing || !message?.trim()}
        onClick={handleSendMessage}
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: "white",
          width: { xs: "44px", sm: "48px", md: "52px" },
          height: { xs: "44px", sm: "48px", md: "52px" },
          borderRadius: "50%",
          boxShadow: '0 4px 12px rgba(234, 94, 41, 0.3)',
          transition: 'all 0.3s ease',
          "&:hover": {
            backgroundColor: '#CB5223',
            boxShadow: '0 6px 16px rgba(234, 94, 41, 0.4)',
            transform: 'scale(1.05)',
          },
          "&:active": {
            transform: 'scale(0.95)',
          },
          "&:disabled": {
            backgroundColor: theme.palette.grey[300],
            color: theme.palette.grey[500],
            boxShadow: 'none',
          },
        }}
      >
        {processing ? (
          <CircularProgress size={{ xs: 20, sm: 22, md: 24 }} sx={{ color: 'white' }} />
        ) : (
          <SendIcon sx={{ fontSize: { xs: 20, sm: 22, md: 24 } }} />
        )}
      </IconButton>
    </Box>
  );
}

export default ChatInput;
