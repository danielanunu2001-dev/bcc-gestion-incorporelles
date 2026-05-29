// frontend/src/components/Audit/AuditList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { formatAuditData } from '../../utils/auditFormatter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity, FiUser, FiCalendar, FiFilter, FiSearch, FiDownload, FiRefreshCw, FiFileText,
  FiPackage, FiTrendingDown, FiTrendingUp, FiClock, FiEye, FiEdit, FiTrash2, FiPlus,
  FiChevronDown, FiChevronUp, FiShield, FiEyeOff, FiX, FiGrid, FiList, FiCheckCircle,
  FiAlertCircle, FiLoader
} from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// ==================== FONCTION HEURE LOCALE EXACTE ====================
// ✅ Fonction pour afficher l'heure EXACTE de l'ordinateur (format JJ/MM/AAAA HH:MM:SS)
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
const AuditList = () => {
  const { can } = usePermissions();
  const { user: currentUser } = useSelector(state => state.auth || { user: null });
  
  const role = currentUser?.role || 'guest';
  const isJuridique = role === 'juridique';
  const isAuditeur = role === 'auditeur';
  const canFilterByUser = ['admin', 'auditeur'].includes(role);
  const canViewUserEmails = ['admin', 'auditeur'].includes(role);
  const canViewAudit = ['admin', 'auditeur'].includes(role);
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [viewMode, setViewMode] = useState('list');
  const [showRoleBanner, setShowRoleBanner] = useState(true);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({
    userId: '',
    table: '',
    action: '',
    startDate: null,
    endDate: null,
    search: ''
  });
  const [stats, setStats] = useState({ total: 0, parAction: [], parTable: [] });
  const [users, setUsers] = useState([]);
  const [usersLoadingError, setUsersLoadingError] = useState(false);

  const tables = [
    { value: '', label: '📋 Toutes les tables' },
    { value: 'actifs', label: '🏷️ Actifs' },
    { value: 'users', label: '👤 Utilisateurs' },
    { value: 'contrats', label: '📄 Contrats' },
    { value: 'reevaluations', label: '📈 Réévaluations' },
    { value: 'depreciations', label: '📉 Dépréciations' },
    { value: 'documents', label: '📎 Documents' }
  ];
  
  const actions = [
    { value: '', label: '🎯 Toutes les actions' },
    { value: 'CREATE', label: '✨ Créations', color: '#10b981' },
    { value: 'UPDATE', label: '✏️ Modifications', color: '#3b82f6' },
    { value: 'DELETE', label: '🗑️ Suppressions', color: '#ef4444' },
    { value: 'REEVALUATION', label: '📈 Réévaluations', color: '#f59e0b' },
    { value: 'DEPRECIATION', label: '📉 Dépréciations', color: '#8b5cf6' },
    { value: 'RECALCUL', label: '🔄 Recalculs', color: '#06b6d4' },
    { value: 'SORTIE', label: '🚪 Sorties', color: '#64748b' }
  ];

  useEffect(() => {
    if (canFilterByUser && canViewAudit) {
      const fetchUsers = async () => {
        try {
          const res = await api.get('/users/audit-list');
          setUsers(res.data);
          setUsersLoadingError(false);
        } catch (err) {
          console.error('Erreur chargement utilisateurs:', err);
          setUsersLoadingError(true);
        }
      };
      fetchUsers();
    }
  }, [canFilterByUser, canViewAudit]);

  const fetchLogs = useCallback(async () => {
    if (!canViewAudit) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({ page, limit });
      if (filters.userId && canFilterByUser) params.append('userId', filters.userId);
      if (filters.table) params.append('table', filters.table);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      const logsData = res.data.logs || [];
      const sortedLogs = [...logsData].sort((a, b) => {
        const dateA = new Date(a.action_date || a.created_at);
        const dateB = new Date(b.action_date || b.created_at);
        return dateB - dateA;
      });
      
      setLogs(sortedLogs);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, canViewAudit, canFilterByUser]);

  const fetchStats = useCallback(async () => {
    if (!canViewAudit) return;
    try {
      const res = await api.get('/audit-logs/stats');
      setStats(res.data);
    } catch (error) {
      console.error('❌ Erreur stats:', error);
    }
  }, [canViewAudit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = async () => {
    if (!filters.search || filters.search.length < 2) return;
    await fetchLogs();
  };

  const handleReset = () => {
    setFilters({
      userId: '',
      table: '',
      action: '',
      startDate: null,
      endDate: null,
      search: ''
    });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: 'Export réussi !', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('❌ Erreur export:', error);
      setToast({ message: 'Erreur lors de l\'export', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getOperationDate = (log) => {
    if (log.action === 'CREATE' && log.table_name === 'actifs' && log.new_data?.date_acquisition) {
      return new Date(log.new_data.date_acquisition);
    }
    if (log.action === 'UPDATE' && log.table_name === 'actifs') {
      return new Date(log.created_at);
    }
    if (log.action === 'CONTRAT_CREATE' && log.new_data?.date_debut) {
      return new Date(log.new_data.date_debut);
    }
    if (log.action === 'REEVALUATION' && log.new_data?.date_reevaluation) {
      return new Date(log.new_data.date_reevaluation);
    }
    if (log.action === 'DEPRECIATION' && log.new_data?.date_test) {
      return new Date(log.new_data.date_test);
    }
    return new Date(log.created_at);
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE': return <FiPlus size={16} />;
      case 'UPDATE': return <FiEdit size={16} />;
      case 'DELETE': return <FiTrash2 size={16} />;
      case 'REEVALUATION': return <FiTrendingUp size={16} />;
      case 'DEPRECIATION': return <FiTrendingDown size={16} />;
      case 'RECALCUL': return <FiRefreshCw size={16} />;
      case 'SORTIE': return <FiPackage size={16} />;
      default: return <FiActivity size={16} />;
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      case 'REEVALUATION': return '#f59e0b';
      case 'DEPRECIATION': return '#8b5cf6';
      case 'RECALCUL': return '#06b6d4';
      case 'SORTIE': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const getActionLabel = (action) => {
    switch(action) {
      case 'CREATE': return 'Création';
      case 'UPDATE': return 'Modification';
      case 'DELETE': return 'Suppression';
      case 'REEVALUATION': return 'Réévaluation';
      case 'DEPRECIATION': return 'Dépréciation';
      case 'RECALCUL': return 'Recalcul';
      case 'SORTIE': return 'Sortie';
      default: return action;
    }
  };

  const getTableLabel = (table) => {
    switch(table) {
      case 'actifs': return 'Actif';
      case 'users': return 'Utilisateur';
      case 'contrats': return 'Contrat';
      case 'reevaluations': return 'Réévaluation';
      case 'depreciations': return 'Dépréciation';
      case 'documents': return 'Document';
      default: return table;
    }
  };

  const toggleAuditDetails = (auditId) => {
    setSelectedAuditId(selectedAuditId === auditId ? null : auditId);
  };

  if (!canViewAudit) {
    return (
      <div style={styles.errorContainer}>
        <FiShield size={48} color="#ef4444" />
        <h2 style={styles.errorTitle}>Accès non autorisé</h2>
        <p style={styles.errorText}>Vous n'avez pas les permissions nécessaires.</p>
        <p style={styles.errorSubtext}>Cette section est réservée aux administrateurs et auditeurs.</p>
      </div>
    );
  }

  // Styles
  const styles = {
    container: { 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '2rem', 
      backgroundColor: '#f8fafc', 
      minHeight: 'calc(100vh - 80px)' 
    },
    header: { 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    title: { 
      fontSize: '1.8rem', 
      fontWeight: '700',
      margin: 0,
      color: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    subtitle: { 
      color: '#64748b', 
      marginTop: '0.25rem' 
    },
    roleBanner: { 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: isJuridique ? '#fef3c7' : '#dbeafe',
      border: `1px solid ${isJuridique ? '#f59e0b' : '#3b82f6'}`,
      borderRadius: '12px', 
      padding: '0.75rem 1rem', 
      marginBottom: '1.5rem'
    },
    roleBannerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: isJuridique ? '#92400e' : '#1e40af',
      fontSize: '0.8rem',
      fontWeight: '500'
    },
    roleBannerClose: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: isJuridique ? '#92400e' : '#1e40af'
    },
    statsGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
      gap: '1rem', 
      marginBottom: '1.5rem' 
    },
    statCard: { 
      background: '#ffffff',
      borderRadius: '16px', 
      padding: '1rem', 
      textAlign: 'center', 
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    statValue: { 
      fontSize: '1.8rem', 
      fontWeight: 'bold', 
      color: '#0f172a', 
      display: 'block' 
    },
    statLabel: { 
      fontSize: '0.75rem', 
      color: '#64748b',
      marginTop: '0.25rem'
    },
    errorAlert: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      marginBottom: '1rem'
    },
    filtersCard: { 
      background: '#ffffff',
      borderRadius: '16px', 
      padding: '1.5rem', 
      marginBottom: '1.5rem', 
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    filtersGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      marginBottom: '1rem' 
    },
    filterGroup: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.5rem',
      fontSize: '0.8rem',
      color: '#334155',
      fontWeight: '500'
    },
    select: {
      padding: '0.5rem',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: '#0f172a',
      fontSize: '0.875rem',
      cursor: 'pointer',
      outline: 'none'
    },
    dateRange: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center'
    },
    searchBox: {
      display: 'flex',
      gap: '0.5rem'
    },
    searchInput: {
      flex: 1,
      padding: '0.5rem',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: '#0f172a',
      fontSize: '0.875rem',
      outline: 'none'
    },
    searchButton: {
      padding: '0.5rem 1rem',
      background: '#3b82f6',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer'
    },
    filterActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.75rem',
      paddingTop: '1rem',
      borderTop: '1px solid #e2e8f0',
      flexWrap: 'wrap'
    },
    resetButton: {
      padding: '0.5rem 1rem',
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: '#475569',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    exportButton: {
      padding: '0.5rem 1rem',
      background: '#10b981',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    refreshButton: {
      padding: '0.5rem 1rem',
      background: '#f59e0b',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    logsCard: { 
      background: '#ffffff',
      borderRadius: '16px', 
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    loading: { 
      textAlign: 'center', 
      padding: '3rem' 
    },
    spinner: { 
      width: '40px', 
      height: '40px', 
      border: '3px solid #e2e8f0', 
      borderTop: '3px solid #3b82f6', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite', 
      margin: '0 auto 1rem' 
    },
    noData: { 
      textAlign: 'center', 
      padding: '3rem', 
      color: '#64748b' 
    },
    logsList: {
      display: 'flex',
      flexDirection: 'column'
    },
    logItem: {
      borderBottom: '1px solid #f1f5f9'
    },
    logRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    logRowSelected: {
      background: '#f8fafc',
      borderLeft: '4px solid #3b82f6',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      borderRadius: '8px 0 0 8px'
    },
    logIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    logContent: {
      flex: 1
    },
    logHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '0.5rem',
      gap: '0.5rem'
    },
    logBadges: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    actionBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      border: '1px solid'
    },
    tableBadge: {
      padding: '0.25rem 0.75rem',
      backgroundColor: '#f1f5f9',
      borderRadius: '20px',
      fontSize: '0.7rem',
      color: '#475569'
    },
    logDate: {
      fontSize: '0.7rem',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    logMeta: {
      display: 'flex',
      gap: '1rem',
      fontSize: '0.7rem',
      color: '#64748b',
      flexWrap: 'wrap'
    },
    logExpand: {
      color: '#94a3b8',
      flexShrink: 0
    },
    logDetails: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
      marginLeft: '64px'
    },
    detailsHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#0f172a'
    },
    detailsSection: {
      marginBottom: '1rem'
    },
    detailsTitle: {
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#475569',
      marginBottom: '0.5rem'
    },
    noDetails: {
      textAlign: 'center',
      padding: '1rem',
      color: '#64748b',
      fontStyle: 'italic'
    },
    detailsFooter: {
      marginTop: '1rem',
      paddingTop: '0.5rem',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.7rem',
      color: '#64748b',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1rem',
      padding: '1rem'
    },
    gridCard: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    gridCardSelected: {
      borderLeft: '4px solid #3b82f6',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    gridIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.75rem'
    },
    gridContent: {
      flex: 1
    },
    gridHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    gridAction: {
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    gridTable: {
      fontSize: '0.7rem',
      padding: '0.125rem 0.5rem',
      backgroundColor: '#f1f5f9',
      borderRadius: '12px',
      color: '#475569'
    },
    gridUser: {
      fontSize: '0.75rem',
      color: '#475569',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      marginBottom: '0.5rem'
    },
    gridDate: {
      fontSize: '0.7rem',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      marginBottom: '0.5rem'
    },
    gridId: {
      fontSize: '0.65rem',
      color: '#94a3b8',
      fontFamily: 'monospace'
    },
    gridDetails: {
      marginTop: '0.75rem',
      paddingTop: '0.75rem',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      gap: '0.75rem',
      fontSize: '0.7rem',
      color: '#64748b'
    },
    gridDetailsSection: {
      backgroundColor: '#f8fafc',
      padding: '0.25rem 0.5rem',
      borderRadius: '6px'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      borderTop: '1px solid #e2e8f0',
      flexWrap: 'wrap'
    },
    paginationButton: {
      padding: '0.5rem 1rem',
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: '#475569',
      cursor: 'pointer'
    },
    paginationInfo: {
      fontSize: '0.875rem',
      color: '#64748b'
    },
    errorContainer: {
      textAlign: 'center',
      padding: '3rem',
      background: '#ffffff',
      borderRadius: '20px',
      maxWidth: '500px',
      margin: '2rem auto',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    },
    errorTitle: {
      marginTop: '1rem',
      marginBottom: '0.5rem',
      color: '#0f172a'
    },
    errorText: {
      color: '#64748b'
    },
    errorSubtext: {
      fontSize: '0.8rem',
      color: '#94a3b8'
    },
    toast: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  };

  return (
    <div style={styles.container}>
      {/* Bandeau de rôle */}
      {(isJuridique || isAuditeur) && showRoleBanner && (
        <div style={styles.roleBanner}>
          <div style={styles.roleBannerContent}>
            {isJuridique ? <FiShield size={16} /> : <FiEye size={16} />}
            <span>{isJuridique ? 'Mode Judiciaire - Accès limité (conformité RGPD)' : 'Mode Auditeur - Accès complet aux logs'}</span>
          </div>
          <button onClick={() => setShowRoleBanner(false)} style={styles.roleBannerClose}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* En-tête */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <FiActivity style={{ color: '#3b82f6' }} /> Journal d'audit
          </h1>
          <p style={styles.subtitle}>Traçabilité complète des actions utilisateurs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'list' ? '#3b82f6' : 'transparent',
              border: viewMode === 'list' ? 'none' : '1px solid #e2e8f0',
              borderRadius: '8px',
              color: viewMode === 'list' ? '#fff' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiList size={14} /> Liste
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
              border: viewMode === 'grid' ? 'none' : '1px solid #e2e8f0',
              borderRadius: '8px',
              color: viewMode === 'grid' ? '#fff' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiGrid size={14} /> Grille
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiDownload size={14} /> Exporter
          </button>
          <button
            onClick={fetchLogs}
            style={{
              padding: '0.5rem 1rem',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiRefreshCw size={14} /> Rafraîchir
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.total}</span>
          <span style={styles.statLabel}>Total logs</span>
        </div>
        {stats.parAction?.slice(0, 4).map((item, index) => (
          <div key={index} style={styles.statCard}>
            <span style={{ ...styles.statValue, color: getActionColor(item.action) }}>{item.count}</span>
            <span style={styles.statLabel}>{getActionLabel(item.action)}</span>
          </div>
        ))}
      </div>

      {/* Erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.errorAlert}
          >
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          {canFilterByUser && (
            <div style={styles.filterGroup}>
              <label><FiUser size={14} /> Utilisateur</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                style={styles.select}
              >
                <option value="">👥 Tous les utilisateurs</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                    {canViewUserEmails && u.email && ` (${u.email})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.filterGroup}>
            <label><FiPackage size={14} /> Table</label>
            <select
              value={filters.table}
              onChange={(e) => setFilters({ ...filters, table: e.target.value })}
              style={styles.select}
            >
              {tables.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiActivity size={14} /> Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              style={styles.select}
            >
              {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label><FiCalendar size={14} /> Période</label>
            <div style={styles.dateRange}>
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                dateFormat="dd/MM/yyyy"
                placeholderText="Début"
                isClearable
                className="datepicker-input"
              />
              <span>→</span>
              <DatePicker
                selected={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                dateFormat="dd/MM/yyyy"
                placeholderText="Fin"
                isClearable
                minDate={filters.startDate}
                className="datepicker-input"
              />
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label><FiSearch size={14} /> Recherche</label>
            <div style={styles.searchBox}>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher par ID, IP, utilisateur..."
                style={styles.searchInput}
              />
              <button onClick={handleSearch} style={styles.searchButton}>
                <FiSearch size={14} />
              </button>
            </div>
          </div>
        </div>

        <div style={styles.filterActions}>
          <button onClick={handleReset} style={styles.resetButton}>
            <FiFilter size={14} /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste des logs avec heure locale exacte */}
      <div style={styles.logsCard}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Chargement des logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.noData}>
            <FiFileText size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
            <p>Aucun log trouvé</p>
          </div>
        ) : viewMode === 'list' ? (
          <div style={styles.logsList}>
            {logs.map((log, index) => {
              const operationDate = getOperationDate(log);
              const isSelected = selectedAuditId === log.id;
              const actionColor = getActionColor(log.action);
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.01 }}
                  style={styles.logItem}
                >
                  <div
                    onClick={() => toggleAuditDetails(log.id)}
                    style={{ ...styles.logRow, ...(isSelected ? styles.logRowSelected : {}) }}
                  >
                    <div style={{ ...styles.logIcon, backgroundColor: `${actionColor}20`, color: actionColor }}>
                      {getActionIcon(log.action)}
                    </div>
                    <div style={styles.logContent}>
                      <div style={styles.logHeader}>
                        <div style={styles.logBadges}>
                          <span style={{ ...styles.actionBadge, backgroundColor: `${actionColor}15`, color: actionColor, borderColor: `${actionColor}30` }}>
                            {getActionIcon(log.action)} {getActionLabel(log.action)}
                          </span>
                          <span style={styles.tableBadge}>{getTableLabel(log.table_name)}</span>
                        </div>
                        {/* ✅ Utilisation de formatLocalDateTime pour l'heure exacte */}
                        <span style={styles.logDate}>
                          <FiClock size={12} /> {formatLocalDateTime(operationDate)}
                        </span>
                      </div>
                      <div style={styles.logMeta}>
                        <span><FiUser size={12} /> {log.utilisateur?.full_name || 'Système'}</span>
                        {log.record_id && <span>ID: {log.record_id.substring(0, 12)}...</span>}
                        {log.ip_address && <span>🌐 {log.ip_address}</span>}
                      </div>
                    </div>
                    <div style={styles.logExpand}>
                      {isSelected ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={styles.logDetails}
                      >
                        <div style={styles.detailsHeader}>
                          <FiFileText size={14} /> Détails de l'opération
                        </div>
                        
                        {log.old_data && Object.keys(log.old_data).length > 0 && (
                          <div style={styles.detailsSection}>
                            <div style={styles.detailsTitle}>📜 Anciennes valeurs</div>
                            {formatAuditData(log.old_data, 'old')}
                          </div>
                        )}
                        
                        {log.new_data && Object.keys(log.new_data).length > 0 && (
                          <div style={styles.detailsSection}>
                            <div style={styles.detailsTitle}>✨ Nouvelles valeurs</div>
                            {formatAuditData(log.new_data, 'new')}
                          </div>
                        )}
                        
                        {(!log.old_data || Object.keys(log.old_data).length === 0) &&
                         (!log.new_data || Object.keys(log.new_data).length === 0) && (
                          <div style={styles.noDetails}>
                            Aucune donnée détaillée disponible
                          </div>
                        )}
                        
                        <div style={styles.detailsFooter}>
                          <span>🆔 ID complet: {log.record_id || 'N/A'}</span>
                          <span>🌐 Adresse IP: {log.ip_address || 'N/A'}</span>
                          {/* ✅ Utilisation de formatLocalDateTime pour l'heure exacte */}
                          <span>📅 Date action: {formatLocalDateTime(log.action_date || log.created_at)}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div style={styles.gridContainer}>
            {logs.map((log) => {
              const operationDate = getOperationDate(log);
              const actionColor = getActionColor(log.action);
              const isSelected = selectedAuditId === log.id;
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => toggleAuditDetails(log.id)}
                  style={{ ...styles.gridCard, ...(isSelected ? styles.gridCardSelected : {}) }}
                >
                  <div style={{ ...styles.gridIcon, backgroundColor: `${actionColor}15`, color: actionColor }}>
                    {getActionIcon(log.action)}
                  </div>
                  <div style={styles.gridContent}>
                    <div style={styles.gridHeader}>
                      <span style={{ ...styles.gridAction, color: actionColor }}>{getActionLabel(log.action)}</span>
                      <span style={styles.gridTable}>{getTableLabel(log.table_name)}</span>
                    </div>
                    <div style={styles.gridUser}>
                      <FiUser size={12} /> {log.utilisateur?.full_name || 'Système'}
                    </div>
                    {/* ✅ Utilisation de formatLocalDateTime pour l'heure exacte */}
                    <div style={styles.gridDate}>
                      <FiClock size={12} /> {formatLocalDateTime(operationDate)}
                    </div>
                    {log.record_id && (
                      <div style={styles.gridId}>ID: {log.record_id.substring(0, 10)}...</div>
                    )}
                  </div>
                  {isSelected && (
                    <div style={styles.gridDetails}>
                      {log.old_data && Object.keys(log.old_data).length > 0 && (
                        <div style={styles.gridDetailsSection}>📜 {Object.keys(log.old_data).length} champ(s) modifié(s)</div>
                      )}
                      {log.new_data && Object.keys(log.new_data).length > 0 && (
                        <div style={styles.gridDetailsSection}>✨ {Object.keys(log.new_data).length} nouvelle(s) valeur(s)</div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...styles.paginationButton, opacity: page === 1 ? 0.5 : 1 }}
            >
              ◀ Précédent
            </button>
            <span style={styles.paginationInfo}>
              Page {page} sur {Math.ceil(total / limit)} ({total} logs)
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              style={{ ...styles.paginationButton, opacity: page >= Math.ceil(total / limit) ? 0.5 : 1 }}
            >
              Suivant ▶
            </button>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
          {toast.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .datepicker-input {
          flex: 1;
          padding: 0.5rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        .datepicker-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        }
        .react-datepicker {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
};  

export default AuditList;