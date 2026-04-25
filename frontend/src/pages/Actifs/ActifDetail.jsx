// frontend/src/pages/Actifs/ActifDetail.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
import { formatAuditData } from '../../utils/auditFormatter';
import {
  FiArrowLeft, FiEdit, FiFileText, FiCalendar,
  FiDollarSign, FiTag, FiClock, FiRefreshCw,
  FiDownload, FiEye, FiTrash2, FiPlus, FiInfo,
  FiTrendingDown, FiTrendingUp, FiMaximize2, FiPrinter,
  FiFile, FiUser, FiMail, FiActivity, FiFileText as FiInvoice,
  FiChevronDown, FiChevronUp, FiDatabase, FiPackage
} from 'react-icons/fi';

// Imports pour les graphiques
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import AmortissementChart from '../../components/Graphiques/AmortissementChart';

import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Badge, Card, Container, Row, Col, Nav, Tab, Modal, Spinner, Table, Alert } from 'react-bootstrap';

// ==================== CONSTANTES ====================
const TYPE_LABELS = {
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

const ETAT_LABELS = {
  neuf: 'Neuf',
  bon: 'Bon état',
  reparation: 'En réparation',
  hors_service: 'Hors service'
};

const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  RECALCUL: 'Recalcul amortissements',
  DEPRECIATION: 'Test de dépréciation',
  SORTIE: 'Sortie d\'actif'
};

const ACTION_COLORS = {
  CREATE: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  RECALCUL: '#3b82f6',
  DEPRECIATION: '#8b5cf6',
  SORTIE: '#64748b'
};

const TABLE_LABELS = {
  actifs: 'Actifs',
  users: 'Utilisateurs',
  contrats: 'Contrats',
  reevaluations: 'Réévaluations',
  depreciations: 'Dépréciations',
  mouvements: 'Mouvements',
  documents: 'Documents'
};

// ==================== FONCTIONS UTILITAIRES ====================

// Formatage monétaire avec devise dynamique
const formatCurrency = (value, devise = 'CDF') => {
  if (value === undefined || value === null || isNaN(value)) return `0 ${devise}`;
  try {
    const symboles = {
      'CDF': { code: 'CDF', locale: 'fr-CD', symbole: 'FC' },
      'USD': { code: 'USD', locale: 'en-US', symbole: '$' },
      'EUR': { code: 'EUR', locale: 'fr-FR', symbole: '€' },
      'GBP': { code: 'GBP', locale: 'en-GB', symbole: '£' },
      'CNY': { code: 'CNY', locale: 'zh-CN', symbole: '¥' }
    };
    
    const config = symboles[devise] || symboles['CDF'];
    const montant = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(montant)) return `0 ${devise}`;
    
    if (devise === 'CDF') {
      return `${Math.round(montant).toLocaleString()} ${config.symbole}`;
    }
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(montant);
  } catch {
    return `${Math.round(value || 0).toLocaleString()} ${devise}`;
  }
};

// Convertir un montant de CDF vers la devise d'origine
const convertCDFToDevise = (montantCDF, tauxChange) => {
  if (!tauxChange || tauxChange <= 0) return montantCDF;
  return montantCDF / tauxChange;
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
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Date invalide';
  }
};

const getTypeLabel = (type) => TYPE_LABELS[type] || type;
const getEtatLabel = (etat) => ETAT_LABELS[etat] || etat || 'N/A';
const getActionLabel = (action) => ACTION_LABELS[action] || action;
const getActionColor = (action) => ACTION_COLORS[action] || '#64748b';
const getTableLabel = (table) => TABLE_LABELS[table] || table;

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

const getActionIcon = (action) => {
  const icons = {
    CREATE: <FiPlus size={12} />,
    UPDATE: <FiEdit size={12} />,
    DELETE: <FiTrash2 size={12} />,
    RECALCUL: <FiRefreshCw size={12} />,
    DEPRECIATION: <FiTrendingDown size={12} />,
    SORTIE: <FiPackage size={12} />
  };
  return icons[action] || <FiActivity size={12} />;
};

const calculerTotal = (amortissements, field) => {
  if (!amortissements?.length) return 0;
  return amortissements.reduce((sum, a) => {
    const value = a[field];
    if (value === undefined || value === null) return sum;
    const numValue = Number(value);
    return isNaN(numValue) ? sum : sum + numValue;
  }, 0);
};

