// frontend/src/components/IA/AIAssistantContrat.jsx

import React, { useState, useEffect } from 'react';
import { Button, Card, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { 
  FiSend, FiX, FiRotateCcw, FiCheck, FiAlertCircle, 
  FiFileText, FiUser, FiCalendar, FiDollarSign, 
  FiClock, FiTag, FiBriefcase, FiRefreshCw, FiEdit2,
  FiArrowRight
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import api from '../../services/api';

const AIAssistantContrat = ({ 
  actifId, 
  actifContext, 
  existingNumbers = [], 
  onContratCreated, 
  onClose,
  onFillForm  // ✅ Nouveau callback pour remplir le formulaire parent
}) => {
  // États
  const [isOpen, setIsOpen] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [showDraftPreview, setShowDraftPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoFillApplied, setAutoFillApplied] = useState(false);

  // Initialiser la conversation avec le contexte
  useEffect(() => {
    if (conversation.length === 0) {
      let contexteMessage = `👋 Bonjour ! Je suis votre **assistant IA pour la gestion des contrats**.

📋 **Je peux vous aider à :**
1. 📝 Générer un brouillon de contrat à partir d'une description
2. 🔍 Valider les informations d'un contrat
3. 💡 Suggérer des corrections
4. ✅ Remplir automatiquement le formulaire

💡 **Exemple de description :**
"Je veux créer un contrat de maintenance, fournisseur Dell, du 01/04/2025 au 31/03/2026, montant 450 USD"`;

      // ✅ Ajouter le contexte de l'actif si disponible
      if (actifContext) {
        contexteMessage = `👋 Bonjour ! Je suis votre **assistant IA pour la gestion des contrats**.

📌 **Contexte détecté :**
- Actif sélectionné : **${actifContext.code}** - ${actifContext.nom}
- Type d'actif : ${actifContext.type_immobilisation === 'corporel' ? 'Matériel' : 'Incorporel'}
${actifContext.fournisseur ? `- Fournisseur habituel : ${actifContext.fournisseur}` : ''}

📋 **Je peux vous aider à créer un contrat pour cet actif.**

💡 **Exemple de description :**
"Créer un contrat de maintenance pour cet actif, du 01/04/2025 au 31/03/2026, montant 450 USD"

Décrivez le contrat que vous souhaitez créer :`;
      }

      setConversation([
        {
          role: 'assistant',
          content: contexteMessage
        }
      ]);
    }
  }, [actifContext]);

  // ✅ Fonction pour remplir automatiquement le formulaire parent
  const autoFillForm = (draft) => {
    if (onFillForm) {
      onFillForm(draft);
      setAutoFillApplied(true);
      setSuccess('✅ Formulaire rempli automatiquement ! Vérifiez les champs et cliquez sur "Créer le contrat".');
      
      // Ajouter un message dans la conversation
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: "✅ J'ai automatiquement rempli le formulaire avec les informations extraites. Veuillez vérifier les champs et cliquer sur 'Créer le contrat' pour finaliser."
      }]);
    }
  };

  // Envoyer un message à l'IA
  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = { role: 'user', content: userInput };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setUserInput('');
    setLoading(true);
    setError('');
    setGeneratedDraft(null);
    setValidationResult(null);
    setSuggestions(null);
    setAutoFillApplied(false);

    try {
      // ✅ Ajouter le contexte de l'actif dans la requête
      const response = await api.post('/contrats/ia/generate', {
        conversation: updatedConversation,
        context: {
          actif_id: actifId,
          actif: actifContext,
          existingContrats: existingNumbers
        }
      });

      const aiResponse = response.data;
      
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.message || "J'ai analysé votre demande et généré un brouillon de contrat."
      }]);

      if (aiResponse.draft) {
        setGeneratedDraft(aiResponse.draft);
        await validateDraft(aiResponse.draft);
        
        // ✅ AUTO-FILL IMMÉDIAT : Remplir le formulaire automatiquement
        autoFillForm(aiResponse.draft);
      }
      
      setShowDraftPreview(true);

    } catch (err) {
      console.error('❌ Erreur IA:', err);
      setError(err.response?.data?.message || 'Erreur de communication avec le serveur');
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `❌ Désolé, une erreur est survenue: ${err.response?.data?.message || err.message}. Veuillez réessayer.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Valider le brouillon
  const validateDraft = async (draft) => {
    try {
      const response = await api.post('/contrats/ia/validate', { draft });
      setValidationResult(response.data);
      
      if (response.data.anomalies && response.data.anomalies.length > 0) {
        await getSuggestions(draft, response.data.anomalies);
      }
    } catch (err) {
      console.error('❌ Erreur validation:', err);
    }
  };

  // Obtenir des suggestions
  const getSuggestions = async (draft, anomalies) => {
    try {
      const response = await api.post('/contrats/ia/suggest', { draft, anomalies });
      setSuggestions(response.data.suggestions);
    } catch (err) {
      console.error('❌ Erreur suggestions:', err);
    }
  };

  // Appliquer une suggestion et re-remplir le formulaire
  const applySuggestion = (suggestion) => {
    if (!generatedDraft) return;
    
    const updatedDraft = { ...generatedDraft };
    updatedDraft[suggestion.field] = suggestion.corrected_value;
    setGeneratedDraft(updatedDraft);
    validateDraft(updatedDraft);
    
    // ✅ Re-remplir le formulaire avec la version corrigée
    if (onFillForm) {
      onFillForm(updatedDraft);
      setSuccess('✅ Correction appliquée et formulaire mis à jour !');
    }
  };

  // Appliquer toutes les suggestions auto-fill
  const applyAllAutoFill = () => {
    if (!suggestions) return;
    
    const updatedDraft = { ...generatedDraft };
    suggestions.forEach(suggestion => {
      if (suggestion.action === 'auto_fill' && suggestion.corrected_value) {
        updatedDraft[suggestion.field] = suggestion.corrected_value;
      }
    });
    setGeneratedDraft(updatedDraft);
    validateDraft(updatedDraft);
    
    // ✅ Re-remplir le formulaire avec toutes les corrections
    if (onFillForm) {
      onFillForm(updatedDraft);
      setSuccess('✅ Toutes les corrections ont été appliquées et le formulaire a été mis à jour !');
    }
  };

  // Créer le contrat directement (sans remplir le formulaire)
  const createContrat = async () => {
    if (!generatedDraft) return;
    
    setCreating(true);
    setError('');
    
    try {
      const response = await api.post('/contrats/ia/create-from-draft', {
        draft: generatedDraft,
        actif_id: actifId
      });
      
      setSuccess('✅ Contrat créé avec succès !');
      
      if (onContratCreated) {
        onContratCreated(response.data.contrat);
      }
      
      setTimeout(() => {
        if (onClose) onClose();
        else setIsOpen(false);
      }, 2000);
      
    } catch (err) {
      console.error('❌ Erreur création:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du contrat');
    } finally {
      setCreating(false);
    }
  };

  // Réinitialiser la conversation
  const resetConversation = () => {
    setConversation([]);
    setGeneratedDraft(null);
    setValidationResult(null);
    setSuggestions(null);
    setShowDraftPreview(false);
    setError('');
    setSuccess('');
    setAutoFillApplied(false);
    
    // Réinitialiser avec le message d'accueil contextuel
    let contexteMessage = `👋 Bonjour ! Je suis votre **assistant IA pour la gestion des contrats**.

📋 **Je peux vous aider à :**
1. 📝 Générer un brouillon de contrat à partir d'une description
2. ✅ Remplir automatiquement le formulaire

💡 **Exemple :**
"Créer un contrat de maintenance, fournisseur Dell, du 01/04/2025 au 31/03/2026, montant 450 USD"`;

    if (actifContext) {
      contexteMessage = `👋 Bonjour ! Je suis votre **assistant IA pour la gestion des contrats**.

📌 **Contexte :** Actif sélectionné - **${actifContext.code}** (${actifContext.nom})

💡 **Décrivez simplement le contrat que vous souhaitez créer.**
Exemple : "Contrat de maintenance du 01/04/2025 au 31/03/2026, montant 450 USD"`;
    }

    setConversation([{ role: 'assistant', content: contexteMessage }]);
  };

  // Formater le montant
  const formatMontant = (montant, devise = 'CDF') => {
    if (!montant) return 'Non défini';
    const nombre = typeof montant === 'number' ? montant : parseFloat(montant);
    if (isNaN(nombre)) return 'Non défini';
    
    if (devise === 'CDF') {
      return `${nombre.toLocaleString()} FC`;
    }
    return `${nombre.toLocaleString()} ${devise}`;
  };

  if (!isOpen) {
    return (
      <Button
        variant="primary"
        className="rounded-circle d-flex align-items-center justify-content-center shadow-lg"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          zIndex: 1050,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none'
        }}
        onClick={() => setIsOpen(true)}
      >
        <GiArtificialIntelligence size={30} style={{ color: 'white' }} />
      </Button>
    );
  }

  return (
    <Card
      className="position-fixed shadow-xl border-0"
      style={{
        bottom: '20px',
        right: '20px',
        width: '480px',
        maxWidth: 'calc(100vw - 40px)',
        height: '650px',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#0f0f0f',
        border: '1px solid #333'
      }}
    >
      {/* En-tête */}
      <Card.Header 
        className="d-flex justify-content-between align-items-center"
        style={{ 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderBottom: '1px solid #333'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <GiArtificialIntelligence size={20} className="text-white" />
          <strong className="text-white">Assistant IA - Contrats</strong>
          <Badge bg="light" text="dark" className="ms-2" style={{ fontSize: '10px' }}>Auto-remplissage</Badge>
        </div>
        <div className="d-flex gap-2">
          <button onClick={resetConversation} className="btn btn-sm text-white p-0" title="Nouvelle conversation">
            <FiRotateCcw size={16} />
          </button>
          <button onClick={() => {
            if (onClose) onClose();
            else setIsOpen(false);
          }} className="btn btn-sm text-white p-0">
            <FiX size={18} />
          </button>
        </div>
      </Card.Header>
      
      {/* Zone de conversation */}
      <Card.Body style={{ 
        flex: 1, 
        overflowY: 'auto', 
        backgroundColor: '#0f0f0f',
        padding: '1rem'
      }}>
        {/* Messages */}
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            <div
              className={`p-3 rounded-3 ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'}`}
              style={{ 
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? '#2563eb' : '#2d2d2d',
                color: '#fff'
              }}
            >
              <small className="opacity-75 mb-1 d-block" style={{ fontSize: '0.7rem' }}>
                {msg.role === 'user' ? '👤 Vous' : '🤖 Assistant IA'}
              </small>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{msg.content}</div>
            </div>
          </div>
        ))}
        
        {/* Chargement */}
        {loading && (
          <div className="d-flex justify-content-start mb-3">
            <div className="bg-secondary p-3 rounded-3" style={{ backgroundColor: '#2d2d2d' }}>
              <div className="d-flex align-items-center gap-2">
                <Spinner size="sm" animation="border" variant="light" />
                <span className="text-white">IA analyse votre demande...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Erreur */}
        {error && (
          <Alert variant="danger" className="mt-2 small">
            <FiAlertCircle className="me-1" /> {error}
          </Alert>
        )}
        
        {/* Succès */}
        {success && (
          <Alert variant="success" className="mt-2 small">
            <FiCheck className="me-1" /> {success}
          </Alert>
        )}
        
        {/* Aperçu du brouillon et auto-fill */}
        {showDraftPreview && generatedDraft && (
          <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: '#1a1a2e', borderLeft: '4px solid #10b981' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong className="text-success">📄 Informations extraites</strong>
              {autoFillApplied && (
                <Badge bg="success" className="d-flex align-items-center gap-1">
                  <FiCheck size={12} /> Formulaire rempli
                </Badge>
              )}
              {validationResult && !autoFillApplied && (
                <Badge bg={validationResult.is_valid ? 'success' : 'warning'}>
                  {validationResult.is_valid ? '✅ Valide' : '⚠️ À corriger'}
                </Badge>
              )}
            </div>
            
            <div style={{ fontSize: '0.8rem' }}>
              <div className="mb-2 pb-2 border-bottom border-secondary">
                <div><FiTag size={12} className="me-1 text-muted" /> <strong>N° Contrat:</strong> {generatedDraft.numero_contrat || 'À définir'}</div>
                <div><FiBriefcase size={12} className="me-1 text-muted" /> <strong>Type:</strong> {generatedDraft.type || 'Non spécifié'}</div>
                <div><FiUser size={12} className="me-1 text-muted" /> <strong>Fournisseur:</strong> {generatedDraft.fournisseur || 'Non spécifié'}</div>
              </div>
              
              <div className="mb-2 pb-2 border-bottom border-secondary">
                <div><FiCalendar size={12} className="me-1 text-muted" /> <strong>Date début:</strong> {generatedDraft.date_debut || 'Non définie'}</div>
                <div><FiCalendar size={12} className="me-1 text-muted" /> <strong>Date fin:</strong> {generatedDraft.date_fin || 'Non définie'}</div>
              </div>
              
              <div className="mb-2">
                <div><FiDollarSign size={12} className="me-1 text-muted" /> <strong>Montant:</strong> {formatMontant(generatedDraft.montant, generatedDraft.devise_code)}</div>
                {generatedDraft.montant_cdf && generatedDraft.devise_code !== 'CDF' && (
                  <div className="text-success small mt-1">💱 Soit {generatedDraft.montant_cdf.toLocaleString()} FC</div>
                )}
              </div>
            </div>
            
            {/* Anomalies */}
            {validationResult && validationResult.anomalies?.length > 0 && (
              <div className="mt-2 pt-2 border-top border-warning">
                <small className="text-warning">⚠️ Points d'attention:</small>
                <ul className="mb-0 mt-1" style={{ fontSize: '0.7rem', paddingLeft: '1rem' }}>
                  {validationResult.anomalies.slice(0, 3).map((a, i) => (
                    <li key={i} className="text-warning">{a.message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Suggestions de correction */}
            {suggestions && suggestions.length > 0 && (
              <div className="mt-2 pt-2 border-top border-info">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-info">💡 Suggestions ({suggestions.filter(s => s.action === 'auto_fill').length} auto)</small>
                  {suggestions.filter(s => s.action === 'auto_fill').length > 0 && (
                    <Button size="sm" variant="info" className="py-0 px-2" onClick={applyAllAutoFill}>
                      <FiRefreshCw size={12} className="me-1" /> Tout corriger
                    </Button>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {suggestions.slice(0, 3).map((s, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={s.action === 'auto_fill' ? 'outline-info' : 'outline-warning'}
                      className="py-0 px-2"
                      onClick={() => applySuggestion(s)}
                      style={{ fontSize: '0.7rem' }}
                    >
                      <FiEdit2 size={10} className="me-1" /> {s.field}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Message d'auto-fill */}
            {!autoFillApplied && (
              <div className="alert alert-info mt-3 py-2 mb-0" style={{ fontSize: '0.75rem' }}>
                <FiArrowRight size={12} className="me-1" />
                Les informations ont été automatiquement transférées vers le formulaire.
                Vérifiez les champs et cliquez sur "Créer le contrat".
              </div>
            )}
          </div>
        )}
      </Card.Body>
      
      {/* Zone de saisie */}
      <Card.Footer className="border-top p-3" style={{ backgroundColor: '#0f0f0f', borderTop: '1px solid #333' }}>
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Décrivez le contrat à créer..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading || creating}
            size="sm"
            style={{ 
              backgroundColor: '#1a1a2e', 
              color: '#fff', 
              border: '1px solid #333',
              borderRadius: '8px'
            }}
          />
          <Button 
            variant="primary" 
            onClick={sendMessage} 
            disabled={loading || creating || !userInput.trim()}
            size="sm"
            style={{ backgroundColor: '#2563eb', border: 'none', borderRadius: '8px' }}
          >
            {loading ? <Spinner size="sm" animation="border" variant="light" /> : <FiSend />}
          </Button>
        </div>
        <div className="text-center mt-2">
          <small style={{ color: '#666', fontSize: '10px' }}>
            ✨ L'IA remplit automatiquement le formulaire après analyse
          </small>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default AIAssistantContrat;