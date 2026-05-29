// frontend/src/components/Reevaluations/ReevaluationForm.jsx

import React, { useState } from 'react';
import api from '../../services/api';
import { FiX, FiSave, FiTrendingUp, FiInfo } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ReevaluationForm = ({ actifId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_reevaluation: new Date().toISOString().split('T')[0],
    nouvelle_valeur: '',
    nouvelle_duree_ans: '',
    nouveau_taux: '',
    commentaire: '',
    document_reference: ''
  });
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSimuler = async () => {
    if (!formData.nouvelle_valeur) {
      setError('Veuillez saisir la nouvelle valeur');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/actifs/${actifId}/reevaluations/simuler`, {
        nouvelle_valeur: parseFloat(formData.nouvelle_valeur),
        nouvelle_duree_ans: formData.nouvelle_duree_ans ? parseInt(formData.nouvelle_duree_ans) : undefined
      });
      setSimulation(res.data.simulation);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nouvelle_valeur) {
      setError('Veuillez saisir la nouvelle valeur');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/actifs/${actifId}/reevaluations`, {
        date_reevaluation: formData.date_reevaluation,
        nouvelle_valeur: parseFloat(formData.nouvelle_valeur),
        nouvelle_duree_ans: formData.nouvelle_duree_ans ? parseInt(formData.nouvelle_duree_ans) : undefined,
        nouveau_taux: formData.nouveau_taux ? parseFloat(formData.nouveau_taux) : undefined,
        commentaire: formData.commentaire || undefined,
        document_reference: formData.document_reference || undefined
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la réévaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-3">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Date de réévaluation</label>
              <input
                type="date"
                name="date_reevaluation"
                value={formData.date_reevaluation}
                onChange={handleChange}
                className="form-control form-control-sm"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Nouvelle valeur (FC)</label>
              <input
                type="number"
                name="nouvelle_valeur"
                value={formData.nouvelle_valeur}
                onChange={handleChange}
                className="form-control form-control-sm"
                placeholder="Ex: 150000000"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Nouvelle durée (ans)</label>
              <input
                type="number"
                name="nouvelle_duree_ans"
                value={formData.nouvelle_duree_ans}
                onChange={handleChange}
                className="form-control form-control-sm"
                placeholder="Optionnel"
                min="1"
                max="50"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Nouveau taux (%)</label>
              <input
                type="number"
                name="nouveau_taux"
                value={formData.nouveau_taux}
                onChange={handleChange}
                className="form-control form-control-sm"
                placeholder="Optionnel"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            <div className="col-md-8">
              <label className="form-label small fw-semibold">Référence document</label>
              <input
                type="text"
                name="document_reference"
                value={formData.document_reference}
                onChange={handleChange}
                className="form-control form-control-sm"
                placeholder="N° rapport d'expertise, décision..."
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Commentaire</label>
              <textarea
                name="commentaire"
                value={formData.commentaire}
                onChange={handleChange}
                className="form-control form-control-sm"
                rows="2"
                placeholder="Justification de la réévaluation..."
              />
            </div>
          </div>

          {/* Bouton Simuler */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleSimuler}
              disabled={loading || !formData.nouvelle_valeur}
              className="btn btn-outline-info btn-sm me-2"
            >
              {loading ? 'Simulation...' : 'Simuler l\'impact'}
            </button>
          </div>

          {/* Résultats de la simulation */}
          {simulation && (
            <div className="mt-3 p-2 bg-light rounded-2">
              <div className="small">
                <strong className="text-info">🔍 Impact de la réévaluation :</strong>
                <div className="mt-1">
                  <div className="d-flex justify-content-between">
                    <span>Valeur actuelle:</span>
                    <span className="fw-semibold">{simulation.valeur_actuelle?.toLocaleString()} FC</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Nouvelle valeur:</span>
                    <span className="fw-semibold text-success">{simulation.nouvelle_valeur?.toLocaleString()} FC</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Écart:</span>
                    <span className={`fw-semibold ${simulation.ecart >= 0 ? 'text-success' : 'text-danger'}`}>
                      {simulation.ecart >= 0 ? '+' : ''}{simulation.ecart?.toLocaleString()} FC
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Impact annuité:</span>
                    <span className={`fw-semibold ${simulation.impact_amortissement?.variation >= 0 ? 'text-warning' : 'text-success'}`}>
                      {simulation.impact_amortissement?.variation >= 0 ? '+' : ''}{simulation.impact_amortissement?.variation?.toLocaleString()} FC
                    </span>
                  </div>
                </div>
                <small className="text-muted d-block mt-1">{simulation.recommandation}</small>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mt-3 py-1 small">
              <FiInfo size={12} className="me-1" /> {error}
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
            <button type="button" onClick={onCancel} className="btn btn-outline-secondary btn-sm">
              <FiX size={14} /> Annuler
            </button>
            <button type="submit" disabled={loading || !formData.nouvelle_valeur} className="btn btn-primary btn-sm">
              <FiSave size={14} /> {loading ? 'Enregistrement...' : 'Enregistrer la réévaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReevaluationForm;