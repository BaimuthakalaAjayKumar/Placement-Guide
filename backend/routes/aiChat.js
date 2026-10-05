const express = require('express');
const router = express.Router();
const { askAIChat, askAgentChat } = require('../controllers/aiChatController');
const { protect } = require('../middleware/auth');

// POST /api/ai/chat (General public / basic chat)
router.post('/chat', askAIChat);

// POST /api/ai/agent-chat (Protected, context-aware CampusBridge AI Assistant)
router.post('/agent-chat', protect, askAgentChat);

module.exports = router;
