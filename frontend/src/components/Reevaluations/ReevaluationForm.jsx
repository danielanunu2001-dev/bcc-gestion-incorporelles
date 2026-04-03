import React, { useState } from 'react';
import api from '../../services/api';
import { FiSave, FiX } from 'react-icons/fi';

const ReevaluationForm = ({ actifId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    date_reevaluation: new Date().toISOString().split('T')[0],
    valeur_apres: '',
    nouvelle_duree_ans: '',
    nouveau_taux: '',
    compte_reevaluation: '1061',
    commentaire: '',
    document_reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/actifs/${actifId}/reevaluations`, formData);
      onSuccess();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Nouvelle réévaluation</h4>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label>Date de réévaluation *</label>
            <input
              type="date"
              name="date_reevaluation"
              value={formData.date_reevaluation}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Nouvelle valeur *</label>
            <input
              type="number"
              name="valeur_apres"
              value={formData.valeur_apres}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Nouvelle durée (ans)</label>
            <input
              type="number"
              name="nouvelle_duree_ans"
              value={formData.nouvelle_duree_ans}
              onChange={handleChange}
              min="1"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Nouveau taux (%)</label>
            <input
              type="number"
              name="nouveau_taux"
              value={formData.nouveau_taux}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="100"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Compte de réévaluation</label>
            <input
              type="text"
              name="compte_reevaluation"
              value={formData.compte_reevaluation}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Référence document</label>
            <input
              type="text"
              name="document_reference"
              value={formData.document_reference}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label>Commentaire</label>
            <textarea
              name="commentaire"
              value={formData.commentaire}
              onChange={handleChange}
              rows="3"
              style={styles.textarea}
            />
          </div>
        </div>
        <div style={styles.actions}>
          <button type="submit" style={styles.saveButton} disabled={loading}>
            <FiSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            <FiX /> Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  title: {
    marginTop: 0,
    marginBottom: '1rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    resize: 'vertical'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  },
  saveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  }
};

export default ReevaluationForm;