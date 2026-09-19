const express = require('express');
const router = express.Router();
const { askAIChat } = require('../controllers/aiChatController');

// POST /api/ai/chat
router.post('/chat', askAIChat);

module.exports = router;
