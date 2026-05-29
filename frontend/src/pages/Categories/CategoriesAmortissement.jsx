// frontend/src/pages/Categories/CategoriesAmortissement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw,
  FiSearch, FiFilter, FiDownload, FiEye, FiClock,
  FiTrendingUp, FiDollarSign, FiCalendar, FiTag,
  FiInfo, FiAlertCircle, FiCheckCircle, FiCpu, FiStar,
  FiBookOpen, FiHelpCircle, FiChevronRight, FiShield,
  FiGrid, FiList
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Spinner, Button, Badge, Alert, ProgressBar } from 'react-bootstrap';

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
  
  // États IA
  const [showAIAnalyse, setShowAIAnalyse] = useState(false);
  const [aiAnalyse, setAiAnalyse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCategorieForIA, setSelectedCategorieForIA] = useState(null);

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

  const handleAIAnalyse = async (categorie) => {
    setSelectedCategorieForIA(categorie);
    setAiLoading(true);
    setShowAIAnalyse(true);
    
    try {
      const response = await api.post('/ai/analyser-categorie', {
        categorie: {
          code: categorie.code_categorie,
          nom: categorie.nom_categorie,
          description: categorie.description,
          duree_vie_ans: categorie.duree_vie_ans,
          mode_amortissement: categorie.mode_amortissement_defaut,
          coefficient: categorie.coefficient_degressif,
          compte_comptable: categorie.compte_comptable_defaut
        },
        contexte: {
          total_categories: categories.length,
          duree_moyenne: categories.length > 0 
            ? (categories.reduce((sum, c) => sum + (c.duree_vie_ans || 0), 0) / categories.length).toFixed(1)
            : 0
        }
      });
      setAiAnalyse(response.data);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      
      const tauxCalcule = 100 / categorie.duree_vie_ans;
      const tauxSaisi = categorie.taux_amortissement;
      
      let recommendations = [];
      let anomalies = [];
      
      if (categorie.mode_amortissement_defaut === 'lineaire' && tauxSaisi && Math.abs(tauxSaisi - tauxCalcule) > 0.5) {
        anomalies.push(`Le taux saisi (${tauxSaisi}%) diffère du taux standard (${tauxCalcule.toFixed(2)}%) pour une durée de ${categorie.duree_vie_ans} ans.`);
        recommendations.push(`Corriger le taux d'amortissement à ${tauxCalcule.toFixed(2)}% ou ajuster la durée.`);
      }
      
      if (categorie.mode_amortissement_defaut === 'degressif') {
        const coefficientRecommandations = {
          1.25: '3-4 ans',
          1.75: '5-6 ans',
          2.25: '7 ans et plus'
        };
        for (const [coeff, duree] of Object.entries(coefficientRecommandations)) {
          if (categorie.coefficient_degressif === parseFloat(coeff) && categorie.duree_vie_ans !== parseInt(duree.split('-')[0])) {
            recommendations.push(`Pour un coefficient dégressif de ${coeff}, la durée recommandée est ${duree}.`);
          }
        }
      }
      
      if (!categorie.compte_comptable_defaut) {
        recommendations.push("Ajouter un compte comptable par défaut pour faciliter la saisie des actifs.");
      }
      
      const comptesRecommandes = {
        'LOG': '205',
        'MAT': '2183',
        'VEH': '2182',
        'BAT': '213',
        'TER': '211',
        'BRE': '2051',
        'LIC': '2052',
        'FON': '207'
      };
      
      const compteRecommande = comptesRecommandes[categorie.code_categorie];
      if (compteRecommande && categorie.compte_comptable_defaut !== compteRecommande) {
        recommendations.push(`Compte comptable recommandé pour cette catégorie: ${compteRecommande}`);
      }
      
      setAiAnalyse({
        categorie: {
          code: categorie.code_categorie,
          nom: categorie.nom_categorie,
          duree_vie: categorie.duree_vie_ans,
          mode: categorie.mode_amortissement_defaut === 'lineaire' ? 'Linéaire' : 'Dégressif',
          taux: tauxSaisi || tauxCalcule.toFixed(2),
          coefficient: categorie.coefficient_degressif,
          compte: categorie.compte_comptable_defaut || 'Non défini'
        },
        calculs: {
          taux_standard: `${tauxCalcule.toFixed(2)}%`,
          annuite_theorique: `100% / ${categorie.duree_vie_ans} ans = ${tauxCalcule.toFixed(2)}%`,
          duree_recommandee: categorie.mode_amortissement_defaut === 'degressif' 
            ? `${categorie.duree_vie_ans} ans (coefficient ${categorie.coefficient_degressif})`
            : `${categorie.duree_vie_ans} ans`
        },
        explication: genereExplicationCategorie(categorie),
        recommandations: recommendations,
        anomalies: anomalies,
        type_actifs: getActifsTypesRecommandes(categorie.code_categorie),
        date_analyse: new Date().toISOString()
      });
    } finally {
      setAiLoading(false);
    }
  };

  const genereExplicationCategorie = (categorie) => {
    const modeTexte = categorie.mode_amortissement_defaut === 'lineaire' 
      ? 'linéaire (annuités constantes)' 
      : 'dégressif (annuités décroissantes)';
    
    let explication = `La catégorie "${categorie.nom_categorie}" (${categorie.code_categorie}) est configurée avec une durée de vie de ${categorie.duree_vie_ans} ans et un amortissement ${modeTexte}.`;
    
    if (categorie.mode_amortissement_defaut === 'degressif') {
      explication += ` Le coefficient dégressif appliqué est de ${categorie.coefficient_degressif}.`;
    }
    
    explication += ` Cette configuration est adaptée pour les actifs de type ${getActifsTypesRecommandes(categorie.code_categorie)}.`;
    
    return explication;
  };

  const getActifsTypesRecommandes = (code) => {
    const types = {
      'LOG': 'logiciels, applications, solutions SaaS',
      'MAT': 'ordinateurs, serveurs, imprimantes, périphériques',
      'VEH': 'véhicules utilitaires, voitures de fonction',
      'BAT': 'immeubles, constructions, bâtiments administratifs',
      'TER': 'terrains, parcelles foncières',
      'BRE': 'brevets, propriété intellectuelle',
      'LIC': 'licences logicielles, droits d\'utilisation',
      'FON': 'fonds commercial, clientèle, marques'
    };
    return types[code] || 'actifs immobilisés';
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

  const getModeColor = (mode) => {
    return mode === 'lineaire' ? '#10b981' : '#f59e0b';
  };

  const getStatusBadge = (actif) => {
    return actif ? (
      <span className="badge px-3 py-2" style={{ backgroundColor: '#10b98120', color: '#0f172a', fontWeight: 500 }}>
        ● Actif
      </span>
    ) : (
      <span className="badge px-3 py-2" style={{ backgroundColor: '#ef444420', color: '#0f172a', fontWeight: 500 }}>
        ○ Inactif
      </span>
    );
  };

  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .slide-in { animation: slideIn 0.4s ease-out; }
    .pulse { animation: pulse 2s infinite; }
    .card-hover {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }
    .table-row-hover {
      transition: all 0.2s ease;
    }
    .table-row-hover:hover {
      background-color: rgba(0, 0, 0, 0.05);
      cursor: pointer;
    }
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Styles pour texte noir sur fond clair */
    .text-dark-important,
    .text-dark-important * {
      color: #1e293b !important;
    }
    
    .card-text, .card-title, .fw-semibold {
      color: #1e293b !important;
    }
    
    .text-muted {
      color: #64748b !important;
    }
    
    code {
      background: #f1f5f9 !important;
      color: #2563eb !important;
      padding: 0.2rem 0.4rem !important;
      border-radius: 6px !important;
    }
    
    .bg-white-card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
    }
    
    .table thead th {
      color: #1e293b !important;
      background: #f8fafc !important;
    }
    
    .table td {
      color: #334155 !important;
    }
    
    .alert-info {
      background: #eff6ff !important;
      border: 1px solid #bfdbfe !important;
      color: #1e40af !important;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* Modal Analyse IA - gardé comme avant */}
      <Modal show={showAIAnalyse} onHide={() => setShowAIAnalyse(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
          <Modal.Title className="d-flex align-items-center gap-2">
            <GiArtificialIntelligence size={24} className="pulse" /> Analyse IA - Catégorie
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#1a1a2e', maxHeight: '70vh', overflowY: 'auto' }}>
          {aiLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-white-50">Analyse en cours...</p>
            </div>
          ) : aiAnalyse ? (
            <div>
              <div className="text-center mb-4">
                <Badge className="px-3 py-2 mb-2" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                  {aiAnalyse.categorie.code}
                </Badge>
                <h3 className="text-white mb-1">{aiAnalyse.categorie.nom}</h3>
                <p className="text-white-50 small">
                  {aiAnalyse.categorie.mode} • {aiAnalyse.categorie.duree_vie} ans
                </p>
              </div>
              
              <div className="mb-3 p-3 rounded" style={{ background: '#2d2d3a', borderLeft: '4px solid #06b6d4' }}>
                <strong className="text-info">📋 Explication détaillée</strong>
                <p className="mt-2 text-white-50" style={{ lineHeight: 1.6 }}>{aiAnalyse.explication}</p>
              </div>
              
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <div className="p-3 rounded" style={{ background: '#2d2d3a' }}>
                    <strong className="text-warning">📊 Paramètres de calcul</strong>
                    <div className="mt-2">
                      <div className="d-flex justify-content-between mb-2">
                        <small className="text-white-50">Taux standard</small>
                        <strong className="text-white">{aiAnalyse.calculs.taux_standard}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <small className="text-white-50">Formule</small>
                        <strong className="text-white">{aiAnalyse.calculs.annuite_theorique}</strong>
                      </div>
                      {aiAnalyse.categorie.coefficient && (
                        <div className="d-flex justify-content-between">
                          <small className="text-white-50">Coefficient</small>
                          <strong className="text-white">{aiAnalyse.categorie.coefficient}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 rounded" style={{ background: '#2d2d3a' }}>
                    <strong className="text-success">💰 Comptabilité</strong>
                    <div className="mt-2">
                      <div className="d-flex justify-content-between">
                        <small className="text-white-50">Compte comptable</small>
                        <code className="text-success bg-dark px-2 py-1 rounded">{aiAnalyse.categorie.compte}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {aiAnalyse.type_actifs && (
                <div className="mb-3 p-3 rounded" style={{ background: '#2d2d3a', borderLeft: '4px solid #10b981' }}>
                  <strong className="text-success">🏷️ Types d'actifs recommandés</strong>
                  <p className="mt-2 text-white-50">{aiAnalyse.type_actifs}</p>
                </div>
              )}
              
              {aiAnalyse.anomalies && aiAnalyse.anomalies.length > 0 && (
                <div className="mb-3 p-3 rounded" style={{ background: '#2d2d3a', borderLeft: '4px solid #ef4444' }}>
                  <strong className="text-danger">⚠️ Points d'attention</strong>
                  <ul className="mt-2 mb-0 ps-3">
                    {aiAnalyse.anomalies.map((a, i) => (
                      <li key={i} className="text-white-50 small mb-1">{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {aiAnalyse.recommandations && aiAnalyse.recommandations.length > 0 && (
                <div className="mb-3 p-3 rounded" style={{ background: '#2d2d3a', borderLeft: '4px solid #f59e0b' }}>
                  <strong className="text-warning">💡 Recommandations</strong>
                  <ul className="mt-2 mb-0 ps-3">
                    {aiAnalyse.recommandations.map((r, i) => (
                      <li key={i} className="text-white-50 small mb-1">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="text-center mt-3">
                <small className="text-muted">
                  Analyse générée le {new Date(aiAnalyse.date_analyse).toLocaleDateString('fr-FR')} à {new Date(aiAnalyse.date_analyse).toLocaleTimeString('fr-FR')}
                </small>
              </div>
            </div>
          ) : (
            <p className="text-center text-white-50">Analyse non disponible</p>
          )}
        </Modal.Body>
        <Modal.Footer style={{ background: '#1a1a2e', borderTop: '1px solid #333' }}>
          <Button variant="secondary" onClick={() => setShowAIAnalyse(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>
      
      {/* Page principale avec fond dégradé et textes NOIRS */}
      <div className="gradient-bg" style={{ minHeight: '100vh' }}>
        <div className="container-fluid py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1400px' }}>
          
          {/* Header - textes NOIRS */}
          <div className="row align-items-center mb-4">
            <div className="col">
              <h1 className="display-5 fw-bold mb-2 d-flex align-items-center gap-3" style={{ color: '#1e293b' }}>
                <FiTag size={40} className="pulse" style={{ color: '#1e293b' }} />
                Catégories d'amortissement
              </h1>
              <p className="mb-0" style={{ fontSize: '1rem', color: '#334155' }}>
                Paramétrage des durées de vie par catégorie selon les règles comptables
                <span className="ms-2" style={{ color: '#7c3aed' }}>
                  ✨ Cliquez sur l'icône IA pour une analyse détaillée
                </span>
              </p>
            </div>
            <div className="col-auto">
              <div className="d-flex gap-2">
                <div className="btn-group" role="group">
                  <button 
                    onClick={() => setViewMode('table')} 
                    className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-dark'}`}
                    style={{ borderRadius: '8px 0 0 8px' }}
                  >
                    <FiList size={16} className="me-1" /> Tableau
                  </button>
                  <button 
                    onClick={() => setViewMode('cards')} 
                    className={`btn ${viewMode === 'cards' ? 'btn-dark' : 'btn-outline-dark'}`}
                    style={{ borderRadius: '0 8px 8px 0' }}
                  >
                    <FiGrid size={16} className="me-1" /> Cartes
                  </button>
                </div>
                <button 
                  onClick={fetchCategories} 
                  className="btn btn-outline-dark"
                  style={{ borderRadius: '8px' }}
                  disabled={loading}
                >
                  <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
                {can(['admin']) && (
                  <button 
                    onClick={() => { resetForm(); setShowForm(true); }} 
                    className="btn btn-dark"
                    style={{ borderRadius: '8px', fontWeight: 500 }}
                  >
                    <FiPlus size={16} className="me-1" /> Nouvelle catégorie
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages d'alerte */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show mb-3" style={{ borderRadius: '12px', borderLeft: '4px solid #dc2626' }} role="alert">
              <div className="d-flex align-items-center gap-2">
                <FiAlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="alert" onClick={() => setError('')}></button>
            </div>
          )}
          {success && (
            <div className="alert alert-success alert-dismissible fade show mb-3" style={{ borderRadius: '12px', borderLeft: '4px solid #10b981' }} role="alert">
              <div className="d-flex align-items-center gap-2">
                <FiCheckCircle size={18} />
                <span>{success}</span>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="alert" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Barre de recherche - fond BLANC */}
          <div className="card border-0 shadow-lg mb-4 bg-white" style={{ borderRadius: '16px' }}>
            <div className="card-body p-3">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '12px 0 0 12px', color: '#64748b' }}>
                  <FiSearch className="text-dark" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Rechercher par code, nom ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ backgroundColor: 'white', borderRadius: '0 12px 12px 0', color: '#1e293b' }}
                />
                {searchTerm && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearchTerm('')} style={{ borderRadius: '12px' }}>
                    <FiX />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Formulaire d'ajout/édition - fond BLANC */}
          {showForm && (
            <div className="card border-0 shadow-lg mb-4 slide-in bg-white" style={{ borderRadius: '16px' }}>
              <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                <h3 className="h5 mb-0 fw-bold text-primary">
                  {editing ? '✏️ Modifier la catégorie' : '➕ Nouvelle catégorie'}
                </h3>
                <button onClick={resetForm} className="btn btn-sm btn-link text-secondary p-0">
                  <FiX size={24} />
                </button>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Code catégorie <span className="text-danger">*</span></label>
                        <input 
                          type="text" 
                          name="code_categorie" 
                          value={formData.code_categorie} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          placeholder="ex: LOG, MAT, VEH"
                          style={{ borderRadius: '10px' }}
                          required 
                          disabled={!!editing} 
                        />
                        <small className="text-muted">Code unique en 3-10 caractères</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Nom <span className="text-danger">*</span></label>
                        <input 
                          type="text" 
                          name="nom_categorie" 
                          value={formData.nom_categorie} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          placeholder="ex: Logiciels"
                          style={{ borderRadius: '10px' }}
                          required 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Durée de vie (ans) <span className="text-danger">*</span></label>
                        <input 
                          type="number" 
                          name="duree_vie_ans" 
                          value={formData.duree_vie_ans} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          min="1" 
                          max="50" 
                          style={{ borderRadius: '10px' }}
                          required 
                        />
                        <small className="text-muted">Entre 1 et 50 ans</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Mode d'amortissement</label>
                        <select 
                          name="mode_amortissement_defaut" 
                          value={formData.mode_amortissement_defaut} 
                          onChange={handleInputChange} 
                          className="form-select"
                          style={{ borderRadius: '10px' }}
                        >
                          <option value="lineaire">Linéaire (annuités constantes)</option>
                          <option value="degressif">Dégressif (annuités décroissantes)</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Taux d'amortissement (%)</label>
                        <input 
                          type="number" 
                          name="taux_amortissement" 
                          value={formData.taux_amortissement} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          step="0.01" 
                          min="0" 
                          max="100" 
                          placeholder="Calculé automatiquement"
                          style={{ borderRadius: '10px' }}
                        />
                        <small className="text-muted">Laisser vide pour calcul automatique</small>
                      </div>
                      {formData.mode_amortissement_defaut === 'degressif' && (
                        <div className="mb-3">
                          <label className="form-label fw-semibold text-dark">Coefficient dégressif</label>
                          <select 
                            name="coefficient_degressif" 
                            value={formData.coefficient_degressif} 
                            onChange={handleInputChange} 
                            className="form-select"
                            style={{ borderRadius: '10px' }}
                          >
                            <option value="1.25">1.25 (durée 3-4 ans)</option>
                            <option value="1.75">1.75 (durée 5-6 ans)</option>
                            <option value="2.25">2.25 (durée 7 ans et +)</option>
                          </select>
                        </div>
                      )}
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Compte comptable par défaut</label>
                        <input 
                          type="text" 
                          name="compte_comptable_defaut" 
                          value={formData.compte_comptable_defaut} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          placeholder="ex: 205, 2183, 2182"
                          style={{ borderRadius: '10px' }}
                        />
                        <small className="text-muted">Compte comptable GCEC</small>
                      </div>
                      {editing && (
                        <div className="mb-3">
                          <div className="form-check">
                            <input 
                              type="checkbox" 
                              name="actif" 
                              checked={formData.actif} 
                              onChange={handleInputChange} 
                              className="form-check-input" 
                              id="actif" 
                            />
                            <label className="form-check-label fw-semibold text-dark" htmlFor="actif">
                              Catégorie active
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">Description</label>
                        <textarea 
                          name="description" 
                          value={formData.description} 
                          onChange={handleInputChange} 
                          className="form-control" 
                          rows="3" 
                          placeholder="Description détaillée de la catégorie..."
                          style={{ borderRadius: '10px' }}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <hr />
                      <div className="d-flex gap-3 justify-content-end">
                        <button type="button" onClick={resetForm} className="btn btn-outline-secondary px-4">Annuler</button>
                        <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                          {saving ? <><Spinner size="sm" className="me-2" /> Enregistrement...</> : <><FiSave size={16} className="me-2" /> {editing ? 'Modifier' : 'Créer'}</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cartes statistiques - textes NOIRS */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-lg text-center card-hover bg-white" style={{ borderRadius: '16px', cursor: 'default' }}>
                <div className="card-body py-3">
                  <FiTag size={28} className="mb-2 opacity-75 text-primary" />
                  <div className="h2 mb-0 fw-bold text-dark">{categories.length}</div>
                  <small className="text-muted">Total catégories</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-lg text-center card-hover bg-white" style={{ borderRadius: '16px', cursor: 'default' }}>
                <div className="card-body py-3">
                  <FiClock size={28} className="mb-2 opacity-75 text-success" />
                  <div className="h2 mb-0 fw-bold text-dark">
                    {categories.length > 0 ? (categories.reduce((sum, c) => sum + (c.duree_vie_ans || 0), 0) / categories.length).toFixed(1) : 0}
                  </div>
                  <small className="text-muted">Durée moyenne (ans)</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-lg text-center card-hover bg-white" style={{ borderRadius: '16px', cursor: 'default' }}>
                <div className="card-body py-3">
                  <FiTrendingUp size={28} className="mb-2 opacity-75 text-warning" />
                  <div className="h2 mb-0 fw-bold text-dark">{categories.filter(c => c.mode_amortissement_defaut === 'lineaire').length}</div>
                  <small className="text-muted">Mode linéaire</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card border-0 shadow-lg text-center card-hover bg-white" style={{ borderRadius: '16px', cursor: 'default' }}>
                <div className="card-body py-3">
                  <FiTrendingUp size={28} className="mb-2 opacity-75 text-info" />
                  <div className="h2 mb-0 fw-bold text-dark">{categories.filter(c => c.mode_amortissement_defaut === 'degressif').length}</div>
                  <small className="text-muted">Mode dégressif</small>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal - textes NOIRS sur fond BLANC */}
          {loading ? (
            <div className="text-center py-5 bg-white" style={{ borderRadius: '16px' }}>
              <Spinner animation="border" variant="primary" size="lg" />
              <p className="mt-3 text-muted">Chargement des catégories...</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="card border-0 shadow-lg overflow-hidden bg-white" style={{ borderRadius: '16px' }}>
              <div className="table-responsive">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-5">
                    <FiTag size={64} className="text-muted mb-3 opacity-25" />
                    <p className="text-muted mb-0">
                      {searchTerm ? 'Aucune catégorie ne correspond à votre recherche' : 'Aucune catégorie trouvée'}
                    </p>
                    {can(['admin']) && !searchTerm && (
                      <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary mt-3">
                        <FiPlus size={16} className="me-2" /> Créer votre première catégorie
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Code</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Nom</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Durée</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Mode</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Coefficient</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Compte</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Statut</th>
                        <th style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((cat, index) => (
                        <tr key={cat.id} className="table-row-hover" style={{ animation: `fadeIn 0.3s ease-out ${index * 0.05}s both` }}>
                          <td style={{ padding: '12px' }}>
                            <code className="px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#2563eb', fontWeight: 500 }}>{cat.code_categorie}</code>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div className="fw-semibold text-dark">{cat.nom_categorie}</div>
                            {cat.description && <small className="text-muted d-block">{cat.description.substring(0, 60)}</small>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="fw-semibold text-dark">{cat.duree_vie_ans} ans</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge px-3 py-1" style={{ backgroundColor: `${getModeColor(cat.mode_amortissement_defaut)}20`, color: getModeColor(cat.mode_amortissement_defaut), fontWeight: 500 }}>
                              {getModeLabel(cat.mode_amortissement_defaut)}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {cat.coefficient_degressif ? (
                              <span className="fw-semibold text-dark">{cat.coefficient_degressif}</span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {cat.compte_comptable_defaut ? (
                              <code className="px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#059669' }}>{cat.compte_comptable_defaut}</code>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>{getStatusBadge(cat.actif)}</td>
                          <td style={{ padding: '12px' }}>
                            <div className="btn-group btn-group-sm gap-2">
                              <button 
                                onClick={() => handleAIAnalyse(cat)} 
                                className="btn btn-sm" 
                                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', borderRadius: '8px' }}
                                title="Analyser avec l'IA"
                              >
                                <GiArtificialIntelligence size={14} className="me-1" /> IA
                              </button>
                              <button 
                                onClick={() => handleEdit(cat)} 
                                className="btn btn-sm btn-outline-warning" 
                                style={{ borderRadius: '8px' }}
                                disabled={!can(['admin'])}
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(cat.id, cat.nom_categorie)} 
                                className="btn btn-sm btn-outline-danger" 
                                style={{ borderRadius: '8px' }}
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
            <div className="row g-3">
              {filteredCategories.length === 0 ? (
                <div className="col-12">
                  <div className="text-center py-5 bg-white" style={{ borderRadius: '16px' }}>
                    <FiTag size={64} className="text-muted mb-3 opacity-25" />
                    <p className="text-muted mb-0">
                      {searchTerm ? 'Aucune catégorie ne correspond à votre recherche' : 'Aucune catégorie trouvée'}
                    </p>
                    {can(['admin']) && !searchTerm && (
                      <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary mt-3">
                        <FiPlus size={16} className="me-2" /> Créer votre première catégorie
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredCategories.map((cat, index) => (
                  <div key={cat.id} className="col-md-6 col-lg-4" style={{ animation: `fadeIn 0.3s ease-out ${index * 0.05}s both` }}>
                    <div className="card h-100 border-0 shadow-lg card-hover bg-white" style={{ borderRadius: '16px' }}>
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <code className="px-3 py-1 rounded" style={{ background: 'linear-gradient(135deg, #667eea20, #764ba220)', color: '#667eea', fontWeight: 600 }}>
                            {cat.code_categorie}
                          </code>
                          {getStatusBadge(cat.actif)}
                        </div>
                        <h5 className="card-title fw-bold mb-2 text-dark">{cat.nom_categorie}</h5>
                        {cat.description && <p className="card-text text-muted small mb-3">{cat.description.substring(0, 100)}</p>}
                        <hr className="my-3" />
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="d-flex flex-column">
                              <small className="text-muted">📅 Durée</small>
                              <strong className="text-dark fs-5">{cat.duree_vie_ans} ans</strong>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex flex-column">
                              <small className="text-muted">📊 Mode</small>
                              <span className="badge mt-1" style={{ backgroundColor: `${getModeColor(cat.mode_amortissement_defaut)}20`, color: getModeColor(cat.mode_amortissement_defaut), alignSelf: 'flex-start', padding: '4px 12px' }}>
                                {getModeLabel(cat.mode_amortissement_defaut)}
                              </span>
                            </div>
                          </div>
                          {cat.coefficient_degressif && (
                            <div className="col-6">
                              <div className="d-flex flex-column">
                                <small className="text-muted">⚙️ Coefficient</small>
                                <strong className="text-dark">{cat.coefficient_degressif}</strong>
                              </div>
                            </div>
                          )}
                          {cat.compte_comptable_defaut && (
                            <div className="col-6">
                              <div className="d-flex flex-column">
                                <small className="text-muted">💰 Compte</small>
                                <code className="mt-1" style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#059669' }}>{cat.compte_comptable_defaut}</code>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {can(['admin']) && (
                        <div className="card-footer bg-transparent border-top-0 pb-4 pt-0">
                          <div className="d-flex gap-2">
                            <button 
                              onClick={() => handleAIAnalyse(cat)} 
                              className="btn flex-grow-1" 
                              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', borderRadius: '10px' }}
                            >
                              <GiArtificialIntelligence size={16} className="me-2" /> Analyser
                            </button>
                            <button 
                              onClick={() => handleEdit(cat)} 
                              className="btn btn-outline-warning" 
                              style={{ borderRadius: '10px' }}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(cat.id, cat.nom_categorie)} 
                              className="btn btn-outline-danger" 
                              style={{ borderRadius: '10px' }}
                            >
                              <FiTrash2 size={16} />
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
          <div className="alert mt-4 mb-0 py-3 bg-white" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
              <FiInfo size={18} className="text-primary" />
              <span className="text-dark">Les catégories d'amortissement permettent de paramétrer automatiquement la durée de vie et le mode d'amortissement des actifs selon leur nature.</span>
              <span className="px-2 py-1 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                <GiArtificialIntelligence size={14} className="me-1" />
                Cliquez sur l'icône IA pour une analyse détaillée
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <small className="text-dark d-flex align-items-center justify-content-center gap-2">
              <FiShield size={12} /> Données en temps réel — Paramétrage conforme aux normes comptables
            </small>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoriesAmortissement;