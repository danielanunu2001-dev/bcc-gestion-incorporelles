import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActifById } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import actifService from '../../services/actifService';
import api from '../../services/api';
import aiService from '../../services/aiService';
import { QRCodeCanvas } from 'qrcode.react';
import MouvementsList from '../../components/Mouvements/MouvementsList';
import ReevaluationsList from '../../components/Reevaluations/ReevaluationsList';
import DocumentList from '../../components/Documents/DocumentList';
import DepreciationsList from '../../components/Depreciations/DepreciationsList';
import {
  FiArrowLeft, FiEdit, FiFileText, FiCalendar,
  FiDollarSign, FiTag, FiClock, FiRefreshCw,
  FiDownload, FiEye, FiTrash2, FiPlus, FiInfo,
  FiTrendingDown, FiTrendingUp, FiMaximize2,
  FiFile, FiActivity, FiFileText as FiInvoice,
  FiChevronDown, FiChevronUp, FiDatabase, FiPackage,
  FiSend, FiX, FiAlertCircle
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Badge, Card, Container, Row, Col, Nav, Tab, Modal, Spinner, Table, Alert, Form } from 'react-bootstrap';

// ==================== CONSTANTES ====================
const TYPE_LABELS = {
  logiciel: 'Logiciel', brevet: 'Brevet', licence: 'Licence',
  fonds_commercial: 'Fonds commercial', materiel: 'Materiel',
  vehicule: 'Vehicule', bâtiment: 'Batiment', terrain: 'Terrain', autres: 'Autres'
};

const ETAT_LABELS = {
  neuf: 'Neuf', bon: 'Bon etat', reparation: 'En réparation', hors_service: 'Hors service'
};

const ACTION_LABELS = {
  CREATE: 'Creation', UPDATE: 'Modification', DELETE: 'Suppression',
  RECALCUL: 'Recalcul amortissements', DEPRECIATION: 'Test de dépréciation', SORTIE: 'Sortie'
};

const ACTION_COLORS = {
  CREATE: '#10b981', UPDATE: '#f59e0b', DELETE: '#ef4444',
  RECALCUL: '#3b82f6', DEPRECIATION: '#8b5cf6', SORTIE: '#64748b'
};

const TABLE_LABELS = {
  actifs: 'Actifs', users: 'Utilisateurs', contrats: 'Contrats',
  reevaluations: 'Reevaluations', depreciations: 'Depreciations',
  mouvements: 'Mouvements', documents: 'Documents'
};

// ==================== FONCTIONS UTILITAIRES DE SÉCURISATION ====================

const safeString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.map(safeString).join(', ');
  if (typeof value === 'object') {
    if (value.point !== undefined) {
      return `${value.point || ''} ${value.justification || ''}`.trim();
    }
    if (value.message) return value.message;
    if (value.msg) return value.msg;
    try {
      return JSON.stringify(value);
    } catch (e) {
      return 'Objet complexe';
    }
  }
  return String(value);
};

const cleanNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    let cleaned = value
      .replace(/\s*\/\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[^\d.,-]/g, '')
      .replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatCurrency = (value) => {
  const num = cleanNumber(value);
  if (num === 0) return '0 FC';
  return Math.round(num).toLocaleString() + ' FC';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleDateString('fr-FR'); } catch { return 'Date invalide'; }
};

// Fonction pour l'heure locale EXACTE de l'ordinateur (pour l'audit)
const formatLocalDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return 'Date invalide';
  }
};

const getTypeLabel = (type) => TYPE_LABELS[type] || type || 'N/A';
const getActionLabel = (action) => ACTION_LABELS[action] || action || 'Action';
const getActionColor = (action) => ACTION_COLORS[action] || '#64748b';
const getTableLabel = (table) => TABLE_LABELS[table] || table || table;

const getStatusColor = (act) => {
  if (!act?.actif) return '#dc2626';
  const valeurNette = act.valeur_nette || act.cout_acquisition || 0;
  if (valeurNette <= (act.valeur_residuelle || 0)) return '#f59e0b';
  return '#10b981';
};

const getStatusText = (act) => {
  if (!act?.actif) return 'Inactif';
  const valeurNette = act.valeur_nette || act.cout_acquisition || 0;
  if (valeurNette <= (act.valeur_residuelle || 0)) return 'Amorti';
  return 'Actif';
};

const getActionIcon = (action) => {
  const icons = {
    CREATE: <FiPlus size={12} />, UPDATE: <FiEdit size={12} />, DELETE: <FiTrash2 size={12} />,
    RECALCUL: <FiRefreshCw size={12} />, DEPRECIATION: <FiTrendingDown size={12} />, SORTIE: <FiPackage size={12} />
  };
  return icons[action] || <FiActivity size={12} />;
};

const calculerTotal = (arr, field) => {
  if (!arr || !Array.isArray(arr)) return 0;
  return arr.reduce((s, a) => s + (cleanNumber(a[field]) || 0), 0);
};

