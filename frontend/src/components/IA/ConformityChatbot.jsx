// frontend/src/components/IA/ConformityChatbot.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiInfo, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiShield, FiZap, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import api from '../../services/api';

const ConformityChatbot = ({ currentConformite, onClose, isOpen: initialIsOpen = true }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "👋 Bonjour ! Je suis l'assistant IA de conformité BCC/GCEC.\n\nPosez-moi toutes vos questions sur les indicateurs de conformité, leurs utilités, les conséquences de la non-conformité, ou comment améliorer vos scores.\n\n**Exemples de questions :**\n• À quoi sert le Plan comptable GCEC ?\n• Quelles sont les sanctions en cas de non-clôture ?\n• Comment améliorer ma piste d'audit ?\n• Que signifie un score de 65% ?",
      timestamp: new Date(),
      suggestions: [
        "À quoi sert le Plan comptable GCEC ?",
        "Sanctions pour non-clôture d'exercice",
        "Comment améliorer la piste d'audit ?",
        "Seuil de conformité expliqué"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [suggestions, setSuggestions] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mettre à jour les suggestions
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].suggestions) {
      setSuggestions(messages[messages.length - 1].suggestions);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Construire le contexte avec les données actuelles de conformité
      const contexte = {};
      if (currentConformite) {
        contexte.score = currentConformite.score_global;
        
        // Trouver l'indicateur mentionné dans la question
        const questionLower = question.toLowerCase();
        for (const ind of (currentConformite.indicateurs || [])) {
          if (questionLower.includes(ind.nom.toLowerCase())) {
            contexte.indicateur = ind.nom;
            contexte.valeur = ind.valeur;
            contexte.statut = ind.statut;
            break;
          }
        }
      }

      const response = await api.post('/conformity-ai/ask', {
        question: question,
        contexte
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.reponse,
        timestamp: new Date(),
        source: response.data.source,
        suggestions: generateSuggestions(question)
      };

      setMessages(prev => [...prev, botMessage]);
      setSuggestions(botMessage.suggestions);

    } catch (error) {
      console.error('Erreur IA Conformité:', error);
      
      let errorContent = "❌ Désolé, je n'arrive pas à répondre pour le moment. Veuillez réessayer.";
      
      if (error.response?.status === 429) {
        errorContent = "⚠️ Trop de demandes. Veuillez patienter quelques instants avant de réessayer.";
      } else if (error.response?.status === 500) {
        errorContent = "🔧 Le service IA est temporairement indisponible. Nos équipes travaillent à le rétablir.";
      } else if (error.code === 'ERR_NETWORK') {
        errorContent = "🌐 Impossible de contacter le serveur IA. Vérifiez votre connexion.";
      }
      
      // Réponse de fallback basée sur la base de connaissances
      const fallbackResponse = getFallbackResponse(question);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: fallbackResponse || errorContent,
        timestamp: new Date(),
        isError: !!error
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const getFallbackResponse = (question) => {
    const q = question.toLowerCase();
    
    // Base de connaissances locale de fallback
    const knowledge = {
      'plan comptable': {
        content: "📊 **Plan comptable GCEC**\n\n**Utilité :** Standardiser la présentation des états financiers, faciliter les comparaisons entre entreprises, garantir la transparence financière.\n\n**Conséquences de non-conformité :**\n• Amendes pouvant aller jusqu'à 10 millions CDF\n• Refus des états financiers par les auditeurs\n• Pénalités fiscales majorées de 25%\n\n**Seuil requis :** 80%",
        suggestion: "Quel est le seuil pour les autres indicateurs ?"
      },
      'clôture': {
        content: "🔒 **Clôture des exercices**\n\n**Utilité :** Permet d'arrêter les comptes, déterminer le résultat, préparer les états financiers légaux.\n\n**Conséquences de non-clôture :**\n• Astreinte de 5000 CDF/jour de retard\n• Impossibilité de certifier les comptes\n• Suspension des subventions BCC\n\n**Recommandation :** Planifier la clôture 3 mois à l'avance.",
        suggestion: "Comment améliorer ma piste d'audit ?"
      },
      'piste audit': {
        content: "🔍 **Piste d'audit**\n\n**Utilité :** Traçabilité complète de toutes les opérations, détection rapide des anomalies.\n\n**Conséquences d'absence :**\n• Nullité des opérations\n• Risque de fraude non détectée\n• Sanctions disciplinaires\n\n**Recommandation :** Conserver les logs minimum 10 ans.",
        suggestion: "Quelles sont les sanctions pour archivage ?"
      },
      'taux change': {
        content: "💱 **Taux de change**\n\n**Utilité :** Valorisation correcte des transactions en devises.\n\n**Conséquences de taux obsolètes :**\n• Redressement fiscal\n• Écarts de change non comptabilisés\n• Ajustements forcés\n\n**Seuil requis :** 80%",
        suggestion: "Parlez-moi de la sécurité BCC"
      },
      'sécurité': {
        content: "🛡️ **Sécurité BCC**\n\n**Utilité :** Protéger les données sensibles, prévenir les accès non autorisés.\n\n**Conséquences d'une faille :**\n• Suspension d'accès\n• Responsabilité pénale\n• Amendes jusqu'à 50 millions CDF\n\n**Recommandation :** 2FA obligatoire pour tous.",
        suggestion: "Que signifie un score de 65% ?"
      },
      'archivage': {
        content: "📁 **Archivage légal**\n\n**Utilité :** Garantir la disponibilité des preuves en cas de contrôle.\n\n**Conséquences de non-archivage :**\n• Amende de 1% du CA\n• Peine de prison 6 mois\n• Documents non recevables en justice\n\n**Recommandation :** Archiver 10 ans minimum.",
        suggestion: "Expliquez-moi les seuils de conformité"
      },
      'seuil': {
        content: "📊 **Niveaux de conformité**\n\n• **✅ Conforme (≥80%)** : Situation satisfaisante\n• **⚠️ Attention (50-79%)** : Surveillance renforcée\n• **🔴 Critique (<50%)** : Action immédiate requise\n\n**Objectif :** Maintenir tous les indicateurs ≥80%.",
        suggestion: "Comment améliorer mon score ?"
      }
    };
    
    // Chercher la réponse correspondante
    for (const [key, value] of Object.entries(knowledge)) {
      if (q.includes(key)) {
        return value.content + "\n\n💡 " + value.suggestion;
      }
    }
    
    return null;
  };

  const generateSuggestions = (question) => {
    const q = question.toLowerCase();
    
    // Suggestions contextuelles basées sur la question
    if (q.includes('c') && q.includes('quoi') || q.includes('définition') || q.includes('explique')) {
      return [
        "Quelles sont les conséquences ?",
        "Comment puis-je améliorer ce point ?",
        "Quel est le seuil minimum requis ?"
      ];
    }
    
    if (q.includes('sanction') || q.includes('consequence') || q.includes('risque') || q.includes('amende')) {
      return [
        "Comment éviter ces sanctions ?",
        "Délai pour régulariser ?",
        "Qui est responsable ?"
      ];
    }
    
    if (q.includes('comment') || q.includes('améliorer') || q.includes('augmenter')) {
      return [
        "Quel est le délai estimé ?",
        "Quelles ressources nécessaires ?",
        "Exemple concret ?"
      ];
    }
    
    if (q.includes('seuil') || q.includes('note') || q.includes('score')) {
      return [
        "Comment calculer le score ?",
        "Que faire si score < 80% ?",
        "Comparaison avec autres entreprises"
      ];
    }
    
    // Suggestions par défaut basées sur le contexte de conformité
    if (currentConformite && currentConformite.indicateurs) {
      const lowIndicators = currentConformite.indicateurs
        .filter(i => i.valeur < 80)
        .slice(0, 2)
        .map(i => `Comment améliorer ${i.nom} ?`);
      
      if (lowIndicators.length > 0) {
        return lowIndicators;
      }
    }
    
    return [
      "Expliquez-moi le Plan comptable GCEC",
      "Que risque-t-on en cas de non-conformité ?",
      "Comment atteindre 80% de conformité ?",
      "Différence entre conforme et attention ?"
    ];
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: "🧹 Chat réinitialisé !\n\nPosez-moi vos questions sur la conformité BCC/GCEC.",
      timestamp: new Date(),
      suggestions: [
        "À quoi sert le Plan comptable GCEC ?",
        "Sanctions pour non-clôture d'exercice",
        "Comment améliorer la piste d'audit ?"
      ]
    }]);
    setSuggestions([]);
  };

  // Formatage du message avec markdown simple
  const formatMessage = (content) => {
    let formatted = content;
    
    // Remplacer les **texte** par du gras
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Remplacer les * texte par des puces
    formatted = formatted.replace(/^[•*]\s+(.*?)$/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*?<\/li>)/gs, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
    }
    
    // Remplacer les sauts de ligne
    formatted = formatted.replace(/\n/g, '<br/>');
    
    // Remplacer les émojis par leurs équivalents
    formatted = formatted.replace(/✅/g, '<span style="color: #10b981;">✅</span>');
    formatted = formatted.replace(/⚠️/g, '<span style="color: #f59e0b;">⚠️</span>');
    formatted = formatted.replace(/🔴/g, '<span style="color: #ef4444;">🔴</span>');
    formatted = formatted.replace(/📊/g, '<span style="color: #3b82f6;">📊</span>');
    
    return formatted;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={styles.floatingButton}
        className="conformity-chatbot-floating"
      >
        <GiArtificialIntelligence size={24} />
        <span style={styles.floatingBadge}>IA</span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div style={styles.minimizedContainer}>
        <div style={styles.minimizedHeader}>
          <div style={styles.minimizedIcon}>
            <GiArtificialIntelligence size={16} />
          </div>
          <span style={styles.minimizedTitle}>Assistant Conformité</span>
          <div style={styles.minimizedActions}>
            <button onClick={() => setIsMinimized(false)} style={styles.minimizedButton}>
              <FiMaximize2 size={12} />
            </button>
            <button onClick={onClose || (() => setIsOpen(false))} style={styles.minimizedButton}>
              <FiX size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="conformity-chatbot-container">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <GiArtificialIntelligence size={20} color="#fff" />
          </div>
          <div>
            <h3 style={styles.headerTitle}>Assistant Conformité BCC</h3>
            <p style={styles.headerSubtitle}>
              {currentConformite?.score_global 
                ? `Score actuel: ${currentConformite.score_global}%`
                : 'Posez vos questions sur la conformité'}
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusBadge}>
            <FiZap size={12} />
            <span>IA Active</span>
          </div>
          <button onClick={clearChat} style={styles.iconButton} title="Nouvelle conversation">
            <FiMessageSquare size={16} />
          </button>
          <button onClick={() => setIsMinimized(true)} style={styles.iconButton} title="Réduire">
            <FiMinimize2 size={16} />
          </button>
          <button onClick={onClose || (() => setIsOpen(false))} style={styles.iconButton} title="Fermer">
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              ...styles.message,
              ...(message.type === 'user' ? styles.userMessage : styles.botMessage)
            }}
          >
            <div style={styles.messageAvatar}>
              {message.type === 'user' ? '👤' : <GiArtificialIntelligence size={14} />}
            </div>
            <div style={styles.messageContent}>
              <div 
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                style={styles.messageText}
              />
              {message.source && !message.isError && (
                <div style={styles.messageSource}>
                  <small>🔮 {message.source}</small>
                </div>
              )}
              {message.isError && (
                <div style={styles.messageError}>
                  <small>⚠️ Mode hors ligne - Réponses limitées</small>
                </div>
              )}
              <div style={styles.messageTime}>
                {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={styles.loadingMessage}>
            <div style={styles.loadingDots}>
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
            <span style={styles.loadingText}>L'IA réfléchit...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              style={styles.suggestionButton}
            >
              <FiMessageSquare size={12} />
              {suggestion.length > 35 ? suggestion.substring(0, 35) + '...' : suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={styles.inputContainer}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Posez votre question sur la conformité..."
          style={styles.input}
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={styles.sendButton}
        >
          <FiSend size={18} />
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <small style={styles.footerText}>
          <FiShield size={12} /> Expertise GCEC | Réponses basées sur la réglementation BCC
        </small>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .conformity-chatbot-container {
          animation: fadeIn 0.3s ease;
        }
        .conformity-chatbot-floating {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',  // ← CHANGÉ : maintenant en bas à gauche
    width: '450px',
    height: '650px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  floatingButton: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',  // ← CHANGÉ : maintenant en bas à gauche
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
    transition: 'all 0.2s ease',
    zIndex: 1000
  },
  floatingBadge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#10b981',
    borderRadius: '10px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  minimizedContainer: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',  // ← CHANGÉ : maintenant en bas à gauche
    width: '280px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000
  },
  minimizedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    color: 'white'
  },
  minimizedIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  minimizedTitle: {
    flex: 1,
    fontSize: '12px',
    fontWeight: '500'
  },
  minimizedActions: {
    display: 'flex',
    gap: '6px'
  },
  minimizedButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '11px',
    opacity: 0.8
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '10px'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    borderRadius: '6px',
    transition: 'background 0.2s'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#f8fafc'
  },
  message: {
    display: 'flex',
    gap: '12px',
    animation: 'fadeIn 0.3s ease'
  },
  userMessage: {
    flexDirection: 'row-reverse'
  },
  botMessage: {
    flexDirection: 'row'
  },
  messageAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0
  },
  messageContent: {
    maxWidth: '75%',
    flex: 1
  },
  messageText: {
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#1e293b',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  messageSource: {
    marginTop: '4px',
    fontSize: '10px',
    color: '#94a3b8'
  },
  messageError: {
    marginTop: '4px',
    fontSize: '10px',
    color: '#f59e0b'
  },
  messageTime: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  loadingMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '16px',
    marginLeft: '44px',
    width: 'fit-content'
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    '& span': {
      animation: 'pulse 1.5s infinite'
    }
  },
  loadingText: {
    fontSize: '12px',
    color: '#64748b'
  },
  suggestionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: 'white',
    maxHeight: '100px',
    overflowY: 'auto'
  },
  suggestionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '20px',
    fontSize: '11px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    fontSize: '13px',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    maxHeight: '80px',
    overflowY: 'auto'
  },
  sendButton: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    backgroundColor: '#8b5cf6',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
    backgroundColor: '#f8fafc'
  },
  footerText: {
    fontSize: '10px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  }
};

export default ConformityChatbot;