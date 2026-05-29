// frontend/src/pages/Contrats/ContratsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEye, FiEdit, FiTrash2, FiFileText,
  FiCalendar, FiDollarSign, FiUser, FiSearch,
  FiRefreshCw, FiInfo, FiAlertCircle, FiCheckCircle,
  FiClock, FiTag, FiGrid, FiList, FiTrendingUp
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
      const res = await api.get(`/actifs/${id}/contrats`);
      setContrats(res.data);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const chargerTousContrats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contrats');
      setContrats(res.data);
    } catch (err) {
      console.error(err);
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
      console.error(err);
      alert('Erreur lors de la suppression');
    } finally {
      setShowDeleteModal(false);
      setContratToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
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
    if (!dateFin) return { label: 'Non défini', variant: 'secondary', icon: <FiInfo size={12} />, color: '#6c757d' };
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    if (fin < aujourdhui) {
      return { label: 'Expiré', variant: 'danger', icon: <FiAlertCircle size={12} />, color: '#dc2626' };
    }
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) {
      return { label: `Expire bientôt (${joursRestants}j)`, variant: 'warning', icon: <FiClock size={12} />, color: '#f59e0b' };
    }
    return { label: 'Actif', variant: 'success', icon: <FiCheckCircle size={12} />, color: '#10b981' };
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

  // Styles modernes et colorés
  const modernStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    .fade-up { animation: fadeInUp 0.4s ease-out; }
    .slide-in { animation: slideIn 0.3s ease-out; }
    .card-hover {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      border-radius: 20px;
      overflow: hidden;
    }
    .card-hover:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 30px -12px rgba(0,0,0,0.2);
    }
    .stat-card {
      border-radius: 20px;
      transition: transform 0.2s;
      cursor: default;
    }
    .stat-card:hover { transform: translateY(-3px); }
    .btn-circle {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .badge-modern {
      padding: 4px 12px;
      border-radius: 30px;
      font-weight: 500;
      font-size: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .table-modern {
      border-collapse: separate;
      border-spacing: 0 8px;
    }
    .table-modern tbody tr {
      background: white;
      border-radius: 16px;
      transition: box-shadow 0.2s;
    }
    .table-modern tbody tr:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .table-modern td, .table-modern th {
      border: none;
      padding: 1rem;
      vertical-align: middle;
    }
    .table-modern th {
      background: transparent;
      color: #1e293b;
      font-weight: 600;
    }
    .search-input {
      border-radius: 40px;
      padding: 0.6rem 1rem;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
    }
  `;

  if (loading) {
    return (
      <>
        <style>{modernStyles}</style>
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p className="text-muted">Chargement des contrats...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{modernStyles}</style>
        <div className="container text-center py-5" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
          <div className="alert alert-danger mx-auto" style={{ maxWidth: '500px', borderRadius: '20px' }}>
            <FiAlertCircle size={24} className="mb-2" />
            <p className="mb-3">{error}</p>
            <button onClick={() => navigate('/actifs')} className="btn btn-primary rounded-pill">Retour</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{modernStyles}</style>
      <div className="container-fluid py-4 px-3 px-md-4 fade-up" style={{ maxWidth: '1400px', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
        
        {/* Modal suppression (conserve même structure mais style amélioré) */}
        {showDeleteModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowDeleteModal(false)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content rounded-4 shadow-lg">
                <div className="modal-header bg-gradient-danger text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none' }}>
                  <h5 className="modal-title d-flex align-items-center gap-2"><FiTrash2 size={18} /> Confirmer la suppression</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Supprimer le contrat <strong className="text-danger">“{contratToDelete?.numero_contrat}”</strong> ?</p>
                  <p className="text-muted small">Action irréversible.</p>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                  <button type="button" className="btn btn-danger rounded-pill px-4" onClick={confirmDelete}>Confirmer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header avec dégradé */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold mb-1" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {id ? '📄 Contrats de l’actif' : '📑 Tous les contrats'}
            </h1>
            <p className="text-muted small mb-0">{stats.total} contrat(s) trouvé(s)</p>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group" role="group">
              <button onClick={() => setViewMode('grid')} className={`btn btn-sm rounded-start-pill ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`} title="Vue grille"><FiGrid size={14} /> Cartes</button>
              <button onClick={() => setViewMode('list')} className={`btn btn-sm rounded-end-pill ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`} title="Vue liste"><FiList size={14} /> Liste</button>
            </div>
            <button onClick={() => id ? chargerContratsParActif() : chargerTousContrats()} className="btn btn-outline-secondary btn-circle" title="Rafraîchir"><FiRefreshCw size={16} /></button>
            {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && id && (
              <button onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)} className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2">
                <FiPlus size={16} /> Nouveau contrat
              </button>
            )}
          </div>
        </div>

        {/* Statistiques en couleurs vives */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6"><div className="stat-card p-3 text-center" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '20px' }}><FiFileText size={28} className="text-primary mb-2" /><div className="text-muted small">Total contrats</div><div className="display-6 fw-bold text-primary">{stats.total}</div></div></div>
          <div className="col-md-3 col-6"><div className="stat-card p-3 text-center" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '20px' }}><FiTag size={28} className="text-success mb-2" /><div className="text-muted small">Actifs</div><div className="display-6 fw-bold text-success">{stats.actifs}</div></div></div>
          <div className="col-md-3 col-6"><div className="stat-card p-3 text-center" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)', borderRadius: '20px' }}><FiClock size={28} className="text-danger mb-2" /><div className="text-muted small">Expirés</div><div className="display-6 fw-bold text-danger">{stats.expires}</div></div></div>
          <div className="col-md-3 col-6"><div className="stat-card p-3 text-center" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '20px' }}><FiDollarSign size={28} className="text-warning mb-2" /><div className="text-muted small">Montant total</div><div className="fw-bold text-warning">{formatCurrency(stats.montantTotal)}</div></div></div>
        </div>

        {/* Barre de recherche modernisée */}
        <div className="mb-4">
          <div className="input-group shadow-sm">
            <span className="input-group-text bg-white border-end-0 rounded-start-pill"><FiSearch className="text-muted" /></span>
            <input type="text" className="form-control search-input border-start-0" placeholder="🔍 Rechercher par numéro, fournisseur ou description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button className="btn btn-outline-secondary rounded-end-pill" onClick={() => setSearchTerm('')}>✕</button>}
          </div>
        </div>

        {/* Affichage des contrats */}
        {contrats.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 shadow-sm"><FiFileText size={48} className="text-muted mb-3" /><p className="text-muted">Aucun contrat trouvé</p>{can(['admin', 'juridique', 'comptable', 'gestionnaire']) && id && <button onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)} className="btn btn-primary rounded-pill px-4"><FiPlus /> Ajouter un contrat</button>}</div>
        ) : filteredContrats.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 shadow-sm"><FiSearch size={48} className="text-muted mb-3" /><p className="text-muted">Aucun contrat ne correspond</p></div>
        ) : viewMode === 'grid' ? (
          <div className="row g-4">
            {filteredContrats.map(contrat => {
              const statut = getStatutInfo(contrat.date_fin);
              return (
                <div key={contrat.id} className="col-md-6 col-lg-4">
                  <div className="card card-hover h-100 bg-white rounded-4">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div><h5 className="fw-bold mb-1">{contrat.numero_contrat}</h5><small className="text-muted d-flex align-items-center gap-1"><FiUser size={12} /> {contrat.fournisseur || 'N/A'}</small></div>
                        <span className="badge-modern" style={{ backgroundColor: `${statut.color}20`, color: statut.color }}>{statut.icon} {statut.label}</span>
                      </div>
                      {contrat.description && <p className="text-muted small mb-3">{contrat.description.substring(0, 80)}…</p>}
                      <hr className="my-3" />
                      <div className="d-flex justify-content-between small mb-2"><span className="text-muted"><FiCalendar size={12} /> Période</span><span>{formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}</span></div>
                      <div className="d-flex justify-content-between small"><span className="text-muted"><FiDollarSign size={12} /> Montant</span><strong className="text-success">{formatCurrency(contrat.montant)}</strong></div>
                    </div>
                    <div className="card-footer bg-white border-0 pb-3 pt-0">
                      <div className="d-flex gap-2">
                        <button onClick={() => navigate(`/contrats/${contrat.id}`)} className="btn btn-outline-primary rounded-pill flex-grow-1"><FiEye size={14} /> Détails</button>
                        {can(['admin', 'juridique', 'comptable', 'gestionnaire']) && (
                          <>
                            <button onClick={() => id ? navigate(`/actifs/${id}/contrats/modifier/${contrat.id}`) : navigate(`/contrats/modifier/${contrat.id}`)} className="btn btn-outline-warning btn-circle"><FiEdit size={14} /></button>
                            <button onClick={() => handleDeleteClick(contrat)} className="btn btn-outline-danger btn-circle"><FiTrash2 size={14} /></button>
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
          <div className="bg-white rounded-4 shadow-sm p-0 overflow-hidden">
            <table className="table-modern w-100">
              <thead><tr><th>Numéro / Fournisseur</th><th>Période</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredContrats.map(contrat => {
                  const statut = getStatutInfo(contrat.date_fin);
                  return (
                    <tr key={contrat.id}>
                      <td><div className="fw-semibold">{contrat.numero_contrat}</div><small className="text-muted d-flex align-items-center gap-1"><FiUser size={12} /> {contrat.fournisseur || 'N/A'}</small></td>
                      <td className="text-nowrap"><FiCalendar size={12} className="me-1 text-muted" />{formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}</td>
                      <td className="fw-bold text-success">{formatCurrency(contrat.montant)}</td>
                      <td><span className="badge-modern" style={{ backgroundColor: `${statut.color}20`, color: statut.color }}>{statut.icon} {statut.label}</span></td>
                      <td><div className="btn-group"><button onClick={() => navigate(`/contrats/${contrat.id}`)} className="btn btn-outline-primary btn-circle"><FiEye size={14} /></button>{can(['admin', 'juridique', 'comptable', 'gestionnaire']) && <><button onClick={() => id ? navigate(`/actifs/${id}/contrats/modifier/${contrat.id}`) : navigate(`/contrats/modifier/${contrat.id}`)} className="btn btn-outline-warning btn-circle"><FiEdit size={14} /></button><button onClick={() => handleDeleteClick(contrat)} className="btn btn-outline-danger btn-circle"><FiTrash2 size={14} /></button></>}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="alert alert-info mt-4 rounded-4 py-2 shadow-sm"><small><FiInfo className="me-2" /> Les contrats expirés seront automatiquement signalés dans les alertes.</small></div>
      </div>
    </>
  );
};

export default ContratsList;