import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiArrowLeft, FiEdit, FiTrash2, FiDownload,
  FiCalendar, FiDollarSign, FiUser, FiFileText,
  FiInfo, FiPrinter, FiEye, FiCheckCircle,
  FiAlertCircle, FiClock, FiTag, FiPackage, FiRefreshCw
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

// ==================== FONCTIONS UTILITAIRES ====================
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

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + 
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Date invalide';
  }
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '0 CDF';
  try {
    const valeurArrondie = Math.round(parseFloat(value) || 0);
    const formate = valeurArrondie.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    });
    return `${formate} CDF`;
  } catch {
    return `${Math.round(value)} CDF`;
  }
};

// ==================== STYLES ====================
const styles = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  .fade-in { animation: fadeIn 0.3s ease-out; }
  .slide-in { animation: slideIn 0.3s ease-out; }
  
  .bg-dark-glass {
    background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85));
    backdrop-filter: blur(12px);
  }
  .border-cyan {
    border: 1px solid rgba(0, 255, 247, 0.3);
  }
  .text-cyan {
    color: #00fff7 !important;
  }
  .gradient-text {
    background: linear-gradient(135deg, #00fff7 0%, #7c3aed 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const ContratDetail = () => {
  const { contratId } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  const [contrat, setContrat] = useState(null);
  const [actif, setActif] = useState(null);
  const [factureInfo, setFactureInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFacture, setLoadingFacture] = useState(false);
  const [downloadingFacture, setDownloadingFacture] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePdfUrl, setFacturePdfUrl] = useState(null);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Chargement du contrat
  const chargerDonnees = useCallback(async () => {
    if (!contratId || contratId === 'undefined') {
      setError('ID contrat invalide');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Chargement du contrat:', contratId);
      
      const contratRes = await api.get(`/contrats/${contratId}`);
      setContrat(contratRes.data);
      
      // Charger l'actif associé
      if (contratRes.data.actif_id && contratRes.data.actif_id !== 'undefined') {
        try {
          const actifRes = await api.get(`/actifs/${contratRes.data.actif_id}`);
          setActif(actifRes.data);
        } catch (actifErr) {
          console.log('⚠️ Impossible de charger l\'actif associé');
        }
      }
      
      // Charger la facture
      await chargerFacture(contratRes.data);
      
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      if (err.response?.status === 404) {
        setError('Contrat non trouvé');
      } else {
        setError('Erreur lors du chargement du contrat');
      }
    } finally {
      setLoading(false);
    }
  }, [contratId]);

  // Chargement de la facture
  const chargerFacture = async (contratData) => {
    if (!contratData?.id) return;
    
    try {
      console.log('📄 Chargement facture pour contrat:', contratData.id);
      const res = await api.get(`/contrats/${contratData.id}/facture`);
      setFactureInfo(res.data);
      console.log('✅ Facture trouvée');
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Erreur chargement facture:', err);
      }
      setFactureInfo(null);
    }
  };

  // Générer une facture (si elle n'existe pas)
  const handleRegenerateFacture = async () => {
    if (!contratId) return;
    setLoadingFacture(true);
    try {
      console.log('🔄 Régénération facture...');
      const response = await api.post(`/contrats/${contratId}/regenerate-facture`);
      setFactureInfo(response.data);
      alert('Facture générée avec succès !');
      await chargerFacture(contrat);
    } catch (err) {
      console.error('Erreur génération facture:', err);
      alert('Erreur lors de la génération de la facture');
    } finally {
      setLoadingFacture(false);
    }
  };

  // Visualiser la facture
  const handleViewFacture = async () => {
    if (!contratId) return;
    setLoadingFacture(true);
    try {
      const response = await api.get(`/contrats/${contratId}/facture/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setFacturePdfUrl(url);
      setShowFactureModal(true);
    } catch (err) {
      console.error('Erreur chargement facture:', err);
      alert('Impossible de charger la facture');
    } finally {
      setLoadingFacture(false);
    }
  };

  // Télécharger la facture
  const handleDownloadFacture = async () => {
    if (!contratId) return;
    setDownloadingFacture(true);
    try {
      const response = await api.get(`/contrats/${contratId}/facture/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_contrat_${contrat.numero_contrat}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement facture:', err);
      alert('Impossible de télécharger la facture');
    } finally {
      setDownloadingFacture(false);
    }
  };

  // Suppression
  const handleDelete = async () => {
    if (!contratId || contratId === 'undefined') return;
    
    try {
      await api.delete(`/contrats/${contratId}`);
      navigate('/contrats');
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
    setShowDeleteModal(false);
  };

  // Téléchargement du fichier du contrat
  const handleDownload = () => {
    if (contrat?.fichier) {
      window.open(contrat.fichier, '_blank');
    }
  };

  // Statut du contrat
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

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
          <div className="text-center">
            <div className="spinner-border text-info mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-white-50">Chargement du contrat...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !contrat) {
    return (
      <>
        <style>{styles}</style>
        <div className="container text-center py-5" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', minHeight: '100vh' }}>
          <div className="alert alert-danger mx-auto" style={{ maxWidth: '500px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
            <FiAlertCircle size={24} className="mb-2" style={{ color: '#ef4444' }} />
            <p className="mb-3">{error || 'Contrat non trouvé'}</p>
            <button onClick={() => navigate('/contrats')} className="btn btn-info d-inline-flex align-items-center gap-2">
              <FiArrowLeft /> Retour à la liste
            </button>
          </div>
        </div>
      </>
    );
  }

  const statutInfo = getStatutInfo(contrat.date_fin);

  return (
    <>
      <style>{styles}</style>
      
      {/* Modal Facture PDF */}
      {showFactureModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1050 }} onClick={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }}>
          <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '90%', width: '1000px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content bg-dark-glass border-cyan" style={{ height: '80vh' }}>
              <div className="modal-header" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiFileText size={18} className="text-cyan" /> Facture - Contrat {contrat.numero_contrat}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }}></button>
              </div>
              <div className="modal-body p-0" style={{ height: 'calc(100% - 120px)' }}>
                {facturePdfUrl && (
                  <iframe
                    src={facturePdfUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Facture PDF"
                  />
                )}
              </div>
              <div className="modal-footer" style={{ borderTopColor: 'rgba(0,255,247,0.2)' }}>
                <button onClick={handleDownloadFacture} className="btn btn-success d-flex align-items-center gap-2">
                  <FiDownload size={14} /> Télécharger
                </button>
                <button onClick={() => { if (facturePdfUrl) window.open(facturePdfUrl, '_blank'); }} className="btn btn-info d-flex align-items-center gap-2">
                  <FiPrinter size={14} /> Ouvrir
                </button>
                <button onClick={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }} className="btn btn-secondary">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1050 }} onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content bg-dark-glass border-cyan">
              <div className="modal-header" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiTrash2 size={18} style={{ color: '#f87171' }} /> Confirmer la suppression
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Êtes-vous sûr de vouloir supprimer le contrat <strong style={{ color: '#f87171' }}>"{contrat.numero_contrat}"</strong> ?</p>
                <p style={{ color: '#94a3b8' }}>Cette action est irréversible.</p>
              </div>
              <div className="modal-footer" style={{ borderTopColor: 'rgba(0,255,247,0.2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>Confirmer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1000px', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/contrats')} className="btn btn-outline-info d-flex align-items-center gap-2">
              <FiArrowLeft size={16} /> Retour
            </button>
            <h1 className="h3 fw-bold mb-0 gradient-text">
              Contrat {contrat.numero_contrat}
            </h1>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {contrat.fichier && (
              <button onClick={handleDownload} className="btn btn-outline-success d-flex align-items-center gap-2">
                <FiDownload size={14} /> Document
              </button>
            )}
            {can(['admin', 'juridique']) && (
              <>
                <button
                  onClick={() => navigate(`/contrats/modifier/${contratId}`)}
                  className="btn btn-warning d-flex align-items-center gap-2"
                >
                  <FiEdit size={14} /> Modifier
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger d-flex align-items-center gap-2">
                  <FiTrash2 size={14} /> Supprimer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Statut */}
        <div className="mb-3">
          <span className={`badge px-3 py-2 d-inline-flex align-items-center gap-2 bg-${statutInfo.variant} bg-opacity-10 text-${statutInfo.variant}`} style={{ border: `1px solid ${statutInfo.variant === 'success' ? '#34d399' : statutInfo.variant === 'warning' ? '#fbbf24' : '#f87171'}` }}>
            {statutInfo.icon} {statutInfo.label}
          </span>
        </div>

        {/* Carte de la facture */}
        <div className="card bg-dark-glass border-cyan mb-4 slide-in">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="icon-circle bg-cyan-opacity p-2 rounded-circle">
                  <FiFileText size={20} className="text-cyan" />
                </div>
                <div>
                  <h6 className="mb-1 fw-semibold text-white">Facture du contrat</h6>
                  {factureInfo ? (
                    <div>
                      <small className="text-cyan">✓ Facture disponible</small>
                      <div className="small text-white-50">
                        {factureInfo.nom_fichier || `facture_contrat_${contrat.numero_contrat}`}
                      </div>
                    </div>
                  ) : (
                    <small className="text-warning">⚠️ Aucune facture générée</small>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2">
                {factureInfo ? (
                  <>
                    <button onClick={handleViewFacture} className="btn btn-primary btn-sm d-flex align-items-center gap-2" disabled={loadingFacture}>
                      <FiEye size={14} /> {loadingFacture ? 'Chargement...' : 'Visualiser'}
                    </button>
                    <button onClick={handleDownloadFacture} className="btn btn-success btn-sm d-flex align-items-center gap-2" disabled={downloadingFacture}>
                      <FiDownload size={14} /> {downloadingFacture ? 'Téléchargement...' : 'PDF'}
                    </button>
                  </>
                ) : (
                  can(['admin', 'juridique']) && (
                    <button onClick={handleRegenerateFacture} className="btn btn-warning btn-sm d-flex align-items-center gap-2" disabled={loadingFacture}>
                      <FiRefreshCw size={14} /> Générer la facture
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actif associé */}
        {actif && (
          <div className="card bg-dark-glass border-cyan mb-4 slide-in">
            <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <FiPackage size={20} className="text-cyan" />
                <div>
                  <small style={{ color: '#94a3b8' }}>Actif associé</small>
                  <div className="fw-semibold text-white">{actif.code} - {actif.nom}</div>
                </div>
              </div>
              <button onClick={() => navigate(`/actifs/${actif.id}`)} className="btn btn-outline-info btn-sm d-flex align-items-center gap-2">
                <FiEye size={14} /> Voir l'actif
              </button>
            </div>
          </div>
        )}

        {/* Informations du contrat */}
        <div className="card bg-dark-glass border-cyan rounded-3 mb-4 slide-in">
          <div className="card-body p-4">
            <h5 className="text-cyan mb-3 border-bottom pb-2" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
              <FiFileText size={16} className="me-2" /> Détails du contrat
            </h5>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiTag size={12} /> Numéro de contrat
                  </small>
                  <span className="fw-semibold text-white">{contrat.numero_contrat}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiUser size={12} /> Fournisseur
                  </small>
                  <span className="fw-semibold text-white">{contrat.fournisseur}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiCalendar size={12} /> Date de début
                  </small>
                  <span className="fw-semibold text-white">{formatDate(contrat.date_debut)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiCalendar size={12} /> Date de fin
                  </small>
                  <span className="fw-semibold text-white">{formatDate(contrat.date_fin)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiDollarSign size={12} /> Montant
                  </small>
                  <span className="fw-bold text-cyan">{formatCurrency(contrat.montant)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.1)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiClock size={12} /> Date de création
                  </small>
                  <span className="fw-semibold text-white">{formatDateTime(contrat.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {contrat.description && (
          <div className="card bg-dark-glass border-cyan rounded-3 slide-in">
            <div className="card-body p-4">
              <h5 className="text-cyan mb-3 d-flex align-items-center gap-2">
                <FiInfo size={16} /> Description
              </h5>
              <p className="mb-0 text-white-50" style={{ lineHeight: 1.6 }}>{contrat.description}</p>
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="mt-4 text-center">
          <small style={{ color: '#94a3b8' }}>
            Dernière modification : {formatDateTime(contrat.updated_at)}
          </small>
        </div>
      </div>
    </>
  );
};

export default ContratDetail;