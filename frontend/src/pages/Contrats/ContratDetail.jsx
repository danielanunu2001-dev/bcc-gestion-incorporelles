import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiArrowLeft, FiEdit, FiTrash2, FiDownload,
  FiCalendar, FiDollarSign, FiUser, FiFileText,
  FiInfo, FiPrinter, FiEye, FiCheckCircle,
  FiAlertCircle, FiClock, FiTag, FiPackage
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ContratDetail = () => {
  const { contratId } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  const [contrat, setContrat] = useState(null);
  const [actif, setActif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [factureInfo, setFactureInfo] = useState(null);
  const [loadingFacture, setLoadingFacture] = useState(false);
  const [downloadingFacture, setDownloadingFacture] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePdfUrl, setFacturePdfUrl] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    console.log('🆔 ID contrat reçu:', contratId);
    
    if (!contratId || contratId === 'undefined') {
      console.error('❌ ID contrat invalide:', contratId);
      setError('ID contrat invalide');
      setLoading(false);
      return;
    }
    
    chargerDonnees();
  }, [contratId]);

  useEffect(() => {
    if (contrat && contrat.id) {
      chargerFacture();
    }
  }, [contrat]);

  const chargerDonnees = async () => {
    if (!contratId || contratId === 'undefined') {
      setError('ID contrat manquant');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Chargement du contrat:', contratId);
      
      const contratRes = await api.get(`/contrats/${contratId}`);
      setContrat(contratRes.data);
      
      if (contratRes.data.actif_id && contratRes.data.actif_id !== 'undefined') {
        try {
          const actifRes = await api.get(`/actifs/${contratRes.data.actif_id}`);
          setActif(actifRes.data);
        } catch (actifErr) {
          console.log('Impossible de charger l\'actif associé');
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  const chargerFacture = async () => {
    if (!contratId) return;
    try {
      setLoadingFacture(true);
      const res = await api.get(`/contrats/${contratId}/facture`);
      setFactureInfo(res.data);
    } catch (err) {
      console.log('Aucune facture trouvée pour ce contrat');
      setFactureInfo(null);
    } finally {
      setLoadingFacture(false);
    }
  };

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
      alert('Impossible de télécharger la facture. Vérifiez qu\'elle existe.');
    } finally {
      setDownloadingFacture(false);
    }
  };

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
      alert('Impossible de charger la facture. Vérifiez qu\'elle existe.');
    } finally {
      setLoadingFacture(false);
    }
  };

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

  const handleDownload = () => {
    if (contrat?.fichier) {
      window.open(contrat.fichier, '_blank');
    }
  };

  // ✅ FONCTION DE FORMATAGE INTERNATIONAL AMÉLIORÉE
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

  // ✅ NOUVELLE FONCTION DE FORMATAGE INTERNATIONAL (sans virgules)
  const formatCurrencyInternational = (value) => {
    if (!value && value !== 0) return '0 CDF';
    try {
      // Arrondir à l'entier (pas de décimales)
      const valeurArrondie = Math.round(parseFloat(value) || 0);
      // Formatage avec espaces comme séparateurs de milliers
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

  // ✅ Conserver l'ancienne fonction pour compatibilité (optionnel)
  const formatCurrency = (value) => {
    return formatCurrencyInternational(value);
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
  `;

  // Styles personnalisés pour texte blanc
  const customStyles = `
    /* Tous les textes en blanc */
    body, .container, .card, .card-body, .modal-content,
    h1, h2, h3, h4, h5, h6, p, span, div, small, strong,
    .text-muted, .fw-semibold, .fw-bold, .fw-medium,
    .badge, .btn, .modal-title, .alert {
      color: #ffffff !important;
    }
    
    /* Garder les badges avec leurs couleurs de fond mais texte blanc */
    .badge {
      color: #ffffff !important;
    }
    
    /* Boutons : garder le texte blanc sur fond coloré */
    .btn-primary, .btn-warning, .btn-danger, .btn-success, .btn-info, .btn-outline-secondary {
      color: #ffffff !important;
    }
    
    /* Liens */
    a, .btn-link {
      color: #00fff7 !important;
    }
    
    /* Inputs et selects en mode sombre */
    input, select, textarea {
      background: rgba(15, 23, 42, 0.8) !important;
      color: #ffffff !important;
      border: 1px solid rgba(0, 255, 247, 0.3) !important;
    }
    
    /* Placeholders */
    input::placeholder, textarea::placeholder {
      color: #94a3b8 !important;
    }
    
    /* Modal */
    .modal-content {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)) !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(0, 255, 247, 0.3) !important;
    }
    
    /* Alertes */
    .alert {
      background: rgba(0, 0, 0, 0.5) !important;
      border: 1px solid rgba(0, 255, 247, 0.2) !important;
    }
    
    /* Cartes */
    .card, .bg-light {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75)) !important;
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(0, 255, 247, 0.2) !important;
    }
    
    /* Bordures */
    .border-bottom, .border-top, .border-success {
      border-color: rgba(0, 255, 247, 0.2) !important;
    }
    
    /* Texte muted devient blanc */
    .text-muted {
      color: #cbd5e1 !important;
    }
    
    /* Icônes */
    svg {
      color: #00fff7 !important;
    }
    
    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #00fff7, #7c3aed);
      border-radius: 10px;
    }
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <style>{customStyles}</style>
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p>Chargement du contrat...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !contrat) {
    return (
      <>
        <style>{animationStyles}</style>
        <style>{customStyles}</style>
        <div className="container text-center py-5">
          <div className="alert alert-danger mx-auto" style={{ maxWidth: '500px' }}>
            <FiAlertCircle size={24} className="mb-2" />
            <p className="mb-3">{error || 'Contrat non trouvé'}</p>
            <button onClick={() => navigate('/contrats')} className="btn btn-primary d-inline-flex align-items-center gap-2">
              <FiArrowLeft /> Retour
            </button>
          </div>
        </div>
      </>
    );
  }

  const statutInfo = getStatutInfo(contrat.date_fin);

  return (
    <>
      <style>{animationStyles}</style>
      <style>{customStyles}</style>
      <div className="container py-4 px-3 px-md-4 contrat-fade-in" style={{ maxWidth: '1000px' }}>
        
        {/* Modal de confirmation de suppression */}
        <div className={`modal fade ${showDeleteModal ? 'show d-block' : ''}`} 
             style={{ display: showDeleteModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1050 }}
             onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
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
                <button type="button" className="btn btn-danger" onClick={handleDelete}>Confirmer la suppression</button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Facture PDF */}
        <div className={`modal fade ${showFactureModal ? 'show d-block' : ''}`} 
             style={{ display: showFactureModal ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1050 }}
             onClick={() => {
               if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl);
               setShowFactureModal(false);
             }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '90%', width: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ height: '80vh' }}>
              <div className="modal-header" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FiFileText size={18} style={{ color: '#00fff7' }} /> Facture - Contrat {contrat.numero_contrat}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl);
                  setShowFactureModal(false);
                }}></button>
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
                <button 
                  onClick={() => {
                    if (facturePdfUrl) {
                      const link = document.createElement('a');
                      link.href = facturePdfUrl;
                      link.download = `facture_contrat_${contrat.numero_contrat}.pdf`;
                      link.click();
                    }
                  }}
                  className="btn btn-success d-flex align-items-center gap-2"
                >
                  <FiDownload size={14} /> Télécharger
                </button>
                <button 
                  onClick={() => {
                    if (facturePdfUrl) window.open(facturePdfUrl, '_blank');
                  }}
                  className="btn btn-info d-flex align-items-center gap-2"
                >
                  <FiPrinter size={14} /> Ouvrir
                </button>
                <button 
                  onClick={() => {
                    if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl);
                    setShowFactureModal(false);
                  }}
                  className="btn btn-secondary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/contrats')} className="btn btn-outline-secondary d-flex align-items-center gap-2" style={{ borderColor: 'rgba(0,255,247,0.3)', color: '#fff' }}>
              <FiArrowLeft size={16} /> Retour
            </button>
            <h1 className="h3 fw-bold mb-0" style={{ background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Contrat {contrat.numero_contrat}
            </h1>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {contrat.fichier && (
              <button onClick={handleDownload} className="btn btn-outline-success d-flex align-items-center gap-2">
                <FiDownload size={14} /> Télécharger
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
          <span className={`badge bg-${statutInfo.variant} bg-opacity-10 text-${statutInfo.variant} px-3 py-2 d-inline-flex align-items-center gap-2`} style={{ border: `1px solid ${statutInfo.variant === 'success' ? '#34d399' : statutInfo.variant === 'warning' ? '#fbbf24' : '#f87171'}` }}>
            {statutInfo.icon} {statutInfo.label}
          </span>
        </div>

        {/* Carte de la facture */}
        {factureInfo && (
          <div className="card border-success bg-success bg-opacity-10 mb-4 contrat-slide-in" style={{ borderColor: '#34d399' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-success" style={{ borderBottomColor: '#34d399' }}>
                <FiFileText size={18} className="text-success" style={{ color: '#34d399' }} />
                <strong className="text-success" style={{ color: '#34d399' }}>Facture du contrat</strong>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <small className="text-success d-block" style={{ color: '#34d399' }}>N° Facture</small>
                  <span className="fw-medium">{factureInfo.nom_fichier?.replace('facture_contrat_', '').replace('.pdf', '') || `FAC-${contrat.numero_contrat}`}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-success d-block" style={{ color: '#34d399' }}>Date de génération</small>
                  <span className="fw-medium">{formatDateTime(contrat.created_at)}</span>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button onClick={handleViewFacture} className="btn btn-primary btn-sm d-flex align-items-center gap-2" disabled={loadingFacture}>
                  <FiEye size={14} /> {loadingFacture ? 'Chargement...' : 'Aperçu'}
                </button>
                <button onClick={handleDownloadFacture} className="btn btn-success btn-sm d-flex align-items-center gap-2" disabled={downloadingFacture}>
                  <FiDownload size={14} /> {downloadingFacture ? 'Téléchargement...' : 'Télécharger PDF'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actif associé */}
        {actif && (
          <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.75))', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,255,247,0.2)' }}>
            <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <FiPackage size={20} style={{ color: '#00fff7' }} />
                <div>
                  <small style={{ color: '#94a3b8' }}>Actif associé</small>
                  <span className="fw-semibold">{actif.code} - {actif.nom}</span>
                </div>
              </div>
              <button onClick={() => navigate(`/actifs/${actif.id}`)} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
                <FiEye size={14} /> Voir l'actif
              </button>
            </div>
          </div>
        )}

        {/* Informations du contrat */}
        <div className="card shadow-sm border-0 rounded-3 mb-4" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.75))', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,255,247,0.2)' }}>
          <div className="card-body p-4">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiTag size={12} /> Numéro de contrat
                  </small>
                  <span className="fw-semibold">{contrat.numero_contrat}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiUser size={12} /> Fournisseur
                  </small>
                  <span className="fw-semibold">{contrat.fournisseur}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiCalendar size={12} /> Date de début
                  </small>
                  <span className="fw-semibold">{formatDate(contrat.date_debut)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiCalendar size={12} /> Date de fin
                  </small>
                  <span className="fw-semibold">{formatDate(contrat.date_fin)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiDollarSign size={12} /> Montant
                  </small>
                  <span className="fw-bold" style={{ color: '#00fff7' }}>{formatCurrencyInternational(contrat.montant)}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 pb-2 border-bottom" style={{ borderBottomColor: 'rgba(0,255,247,0.2)' }}>
                  <small className="d-flex align-items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FiClock size={12} /> Date de création
                  </small>
                  <span className="fw-semibold">{formatDateTime(contrat.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {contrat.description && (
          <div className="card shadow-sm border-0 rounded-3" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.75))', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,255,247,0.2)' }}>
            <div className="card-body p-4">
              <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: '#00fff7' }}>
                <FiInfo size={16} /> Description
              </h3>
              <p className="mb-0" style={{ color: '#e2e8f0' }}>{contrat.description}</p>
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="mt-3 text-center">
          <small style={{ color: '#94a3b8' }}>
            Dernière modification : {formatDateTime(contrat.updated_at)}
          </small>
        </div>
      </div>
    </>
  );
};

export default ContratDetail;