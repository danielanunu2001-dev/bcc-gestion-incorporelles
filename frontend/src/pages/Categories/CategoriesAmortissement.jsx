import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw,
  FiSearch, FiFilter, FiDownload, FiEye, FiClock,
  FiTrendingUp, FiDollarSign, FiCalendar, FiTag
} from 'react-icons/fi';

const CategoriesAmortissement = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    code_categorie: '',
    nom_categorie: '',
    description: '',
    duree_vie_ans: 5,
    mode_amortissement_defaut: 'lineaire',
    taux_amortissement: '',
    coefficient_degressif: 1.75,
    compte_comptable_defaut: '',
    actif: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Filtrer les catégories en fonction de la recherche
    if (searchTerm) {
      const filtered = categories.filter(cat => 
        cat.code_categorie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.nom_categorie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [searchTerm, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories-amortissement');
      setCategories(res.data);
      setFilteredCategories(res.data);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError('Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (categorie) => {
    setEditing(categorie);
    setFormData({
      code_categorie: categorie.code_categorie || '',
      nom_categorie: categorie.nom_categorie || '',
      description: categorie.description || '',
      duree_vie_ans: categorie.duree_vie_ans || 5,
      mode_amortissement_defaut: categorie.mode_amortissement_defaut || 'lineaire',
      taux_amortissement: categorie.taux_amortissement || '',
      coefficient_degressif: categorie.coefficient_degressif || 1.75,
      compte_comptable_defaut: categorie.compte_comptable_defaut || '',
      actif: categorie.actif !== undefined ? categorie.actif : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id, nom) => {
    if (window.confirm(`Êtes-vous sûr de vouloir désactiver la catégorie "${nom}" ?`)) {
      try {
        await api.delete(`/categories-amortissement/${id}`);
        setSuccess('Catégorie désactivée avec succès');
        fetchCategories();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Erreur lors de la désactivation');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.code_categorie || !formData.nom_categorie || !formData.duree_vie_ans) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (formData.duree_vie_ans <= 0) {
        throw new Error('La durée de vie doit être positive');
      }

      if (formData.mode_amortissement_defaut === 'degressif' && formData.coefficient_degressif <= 0) {
        throw new Error('Le coefficient dégressif doit être positif');
      }

      const dataToSend = {
        ...formData,
        duree_vie_ans: parseInt(formData.duree_vie_ans),
        taux_amortissement: formData.taux_amortissement ? parseFloat(formData.taux_amortissement) : null,
        coefficient_degressif: formData.coefficient_degressif ? parseFloat(formData.coefficient_degressif) : 1.75
      };

      if (editing) {
        await api.put(`/categories-amortissement/${editing.id}`, dataToSend);
        setSuccess('Catégorie modifiée avec succès');
      } else {
        await api.post('/categories-amortissement', dataToSend);
        setSuccess('Catégorie créée avec succès');
      }

      setShowForm(false);
      setEditing(null);
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code_categorie: '',
      nom_categorie: '',
      description: '',
      duree_vie_ans: 5,
      mode_amortissement_defaut: 'lineaire',
      taux_amortissement: '',
      coefficient_degressif: 1.75,
      compte_comptable_defaut: '',
      actif: true
    });
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const getModeLabel = (mode) => {
    return mode === 'lineaire' ? 'Linéaire' : 'Dégressif';
  };

  const getStatusBadge = (actif) => {
    return actif ? (
      <span style={styles.badge.active}>Actif</span>
    ) : (
      <span style={styles.badge.inactive}>Inactif</span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Catégories d'amortissement</h1>
          <p style={styles.subtitle}>
            Paramétrage des durées de vie par catégorie selon les règles de la BCC
          </p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={fetchCategories} 
            style={styles.iconButton}
            title="Rafraîchir"
          >
            <FiRefreshCw />
          </button>
          {can(['admin']) && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={styles.primaryButton}
            >
              <FiPlus /> Nouvelle catégorie
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}
      {success && (
        <div style={styles.successMessage}>
          {success}
        </div>
      )}

      {/* Barre de recherche */}
      <div style={styles.searchBar}>
        <FiSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher par code, nom ou description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={styles.clearButton}
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Formulaire d'ajout/édition */}
      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>
              {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h3>
            <button onClick={resetForm} style={styles.closeButton}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              {/* Colonne 1 */}
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Code catégorie <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="code_categorie"
                    value={formData.code_categorie}
                    onChange={handleInputChange}
                    placeholder="ex: LOG, MAT, VEH"
                    style={styles.input}
                    required
                    disabled={!!editing}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nom <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nom_categorie"
                    value={formData.nom_categorie}
                    onChange={handleInputChange}
                    placeholder="ex: Logiciels, Matériel informatique"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Durée de vie (ans) <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="duree_vie_ans"
                    value={formData.duree_vie_ans}
                    onChange={handleInputChange}
                    min="1"
                    max="50"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mode d'amortissement par défaut</label>
                  <select
                    name="mode_amortissement_defaut"
                    value={formData.mode_amortissement_defaut}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="lineaire">Linéaire</option>
                    <option value="degressif">Dégressif</option>
                  </select>
                </div>
              </div>

              {/* Colonne 2 */}
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Taux d'amortissement (%)</label>
                  <input
                    type="number"
                    name="taux_amortissement"
                    value={formData.taux_amortissement}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                    style={styles.input}
                    placeholder="20"
                  />
                </div>

                {formData.mode_amortissement_defaut === 'degressif' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Coefficient dégressif</label>
                    <input
                      type="number"
                      name="coefficient_degressif"
                      value={formData.coefficient_degressif}
                      onChange={handleInputChange}
                      step="0.25"
                      min="1"
                      max="3"
                      style={styles.input}
                    />
                    <small style={styles.helper}>
                      Standard: 1.25 (3-4 ans), 1.75 (5-6 ans), 2.25 (6+ ans)
                    </small>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Compte comptable par défaut</label>
                  <input
                    type="text"
                    name="compte_comptable_defaut"
                    value={formData.compte_comptable_defaut}
                    onChange={handleInputChange}
                    placeholder="ex: 205, 2183"
                    style={styles.input}
                  />
                </div>

                {editing && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Statut</label>
                    <div style={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        name="actif"
                        checked={formData.actif}
                        onChange={handleInputChange}
                        id="actif"
                      />
                      <label htmlFor="actif">Catégorie active</label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description (pleine largeur) */}
            <div style={styles.formGroupFull}>
              <label style={styles.label}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                style={styles.textarea}
                placeholder="Description de la catégorie..."
              />
            </div>

            {/* Boutons */}
            <div style={styles.formActions}>
              <button 
                type="submit" 
                style={styles.saveButton}
                disabled={saving}
              >
                <FiSave /> {saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Créer')}
              </button>
              <button 
                type="button" 
                onClick={resetForm} 
                style={styles.cancelButton}
              >
                <FiX /> Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistiques */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FiTag size={20} color="#2563eb" />
          <div>
            <span style={styles.statLabel}>Total catégories</span>
            <span style={styles.statValue}>{categories.length}</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiClock size={20} color="#16a34a" />
          <div>
            <span style={styles.statLabel}>Durée moyenne</span>
            <span style={styles.statValue}>
              {categories.length > 0 
                ? (categories.reduce((sum, c) => sum + (c.duree_vie_ans || 0), 0) / categories.length).toFixed(1) 
                : 0} ans
            </span>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiTrendingUp size={20} color="#f59e0b" />
          <div>
            <span style={styles.statLabel}>Mode linéaire</span>
            <span style={styles.statValue}>
              {categories.filter(c => c.mode_amortissement_defaut === 'lineaire').length}
            </span>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiTrendingUp size={20} color="#dc2626" />
          <div>
            <span style={styles.statLabel}>Mode dégressif</span>
            <span style={styles.statValue}>
              {categories.filter(c => c.mode_amortissement_defaut === 'degressif').length}
            </span>
          </div>
        </div>
      </div>

      {/* Tableau des catégories */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement des catégories...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          {filteredCategories.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                {searchTerm 
                  ? 'Aucune catégorie ne correspond à votre recherche' 
                  : 'Aucune catégorie trouvée'}
              </p>
              {can(['admin']) && !searchTerm && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  style={styles.createButton}
                >
                  <FiPlus /> Créer votre première catégorie
                </button>
              )}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Durée (ans)</th>
                  <th style={styles.th}>Mode</th>
                  <th style={styles.th}>Coefficient</th>
                  <th style={styles.th}>Compte</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.code}>{cat.code_categorie}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.cellWithDesc}>
                        <span style={styles.nom}>{cat.nom_categorie}</span>
                        {cat.description && (
                          <span style={styles.description}>{cat.description}</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>{cat.duree_vie_ans}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.modeBadge,
                        backgroundColor: cat.mode_amortissement_defaut === 'lineaire' ? '#dbeafe' : '#fed7aa',
                        color: cat.mode_amortissement_defaut === 'lineaire' ? '#1e40af' : '#9a3412'
                      }}>
                        {getModeLabel(cat.mode_amortissement_defaut)}
                      </span>
                    </td>
                    <td style={styles.td}>{cat.coefficient_degressif || '-'}</td>
                    <td style={styles.td}>
                      {cat.compte_comptable_defaut ? (
                        <span style={styles.compte}>{cat.compte_comptable_defaut}</span>
                      ) : '-'}
                    </td>
                    <td style={styles.td}>{getStatusBadge(cat.actif)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleEdit(cat)}
                          style={styles.actionButton.edit}
                          title="Modifier"
                          disabled={!can(['admin'])}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.nom_categorie)}
                          style={styles.actionButton.delete}
                          title="Désactiver"
                          disabled={!can(['admin'])}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ============ STYLES ============
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#666',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  iconButton: {
    padding: '0.5rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  searchIcon: {
    color: '#9ca3af',
    marginRight: '0.75rem'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    padding: '0.5rem 0'
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#666',
    textTransform: 'uppercase'
  },
  statValue: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#111'
  },
  formCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#9ca3af'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginBottom: '1.5rem'
  },
  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    marginBottom: '0.5rem'
  },
  formGroupFull: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  required: {
    color: '#ef4444'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    transition: 'border-color 0.2s'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'var(--bg-card)'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    resize: 'vertical'
  },
  helper: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.25rem'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tableContainer: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '900px'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '1rem',
    color: '#4b5563'
  },
  code: {
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    fontFamily: 'monospace'
  },
  cellWithDesc: {
    display: 'flex',
    flexDirection: 'column'
  },
  nom: {
    fontWeight: '500'
  },
  description: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.25rem'
  },
  modeBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  compte: {
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'monospace'
  },
  badge: {
    active: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    inactive: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '500'
    }
  },
  actions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionButton: {
    edit: {
      padding: '0.25rem 0.5rem',
      backgroundColor: '#f59e0b',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    delete: {
      padding: '0.25rem 0.5rem',
      backgroundColor: '#ef4444',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem'
  },
  emptyText: {
    color: '#666',
    marginBottom: '1rem'
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

// Animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default CategoriesAmortissement;