// Styles d'animation
const animationStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .audit-details-enter { animation: slideDown 0.2s ease-out; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transition: all 0.3s ease; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .white-text-section,
  .white-text-section .card,
  .white-text-section .card-body,
  .white-text-section .bg-light,
  .white-text-section .bg-light .card,
  .white-text-section .bg-light .card-body,
  .white-text-section .table,
  .white-text-section td,
  .white-text-section th,
  .white-text-section .text-muted,
  .white-text-section .fw-medium,
  .white-text-section .small,
  .white-text-section p,
  .white-text-section span:not(.badge):not(.text-primary):not(.text-success):not(.text-danger):not(.text-warning):not(.text-info),
  .white-text-section h1,
  .white-text-section h2,
  .white-text-section h3,
  .white-text-section h4,
  .white-text-section h5,
  .white-text-section h6,
  .white-text-section div,
  .white-text-section .fw-bold,
  .white-text-section .fw-semibold {
    color: #ffffff !important;
  }
  
  .white-text-section .bg-light,
  .white-text-section .bg-light .card {
    background-color: rgba(0, 0, 0, 0.5) !important;
  }
  
  .white-text-section .badge {
    color: inherit !important;
  }
  
  .white-text-section .border-bottom {
    border-bottom-color: rgba(255, 255, 255, 0.2) !important;
  }
  
  .white-text-section .border-top {
    border-top-color: rgba(255, 255, 255, 0.2) !important;
  }
  
  .black-text-section,
  .black-text-section .card-body,
  .black-text-section .table,
  .black-text-section td,
  .black-text-section th,
  .black-text-section .text-muted,
  .black-text-section .fw-medium,
  .black-text-section .small,
  .black-text-section p,
  .black-text-section span:not(.badge),
  .audit-details-content,
  .audit-details-content .text-muted,
  .audit-details-content .fw-semibold,
  .audit-details-content .small,
  .contrats-section td,
  .contrats-section th,
  .amortissements-section td,
  .amortissements-section th {
    color: #000000 !important;
  }
  
  .amortissements-section .bg-light,
  .contrats-section .bg-light {
    background-color: #f1f5f9 !important;
  }
  
  .white-text-section .bg-white {
    background-color: rgba(0, 0, 0, 0.4) !important;
  }
  
  .white-text-section {
    background-color: #1e293b !important;
    border-radius: 12px;
    padding: 1px;
  }
  
  .white-text-section .card {
    background-color: #1e293b !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

// ==================== COMPOSANT PRINCIPAL ====================
const ActifDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  const { can } = usePermissions();
  const { actifCourant, loading: reduxLoading } = useSelector((state) => state.actifs || {});
  const { user } = useSelector((state) => state.auth || {});
  
  const role = user?.role || 'guest';
  const canViewAudit = ['admin', 'auditeur'].includes(role);
  const canView = can(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'gestionnaire']);
  const canEdit = can(['admin', 'comptable']);
  const canManageContracts = can(['admin', 'comptable', 'juridique', 'gestionnaire']);
  const canManageDepreciations = can(['admin', 'comptable']);
  const canRecalculAmort = can(['admin', 'comptable']);
  
  const isJuridique = role === 'juridique';
  
  const [actif, setActif] = useState(null);
  const [amortissements, setAmortissements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [facture, setFacture] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(`actif_${id}_activeTab`);
    const validTabs = ['infos', 'amortissements', 'reevaluations', 'contrats', 'depreciations', 'documents', 'audit', 'historique'];
    return savedTab && validTabs.includes(savedTab) ? savedTab : 'infos';
  });
  const [showContratForm, setShowContratForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFacture, setDownloadingFacture] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePdfUrl, setFacturePdfUrl] = useState(null);
  const [loadingFacturePdf, setLoadingFacturePdf] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState(null);
  const [recalculLoading, setRecalculLoading] = useState(false);
  const [recalculMessage, setRecalculMessage] = useState({ type: '', text: '' });
  const [depreciationForm, setDepreciationForm] = useState({
    date_test: new Date().toISOString().split('T')[0],
    valeur_recouvrable: '',
    commentaire: ''
  });

  useEffect(() => {
    if (!canView && !loading) {
      setError('Vous n\'avez pas les droits pour consulter cet actif');
      setTimeout(() => navigate('/actifs'), 2000);
    }
  }, [canView, loading, navigate]);

  useEffect(() => {
    if (activeTab && id) {
      localStorage.setItem(`actif_${id}_activeTab`, activeTab);
    }
  }, [activeTab, id]);

  const currentActif = actif || actifCourant;
  const dernierAmort = amortissements[amortissements.length - 1];
  const valeurNette = dernierAmort?.valeur_nette || currentActif?.cout_acquisition || 0;
  const amortissementsCumules = dernierAmort?.cumul_amortissements || 0;
  
  // Récupérer la devise d'origine et le taux de change
  const deviseOrigine = currentActif?.devise?.code || 'CDF';
  const tauxChange = currentActif?.taux_change_utilisation || 1;
  const montantDeviseOrigine = currentActif?.montant_devise || currentActif?.cout_acquisition / tauxChange;

  const chargerDonnees = useCallback(async () => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);
      const actifData = await actifService.getById(id);
      setActif(actifData);
      
      if (!isJuridique) {
        try {
          const amortData = await actifService.getAmortissements(id);
          setAmortissements(amortData);
        } catch {}
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id, isJuridique]);

  const fetchContrats = useCallback(async () => {
    if (!id || id === 'undefined') return;
    try {
      const res = await api.get(`/actifs/${id}/contrats`);
      setContrats(res.data);
    } catch {}
  }, [id]);

  const fetchDepreciations = useCallback(async () => {
    if (!id || id === 'undefined' || isJuridique) return;
    try {
      const res = await api.get(`/actifs/${id}/depreciations`);
      setDepreciations(res.data);
    } catch {}
  }, [id, isJuridique]);

  const fetchAuditLogs = useCallback(async () => {
    if (!id || !canViewAudit || isJuridique) return;
    try {
      const response = await api.get(`/audit-logs/actif/${id}`);
      const logs = Array.isArray(response.data) ? response.data : response.data?.logs || [];
      setAuditLogs(logs);
    } catch (error) {
      console.error('Erreur chargement audit:', error);
      setAuditLogs([]);
    }
  }, [id, canViewAudit, isJuridique]);

  const fetchFacture = useCallback(async () => {
    if (!id || isJuridique) return;
    try {
      const response = await api.get(`/actifs/${id}/facture`);
      setFacture(response.data);
    } catch {
      setFacture(null);
    }
  }, [id, isJuridique]);

  useEffect(() => {
    if (id && id !== 'undefined') {
      chargerDonnees();
      fetchContrats();
      fetchDepreciations();
      fetchAuditLogs();
      fetchFacture();
      dispatch(fetchActifById(id));
    } else if (id === 'undefined') {
      setError('ID actif invalide');
      setLoading(false);
    }
  }, [id, dispatch, chargerDonnees, fetchContrats, fetchDepreciations, fetchAuditLogs, fetchFacture]);

  const handleRecalculerAmortissements = async () => {
    if (!id || id === 'undefined' || isJuridique) return;
    setRecalculLoading(true);
    setRecalculMessage({ type: '', text: '' });
    
    try {
      await api.post(`/actifs/${id}/recalculer`);
      const amortData = await actifService.getAmortissements(id);
      setAmortissements(amortData);
      setRecalculMessage({ type: 'success', text: '✅ Amortissements recalculés avec succès !' });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setRecalculMessage({ type: 'error', text: '❌ Erreur lors du recalcul des amortissements' });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } finally {
      setRecalculLoading(false);
    }
  };

  const handleCreateDepreciation = async (e) => {
    e.preventDefault();
    if (!id || id === 'undefined' || isJuridique) return;
    try {
      await api.post(`/actifs/${id}/depreciations`, depreciationForm);
      setShowDepreciationModal(false);
      fetchDepreciations();
      setDepreciationForm({
        date_test: new Date().toISOString().split('T')[0],
        valeur_recouvrable: '',
        commentaire: ''
      });
    } catch (err) {
      console.error('Erreur création dépréciation:', err);
    }
  };

  const handleViewFacture = async () => {
  if (!id || isJuridique) return;
  setLoadingFacturePdf(true);
  try {
    // ✅ Ajout d'un timestamp pour éviter le cache
    const timestamp = Date.now();
    const response = await api.get(`/actifs/${id}/facture/download?t=${timestamp}`, { 
      responseType: 'blob' 
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    setFacturePdfUrl(url);
    setShowFactureModal(true);
  } catch {
    alert('Impossible de charger la facture.');
  } finally {
    setLoadingFacturePdf(false);
  }
};


  const handleDownloadFacture = async () => {
  if (!id || isJuridique) return;
  setDownloadingFacture(true);
  try {
    // ✅ Ajout d'un timestamp pour éviter le cache
    const timestamp = Date.now();
    const response = await api.get(`/actifs/${id}/facture/download?t=${timestamp}`, { 
      responseType: 'blob' 
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture_${id}_${timestamp}.pdf`;  // ← Nom unique
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    alert('Impossible de télécharger la facture.');
  } finally {
    setDownloadingFacture(false);
  }
};

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>QR Code - ${currentActif?.code}</title>
        <style>body{display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial}.container{text-align:center}.code{font-family:monospace;font-size:14px;color:#666;margin-top:10px}</style></head>
        <body><div class="container"><img src="${document.getElementById('qr-code-canvas')?.toDataURL()}" /><div class="code">${currentActif?.numero_inventaire || currentActif?.code}</div></div><script>window.print();</script></body>
      </html>
    `);
    printWindow.document.close();
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

  const toggleAuditDetails = (auditId) => {
    setExpandedAuditId(prev => prev === auditId ? null : auditId);
  };

  const getFactureDetails = () => {
    if (!facture) return null;
    
    let ht = Number(facture.montant_ht);
    let tva = Number(facture.montant_tva);
    let ttc = Number(facture.montant_ttc);
    let devise = facture.devise || 'CDF';
    let numero = facture.numero_facture || facture.numero || 'Non spécifié';
    let date = facture.date_emission || facture.date_facture;
    
    if (isNaN(ht) || ht === 0) {
      if (facture.montant && !isNaN(Number(facture.montant))) {
        ttc = Number(facture.montant);
        ht = Math.round(ttc / 1.16);
        tva = ttc - ht;
      } else if (facture.conversion && facture.conversion.montant_devise) {
        ht = Number(facture.conversion.montant_devise);
        tva = Math.round(ht * 0.16);
        ttc = ht + tva;
        devise = facture.conversion.devise_originale || devise;
      } else if (facture.actif?.montant_devise) {
        ht = Number(facture.actif.montant_devise);
        tva = Math.round(ht * 0.16);
        ttc = ht + tva;
        devise = facture.actif?.devise_code || devise;
      }
    }
    
    const htNum = Math.round(ht);
    const tvaNum = Math.round(tva);
    const ttcNum = Math.round(ttc);
    const ttcCalcule = htNum + tvaNum;
    
    if (Math.abs(ttcNum - ttcCalcule) > 2) {
      console.warn(`⚠️ Incohérence facture: HT=${htNum}, TVA=${tvaNum}, TTC fourni=${ttcNum}, TTC recalculé=${ttcCalcule}, Devise=${devise}`);
      return {
        ht: htNum,
        tva: tvaNum,
        ttc: ttcCalcule,
        devise: devise,
        numero: numero,
        date: date,
        incohérent: true
      };
    }
    
    return {
      ht: htNum,
      tva: tvaNum,
      ttc: ttcNum,
      devise: devise,
      numero: numero,
      date: date,
      incohérent: false
    };
  };

  const factureDetails = facture ? getFactureDetails() : null;

  if (loading || reduxLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
        <p className="text-muted">Chargement des données...</p>
      </Container>
    );
  }

  if (error || !currentActif) {
    return (
      <Container className="py-5">
        <Card className="text-center p-5 bg-danger bg-opacity-10 border-0">
          <FiInfo size={48} className="text-danger mx-auto mb-3" />
          <p className="text-danger fw-semibold">{error || 'Actif non trouvé'}</p>
          <Button variant="primary" onClick={handleGoBack} className="mx-auto d-inline-flex align-items-center gap-2">
            <FiArrowLeft /> Retour
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <Button variant="outline-secondary" onClick={handleGoBack} className="d-flex align-items-center gap-2">
              <FiArrowLeft size={18} /> Retour
            </Button>
            <div>
              <h1 className="h2 fw-bold text-dark mb-1">{currentActif.code} - {currentActif.nom}</h1>
              <div className="d-flex gap-3 align-items-center mt-2">
                <Badge bg={getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#10b981' ? 'success' : getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#f59e0b' ? 'warning' : 'danger'} className="px-3 py-2">
                  {getStatusText({...currentActif, valeur_nette: valeurNette})}
                </Badge>
                <span className="text-muted">{getTypeLabel(currentActif.type)}</span>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-secondary" onClick={handleRefresh}><FiRefreshCw /></Button>
            <Button variant="outline-secondary" onClick={() => setShowQRModal(true)}><FiMaximize2 /></Button>
            {!isJuridique && facture && (
              <>
                <Button variant="success" onClick={handleViewFacture} disabled={loadingFacturePdf}>
                  <FiEye className="me-1" /> {loadingFacturePdf ? 'Chargement...' : 'Voir facture'}
                </Button>
                <Button variant="warning" onClick={handleDownloadFacture} disabled={downloadingFacture}>
                  <FiDownload className="me-1" /> {downloadingFacture ? '...' : 'PDF'}
                </Button>
              </>
            )}
            {canEdit && (
              <Button variant="primary" onClick={handleEdit}>
                <FiEdit className="me-1" /> Modifier
              </Button>
            )}
          </div>
        </div>

        {/* Section Facture */}
        {!isJuridique && factureDetails && (
          <Card className="mb-4 border-success bg-success bg-opacity-10">
            <Card.Body className="py-3">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <FiInvoice size={20} />
                  </div>
                  <div>
                    <h5 className="mb-0 fw-semibold">Facture associée</h5>
                    <div className="d-flex gap-3 mt-1 flex-wrap">
                      <small className="text-muted">N° {factureDetails.numero}</small>
                      {factureDetails.date && <small className="text-muted">Date: {formatDate(factureDetails.date)}</small>}
                      <small className="text-muted fw-semibold">Devise: {factureDetails.devise}</small>
                    </div>
                    <div className="mt-2 pt-1 border-top border-success">
                      <div className="d-flex gap-4 flex-wrap mt-1">
                        <div><small className="text-muted">Montant HT :</small> <strong>{formatCurrency(factureDetails.ht, factureDetails.devise)}</strong></div>
                        <div><small className="text-muted">TVA (16%) :</small> <strong>{formatCurrency(factureDetails.tva, factureDetails.devise)}</strong></div>
                        <div><small className="text-muted fw-semibold">TOTAL TTC :</small> <strong className="text-success">{formatCurrency(factureDetails.ttc, factureDetails.devise)}</strong></div>
                      </div>
                      {factureDetails.incohérent && (
                        <div className="mt-2">
                          <small className="text-warning">⚠️ Incohérence : le TTC a été recalculé automatiquement.</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="outline-success" onClick={handleViewFacture} disabled={loadingFacturePdf}>
                    {loadingFacturePdf ? <><Spinner as="span" size="sm" animation="border" className="me-1" /> Chargement</> : <><FiEye className="me-1" /> Visualiser</>}
                  </Button>
                  <Button size="sm" variant="success" onClick={handleDownloadFacture} disabled={downloadingFacture}>
                    {downloadingFacture ? <><Spinner as="span" size="sm" animation="border" className="me-1" /> Téléchargement</> : <><FiDownload className="me-1" /> Télécharger PDF</>}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Modals */}
        <Modal show={showFactureModal} onHide={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Facture</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ height: '70vh' }}>
            {facturePdfUrl && <iframe src={facturePdfUrl} title="Facture" style={{ width: '100%', height: '100%', border: 'none' }} />}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }}>Fermer</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>QR Code - {currentActif.code}</Modal.Title></Modal.Header>
          <Modal.Body className="text-center">
            <div id="qr-code-canvas">
              <QRCodeCanvas value={currentActif.numero_inventaire || currentActif.code} size={256} level="H" includeMargin={true} />
            </div>
            <p className="mt-3 font-monospace">{currentActif.numero_inventaire || currentActif.code}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQRModal(false)}>Fermer</Button>
            <Button variant="primary" onClick={handlePrintQR}>Imprimer</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showDepreciationModal} onHide={() => setShowDepreciationModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Nouveau test de dépréciation</Modal.Title></Modal.Header>
          <form onSubmit={handleCreateDepreciation}>
            <Modal.Body>
              <div className="mb-3">
                <label className="form-label">Date du test</label>
                <input type="date" className="form-control" value={depreciationForm.date_test} onChange={(e) => setDepreciationForm({...depreciationForm, date_test: e.target.value})} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Valeur recouvrable</label>
                <input type="number" step="1000" className="form-control" value={depreciationForm.valeur_recouvrable} onChange={(e) => setDepreciationForm({...depreciationForm, valeur_recouvrable: e.target.value})} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Commentaire</label>
                <textarea className="form-control" rows="3" value={depreciationForm.commentaire} onChange={(e) => setDepreciationForm({...depreciationForm, commentaire: e.target.value})} />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDepreciationModal(false)}>Annuler</Button>
              <Button variant="primary" type="submit">Enregistrer</Button>
            </Modal.Footer>
          </form>
        </Modal>

        {/* Tabs */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="p-0">
            <Nav variant="tabs" defaultActiveKey="infos" className="px-3 pt-2">
              <Nav.Item>
                <Nav.Link eventKey="infos" onClick={() => setActiveTab('infos')} className="d-flex align-items-center gap-2">
                  <FiFileText size={14} /> Informations
                </Nav.Link>
              </Nav.Item>
              {!isJuridique && (
                <Nav.Item>
                  <Nav.Link eventKey="amortissements" onClick={() => setActiveTab('amortissements')} className="d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Amortissements
                  </Nav.Link>
                </Nav.Item>
              )}
              {!isJuridique && canEdit && (
                <Nav.Item>
                  <Nav.Link eventKey="reevaluations" onClick={() => setActiveTab('reevaluations')} className="d-flex align-items-center gap-2">
                    <FiTrendingUp size={14} /> Réévaluations
                  </Nav.Link>
                </Nav.Item>
              )}
              {canManageContracts && (
                <Nav.Item>
                  <Nav.Link eventKey="contrats" onClick={() => setActiveTab('contrats')} className="d-flex align-items-center gap-2">
                    <FiFileText size={14} /> Contrats ({contrats.length})
                  </Nav.Link>
                </Nav.Item>
              )}
              {!isJuridique && canManageDepreciations && (
                <Nav.Item>
                  <Nav.Link eventKey="depreciations" onClick={() => setActiveTab('depreciations')} className="d-flex align-items-center gap-2">
                    <FiTrendingDown size={14} /> Dépréciations ({depreciations.length})
                  </Nav.Link>
                </Nav.Item>
              )}
              <Nav.Item>
                <Nav.Link eventKey="documents" onClick={() => setActiveTab('documents')} className="d-flex align-items-center gap-2">
                  <FiFile size={14} /> Documents
                </Nav.Link>
              </Nav.Item>
              {!isJuridique && canViewAudit && (
                <Nav.Item>
                  <Nav.Link eventKey="audit" onClick={() => setActiveTab('audit')} className="d-flex align-items-center gap-2">
                    <FiEye size={14} /> Audit ({auditLogs.length})
                  </Nav.Link>
                </Nav.Item>
              )}
              <Nav.Item>
                <Nav.Link eventKey="historique" onClick={() => setActiveTab('historique')} className="d-flex align-items-center gap-2">
                  <FiClock size={14} /> Historique
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Body>
        </Card>

        {/* Tab Content - Informations */}
        {activeTab === 'infos' && (
          <div className="white-text-section">
            <Card className="shadow-sm border-0">
              <Card.Body>
                <Row className="g-4">
                  <Col md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3">📋 Informations générales</h3>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Code</span><span className="fw-medium font-monospace">{currentActif.code}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Nom</span><span className="fw-medium">{currentActif.nom}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Type</span><span className="fw-medium">{getTypeLabel(currentActif.type)}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Type d'immobilisation</span><span className="fw-medium">{currentActif.type_immobilisation === 'corporel' ? 'Corporel' : 'Incorporel'}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Numéro d'inventaire</span><span className="fw-medium font-monospace">{currentActif.numero_inventaire || 'N/A'}</span></div>
                        {currentActif.description && <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Description</span><span className="fw-medium">{currentActif.description}</span></div>}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3">💰 Acquisition</h3>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Date d'acquisition</span><span className="fw-medium">{formatDate(currentActif.date_acquisition)}</span></div>
                        <div className="bg-white rounded-3 p-3 my-3">
                          <h4 className="small fw-semibold text-primary mb-2">Informations financières</h4>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Montant d'acquisition:</span>
                            <span className="fw-bold">
                              {deviseOrigine !== 'CDF' 
                                ? `${montantDeviseOrigine.toLocaleString()} ${deviseOrigine} (soit ${formatCurrency(currentActif.cout_acquisition, 'CDF')})`
                                : formatCurrency(currentActif.cout_acquisition, 'CDF')}
                            </span>
                          </div>
                          {deviseOrigine !== 'CDF' && tauxChange && (
                            <div className="d-flex justify-content-between mt-2">
                              <span className="text-muted">Taux de change utilisé:</span>
                              <span className="fw-medium">1 {deviseOrigine} = {tauxChange.toLocaleString()} CDF</span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between mt-2">
                            <span className="text-muted">Numéro de facture:</span>
                            <span className="fw-medium">{currentActif.numero_facture || <em className="text-muted">Non renseigné</em>}</span>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Fournisseur</span>
                          <span className="fw-medium">{currentActif.fournisseur || 'Non renseigné'}</span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3">📊 Amortissement</h3>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Mode d'amortissement</span><span className="fw-medium">{currentActif.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Durée d'utilité</span><span className="fw-medium">{currentActif.duree_utile_ans || 0} ans</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Taux d'amortissement</span><span className="fw-medium">{currentActif.taux_amortissement ? `${currentActif.taux_amortissement}%` : `${(100 / (currentActif.duree_utile_ans || 1)).toFixed(2)}%`}</span></div>
                        <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Valeur résiduelle</span><span className="fw-medium">{formatCurrency(currentActif.valeur_residuelle || 0, 'CDF')}</span></div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="bg-light border-0">
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3">📈 Valeurs actuelles</h3>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Valeur brute</span>
                          <span className="fw-medium">
                            {deviseOrigine !== 'CDF' 
                              ? formatCurrency(montantDeviseOrigine, deviseOrigine)
                              : formatCurrency(currentActif.cout_acquisition, 'CDF')}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Amortissements cumulés</span>
                          <span className="fw-medium">
                            {deviseOrigine !== 'CDF' 
                              ? formatCurrency(convertCDFToDevise(amortissementsCumules, tauxChange), deviseOrigine)
                              : formatCurrency(amortissementsCumules, 'CDF')}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Valeur nette comptable</span>
                          <span className={`fw-bold text-${getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#10b981' ? 'success' : getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#f59e0b' ? 'warning' : 'danger'}`}>
                            {deviseOrigine !== 'CDF' 
                              ? formatCurrency(convertCDFToDevise(valeurNette, tauxChange), deviseOrigine)
                              : formatCurrency(valeurNette, 'CDF')}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Statut</span>
                          <Badge bg={getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#10b981' ? 'success' : getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#f59e0b' ? 'warning' : 'danger'}>
                            {getStatusText({...currentActif, valeur_nette: valeurNette})}
                          </Badge>
                        </div>
                        {deviseOrigine !== 'CDF' && (
                          <div className="mt-2 pt-2 border-top">
                            <small className="text-muted">* Taux de change: 1 {deviseOrigine} = {tauxChange.toLocaleString()} CDF</small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {currentActif.type_immobilisation === 'corporel' && (
                  <Card className="bg-light border-0 mt-4">
                    <Card.Body>
                      <h3 className="h6 fw-semibold mb-3">🖥️ Caractéristiques matérielles</h3>
                      <Row>
                        <Col md={3}><span className="text-muted">Marque</span><div className="fw-medium">{currentActif.marque || 'Non renseignée'}</div></Col>
                        <Col md={3}><span className="text-muted">Modèle</span><div className="fw-medium">{currentActif.modele || 'Non renseigné'}</div></Col>
                        <Col md={3}><span className="text-muted">Numéro de série</span><div className="fw-medium font-monospace">{currentActif.numero_serie || 'Non renseigné'}</div></Col>
                        <Col md={3}><span className="text-muted">État</span><div><Badge bg={currentActif.etat === 'neuf' ? 'success' : currentActif.etat === 'bon' ? 'info' : currentActif.etat === 'reparation' ? 'warning' : 'secondary'}>{getEtatLabel(currentActif.etat)}</Badge></div></Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {currentActif.type_immobilisation === 'incorporel' && (
                  <Card className="bg-light border-0 mt-4">
                    <Card.Body>
                      <h3 className="h6 fw-semibold mb-3">📜 Informations licence</h3>
                      <Row>
                        <Col md={4}><span className="text-muted">Date de validité</span><div className="fw-medium"><span className={new Date(currentActif.date_validite) < new Date() ? 'text-danger' : 'text-success'}>{formatDate(currentActif.date_validite)}{new Date(currentActif.date_validite) < new Date() && ' (Expiré)'}</span></div></Col>
                        <Col md={4}><span className="text-muted">Nombre d'utilisateurs</span><div><Badge bg="success">{currentActif.nombre_utilisateurs || 'Non spécifié'}</Badge></div></Col>
                        <Col md={4}><span className="text-muted">Support</span><div className="fw-medium">{currentActif.support || 'Non spécifié'}</div></Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                <Card className="bg-light border-0 mt-4">
                  <Card.Body>
                    <h3 className="h6 fw-semibold mb-3">📍 Informations complémentaires</h3>
                    <Row>
                      <Col md={3}><span className="text-muted">Localisation</span><div className="fw-medium">{currentActif.localisation || 'Non spécifiée'}</div></Col>
                      <Col md={3}><span className="text-muted">Affectation</span><div className="fw-medium">{currentActif.affectation || 'Non affecté'}</div></Col>
                      <Col md={3}><span className="text-muted">Compte comptable</span><div className="fw-medium font-monospace">{currentActif.compte_comptable || '205'}</div></Col>
                      {currentActif.date_sortie && <Col md={3}><span className="text-muted">Date de sortie</span><div className="fw-medium">{formatDate(currentActif.date_sortie)}</div></Col>}
                      {currentActif.type_sortie && <Col md={3}><span className="text-muted">Type de sortie</span><div className="fw-medium">{currentActif.type_sortie === 'cession' ? 'Cession' : currentActif.type_sortie === 'mise_au_rebut' ? 'Mise au rebut' : 'Don'}</div></Col>}
                    </Row>
                  </Card.Body>
                </Card>

                <div className="mt-4 pt-3 border-top d-flex gap-4 flex-wrap">
                  <small className="text-muted"><strong>Créé le:</strong> {formatDateTime(currentActif.created_at)}</small>
                  <small className="text-muted"><strong>Dernière modification:</strong> {formatDateTime(currentActif.updated_at)}</small>
                  <small className="text-muted"><strong>Créé par:</strong> {currentActif.created_by_name || 'Système'}</small>
                </div>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Tab Content - Amortissements avec devise d'origine */}
        {!isJuridique && activeTab === 'amortissements' && (
          <div className="black-text-section amortissements-section">
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                  <h2 className="h4 fw-semibold mb-0">Plan d'amortissement</h2>
                  {canRecalculAmort && (
                    <Button variant="primary" onClick={handleRecalculerAmortissements} disabled={recalculLoading}>
                      {recalculLoading ? <><Spinner as="span" size="sm" animation="border" className="me-2" /> Recalcul en cours...</> : <><FiRefreshCw className="me-1" /> Recalculer</>}
                    </Button>
                  )}
                </div>
                {recalculMessage.text && (
                  <Alert variant={recalculMessage.type === 'success' ? 'success' : 'danger'} className="mb-3">
                    {recalculMessage.text}
                  </Alert>
                )}
                
                {/* Affichage de la devise utilisée */}
                {deviseOrigine !== 'CDF' && (
                  <Alert variant="info" className="mb-3">
                    <small>📊 Les montants ci-dessous sont affichés en <strong>{deviseOrigine}</strong> (convertis depuis le CDF au taux de {tauxChange.toLocaleString()} CDF = 1 {deviseOrigine})</small>
                  </Alert>
                )}

                {amortissements.length === 0 ? (
                  <div className="text-center py-5 bg-light rounded-3">
                    <p className="text-muted">Aucun amortissement calculé pour cet actif</p>
                  </div>
                ) : (
                  <>
                    {/* Graphiques en CDF (toujours) */}
                    <AmortissementChart actif={currentActif} amortissements={amortissements} type="line" />
                    <AmortissementChart actif={currentActif} amortissements={amortissements} type="bar" />
                    <AmortissementChart actif={currentActif} amortissements={amortissements} type="pie" />
                    
                    <Row className="g-3 mt-3">
                      <Col md={6}>
                        <Card className="bg-light border-0">
                          <Card.Body>
                            <h3 className="h6 fw-semibold mb-3 text-center">Évolution de la valeur nette</h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={amortissements.map(amort => ({
                                ...amort,
                                valeur_nette_devise: convertCDFToDevise(amort.valeur_nette, tauxChange),
                                annuite_devise: convertCDFToDevise(amort.annuite, tauxChange)
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exercice" />
                                <YAxis tickFormatter={(v) => formatCurrency(v, deviseOrigine)} />
                                <Tooltip formatter={(value) => formatCurrency(value, deviseOrigine)} />
                                <Legend />
                                <Line type="monotone" dataKey="valeur_nette_devise" stroke="#2563eb" name={`Valeur nette (${deviseOrigine})`} strokeWidth={2} />
                                <Line type="monotone" dataKey="annuite_devise" stroke="#10b981" name={`Annuité (${deviseOrigine})`} strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card className="bg-light border-0">
                          <Card.Body>
                            <h3 className="h6 fw-semibold mb-3 text-center">Annuités par exercice</h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={amortissements.map(amort => ({
                                ...amort,
                                annuite_devise: convertCDFToDevise(amort.annuite, tauxChange)
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exercice" />
                                <YAxis tickFormatter={(v) => formatCurrency(v, deviseOrigine)} />
                                <Tooltip formatter={(value) => formatCurrency(value, deviseOrigine)} />
                                <Legend />
                                <Bar dataKey="annuite_devise" fill="#f59e0b" name={`Annuité (${deviseOrigine})`} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <h3 className="h6 fw-semibold mt-4 mb-3">Détail des amortissements</h3>
                    <div className="table-responsive">
                      <Table striped bordered hover>
                        <thead className="table-light">
                          <tr>
                            <th>Exercice</th>
                            <th>Annuité ({deviseOrigine})</th>
                            <th>Cumul ({deviseOrigine})</th>
                            <th>Valeur nette ({deviseOrigine})</th>
                            <th>Taux</th>
                            <th>Annuité (CDF)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amortissements.map((amort, index) => (
                            <tr key={index}>
                              <td>{amort.exercice || '-'}</td>
                              <td>{formatCurrency(convertCDFToDevise(amort.annuite, tauxChange), deviseOrigine)}</td>
                              <td>{formatCurrency(convertCDFToDevise(amort.cumul_amortissements, tauxChange), deviseOrigine)}</td>
                              <td className="fw-bold">{formatCurrency(convertCDFToDevise(amort.valeur_nette, tauxChange), deviseOrigine)}</td>
                              <td>{amort.taux || 0}%</td>
                              <td className="text-muted small">{formatCurrency(amort.annuite, 'CDF')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light fw-bold">
                          <tr>
                            <td>Total</td>
                            <td>{formatCurrency(convertCDFToDevise(calculerTotal(amortissements, 'annuite'), tauxChange), deviseOrigine)}</td>
                            <td>{formatCurrency(convertCDFToDevise(amortissements[amortissements.length - 1]?.cumul_amortissements || 0, tauxChange), deviseOrigine)}</td>
                            <td>{formatCurrency(convertCDFToDevise(amortissements[amortissements.length - 1]?.valeur_nette || 0, tauxChange), deviseOrigine)}</td>
                            <td>--</td>
                            <td className="text-muted small">{formatCurrency(calculerTotal(amortissements, 'annuite'), 'CDF')}</td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                    
                    {deviseOrigine !== 'CDF' && (
                      <div className="mt-3 p-2 bg-light rounded">
                        <small className="text-muted">Taux de change appliqué: 1 {deviseOrigine} = {tauxChange.toLocaleString()} CDF</small>
                      </div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Réévaluations */}
        {!isJuridique && activeTab === 'reevaluations' && canEdit && (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <ReevaluationsList actifId={id} canEdit={canEdit} />
            </Card.Body>
          </Card>
        )}

        {/* Contrats */}
        {activeTab === 'contrats' && canManageContracts && (
          <div className="black-text-section contrats-section">
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                  <h2 className="h4 fw-semibold mb-0">Contrats liés</h2>
                  {can(['admin', 'comptable', 'juridique']) && (
                    <Button variant="primary" onClick={() => { setShowContratForm(!showContratForm); if (!showContratForm) navigate(`/actifs/${id}/contrats/nouveau`); }}>
                      <FiPlus className="me-1" /> Nouveau contrat
                    </Button>
                  )}
                </div>
                {showContratForm && (
                  <Card className="bg-light mb-4">
                    <Card.Body>
                      <h3 className="h6 fw-semibold mb-3">Ajouter un contrat</h3>
                      <div className="d-flex gap-3 justify-content-end">
                        <Button variant="success">Enregistrer</Button>
                        <Button variant="secondary" onClick={() => setShowContratForm(false)}>Annuler</Button>
                      </div>
                    </Card.Body>
                  </Card>
                )}
                {contrats.length === 0 && !showContratForm ? (
                  <div className="text-center py-5 bg-light rounded-3">
                    <p className="text-muted">Aucun contrat associé à cet actif</p>
                  </div>
                ) : contrats.length > 0 && (
                  <Table striped bordered hover responsive>
                    <thead className="table-light">
                      <tr>
                        <th>Nom du contrat</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Montant</th><th>Statut</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contrats.map((contrat, index) => (
                        <tr key={contrat.id || index}>
                          <td>{contrat.nom || contrat.numero_contrat}</td>
                          <td>{contrat.type || 'Licence'}</td>
                          <td>{formatDate(contrat.date_debut)}</td>
                          <td>{formatDate(contrat.date_fin)}</td>
                          <td>{formatCurrency(contrat.montant, 'CDF')}</td>
                          <td><Badge bg={new Date(contrat.date_fin) > new Date() ? 'success' : 'danger'}>{new Date(contrat.date_fin) > new Date() ? 'Actif' : 'Expiré'}</Badge></td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button size="sm" variant="primary" onClick={() => navigate(`/contrats/${contrat.id}`)}><FiEye /></Button>
                              {can(['admin', 'comptable', 'juridique']) && (
                                <Button size="sm" variant="warning" onClick={() => navigate(`/contrats/modifier/${contrat.id}`)}><FiEdit /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Dépréciations */}
        {!isJuridique && activeTab === 'depreciations' && canManageDepreciations && (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <DepreciationsList actifId={id} canEdit={canManageDepreciations} />
            </Card.Body>
          </Card>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <DocumentList onRefresh={handleRefresh} />
            </Card.Body>
          </Card>
        )}

        {/* Audit */}
        {!isJuridique && activeTab === 'audit' && canViewAudit && (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <h2 className="h4 fw-semibold mb-0">📋 Historique des modifications</h2>
                <Badge bg="secondary" className="px-3 py-2"><FiActivity className="me-1" /> {auditLogs.length} événement(s)</Badge>
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3">
                  <FiFileText size={48} className="text-muted mb-2" />
                  <p className="text-muted">Aucun historique trouvé pour cet actif</p>
                </div>
              ) : (
                <div className="vstack gap-3">
                  {auditLogs.map((log, index) => {
                    const isExpanded = expandedAuditId === log.id;
                    const actionColor = getActionColor(log.action);
                    return (
                      <div key={log.id || index} className="d-flex gap-3">
                        <div className="d-flex flex-column align-items-center" style={{ width: '24px' }}>
                          <div className="rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: actionColor }} />
                          {index < auditLogs.length - 1 && <div className="flex-grow-1" style={{ width: '2px', backgroundColor: '#e2e8f0', marginTop: '4px', minHeight: '40px' }} />}
                        </div>
                        <div className="flex-grow-1">
                          <Card className={`border-0 shadow-sm ${isExpanded ? 'border-primary' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleAuditDetails(log.id)}>
                            <Card.Body className="p-3">
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                                <Badge style={{ backgroundColor: actionColor + '20', color: actionColor, border: 'none' }} className="px-3 py-2 d-inline-flex align-items-center gap-2">
                                  {getActionIcon(log.action)} {getActionLabel(log.action)}
                                </Badge>
                                <div className="d-flex gap-3">
                                  <Badge bg="light" text="dark" className="d-flex align-items-center gap-1"><FiDatabase size={12} /> {getTableLabel(log.table_name)}</Badge>
                                  <small className="text-muted d-flex align-items-center gap-1"><FiClock size={12} /> {formatDateTime(log.action_date || log.created_at)}</small>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: '32px', height: '32px' }}>
                                    {log.utilisateur?.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <div className="fw-semibold small">{log.utilisateur?.full_name || 'Système'}</div>
                                    <small className="text-muted">{log.utilisateur?.email || 'system@bcc.cd'}</small>
                                  </div>
                                </div>
                                <div className="text-end">
                                  <small className="text-muted text-uppercase">ID enregistrement</small>
                                  <div><code className="small bg-light px-2 py-1 rounded">{log.record_id}</code></div>
                                  {log.ip_address && <small className="text-muted d-flex align-items-center gap-1 mt-1"><FiActivity size={10} /> {log.ip_address}</small>}
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-top text-center">
                                <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                                  {isExpanded ? <><FiChevronUp size={14} /> Masquer les détails</> : <><FiChevronDown size={14} /> Afficher les détails</>}
                                </small>
                              </div>
                            </Card.Body>
                          </Card>
                          {isExpanded && (
                            <Card className="mt-2 bg-light border-0">
                              <Card.Body className="p-3 audit-details-content">
                                {log.old_data && log.new_data && (
                                  <div className="bg-white rounded-3 border">
                                    <div className="p-2 bg-light border-bottom d-flex align-items-center gap-2"><FiInfo size={14} /><span className="fw-semibold small">Modifications détectées</span></div>
                                    <div className="p-2 vstack gap-2">
                                      {Object.keys(log.new_data).map(key => {
                                        const oldVal = log.old_data[key];
                                        const newVal = log.new_data[key];
                                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                          return (
                                            <div key={key} className="d-flex align-items-baseline gap-3 flex-wrap p-2 bg-light rounded-3">
                                              <div className="fw-semibold font-monospace small bg-white px-2 py-1 rounded" style={{ minWidth: '120px' }}>{key}</div>
                                              <div className="d-flex align-items-center gap-3 flex-wrap">
                                                <span className="small bg-danger bg-opacity-10 text-danger px-2 py-1 rounded">{oldVal !== undefined && oldVal !== null ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : <em>null</em>}</span>
                                                <span className="text-muted">→</span>
                                                <span className="small bg-success bg-opacity-10 text-success px-2 py-1 rounded">{newVal !== undefined && newVal !== null ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : <em>null</em>}</span>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                )}
                                {!log.old_data && log.new_data && (
                                  <div className="bg-white rounded-3 border">
                                    <div className="p-2 bg-success bg-opacity-10 border-bottom d-flex align-items-center gap-2"><FiPlus size={14} className="text-success" /><span className="fw-semibold small text-success">Nouvel enregistrement créé</span></div>
                                    <div className="p-2">{formatAuditData(log.new_data, 'new')}</div>
                                  </div>
                                )}
                                {log.old_data && !log.new_data && (
                                  <div className="bg-white rounded-3 border">
                                    <div className="p-2 bg-danger bg-opacity-10 border-bottom d-flex align-items-center gap-2"><FiTrash2 size={14} className="text-danger" /><span className="fw-semibold small text-danger">Enregistrement supprimé</span></div>
                                    <div className="p-2">{formatAuditData(log.old_data, 'old')}</div>
                                  </div>
                                )}
                                {!log.old_data && !log.new_data && (
                                  <div className="bg-warning bg-opacity-10 rounded-3 p-3 text-center">
                                    <FiInfo size={14} className="text-warning me-2" /><span>Aucune donnée détaillée disponible pour cette action</span>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Historique */}
        {activeTab === 'historique' && (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <MouvementsList onRefresh={handleRefresh} />
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
};

export default ActifDetail;