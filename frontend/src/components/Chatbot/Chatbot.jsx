// frontend/src/components/Chatbot/Chatbot.jsx

import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { FiCpu, FiX, FiSend, FiUser } from 'react-icons/fi';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "🤖 Bonjour ! Je suis l'assistant IA BCC propulsé par ChatGPT. Je peux vous aider avec les immobilisations, amortissements, contrats et factures.\n\nComment puis-je vous aider ?", 
      sender: 'bot', 
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { text: inputMessage, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, { sender: 'user', text: inputMessage }]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await api.post('/chatbot/message', {
        message: inputMessage,
        history: conversationHistory
      });

      const botMessage = { text: response.data.reply, sender: 'bot', timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
      setConversationHistory(prev => [...prev, { sender: 'bot', text: response.data.reply }]);
    } catch (error) {
      console.error('Erreur:', error);
      setMessages(prev => [...prev, { text: "❌ Erreur, veuillez réessayer.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <>
      {!isOpen && (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <FiCpu size={24} />
          <span className="chatbot-badge">✨</span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <FiCpu size={20} />
              <span>Assistant IA BCC</span>
              <span className="chatbot-status">ChatGPT</span>
            </div>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <FiX size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-message ${msg.sender}`}>
                <div className="chatbot-message-avatar">
                  {msg.sender === 'bot' ? <FiCpu size={14} /> : <FiUser size={14} />}
                </div>
                <div className="chatbot-message-text">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  <small>{msg.timestamp.toLocaleTimeString()}</small>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chatbot-message bot">
                <div className="chatbot-message-avatar"><FiCpu size={14} /></div>
                <div className="chatbot-message-text typing">
                  <span></span><span></span><span></span>
                  <small>ChatGPT réfléchit...</small>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question à ChatGPT..."
            />
            <button onClick={handleSendMessage}><FiSend size={18} /></button>
          </div>

          <div className="chatbot-footer">
            <small>🔒 Sécurisé • 🧠 ChatGPT • 💡 Expert BCC</small>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;