// ==================== STYLES MODERNES ====================
const modernStyles = `
  :root { --bg-page: #f8fafc; --bg-card: #ffffff; --text-primary: #0f172a; --text-secondary: #334155; --border: #e2e8f0; --radius: 0.75rem; }
  body { background-color: var(--bg-page) !important; }
  .card-modern { background: var(--bg-card) !important; border: 1px solid var(--border) !important; border-radius: var(--radius) !important; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); transition: all 0.2s ease; }
  .card-modern:hover { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transform: translateY(-1px); }
  .table-modern { width: 100%; border-collapse: collapse; }
  .table-modern th { background: #f1f5f9; color: var(--text-primary); font-weight: 600; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
  .table-modern td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: var(--text-secondary); }
  .table-modern tr:hover td { background: #fafcff; }
  .btn-modern { border-radius: 8px; padding: 0.4rem 0.9rem; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; }
  .badge-modern { padding: 0.25rem 0.6rem; border-radius: 20px; font-weight: 500; font-size: 0.7rem; }
  .tab-modern .nav-link { color: var(--text-secondary); border: none; padding: 0.7rem 1rem; font-weight: 500; transition: all 0.2s; }
  .tab-modern .nav-link.active { color: #3b82f6; background: transparent; border-bottom: 2px solid #3b82f6; }
  .icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #eff6ff; color: #3b82f6; }
  .text-secondary-custom { color: var(--text-secondary) !important; }
  .animated-pulse { animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
  .audit-card { background: #1e293b !important; border: 1px solid #334155 !important; color: #ffffff !important; }
  .audit-card .card-body, .audit-card .card-header, .audit-card .border-bottom, .audit-card .text-muted, .audit-card small, .audit-card strong, .audit-card span, .audit-card div, .audit-card p { color: #ffffff !important; background-color: transparent !important; }
  .audit-old-value { background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); color: #fecaca !important; padding: 0.25rem 0.75rem; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 0.8rem; }
  .audit-new-value { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #a7f3d0 !important; padding: 0.25rem 0.75rem; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 0.8rem; }
  .audit-arrow { font-size: 1rem; font-weight: bold; margin: 0 0.5rem; color: #fbbf24; }
  .audit-field-name { font-weight: 700; color: #fcd34d !important; background: rgba(0,0,0,0.4); padding: 0.2rem 0.6rem; border-radius: 6px; font-family: monospace; font-size: 0.75rem; }
  .audit-create-badge { background: linear-gradient(135deg, #059669 0%, #047857 100%) !important; color: #a7f3d0 !important; }
  .audit-update-badge { background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important; color: #fed7aa !important; }
  .audit-delete-badge { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important; color: #fecaca !important; }
  .pdf-viewer-container { width: 100%; height: 100%; position: relative; background: #f1f5f9; }
  .pdf-embed { width: 100%; height: 100%; border: none; }
  
  /* ✅ STYLES POUR LA SECTION RÉÉVALUATIONS - TOUT EN BLANC */
  .reevaluation-white-text,
  .reevaluation-white-text *,
  .reevaluation-white-text .card-title,
  .reevaluation-white-text .card-body,
  .reevaluation-white-text p,
  .reevaluation-white-text span,
  .reevaluation-white-text div,
  .reevaluation-white-text h1,
  .reevaluation-white-text h2,
  .reevaluation-white-text h3,
  .reevaluation-white-text h4,
  .reevaluation-white-text h5,
  .reevaluation-white-text h6,
  .reevaluation-white-text strong,
  .reevaluation-white-text small,
  .reevaluation-white-text .text-muted,
  .reevaluation-white-text .fw-semibold,
  .reevaluation-white-text .badge {
    color: #ffffff !important;
  }
  
  .reevaluation-card {
    background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85)) !important;
    backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(0, 255, 247, 0.2) !important;
  }
  
  .reevaluation-card .border-bottom {
    border-bottom-color: rgba(0, 255, 247, 0.15) !important;
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
  
  // États
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantHistorique, setAssistantHistorique] = useState([]);
  const [assistantError, setAssistantError] = useState('');
  const [analyseIALoading, setAnalyseIALoading] = useState(false);
  const [analyseIAResultat, setAnalyseIAResultat] = useState(null);
  const [actif, setActif] = useState(null);
  const [amortissements, setAmortissements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [facture, setFacture] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(`actif_${id}_activeTab`);
    const validTabs = ['infos', 'amortissements', 'reevaluations', 'contrats', 'depreciations', 'documents', 'audit'];
    return savedTab && validTabs.includes(savedTab) ? savedTab : 'infos';
  });
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

  // Effets
  useEffect(() => {
    if (!canView && !loading) {
      setError('Accès non autorisé');
      setTimeout(() => navigate('/actifs'), 2000);
    }
  }, [canView, loading, navigate]);

  useEffect(() => {
    if (activeTab && id) localStorage.setItem(`actif_${id}_activeTab`, activeTab);
  }, [activeTab, id]);

  const currentActif = actif || actifCourant;
  const dernierAmort = amortissements[amortissements.length - 1];
  const valeurNette = dernierAmort?.valeur_nette || currentActif?.cout_acquisition || 0;
  const amortissementsCumules = dernierAmort?.cumul_amortissements || 0;
  const deviseOrigine = currentActif?.devise?.code || 'CDF';
  const tauxChange = currentActif?.taux_change_utilisation || 1;
  const montantDeviseOrigine = currentActif?.montant_devise || cleanNumber(currentActif?.cout_acquisition) / tauxChange;

  // Assistant IA
  const handleAssistantAsk = async () => {
    if (!assistantQuestion.trim()) return;
    setAssistantLoading(true);
    setAssistantError('');
    const newHistorique = [...assistantHistorique, { role: 'user', content: assistantQuestion }];
    setAssistantHistorique(newHistorique);
    try {
      const response = await aiService.askAssistant(assistantQuestion, id);
      const reponseIA = response.reponse || "Je n'ai pas pu traiter votre demande.";
      setAssistantHistorique([...newHistorique, { role: 'assistant', content: safeString(reponseIA) }]);
      setAssistantQuestion('');
    } catch (err) {
      setAssistantError(safeString(err.response?.data?.message || 'Erreur de communication'));
    } finally {
      setAssistantLoading(false);
    }
  };

  // Analyse IA
  const handleAnalyseIA = async () => {
  if (!id || !currentActif || amortissements.length === 0) {
    setAnalyseIAResultat({
      est_coherent: false,
      anomalies: ["Données insuffisantes pour l'analyse"],
      taux_moyen: "N/A",
      recommandations: ["Veuillez vérifier que l'actif a des amortissements calculés"],
      resume: "Analyse impossible"
    });
    return;
  }
  setAnalyseIALoading(true);
  try {
    const response = await aiService.analyserActif(id);
    console.log('📊 Analyse IA reçue:', response);
    
    // ✅ Adapter la réponse du backend au format attendu par l'affichage
    setAnalyseIAResultat({
      est_coherent: (response.score_sante || 0) >= 70,
      anomalies: response.anomalies_detectees?.map(a => `${a.type}: ${a.message} (${a.severity})`) || [],
      taux_moyen: `${currentActif.taux_amortissement || 0}%`,
      recommandations: response.recommandations || [],
      resume: response.resume || `Score de santé: ${response.score_sante || 0}% - Niveau de risque: ${response.niveau_risque || 'non déterminé'}`
    });
  } catch (error) {
    console.error('Erreur analyse IA:', error);
    setAnalyseIAResultat({
      est_coherent: false,
      anomalies: ["Erreur de connexion avec le service IA", error.response?.data?.message || error.message],
      taux_moyen: "N/A",
      recommandations: ["Vérifiez votre connexion internet", "Réessayez plus tard", "Contactez l'administrateur"],
      resume: "Analyse temporairement indisponible"
    });
  } finally {
    setAnalyseIALoading(false);
  }
};

  // Chargement des données
  const chargerDonnees = useCallback(async () => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);
      const actifData = await actifService.getById(id);
      setActif(actifData);
      if (!isJuridique) {
        try { const amortData = await actifService.getAmortissements(id); setAmortissements(amortData || []); } catch (e) { console.warn(e); }
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError(safeString(err));
    } finally { setLoading(false); }
  }, [id, isJuridique]);

  const fetchContrats = useCallback(async () => {
    if (!id) return;
    try { const res = await api.get(`/actifs/${id}/contrats`); setContrats(res.data || []); } catch (e) { setContrats([]); }
  }, [id]);

  const fetchDepreciations = useCallback(async () => {
    if (!id || isJuridique) return;
    try { const res = await api.get(`/actifs/${id}/depreciations`); setDepreciations(res.data || []); } catch (e) { setDepreciations([]); }
  }, [id, isJuridique]);

  const fetchAuditLogs = useCallback(async () => {
    if (!id || !canViewAudit || isJuridique) return;
    try {
      const response = await api.get(`/audit-logs/actif/${id}`);
      const logs = Array.isArray(response.data) ? response.data : response.data?.logs || [];
      setAuditLogs(logs);
    } catch (error) { setAuditLogs([]); }
  }, [id, canViewAudit, isJuridique]);

  const fetchFacture = useCallback(async () => {
    if (!id || isJuridique) return;
    try { const response = await api.get(`/actifs/${id}/facture`); setFacture(response.data); } catch { setFacture(null); }
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
  }, [id]);

  // Recalcul amortissements
  const handleRecalculerAmortissements = async () => {
    if (!id || isJuridique) return;
    setRecalculLoading(true);
    try {
      await api.post(`/actifs/${id}/recalculer`);
      const amortData = await actifService.getAmortissements(id);
      setAmortissements(amortData);
      setRecalculMessage({ type: 'success', text: 'Amortissements recalculés avec succès !' });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setRecalculMessage({ type: 'error', text: 'Erreur lors du recalcul' });
      setTimeout(() => setRecalculMessage({ type: '', text: '' }), 3000);
    } finally { setRecalculLoading(false); }
  };

  // Création dépréciation
  const handleCreateDepreciation = async (e) => {
    e.preventDefault();
    if (!id || isJuridique) return;
    try {
      await api.post(`/actifs/${id}/depreciations`, depreciationForm);
      setShowDepreciationModal(false);
      fetchDepreciations();
      setDepreciationForm({
        date_test: new Date().toISOString().split('T')[0],
        valeur_recouvrable: '',
        commentaire: ''
      });
    } catch (err) { console.error('Erreur:', err); }
  };

  // Facture
  const handleViewFacture = async () => {
    if (!id || isJuridique) return;
    setLoadingFacturePdf(true);
    try {
      const timestamp = Date.now();
      const response = await api.get(`/actifs/${id}/facture/download?t=${timestamp}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setFacturePdfUrl(url);
      setShowFactureModal(true);
    } catch { alert('Impossible de charger la facture.'); } 
    finally { setLoadingFacturePdf(false); }
  };

  const handleDownloadFacture = async () => {
    if (!id || isJuridique) return;
    setDownloadingFacture(true);
    try {
      const timestamp = Date.now();
      const response = await api.get(`/actifs/${id}/facture/download?t=${timestamp}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture_${id}_${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Impossible de télécharger la facture.'); } 
    finally { setDownloadingFacture(false); }
  };

  const getFactureDetails = () => {
    if (!facture) return null;
    
    let ht = cleanNumber(facture.montant_ht);
    let tva = cleanNumber(facture.montant_tva);
    let ttc = cleanNumber(facture.montant_ttc);
    let devise = facture.devise || 'CDF';
    let numero = facture.numero_facture || 'Non spécifié';
    let date = facture.date_emission;
    
    if (ht > 0) {
      if (tva === 0) tva = Math.round(ht * 0.16);
      ttc = ht + tva;
    }
    else if (ttc > 0 && ht === 0) {
      ht = Math.round(ttc / 1.16);
      tva = ttc - ht;
    }
    
    return { 
      ht: Math.round(ht), 
      tva: Math.round(tva), 
      ttc: Math.round(ttc), 
      devise, 
      numero, 
      date 
    };
  };

  const factureDetails = facture ? getFactureDetails() : null;

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR Code - ${currentActif?.code}</title>
      <style>body{display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial}</style></head>
      <body><div><img src="${document.getElementById('qr-code-canvas')?.toDataURL()}" /><div>${currentActif?.numero_inventaire || currentActif?.code}</div></div><script>window.print();</script></body></html>
    `);
    printWindow.document.close();
  };

  const handleGoBack = () => navigate(-1);
  const handleEdit = () => navigate(`/actifs/modifier/${id}`);
  const handleRefresh = () => { chargerDonnees(); fetchContrats(); fetchDepreciations(); fetchAuditLogs(); fetchFacture(); };
  const toggleAuditDetails = (auditId) => setExpandedAuditId(prev => prev === auditId ? null : auditId);

  const formatAuditDataVisual = (data) => {
    if (!data || typeof data !== 'object') return null;
    const entries = Object.entries(data);
    if (entries.length === 0) return null;
    return (
      <div className="audit-values-container">
        {entries.map(([key, value]) => (
          <div key={key} className="audit-value-item">
            <div className="audit-value-key">{safeString(key)}</div>
            <div className="audit-value-text">{safeString(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || reduxLoading) {
    return (
      <Container className="py-5 text-center" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
        <p className="text-muted">Chargement...</p>
      </Container>
    );
  }

  if (error || !currentActif) {
    return (
      <Container className="py-5" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Card className="text-center p-5 border-danger bg-white shadow-sm">
          <FiInfo size={48} className="text-danger mx-auto mb-3" />
          <p className="text-danger fw-semibold">{safeString(error) || 'Actif non trouvé'}</p>
          <Button variant="primary" onClick={handleGoBack} className="mx-auto"><FiArrowLeft /> Retour</Button>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <style>{modernStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        
        {/* Assistant IA */}
        {!isAssistantOpen && (
          <Button className="position-fixed rounded-circle shadow-lg animated-pulse" style={{ bottom: '20px', left: '20px', width: '56px', height: '56px', zIndex: 1000, backgroundColor: '#1e293b', border: 'none' }} onClick={() => setIsAssistantOpen(true)}>
            <GiArtificialIntelligence size={28} color="#fff" />
          </Button>
        )}
        {isAssistantOpen && (
          <Card className="position-fixed shadow-lg border-0" style={{ bottom: '20px', left: '20px', width: '400px', maxWidth: 'calc(100vw - 40px)', height: '550px', zIndex: 1001, display: 'flex', flexDirection: 'column', borderRadius: '16px', backgroundColor: '#0f0f0f' }}>
            <Card.Header className="d-flex justify-content-between align-items-center" style={{ background: '#1e293b' }}>
              <div className="d-flex align-items-center gap-2"><GiArtificialIntelligence className="text-white" /><strong className="text-white">Assistant IA</strong></div>
              <Button variant="link" className="text-white p-0" onClick={() => setIsAssistantOpen(false)}><FiX size={20} /></Button>
            </Card.Header>
            <Card.Body style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f0f0f' }}>
              {currentActif && <Alert variant="dark" className="small py-1 px-2 mb-3" style={{ backgroundColor: '#1a1a2e', color: '#ccc' }}>Actif: <strong>{currentActif.code}</strong> - {currentActif.nom}</Alert>}
              {assistantHistorique.map((msg, idx) => (
                <div key={idx} className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded-3 ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'}`} style={{ maxWidth: '85%' }}>
                    <small className="text-white-50">{msg.role === 'user' ? 'Vous' : 'IA'}</small>
                    <div className="small mt-1 text-white">{safeString(msg.content)}</div>
                  </div>
                </div>
              ))}
              {assistantLoading && <div className="text-center my-3"><Spinner size="sm" animation="border" variant="light" /><span className="ms-2 small text-white-50">Réflexion...</span></div>}
              {assistantError && <Alert variant="danger" className="mt-2 small">{safeString(assistantError)}</Alert>}
            </Card.Body>
            <Card.Footer className="border-top" style={{ backgroundColor: '#0f0f0f' }}>
              <div className="d-flex gap-2">
                <Form.Control type="text" placeholder="Posez votre question..." value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAssistantAsk()} disabled={assistantLoading} size="sm" style={{ backgroundColor: '#1a1a2e', color: '#fff', border: '1px solid #333' }} />
                <Button variant="primary" onClick={handleAssistantAsk} disabled={assistantLoading || !assistantQuestion.trim()} size="sm"><FiSend /></Button>
              </div>
            </Card.Footer>
          </Card>
        )}

        {/* Header */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div className="d-flex gap-3 align-items-center">
            <Button variant="outline-secondary" onClick={handleGoBack} className="btn-modern"><FiArrowLeft size={18} /> Retour</Button>
            <div>
              <h1 className="h3 fw-bold mb-1">{currentActif.code} - {safeString(currentActif.nom)}</h1>
              <div className="d-flex gap-2 mt-1">
                <Badge bg={getStatusColor({...currentActif, valeur_nette: valeurNette}) === '#10b981' ? 'success' : 'warning'} className="badge-modern">
                  {getStatusText({...currentActif, valeur_nette: valeurNette})}
                </Badge>
                <span className="text-secondary-custom small">{getTypeLabel(currentActif.type)}</span>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-secondary" onClick={handleRefresh} className="btn-modern"><FiRefreshCw size={14} /></Button>
            <Button variant="outline-secondary" onClick={() => setShowQRModal(true)} className="btn-modern"><FiMaximize2 size={14} /></Button>
            {!isJuridique && facture && (
              <>
                <Button variant="success" onClick={handleViewFacture} disabled={loadingFacturePdf} className="btn-modern"><FiEye size={14} /> Voir facture</Button>
                <Button variant="warning" onClick={handleDownloadFacture} disabled={downloadingFacture} className="btn-modern"><FiDownload size={14} /> PDF</Button>
              </>
            )}
            {canEdit && <Button variant="primary" onClick={handleEdit} className="btn-modern"><FiEdit size={14} /> Modifier</Button>}
          </div>
        </div>

        {/* Facture associée */}
        {!isJuridique && factureDetails && factureDetails.ht > 0 && (
          <Card className="card-modern mb-4">
            <Card.Body className="p-3">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div className="d-flex gap-3">
                  <div className="icon-circle"><FiInvoice size={20} /></div>
                  <div>
                    <h6 className="mb-1 fw-semibold">Facture associée</h6>
                    <div className="d-flex gap-3 small text-secondary-custom">
                      <span>N° {safeString(factureDetails.numero)}</span>
                      {factureDetails.date && <span>Date: {formatDate(factureDetails.date)}</span>}
                    </div>
                    <div className="mt-2 pt-1 border-top">
                      <div className="d-flex flex-wrap gap-3 mt-2">
                        <div><small>HT</small><br/><strong>{formatCurrency(factureDetails.ht)}</strong></div>
                        <div><small>TVA (16%)</small><br/><strong>{formatCurrency(factureDetails.tva)}</strong></div>
                        <div><small>TOTAL TTC</small><br/><strong className="text-success">{formatCurrency(factureDetails.ttc)}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Modals */}
        <Modal show={showFactureModal} onHide={() => { if (facturePdfUrl) window.URL.revokeObjectURL(facturePdfUrl); setShowFactureModal(false); }} size="xl" fullscreen>
          <Modal.Header closeButton><Modal.Title>Facture - {currentActif.code}</Modal.Title></Modal.Header>
          <Modal.Body style={{ height: 'calc(100vh - 120px)', padding: 0 }}>
            {facturePdfUrl && <embed src={facturePdfUrl} type="application/pdf" style={{ width: '100%', height: '100%', border: 'none' }} />}
          </Modal.Body>
        </Modal>

        <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>QR Code - {currentActif.code}</Modal.Title></Modal.Header>
          <Modal.Body className="text-center">
            <div id="qr-code-canvas"><QRCodeCanvas value={currentActif.numero_inventaire || currentActif.code} size={256} level="H" /></div>
            <p className="mt-3 font-monospace">{currentActif.numero_inventaire || currentActif.code}</p>
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowQRModal(false)}>Fermer</Button><Button variant="primary" onClick={handlePrintQR}>Imprimer</Button></Modal.Footer>
        </Modal>

        <Modal show={showDepreciationModal} onHide={() => setShowDepreciationModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Test de dépréciation</Modal.Title></Modal.Header>
          <form onSubmit={handleCreateDepreciation}>
            <Modal.Body>
              <div className="mb-3"><label>Date du test</label><input type="date" className="form-control" value={depreciationForm.date_test} onChange={(e) => setDepreciationForm({...depreciationForm, date_test: e.target.value})} required /></div>
              <div className="mb-3"><label>Valeur recouvrable</label><input type="number" className="form-control" value={depreciationForm.valeur_recouvrable} onChange={(e) => setDepreciationForm({...depreciationForm, valeur_recouvrable: e.target.value})} required /></div>
              <div className="mb-3"><label>Commentaire</label><textarea className="form-control" rows="3" value={depreciationForm.commentaire} onChange={(e) => setDepreciationForm({...depreciationForm, commentaire: e.target.value})} /></div>
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" onClick={() => setShowDepreciationModal(false)}>Annuler</Button><Button variant="primary" type="submit">Enregistrer</Button></Modal.Footer>
          </form>
        </Modal>

        {/* Tabs */}
        <Card className="card-modern mb-4">
          <Card.Body className="p-0">
            <Nav variant="tabs" defaultActiveKey="infos" className="px-3 pt-2 tab-modern">
              <Nav.Item><Nav.Link onClick={() => setActiveTab('infos')}><FiFileText size={14} className="me-1" /> Informations</Nav.Link></Nav.Item>
              {!isJuridique && (
                <Nav.Item><Nav.Link onClick={() => setActiveTab('amortissements')}><FiCalendar size={14} className="me-1" /> Amortissements</Nav.Link></Nav.Item>
              )}
              {!isJuridique && canEdit && (
                <Nav.Item><Nav.Link onClick={() => setActiveTab('reevaluations')}><FiTrendingUp size={14} className="me-1" /> Réévaluations</Nav.Link></Nav.Item>
              )}
              {canManageContracts && (
                <Nav.Item><Nav.Link onClick={() => setActiveTab('contrats')}><FiFile size={14} className="me-1" /> Contrats ({contrats.length})</Nav.Link></Nav.Item>
              )}
              {!isJuridique && canManageDepreciations && (
                <Nav.Item><Nav.Link onClick={() => setActiveTab('depreciations')}><FiTrendingDown size={14} className="me-1" /> Dépréciations</Nav.Link></Nav.Item>
              )}
              <Nav.Item><Nav.Link onClick={() => setActiveTab('documents')}><FiFile size={14} className="me-1" /> Documents</Nav.Link></Nav.Item>
              {!isJuridique && canViewAudit && (
                <Nav.Item><Nav.Link onClick={() => setActiveTab('audit')}><FiActivity size={14} className="me-1" /> Audit ({auditLogs.length})</Nav.Link></Nav.Item>
              )}
            </Nav>
          </Card.Body>
        </Card>

        {/* Onglet Informations */}
        {activeTab === 'infos' && (
          <Card className="card-modern">
            <Card.Body className="p-4">
              <Row className="g-4">
                <Col md={6}>
                  <div className="border rounded-3 p-3 h-100">
                    <h6 className="fw-semibold mb-3">Informations générales</h6>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Code</span><span>{safeString(currentActif.code)}</span></div>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Nom</span><span>{safeString(currentActif.nom)}</span></div>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Type</span><span>{getTypeLabel(currentActif.type)}</span></div>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Immobilisation</span><span>{currentActif.type_immobilisation === 'corporel' ? 'Corporel' : 'Incorporel'}</span></div>
                    <div className="d-flex justify-content-between py-2"><span className="text-secondary-custom">N° inventaire</span><span>{safeString(currentActif.numero_inventaire) || 'N/A'}</span></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="border rounded-3 p-3 h-100">
                    <h6 className="fw-semibold mb-3">Acquisition</h6>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Date</span><span>{formatDate(currentActif.date_acquisition)}</span></div>
                    <div className="bg-light rounded-3 p-3 my-2">
                      <div className="d-flex justify-content-between"><span className="text-secondary-custom">Montant d'acquisition</span><strong className="text-success">{formatCurrency(currentActif.cout_acquisition)}</strong></div>
                      {deviseOrigine !== 'CDF' && montantDeviseOrigine && (
                        <div className="d-flex justify-content-between mt-1"><small>(Soit {Math.round(montantDeviseOrigine).toLocaleString()} {safeString(deviseOrigine)})</small></div>
                      )}
                      <div className="d-flex justify-content-between mt-2"><span className="text-secondary-custom">Fournisseur</span><span>{safeString(currentActif.fournisseur) || 'Non renseigné'}</span></div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="border rounded-3 p-3 h-100">
                    <h6 className="fw-semibold mb-3">Amortissement</h6>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Mode</span><span>{currentActif.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}</span></div>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Durée</span><span>{currentActif.duree_utile_ans || 0} ans</span></div>
                    <div className="d-flex justify-content-between py-2"><span className="text-secondary-custom">Valeur résiduelle</span><span>{formatCurrency(currentActif.valeur_residuelle || 0)}</span></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="border rounded-3 p-3 h-100">
                    <h6 className="fw-semibold mb-3">Valeurs actuelles</h6>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Valeur brute</span><span>{formatCurrency(currentActif.cout_acquisition)}</span></div>
                    <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-secondary-custom">Amortissements cumulés</span><span>{formatCurrency(amortissementsCumules)}</span></div>
                    <div className="d-flex justify-content-between py-2"><span className="text-secondary-custom">Valeur nette comptable</span><strong className="text-success">{formatCurrency(valeurNette)}</strong></div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Onglet Amortissements */}
        {!isJuridique && activeTab === 'amortissements' && (
          <Card className="card-modern">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h5 fw-semibold mb-0">Plan d'amortissement</h2>
                <div className="d-flex gap-2">
                  <Button variant="outline-primary" onClick={handleAnalyseIA} disabled={analyseIALoading || amortissements.length === 0} className="btn-modern">
                    {analyseIALoading ? <Spinner size="sm" animation="border" /> : <GiArtificialIntelligence size={16} />} Analyse IA
                  </Button>
                  {canRecalculAmort && (
                    <Button variant="primary" onClick={handleRecalculerAmortissements} disabled={recalculLoading} className="btn-modern">
                      {recalculLoading ? <Spinner size="sm" animation="border" className="me-2" /> : <FiRefreshCw className="me-1" />} Recalculer
                    </Button>
                  )}
                </div>
              </div>

              {recalculMessage.text && <Alert variant={recalculMessage.type === 'success' ? 'success' : 'danger'}>{recalculMessage.text}</Alert>}

              {analyseIAResultat && (
                <Card className="mb-4 border-primary">
                  <Card.Header className="bg-primary bg-opacity-10">
                    <h6 className="mb-0"><GiArtificialIntelligence /> Analyse IA</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Badge bg={analyseIAResultat.est_coherent ? 'success' : 'warning'}>{analyseIAResultat.est_coherent ? 'Cohérent' : 'Attention'}</Badge>
                        <div className="mt-2"><small>Taux moyen</small><div className="fw-semibold">{safeString(analyseIAResultat.taux_moyen)}</div></div>
                      </Col>
                      <Col md={6}><small>Résumé</small><p className="small mb-0">{safeString(analyseIAResultat.resume)}</p></Col>
                    </Row>
                    {analyseIAResultat.anomalies?.length > 0 && (
                      <Alert variant="warning" className="mt-3 mb-0">
                        <strong>Anomalies :</strong>
                        <ul className="mb-0 mt-1 ps-3">
                          {analyseIAResultat.anomalies.map((a, i) => <li key={i} className="small">{safeString(a)}</li>)}
                        </ul>
                      </Alert>
                    )}
                    {analyseIAResultat.recommandations?.length > 0 && (
                      <div className="mt-3 pt-2 border-top">
                        <strong>Recommandations :</strong>
                        <ul className="mb-0 mt-1 ps-3">
                          {analyseIAResultat.recommandations.map((r, i) => <li key={i} className="small">{safeString(r)}</li>)}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              {amortissements.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3"><p className="text-muted mb-0">Aucun amortissement calculé</p></div>
              ) : (
                <>
                  <div className="mb-5">
                    <h6 className="fw-semibold mb-3">Évolution de la valeur nette</h6>
                    <div style={{ height: '350px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={amortissements.map(a => ({ année: a.exercice, valeurNette: cleanNumber(a.valeur_nette) || 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="année" />
                          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="valeurNette" name="Valeur nette" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Table className="table-modern">
                      <thead>
                        <tr><th>Exercice</th><th>Annuité</th><th>Cumul</th><th>Valeur nette</th><th>Taux</th></tr>
                      </thead>
                      <tbody>
                        {amortissements.map((am, idx) => (
                          <tr key={idx}>
                            <td>{am.exercice || '-'}</td>
                            <td>{formatCurrency(am.annuite)}</td>
                            <td>{formatCurrency(am.cumul_amortissements)}</td>
                            <td><strong>{formatCurrency(am.valeur_nette)}</strong></td>
                            <td>{am.taux || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light fw-semibold">
                        <tr><td className="text-end">Total :</td>
                            <td>{formatCurrency(calculerTotal(amortissements, 'annuite'))}</td>
                            <td>{formatCurrency(amortissements[amortissements.length - 1]?.cumul_amortissements || 0)}</td>
                            <td>{formatCurrency(amortissements[amortissements.length - 1]?.valeur_nette || 0)}</td>
                            <td>--</td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Onglet Réévaluations - AVEC COULEUR BLANC */}
        {!isJuridique && activeTab === 'reevaluations' && canEdit && (
          <div className="reevaluation-white-text">
            <Card className="reevaluation-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="h5 fw-semibold mb-0 text-white">Historique des réévaluations</h2>
                  <Button 
                    variant="outline-info" 
                    className="btn-modern" 
                    onClick={() => navigate(`/actifs/${id}/reevaluations/nouveau`)}
                    style={{ color: '#fff', borderColor: 'rgba(0, 255, 247, 0.5)' }}
                  >
                    <FiPlus size={14} className="me-1" /> Nouvelle réévaluation
                  </Button>
                </div>
                <ReevaluationsList actifId={id} canEdit={canEdit} />
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Onglet Contrats */}
        {activeTab === 'contrats' && canManageContracts && (
          <Card className="card-modern">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h5 fw-semibold mb-0">Contrats liés</h2>
                {can(['admin', 'comptable', 'juridique']) && (
                  <Button variant="primary" className="btn-modern" onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)}>
                    <FiPlus size={14} className="me-1" /> Nouveau contrat
                  </Button>
                )}
              </div>
              {contrats.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3"><p className="text-muted">Aucun contrat associé</p></div>
              ) : (
                <Table className="table-modern">
                  <thead>
                    <tr><th>Nom</th><th>Type</th><th>Date début</th><th>Date fin</th><th>Montant</th><th>Statut</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {contrats.map(c => (
                      <tr key={c.id}>
                        <td>{safeString(c.nom || c.numero_contrat)}</td>
                        <td>{safeString(c.type) || 'Licence'}</td>
                        <td>{formatDate(c.date_debut)}</td>
                        <td>{formatDate(c.date_fin)}</td>
                        <td>{formatCurrency(c.montant)}</td>
                        <td><Badge bg={new Date(c.date_fin) > new Date() ? 'success' : 'danger'}>{new Date(c.date_fin) > new Date() ? 'Actif' : 'Expiré'}</Badge></td>
                        <td><Button size="sm" variant="primary" onClick={() => navigate(`/contrats/${c.id}`)}><FiEye /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Onglet Dépréciations */}
        {!isJuridique && activeTab === 'depreciations' && canManageDepreciations && (
          <Card className="card-modern">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h5 fw-semibold mb-0">Tests de dépréciation</h2>
                <Button variant="primary" className="btn-modern" onClick={() => setShowDepreciationModal(true)}>
                  <FiPlus size={14} className="me-1" /> Nouveau test
                </Button>
              </div>
              <DepreciationsList actifId={id} canEdit={canManageDepreciations} />
            </Card.Body>
          </Card>
        )}

        {/* Onglet Documents */}
        {activeTab === 'documents' && (
          <Card className="card-modern">
            <Card.Body>
              <DocumentList onRefresh={handleRefresh} />
            </Card.Body>
          </Card>
        )}

        {/* Onglet Audit avec heure locale */}
        {!isJuridique && activeTab === 'audit' && canViewAudit && (
          <Card className="audit-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h5 fw-semibold mb-0 text-white">Historique des modifications</h2>
                <Badge bg="secondary">{auditLogs.length} événement(s)</Badge>
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-center py-5 rounded-3" style={{ background: '#0f172a' }}>
                  <p className="text-white-50">Aucun historique trouvé</p>
                </div>
              ) : (
                <div className="vstack gap-3">
                  {auditLogs.map((log, index) => {
                    const isExpanded = expandedAuditId === log.id;
                    let actionBadgeClass = '';
                    switch(log.action) {
                      case 'CREATE': actionBadgeClass = 'audit-create-badge'; break;
                      case 'UPDATE': actionBadgeClass = 'audit-update-badge'; break;
                      case 'DELETE': actionBadgeClass = 'audit-delete-badge'; break;
                      default: actionBadgeClass = '';
                    }
                    return (
                      <div key={log.id || index}>
                        <Card className="border-0" style={{ backgroundColor: '#1e293b', cursor: 'pointer' }} onClick={() => toggleAuditDetails(log.id)}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                              <Badge className={actionBadgeClass}>{getActionIcon(log.action)} {getActionLabel(log.action)}</Badge>
                              <small className="d-flex align-items-center gap-1" style={{ color: '#cbd5e1' }}>
                                <FiClock size={12} /> {formatLocalDateTime(log.action_date || log.created_at)}
                              </small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', background: '#3b82f6', color: '#fff' }}>
                                  {log.utilisateur?.full_name?.charAt(0) || 'S'}
                                </div>
                                <div><div className="fw-semibold small text-white">{log.utilisateur?.full_name || 'Système'}</div></div>
                              </div>
                              <small className="text-white-50">{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</small>
                            </div>
                          </Card.Body>
                        </Card>
                        {isExpanded && (
                          <Card className="mt-2 border-0" style={{ backgroundColor: '#0f172a' }}>
                            <Card.Body className="p-3">
                              {log.old_data && log.new_data && Object.keys(log.new_data).map(key => {
                                const oldVal = log.old_data[key];
                                const newVal = log.new_data[key];
                                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                  return (
                                    <div key={key} className="d-flex align-items-center flex-wrap gap-2 p-2 mb-2 rounded-3" style={{ backgroundColor: '#1e293b' }}>
                                      <span className="audit-field-name">{safeString(key)}</span>
                                      <span className="audit-old-value">{safeString(oldVal)}</span>
                                      <span className="audit-arrow">→</span>
                                      <span className="audit-new-value">{safeString(newVal)}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                              {log.new_data && !log.old_data && formatAuditDataVisual(log.new_data)}
                              {log.old_data && !log.new_data && formatAuditDataVisual(log.old_data)}
                            </Card.Body>
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
};

export default ActifDetail;