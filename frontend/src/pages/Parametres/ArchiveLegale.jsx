// frontend/src/pages/Parametres/ArchiveLegale.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import usePermissions from '../../hooks/usePermissions';
import { 
  FiArrowLeft, FiArchive, FiDownload, FiSearch, FiUpload, 
  FiTrash2, FiEye, FiFile, FiFileText, FiImage,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiFilter,
  FiCalendar, FiDatabase, FiHardDrive, FiClock,
  FiAlertCircle, FiPlus, FiPrinter, FiShare2,
  FiGrid, FiList, FiShield, FiZap, FiStar, FiBarChart2,
  FiLock, FiUnlock, FiUser, FiGlobe, FiTrendingUp,
  FiBookOpen, FiCopy, FiMail, FiSend, FiBell, FiSettings
} from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import api from '../../services/api';
import DocumentViewer from '../../components/DocumentViewer/DocumentViewer';
import { format, subDays, differenceInDays, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ArchiveLegale = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { user } = useSelector(state => state.auth);
  
  const canView = can(['admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste', 'juridique']);
  const canUpload = can(['admin', 'comptable', 'informatique', 'gestionnaire', 'juridique']);
  const canDelete = can(['admin', 'informatique']);
  const canAudit = can(['admin', 'auditeur']);
  
  // États principaux
  const [archives, setArchives] = useState([]);
  const [filteredArchives, setFilteredArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [annee, setAnnee] = useState('');
  const [typeFichier, setTypeFichier] = useState('');
  const [categorie, setCategorie] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAccessLogsModal, setShowAccessLogsModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    nom: '',
    description: '',
    type: 'PDF',
    categorie: 'reglementation',
    duree_conservation: 10,
    confidentialite: 'public',
    mots_cles: ''
  });
  const [downloading, setDownloading] = useState(false);
  const [viewer, setViewer] = useState({ open: false, file: null, filename: null, fileType: null });
  const [viewMode, setViewMode] = useState('grid');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [accessLogs, setAccessLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    taille_totale: 0,
    par_type: [],
    par_categorie: [],
    par_mois: [],
    evolution: []
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Catégories de documents BCC
  const categories = [
    { value: 'reglementation', label: 'Réglementation BCC', icon: '📜', color: '#3b82f6' },
    { value: 'circulaire', label: 'Circulaires', icon: '📢', color: '#10b981' },
    { value: 'decision', label: 'Décisions', icon: '⚖️', color: '#f59e0b' },
    { value: 'rapport', label: 'Rapports annuels', icon: '📊', color: '#8b5cf6' },
    { value: 'contrat', label: 'Contrats', icon: '📄', color: '#ec4899' },
    { value: 'proces-verbal', label: 'Procès-verbaux', icon: '📝', color: '#14b8a6' },
    { value: 'notes', label: 'Notes de service', icon: '📋', color: '#a855f7' },
    { value: 'autres', label: 'Autres', icon: '📁', color: '#64748b' }
  ];

  const typesFichiers = [
    { value: 'PDF', label: 'PDF', icon: '📄', color: '#ef4444', bg: '#fee2e2' },
    { value: 'XLSX', label: 'Excel', icon: '📊', color: '#10b981', bg: '#d1fae5' },
    { value: 'DOCX', label: 'Word', icon: '📝', color: '#3b82f6', bg: '#dbeafe' },
    { value: 'JPG', label: 'Image', icon: '🖼️', color: '#f59e0b', bg: '#fed7aa' },
    { value: 'ZIP', label: 'Archive', icon: '🗜️', color: '#8b5cf6', bg: '#f3e8ff' },
    { value: 'PPTX', label: 'PowerPoint', icon: '📽️', color: '#ec489a', bg: '#fce7f3' }
  ];

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      size: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type.split('/')[1]?.toUpperCase() || 'PDF',
      preview: URL.createObjectURL(file)
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/zip': ['.zip'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    }, 
    maxSize: 50 * 1024 * 1024 
  });

  useEffect(() => {
    if (canView) {
      fetchDocuments();
      fetchStats();
      if (canAudit) fetchAccessLogs();
    }
  }, [canView, canAudit]);

  useEffect(() => {
    filterArchives();
  }, [archives, searchTerm, annee, typeFichier, categorie]);

  // ✅ CORRECTION 1: fetchDocuments avec response.data.data
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents/all');
      
      // Les données sont dans response.data.data
      const documentsData = response.data.data || response.data;
      
      // Si c'est un objet avec une propriété data, l'extraire
      const actualData = Array.isArray(documentsData) ? documentsData : (documentsData.data || []);
      
      const formattedDocs = actualData.map(doc => ({
        id: doc.id,
        nom: doc.nom_fichier,
        type: doc.type_fichier?.split('/')[1]?.toUpperCase() || 'PDF',
        date: doc.date_upload?.split('T')[0] || doc.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        taille: (doc.taille_fichier / (1024 * 1024)).toFixed(2),
        description: doc.description || '',
        uploadedBy: doc.createur_nom || doc.createurDocument?.full_name || 'Système',
        uploadedAt: doc.date_upload || doc.created_at,
        reference: doc.nom_fichier,
        auteur: 'Banque Centrale du Congo',
        categorie: doc.categorie || 'reglementation',
        duree_conservation: doc.duree_conservation || 10,
        confidentialite: doc.confidentialite || 'public',
        mots_cles: doc.mots_cles || '',
        nombre_telechargements: doc.nombre_telechargements || 0,
        nombre_consultations: doc.nombre_consultations || 0,
        date_expiration: doc.date_expiration || (() => {
          const date = new Date(doc.date_upload || doc.created_at || new Date());
          date.setFullYear(date.getFullYear() + 10);
          return date.toISOString();
        })()
      }));
      
      setArchives(formattedDocs);
      setFilteredArchives(formattedDocs);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setError('Impossible de charger les archives');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECTION 2: fetchStats avec response.data.data
  const fetchStats = async () => {
    try {
      const response = await api.get('/documents/stats');
      const statsData = response.data.data || response.data;
      setStats({
        total: statsData.total || 0,
        taille_totale: statsData.taille_totale || 0,
        par_type: statsData.par_type || [],
        par_categorie: statsData.par_categorie || [],
        par_mois: statsData.par_mois || [],
        evolution: statsData.evolution || []
      });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // ✅ CORRECTION 3: fetchAccessLogs avec response.data.data
  const fetchAccessLogs = async () => {
    try {
      const response = await api.get('/documents/access-logs');
      const logsData = response.data.data || response.data;
      setAccessLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error('Erreur chargement logs d\'accès:', err);
    }
  };

  const filterArchives = () => {
    let filtered = [...archives];
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.reference && a.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.mots_cles && a.mots_cles.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (annee) filtered = filtered.filter(a => a.date.includes(annee));
    if (typeFichier) filtered = filtered.filter(a => a.type === typeFichier);
    if (categorie) filtered = filtered.filter(a => a.categorie === categorie);
    setFilteredArchives(filtered);
  };

  const logAccess = async (documentId, action) => {
    try {
      await api.post('/documents/log-access', { documentId, action });
    } catch (err) {
      console.error('Erreur log accès:', err);
    }
  };

  const handleDownload = async (archive) => {
    setDownloading(true);
    try {
      await logAccess(archive.id, 'DOWNLOAD');
      const response = await api.get(`/documents/${archive.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', archive.nom);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(`Téléchargement de "${archive.nom}" démarré avec succès`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors du téléchargement du document');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const openDocumentInViewer = async (archive) => {
    try {
      await logAccess(archive.id, 'VIEW');
      const response = await api.get(`/documents/${archive.id}/download`, { responseType: 'blob' });
      setViewer({ open: true, file: response.data, filename: archive.nom, fileType: archive.type.toLowerCase() });
    } catch (err) {
      setError('Impossible d\'ouvrir le document');
      setTimeout(() => setError(''), 3000);
    }
  };

  const closeViewer = () => { setViewer({ open: false, file: null, filename: null, fileType: null }); };
  const handlePreview = (archive) => openDocumentInViewer(archive);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) { setError('Veuillez sélectionner au moins un fichier'); return; }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      let successCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', selectedFile.file);
        formData.append('actif_id', '');
        formData.append('description', uploadForm.description);
        formData.append('categorie', uploadForm.categorie);
        formData.append('duree_conservation', uploadForm.duree_conservation);
        formData.append('confidentialite', uploadForm.confidentialite);
        formData.append('mots_cles', uploadForm.mots_cles);
        
        await api.post('/documents/upload', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        successCount++;
      }
      
      setSuccess(`${successCount} document(s) ajouté(s) avec succès dans l'archive légale`);
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadForm({ nom: '', description: '', type: 'PDF', categorie: 'reglementation', duree_conservation: 10, confidentialite: 'public', mots_cles: '' });
      fetchDocuments();
      fetchStats();
    } catch (err) {
      console.error('Erreur upload:', err);
      setError('Erreur lors de l\'upload des documents');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleShare = async () => {
    if (!shareEmail) { setError('Veuillez saisir une adresse email'); return; }
    try {
      await api.post('/documents/share', { documentId: selectedDocument?.id, email: shareEmail, message: shareMessage });
      setSuccess(`Document partagé avec ${shareEmail}`);
      setShowShareModal(false);
      setShareEmail('');
      setShareMessage('');
    } catch (err) {
      setError('Erreur lors du partage');
    }
  };

  const confirmDelete = (document) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await api.delete(`/documents/${documentToDelete.id}`);
      setSuccess('Document supprimé avec succès');
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      fetchDocuments();
      fetchStats();
    } catch (err) { 
      setError('Erreur lors de la suppression'); 
    }
  };

  const handleReset = () => { setSearchTerm(''); setAnnee(''); setTypeFichier(''); setCategorie(''); };

  const getTypeBadge = (type) => {
    const typeConfig = typesFichiers.find(t => t.value === type) || typesFichiers[0];
    return (<span style={{ ...styles.typeBadge, backgroundColor: typeConfig.bg, color: typeConfig.color }}>{typeConfig.icon} {typeConfig.label}</span>);
  };

  const getCategorieBadge = (categorie) => {
    const catConfig = categories.find(c => c.value === categorie) || categories[0];
    return (<span style={{ ...styles.categorieBadge, backgroundColor: `${catConfig.color}20`, color: catConfig.color }}>{catConfig.icon} {catConfig.label}</span>);
  };

  const getConfidentialiteIcon = (confidentialite) => {
    if (confidentialite === 'confidentiel') return <FiLock size={12} color="#ef4444" />;
    if (confidentialite === 'restreint') return <FiLock size={12} color="#f59e0b" />;
    return <FiUnlock size={12} color="#10b981" />;
  };

  const getTotalSize = () => filteredArchives.reduce((total, a) => total + (parseFloat(a.taille) || 0), 0).toFixed(1);
  const getDocumentsExpirant = () => filteredArchives.filter(a => differenceInDays(new Date(a.date_expiration), new Date()) <= 90).length;
  
  const getAnneeOptions = () => [...new Set(archives.map(a => a.date.split('-')[0]))].sort().reverse();
  const generateStatsChartData = () => stats.par_type || [];
  const generateEvolutionData = () => stats.evolution || [];

  const exportToExcel = () => {
    const exportData = filteredArchives.map(a => ({
      'Nom': a.nom,
      'Type': a.type,
      'Catégorie': categories.find(c => c.value === a.categorie)?.label || a.categorie,
      'Date': a.date,
      'Taille (MB)': a.taille,
      'Description': a.description,
      'Téléchargements': a.nombre_telechargements,
      'Consultations': a.nombre_consultations,
      'Confidentialité': a.confidentialite,
      'Date expiration': new Date(a.date_expiration).toLocaleDateString('fr-FR')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Archive Legale BCC');
    XLSX.writeFile(wb, `archive_legale_bcc_${new Date().toISOString().split('T')[0]}.xlsx`);
    setSuccess('Export Excel effectué');
    setTimeout(() => setSuccess(''), 3000);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.setTextColor(139, 92, 246);
    doc.text("Archive légale - Banque Centrale du Congo", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 25);
    doc.text(`Nombre de documents: ${filteredArchives.length}`, 14, 32);
    
    const tableData = filteredArchives.map(a => [
      a.nom,
      a.type,
      categories.find(c => c.value === a.categorie)?.label || a.categorie,
      new Date(a.date).toLocaleDateString('fr-FR'),
      `${a.taille} MB`
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['Document', 'Type', 'Catégorie', 'Date', 'Taille']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] }
    });
    
    doc.save(`archive_legale_${new Date().toISOString().split('T')[0]}.pdf`);
    setSuccess('Export PDF effectué');
    setTimeout(() => setSuccess(''), 3000);
  };

  const removeFile = (index) => { setSelectedFiles(prev => prev.filter((_, i) => i !== index)); };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#a855f7'];

  if (!canView && !loading) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <div style={styles.accessDenied}>
          <FiAlertCircle size={48} color="#ef4444" />
          <h2>Accès non autorisé</h2>
          <p>Vous n'avez pas les droits pour accéder à l'archive légale.</p>
          <button onClick={() => navigate('/parametres')} style={styles.backButtonAccess}><FiArrowLeft /> Retour aux paramètres</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ color: 'white' }}>Chargement des archives BCC...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
      
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <div style={styles.container}>
          
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <button onClick={() => navigate('/parametres')} style={styles.backButton}>
                <FiArrowLeft size={18} /> Retour
              </button>
              <div style={styles.headerInfo}>
                <div style={styles.iconWrapper}>
                  <FiArchive size={28} color="#fff" />
                </div>
                <div>
                  <h1 style={styles.title}>Archive légale - BCC</h1>
                  <p style={styles.subtitle}>Banque Centrale du Congo - Gestion des documents juridiques et administratifs</p>
                </div>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button onClick={() => setShowStatsModal(true)} style={styles.statsButton}>
                <FiBarChart2 /> Statistiques
              </button>
              {canAudit && (
                <button onClick={() => setShowAccessLogsModal(true)} style={styles.auditButton}>
                  <FiEye /> Logs d'accès
                </button>
              )}
              <button onClick={exportToExcel} style={styles.exportButton}>
                <FiDownload /> Excel
              </button>
              <button onClick={exportToPDF} style={styles.pdfButton}>
                <FiPrinter /> PDF
              </button>
              <button onClick={handleReset} style={styles.resetButton}>
                <FiRefreshCw /> Réinitialiser
              </button>
              {canUpload && (
                <button onClick={() => setShowUploadModal(true)} style={styles.uploadButton}>
                  <FiUpload /> Ajouter
                </button>
              )}
            </div>
          </div>

          {/* Vue toggle */}
          <div style={styles.viewToggleContainer}>
            <button onClick={() => setViewMode('grid')} style={{ ...styles.viewButton, ...(viewMode === 'grid' ? styles.viewButtonActive : {}) }}>
              <FiGrid /> Grille
            </button>
            <button onClick={() => setViewMode('list')} style={{ ...styles.viewButton, ...(viewMode === 'list' ? styles.viewButtonActive : {}) }}>
              <FiList /> Liste
            </button>
          </div>

          {downloading && (
            <div style={styles.downloadingMessage}>
              <div style={styles.spinnerSmall}></div>
              <span>Préparation du téléchargement...</span>
            </div>
          )}
          {success && (
            <div style={styles.successMessage}>
              <FiCheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div style={styles.errorMessage}>
              <FiXCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.content}>
            {/* Statistiques avancées */}
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}>
                <div style={styles.statIconWhite}><FiArchive size={24} color="white" /></div>
                <div style={styles.statInfo}><span style={styles.statLabelWhite}>Documents</span><span style={styles.statValueWhite}>{filteredArchives.length}</span></div>
              </div>
              <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}>
                <div style={styles.statIconWhite}><FiHardDrive size={24} color="white" /></div>
                <div style={styles.statInfo}><span style={styles.statLabelWhite}>Taille totale</span><span style={styles.statValueWhite}>{getTotalSize()} MB</span></div>
              </div>
              <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                <div style={styles.statIconWhite}><FiClock size={24} color="white" /></div>
                <div style={styles.statInfo}><span style={styles.statLabelWhite}>Expire dans 90j</span><span style={styles.statValueWhite}>{getDocumentsExpirant()}</span></div>
              </div>
              <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
                <div style={styles.statIconWhite}><FiDownload size={24} color="white" /></div>
                <div style={styles.statInfo}><span style={styles.statLabelWhite}>Types distincts</span><span style={styles.statValueWhite}>{[...new Set(archives.map(a => a.type))].length}</span></div>
              </div>
            </div>

            {/* Filtres avancés */}
            <div style={styles.filtersSection}>
              <div style={styles.searchWrapper}>
                <FiSearch size={18} color="#94a3b8" style={styles.searchIcon} />
                <input type="text" placeholder="Rechercher par titre, référence, mots-clés..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
              </div>
              <div style={styles.filterGroup}>
                <FiFilter size={18} color="#94a3b8" />
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={styles.filterSelect}>
                  <option value="">Toutes catégories</option>
                  {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <select value={typeFichier} onChange={(e) => setTypeFichier(e.target.value)} style={styles.filterSelect}>
                  <option value="">Tous les types</option>
                  {typesFichiers.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <select value={annee} onChange={(e) => setAnnee(e.target.value)} style={styles.filterSelect}>
                  <option value="">Toutes les années</option>
                  {getAnneeOptions().map(an => <option key={an} value={an}>{an}</option>)}
                </select>
              </div>
              {(searchTerm || annee || typeFichier || categorie) && (
                <button onClick={handleReset} style={styles.clearButton}>
                  <FiXCircle size={14} /> Effacer
                </button>
              )}
            </div>

            {/* Vue Grille */}
            {viewMode === 'grid' && filteredArchives.length === 0 ? (
              <div style={styles.emptyState}>
                <FiAlertCircle size={64} color="#cbd5e1" />
                <h4 style={styles.emptyTitle}>Aucun document trouvé</h4>
                <p style={styles.emptyText}>Aucun document ne correspond à vos critères de recherche</p>
                {canUpload && <button onClick={() => setShowUploadModal(true)} style={styles.emptyButton}><FiPlus /> Ajouter un document</button>}
              </div>
            ) : viewMode === 'grid' ? (
              <div style={styles.cardsGrid}>
                {filteredArchives.map(archive => {
                  const typeConfig = typesFichiers.find(t => t.value === archive.type) || typesFichiers[0];
                  const catConfig = categories.find(c => c.value === archive.categorie) || categories[0];
                  const estExpirant = differenceInDays(new Date(archive.date_expiration), new Date()) <= 90;
                  return (
                    <div key={archive.id} style={{ ...styles.card, border: estExpirant ? '1px solid #f59e0b' : '1px solid #e5e7eb' }}>
                      <div style={styles.cardHeader}>
                        <span style={{ fontSize: '2rem' }}>{typeConfig.icon}</span>
                        <div style={styles.cardBadges}>
                          {estExpirant && <span style={styles.expiringBadge}>⚠️ Expire bientôt</span>}
                          {archive.confidentialite === 'confidentiel' && <span style={styles.confidentialBadge}>🔒 Confidentiel</span>}
                        </div>
                      </div>
                      <div style={styles.cardBody}>
                        <strong style={styles.cardTitle}>{archive.nom}</strong>
                        <div style={styles.cardMeta}>
                          <span style={{ ...styles.categorieTag, backgroundColor: `${catConfig.color}20`, color: catConfig.color }}>{catConfig.icon} {catConfig.label}</span>
                          {getConfidentialiteIcon(archive.confidentialite)}
                        </div>
                        <div style={styles.cardStats}>
                          <small><FiEye size={10} /> {archive.nombre_consultations}</small>
                          <small><FiDownload size={10} /> {archive.nombre_telechargements}</small>
                          <small><FiCalendar size={10} /> {new Date(archive.date).toLocaleDateString('fr-FR')}</small>
                        </div>
                        {archive.description && <small style={styles.cardDesc}>{archive.description.substring(0, 60)}...</small>}
                      </div>
                      <div style={styles.cardFooter}>
                        <div style={styles.cardUser}>
                          <small><FiUser size={10} /> {archive.uploadedBy}</small>
                        </div>
                        <div style={styles.cardActions}>
                          <button onClick={() => handlePreview(archive)} style={styles.previewButton} title="Aperçu"><FiEye size={14} /></button>
                          <button onClick={() => handleDownload(archive)} style={styles.downloadButton} title="Télécharger" disabled={downloading}><FiDownload size={14} /></button>
                          <button onClick={() => { setSelectedDocument(archive); setShowShareModal(true); }} style={styles.shareButton} title="Partager"><FiShare2 size={14} /></button>
                          {canDelete && <button onClick={() => confirmDelete(archive)} style={styles.deleteButton} title="Supprimer"><FiTrash2 size={14} /></button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : filteredArchives.length === 0 ? (
              <div style={styles.emptyState}>
                <FiAlertCircle size={64} color="#cbd5e1" />
                <h4 style={styles.emptyTitle}>Aucun document trouvé</h4>
                <p style={styles.emptyText}>Aucun document ne correspond à vos critères de recherche</p>
                {canUpload && <button onClick={() => setShowUploadModal(true)} style={styles.emptyButton}><FiPlus /> Ajouter un document</button>}
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Document</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Catégorie</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Taille</th>
                      <th style={styles.th}>Stats</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchives.map(archive => (
                      <tr key={archive.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.documentInfo}>
                            <FiFileText size={16} color="#8b5cf6" />
                            <div><strong>{archive.nom}</strong><small style={styles.documentRef}>{archive.reference}</small></div>
                          </div>
                        </td>
                        <td style={styles.td}>{getTypeBadge(archive.type)}</td>
                        <td style={styles.td}>{getCategorieBadge(archive.categorie)}</td>
                        <td style={styles.td}>{new Date(archive.date).toLocaleDateString('fr-FR')}</td>
                        <td style={styles.td}><span style={styles.sizeBadge}>{archive.taille} MB</span></td>
                        <td style={styles.td}>
                          <div style={styles.statsCell}>
                            <span title="Consultations"><FiEye size={12} /> {archive.nombre_consultations}</span>
                            <span title="Téléchargements"><FiDownload size={12} /> {archive.nombre_telechargements}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button onClick={() => handlePreview(archive)} style={styles.previewButton} title="Aperçu"><FiEye size={14} /></button>
                            <button onClick={() => handleDownload(archive)} style={styles.downloadButton} title="Télécharger"><FiDownload size={14} /></button>
                            <button onClick={() => { setSelectedDocument(archive); setShowShareModal(true); }} style={styles.shareButton} title="Partager"><FiShare2 size={14} /></button>
                            {canDelete && <button onClick={() => confirmDelete(archive)} style={styles.deleteButton} title="Supprimer"><FiTrash2 size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <small style={styles.footerText}><FiShield size={12} /> Archive légale - Documents certifiés conformes aux normes BCC - Conservation 10 ans</small>
          </div>
        </div>
      </div>

      {/* Modal Statistiques */}
      {showStatsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowStatsModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}><FiBarChart2 size={24} color="#8b5cf6" /></div>
              <div><h3 style={styles.modalTitle}>Statistiques de l'archive légale</h3><p style={styles.modalSubtitle}>Analyse des documents BCC</p></div>
              <button onClick={() => setShowStatsModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.statsChartsContainer}>
                <div style={styles.chartBox}>
                  <h4>Répartition par type</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={generateStatsChartData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {generateStatsChartData().map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.chartBox}>
                  <h4>Évolution mensuelle</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={generateEvolutionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={styles.statsSummary}>
                <div><strong>Total documents:</strong> {stats.total}</div>
                <div><strong>Taille totale:</strong> {(stats.taille_totale / (1024 * 1024)).toFixed(2)} MB</div>
                <div><strong>Documents confidentiels:</strong> {archives.filter(a => a.confidentialite === 'confidentiel').length}</div>
              </div>
            </div>
            <div style={styles.modalFooter}><button onClick={() => setShowStatsModal(false)} style={styles.cancelButton}>Fermer</button></div>
          </div>
        </div>
      )}

      {/* Modal Logs d'accès */}
      {showAccessLogsModal && canAudit && (
        <div style={styles.modalOverlay} onClick={() => setShowAccessLogsModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}><FiEye size={24} color="#8b5cf6" /></div>
              <div><h3 style={styles.modalTitle}>Logs d'accès</h3><p style={styles.modalSubtitle}>Traçabilité des consultations et téléchargements</p></div>
              <button onClick={() => setShowAccessLogsModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead><tr><th>Date</th><th>Utilisateur</th><th>Document</th><th>Action</th><th>IP</th></tr></thead>
                  <tbody>
                    {accessLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.action_date || log.created_at).toLocaleString('fr-FR')}</td>
                        <td>{log.user_name || log.user?.full_name || 'Inconnu'}</td>
                        <td>{log.document_name || log.document?.nom_fichier || 'N/A'}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: log.action === 'VIEW' ? '#dbeafe' : '#d1fae5', color: log.action === 'VIEW' ? '#3b82f6' : '#10b981' }}>{log.action === 'VIEW' ? 'Consultation' : 'Téléchargement'}</span></td>
                        <td>{log.ip_address || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={styles.modalFooter}><button onClick={() => setShowAccessLogsModal(false)} style={styles.cancelButton}>Fermer</button></div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {showUploadModal && canUpload && (
        <div style={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}><FiUpload size={24} color="#8b5cf6" /></div>
              <div><h3 style={styles.modalTitle}>Ajouter des documents BCC</h3><p style={styles.modalSubtitle}>Glissez-déposez ou sélectionnez des fichiers</p></div>
              <button onClick={() => setShowUploadModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div {...getRootProps()} style={styles.uploadArea}>
                <input {...getInputProps()} />
                {isDragActive ? <><FiUpload size={48} color="#8b5cf6" /><p>Relâchez les fichiers ici...</p></> : <><FiUpload size={48} color="#8b5cf6" /><p>Glissez-déposez des fichiers ici ou cliquez pour sélectionner</p><small>PDF, Excel, Word, Image, ZIP, PPT - Max 50 MB</small></>}
              </div>
              {selectedFiles.length > 0 && (
                <div style={styles.selectedFilesList}>
                  <strong>Fichiers sélectionnés ({selectedFiles.length}) :</strong>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} style={styles.selectedFileItem}>
                      <span>{file.icon || '📄'} {file.name} ({file.size} MB)</span>
                      <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {uploadProgress > 0 && <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} /><span>{uploadProgress}%</span></div>}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Catégorie</label>
                  <select value={uploadForm.categorie} onChange={(e) => setUploadForm({ ...uploadForm, categorie: e.target.value })} style={styles.formSelect}>
                    {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Confidentialité</label>
                  <select value={uploadForm.confidentialite} onChange={(e) => setUploadForm({ ...uploadForm, confidentialite: e.target.value })} style={styles.formSelect}>
                    <option value="public">Public</option>
                    <option value="restreint">Restreint</option>
                    <option value="confidentiel">Confidentiel</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Durée de conservation (ans)</label>
                <input type="number" value={uploadForm.duree_conservation} onChange={(e) => setUploadForm({ ...uploadForm, duree_conservation: parseInt(e.target.value) })} style={styles.formInput} min="1" max="100" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Mots-clés (séparés par des virgules)</label>
                <input type="text" value={uploadForm.mots_cles} onChange={(e) => setUploadForm({ ...uploadForm, mots_cles: e.target.value })} placeholder="Ex: taux change, circulaire, 2025" style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Description du document..." rows="2" style={styles.formTextarea} />
              </div>
              <div style={styles.infoBox}>
                <FiAlertCircle size={16} color="#8b5cf6" />
                <span>Les documents ajoutés seront automatiquement référencés et archivés selon les normes BCC. Conservation: {uploadForm.duree_conservation} ans.</span>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowUploadModal(false)} style={styles.cancelButton}>Annuler</button>
              <button onClick={handleUpload} style={styles.confirmButton} disabled={uploading}>
                {uploading ? <><div style={styles.savingSpinner}></div>Upload en cours...</> : <><FiUpload /> Ajouter ({selectedFiles.length} fichier(s))</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de partage */}
      {showShareModal && selectedDocument && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}><FiShare2 size={24} color="#8b5cf6" /></div>
              <div><h3 style={styles.modalTitle}>Partager un document</h3><p style={styles.modalSubtitle}>{selectedDocument.nom}</p></div>
              <button onClick={() => setShowShareModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Email du destinataire</label>
                <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="collegue@bcc.cd" style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Message (optionnel)</label>
                <textarea value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} placeholder="Bonjour, veuillez trouver ci-joint le document..." rows="3" style={styles.formTextarea} />
              </div>
              <div style={styles.infoBox}><FiMail size={16} color="#8b5cf6" /><span>Un email sera envoyé au destinataire avec un lien de téléchargement sécurisé.</span></div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowShareModal(false)} style={styles.cancelButton}>Annuler</button>
              <button onClick={handleShare} style={styles.confirmButton}><FiSend size={14} /> Partager</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {showDeleteModal && documentToDelete && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}><FiTrash2 size={24} color="#ef4444" /></div>
              <div><h3 style={styles.modalTitle}>Confirmer la suppression</h3><p style={styles.modalSubtitle}>Cette action est irréversible</p></div>
              <button onClick={() => setShowDeleteModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <p>Êtes-vous sûr de vouloir supprimer le document <strong>"{documentToDelete.nom}"</strong> ?</p>
              <div style={styles.infoBox}><FiAlertCircle size={16} color="#ef4444" /><span>Cette action supprimera définitivement le document de l'archive légale.</span></div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>Annuler</button>
              <button onClick={handleDelete} style={styles.deleteConfirmButton}>Confirmer la suppression</button>
            </div>
          </div>
        </div>
      )}

      {viewer.open && <DocumentViewer file={viewer.file} filename={viewer.filename} fileType={viewer.fileType} onClose={closeViewer} />}
    </>
  );
};

// Styles
const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { flex: 1 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'white', marginBottom: '1rem' },
  backButtonAccess: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', marginTop: '1rem' },
  accessDenied: { textAlign: 'center', padding: '3rem', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '2rem auto' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: 0 },
  headerActions: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  statsButton: { padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  auditButton: { padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  exportButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  pdfButton: { padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  resetButton: { padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white' },
  uploadButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  viewToggleContainer: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'flex-end' },
  viewButton: { padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white' },
  viewButtonActive: { backgroundColor: '#8b5cf6', color: 'white', borderColor: '#8b5cf6' },
  downloadingMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '10px', marginBottom: '1.5rem', color: '#1e40af', fontSize: '0.875rem', background: 'rgba(59,130,246,0.1)' },
  spinnerSmall: { width: '20px', height: '20px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', color: '#065f46', fontSize: '0.875rem', background: 'rgba(16,185,129,0.1)' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem', background: 'rgba(239,68,68,0.1)' },
  content: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  statIconWhite: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  statInfo: { flex: 1 },
  statLabelWhite: { display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem', opacity: 0.8, color: 'white' },
  statValueWhite: { display: 'block', fontSize: '1.25rem', fontWeight: '700', color: 'white' },
  filtersSection: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' },
  searchWrapper: { flex: 2, position: 'relative', minWidth: '250px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' },
  filterSelect: { border: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', cursor: 'pointer', outline: 'none' },
  clearButton: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', color: '#475569' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1rem', transition: 'all 0.2s', cursor: 'pointer' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
  cardBadges: { display: 'flex', gap: '0.25rem', flexDirection: 'column', alignItems: 'flex-end' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' },
  cardTitle: { fontSize: '0.9rem', color: '#1e293b' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  cardStats: { display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: '#64748b' },
  cardDesc: { fontSize: '0.7rem', color: '#64748b' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' },
  cardUser: { fontSize: '0.65rem', color: '#64748b' },
  cardActions: { display: 'flex', gap: '0.5rem' },
  expiringBadge: { fontSize: '0.6rem', padding: '0.125rem 0.375rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#f59e0b' },
  confidentialBadge: { fontSize: '0.6rem', padding: '0.125rem 0.375rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#ef4444' },
  categorieTag: { fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: '12px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' },
  documentInfo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  documentRef: { display: 'block', fontSize: '0.65rem', color: '#8b5cf6', fontFamily: 'monospace' },
  typeBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  categorieBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  sizeBadge: { display: 'inline-block', padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '500', fontFamily: 'monospace' },
  statsCell: { display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b' },
  actionButtons: { display: 'flex', gap: '0.5rem' },
  previewButton: { padding: '0.375rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  downloadButton: { padding: '0.375rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  shareButton: { padding: '0.375rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  deleteButton: { padding: '0.375rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  deleteConfirmButton: { padding: '0.625rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  emptyState: { textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f8fafc', borderRadius: '12px' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: '1rem 0 0.5rem 0' },
  emptyText: { fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' },
  emptyButton: { padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', minHeight: '400px' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { backgroundColor: 'white', borderRadius: '16px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid #e5e7eb', position: 'relative' },
  modalIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 },
  modalSubtitle: { fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0' },
  modalClose: { position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  modalBody: { padding: '1.5rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8fafc' },
  uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', border: '2px dashed #e2e8f0', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  selectedFilesList: { marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' },
  selectedFileItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.8rem' },
  progressBar: { marginTop: '1rem', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', backgroundColor: '#8b5cf6', transition: 'width 0.3s ease' },
  formGroup: { marginBottom: '1rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  formLabel: { display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formInput: { width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' },
  formSelect: { width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' },
  formTextarea: { width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' },
  infoBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f3e8ff', borderRadius: '8px', fontSize: '0.75rem', color: '#8b5cf6', marginTop: '1rem' },
  cancelButton: { padding: '0.625rem 1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#475569' },
  confirmButton: { padding: '0.625rem 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  savingSpinner: { width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  statsChartsContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' },
  chartBox: { backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px' },
  statsSummary: { display: 'flex', justifyContent: 'space-around', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center' },
  footer: { textAlign: 'center', marginTop: '2rem', paddingTop: '1rem' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }
};

export default ArchiveLegale;