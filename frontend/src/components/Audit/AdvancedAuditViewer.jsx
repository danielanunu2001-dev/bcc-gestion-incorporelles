// frontend/src/components/Audit/AdvancedAuditViewer.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiActivity, FiUser, FiCalendar, FiFilter, FiSearch,
  FiDownload, FiRefreshCw, FiFileText, FiPackage,
  FiTrendingDown, FiTrendingUp, FiClock, FiEye, FiEdit,
  FiTrash2, FiPlus, FiChevronDown, FiChevronUp, FiGrid,
  FiList, FiBarChart2, FiInfo, FiServer, FiGlobe,
  FiPrinter, FiX, FiShield, FiEyeOff, FiZap, FiSend, FiLoader
} from 'react-icons/fi';
import { FaRobot, FaBrain } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== CONSTANTES ====================
const ACTION_COLORS = {
  CREATE: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  REEVALUATION: '#8b5cf6',
  DEPRECIATION: '#ec489a',
  RECALCUL: '#3b82f6',
  SORTIE: '#64748b',
  CONTRAT_CREATE: '#14b8a6',
  CONTRAT_UPDATE: '#f97316',
  CONTRAT_DELETE: '#dc2626'
};

const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  REEVALUATION: 'Réévaluation',
  DEPRECIATION: 'Dépréciation',
  RECALCUL: 'Recalcul',
  SORTIE: 'Sortie',
  CONTRAT_CREATE: 'Contrat créé',
  CONTRAT_UPDATE: 'Contrat modifié',
  CONTRAT_DELETE: 'Contrat supprimé'
};

const TABLE_LABELS = {
  actifs: 'Actifs',
  users: 'Utilisateurs',
  contrats: 'Contrats',
  reevaluations: 'Réévaluations',
  depreciations: 'Dépréciations',
  mouvements: 'Mouvements',
  documents: 'Documents',
  audit_logs: 'Audit'
};

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'CREATE', label: '➕ Création' },
  { value: 'UPDATE', label: '✏️ Modification' },
  { value: 'DELETE', label: '🗑️ Suppression' },
  { value: 'REEVALUATION', label: '📈 Réévaluation' },
  { value: 'DEPRECIATION', label: '📉 Dépréciation' },
  { value: 'RECALCUL', label: '🔄 Recalcul' },
  { value: 'SORTIE', label: '📦 Sortie' },
  { value: 'CONTRAT_CREATE', label: '📄 Contrat créé' },
  { value: 'CONTRAT_UPDATE', label: '📝 Contrat modifié' },
  { value: 'CONTRAT_DELETE', label: '🗑️ Contrat supprimé' }
];

const TABLE_OPTIONS = [
  { value: '', label: 'Toutes les tables' },
  { value: 'actifs', label: '🏗️ Actifs' },
  { value: 'users', label: '👥 Utilisateurs' },
  { value: 'contrats', label: '📄 Contrats' },
  { value: 'reevaluations', label: '📈 Réévaluations' },
  { value: 'depreciations', label: '📉 Dépréciations' },
  { value: 'mouvements', label: '🔄 Mouvements' },
  { value: 'documents', label: '📁 Documents' }
];

const AI_SUGGESTIONS = [
  "📊 Résume l'activité des 7 derniers jours",
  "🗑️ Montre-moi toutes les suppressions de la semaine dernière",
  "🌙 Quelles sont les modifications suspectes entre 22h et 6h ?",
  "📈 Analyse les tendances des réévaluations ce mois-ci",
  "⚠️ Y a-t-il des actions anormales sur les actifs ?",
  "📉 Liste les dépréciations effectuées récemment",
  "👤 Qui a supprimé le plus d'enregistrements ?",
  "🔍 Détecte les pics d'activité inhabituels"
];

// ==================== FONCTION HEURE LOCALE EXACTE ====================
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

