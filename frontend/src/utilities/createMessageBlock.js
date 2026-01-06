// Utility function to create message blocks for the chat interface
export default function createMessageBlock(content, sender, type, status) {
  return {
    id: Date.now() + Math.random(), // Generate unique ID
    content,
    sender, // 'USER' or 'BOT'
    type, // 'TEXT', 'FILE', etc.
    status, // 'SENDING', 'SENT', 'RECEIVED', 'ERROR'
    timestamp: new Date().toISOString()
  };
}
