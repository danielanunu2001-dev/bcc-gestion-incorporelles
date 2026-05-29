// frontend/src/components/IA/AssistantComptable.jsx
import React, { useState } from 'react';
import { Button, Card, Spinner, Alert, Form, Badge } from 'react-bootstrap';
import { FiMessageSquare, FiSend, FiX, FiBrain } from 'react-icons/fi';
import aiService from '../../services/aiService';

const AssistantComptable = ({ actifId, actifNom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [reponse, setReponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historique, setHistorique] = useState([]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Ajouter la question à l'historique
      const newHistorique = [...historique, { role: 'user', content: question }];
      setHistorique(newHistorique);
      
      const response = await aiService.askAssistant(question, actifId);
      
      const reponseIA = response.reponse;
      setReponse(reponseIA);
      setHistorique([...newHistorique, { role: 'assistant', content: reponseIA }]);
      setQuestion('');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de communication avec l\'IA');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="primary"
        className="position-fixed rounded-circle d-flex align-items-center justify-content-center shadow-lg"
        style={{
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          zIndex: 1000
        }}
        onClick={() => setIsOpen(true)}
      >
        <FiMessageSquare size={28} />
      </Button>
    );
  }

  return (
    <Card
      className="position-fixed shadow-lg border-0"
      style={{
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxWidth: 'calc(100vw - 40px)',
        height: '550px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FiBrain size={18} />
          <strong>Assistant Comptable IA</strong>
          <Badge bg="light" text="primary" className="ms-2">Mistral AI</Badge>
        </div>
        <Button variant="link" className="text-white p-0" onClick={() => setIsOpen(false)}>
          <FiX size={20} />
        </Button>
      </Card.Header>
      
      <Card.Body style={{ flex: 1, overflowY: 'auto' }}>
        {actifNom && (
          <Alert variant="info" className="small py-1 px-2 mb-3">
            Contexte: Actif sélectionné <strong>{actifNom}</strong>
          </Alert>
        )}
        
        {historique.length === 0 && !reponse && (
          <div className="text-center text-muted mt-5">
            <FiMessageSquare size={48} className="mb-3 opacity-50" />
            <p>Posez-moi des questions sur:</p>
            <ul className="text-start small">
              <li>📊 "Quel est le statut d'amortissement de cet actif ?"</li>
              <li>💰 "Quelle est la valeur nette comptable ?"</li>
              <li>⚠️ "Y a-t-il des anomalies à signaler ?"</li>
              <li>📈 "Quelle est la tendance des amortissements ?"</li>
            </ul>
          </div>
        )}
        
        {historique.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            <div
              className={`p-2 rounded-3 max-width-80 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-light'}`}
              style={{ maxWidth: '80%' }}
            >
              <small className={msg.role === 'user' ? 'text-white-50' : 'text-muted'}>
                {msg.role === 'user' ? 'Vous' : 'Assistant'}
              </small>
              <div className="small">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="text-center">
            <Spinner size="sm" animation="border" variant="primary" />
            <span className="ms-2 small text-muted">L'IA réfléchit...</span>
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="mt-2 small">
            {error}
          </Alert>
        )}
      </Card.Body>
      
      <Card.Footer className="bg-white">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Posez votre question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button variant="primary" onClick={handleAsk} disabled={loading || !question.trim()}>
            {loading ? <Spinner size="sm" animation="border" /> : <FiSend />}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default AssistantComptable;