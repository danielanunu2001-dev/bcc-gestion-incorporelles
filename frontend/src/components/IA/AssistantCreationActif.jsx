import React, { useState } from 'react';
import { Button, Modal, Form, Spinner, Alert, Card } from 'react-bootstrap';
import { GiArtificialIntelligence } from 'react-icons/gi';
import { FiSend, FiCheck, FiAlertCircle } from 'react-icons/fi';
import api from '../../services/api';

const AssistantCreationActif = ({ onActifGenere, onClose, actifExistant, mode = 'validation' }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');
  const [validation, setValidation] = useState(null);

  // Pour la validation d'un formulaire existant
  const handleValider = async () => {
    setLoading(true);
    setErreur('');
    try {
      const res = await api.post('/actifs/valider', actifExistant);
      setValidation(res.data);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setLoading(false);
    }
  };

  // Pour la génération à partir d'une description
  const handleGenerer = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setErreur('');
    try {
      const res = await api.post('/actifs/generer-par-ia', { description });
      setResultat(res.data);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  const handleAppliquer = () => {
    if (resultat && onActifGenere) {
      onActifGenere(resultat);
    }
    if (validation && onActifGenere && mode === 'validation') {
      onActifGenere(validation.donnees_corrigees);
    }
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#1a1a2e', color: 'white' }}>
        <Modal.Title>
          <GiArtificialIntelligence className="me-2" /> Assistant IA - Création d'actif
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {mode === 'validation' && actifExistant && (
          <>
            <p>L'IA va analyser les données saisies et détecter les anomalies.</p>
            {!validation && !loading && (
              <Button variant="primary" onClick={handleValider} className="w-100">
                Lancer l'analyse IA
              </Button>
            )}
          </>
        )}

        {mode === 'generation' && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Décrivez l'actif à créer (en langage naturel)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Exemple : Achat d'un logiciel de comptabilité pour 5000 USD le 15 mars 2025, durée d'utilité 3 ans, fournisseur ABC Corp, facture FAC-2025-001"
              />
            </Form.Group>
            <Button variant="primary" onClick={handleGenerer} disabled={loading || !description.trim()}>
              {loading ? <Spinner size="sm" /> : <FiSend />} Générer la fiche
            </Button>
          </>
        )}

        {loading && <div className="text-center my-4"><Spinner animation="border" /> Analyse en cours...</div>}
        {erreur && <Alert variant="danger">{erreur}</Alert>}

        {validation && (
          <div className="mt-3">
            <h6>Résultat de l'analyse :</h6>
            {validation.anomalies?.length > 0 && (
              <Alert variant="warning">
                <strong>⚠️ Anomalies détectées :</strong>
                <ul>{validation.anomalies.map((a,i) => <li key={i}>{a}</li>)}</ul>
              </Alert>
            )}
            {validation.suggestions?.length > 0 && (
              <Alert variant="info">
                <strong>💡 Suggestions :</strong>
                <ul>{validation.suggestions.map((s,i) => <li key={i}>{s}</li>)}</ul>
              </Alert>
            )}
            {Object.keys(validation.donnees_corrigees || {}).length > 0 && (
              <Card className="mt-2">
                <Card.Body>
                  <strong>Données corrigées proposées :</strong>
                  <pre className="mt-2 small">{JSON.stringify(validation.donnees_corrigees, null, 2)}</pre>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        {resultat && (
          <div className="mt-3">
            <h6>Fiche d'actif générée :</h6>
            <pre className="bg-light p-2 small">{JSON.stringify(resultat, null, 2)}</pre>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        {(validation || resultat) && (
          <Button variant="success" onClick={handleAppliquer}>
            <FiCheck /> Appliquer les corrections
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AssistantCreationActif;