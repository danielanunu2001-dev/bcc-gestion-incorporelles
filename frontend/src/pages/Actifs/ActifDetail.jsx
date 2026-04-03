import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifById } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import actifService from '../../services/actif';
import api from '../../services/api';
import { QRCodeCanvas } from 'qrcode.react';
import MouvementsList from '../../components/Mouvements/MouvementsList';
import ReevaluationsList from '../../components/Reevaluations/ReevaluationsList';
import DocumentList from '../../components/Documents/DocumentList';
import DepreciationsList from '../../components/Depreciations/DepreciationsList';
import {
  FiArrowLeft, FiEdit, FiFileText, FiCalendar,
  FiDollarSign, FiTag, FiClock, FiRefreshCw,
  FiDownload, FiEye, FiTrash2, FiPlus, FiInfo,
  FiTrendingDown, FiTrendingUp, FiMaximize2, FiPrinter,
  FiFile, FiUser, FiMail, FiActivity, FiFileText as FiInvoice,
  FiChevronDown, FiChevronUp, FiDatabase
} from 'react-icons/fi';

// Imports pour les graphiques
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ActifDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  
  const { can } = usePermissions();
  const { actifCourant, loading: reduxLoading } = useSelector((state) => state.actifs);
  
  const [actif, setActif] = useState(null);
  const [amortissements, setAmortissements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [facture, setFacture] = useState(null);
  const [activeTab, setActiveTab] = useState('infos');
  const [showContratForm, setShowContratForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFacture, setDownloadingFacture] = useState(false);
  
  // ✅ Nouveaux états pour le modal facture
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePdfUrl, setFacturePdfUrl] = useState(null);
  const [loadingFacturePdf, setLoadingFacturePdf] = useState(false);
  
  // ✅ État pour l'audit sélectionné (détails affichés)
  const [expandedAuditId, setExpandedAuditId] = useState(null);
  
  // États pour le recalcul
  const [recalculLoading, setRecalculLoading] = useState(false);
  const [recalculMessage, setRecalculMessage] = useState({ type: '', text: '' });
  
  // État pour le formulaire de dépréciation
  const [depreciationForm, setDepreciationForm] = useState({
    date_test: new Date().toISOString().split('T')[0],
    valeur_recouvrable: '',
    commentaire: ''
  });

  // ==================== FONCTIONS UTILITAIRES ====================
  
  /**
   * Formate un nombre en devise (CDF)
   */
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0 FC';
    }
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${Math.round(value || 0).toLocaleString()} FC`;
    }
  };

  /**
   * Calcule le total d'un champ dans le tableau des amortissements
   */
  const calculerTotal = (amortissements, field) => {
    if (!amortissements || amortissements.length === 0) {
      console.log('Aucun amortissement');
      return 0;
    }
    
    const total = amortissements.reduce((sum, a) => {
      const value = a[field];
      if (value === undefined || value === null) {
        return sum;
      }
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return sum;
      }
      return sum + numValue;
    }, 0);
    
    return total;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
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
      if (isNaN(date.getTime())) return 'Date invalide';
      const jour = date.getDate().toString().padStart(2, '0');
      const mois = (date.getMonth() + 1).toString().padStart(2, '0');
      const annee = date.getFullYear();
      const heures = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${jour}/${mois}/${annee} ${heures}:${minutes}`;
    } catch {
      return 'Date invalide';
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      logiciel: 'Logiciel',
      brevet: 'Brevet',
      licence: 'Licence',
      fonds_commercial: 'Fonds commercial',
      materiel: 'Matériel',
      vehicule: 'Véhicule',
      bâtiment: 'Bâtiment',
      terrain: 'Terrain',
      autres: 'Autres'
    };
    return types[type] || type;
  };

  const getStatusColor = (act) => {
    if (!act?.actif) return '#dc2626';
    const valeurNette = act.valeur_nette || act.cout_acquisition;
    if (valeurNette <= (act.valeur_residuelle || 0)) return '#f59e0b';
    return '#10b981';
  };

  const getStatusText = (act) => {
    if (!act?.actif) return 'Inactif';
    const valeurNette = act.valeur_nette || act.cout_acquisition;
    if (valeurNette <= (act.valeur_residuelle || 0)) return 'Amorti';
    return 'Actif';
  };

  const getEtatLabel = (etat) => {
    const etats = {
      'neuf': 'Neuf',
      'bon': 'Bon état',
      'reparation': 'En réparation',
      'hors_service': 'Hors service'
    };
    return etats[etat] || etat || 'N/A';
  };

  const getActionLabel = (action) => {
    const actions = {
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'RECALCUL': 'Recalcul amortissements',
      'DEPRECIATION': 'Test de dépréciation',
      'SORTIE': 'Sortie d\'actif'
    };
    return actions[action] || action;
  };

  // ==================== FONCTIONS POUR AUDIT ====================

  const getActionColor = (action) => {
    const colors = {
      'CREATE': '#10b981',
      'UPDATE': '#f59e0b',
      'DELETE': '#ef4444',
      'RECALCUL': '#3b82f6',
      'DEPRECIATION': '#8b5cf6',
      'SORTIE': 'var(--text-secondary)'
    };
    return colors[action] || 'var(--text-secondary)';
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE': return <FiPlus size={12} />;
      case 'UPDATE': return <FiEdit size={12} />;
      case 'DELETE': return <FiTrash2 size={12} />;
      case 'RECALCUL': return <FiRefreshCw size={12} />;
      case 'DEPRECIATION': return <FiTrendingDown size={12} />;
      case 'SORTIE': return <FiPackage size={12} />;
      default: return <FiActivity size={12} />;
    }
  };

  const getTableLabel = (table) => {
    const labels = {
      'actifs': 'Actifs',
      'users': 'Utilisateurs',
      'contrats': 'Contrats',
      'reevaluations': 'Réévaluations',
      'depreciations': 'Dépréciations',
      'mouvements': 'Mouvements',
      'documents': 'Documents'
    };
    return labels[table] || table;
  };

  // ==================== FONCTIONS FACTURE ====================

  const fetchFacture = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/actifs/${id}/facture`);
      setFacture(response.data);
    } catch (err) {
      console.log('Aucune facture trouvée pour cet actif');
      setFacture(null);
    }
  };

  // ✅ Nouvelle fonction pour ouvrir la facture dans un modal
  const handleViewFacture = async () => {
    if (!id) return;
    setLoadingFacturePdf(true);
    try {
      const response = await api.get(`/actifs/${id}/facture/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setFacturePdfUrl(url);
      setShowFactureModal(true);
    } catch (err) {
      console.error('Erreur chargement facture:', err);
      alert('Impossible de charger la facture. Vérifiez qu\'elle existe.');
    } finally {
      setLoadingFacturePdf(false);
    }
  };

  const handleDownloadFacture = async () => {
    if (!id) return;
    setDownloadingFacture(true);
    try {
      const response = await api.get(`/actifs/${id}/facture/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${id}.pdf`);
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

  // ==================== CHARGEMENT DES DONNÉES ====================

  useEffect(() => {
    console.log('🆔 ID from URL:', id);
    if (!id || id === 'undefined') {
      console.error('❌ ID invalide:', id);
      setError('ID actif invalide');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'undefined') {
      chargerDonnees();
      fetchContrats();
      fetchDepreciations();
      fetchAuditLogs();
      fetchFacture();
      dispatch(fetchActifById(id));
    } else {
      console.error('❌ ID invalide dans useEffect:', id);
      setError('ID actif invalide');
      setLoading(false);
    }
  }, [id, dispatch]);

  const chargerDonnees = async () => {
    if (!id || id === 'undefined') {
      console.error('❌ ID invalide dans chargerDonnees');
      return;
    }
    try {
      setLoading(true);
      console.log('📦 Chargement actif ID:', id);
      const actifData = await actifService.getById(id);
      setActif(actifData);

      try {
        const amortData = await actifService.getAmortissements(id);
        setAmortissements(amortData);
      } catch (err) {
        console.log('Pas d\'amortissements');
      }
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchContrats = async () => {
    if (!id || id === 'undefined') return;
    try {
      console.log('📦 Chargement contrats pour ID:', id);
      const res = await api.get(`/actifs/${id}/contrats`);
      setContrats(res.data);
    } catch (err) {
      console.log("Pas de contrats");
    }
  };

  const fetchDepreciations = async () => {
    if (!id || id === 'undefined') return;
    try {
      console.log('📦 Chargement dépréciations pour ID:', id);
      const res = await api.get(`/actifs/${id}/depreciations`);
      setDepreciations(res.data);
    } catch (err) {
      console.log("Pas de dépréciations");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!id) return;
      console.log(`📋 CHARGEMENT AUDIT pour l'actif: ${id}`);
      const response = await api.get(`/audit-logs/actif/${id}`);
      console.log('✅ Réponse reçue:', response);
      
      if (Array.isArray(response.data)) {
        setAuditLogs(response.data);
      } else if (response.data?.logs) {
        setAuditLogs(response.data.logs);
      } else {
        console.warn('Format inattendu:', response.data);
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement audit:', error);
      setAuditLogs([]);
    }
  };

  // ==================== ACTIONS ====================

  const handleRecalculerAmortissements = async () => {
    if (!id || id === 'undefined') return;
    setRecalculLoading(true);
    setRecalculMessage({ type: '', text: '' });
    
    try {
      console.log('🔄 Recalcul amortissements pour ID:', id);
      await api.post(`/actifs/${id}/recalculer`);
      const amortData = await actifService.getAmortissements(id);
      setAmortissements(amortData);
      setRecalculMessage({ 
        type: 'success', 
        text: '✅ Amortissements recalculés avec succès !' 
      });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Erreur lors du recalcul:', err);
      setRecalculMessage({ 
        type: 'error', 
        text: '❌ Erreur lors du recalcul des amortissements' 
      });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } finally {
      setRecalculLoading(false);
    }
  };

  const handleCreateDepreciation = async (e) => {
    e.preventDefault();
    if (!id || id === 'undefined') return;
    try {
      console.log('📦 Création dépréciation pour ID:', id);
      await api.post(`/actifs/${id}/depreciations`, depreciationForm);
      setShowDepreciationModal(false);
      fetchDepreciations();
      setDepreciationForm({
        date_test: new Date().toISOString().split('T')[0],
        valeur_recouvrable: '',
        commentaire: ''
      });
    } catch (err) {
      console.error('Erreur lors de la création de la dépréciation:', err);
    }
  };

  const handleGoBack = () => navigate(-1);
  const handleEdit = () => navigate(`/actifs/modifier/${id}`);
  const handleRefresh = () => {
    chargerDonnees();
    fetchContrats();
    fetchDepreciations();
    fetchAuditLogs();
    fetchFacture();
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${currentActif?.code}</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial; }
            .container { text-align: center; }
            .code { font-family: monospace; font-size: 14px; color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${document.getElementById('qr-code-canvas')?.toDataURL()}" />
            <div class="code">${currentActif?.numero_inventaire || currentActif?.code}</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ✅ Fonction pour basculer l'affichage des détails d'un audit
  const toggleAuditDetails = (auditId) => {
    if (expandedAuditId === auditId) {
      setExpandedAuditId(null);
    } else {
      setExpandedAuditId(auditId);
    }
  };

  const currentActif = actif || actifCourant;

  // Calcul de la valeur nette
  const dernierAmort = amortissements[amortissements.length - 1];
  const valeurNette = dernierAmort?.valeur_nette || currentActif?.cout_acquisition || 0;
  const amortissementsCumules = dernierAmort?.cumul_amortissements || 0;

  // ==================== RENDU ====================

  if (loading || reduxLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error || !currentActif) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <FiInfo size={48} color="#ef4444" />
          <p style={styles.errorMessage}>{error || 'Actif non trouvé'}</p>
          <button onClick={handleGoBack} style={styles.backButton}>
            <FiArrowLeft /> Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header principal */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={handleGoBack} style={styles.iconButton} title="Retour">
            <FiArrowLeft size={20} />
          </button>
          <div style={styles.titleContainer}>
            <h1 style={styles.title}>
              {currentActif.code} - {currentActif.nom}
            </h1>
            <div style={styles.headerMeta}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor({...currentActif, valeur_nette: valeurNette}) + '20',
                color: getStatusColor({...currentActif, valeur_nette: valeurNette})
              }}>
                {getStatusText({...currentActif, valeur_nette: valeurNette})}
              </span>
              <span style={styles.type}>{getTypeLabel(currentActif.type)}</span>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleRefresh} style={styles.iconButton} title="Rafraîchir">
            <FiRefreshCw />
          </button>
          <button style={styles.iconButton} title="Exporter">
            <FiDownload />
          </button>
          <button 
            onClick={() => setShowQRModal(true)} 
            style={styles.iconButton}
            title="Voir QR Code"
          >
            <FiMaximize2 />
          </button>
          {facture && (
            <>
              {/* ✅ Nouveau bouton pour voir la facture dans le modal */}
              <button 
                onClick={handleViewFacture} 
                style={styles.factureButton}
                title="Voir la facture"
                disabled={loadingFacturePdf}
              >
                <FiEye /> {loadingFacturePdf ? 'Chargement...' : 'Voir facture'}
              </button>
              {/* Bouton pour télécharger */}
              <button 
                onClick={handleDownloadFacture} 
                style={styles.downloadButton}
                title="Télécharger la facture"
                disabled={downloadingFacture}
              >
                <FiDownload /> {downloadingFacture ? '...' : 'PDF'}
              </button>
            </>
          )}
          {can(['admin', 'comptable']) && (
            <button onClick={handleEdit} style={styles.editButton}>
              <FiEdit /> Modifier
            </button>
          )}
        </div>
      </div>

      {/* SECTION FACTURE AVEC AFFICHAGE EN DOLLARS */}
      {facture && (
        <div style={styles.factureCard}>
          <div style={styles.factureHeader}>
            <FiInvoice size={20} color="#2563eb" />
            <strong>Facture d'acquisition</strong>
          </div>
          <div style={styles.factureInfo}>
            <div>
              <span style={styles.factureLabel}>N° Facture:</span>
              <span style={styles.factureValue}>{facture.numero_facture}</span>
            </div>
            <div>
              <span style={styles.factureLabel}>Date d'émission:</span>
              <span style={styles.factureValue}>{formatDate(facture.date_emission)}</span>
            </div>
            <div>
              <span style={styles.factureLabel}>Montant HT:</span>
              <span style={styles.factureValue}>
                {facture.devise && facture.devise !== 'CDF' ? (
                  <strong>{facture.montant_ht?.toLocaleString()} {facture.devise}</strong>
                ) : (
                  <strong>{formatCurrency(facture.montant_ht)}</strong>
                )}
              </span>
            </div>
            <div>
              <span style={styles.factureLabel}>TVA (16%):</span>
              <span style={styles.factureValue}>
                {facture.devise && facture.devise !== 'CDF' ? (
                  <strong>{facture.montant_tva?.toLocaleString()} {facture.devise}</strong>
                ) : (
                  <strong>{formatCurrency(facture.montant_tva)}</strong>
                )}
              </span>
            </div>
            <div>
              <span style={styles.factureLabel}>Montant TTC:</span>
              <span style={styles.factureValue}>
                {facture.devise && facture.devise !== 'CDF' ? (
                  <strong style={{ color: '#10b981' }}>{facture.montant_ttc?.toLocaleString()} {facture.devise}</strong>
                ) : (
                  <strong style={{ color: '#10b981' }}>{formatCurrency(facture.montant_ttc)}</strong>
                )}
              </span>
            </div>
            <div>
              <span style={styles.factureLabel}>Devise:</span>
              <span style={styles.factureValue}>{facture.devise || 'CDF'}</span>
            </div>
          </div>
          
          {/* ✅ Section conversion si la devise n'est pas CDF */}
          {facture.devise && facture.devise !== 'CDF' && currentActif.taux_change_utilisation && (
            <div style={styles.conversionSection}>
              <div style={styles.conversionHeader}>
                <FiInfo size={14} />
                <span>Conversion en Francs Congolais (CDF)</span>
              </div>
              <div style={styles.conversionRow}>
                <span>Taux de change appliqué:</span>
                <strong>1 {facture.devise} = {currentActif.taux_change_utilisation.toLocaleString()} CDF</strong>
                <small>(taux du {new Date(currentActif.date_acquisition).toLocaleDateString('fr-FR')})</small>
              </div>
              <div style={styles.conversionRow}>
                <span>Montant HT en CDF:</span>
                <span>{(facture.montant_ht * currentActif.taux_change_utilisation).toLocaleString()} CDF</span>
              </div>
              <div style={styles.conversionRow}>
                <span>TVA en CDF:</span>
                <span>{(facture.montant_tva * currentActif.taux_change_utilisation).toLocaleString()} CDF</span>
              </div>
              <div style={styles.conversionRowHighlight}>
                <span>Montant TTC en CDF:</span>
                <strong>{(facture.montant_ttc * currentActif.taux_change_utilisation).toLocaleString()} CDF</strong>
              </div>
            </div>
          )}
          
          <button onClick={handleViewFacture} style={styles.factureDownloadButton} disabled={loadingFacturePdf}>
            <FiEye /> {loadingFacturePdf ? 'Chargement...' : 'Voir la facture'}
          </button>
        </div>
      )}

      {/* ✅ Modal Facture PDF */}
      {showFactureModal && (
        <div style={styles.modalOverlay} onClick={() => {
          if (facturePdfUrl) {
            window.URL.revokeObjectURL(facturePdfUrl);
          }
          setShowFactureModal(false);
        }}>
          <div style={styles.modalFactureContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiInvoice size={20} style={{ marginRight: '0.5rem' }} />
                Facture - {facture?.numero_facture}
              </h3>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.URL.revokeObjectURL(facturePdfUrl);
                  }
                  setShowFactureModal(false);
                }}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.pdfContainer}>
              {facturePdfUrl && (
                <iframe
                  src={facturePdfUrl}
                  style={styles.pdfIframe}
                  title="Facture PDF"
                />
              )}
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    const link = document.createElement('a');
                    link.href = facturePdfUrl;
                    link.download = `facture_${facture.numero_facture}.pdf`;
                    link.click();
                  }
                }}
                style={styles.downloadButton}
              >
                <FiDownload /> Télécharger
              </button>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.open(facturePdfUrl, '_blank');
                  }
                }}
                style={styles.printButton}
              >
                <FiPrinter /> Ouvrir dans un nouvel onglet
              </button>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.URL.revokeObjectURL(facturePdfUrl);
                  }
                  setShowFactureModal(false);
                }}
                style={styles.cancelButton}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQRModal && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>QR Code - {currentActif.code}</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.qrContainer}>
              <div style={styles.qrCode}>
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={currentActif.numero_inventaire || currentActif.code}
                  size={256}
                  level="H"
                  includeMargin={true}
                  bgColor='var(--bg-card)'
                  fgColor="#1e3a8a"
                />
              </div>
              <div style={styles.qrInfo}>
                <p style={styles.qrLabel}>Identifiant:</p>
                <p style={styles.qrValue}>{currentActif.numero_inventaire || currentActif.code}</p>
                <p style={styles.qrLabel}>Actif:</p>
                <p style={styles.qrValue}>{currentActif.nom}</p>
                <p style={styles.qrLabel}>Localisation:</p>
                <p style={styles.qrValue}>{currentActif.localisation || 'N/A'}</p>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button onClick={handlePrintQR} style={styles.printButton}>
                <FiPrinter /> Imprimer
              </button>
              <button 
                onClick={() => {
                  const canvas = document.getElementById('qr-code-canvas');
                  const link = document.createElement('a');
                  link.download = `qr-${currentActif.code}.png`;
                  link.href = canvas.toDataURL();
                  link.click();
                }}
                style={styles.downloadButton}
              >
                <FiDownload /> Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dépréciation */}
      {showDepreciationModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDepreciationModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nouveau test de dépréciation</h3>
              <button 
                onClick={() => setShowDepreciationModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateDepreciation}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date du test *</label>
                <input
                  type="date"
                  value={depreciationForm.date_test}
                  onChange={(e) => setDepreciationForm({...depreciationForm, date_test: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Valeur recouvrable (CDF) *</label>
                <input
                  type="number"
                  value={depreciationForm.valeur_recouvrable}
                  onChange={(e) => setDepreciationForm({...depreciationForm, valeur_recouvrable: e.target.value})}
                  style={styles.input}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Commentaire</label>
                <textarea
                  value={depreciationForm.commentaire}
                  onChange={(e) => setDepreciationForm({...depreciationForm, commentaire: e.target.value})}
                  style={styles.textarea}
                  rows="3"
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveButton}>
                  Enregistrer
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDepreciationModal(false)}
                  style={styles.cancelButton}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barre d'onglets */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('infos')}
          style={activeTab === 'infos' ? styles.tabActive : styles.tab}
        >
          <FiFileText /> Informations
        </button>
        <button
          onClick={() => setActiveTab('amortissements')}
          style={activeTab === 'amortissements' ? styles.tabActive : styles.tab}
        >
          <FiCalendar /> Amortissements
        </button>
        {can(['admin', 'comptable']) && (
          <button
            onClick={() => setActiveTab('reevaluations')}
            style={activeTab === 'reevaluations' ? styles.tabActive : styles.tab}
          >
            <FiTrendingUp /> Réévaluations
          </button>
        )}
        {can(['admin', 'juridique', 'comptable']) && (
          <button
            onClick={() => setActiveTab('contrats')}
            style={activeTab === 'contrats' ? styles.tabActive : styles.tab}
          >
            <FiFileText /> Contrats ({contrats.length})
          </button>
        )}
        {can(['admin', 'comptable']) && (
          <button
            onClick={() => setActiveTab('depreciations')}
            style={activeTab === 'depreciations' ? styles.tabActive : styles.tab}
          >
            <FiTrendingDown /> Dépréciations ({depreciations.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('documents')}
          style={activeTab === 'documents' ? styles.tabActive : styles.tab}
        >
          <FiFile /> Documents
        </button>
        {can(['admin', 'auditeur']) && (
          <button
            onClick={() => setActiveTab('audit')}
            style={activeTab === 'audit' ? styles.tabActive : styles.tab}
          >
            <FiEye /> Audit ({auditLogs.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('historique')}
          style={activeTab === 'historique' ? styles.tabActive : styles.tab}
        >
          <FiClock /> Historique
        </button>
      </div>

      {/* Contenu des onglets */}
      <div style={styles.tabContent}>
        {/* Onglet Informations */}
        {activeTab === 'infos' && (
          <div style={styles.card}>
            <div style={styles.infoGrid}>
              <div style={styles.infoSection}>
                <h3 style={styles.sectionTitle}>📋 Informations générales</h3>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Code</span>
                  <span style={styles.infoValue}>
                    <span style={styles.codeBadge}>{currentActif.code}</span>
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Nom</span>
                  <span style={styles.infoValue}>{currentActif.nom}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Type</span>
                  <span style={styles.infoValue}>{getTypeLabel(currentActif.type)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Type d'immobilisation</span>
                  <span style={styles.infoValue}>
                    {currentActif.type_immobilisation === 'corporel' ? 'Corporel' : 'Incorporel'}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Numéro d'inventaire</span>
                  <span style={styles.infoValue}>
                    <span style={styles.inventaireBadge}>
                      {currentActif.numero_inventaire || 'N/A'}
                    </span>
                  </span>
                </div>
                {currentActif.description && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Description</span>
                    <span style={styles.infoValue}>{currentActif.description}</span>
                  </div>
                )}
              </div>

              <div style={styles.infoSection}>
                <h3 style={styles.sectionTitle}>💰 Acquisition</h3>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Date d'acquisition</span>
                  <span style={styles.infoValue}>{formatDate(currentActif.date_acquisition)}</span>
                </div>
                {/* ✅ SECTION INFORMATIONS FINANCIÈRES AVEC DEVISE ET FACTURE */}
                <div style={styles.detailCard}>
                  <h3 style={styles.cardTitle}>💰 Informations financières</h3>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Montant d'acquisition:</span>
                    <span style={styles.detailValue}>
                      {currentActif.montant_devise && currentActif.devise ? (
                        <>
                          {currentActif.montant_devise.toLocaleString()} {currentActif.devise?.code}
                          <span style={styles.conversionNote}>
                            (soit {currentActif.cout_acquisition?.toLocaleString()} CDF)
                          </span>
                        </>
                      ) : (
                        `${currentActif.cout_acquisition?.toLocaleString()} CDF`
                      )}
                    </span>
                  </div>
                  
                  {currentActif.taux_change_utilisation && currentActif.devise && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Taux de change utilisé:</span>
                      <span style={styles.detailValue}>
                        1 {currentActif.devise?.code} = {currentActif.taux_change_utilisation.toLocaleString()} CDF
                        <span style={styles.conversionNote}>
                          (au {new Date(currentActif.date_acquisition).toLocaleDateString('fr-FR')})
                        </span>
                      </span>
                    </div>
                  )}
                  
                  {/* ✅ Numéro de facture - Récupéré depuis la variable facture */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Numéro de facture:</span>
                    <span style={styles.detailValue}>
                      {facture?.numero_facture ? (
                        <strong style={{ color: '#2563eb' }}>{facture.numero_facture}</strong>
                      ) : currentActif.numero_facture ? (
                        <strong>{currentActif.numero_facture}</strong>
                      ) : (
                        <em style={{ color: '#9ca3af' }}>Non renseigné</em>
                      )}
                    </span>
                  </div>
                  
                  {/* ✅ Date d'émission de la facture */}
                  {facture?.date_emission && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Date facture:</span>
                      <span style={styles.detailValue}>{formatDate(facture.date_emission)}</span>
                    </div>
                  )}
                  
                  {/* ✅ Montants de la facture avec devise d'origine et conversion CDF */}
                  {facture && (
                    <>
                      {/* Montant HT - Affiche devise d'origine et conversion CDF */}
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Montant HT:</span>
                        <span style={styles.detailValue}>
                          {facture.devise && facture.devise !== 'CDF' ? (
                            <>
                              <strong>{facture.montant_ht?.toLocaleString()} {facture.devise}</strong>
                              {currentActif.taux_change_utilisation && (
                                <span style={styles.conversionNote}>
                                  (soit {(facture.montant_ht * currentActif.taux_change_utilisation).toLocaleString()} CDF)
                                </span>
                              )}
                            </>
                          ) : (
                            <strong>{formatCurrency(facture.montant_ht)}</strong>
                          )}
                        </span>
                      </div>
                      
                      {/* TVA - Affiche devise d'origine et conversion CDF */}
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>TVA (16%):</span>
                        <span style={styles.detailValue}>
                          {facture.devise && facture.devise !== 'CDF' ? (
                            <>
                              <strong>{facture.montant_tva?.toLocaleString()} {facture.devise}</strong>
                              {currentActif.taux_change_utilisation && (
                                <span style={styles.conversionNote}>
                                  (soit {(facture.montant_tva * currentActif.taux_change_utilisation).toLocaleString()} CDF)
                                </span>
                              )}
                            </>
                          ) : (
                            <strong>{formatCurrency(facture.montant_tva)}</strong>
                          )}
                        </span>
                      </div>
                      
                      {/* Montant TTC - Affiche devise d'origine et conversion CDF */}
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Montant TTC:</span>
                        <span style={styles.detailValue}>
                          {facture.devise && facture.devise !== 'CDF' ? (
                            <>
                              <strong style={{ color: '#10b981' }}>{facture.montant_ttc?.toLocaleString()} {facture.devise}</strong>
                              {currentActif.taux_change_utilisation && (
                                <span style={styles.conversionNote}>
                                  (soit {(facture.montant_ttc * currentActif.taux_change_utilisation).toLocaleString()} CDF)
                                </span>
                              )}
                            </>
                          ) : (
                            <strong style={{ color: '#10b981' }}>{formatCurrency(facture.montant_ttc)}</strong>
                          )}
                        </span>
                      </div>
                      
                      {/* Devise de la facture si différente de CDF et pas de taux de change */}
                      {facture.devise && facture.devise !== 'CDF' && !currentActif.taux_change_utilisation && (
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Devise facture:</span>
                          <span style={styles.detailValue}>{facture.devise}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Fournisseur</span>
                  <span style={styles.infoValue}>{currentActif.fournisseur || 'Non renseigné'}</span>
                </div>
              </div>

              <div style={styles.infoSection}>
                <h3 style={styles.sectionTitle}>📊 Amortissement</h3>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Mode d'amortissement</span>
                  <span style={styles.infoValue}>
                    {currentActif.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Durée d'utilité</span>
                  <span style={styles.infoValue}>{currentActif.duree_utile_ans || 0} ans</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Taux d'amortissement</span>
                  <span style={styles.infoValue}>
                    {currentActif.taux_amortissement 
                      ? `${currentActif.taux_amortissement}%` 
                      : `${(100 / (currentActif.duree_utile_ans || 1)).toFixed(2)}%`}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Valeur résiduelle</span>
                  <span style={styles.infoValue}>{formatCurrency(currentActif.valeur_residuelle || 0)}</span>
                </div>
                {currentActif.categorie && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Catégorie GCEC</span>
                    <span style={styles.infoValue}>{currentActif.categorie.nom_categorie}</span>
                  </div>
                )}
              </div>

              <div style={styles.infoSection}>
                <h3 style={styles.sectionTitle}>📈 Valeurs actuelles</h3>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Valeur brute</span>
                  <span style={styles.infoValue}>{formatCurrency(currentActif.cout_acquisition)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Amortissements cumulés</span>
                  <span style={styles.infoValue}>{formatCurrency(amortissementsCumules)}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Valeur nette comptable</span>
                  <span style={{
                    ...styles.infoValue,
                    color: getStatusColor({...currentActif, valeur_nette: valeurNette}),
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(valeurNette)}
                  </span>
                </div>
                {currentActif.valeur_reevaluee > 0 && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Valeur réévaluée</span>
                    <span style={styles.infoValue}>{formatCurrency(currentActif.valeur_reevaluee)}</span>
                  </div>
                )}
                {currentActif.montant_depreciation > 0 && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Provision dépréciation</span>
                    <span style={styles.infoValue}>{formatCurrency(currentActif.montant_depreciation)}</span>
                  </div>
                )}
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Statut</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor({...currentActif, valeur_nette: valeurNette}) + '20',
                    color: getStatusColor({...currentActif, valeur_nette: valeurNette})
                  }}>
                    {getStatusText({...currentActif, valeur_nette: valeurNette})}
                  </span>
                </div>
              </div>
            </div>

            {/* Section Caractéristiques matérielles */}
            {currentActif.type_immobilisation === 'corporel' && (
              <div style={styles.additionalSection}>
                <h3 style={styles.sectionTitle}>🖥️ Caractéristiques matérielles</h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Marque</span>
                    <span style={styles.detailValue}>{currentActif.marque || 'Non renseignée'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Modèle</span>
                    <span style={styles.detailValue}>{currentActif.modele || 'Non renseigné'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Numéro de série</span>
                    <span style={styles.detailValue}>
                      <span style={styles.serialBadge}>{currentActif.numero_serie || 'Non renseigné'}</span>
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>État</span>
                    <span style={{
                      ...styles.etatBadge,
                      backgroundColor: currentActif.etat === 'neuf' ? '#10b98120' :
                                     currentActif.etat === 'bon' ? '#3b82f620' :
                                     currentActif.etat === 'reparation' ? '#f59e0b20' :
                                     currentActif.etat === 'hors_service' ? '#ef444420' : '#6b728020',
                      color: currentActif.etat === 'neuf' ? '#10b981' :
                             currentActif.etat === 'bon' ? '#3b82f6' :
                             currentActif.etat === 'reparation' ? '#f59e0b' :
                             currentActif.etat === 'hors_service' ? '#ef4444' : 'var(--text-secondary)'
                    }}>
                      {getEtatLabel(currentActif.etat)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section Informations licence */}
            {currentActif.type_immobilisation === 'incorporel' && (
              <div style={styles.additionalSection}>
                <h3 style={styles.sectionTitle}>📜 Informations licence</h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Date de validité</span>
                    <span style={styles.detailValue}>
                      {currentActif.date_validite ? (
                        <span style={{
                          color: new Date(currentActif.date_validite) < new Date() ? '#ef4444' : '#10b981'
                        }}>
                          {formatDate(currentActif.date_validite)}
                          {new Date(currentActif.date_validite) < new Date() && ' (Expiré)'}
                        </span>
                      ) : 'Non définie'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Nombre d'utilisateurs</span>
                    <span style={styles.detailValue}>
                      {currentActif.nombre_utilisateurs ? (
                        <span style={styles.userCount}>{currentActif.nombre_utilisateurs}</span>
                      ) : 'Non spécifié'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Support</span>
                    <span style={styles.detailValue}>{currentActif.support || 'Non spécifié'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section Informations complémentaires */}
            <div style={styles.additionalSection}>
              <h3 style={styles.sectionTitle}>📍 Informations complémentaires</h3>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Localisation</span>
                  <span style={styles.detailValue}>{currentActif.localisation || 'Non spécifiée'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Affectation</span>
                  <span style={styles.detailValue}>{currentActif.affectation || 'Non affecté'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Compte comptable</span>
                  <span style={styles.detailValue}>
                    <span style={styles.compteBadge}>{currentActif.compte_comptable || '205'}</span>
                  </span>
                </div>
                {currentActif.date_sortie && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Date de sortie</span>
                    <span style={styles.detailValue}>{formatDate(currentActif.date_sortie)}</span>
                  </div>
                )}
                {currentActif.type_sortie && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Type de sortie</span>
                    <span style={styles.detailValue}>
                      {currentActif.type_sortie === 'cession' ? 'Cession' :
                       currentActif.type_sortie === 'mise_au_rebut' ? 'Mise au rebut' : 'Don'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Métadonnées */}
            <div style={styles.metadata}>
              <p style={styles.metadataItem}>
                <strong>Créé le:</strong> {formatDateTime(currentActif.created_at)}
              </p>
              <p style={styles.metadataItem}>
                <strong>Dernière modification:</strong> {formatDateTime(currentActif.updated_at)}
              </p>
              <p style={styles.metadataItem}>
                <strong>Créé par:</strong> {currentActif.created_by_name || 'Système'}
              </p>
            </div>
          </div>
        )}

        {/* Onglet Amortissements */}
        {activeTab === 'amortissements' && (
          <div style={styles.card}>
            <div style={styles.tabHeader}>
              <h2 style={styles.sectionTitle}>Plan d'amortissement</h2>
              {can(['admin', 'comptable']) && (
                <button
                  onClick={handleRecalculerAmortissements}
                  style={styles.primaryButton}
                  disabled={recalculLoading}
                >
                  {recalculLoading ? (
                    <>
                      <div style={styles.smallSpinner}></div>
                      Recalcul en cours...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw /> Recalculer
                    </>
                  )}
                </button>
              )}
            </div>

            {recalculMessage.text && (
              <div style={
                recalculMessage.type === 'success' 
                  ? styles.successMessage 
                  : styles.errorMessage
              }>
                {recalculMessage.text}
              </div>
            )}
            
            {amortissements.length === 0 ? (
              <div style={styles.noData}>
                <p>Aucun amortissement calculé pour cet actif</p>
              </div>
            ) : (
              <>
                <div style={styles.chartsContainer}>
                  <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Évolution de la valeur nette</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={amortissements}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exercice" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="valeur_nette" 
                          stroke="#2563eb" 
                          name="Valeur nette"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="annuite" 
                          stroke="#10b981" 
                          name="Annuité"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Annuités par exercice</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={amortissements}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exercice" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="annuite" fill="#f59e0b" name="Annuité" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  <h3 style={styles.chartTitle}>Détail des amortissements</h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Exercice</th>
                        <th style={styles.th}>Annuité</th>
                        <th style={styles.th}>Cumul</th>
                        <th style={styles.th}>Valeur nette</th>
                        <th style={styles.th}>Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amortissements.map((amort, index) => (
                        <tr key={index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={styles.td}>{amort.exercice || '-'}</td>
                          <td style={styles.td}>{formatCurrency(amort.annuite)}</td>
                          <td style={styles.td}>{formatCurrency(amort.cumul_amortissements)}</td>
                          <td style={styles.td}>{formatCurrency(amort.valeur_nette)}</td>
                          <td style={styles.td}>{amort.taux || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={styles.tfoot}>
                        <td style={styles.td}><strong>Total</strong></td>
                        <td style={styles.td}>
                          <strong>
                            {formatCurrency(amortissements.reduce((sum, a) => sum + (Number(a.annuite) || 0), 0))}
                          </strong>
                        </td>
                        <td style={styles.td}>
                          <strong>
                            {formatCurrency(amortissements[amortissements.length - 1]?.cumul_amortissements || 0)}
                          </strong>
                        </td>
                        <td style={styles.td}>
                          <strong>
                            {formatCurrency(amortissements[amortissements.length - 1]?.valeur_nette || 0)}
                          </strong>
                        </td>
                        <td style={styles.td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Onglet Réévaluations */}
        {activeTab === 'reevaluations' && can(['admin', 'comptable']) && (
          <div style={styles.card}>
            <ReevaluationsList actifId={id} canEdit={can(['admin', 'comptable'])} />
          </div>
        )}

        {/* Onglet Contrats */}
        {activeTab === 'contrats' && can(['admin', 'juridique', 'comptable']) && (
          <div style={styles.card}>
            <div style={styles.tabHeader}>
              <h2 style={styles.sectionTitle}>Contrats liés</h2>
              {can(['admin', 'juridique']) && (
                <button
                  onClick={() => {
                    setShowContratForm(!showContratForm);
                    if (!showContratForm) navigate(`/actifs/${id}/contrats/nouveau`);
                  }}
                  style={styles.primaryButton}
                >
                  <FiPlus /> Nouveau contrat
                </button>
              )}
            </div>

            {showContratForm && (
              <div style={styles.formContainer}>
                <h3 style={styles.formTitle}>Ajouter un contrat</h3>
                <div style={styles.formActions}>
                  <button style={styles.saveButton}>Enregistrer</button>
                  <button onClick={() => setShowContratForm(false)} style={styles.cancelButton}>Annuler</button>
                </div>
              </div>
            )}

            {contrats.length === 0 && !showContratForm ? (
              <div style={styles.noData}>
                <p>Aucun contrat associé à cet actif</p>
              </div>
            ) : contrats.length > 0 && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nom du contrat</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Date début</th>
                    <th style={styles.th}>Date fin</th>
                    <th style={styles.th}>Montant</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contrats.map((contrat, index) => (
                    <tr key={contrat.id || index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{contrat.nom}</td>
                      <td style={styles.td}>{contrat.type || 'Licence'}</td>
                      <td style={styles.td}>{formatDate(contrat.date_debut)}</td>
                      <td style={styles.td}>{formatDate(contrat.date_fin)}</td>
                      <td style={styles.td}>{formatCurrency(contrat.montant)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: new Date(contrat.date_fin) > new Date() ? '#10b98120' : '#ef444420',
                          color: new Date(contrat.date_fin) > new Date() ? '#10b981' : '#ef4444'
                        }}>
                          {new Date(contrat.date_fin) > new Date() ? 'Actif' : 'Expiré'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/contrats/${contrat.id}`)}
                            style={styles.actionButton.view}
                            title="Voir contrat"
                          >
                            <FiEye />
                          </button>
                          {can(['admin', 'juridique']) && (
                            <button
                              onClick={() => navigate(`/contrats/modifier/${contrat.id}`)}
                              style={styles.actionButton.edit}
                              title="Modifier"
                            >
                              <FiEdit />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Onglet Dépréciations */}
        {activeTab === 'depreciations' && can(['admin', 'comptable']) && (
          <div style={styles.card}>
            <DepreciationsList actifId={id} canEdit={can(['admin', 'comptable'])} />
          </div>
        )}

        {/* Onglet Documents */}
        {activeTab === 'documents' && (
          <div style={styles.card}>
            <DocumentList onRefresh={handleRefresh} />
          </div>
        )}

        {/* ✅ Onglet Audit - Version professionnelle avec timeline */}
        {activeTab === 'audit' && can(['admin', 'auditeur']) && (
          <div style={styles.card}>
            <div style={styles.auditHeaderSection}>
              <h2 style={styles.sectionTitle}>📋 Historique des modifications</h2>
              <div style={styles.auditBadge}>
                <FiActivity size={14} />
                <span>{auditLogs.length} événement(s)</span>
              </div>
            </div>
            
            {auditLogs.length === 0 ? (
              <div style={styles.noData}>
                <FiFileText size={48} color="#9ca3af" />
                <p>Aucun historique trouvé pour cet actif</p>
              </div>
            ) : (
              <div style={styles.auditTimeline}>
                {auditLogs.map((log, index) => {
                  const isExpanded = expandedAuditId === log.id;
                  const actionColor = getActionColor(log.action);
                  
                  return (
                    <div key={log.id || index} style={styles.timelineItem}>
                      {/* Ligne de temps verticale */}
                      <div style={styles.timelineLine}>
                        <div style={{...styles.timelineDot, backgroundColor: actionColor}} />
                        {index < auditLogs.length - 1 && <div style={styles.timelineConnector} />}
                      </div>
                      
                      {/* Contenu de l'audit */}
                      <div style={styles.timelineContent}>
                        {/* Carte cliquable */}
                        <div 
                          style={{...styles.auditCard, ...(isExpanded ? styles.auditCardExpanded : {})}}
                          onClick={() => toggleAuditDetails(log.id)}
                        >
                          {/* En-tête de la carte */}
                          <div style={styles.auditCardHeader}>
                            <div style={{...styles.auditActionBadge, backgroundColor: actionColor + '20', color: actionColor}}>
                              {getActionIcon(log.action)}
                              <span>{getActionLabel(log.action)}</span>
                            </div>
                            <div style={styles.auditMeta}>
                              <span style={styles.auditTable}>
                                <FiDatabase size={12} />
                                {getTableLabel(log.table_name)}
                              </span>
                              <span style={styles.auditDate}>
                                <FiClock size={12} />
                                {formatDateTime(log.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Corps de la carte */}
                          <div style={styles.auditCardBody}>
                            <div style={styles.auditUserInfo}>
                              <div style={styles.auditAvatar}>
                                {log.utilisateur?.full_name?.charAt(0) || 'S'}
                              </div>
                              <div style={styles.auditUserDetails}>
                                <span style={styles.auditUserName}>
                                  {log.utilisateur?.full_name || 'Système'}
                                </span>
                                <span style={styles.auditUserEmail}>
                                  {log.utilisateur?.email || 'system@bcc.cd'}
                                </span>
                              </div>
                            </div>
                            <div style={styles.auditRecordInfo}>
                              <span style={styles.auditRecordLabel}>ID enregistrement</span>
                              <code style={styles.auditRecordCode}>{log.record_id}</code>
                              {log.ip_address && (
                                <span style={styles.auditIp}>
                                  <FiActivity size={10} /> {log.ip_address}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Pied de carte avec indicateur d'expansion */}
                          <div style={styles.auditCardFooter}>
                            <div style={styles.expandIndicator}>
                              {isExpanded ? (
                                <>
                                  <FiChevronUp size={16} />
                                  <span>Masquer les détails</span>
                                </>
                              ) : (
                                <>
                                  <FiChevronDown size={16} />
                                  <span>Afficher les détails</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Détails expansés */}
                        {isExpanded && (
                          <div style={styles.auditDetailsPanel}>
                            {/* Modifications */}
                            {log.old_data && log.new_data && (
                              <div style={styles.diffPanel}>
                                <div style={styles.diffHeader}>
                                  <FiInfo size={14} />
                                  <span>Modifications détectées</span>
                                </div>
                                <div style={styles.diffGrid}>
                                  {Object.keys(log.new_data).map(key => {
                                    const oldVal = log.old_data[key];
                                    const newVal = log.new_data[key];
                                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                      return (
                                        <div key={key} style={styles.diffRow}>
                                          <div style={styles.diffKey}>{key}</div>
                                          <div style={styles.diffValues}>
                                            <span style={styles.diffOld}>
                                              {oldVal !== undefined && oldVal !== null ? 
                                                (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : 
                                                <em>null</em>}
                                            </span>
                                            <span style={styles.diffArrow}>→</span>
                                            <span style={styles.diffNew}>
                                              {newVal !== undefined && newVal !== null ? 
                                                (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : 
                                                <em>null</em>}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Création */}
                            {!log.old_data && log.new_data && (
                              <div style={styles.createPanel}>
                                <div style={styles.createHeader}>
                                  <FiPlus size={14} />
                                  <span>Nouvel enregistrement créé</span>
                                </div>
                                <div style={styles.jsonViewer}>
                                  <pre>{JSON.stringify(log.new_data, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                            
                            {/* Suppression */}
                            {log.old_data && !log.new_data && (
                              <div style={styles.deletePanel}>
                                <div style={styles.deleteHeader}>
                                  <FiTrash2 size={14} />
                                  <span>Enregistrement supprimé</span>
                                </div>
                                <div style={styles.jsonViewer}>
                                  <pre>{JSON.stringify(log.old_data, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                            
                            {/* Aucune donnée */}
                            {!log.old_data && !log.new_data && (
                              <div style={styles.emptyDetails}>
                                <FiInfo size={14} />
                                <span>Aucune donnée détaillée disponible pour cette action</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Onglet Historique (Mouvements) */}
        {activeTab === 'historique' && (
          <div style={styles.card}>
            <MouvementsList onRefresh={handleRefresh} />
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== STYLES ====================

const auditStyles = {
  auditList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  auditItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px'
  },
  auditIcon: {
    padding: '0.5rem',
    backgroundColor: '#e0f2fe',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  auditContent: {
    flex: 1
  },
  auditHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  auditDate: {
    fontSize: '0.75rem',
    color: '#666'
  },
  auditDetails: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  },
  auditUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginBottom: '0.25rem',
    color: '#666'
  },
  auditChanges: {
    color: '#2563eb'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.95rem',
    resize: 'vertical'
  }
};

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
  headerLeft: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
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
  titleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0
  },
  headerMeta: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-block'
  },
  type: {
    fontSize: '0.875rem',
    color: '#666'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  factureButton: {
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
  factureCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  factureHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #bbf7d0'
  },
  factureInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  factureLabel: {
    fontSize: '0.75rem',
    color: '#166534',
    marginRight: '0.5rem'
  },
  factureValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#14532d'
  },
  factureDownloadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    justifyContent: 'center'
  },
  conversionSection: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '0.75rem',
    marginTop: '0.75rem',
    marginBottom: '0.75rem',
    border: '1px solid #e2e8f0'
  },
  conversionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '0.5rem',
    paddingBottom: '0.25rem',
    borderBottom: '1px solid #e2e8f0'
  },
  conversionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
    fontSize: '0.7rem',
    color: '#475569'
  },
  conversionRowHighlight: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0 0.25rem',
    marginTop: '0.25rem',
    borderTop: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#10b981'
  },
  modalFactureContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1rem',
    width: '90%',
    maxWidth: '900px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  pdfContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    marginTop: '1rem'
  },
  pdfIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '4px'
  },
  // ✅ Nouveaux styles pour l'onglet Audit professionnel
  auditHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  auditBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '20px',
    fontSize: '0.875rem',
    color: '#475569'
  },
  auditTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  timelineItem: {
    display: 'flex',
    gap: '1rem',
    position: 'relative'
  },
  timelineLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '24px',
    position: 'relative'
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 2,
    boxShadow: '0 0 0 3px white'
  },
  timelineConnector: {
    width: '2px',
    flex: 1,
    backgroundColor: 'var(--border-color)',
    marginTop: '4px',
    minHeight: '40px'
  },
  timelineContent: {
    flex: 1
  },
  auditCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  auditCardExpanded: {
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59,130,246,0.1)'
  },
  auditCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    backgroundColor: '#fafbfc',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  auditActionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.875rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  auditMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  auditTable: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '0.25rem 0.625rem',
    borderRadius: '12px'
  },
  auditDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  auditCardBody: {
    padding: '1rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  auditUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  auditAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  auditUserDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  auditUserName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  auditUserEmail: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)'
  },
  auditRecordInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  auditRecordLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    textTransform: 'uppercase'
  },
  auditRecordCode: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    color: 'var(--text-primary)'
  },
  auditIp: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.65rem',
    color: '#9ca3af'
  },
  auditCardFooter: {
    padding: '0.75rem 1.25rem',
    borderTop: '1px solid #f1f5f9',
    backgroundColor: '#fafbfc'
  },
  expandIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    justifyContent: 'center'
  },
  auditDetailsPanel: {
    marginTop: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  diffPanel: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  diffHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#334155'
  },
  diffGrid: {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  diffRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
    padding: '0.5rem',
    backgroundColor: '#fafbfc',
    borderRadius: '8px',
    flexWrap: 'wrap'
  },
  diffKey: {
    fontSize: '0.75rem',
    fontWeight: '600',
    fontFamily: 'monospace',
    color: '#475569',
    minWidth: '120px',
    backgroundColor: 'var(--bg-primary)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  diffValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  diffOld: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-all'
  },
  diffArrow: {
    color: '#94a3b8',
    fontSize: '0.75rem'
  },
  diffNew: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#10b981',
    backgroundColor: '#dcfce7',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-all'
  },
  createPanel: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  createHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f0fdf4',
    borderBottom: '1px solid #dcfce7',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#166534'
  },
  deletePanel: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  deleteHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fef2f2',
    borderBottom: '1px solid #fee2e2',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#991b1b'
  },
  jsonViewer: {
    padding: '0.75rem',
    maxHeight: '300px',
    overflow: 'auto',
    '& pre': {
      margin: 0,
      fontSize: '0.7rem',
      fontFamily: 'monospace',
      color: '#1e293b',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all'
    }
  },
  emptyDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: '#fef9e3',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: '#b45309'
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    backgroundColor: 'var(--bg-card)',
    padding: '0.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    flex: 1,
    justifyContent: 'center',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    flex: 1,
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    fontWeight: '500'
  },
  tabContent: {
    marginTop: '1rem'
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    margin: '0 0 1rem 0'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  },
  infoSection: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '1.5rem',
    borderRadius: '8px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0.5rem'
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#666',
    flex: 1
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111',
    flex: 2,
    textAlign: 'right'
  },
  codeBadge: {
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    fontFamily: 'monospace'
  },
  detailCard: {
    backgroundColor: '#f0f9ff',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #bae6fd'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: '0.75rem',
    borderBottom: '1px solid #bae6fd',
    paddingBottom: '0.5rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  detailLabel: {
    color: '#075985',
    fontWeight: '500'
  },
  detailValue: {
    fontWeight: '500',
    color: '#0c4a6e',
    textAlign: 'right'
  },
  conversionNote: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    marginLeft: '0.5rem',
    fontWeight: 'normal'
  },
  additionalSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#111'
  },
  etatBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-block'
  },
  serialBadge: {
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.875rem'
  },
  inventaireBadge: {
    backgroundColor: '#e0f2fe',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.875rem'
  },
  compteBadge: {
    backgroundColor: '#fef3c7',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.875rem'
  },
  userCount: {
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  metadata: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  metadataItem: {
    fontSize: '0.75rem',
    color: '#666',
    margin: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e5e7eb'
  },
  trEven: {
    backgroundColor: 'var(--bg-card)'
  },
  trOdd: {
    backgroundColor: '#fafafa'
  },
  tfoot: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionButton: {
    view: {
      padding: '0.25rem',
      backgroundColor: '#3b82f6',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    },
    edit: {
      padding: '0.25rem',
      backgroundColor: '#f59e0b',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  },
  primaryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
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
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#fee2e2',
    borderRadius: '8px'
  },
  errorMessage: {
    color: '#dc2626',
    margin: '1rem 0'
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  noData: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    color: '#666'
  },
  formContainer: {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px'
  },
  formTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  saveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666'
  },
  qrContainer: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  qrCode: {
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    display: 'inline-block'
  },
  qrInfo: {
    flex: 1,
    minWidth: '200px'
  },
  qrLabel: {
    fontSize: '0.75rem',
    color: '#666',
    marginBottom: '0.25rem',
    textTransform: 'uppercase'
  },
  qrValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#111',
    marginBottom: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1.5rem'
  },
  printButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  downloadButton: {
    padding: '0.5rem 1rem',
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
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  chartCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  chartTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  tableContainer: {
    marginTop: '1rem'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '0.5rem',
    display: 'inline-block'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  auditList: auditStyles.auditList,
  auditItem: auditStyles.auditItem,
  auditIcon: auditStyles.auditIcon,
  auditContent: auditStyles.auditContent,
  auditHeader: auditStyles.auditHeader,
  auditDate: auditStyles.auditDate,
  auditDetails: auditStyles.auditDetails,
  auditUser: auditStyles.auditUser,
  auditChanges: auditStyles.auditChanges,
  auditTableInfo: auditStyles.auditTableInfo,
  auditTableBadge: auditStyles.auditTableBadge,
  auditRecordId: auditStyles.auditRecordId,
  formGroup: auditStyles.formGroup,
  label: auditStyles.label,
  input: auditStyles.input,
  textarea: auditStyles.textarea
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .audit-details-enter {
    animation: slideDown 0.2s ease-out;
  }
`;
document.head.appendChild(styleSheet);

export default ActifDetail;