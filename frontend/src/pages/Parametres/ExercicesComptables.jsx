import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCalendar, FiPlus, FiTrash2, FiLock, FiUnlock,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiSearch, FiFilter,
  FiAlertCircle, FiDownload, FiClock, FiTrendingUp, FiBarChart2, FiBookOpen,
  FiEye, FiFileText
} from 'react-icons/fi';
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

  // Visualiser le rapport PDF
  const openPDFViewer = async (annee) => {
    try {
      const filename = `Rapport_Annuel_BCC_${annee}.pdf`;
      const response = await api.get(`/documents/by-filename/${filename}`);
      const document = response.data;
      // Récupérer le blob du PDF
      const blobResponse = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob'
      });
      setPdfViewer({
        open: true,
        file: blobResponse.data,
        filename: document.nom_fichier,
        fileType: 'pdf'
      });
    } catch (err) {
      console.error('Erreur chargement PDF:', err);
      setError('Impossible de charger le rapport annuel pour cet exercice');
      setTimeout(() => setError(''), 3000);
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

  const handleExport = () => {
    const dataStr = JSON.stringify(exercices, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `exercices_bcc_${new Date().toISOString().split('T')[0]}.json`;
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportFileDefaultName);
    link.click();
  };

  const formatNumber = (value, defaultValue = '-') => {
    if (value === null || value === undefined || value === '') return defaultValue;
    try {
      return value.toLocaleString('fr-FR');
    } catch (e) {
      return defaultValue;
    }
  };

  const stats = {
    total: exercices.length,
    ouverts: exercices.filter(e => !e.cloture).length,
    clotures: exercices.filter(e => e.cloture).length,
    dernierExercice: exercices.length > 0 ? Math.max(...exercices.map(e => e.annee)) : null,
    resultatTotal: exercices.reduce((sum, e) => sum + (Number(e.resultat) || 0), 0),
    reservesChangeTotal: exercices.reduce((sum, e) => sum + (Number(e.reserves_change) || 0), 0)
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement des exercices comptables BCC...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/parametres')} style={styles.backButton}>
            <FiArrowLeft size={18} /> Retour
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.iconWrapper}>
              <FiCalendar size={28} color="#10b981" />
            </div>
            <div>
              <h1 style={styles.title}>Exercices comptables - BCC</h1>
              <p style={styles.subtitle}>
                Gestion des exercices de la Banque Centrale du Congo - Montants en Francs Congolais (CDF)
              </p>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleExport} style={styles.exportButton}>
            <FiDownload /> Exporter
          </button>
          <button onClick={() => loadExercices()} style={styles.refreshButton}>
            <FiRefreshCw /> Actualiser
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Statistiques */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total exercices</div>
          <FiBarChart2 size={20} color="#10b981" style={styles.statIcon} />
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.ouverts}</div>
          <div style={styles.statLabel}>Exercices ouverts</div>
          <FiUnlock size={20} color="#10b981" style={styles.statIcon} />
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.clotures}</div>
          <div style={styles.statLabel}>Exercices clôturés</div>
          <FiLock size={20} color="#f59e0b" style={styles.statIcon} />
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatNumber(stats.resultatTotal)} CDF</div>
          <div style={styles.statLabel}>Résultat total</div>
          <FiTrendingUp size={20} color="#10b981" style={styles.statIcon} />
        </div>
      </div>

      {/* Contenu principal */}
      <div style={styles.content}>
        {/* Ajout exercice */}
        <div style={styles.addSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <FiPlus size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Nouvel exercice comptable BCC</h3>
              <p style={styles.sectionDescription}>
                Créez un nouvel exercice conforme au calendrier de la Banque Centrale
              </p>
            </div>
          </div>
          <div style={styles.addForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Année</label>
              <input
                type="number"
                value={newExercice.annee}
                onChange={(e) => setNewExercice({ ...newExercice, annee: parseInt(e.target.value) })}
                style={styles.input}
                min={2000}
                max={2100}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date de début</label>
              <input
                type="date"
                value={newExercice.date_debut}
                onChange={(e) => setNewExercice({ ...newExercice, date_debut: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date de fin</label>
              <input
                type="date"
                value={newExercice.date_fin}
                onChange={(e) => setNewExercice({ ...newExercice, date_fin: e.target.value })}
                style={styles.input}
              />
            </div>
            <button onClick={handleAddExercice} style={styles.addButton}>
              <FiPlus /> Ajouter
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div style={styles.filtersSection}>
          <div style={styles.searchWrapper}>
            <FiSearch size={18} color="#94a3b8" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par année ou observations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterWrapper}>
            <FiFilter size={18} color="#94a3b8" />
            <select
              value={filterCloture}
              onChange={(e) => setFilterCloture(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Tous les exercices</option>
              <option value="ouvert">Exercices ouverts</option>
              <option value="cloture">Exercices clôturés</option>
            </select>
          </div>
          <div style={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('list')} 
              style={{ ...styles.viewButton, ...(viewMode === 'list' ? styles.viewButtonActive : {}) }}
              title="Vue liste"
            >
              <FiBookOpen size={16} />
            </button>
            <button 
              onClick={() => setViewMode('stats')} 
              style={{ ...styles.viewButton, ...(viewMode === 'stats' ? styles.viewButtonActive : {}) }}
              title="Vue statistiques"
            >
              <FiBarChart2 size={16} />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div style={styles.listSection}>
          <div style={styles.listHeader}>
            <h3 style={styles.listTitle}>
              {viewMode === 'list' ? 'Liste des exercices BCC' : 'Récapitulatif par année'}
            </h3>
            <span style={styles.listCount}>{filteredExercices.length} exercice(s)</span>
          </div>
          
          {filteredExercices.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle size={48} color="#cbd5e1" />
              <h4 style={styles.emptyTitle}>Aucun exercice trouvé</h4>
              <p style={styles.emptyText}>
                Aucun exercice ne correspond à vos critères de recherche
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Année</th>
                    <th style={styles.th}>Période</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>Résultat (CDF)</th>
                    <th style={styles.th}>Réserves de change (CDF)</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExercices.map(exercice => {
                    const dateDebut = new Date(exercice.date_debut);
                    const dateFin = new Date(exercice.date_fin);
                    const duree = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={exercice.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.annee}>{exercice.annee}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.period}>
                            <span>{dateDebut.toLocaleDateString('fr-FR')}</span>
                            <span style={styles.periodSeparator}>→</span>
                            <span>{dateFin.toLocaleDateString('fr-FR')}</span>
                            <span style={styles.dureeBadge}>{duree} jours</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={exercice.cloture ? styles.clotureBadge : styles.ouvertBadge}>
                            {exercice.cloture ? <><FiLock size={12} /> Clôturé</> : <><FiUnlock size={12} /> Ouvert</>}
                          </span>
                          {exercice.date_cloture && (
                            <div style={styles.dateCloture}>
                              <FiClock size={10} /> {new Date(exercice.date_cloture).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          {exercice.resultat !== null ? (
                            <span style={exercice.resultat >= 0 ? styles.resultatPositif : styles.resultatNegatif}>
                              {exercice.resultat >= 0 ? '+' : ''}{formatNumber(exercice.resultat)}
                            </span>
                          ) : <span style={styles.nonRenseigne}>Non renseigné</span>}
                        </td>
                        <td style={styles.td}>
                          {exercice.reserves_change !== null ? (
                            <span style={styles.reservesChangeValue}>
                              {formatNumber(exercice.reserves_change)} CDF
                            </span>
                          ) : <span style={styles.nonRenseigne}>-</span>}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => openPDFViewer(exercice.annee)}
                              style={styles.pdfButton}
                              title="Voir rapport annuel PDF"
                            >
                              <FiFileText size={16} />
                            </button>
                            <button
                              onClick={() => openDetailsModal(exercice)}
                              style={styles.viewButtonAction}
                              title="Voir détails"
                            >
                              <FiEye size={16} />
                            </button>
                            {!exercice.cloture && (
                              <button
                                onClick={() => openClotureModal(exercice)}
                                style={styles.clotureButton}
                                title="Clôturer l'exercice"
                              >
                                <FiLock size={16} />
                              </button>
                            )}
                            {!exercice.cloture && (
                              <button
                                onClick={() => handleDeleteExercice(exercice.id)}
                                style={styles.deleteButton}
                                title="Supprimer"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
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
                  <div style={styles.statsCardHeader}>
                    <span style={styles.statsAnnee}>{exercice.annee}</span>
                    <span style={exercice.cloture ? styles.clotureBadge : styles.ouvertBadge}>
                      {exercice.cloture ? 'Clôturé' : 'En cours'}
                    </span>
                  </div>
                  <div style={styles.statsCardBody}>
                    <div style={styles.statsRow}>
                      <span style={styles.statsLabel}>Période:</span>
                      <span>{new Date(exercice.date_debut).toLocaleDateString('fr-FR')} - {new Date(exercice.date_fin).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {exercice.resultat !== null && (
                      <div style={styles.statsRow}>
                        <span style={styles.statsLabel}>Résultat:</span>
                        <span style={exercice.resultat >= 0 ? styles.resultatPositif : styles.resultatNegatif}>
                          {exercice.resultat >= 0 ? '+' : ''}{formatNumber(exercice.resultat)} CDF
                        </span>
                      </div>
                    )}
                    {exercice.reserves_change !== null && (
                      <div style={styles.statsRow}>
                        <span style={styles.statsLabel}>Réserves de change:</span>
                        <span>{formatNumber(exercice.reserves_change)} CDF</span>
                      </div>
                    )}
                    {exercice.operations_refinancement !== null && (
                      <div style={styles.statsRow}>
                        <span style={styles.statsLabel}>Opérations refinancement:</span>
                        <span>{formatNumber(exercice.operations_refinancement)} CDF</span>
                      </div>
                    )}
                    {exercice.observations && (
                      <div style={styles.statsRow}>
                        <span style={styles.statsLabel}>Observations:</span>
                        <span style={styles.observationsText}>{exercice.observations}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showClotureModal && exerciceACloturer && (
        <div style={styles.modalOverlay} onClick={() => setShowClotureModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Clôture de l'exercice {exerciceACloturer.annee}</h3>
              <button onClick={() => setShowClotureModal(false)} style={styles.modalClose}>
                <FiXCircle size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {/* Champs de clôture - inchangés */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Date de clôture *</label>
                <input type="date" value={clotureData.date_cloture} onChange={(e) => setClotureData({ ...clotureData, date_cloture: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Date d'approbation (Conseil d'administration)</label>
                <input type="date" value={clotureData.date_approbation} onChange={(e) => setClotureData({ ...clotureData, date_approbation: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Résultat de l'exercice (CDF)</label>
                <input type="number" value={clotureData.resultat} onChange={(e) => setClotureData({ ...clotureData, resultat: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Report à nouveau (CDF)</label>
                <input type="number" value={clotureData.report_a_nouveau} onChange={(e) => setClotureData({ ...clotureData, report_a_nouveau: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Réserves de change (CDF)</label>
                <input type="number" value={clotureData.reservesChange} onChange={(e) => setClotureData({ ...clotureData, reservesChange: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Opérations de refinancement (CDF)</label>
                <input type="number" value={clotureData.operationsRefinancement} onChange={(e) => setClotureData({ ...clotureData, operationsRefinancement: parseFloat(e.target.value) || 0 })} style={styles.input} placeholder="0" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Rapport de politique monétaire (fichier)</label>
                <input type="text" value={clotureData.rapportPolitiqueMonetaire} onChange={(e) => setClotureData({ ...clotureData, rapportPolitiqueMonetaire: e.target.value })} style={styles.input} placeholder="Nom du fichier" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Observations</label>
                <textarea value={clotureData.observations} onChange={(e) => setClotureData({ ...clotureData, observations: e.target.value })} style={styles.textarea} rows={3} placeholder="Observations sur la clôture..." />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowClotureModal(false)} style={styles.cancelButton}>Annuler</button>
              <button onClick={handleCloturer} style={styles.confirmButton}><FiLock /> Clôturer l'exercice</button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedExercice && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Détails exercice {selectedExercice.annee}</h3>
              <button onClick={() => setShowDetailsModal(false)} style={styles.modalClose}><FiXCircle size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Période:</span><span>{new Date(selectedExercice.date_debut).toLocaleDateString('fr-FR')} - {new Date(selectedExercice.date_fin).toLocaleDateString('fr-FR')}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Statut:</span><span style={selectedExercice.cloture ? styles.clotureBadge : styles.ouvertBadge}>{selectedExercice.cloture ? 'Clôturé' : 'Ouvert'}</span></div>
              {selectedExercice.date_cloture && <div style={styles.detailRow}><span style={styles.detailLabel}>Date clôture:</span><span>{new Date(selectedExercice.date_cloture).toLocaleDateString('fr-FR')}</span></div>}
              {selectedExercice.date_approbation && <div style={styles.detailRow}><span style={styles.detailLabel}>Date approbation:</span><span>{new Date(selectedExercice.date_approbation).toLocaleDateString('fr-FR')}</span></div>}
              {selectedExercice.resultat !== null && <div style={styles.detailRow}><span style={styles.detailLabel}>Résultat:</span><span style={selectedExercice.resultat >= 0 ? styles.resultatPositif : styles.resultatNegatif}>{selectedExercice.resultat >= 0 ? '+' : ''}{formatNumber(selectedExercice.resultat)} CDF</span></div>}
              {selectedExercice.report_a_nouveau !== null && <div style={styles.detailRow}><span style={styles.detailLabel}>Report à nouveau:</span><span>{formatNumber(selectedExercice.report_a_nouveau)} CDF</span></div>}
              {selectedExercice.reserves_change !== null && <div style={styles.detailRow}><span style={styles.detailLabel}>Réserves de change:</span><span>{formatNumber(selectedExercice.reserves_change)} CDF</span></div>}
              {selectedExercice.operations_refinancement !== null && <div style={styles.detailRow}><span style={styles.detailLabel}>Opérations refinancement:</span><span>{formatNumber(selectedExercice.operations_refinancement)} CDF</span></div>}
              {selectedExercice.rapport_politique_monetaire && <div style={styles.detailRow}><span style={styles.detailLabel}>Rapport politique monétaire:</span><span>{selectedExercice.rapport_politique_monetaire}</span></div>}
              {selectedExercice.observations && <div style={styles.detailRow}><span style={styles.detailLabel}>Observations:</span><span style={styles.observationsText}>{selectedExercice.observations}</span></div>}
            </div>
            <div style={styles.modalFooter}><button onClick={() => setShowDetailsModal(false)} style={styles.closeButton}>Fermer</button></div>
          </div>
        </div>
      )}

      {/* Visionneur PDF */}
      {pdfViewer.open && (
        <DocumentViewer
          file={pdfViewer.file}
          filename={pdfViewer.filename}
          fileType={pdfViewer.fileType}
          onClose={closePDFViewer}
        />
      )}
    </div>
  );
};

// Styles améliorés
const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { flex: 1 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', color: '#475569', marginBottom: '1rem', transition: 'all 0.2s' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 },
  headerActions: { display: 'flex', gap: '0.75rem' },
  exportButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  refreshButton: { padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', color: '#065f46', fontSize: '0.875rem' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '1rem', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' },
  statIcon: { position: 'absolute', right: '1rem', top: '1rem', opacity: 0.5 },
  content: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  addSection: { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f1f5f9' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  sectionIcon: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  sectionDescription: { fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' },
  addForm: { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  formGroup: { flex: 1, minWidth: '180px' },
  formLabel: { display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' },
  input: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%', transition: 'all 0.2s' },
  textarea: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%', fontFamily: 'inherit', resize: 'vertical' },
  addButton: { padding: '0.625rem 1.25rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px' },
  filtersSection: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' },
  searchWrapper: { flex: 2, position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' },
  filterWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' },
  filterSelect: { border: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', cursor: 'pointer' },
  viewToggle: { display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '0.25rem' },
  viewButton: { padding: '0.375rem 0.625rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary)' },
  viewButtonActive: { backgroundColor: 'var(--bg-card)', color: '#10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  listSection: { marginTop: '1rem' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  listTitle: { fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  listCount: { fontSize: '0.75rem', color: 'var(--text-secondary)' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb', fontWeight: '600', fontSize: '0.75rem', color: '#475569' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' },
  annee: { backgroundColor: '#e0f2fe', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', fontFamily: 'monospace' },
  period: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' },
  periodSeparator: { color: '#94a3b8' },
  dureeBadge: { backgroundColor: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', color: '#475569' },
  ouvertBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  clotureBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  dateCloture: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' },
  resultatPositif: { color: '#10b981', fontWeight: '500' },
  resultatNegatif: { color: '#ef4444', fontWeight: '500' },
  reservesChangeValue: { color: '#f59e0b', fontWeight: '500' },
  nonRenseigne: { color: '#94a3b8', fontSize: '0.75rem' },
  actionButtons: { display: 'flex', gap: '0.5rem' },
  pdfButton: { padding: '0.375rem', backgroundColor: '#8b5cf6', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  viewButtonAction: { padding: '0.375rem', backgroundColor: '#3b82f6', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  clotureButton: { padding: '0.375rem', backgroundColor: '#f59e0b', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  deleteButton: { padding: '0.375rem', backgroundColor: '#ef4444', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' },
  statsCardExercice: { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb' },
  statsCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' },
  statsAnnee: { fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' },
  statsCardBody: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  statsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' },
  statsLabel: { color: 'var(--text-secondary)' },
  observationsText: { color: '#475569', fontStyle: 'italic' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' },
  modalTitle: { fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' },
  modalBody: { padding: '1.5rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb' },
  cancelButton: { padding: '0.5rem 1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#475569' },
  confirmButton: { padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  closeButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' },
  detailLabel: { fontWeight: '500', color: 'var(--text-secondary)' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' },
  loadingText: { color: 'var(--text-secondary)', fontSize: '0.875rem' }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}

export default ExercicesComptablesBCC;