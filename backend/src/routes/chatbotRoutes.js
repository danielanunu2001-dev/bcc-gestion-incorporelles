// backend/src/routes/chatbotRoutes.js

const express = require('express');
const router = express.Router();
const ChatbotService = require('../services/chatbotService');

router.post('/message', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message requis' });
    }

    console.log(`📨 Message: ${message}`);
    
    const result = await ChatbotService.sendMessage(message, history || []);
    
    res.json({ reply: result.message });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ reply: "❌ Désolé, une erreur s'est produite." });
  }
});

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot API OK' });
});

module.exports = router;