// ==================== COMPOSANT PRINCIPAL ====================
const AdvancedAuditViewer = () => {
  const { can } = usePermissions();
  const { user: currentUser } = useSelector(state => state.auth || { user: null });
  
  // États des données
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [expandedIds, setExpandedIds] = useState([]);
  const [stats, setStats] = useState({ parAction: [], parTable: [], total: 0 });
  const [users, setUsers] = useState([]);
  
  // États PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfIframeRef = useRef(null);
  
  // États Assistant IA
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // ✅ PERMISSIONS MISES À JOUR - GESTIONNAIRE AJOUTÉ
  const role = currentUser?.role || 'guest';
  const isJuridique = role === 'juridique';
  const isAuditeur = role === 'auditeur';
  const isGestionnaire = role === 'gestionnaire';
  
  // ✅ Les rôles qui peuvent voir l'audit : admin, auditeur, gestionnaire
  const canViewAudit = ['admin', 'auditeur', 'gestionnaire'].includes(role);
  
  // ✅ Les rôles qui peuvent voir la liste complète des utilisateurs
  const canViewFullUserList = ['admin', 'super_admin', 'auditeur', 'gestionnaire'].includes(role);
  
  // ✅ Les rôles qui peuvent voir les emails des utilisateurs
  const canViewUserEmails = ['admin', 'super_admin', 'auditeur', 'gestionnaire'].includes(role);
  
  // ✅ Les rôles qui peuvent filtrer par utilisateur
  const canFilterByUser = ['admin', 'super_admin', 'auditeur', 'gestionnaire'].includes(role);
  
  // Filtres
  const [filters, setFilters] = useState({
    userId: '',
    table: '',
    action: '',
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    search: ''
  });
  
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  // ==================== CHARGEMENT DES DONNÉES ====================
  useEffect(() => {
    if (canViewFullUserList && canViewAudit) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users/audit-list');
          setUsers(res.data || []);
        } catch (err) {
          console.error('Erreur chargement utilisateurs:', err);
          setUsers([]);
        }
      };
      fetchUsers();
    }
  }, [canViewFullUserList, canViewAudit]);

  const fetchLogs = useCallback(async () => {
    if (!canViewAudit) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      if (filters.userId && canFilterByUser) params.append('userId', filters.userId);
      if (filters.table) params.append('table', filters.table);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', startOfDay(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', endOfDay(filters.endDate).toISOString());
      if (filters.search && filters.search.length >= 2) params.append('search', filters.search);
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, canFilterByUser, canViewAudit]);

  const fetchStats = useCallback(async () => {
    if (!canViewAudit) return;
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', startOfDay(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', endOfDay(filters.endDate).toISOString());
      const res = await api.get(`/audit-logs/stats?${params.toString()}`);
      setStats({
        parAction: res.data.parAction || [],
        parTable: res.data.parTable || [],
        total: res.data.total || 0
      });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }, [filters.startDate, filters.endDate, canViewAudit]);

  useEffect(() => {
    if (canViewAudit) {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchLogs();
      fetchStats();
    }
  }, [filters.userId, filters.table, filters.action, filters.startDate, filters.endDate, canViewAudit]);

  useEffect(() => {
    if (canViewAudit) fetchLogs();
  }, [pagination.page, canViewAudit]);

  // ==================== ASSISTANT IA ====================
  const formatAIResponse = (response) => {
    if (!response) return '';
    let formatted = response
      .replace(/^### (.*?)$/gm, '<h4 style="color: #fbbf24; margin: 0.75rem 0 0.5rem 0; font-size: 0.9rem; font-weight: 600;">📌 $1</h4>')
      .replace(/^## (.*?)$/gm, '<h3 style="color: #f59e0b; margin: 1rem 0 0.5rem 0; font-size: 1rem; font-weight: 600;">📊 $1</h3>')
      .replace(/^# (.*?)$/gm, '<h2 style="color: #00fff7; margin: 1rem 0 0.75rem 0; font-size: 1.1rem; font-weight: 700;">📋 $1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00fff7;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #94a3b8;">$1</em>')
      .replace(/^[-•] (.*?)$/gm, '<li style="margin-left: 1rem; margin-bottom: 0.35rem; color: #cbd5e1;">$1</li>')
      .replace(/^---$/gm, '<hr style="border-color: rgba(0,255,247,0.2); margin: 0.75rem 0;" />');
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*?<\/li>)/gs, '<ul style="margin: 0.5rem 0; padding-left: 0; list-style-type: none;">$1</ul>');
    }
    return formatted.replace(/\n/g, '<br/>');
  };

  const askAIAssistant = async (question) => {
    if (!question.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const currentLogsSummary = {
        total: total,
        period: { start: filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'début', end: filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'aujourd\'hui' },
        topActions: stats.parAction.slice(0, 5),
        recentLogs: logs.slice(0, 10).map(log => ({ action: ACTION_LABELS[log.action] || log.action, table: TABLE_LABELS[log.table_name] || log.table_name, user: log.utilisateur?.full_name || 'Système', date: formatLocalDateTime(log.action_date || log.created_at) }))
      };
      const response = await api.post('/ai/audit-assistant', { question, context: { currentFilters: filters, stats, logsSummary: currentLogsSummary, totalLogs: total } });
      setAiResponse(response.data.answer || "Je n'ai pas pu analyser cette demande.");
      if (response.data.suggestedFilters) {
        const suggested = response.data.suggestedFilters;
        if (suggested.action) setFilters(prev => ({ ...prev, action: suggested.action }));
        if (suggested.table) setFilters(prev => ({ ...prev, table: suggested.table }));
        if (suggested.userId) setFilters(prev => ({ ...prev, userId: suggested.userId }));
      }
    } catch (error) {
      setAiResponse("❌ Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISuggestion = (suggestion) => { setAiQuestion(suggestion); askAIAssistant(suggestion); };
  const handleAIQuestionSubmit = (e) => { e.preventDefault(); askAIAssistant(aiQuestion); };
  const quickAnalysis = async () => {
    setAiLoading(true);
    setShowAIAssistant(true);
    try {
      const response = await api.post('/ai/audit-assistant', { question: "Fais une analyse rapide des logs d'audit et détecte les anomalies potentielles", context: { currentFilters: filters, stats, totalLogs: total } });
      setAiResponse(response.data.answer || "Analyse terminée. Aucune anomalie majeure détectée.");
    } catch (error) {
      setAiResponse("Analyse rapide: Aucune anomalie détectée dans la période.");
    } finally {
      setAiLoading(false);
    }
  };

  // ==================== FONCTIONS UTILITAIRES ====================
  const handleSearch = () => { if (filters.search && filters.search.length >= 2) { setPagination(prev => ({ ...prev, page: 1 })); fetchLogs(); } };
  const resetFilters = () => { setFilters({ userId: '', table: '', action: '', startDate: subDays(new Date(), 30), endDate: new Date(), search: '' }); setPagination({ page: 1, limit: 20 }); };
  const getRealOperationDate = (log) => new Date(log.action_date || log.created_at);
  const toggleDetails = (id) => setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const generatePDF = async () => {
    if (!canViewAudit) return;
    setGeneratingPdf(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', 1000);
      if (filters.userId && canFilterByUser) params.append('userId', filters.userId);
      if (filters.table) params.append('table', filters.table);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', startOfDay(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', endOfDay(filters.endDate).toISOString());
      const res = await api.get(`/audit-logs?${params.toString()}`);
      const allLogs = res.data.logs || [];
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18);
      doc.setTextColor(0, 255, 247);
      doc.text("Journal d'audit BCC", pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const periode = filters.startDate && filters.endDate ? `${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}` : 'Toute période';
      doc.text(`Période: ${periode}`, pageWidth / 2, 22, { align: 'center' });
      doc.text(`Généré le: ${formatLocalDateTime(new Date())}`, pageWidth / 2, 29, { align: 'center' });
      const tableData = allLogs.map(log => [formatLocalDateTime(log.action_date || log.created_at), log.utilisateur?.full_name || 'Système', ACTION_LABELS[log.action] || log.action, TABLE_LABELS[log.table_name] || log.table_name, log.record_id?.substring(0, 12) || '', log.ip_address || 'N/A']);
      autoTable(doc, { startY: 35, head: [['Date/heure', 'Utilisateur', 'Action', 'Table', 'ID', 'IP']], body: tableData, theme: 'striped', headStyles: { fillColor: [0, 255, 247], textColor: [0, 0, 0], fontSize: 9 }, bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 30 }, 5: { cellWidth: 20 } } });
      const pdfBlob = doc.output('blob');
      setPdfBlobUrl(URL.createObjectURL(pdfBlob));
      setShowPdfModal(true);
    } catch (err) { setError('Erreur lors de la génération du PDF'); }
    finally { setGeneratingPdf(false); }
  };

  const closePdfModal = () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); setShowPdfModal(false); };
  const printPdf = () => pdfIframeRef.current?.contentWindow.print();
  const downloadPdf = () => { if (pdfBlobUrl) { const link = document.createElement('a'); link.href = pdfBlobUrl; link.download = `audit_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`; link.click(); } };

  const renderDiff = (oldData, newData) => {
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    const changes = [];
    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changes.push({ key, oldVal, newVal });
    }
    if (changes.length === 0) return <p style={styles.noDiff}>Aucune modification détectée</p>;
    return (<div style={styles.diffGrid}>{changes.map(change => (<div key={change.key} style={styles.diffRow}><div style={styles.diffKey}>{change.key}</div><div style={styles.diffValues}><span style={styles.oldValue}>{change.oldVal !== undefined ? String(change.oldVal) : 'null'}</span><span style={styles.arrow}>→</span><span style={styles.newValue}>{change.newVal !== undefined ? String(change.newVal) : 'null'}</span></div></div>))}</div>);
  };

  // ==================== RENDU CONDITIONNEL ====================
  if (!canViewAudit) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.errorContainer}>
        <FiShield size={48} color="#ef4444" />
        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>Accès non autorisé</h2>
        <p style={{ color: '#94a3b8' }}>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      </motion.div>
    );
  }

  // ==================== RENDU PRINCIPAL ====================
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={styles.container}>
      
      {/* Bouton Assistant IA */}
      <button onClick={() => setShowAIAssistant(!showAIAssistant)} style={styles.aiFloatingButton} className="ai-floating-btn">
        <FaRobot size={24} />
        <span style={styles.aiFloatingText}>Assistant Audit</span>
      </button>

      {/* Modal Assistant IA */}
      <AnimatePresence>
        {showAIAssistant && (
          <motion.div initial={{ opacity: 0, x: -400 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -400 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} style={styles.aiModal}>
            <div style={styles.aiModalHeader}>
              <div style={styles.aiModalTitle}><FaBrain size={20} style={{ color: '#00fff7' }} /><span>Assistant IA - Audit BCC</span></div>
              <button onClick={() => setShowAIAssistant(false)} style={styles.aiModalClose}>✕</button>
            </div>
            <div style={styles.aiModalBody}>
              <div style={styles.aiSuggestions}>
                <p style={styles.aiSuggestionsTitle}>📌 Suggestions rapides :</p>
                <div style={styles.aiSuggestionsList}>{AI_SUGGESTIONS.slice(0, 4).map((suggestion, idx) => (<button key={idx} onClick={() => handleAISuggestion(suggestion)} style={styles.aiSuggestionChip}><FiZap size={12} /> {suggestion}</button>))}</div>
              </div>
              <form onSubmit={handleAIQuestionSubmit} style={styles.aiQuestionForm}>
                <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} placeholder="Posez votre question sur l'audit..." style={styles.aiQuestionInput} />
                <button type="submit" disabled={aiLoading} style={styles.aiQuestionButton}>{aiLoading ? <FiLoader size={18} className="spin" /> : <FiSend size={18} />}</button>
              </form>
              {(aiResponse || aiLoading) && (
                <div style={styles.aiResponseContainer}>
                  <div style={styles.aiResponseHeader}><FaRobot size={14} /><span>🤖 Réponse de l'assistant</span>{aiResponse && !aiLoading && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#64748b' }}>🕐 {new Date().toLocaleTimeString()}</span>}</div>
                  <div style={styles.aiResponseContent}>{aiLoading ? (<div style={styles.aiTyping}><span>⚡</span><span>⚡</span><span>⚡</span></div>) : (<div style={styles.aiResponseText} dangerouslySetInnerHTML={{ __html: formatAIResponse(aiResponse) }} />)}</div>
                </div>
              )}
              <button onClick={quickAnalysis} style={styles.aiQuickAnalysisBtn}><FiZap size={14} /> ⚡ Analyse rapide de la période</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal PDF */}
      <AnimatePresence>
        {showPdfModal && pdfBlobUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay} onClick={closePdfModal}>
            <motion.div initial={{ scale: 0.9, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: -20 }} style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}><h3 style={styles.modalTitle}><FiFileText /> Aperçu du rapport d'audit</h3><button onClick={closePdfModal} style={styles.modalClose}><FiX /></button></div>
              <div style={styles.pdfContainer}><iframe ref={pdfIframeRef} src={pdfBlobUrl} style={styles.pdfIframe} title="Aperçu PDF" /></div>
              <div style={styles.modalActions}><button onClick={printPdf} style={styles.printButton}><FiPrinter /> Imprimer</button><button onClick={downloadPdf} style={styles.downloadButton}><FiDownload /> Télécharger</button><button onClick={closePdfModal} style={styles.closeModalButton}>Fermer</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête */}
      <div style={styles.header}>
        <div><h1 style={styles.title}>📋 Journal d'audit avancé</h1><p style={styles.subtitle}>Traçabilité complète des actions utilisateurs</p></div>
        <div style={styles.headerActions}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} style={styles.iconButton}>{viewMode === 'table' ? <FiGrid size={18} /> : <FiList size={18} />}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={generatePDF} disabled={generatingPdf} style={styles.pdfButton}><FiFileText /> {generatingPdf ? 'Génération...' : 'PDF'}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { fetchLogs(); fetchStats(); }} style={styles.refreshButton}><FiRefreshCw /> Rafraîchir</motion.button>
        </div>
      </div>

      {/* Statistiques */}
      <div style={styles.statsSection}>
        <div style={styles.statsCards}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={styles.statCard}><span style={styles.statValue}>{stats.total || total}</span><span style={styles.statLabel}>Événements</span></motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={styles.statCard}><span style={styles.statValue}>{logs.length}</span><span style={styles.statLabel}>Affichés</span></motion.div>
          {canViewFullUserList && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={styles.statCard}><span style={styles.statValue}>{users.length}</span><span style={styles.statLabel}>Utilisateurs</span></motion.div>)}
        </div>
      </div>

      {/* Filtres */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          {canFilterByUser ? (<div style={styles.filterGroup}><label><FiUser /> Utilisateur</label><select value={filters.userId} onChange={e => setFilters({...filters, userId: e.target.value})} style={styles.select}><option value="">Tous les utilisateurs</option>{users.map(u => (<option key={u.id} value={u.id}>{u.full_name}{canViewUserEmails && u.email && ` (${u.email})`}</option>))}</select></div>) : (<div style={styles.filterGroup}><label><FiUser /> Utilisateur</label><select disabled style={styles.selectDisabled}><option>Filtre indisponible</option></select></div>)}
          <div style={styles.filterGroup}><label><FiServer /> Table</label><select value={filters.table} onChange={e => setFilters({...filters, table: e.target.value})} style={styles.select}>{TABLE_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
          <div style={styles.filterGroup}><label><FiActivity /> Action</label><select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} style={styles.select}>{ACTION_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></div>
          <div style={styles.filterGroup}><label><FiCalendar /> Période</label><div style={styles.dateRange}><DatePicker selected={filters.startDate} onChange={date => setFilters({...filters, startDate: date})} dateFormat="dd/MM/yyyy" className="datepicker-input" placeholderText="Date début" /><span>→</span><DatePicker selected={filters.endDate} onChange={date => setFilters({...filters, endDate: date})} dateFormat="dd/MM/yyyy" className="datepicker-input" placeholderText="Date fin" minDate={filters.startDate} /></div></div>
          <div style={styles.filterGroup}><label><FiSearch /> Recherche</label><div style={styles.searchBox}><input type="text" placeholder="Rechercher..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} onKeyPress={e => e.key === 'Enter' && handleSearch()} style={styles.searchInput} /><button onClick={handleSearch} style={styles.searchButton}><FiSearch /></button></div></div>
        </div>
        <div style={styles.filterActions}><button onClick={resetFilters} style={styles.resetButton}><FiFilter /> Réinitialiser</button></div>
      </div>

      {/* Liste des logs avec heure locale exacte */}
      {loading ? (<div style={styles.loading}><div style={styles.spinner}></div><p>Chargement des logs...</p></div>) : error ? (<div style={styles.error}>{error}</div>) : logs.length === 0 ? (<div style={styles.noData}>Aucun log trouvé pour cette période</div>) : viewMode === 'table' ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{width: '180px'}}>Date/heure (locale)</th>
                <th style={{width: '180px'}}>Utilisateur</th>
                <th style={{width: '120px'}}>Action</th>
                <th style={{width: '120px'}}>Table</th>
                <th style={{width: '150px'}}>ID</th>
                <th style={{width: '100px'}}>IP</th>
                <th style={{width: '60px'}}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => { 
                const isExpanded = expandedIds.includes(log.id); 
                return (
                  <React.Fragment key={log.id}>
                    <tr style={styles.tableRow}>
                      <td style={{fontFamily: 'monospace', fontSize: '0.75rem'}}>{formatLocalDateTime(getRealOperationDate(log))}</td>
                      <td>{log.utilisateur?.full_name || 'Système'}{canViewUserEmails && log.utilisateur?.email && <><br/><small style={styles.smallEmail}>{log.utilisateur.email}</small></>}</td>
                      <td><span style={{...styles.actionBadge, backgroundColor: ACTION_COLORS[log.action] + '20', color: ACTION_COLORS[log.action]}}>{ACTION_LABELS[log.action] || log.action}</span></td>
                      <td>{TABLE_LABELS[log.table_name] || log.table_name}</td>
                      <td><code style={styles.code}>{log.record_id?.substring(0, 8)}…</code></td>
                      <td>{log.ip_address || 'N/A'}</td>
                      <td><button onClick={() => toggleDetails(log.id)} style={styles.detailButton}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</button></td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" style={styles.expandedCell}>
                          <div style={styles.expandedContent}>
                            <div><strong>ID complet :</strong> {log.record_id}</div>
                            <div><strong>Date/heure exacte :</strong> {formatLocalDateTime(getRealOperationDate(log))}</div>
                            <div><strong>Détails des modifications :</strong></div>
                            {renderDiff(log.old_data, log.new_data)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.cardsGrid}>
          {logs.map(log => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{...styles.actionBadge, backgroundColor: ACTION_COLORS[log.action] + '20', color: ACTION_COLORS[log.action]}}>{ACTION_LABELS[log.action] || log.action}</span>
                <span style={styles.cardDate}>{formatLocalDateTime(getRealOperationDate(log))}</span>
              </div>
              <div style={styles.cardBody}>
                <div><FiUser /> {log.utilisateur?.full_name || 'Système'}</div>
                <div><FiServer /> Table : {TABLE_LABELS[log.table_name] || log.table_name}</div>
                <div><FiInfo /> ID : <code>{log.record_id?.substring(0, 12)}…</code></div>
                <div><FiGlobe /> IP : {log.ip_address || 'N/A'}</div>
              </div>
              <button onClick={() => toggleDetails(log.id)} style={styles.cardButton}>Voir les changements</button>
              {expandedIds.includes(log.id) && <div style={styles.cardDetails}>{renderDiff(log.old_data, log.new_data)}</div>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pagination.limit && (<div style={styles.pagination}><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={pagination.page === 1} onClick={() => setPagination({...pagination, page: pagination.page - 1})} style={{...styles.paginationButton, opacity: pagination.page === 1 ? 0.5 : 1}}>Précédent</motion.button><span>Page {pagination.page} sur {Math.ceil(total / pagination.limit)}</span><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={pagination.page >= Math.ceil(total / pagination.limit)} onClick={() => setPagination({...pagination, page: pagination.page + 1})} style={{...styles.paginationButton, opacity: pagination.page >= Math.ceil(total / pagination.limit) ? 0.5 : 1}}>Suivant</motion.button></div>)}

      <style>{`
        .datepicker-input { width: 100%; padding: 0.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(0, 255, 247, 0.2); border-radius: 8px; color: #e2e8f0; font-size: 0.875rem; cursor: pointer; }
        .datepicker-input:focus { outline: none; border-color: #00fff7; box-shadow: 0 0 0 2px rgba(0, 255, 247, 0.1); }
        .react-datepicker { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(0, 255, 247, 0.2); }
        .react-datepicker__header { background: rgba(0, 255, 247, 0.1); border-bottom: 1px solid rgba(0, 255, 247, 0.2); }
        .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker__day { color: #e2e8f0; }
        .react-datepicker__day:hover { background: rgba(0, 255, 247, 0.2); }
        .react-datepicker__day--selected { background: #00fff7; color: #0f172a; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .ai-floating-btn { animation: pulseLeft 2s ease-in-out infinite; }
        .ai-floating-btn:hover { transform: scale(1.1); }
        .ai-floating-btn:hover span { opacity: 1; }
        @keyframes pulseLeft { 0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 247, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(0, 255, 247, 0); } }
      `}</style>
    </motion.div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem', backgroundColor: 'transparent', minHeight: 'calc(100vh - 80px)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' },
  title: { fontSize: '1.8rem', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: '#94a3b8', marginTop: '0.25rem' },
  headerActions: { display: 'flex', gap: '0.75rem' },
  iconButton: { padding: '0.5rem', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '10px', cursor: 'pointer', color: '#00fff7' },
  pdfButton: { padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  refreshButton: { padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  statsSection: { marginBottom: '2rem' },
  statsCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' },
  statCard: { background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,255,247,0.15)' },
  statValue: { fontSize: '2rem', fontWeight: 'bold', color: '#00fff7', display: 'block' },
  statLabel: { fontSize: '0.8rem', color: '#94a3b8' },
  filtersCard: { background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(0,255,247,0.15)' },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' },
  select: { padding: '0.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', cursor: 'pointer' },
  selectDisabled: { padding: '0.5rem', background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(0,255,247,0.1)', borderRadius: '8px', color: '#64748b', fontSize: '0.875rem', cursor: 'not-allowed' },
  dateRange: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  searchBox: { display: 'flex', gap: '0.5rem' },
  searchInput: { flex: 1, padding: '0.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none' },
  searchButton: { padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' },
  filterActions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(0,255,247,0.15)' },
  resetButton: { padding: '0.5rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '8px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  tableWrapper: { overflowX: 'auto', background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px', border: '1px solid rgba(0,255,247,0.15)' },
  table: { width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' },
  tableRow: { borderBottom: '1px solid rgba(0,255,247,0.1)' },
  actionBadge: { padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' },
  code: { fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '4px' },
  smallEmail: { fontSize: '0.7rem', color: '#64748b' },
  detailButton: { background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', color: '#00fff7' },
  expandedCell: { backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem' },
  expandedContent: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' },
  card: { background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(0,255,247,0.15)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' },
  cardDate: { fontSize: '0.7rem', color: '#64748b' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#cbd5e1' },
  cardButton: { marginTop: '0.75rem', width: '100%', padding: '0.5rem', background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#00fff7' },
  cardDetails: { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,255,247,0.15)' },
  diffGrid: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  diffRow: { display: 'flex', gap: '1rem', alignItems: 'baseline', flexWrap: 'wrap', padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' },
  diffKey: { fontWeight: '600', fontFamily: 'monospace', minWidth: '100px', fontSize: '0.7rem', color: '#00fff7' },
  diffValues: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
  oldValue: { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' },
  newValue: { backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' },
  arrow: { color: '#64748b' },
  noDiff: { fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' },
  loading: { textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(0,255,247,0.2)', borderTop: '3px solid #00fff7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' },
  error: { backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '1rem', borderRadius: '12px', textAlign: 'center' },
  noData: { textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px', color: '#64748b' },
  pagination: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', alignItems: 'center', padding: '1rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '16px' },
  paginationButton: { padding: '0.5rem 1rem', background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '8px', color: '#00fff7', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(0,255,247,0.2)', width: '90%', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,255,247,0.15)' },
  modalTitle: { fontSize: '1.1rem', fontWeight: '600', color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  modalClose: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem 0.5rem' },
  pdfContainer: { flex: 1, padding: '1rem', minHeight: 0 },
  pdfIframe: { width: '100%', height: '100%', border: 'none', borderRadius: '12px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid rgba(0,255,247,0.15)' },
  printButton: { padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  downloadButton: { padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  closeModalButton: { padding: '0.5rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(0,255,247,0.2)', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  errorContainer: { textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))', backdropFilter: 'blur(18px)', borderRadius: '20px', maxWidth: '500px', margin: '2rem auto', border: '1px solid rgba(0,255,247,0.15)' },
  aiFloatingButton: { position: 'fixed', bottom: '2rem', left: '2rem', width: '56px', height: '56px', borderRadius: '28px', background: 'linear-gradient(135deg, #00fff7, #7c3aed)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 20px rgba(0,255,247,0.3)', zIndex: 1000, transition: 'all 0.3s ease', overflow: 'hidden' },
  aiFloatingText: { position: 'absolute', left: '70px', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', opacity: 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' },
  aiModal: { position: 'fixed', bottom: '6rem', left: '2rem', width: '480px', maxWidth: 'calc(100vw - 2rem)', maxHeight: '80vh', background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(0,255,247,0.3)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', zIndex: 1001, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  aiModalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,255,247,0.2)', background: 'rgba(0,255,247,0.05)', flexShrink: 0 },
  aiModalTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#00fff7' },
  aiModalClose: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'color 0.2s' },
  aiModalBody: { padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' },
  aiSuggestions: { marginBottom: '0.5rem', flexShrink: 0 },
  aiSuggestionsTitle: { fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' },
  aiSuggestionsList: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  aiSuggestionChip: { padding: '0.4rem 0.75rem', background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '20px', fontSize: '0.7rem', color: '#e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.25rem' },
  aiQuestionForm: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  aiQuestionInput: { flex: 1, padding: '0.6rem 0.75rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '12px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none' },
  aiQuestionButton: { padding: '0.6rem 1rem', background: 'linear-gradient(135deg, #00fff7, #7c3aed)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  aiResponseContainer: { background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '0', border: '1px solid rgba(0,255,247,0.2)', overflow: 'hidden', flexShrink: 0, maxHeight: '400px', display: 'flex', flexDirection: 'column' },
  aiResponseHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(0,255,247,0.08)', borderBottom: '1px solid rgba(0,255,247,0.15)', fontSize: '0.75rem', color: '#00fff7', fontWeight: '500' },
  aiResponseContent: { padding: '1rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6', maxHeight: '350px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  aiResponseText: { margin: 0, whiteSpace: 'pre-wrap' },
  aiTyping: { display: 'flex', gap: '0.25rem', fontSize: '1.2rem', padding: '0.5rem' },
  aiQuickAnalysisBtn: { width: '100%', padding: '0.6rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', color: '#c084fc', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s ease' }
};

export default AdvancedAuditViewer;