import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCalendar, FiPlus, FiTrash2, FiLock, FiUnlock,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiSearch, FiFilter,
  FiAlertCircle, FiDownload, FiClock, FiTrendingUp, FiBarChart2, FiBookOpen,
  FiEye, FiFileText, FiInfo, FiGrid, FiList, FiZap, FiShield, FiFile
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../../services/api';
import DocumentViewer from '../../components/DocumentViewer/DocumentViewer';

const ExercicesComptablesBCC = () => {
  const navigate = useNavigate();
  const [exercices, setExercices] = useState([]);
  const [filteredExercices, setFilteredExercices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCloture, setFilterCloture] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedExercice, setSelectedExercice] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [exerciceACloturer, setExerciceACloturer] = useState(null);
  const [pdfViewer, setPdfViewer] = useState({ open: false, file: null, filename: null, fileType: null });
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [newExercice, setNewExercice] = useState({
    annee: new Date().getFullYear(),
    date_debut: `${new Date().getFullYear()}-01-01`,
    date_fin: `${new Date().getFullYear()}-12-31`,
  });

  const [clotureData, setClotureData] = useState({
    date_cloture: new Date().toISOString().split('T')[0],
    date_approbation: '',
    resultat: 0,
    report_a_nouveau: 0,
    observations: '',
    reservesChange: 0,
    operationsRefinancement: 0,
    rapportPolitiqueMonetaire: ''
  });

  // Charger les exercices
  const loadExercices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exercices');
      setExercices(response.data);
      setFilteredExercices(response.data);
    } catch (err) {
      console.error('Erreur chargement exercices:', err);
      setError('Impossible de charger les exercices comptables de la BCC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercices();
  }, []);

  useEffect(() => {
    filterExercices();
  }, [exercices, searchTerm, filterCloture]);

  const filterExercices = () => {
    let filtered = [...exercices];
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.annee.toString().includes(searchTerm) ||
        (e.observations && e.observations.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filterCloture === 'ouvert') {
      filtered = filtered.filter(e => !e.cloture);
    } else if (filterCloture === 'cloture') {
      filtered = filtered.filter(e => e.cloture);
    }
    setFilteredExercices(filtered);
  };

  // Ajouter exercice
  const handleAddExercice = async () => {
    if (!newExercice.date_debut || !newExercice.date_fin) {
      setError('Veuillez remplir toutes les dates');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (newExercice.date_debut >= newExercice.date_fin) {
      setError('La date de début doit être antérieure à la date de fin');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/exercices', newExercice);
      setExercices(prev => [response.data, ...prev]);
      setNewExercice({
        annee: new Date().getFullYear() + 1,
        date_debut: `${new Date().getFullYear() + 1}-01-01`,
        date_fin: `${new Date().getFullYear() + 1}-12-31`,
      });
      setSuccess('Exercice ajouté avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer exercice
  const handleDeleteExercice = async (id) => {
    const exercice = exercices.find(e => e.id === id);
    if (exercice?.cloture) {
      setError('Impossible de supprimer un exercice déjà clôturé');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) {
      try {
        await api.delete(`/exercices/${id}`);
        setExercices(prev => prev.filter(e => e.id !== id));
        setSuccess('Exercice supprimé avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur lors de la suppression');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Clôturer exercice
  const handleCloturer = async () => {
    if (!clotureData.date_cloture) {
      setError('Veuillez renseigner la date de clôture');
      return;
    }
    try {
      setLoading(true);
      const response = await api.put(`/exercices/${exerciceACloturer.id}/cloture`, {
        date_cloture: clotureData.date_cloture,
        date_approbation: clotureData.date_approbation || null,
        resultat: clotureData.resultat || null,
        report_a_nouveau: clotureData.report_a_nouveau || null,
        observations: clotureData.observations,
        reserves_change: clotureData.reservesChange || null,
        operations_refinancement: clotureData.operationsRefinancement || null,
        rapport_politique_monetaire: clotureData.rapportPolitiqueMonetaire || null
      });
      setExercices(prev => prev.map(e => e.id === exerciceACloturer.id ? response.data : e));
      setShowClotureModal(false);
      setExerciceACloturer(null);
      setSuccess(`Exercice ${exerciceACloturer.annee} clôturé avec succès`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la clôture');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ VERSION CORRIGÉE - Visualiser le rapport PDF
  const openPDFViewer = async (annee) => {
    try {
      setLoading(true);
      const filename = `Rapport_Annuel_BCC_${annee}.pdf`;
      console.log(`📄 Recherche du document: ${filename}`);
      
      // 1. Récupérer les infos du document
      const docResponse = await api.get(`/documents/by-filename/${filename}`);
      
      // ✅ La réponse peut être directe ou dans data
      const document = docResponse.data.data || docResponse.data;
      
      if (!document || !document.id) {
        console.error('Document non trouvé:', document);
        setError(`Le rapport annuel ${annee} n'est pas disponible dans l'archive`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      console.log(`✅ Document trouvé - ID: ${document.id}`);
      
      // 2. Télécharger le document
      const blobResponse = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob'
      });
      
      // 3. Vérifier que le blob n'est pas vide
      if (blobResponse.data && blobResponse.data.size > 0) {
        setPdfViewer({
          open: true,
          file: blobResponse.data,
          filename: document.nom_fichier || filename,
          fileType: 'pdf'
        });
      } else {
        setError(`Le fichier ${filename} est vide ou corrompu`);
      }
      
    } catch (err) {
      console.error('❌ Erreur chargement PDF:', err);
      if (err.response?.status === 404) {
        setError(`Le rapport annuel ${annee} n'existe pas dans l'archive légale`);
      } else {
        setError(`Impossible de charger le rapport annuel ${annee}`);
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const closePDFViewer = () => {
    setPdfViewer({ open: false, file: null, filename: null, fileType: null });
  };

  const openClotureModal = (exercice) => {
    setExerciceACloturer(exercice);
    setClotureData({
      date_cloture: new Date().toISOString().split('T')[0],
      date_approbation: '',
      resultat: 0,
      report_a_nouveau: 0,
      observations: '',
      reservesChange: 0,
      operationsRefinancement: 0,
      rapportPolitiqueMonetaire: ''
    });
    setShowClotureModal(true);
  };

  const openDetailsModal = (exercice) => {
    setSelectedExercice(exercice);
    setShowDetailsModal(true);
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredExercices.map(exercice => ({
      'Année': exercice.annee,
      'Date début': new Date(exercice.date_debut).toLocaleDateString('fr-FR'),
      'Date fin': new Date(exercice.date_fin).toLocaleDateString('fr-FR'),
      'Statut': exercice.cloture ? 'Clôturé' : 'Ouvert',
      'Date clôture': exercice.date_cloture ? new Date(exercice.date_cloture).toLocaleDateString('fr-FR') : '-',
      'Date approbation': exercice.date_approbation ? new Date(exercice.date_approbation).toLocaleDateString('fr-FR') : '-',
      'Résultat (CDF)': exercice.resultat ? formatNumberForExport(exercice.resultat) : '-',
      'Report à nouveau (CDF)': exercice.report_a_nouveau ? formatNumberForExport(exercice.report_a_nouveau) : '-',
      'Réserves de change (CDF)': exercice.reserves_change ? formatNumberForExport(exercice.reserves_change) : '-',
      'Opérations refinancement (CDF)': exercice.operations_refinancement ? formatNumberForExport(exercice.operations_refinancement) : '-',
      'Rapport politique monétaire': exercice.rapport_politique_monetaire || '-',
      'Observations': exercice.observations || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exercices BCC');
    
    const colWidths = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 30 }
    ];
    ws['!cols'] = colWidths;

    const fileName = `exercices_bcc_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setSuccess('Export Excel effectué avec succès');
    setTimeout(() => setSuccess(''), 3000);
    setShowExportMenu(false);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('Exercices Comptables - Banque Centrale du Congo', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, 14, 25);
    doc.text(`Nombre d'exercices: ${filteredExercices.length}`, 14, 32);
    
    const stats = {
      total: filteredExercices.length,
      ouverts: filteredExercices.filter(e => !e.cloture).length,
      clotures: filteredExercices.filter(e => e.cloture).length,
      resultatTotal: filteredExercices.reduce((sum, e) => sum + (Number(e.resultat) || 0), 0)
    };
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total exercices: ${stats.total}`, 14, 42);
    doc.text(`Exercices ouverts: ${stats.ouverts}`, 14, 49);
    doc.text(`Exercices clôturés: ${stats.clotures}`, 14, 56);
    doc.text(`Résultat total: ${formatNumber(stats.resultatTotal)} CDF`, 14, 63);
    
    const tableData = filteredExercices.map(exercice => [
      exercice.annee.toString(),
      new Date(exercice.date_debut).toLocaleDateString('fr-FR'),
      new Date(exercice.date_fin).toLocaleDateString('fr-FR'),
      exercice.cloture ? 'Clôturé' : 'Ouvert',
      exercice.resultat ? formatNumber(exercice.resultat) : '-',
      exercice.reserves_change ? formatNumber(exercice.reserves_change) : '-',
      exercice.operations_refinancement ? formatNumber(exercice.operations_refinancement) : '-',
      exercice.observations ? (exercice.observations.length > 30 ? exercice.observations.substring(0, 30) + '...' : exercice.observations) : '-'
    ]);
    
    doc.autoTable({
      head: [['Année', 'Date début', 'Date fin', 'Statut', 'Résultat (CDF)', 'Réserves change (CDF)', 'Opérations refinancement (CDF)', 'Observations']],
      body: tableData,
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 20 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 },
        3: { cellWidth: 25 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 },
        6: { cellWidth: 35 }, 7: { cellWidth: 50 }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: function(data) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${data.pageNumber} sur ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }
    });
    
    const fileName = `exercices_bcc_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    setSuccess('Export PDF effectué avec succès');
    setTimeout(() => setSuccess(''), 3000);
    setShowExportMenu(false);
  };

  const handleExport = () => {
    setShowExportMenu(!showExportMenu);
  };

  const formatNumber = (value, defaultValue = '-') => {
    if (value === null || value === undefined || value === '') return defaultValue;
    try {
      return value.toLocaleString('fr-FR');
    } catch (e) {
      return defaultValue;
    }
  };

  const formatNumberForExport = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    return value;
  };

  const stats = {
    total: exercices.length,
    ouverts: exercices.filter(e => !e.cloture).length,
    clotures: exercices.filter(e => e.cloture).length,
    dernierExercice: exercices.length > 0 ? Math.max(...exercices.map(e => e.annee)) : null,
    resultatTotal: exercices.reduce((sum, e) => sum + (Number(e.resultat) || 0), 0),
    reservesChangeTotal: exercices.reduce((sum, e) => sum + (Number(e.reserves_change) || 0), 0)
  };

  const animationStyles = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }
    .fade-slide-up { animation: fadeSlideUp 0.4s ease-out; }
    .stat-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .btn-gradient-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
      transition: all 0.3s ease;
    }
    .btn-gradient-success:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
    }
    .btn-gradient-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      transition: all 0.3s ease;
    }
    .btn-gradient-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
    }
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Chargement des exercices comptables BCC...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* Modal de clôture */}
      {showClotureModal && exerciceACloturer && (
        <div style={styles.modalOverlay} onClick={() => setShowClotureModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIconWarning}><FiLock size={20} color="#f59e0b" /></div>
              <h3 style={{...styles.modalTitle, color: '#000000'}}>Clôture de l'exercice {exerciceACloturer.annee}</h3>
              <button onClick={() => setShowClotureModal(false)} style={styles.modalClose}><FiXCircle size={20} color="#64748b" /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Date de clôture *</label><input type="date" value={clotureData.date_cloture} onChange={(e) => setClotureData({ ...clotureData, date_cloture: e.target.value })} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Date d'approbation</label><input type="date" value={clotureData.date_approbation} onChange={(e) => setClotureData({ ...clotureData, date_approbation: e.target.value })} style={styles.input} /></div>
              <div style={styles.formRow}><div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Résultat (CDF)</label><input type="number" value={clotureData.resultat} onChange={(e) => setClotureData({ ...clotureData, resultat: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" /></div>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Report à nouveau (CDF)</label><input type="number" value={clotureData.report_a_nouveau} onChange={(e) => setClotureData({ ...clotureData, report_a_nouveau: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" /></div></div>
              <div style={styles.formRow}><div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Réserves de change (CDF)</label><input type="number" value={clotureData.reservesChange} onChange={(e) => setClotureData({ ...clotureData, reservesChange: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" /></div>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Opérations refinancement (CDF)</label><input type="number" value={clotureData.operationsRefinancement} onChange={(e) => setClotureData({ ...clotureData, operationsRefinancement: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" /></div></div>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Rapport politique monétaire</label><input type="text" value={clotureData.rapportPolitiqueMonetaire} onChange={(e) => setClotureData({ ...clotureData, rapportPolitiqueMonetaire: e.target.value })} style={styles.input} placeholder="Nom du fichier" /></div>
              <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Observations</label><textarea value={clotureData.observations} onChange={(e) => setClotureData({ ...clotureData, observations: e.target.value })} style={styles.textarea} rows={3} placeholder="Observations sur la clôture..." /></div>
            </div>
            <div style={styles.modalFooter}><button onClick={() => setShowClotureModal(false)} style={styles.cancelButton}>Annuler</button><button onClick={handleCloturer} style={styles.confirmButtonWarning}><FiLock /> Clôturer l'exercice</button></div>
          </div>
        </div>
      )}

      {/* Modal des détails */}
      {showDetailsModal && selectedExercice && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIconPrimary}><FiEye size={20} color="#3b82f6" /></div>
              <h3 style={{...styles.modalTitle, color: '#000000'}}>Détails exercice {selectedExercice.annee}</h3>
              <button onClick={() => setShowDetailsModal(false)} style={styles.modalClose}><FiXCircle size={20} color="#64748b" /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Période:</span><span style={{color: '#000000'}}>{new Date(selectedExercice.date_debut).toLocaleDateString('fr-FR')} - {new Date(selectedExercice.date_fin).toLocaleDateString('fr-FR')}</span></div>
              <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Statut:</span><span style={selectedExercice.cloture ? {...styles.badgeDanger, color: '#991b1b'} : {...styles.badgeSuccess, color: '#065f46'}}>{selectedExercice.cloture ? '🔒 Clôturé' : '🔓 Ouvert'}</span></div>
              {selectedExercice.date_cloture && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Date clôture:</span><span style={{color: '#000000'}}>{new Date(selectedExercice.date_cloture).toLocaleDateString('fr-FR')}</span></div>}
              {selectedExercice.date_approbation && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Date approbation:</span><span style={{color: '#000000'}}>{new Date(selectedExercice.date_approbation).toLocaleDateString('fr-FR')}</span></div>}
              {selectedExercice.resultat !== null && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Résultat:</span><span style={selectedExercice.resultat >= 0 ? {...styles.resultatPositif, color: '#10b981'} : {...styles.resultatNegatif, color: '#ef4444'}}>{selectedExercice.resultat >= 0 ? '+' : ''}{formatNumber(selectedExercice.resultat)} CDF</span></div>}
              {selectedExercice.report_a_nouveau !== null && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Report à nouveau:</span><span style={{color: '#000000'}}>{formatNumber(selectedExercice.report_a_nouveau)} CDF</span></div>}
              {selectedExercice.reserves_change !== null && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Réserves de change:</span><span style={{color: '#000000'}}>{formatNumber(selectedExercice.reserves_change)} CDF</span></div>}
              {selectedExercice.operations_refinancement !== null && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Opérations refinancement:</span><span style={{color: '#000000'}}>{formatNumber(selectedExercice.operations_refinancement)} CDF</span></div>}
              {selectedExercice.rapport_politique_monetaire && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Rapport politique:</span><span style={{color: '#000000'}}>{selectedExercice.rapport_politique_monetaire}</span></div>}
              {selectedExercice.observations && <div style={styles.detailRow}><span style={{...styles.detailLabel, color: '#000000'}}>Observations:</span><span style={{...styles.observationsText, color: '#000000'}}>{selectedExercice.observations}</span></div>}
            </div>
            <div style={styles.modalFooter}><button onClick={() => setShowDetailsModal(false)} style={styles.closeButton}>Fermer</button></div>
          </div>
        </div>
      )}

      {/* Fond dégradé */}
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
                  <FiCalendar size={28} color="#fff" />
                </div>
                <div>
                  <h1 style={styles.title}>Exercices comptables - BCC</h1>
                  <p style={styles.subtitle}>Gestion des exercices de la Banque Centrale du Congo - Montants en Francs Congolais (CDF)</p>
                </div>
              </div>
            </div>
            <div style={styles.headerActions}>
              <div style={styles.exportDropdown}>
                <button onClick={handleExport} style={styles.exportButton}>
                  <FiDownload /> Exporter
                </button>
                {showExportMenu && (
                  <div style={styles.dropdownMenu}>
                    <button onClick={handleExportExcel} style={styles.dropdownItem}>
                      <FiFile size={16} /> Excel (.xlsx)
                    </button>
                    <button onClick={handleExportPDF} style={styles.dropdownItem}>
                      <FiFileText size={16} /> PDF (.pdf)
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => loadExercices()} style={styles.refreshButton}><FiRefreshCw /> Actualiser</button>
            </div>
          </div>

          {/* Messages */}
          {success && <div style={styles.successMessage}><FiCheckCircle size={20} /><span style={{color: '#065f46'}}>{success}</span></div>}
          {error && <div style={styles.errorMessage}><FiXCircle size={20} /><span style={{color: '#991b1b'}}>{error}</span></div>}

          {/* Statistiques */}
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
              <div style={styles.statValueWhite}>{stats.total}</div>
              <div style={styles.statLabelWhite}>Total exercices</div>
              <FiBarChart2 size={20} style={styles.statIconWhite} />
            </div>
            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
              <div style={styles.statValueWhite}>{stats.ouverts}</div>
              <div style={styles.statLabelWhite}>Exercices ouverts</div>
              <FiUnlock size={20} style={styles.statIconWhite} />
            </div>
            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
              <div style={styles.statValueWhite}>{stats.clotures}</div>
              <div style={styles.statLabelWhite}>Exercices clôturés</div>
              <FiLock size={20} style={styles.statIconWhite} />
            </div>
            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
              <div style={styles.statValueWhite}>{formatNumber(stats.resultatTotal)} CDF</div>
              <div style={styles.statLabelWhite}>Résultat total</div>
              <FiTrendingUp size={20} style={styles.statIconWhite} />
            </div>
          </div>

          {/* Contenu principal */}
          <div style={styles.content}>
            
            {/* Ajout exercice */}
            <div style={styles.addSection}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}><FiPlus size={20} color="#10b981" /></div>
                <div><h3 style={{...styles.sectionTitle, color: '#000000'}}>Nouvel exercice comptable BCC</h3><p style={{...styles.sectionDescription, color: '#000000'}}>Créez un nouvel exercice conforme au calendrier de la Banque Centrale</p></div>
              </div>
              <div style={styles.addForm}>
                <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Année</label><input type="number" value={newExercice.annee} onChange={(e) => setNewExercice({ ...newExercice, annee: parseInt(e.target.value) })} style={styles.input} min={2000} max={2100} /></div>
                <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Date de début</label><input type="date" value={newExercice.date_debut} onChange={(e) => setNewExercice({ ...newExercice, date_debut: e.target.value })} style={styles.input} /></div>
                <div style={styles.formGroup}><label style={{...styles.formLabel, color: '#000000'}}>Date de fin</label><input type="date" value={newExercice.date_fin} onChange={(e) => setNewExercice({ ...newExercice, date_fin: e.target.value })} style={styles.input} /></div>
                <button onClick={handleAddExercice} style={styles.addButton}><FiPlus /> Ajouter</button>
              </div>
            </div>

            {/* Filtres */}
            <div style={styles.filtersSection}>
              <div style={styles.searchWrapper}><FiSearch size={18} color="#94a3b8" style={styles.searchIcon} /><input type="text" placeholder="Rechercher par année ou observations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} /></div>
              <div style={styles.filterWrapper}><FiFilter size={18} color="#94a3b8" /><select value={filterCloture} onChange={(e) => setFilterCloture(e.target.value)} style={styles.filterSelect}><option value="all">Tous les exercices</option><option value="ouvert">Exercices ouverts</option><option value="cloture">Exercices clôturés</option></select></div>
              <div style={styles.viewToggle}><button onClick={() => setViewMode('list')} style={{ ...styles.viewButton, ...(viewMode === 'list' ? styles.viewButtonActive : {}) }}><FiBookOpen size={16} /> Liste</button><button onClick={() => setViewMode('stats')} style={{ ...styles.viewButton, ...(viewMode === 'stats' ? styles.viewButtonActive : {}) }}><FiBarChart2 size={16} /> Stats</button></div>
            </div>

            {/* Liste */}
            <div style={styles.listSection}>
              <div style={styles.listHeader}><h3 style={{...styles.listTitle, color: '#000000'}}>{viewMode === 'list' ? 'Liste des exercices BCC' : 'Récapitulatif par année'}</h3><span style={{...styles.listCount, color: '#000000'}}>{filteredExercices.length} exercice(s)</span></div>
              
              {filteredExercices.length === 0 ? (
                <div style={styles.emptyState}><FiAlertCircle size={48} color="#cbd5e1" /><h4 style={{...styles.emptyTitle, color: '#000000'}}>Aucun exercice trouvé</h4><p style={{...styles.emptyText, color: '#000000'}}>Aucun exercice ne correspond à vos critères de recherche</p></div>
              ) : viewMode === 'list' ? (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white' }}>
                      <tr><th style={styles.thWhite}>Année</th><th style={styles.thWhite}>Période</th><th style={styles.thWhite}>Statut</th><th style={styles.thWhite}>Résultat (CDF)</th><th style={styles.thWhite}>Réserves de change (CDF)</th><th style={styles.thWhite}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredExercices.map(exercice => {
                        const dateDebut = new Date(exercice.date_debut);
                        const dateFin = new Date(exercice.date_fin);
                        const duree = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={exercice.id} style={styles.tr}>
                            <td style={styles.td}><span style={styles.annee}>{exercice.annee}</span></td>
                            <td style={styles.td}><div style={styles.period}><span style={{color: '#000000'}}>{dateDebut.toLocaleDateString('fr-FR')}</span><span style={styles.periodSeparator}>→</span><span style={{color: '#000000'}}>{dateFin.toLocaleDateString('fr-FR')}</span><span style={styles.dureeBadge}>{duree} jours</span></div></td>
                            <td style={styles.td}><span style={exercice.cloture ? styles.clotureBadge : styles.ouvertBadge}>{exercice.cloture ? <><FiLock size={12} /> Clôturé</> : <><FiUnlock size={12} /> Ouvert</>}</span>{exercice.date_cloture && <div style={styles.dateCloture}><FiClock size={10} /> {new Date(exercice.date_cloture).toLocaleDateString('fr-FR')}</div>}</td>
                            <td style={styles.td}>{exercice.resultat !== null ? <span style={exercice.resultat >= 0 ? styles.resultatPositif : styles.resultatNegatif}>{exercice.resultat >= 0 ? '+' : ''}{formatNumber(exercice.resultat)}</span> : <span style={styles.nonRenseigne}>Non renseigné</span>}</td>
                            <td style={styles.td}>{exercice.reserves_change !== null ? <span style={styles.reservesChangeValue}>{formatNumber(exercice.reserves_change)} CDF</span> : <span style={styles.nonRenseigne}>-</span>}</td>
                            <td style={styles.td}><div style={styles.actionButtons}><button onClick={() => openPDFViewer(exercice.annee)} style={styles.pdfButton} title="Voir rapport annuel PDF" disabled={loading}><FiFileText size={16} /></button><button onClick={() => openDetailsModal(exercice)} style={styles.viewButtonAction} title="Voir détails"><FiEye size={16} /></button>{!exercice.cloture && <button onClick={() => openClotureModal(exercice)} style={styles.clotureButton} title="Clôturer"><FiLock size={16} /></button>}{!exercice.cloture && <button onClick={() => handleDeleteExercice(exercice.id)} style={styles.deleteButton} title="Supprimer"><FiTrash2 size={16} /></button>}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.statsContainer}>
                  {filteredExercices.map(exercice => (
                    <div key={exercice.id} style={styles.statsCardExercice}>
                      <div style={styles.statsCardHeader}><span style={{...styles.statsAnnee, color: '#000000'}}>{exercice.annee}</span><span style={exercice.cloture ? styles.clotureBadge : styles.ouvertBadge}>{exercice.cloture ? 'Clôturé' : 'En cours'}</span></div>
                      <div style={styles.statsCardBody}>
                        <div style={styles.statsRow}><span style={{...styles.statsLabel, color: '#000000'}}>Période:</span><span style={{color: '#000000'}}>{new Date(exercice.date_debut).toLocaleDateString('fr-FR')} - {new Date(exercice.date_fin).toLocaleDateString('fr-FR')}</span></div>
                        {exercice.resultat !== null && <div style={styles.statsRow}><span style={{...styles.statsLabel, color: '#000000'}}>Résultat:</span><span style={exercice.resultat >= 0 ? {...styles.resultatPositif, color: '#10b981'} : {...styles.resultatNegatif, color: '#ef4444'}}>{exercice.resultat >= 0 ? '+' : ''}{formatNumber(exercice.resultat)} CDF</span></div>}
                        {exercice.reserves_change !== null && <div style={styles.statsRow}><span style={{...styles.statsLabel, color: '#000000'}}>Réserves de change:</span><span style={{color: '#000000'}}>{formatNumber(exercice.reserves_change)} CDF</span></div>}
                        {exercice.operations_refinancement !== null && <div style={styles.statsRow}><span style={{...styles.statsLabel, color: '#000000'}}>Opérations refinancement:</span><span style={{color: '#000000'}}>{formatNumber(exercice.operations_refinancement)} CDF</span></div>}
                        {exercice.observations && <div style={styles.statsRow}><span style={{...styles.statsLabel, color: '#000000'}}>Observations:</span><span style={{...styles.observationsText, color: '#000000'}}>{exercice.observations}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div style={styles.footer}>
            <small style={styles.footerText}>
              <FiShield size={12} /> Données certifiées conformes aux normes IFRS - BCC
            </small>
          </div>
        </div>
      </div>

      {/* Visionneur PDF */}
      {pdfViewer.open && <DocumentViewer file={pdfViewer.file} filename={pdfViewer.filename} fileType={pdfViewer.fileType} onClose={closePDFViewer} />}
    </>
  );
};

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', background: 'rgba(255,255,255,0.95)', borderRadius: '16px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' },
  loadingText: { color: '#64748b', fontSize: '0.875rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { flex: 1 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'white', marginBottom: '1rem' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: 0 },
  headerActions: { display: 'flex', gap: '0.75rem', position: 'relative' },
  exportButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  refreshButton: { padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  exportDropdown: { position: 'relative' },
  dropdownMenu: { position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', minWidth: '160px', zIndex: 10, overflow: 'hidden' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', width: '100%', border: 'none', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#000000', textAlign: 'left', transition: 'background-color 0.2s' },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { borderRadius: '12px', padding: '1rem', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  statValueWhite: { fontSize: '1.75rem', fontWeight: 'bold', color: 'white' },
  statLabelWhite: { fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' },
  statIconWhite: { position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5, color: 'white' },
  content: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  addSection: { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f1f5f9' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  sectionIcon: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', margin: 0 },
  sectionDescription: { fontSize: '0.75rem', margin: '0.25rem 0 0 0' },
  addForm: { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  formGroup: { flex: 1, minWidth: '180px' },
  formLabel: { display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem' },
  input: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%', backgroundColor: 'white', color: '#000000' },
  textarea: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%', fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'white', color: '#000000' },
  addButton: { padding: '0.625rem 1.25rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px' },
  filtersSection: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' },
  searchWrapper: { flex: 2, position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white', color: '#000000' },
  filterWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' },
  filterSelect: { border: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', cursor: 'pointer', outline: 'none', color: '#000000' },
  viewToggle: { display: 'flex', gap: '0.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.25rem' },
  viewButton: { padding: '0.375rem 0.625rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#64748b' },
  viewButtonActive: { backgroundColor: 'white', color: '#10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  listSection: { marginTop: '1rem' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  listTitle: { fontSize: '0.875rem', fontWeight: '600', margin: 0 },
  listCount: { fontSize: '0.75rem' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thWhite: { padding: '0.75rem 1rem', textAlign: 'left', color: 'white', fontWeight: '600', fontSize: '0.75rem' },
  tr: { borderBottom: '1px solid #f1f5f9', backgroundColor: 'white' },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#000000' },
  annee: { backgroundColor: '#e0f2fe', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', fontFamily: 'monospace', color: '#000000' },
  period: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' },
  periodSeparator: { color: '#94a3b8' },
  dureeBadge: { backgroundColor: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', color: '#000000' },
  ouvertBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  clotureBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  dateCloture: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' },
  resultatPositif: { fontWeight: '500' },
  resultatNegatif: { fontWeight: '500' },
  reservesChangeValue: { color: '#f59e0b', fontWeight: '500' },
  nonRenseigne: { color: '#94a3b8', fontSize: '0.75rem' },
  actionButtons: { display: 'flex', gap: '0.5rem' },
  pdfButton: { padding: '0.375rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  viewButtonAction: { padding: '0.375rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  clotureButton: { padding: '0.375rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  deleteButton: { padding: '0.375rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' },
  statsCardExercice: { backgroundColor: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb' },
  statsCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' },
  statsAnnee: { fontSize: '1.25rem', fontWeight: 'bold' },
  statsCardBody: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  statsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' },
  statsLabel: { fontWeight: '500' },
  observationsText: { fontStyle: 'italic' },
  emptyState: { textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f8fafc', borderRadius: '12px' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', margin: '1rem 0 0.5rem 0' },
  emptyText: { fontSize: '0.875rem', marginBottom: '1.5rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', borderRadius: '16px', width: '550px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' },
  modalIconWarning: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalIconPrimary: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: '1.125rem', fontWeight: '600', margin: 0, flex: 1 },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer' },
  modalBody: { padding: '1.5rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb' },
  cancelButton: { padding: '0.5rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#000000' },
  confirmButtonWarning: { padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  closeButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' },
  detailLabel: { fontWeight: '500' },
  badgeSuccess: { backgroundColor: '#d1fae5', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  badgeDanger: { backgroundColor: '#fee2e2', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  footer: { textAlign: 'center', marginTop: '2rem', paddingTop: '1rem' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }
};

export default ExercicesComptablesBCC;