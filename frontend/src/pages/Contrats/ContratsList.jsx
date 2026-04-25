import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEye, FiEdit, FiTrash2, FiFileText,
  FiCalendar, FiDollarSign, FiUser, FiSearch,
  FiRefreshCw, FiInfo, FiAlertCircle, FiCheckCircle,
  FiClock, FiTag
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ContratsList = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { can } = usePermissions();
  
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contratToDelete, setContratToDelete] = useState(null);

  useEffect(() => {
    console.log('🆔 ID actif reçu:', id);
    
    if (id && id !== 'undefined') {
      chargerContratsParActif();
    } else {
      chargerTousContrats();
    }
  }, [id]);

  const chargerContratsParActif = async () => {
    if (!id || id === 'undefined') {
      setError('ID actif invalide');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Chargement contrats pour actif:', id);
      
      const res = await api.get(`/actifs/${id}/contrats`);
      setContrats(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement contrats:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const chargerTousContrats = async () => {
    try {
      setLoading(true);
      console.log('📦 Chargement de tous les contrats');
      
      const res = await api.get('/contrats');
      setContrats(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement contrats:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (contrat) => {
    setContratToDelete(contrat);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!contratToDelete) return;
    
    try {
      if (id && id !== 'undefined') {
        await api.delete(`/actifs/${id}/contrats/${contratToDelete.id}`);
      } else {
        await api.delete(`/contrats/${contratToDelete.id}`);
      }
      
      if (id && id !== 'undefined') {
        chargerContratsParActif();
      } else {
        chargerTousContrats();
      }
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setShowDeleteModal(false);
      setContratToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0
      }).format(value);
    } catch {
      return `${value} FC`;
    }
  };

  const getStatutInfo = (dateFin) => {
    if (!dateFin) return { label: 'Non défini', variant: 'secondary', icon: <FiInfo size={12} /> };
    
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    
    if (fin < aujourdhui) {
      return { label: 'Expiré', variant: 'danger', icon: <FiAlertCircle size={12} /> };
    }
    
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) {
      return { label: `Expire bientôt (${joursRestants}j)`, variant: 'warning', icon: <FiClock size={12} /> };
    }
    
    return { label: 'Actif', variant: 'success', icon: <FiCheckCircle size={12} /> };
  };

  const filteredContrats = contrats.filter(contrat =>
    contrat.numero_contrat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contrat.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contrat.description && contrat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: contrats.length,
    actifs: contrats.filter(c => new Date(c.date_fin) > new Date()).length,
    expires: contrats.filter(c => new Date(c.date_fin) < new Date()).length,
    montantTotal: contrats.reduce((sum, c) => sum + (c.montant || 0), 0)
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
    .contrat-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .contrat-slide-in {
      animation: slideIn 0.3s ease-out;
    }
    .card-hover {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Chargement des contrats...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container text-center py-5">
          <div className="alert alert-danger mx-auto" style={{ maxWidth: '500px' }}>
            <FiAlertCircle size={24} className="mb-2" />
            <p className="mb-3">{error}</p>
            <button onClick={() => navigate('/actifs')} className="btn btn-primary">
              Retour
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container-fluid py-4 px-3 px-md-4 contrat-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Modal de confirmation de suppression */}
        <div className={`modal fade ${showDeleteModal ? 'show d-block' : ''}`} 
             style={{ display: showDeleteModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
             onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiTrash2 size={18} /> Confirmer la suppression
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Êtes-vous sûr de vouloir supprimer le contrat <strong className="text-danger">"{contratToDelete?.numero_contrat}"</strong> ?</p>
                <p className="text-muted small mb-0">Cette action est irréversible.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>Confirmer</button>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiFileText size={32} /> {id ? 'Contrats de l\'actif' : 'Tous les contrats'}
            </h1>
            <p className="text-muted small mb-0">
              {stats.total} contrat(s) trouvé(s)
            </p>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group" role="group">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Vue grille"
              >
                🃏 Cartes
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                title="Vue liste"
              >
                📋 Liste
              </button>
            </div>
            <button onClick={() => {
              if (id && id !== 'undefined') {
                chargerContratsParActif();
              } else {
                chargerTousContrats();
              }
            }} className="btn btn-outline-secondary d-flex align-items-center gap-1" title="Rafraîchir">
              <FiRefreshCw size={16} />
            </button>
            {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && id && (
              <button
                onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)}
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <FiPlus size={16} /> Nouveau contrat
              </button>
            )}
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-primary bg-opacity-10 text-center card-hover">
              <div className="card-body py-3">
                <FiFileText size={24} className="text-primary mb-2" />
                <small className="text-muted d-block">Total contrats</small>
                <div className="h3 mb-0 fw-bold text-primary">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-success bg-opacity-10 text-center card-hover">
              <div className="card-body py-3">
                <FiTag size={24} className="text-success mb-2" />
                <small className="text-muted d-block">Contrats actifs</small>
                <div className="h3 mb-0 fw-bold text-success">{stats.actifs}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-danger bg-opacity-10 text-center card-hover">
              <div className="card-body py-3">
                <FiClock size={24} className="text-danger mb-2" />
                <small className="text-muted d-block">Expirés</small>
                <div className="h3 mb-0 fw-bold text-danger">{stats.expires}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 bg-info bg-opacity-10 text-center card-hover">
              <div className="card-body py-3">
                <FiDollarSign size={24} className="text-info mb-2" />
                <small className="text-muted d-block">Montant total</small>
                <div className="h6 mb-0 fw-bold text-info">{formatCurrency(stats.montantTotal)}</div>
              </div>
            </div>
          </div>
        </div>

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
                placeholder="Rechercher par numéro, fournisseur ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchTerm('')}
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        {contrats.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-3">
            <FiFileText size={48} className="text-muted mb-3" />
            <p className="text-muted mb-3">Aucun contrat trouvé</p>
            {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && id && (
              <button
                onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)}
                className="btn btn-primary d-inline-flex align-items-center gap-2"
              >
                <FiPlus size={16} /> Ajouter un contrat
              </button>
            )}
          </div>
        ) : filteredContrats.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-3">
            <FiSearch size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">Aucun contrat ne correspond à votre recherche</p>
          </div>
        ) : viewMode === 'grid' ? (
          // Vue Grille
          <div className="row g-3">
            {filteredContrats.map((contrat) => {
              const statutInfo = getStatutInfo(contrat.date_fin);
              return (
                <div key={contrat.id} className="col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0 rounded-3 card-hover">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="card-title fw-semibold mb-1">{contrat.numero_contrat}</h6>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <FiUser size={12} /> {contrat.fournisseur || 'N/A'}
                          </small>
                        </div>
                        <span className={`badge bg-${statutInfo.variant} bg-opacity-10 text-${statutInfo.variant} d-inline-flex align-items-center gap-1 px-2 py-1`}>
                          {statutInfo.icon} {statutInfo.label}
                        </span>
                      </div>
                      
                      {contrat.description && (
                        <p className="card-text small text-muted mb-3">{contrat.description.substring(0, 80)}</p>
                      )}
                      
                      <hr />
                      
                      <div className="d-flex justify-content-between small mb-2">
                        <span className="text-muted d-flex align-items-center gap-1">
                          <FiCalendar size={12} /> Période
                        </span>
                        <span>{formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}</span>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span className="text-muted d-flex align-items-center gap-1">
                          <FiDollarSign size={12} /> Montant
                        </span>
                        <span className="fw-bold text-success">{formatCurrency(contrat.montant)}</span>
                      </div>
                    </div>
                    <div className="card-footer bg-white border-top-0 pb-3 pt-0">
                      <div className="d-flex gap-2">
                        <button
                          onClick={() => navigate(`/contrats/${contrat.id}`)}
                          className="btn btn-outline-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        >
                          <FiEye size={14} /> Détails
                        </button>
                        {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && (
                          <>
                            <button
                              onClick={() => {
                                if (id) {
                                  navigate(`/actifs/${id}/contrats/modifier/${contrat.id}`);
                                } else {
                                  navigate(`/contrats/modifier/${contrat.id}`);
                                }
                              }}
                              className="btn btn-outline-warning btn-sm d-flex align-items-center justify-content-center gap-1"
                              style={{ flex: '0.5' }}
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(contrat)}
                              className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center gap-1"
                              style={{ flex: '0.5' }}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vue Liste
          <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Numéro</th>
                    <th>Fournisseur</th>
                    <th>Période</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContrats.map((contrat) => {
                    const statutInfo = getStatutInfo(contrat.date_fin);
                    return (
                      <tr key={contrat.id}>
                        <td>
                          <div className="fw-semibold">{contrat.numero_contrat}</div>
                          {contrat.description && (
                            <small className="text-muted d-block">{contrat.description.substring(0, 50)}</small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FiUser size={14} className="text-muted" />
                            <span>{contrat.fournisseur || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="text-nowrap">
                          {formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}
                        </td>
                        <td className="fw-semibold text-success">{formatCurrency(contrat.montant)}</td>
                        <td>
                          <span className={`badge bg-${statutInfo.variant} bg-opacity-10 text-${statutInfo.variant} d-inline-flex align-items-center gap-1 px-2 py-1`}>
                            {statutInfo.icon} {statutInfo.label}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              onClick={() => navigate(`/contrats/${contrat.id}`)}
                              className="btn btn-outline-primary"
                              title="Voir détails"
                            >
                              <FiEye size={14} />
                            </button>
                            {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && (
                              <>
                                <button
                                  onClick={() => {
                                    if (id) {
                                      navigate(`/actifs/${id}/contrats/modifier/${contrat.id}`);
                                    } else {
                                      navigate(`/contrats/modifier/${contrat.id}`);
                                    }
                                  }}
                                  className="btn btn-outline-warning"
                                  title="Modifier"
                                >
                                  <FiEdit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(contrat)}
                                  className="btn btn-outline-danger"
                                  title="Supprimer"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan="3" className="fw-bold">Total</td>
                    <td className="fw-bold text-success">{formatCurrency(stats.montantTotal)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Note d'information */}
        <div className="alert alert-info mt-3 mb-0 py-2">
          <small className="d-flex align-items-center gap-2">
            <FiInfo size={14} />
            Les contrats expirés seront automatiquement signalés dans les alertes.
          </small>
        </div>
      </div>
    </>
  );
};

export default ContratsList;