import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw,
  FiSearch, FiFilter, FiDownload, FiEye, FiClock,
  FiTrendingUp, FiDollarSign, FiCalendar, FiTag,
  FiInfo, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

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
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
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

  const getModeClass = (mode) => {
    return mode === 'lineaire' ? 'primary' : 'warning';
  };

  const getStatusBadge = (actif) => {
    return actif ? (
      <span className="badge bg-success bg-opacity-10 text-success px-2 py-1">Actif</span>
    ) : (
      <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1">Inactif</span>
    );
  };

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .category-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .category-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .stat-card-hover {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .table-row-hover {
      transition: background-color 0.2s ease;
    }
    .table-row-hover:hover {
      background-color: rgba(13, 110, 253, 0.05);
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container-fluid py-4 px-3 px-md-4 category-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiTag size={32} /> Catégories d'amortissement
            </h1>
            <p className="text-muted small mb-0">
              Paramétrage des durées de vie par catégorie selon les règles de la BCC
            </p>
          </div>
          <div className="d-flex gap-2">
            {/* Toggle vue */}
            <div className="btn-group" role="group">
              <button 
                onClick={() => setViewMode('table')} 
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Vue tableau"
              >
                📋 Tableau
              </button>
              <button 
                onClick={() => setViewMode('cards')} 
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Vue cartes"
              >
                🃏 Cartes
              </button>
            </div>
            <button 
              onClick={fetchCategories} 
              className="btn btn-outline-secondary d-flex align-items-center gap-1"
              title="Rafraîchir"
            >
              <FiRefreshCw size={16} />
            </button>
            {can(['admin']) && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <FiPlus size={16} /> Nouvelle catégorie
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
          </div>
        )}
        {success && (
          <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiCheckCircle size={16} />
              <span>{success}</span>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setSuccess('')}></button>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-body p-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <FiSearch className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Rechercher par code, nom ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchTerm('')}
                  type="button"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire d'ajout/édition */}
        {showForm && (
          <div className="card shadow-sm border-0 rounded-3 mb-4 category-slide-in">
            <div className="card-header bg-primary bg-opacity-10 border-0 d-flex justify-content-between align-items-center">
              <h3 className="h5 mb-0 fw-semibold text-primary">
                {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <button onClick={resetForm} className="btn btn-sm btn-link text-secondary p-0">
                <FiX size={20} />
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  {/* Colonne 1 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Code catégorie <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="code_categorie"
                        value={formData.code_categorie}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="ex: LOG, MAT, VEH"
                        required
                        disabled={!!editing}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Nom <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="nom_categorie"
                        value={formData.nom_categorie}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="ex: Logiciels, Matériel informatique"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Durée de vie (ans) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        name="duree_vie_ans"
                        value={formData.duree_vie_ans}
                        onChange={handleInputChange}
                        className="form-control"
                        min="1"
                        max="50"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Mode d'amortissement par défaut</label>
                      <select
                        name="mode_amortissement_defaut"
                        value={formData.mode_amortissement_defaut}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="lineaire">Linéaire</option>
                        <option value="degressif">Dégressif</option>
                      </select>
                    </div>
                  </div>

                  {/* Colonne 2 */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Taux d'amortissement (%)</label>
                      <input
                        type="number"
                        name="taux_amortissement"
                        value={formData.taux_amortissement}
                        onChange={handleInputChange}
                        className="form-control"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="20"
                      />
                    </div>

                    {formData.mode_amortissement_defaut === 'degressif' && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Coefficient dégressif</label>
                        <input
                          type="number"
                          name="coefficient_degressif"
                          value={formData.coefficient_degressif}
                          onChange={handleInputChange}
                          className="form-control"
                          step="0.25"
                          min="1"
                          max="3"
                        />
                        <small className="text-muted">
                          Standard: 1.25 (3-4 ans), 1.75 (5-6 ans), 2.25 (6+ ans)
                        </small>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Compte comptable par défaut</label>
                      <input
                        type="text"
                        name="compte_comptable_defaut"
                        value={formData.compte_comptable_defaut}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="ex: 205, 2183"
                      />
                    </div>

                    {editing && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Statut</label>
                        <div className="form-check">
                          <input
                            type="checkbox"
                            name="actif"
                            checked={formData.actif}
                            onChange={handleInputChange}
                            className="form-check-input"
                            id="actif"
                          />
                          <label className="form-check-label" htmlFor="actif">
                            Catégorie active
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description (pleine largeur) */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="form-control"
                        rows="3"
                        placeholder="Description de la catégorie..."
                      />
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="col-12">
                    <hr />
                    <div className="d-flex gap-3 justify-content-end">
                      <button 
                        type="button" 
                        onClick={resetForm} 
                        className="btn btn-outline-secondary d-flex align-items-center gap-2"
                      >
                        <FiX size={16} /> Annuler
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-success d-flex align-items-center gap-2"
                        disabled={saving}
                      >
                        <FiSave size={16} /> {saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Créer')}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cartes statistiques */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-primary bg-opacity-10 text-center stat-card-hover">
              <div className="card-body py-2">
                <FiTag size={20} className="text-primary mb-1" />
                <small className="text-muted d-block">Total catégories</small>
                <div className="h5 mb-0 fw-bold text-primary">{categories.length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-success bg-opacity-10 text-center stat-card-hover">
              <div className="card-body py-2">
                <FiClock size={20} className="text-success mb-1" />
                <small className="text-muted d-block">Durée moyenne</small>
                <div className="h5 mb-0 fw-bold text-success">
                  {categories.length > 0 
                    ? (categories.reduce((sum, c) => sum + (c.duree_vie_ans || 0), 0) / categories.length).toFixed(1) 
                    : 0} ans
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-info bg-opacity-10 text-center stat-card-hover">
              <div className="card-body py-2">
                <FiTrendingUp size={20} className="text-info mb-1" />
                <small className="text-muted d-block">Mode linéaire</small>
                <div className="h5 mb-0 fw-bold text-info">
                  {categories.filter(c => c.mode_amortissement_defaut === 'lineaire').length}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-warning bg-opacity-10 text-center stat-card-hover">
              <div className="card-body py-2">
                <FiTrendingUp size={20} className="text-warning mb-1" />
                <small className="text-muted d-block">Mode dégressif</small>
                <div className="h5 mb-0 fw-bold text-warning">
                  {categories.filter(c => c.mode_amortissement_defaut === 'degressif').length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des catégories - Vue Tableau */}
        {loading ? (
          <div className="text-center py-5 bg-white rounded-3">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Chargement des catégories...</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
            <div className="table-responsive">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-5">
                  <FiTag size={48} className="text-muted mb-3" />
                  <p className="text-muted mb-0">
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
                      className="btn btn-primary mt-3 d-inline-flex align-items-center gap-2"
                    >
                      <FiPlus size={16} /> Créer votre première catégorie
                    </button>
                  )}
                </div>
              ) : (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Nom</th>
                      <th>Durée (ans)</th>
                      <th>Mode</th>
                      <th>Coefficient</th>
                      <th>Compte</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => (
                      <tr key={cat.id} className="table-row-hover">
                        <td>
                          <code className="bg-light px-2 py-1 rounded">{cat.code_categorie}</code>
                        </td>
                        <td>
                          <div className="fw-semibold">{cat.nom_categorie}</div>
                          {cat.description && (
                            <small className="text-muted d-block">{cat.description}</small>
                          )}
                        </td>
                        <td>{cat.duree_vie_ans}</td>
                        <td>
                          <span className={`badge bg-${getModeClass(cat.mode_amortissement_defaut)} bg-opacity-10 text-${getModeClass(cat.mode_amortissement_defaut)}`}>
                            {getModeLabel(cat.mode_amortissement_defaut)}
                          </span>
                        </td>
                        <td>{cat.coefficient_degressif || '-'}</td>
                        <td>
                          {cat.compte_comptable_defaut ? (
                            <code className="bg-light px-2 py-1 rounded">{cat.compte_comptable_defaut}</code>
                          ) : '-'}
                        </td>
                        <td>{getStatusBadge(cat.actif)}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="btn btn-outline-warning"
                              title="Modifier"
                              disabled={!can(['admin'])}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, cat.nom_categorie)}
                              className="btn btn-outline-danger"
                              title="Désactiver"
                              disabled={!can(['admin'])}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          // Vue Cartes
          <div className="row g-3">
            {filteredCategories.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5 bg-white rounded-3">
                  <FiTag size={48} className="text-muted mb-3" />
                  <p className="text-muted mb-0">
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
                      className="btn btn-primary mt-3 d-inline-flex align-items-center gap-2"
                    >
                      <FiPlus size={16} /> Créer votre première catégorie
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0 rounded-3 category-fade-in">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <code className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded">
                          {cat.code_categorie}
                        </code>
                        {getStatusBadge(cat.actif)}
                      </div>
                      <h5 className="card-title fw-semibold mb-1">{cat.nom_categorie}</h5>
                      {cat.description && (
                        <p className="card-text small text-muted mb-3">{cat.description}</p>
                      )}
                      <hr />
                      <div className="row g-2 small">
                        <div className="col-6">
                          <span className="text-muted d-block">Durée</span>
                          <strong>{cat.duree_vie_ans} ans</strong>
                        </div>
                        <div className="col-6">
                          <span className="text-muted d-block">Mode</span>
                          <span className={`badge bg-${getModeClass(cat.mode_amortissement_defaut)} bg-opacity-10 text-${getModeClass(cat.mode_amortissement_defaut)}`}>
                            {getModeLabel(cat.mode_amortissement_defaut)}
                          </span>
                        </div>
                        {cat.coefficient_degressif && (
                          <div className="col-6">
                            <span className="text-muted d-block">Coefficient</span>
                            <strong>{cat.coefficient_degressif}</strong>
                          </div>
                        )}
                        {cat.compte_comptable_defaut && (
                          <div className="col-6">
                            <span className="text-muted d-block">Compte</span>
                            <code>{cat.compte_comptable_defaut}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    {can(['admin']) && (
                      <div className="card-footer bg-white border-top-0 pb-3 pt-0">
                        <div className="d-flex gap-2">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="btn btn-outline-warning btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                          >
                            <FiEdit2 size={14} /> Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.nom_categorie)}
                            className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center gap-1"
                            style={{ flex: '0.5' }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Note d'information */}
        <div className="alert alert-info mt-3 mb-0 py-2">
          <small className="d-flex align-items-center gap-2">
            <FiInfo size={14} />
            Les catégories d'amortissement permettent de paramétrer automatiquement la durée de vie et le mode d'amortissement des actifs selon leur nature.
          </small>
        </div>
      </div>
    </>
  );
};

export default CategoriesAmortissement;