// frontend/src/components/Documents/DocumentList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile, FiDownload, FiTrash2, FiUpload,
  FiX, FiFileText, FiImage, FiArchive, FiInfo,
  FiGrid, FiList, FiSearch, FiClock, FiUser, FiTag,
  FiChevronUp, FiChevronDown, FiFolder, FiDatabase,
  FiCheck, FiCheckSquare
} from 'react-icons/fi';

const DocumentList = ({ onRefresh, maxHeight = '400px' }) => {
  const { id } = useParams();
  const { can } = usePermissions();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('documentViewMode') || 'list';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  useEffect(() => {
    localStorage.setItem('documentViewMode', viewMode);
  }, [viewMode]);

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      setPermissionDenied(false);
      const res = await api.get(`/actifs/${id}/documents`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      if (err.response?.status === 403) {
        setPermissionDenied(true);
        setError("Vous n'avez pas les droits pour accéder aux documents de cet actif");
      } else {
        setError('Erreur lors du chargement des documents');
      }
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Le fichier ne doit pas dépasser 10 Mo");
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append('fichier', uploadFile);
    formData.append('description', description);

    try {
      setUploading(true);
      setError('');
      await api.post(`/actifs/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadFile(null);
      setDescription('');
      setShowUpload(false);
      await fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erreur upload:', err);
      if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits pour ajouter des documents");
      } else if (err.response?.status === 413) {
        setError("Le fichier est trop volumineux");
      } else {
        setError("Erreur lors de l'upload du document");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/actifs/${id}/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: doc.type_fichier || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nom_fichier;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits pour télécharger ce document");
      } else {
        setError("Erreur lors du téléchargement");
      }
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (docId, nom) => {
    if (!window.confirm(`Supprimer le document "${nom}" ? Cette action est irréversible.`)) return;
    
    try {
      await api.delete(`/actifs/${id}/documents/${docId}`);
      await fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erreur suppression:', err);
      if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits pour supprimer ce document");
      } else {
        setError("Erreur lors de la suppression");
      }
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Supprimer ${selectedDocuments.length} document(s) ? Cette action est irréversible.`)) return;
    
    try {
      await Promise.all(selectedDocuments.map(docId => 
        api.delete(`/actifs/${id}/documents/${docId}`)
      ));
      setSelectedDocuments([]);
      setIsBulkMode(false);
      await fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erreur suppression massive:', err);
      setError("Erreur lors de la suppression massive");
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleAllDocuments = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  const getFileIcon = (mime, nomFichier) => {
    if (mime?.startsWith('image/')) return <FiImage className="text-success" size={24} />;
    if (mime?.includes('pdf')) return <FiFileText className="text-danger" size={24} />;
    if (mime?.includes('zip') || mime?.includes('archive') || nomFichier?.includes('.zip')) {
      return <FiArchive className="text-warning" size={24} />;
    }
    if (nomFichier?.includes('.doc') || nomFichier?.includes('.docx')) {
      return <FiFileText className="text-primary" size={24} />;
    }
    if (nomFichier?.includes('.xls') || nomFichier?.includes('.xlsx')) {
      return <FiFileText className="text-success" size={24} />;
    }
    return <FiFile className="text-secondary" size={24} />;
  };

  const getFileType = (nomFichier) => {
    if (nomFichier?.includes('.pdf')) return 'pdf';
    if (nomFichier?.includes('.jpg') || nomFichier?.includes('.jpeg') || nomFichier?.includes('.png') || nomFichier?.includes('.gif')) return 'image';
    if (nomFichier?.includes('.doc') || nomFichier?.includes('.docx')) return 'word';
    if (nomFichier?.includes('.xls') || nomFichier?.includes('.xlsx')) return 'excel';
    if (nomFichier?.includes('.zip') || nomFichier?.includes('.rar') || nomFichier?.includes('.7z')) return 'archive';
    return 'autre';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return date;
    }
  };

  const getRelativeDate = (date) => {
    const now = new Date();
    const uploadDate = new Date(date);
    const diffDays = Math.floor((now - uploadDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine(s)`;
    return formatDate(date);
  };

  // Filtrer et trier les documents
  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.nom_fichier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || getFileType(doc.nom_fichier) === selectedType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch(sortBy) {
        case 'name':
          comparison = a.nom_fichier.localeCompare(b.nom_fichier);
          break;
        case 'size':
          comparison = (a.taille_fichier || 0) - (b.taille_fichier || 0);
          break;
        case 'date':
        default:
          comparison = new Date(a.date_upload) - new Date(b.date_upload);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Statistiques par type
  const statsByType = {
    total: documents.length,
    pdf: documents.filter(d => getFileType(d.nom_fichier) === 'pdf').length,
    image: documents.filter(d => getFileType(d.nom_fichier) === 'image').length,
    word: documents.filter(d => getFileType(d.nom_fichier) === 'word').length,
    excel: documents.filter(d => getFileType(d.nom_fichier) === 'excel').length,
    archive: documents.filter(d => getFileType(d.nom_fichier) === 'archive').length,
  };

  const totalSize = documents.reduce((sum, doc) => sum + (doc.taille_fichier || 0), 0);

  // Vérifier les droits
  const canUpload = can(['admin', 'comptable', 'juridique']);
  const canDelete = can(['admin']);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement des documents...</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div style={styles.permissionDenied}>
        <FiInfo size={48} style={{ color: '#f87171', marginBottom: '1rem' }} />
        <p style={{ color: '#f87171', fontWeight: '600' }}>{error}</p>
        <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
          Veuillez contacter un administrateur pour obtenir les droits nécessaires.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      {/* En-tête avec statistiques */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>
            <FiFolder style={styles.titleIcon} /> Documents
            <span style={styles.badge}>{documents.length}</span>
          </h3>
          <p style={styles.subtitle}>
            <FiDatabase size={12} /> {formatFileSize(totalSize)} au total
          </p>
        </div>
        <div style={styles.headerActions}>
          {isBulkMode && selectedDocuments.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete}
              style={styles.bulkDeleteButton}
            >
              <FiTrash2 size={16} /> Supprimer ({selectedDocuments.length})
            </motion.button>
          )}
          {canUpload && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUpload(!showUpload)}
              style={styles.uploadButton}
            >
              <FiUpload size={16} /> Ajouter un document
            </motion.button>
          )}
        </div>
      </div>

      {/* Cartes statistiques */}
      {documents.length > 0 && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>Total</small>
            <div style={styles.statValue}>{statsByType.total}</div>
          </div>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>PDF</small>
            <div style={{...styles.statValue, color: '#f87171'}}>{statsByType.pdf}</div>
          </div>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>Images</small>
            <div style={{...styles.statValue, color: '#34d399'}}>{statsByType.image}</div>
          </div>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>Word</small>
            <div style={{...styles.statValue, color: '#3b82f6'}}>{statsByType.word}</div>
          </div>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>Excel</small>
            <div style={{...styles.statValue, color: '#10b981'}}>{statsByType.excel}</div>
          </div>
          <div style={styles.statCard}>
            <small style={styles.statLabel}>Archives</small>
            <div style={{...styles.statValue, color: '#f59e0b'}}>{statsByType.archive}</div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.errorAlert}
          >
            <FiInfo size={16} />
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose}>
              <FiX size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire d'upload */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.uploadCard}
          >
            <div style={styles.uploadHeader}>
              <h4 style={styles.uploadTitle}>Ajouter un document</h4>
              <button onClick={() => setShowUpload(false)} style={styles.uploadClose}>
                <FiX size={20} />
              </button>
            </div>
            <div style={styles.uploadBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Fichier * (max 10 Mo)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"
                />
                {uploadFile && (
                  <div style={styles.filePreview}>
                    <span style={styles.filePreviewBadge}>
                      {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </span>
                  </div>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description (optionnelle)</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Facture d'acquisition, contrat de maintenance, etc."
                />
              </div>
              <div style={styles.uploadActions}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  style={styles.submitButton}
                >
                  {uploading ? (
                    <>
                      <div style={styles.smallSpinner}></div>
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <FiUpload size={14} /> Uploader
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUpload(false)}
                  style={styles.cancelButton}
                >
                  Annuler
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre d'outils */}
      {documents.length > 0 && (
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <div style={styles.searchBox}>
              <FiSearch size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={styles.searchClear}>
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
          <div style={styles.toolbarActions}>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Tous les types</option>
              <option value="pdf">PDF</option>
              <option value="image">Images</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="archive">Archives</option>
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.sortSelect}
            >
              <option value="date">Trier par date</option>
              <option value="name">Trier par nom</option>
              <option value="size">Trier par taille</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={styles.sortOrderButton}
            >
              {sortOrder === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </motion.button>
            <div style={styles.viewToggle}>
              <button 
                style={{...styles.toggleButton, ...(viewMode === 'list' ? styles.toggleActive : styles.toggleInactive)}}
                onClick={() => setViewMode('list')}
                title="Vue liste"
              >
                <FiList size={14} />
              </button>
              <button 
                style={{...styles.toggleButton, ...(viewMode === 'grid' ? styles.toggleActive : styles.toggleInactive)}}
                onClick={() => setViewMode('grid')}
                title="Vue grille"
              >
                <FiGrid size={14} />
              </button>
            </div>
            {canDelete && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsBulkMode(!isBulkMode)}
                style={{...styles.bulkModeButton, ...(isBulkMode ? styles.bulkModeActive : {})}}
              >
                {isBulkMode ? 'Annuler' : 'Sélection multiple'}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Liste des documents */}
      {filteredDocuments.length === 0 && !error ? (
        <div style={styles.emptyState}>
          <FiFile size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8' }}>
            {documents.length === 0 ? 'Aucun document associé à cet actif' : 'Aucun document ne correspond à votre recherche'}
          </p>
          {canUpload && documents.length === 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUpload(true)}
              style={styles.emptyAddButton}
            >
              <FiUpload size={14} /> Ajouter un document
            </motion.button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        // Vue Liste
        <div style={{...styles.listContainer, maxHeight}}>
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              style={{...styles.listItem, ...(selectedDocuments.includes(doc.id) ? styles.selectedItem : {})}}
            >
              <div style={styles.listItemContent}>
                {isBulkMode && canDelete && (
                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      style={styles.checkbox}
                    />
                  </div>
                )}
                <div style={styles.fileIcon}>{getFileIcon(doc.type_fichier, doc.nom_fichier)}</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileHeader}>
                    <div>
                      <h6 style={styles.fileName}>{doc.nom_fichier}</h6>
                      <div style={styles.fileMeta}>
                        {doc.description && (
                          <span style={styles.fileDescription}>
                            <FiTag size={10} /> {doc.description}
                          </span>
                        )}
                        <span title={formatDate(doc.date_upload)}>
                          <FiClock size={10} /> {getRelativeDate(doc.date_upload)}
                        </span>
                        <span>{formatFileSize(doc.taille_fichier)}</span>
                        {doc.createurDocument && (
                          <span><FiUser size={10} /> {doc.createurDocument.full_name || doc.createurDocument.nom}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={styles.fileActions}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDownload(doc)}
                    style={styles.downloadButton}
                    title="Télécharger"
                  >
                    <FiDownload size={14} />
                  </motion.button>
                  {canDelete && !isBulkMode && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(doc.id, doc.nom_fichier)}
                      style={styles.deleteButton}
                      title="Supprimer"
                    >
                      <FiTrash2 size={14} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // Vue Grille
        <div style={{...styles.gridContainer, maxHeight}}>
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              style={{...styles.gridItem, ...(selectedDocuments.includes(doc.id) ? styles.selectedItem : {})}}
            >
              {isBulkMode && canDelete && (
                <div style={styles.gridCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={() => toggleDocumentSelection(doc.id)}
                    style={styles.checkbox}
                  />
                </div>
              )}
              <div style={styles.gridIcon}>{getFileIcon(doc.type_fichier, doc.nom_fichier)}</div>
              <h6 style={styles.gridFileName} title={doc.nom_fichier}>{doc.nom_fichier}</h6>
              {doc.description && (
                <p style={styles.gridDescription} title={doc.description}>{doc.description}</p>
              )}
              <div style={styles.gridMeta}>
                <div title={formatDate(doc.date_upload)}>
                  <FiClock size={10} /> {getRelativeDate(doc.date_upload)}
                </div>
                <div>{formatFileSize(doc.taille_fichier)}</div>
              </div>
              <div style={styles.gridActions}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDownload(doc)}
                  style={styles.gridDownloadButton}
                  title="Télécharger"
                >
                  <FiDownload size={14} />
                </motion.button>
                {canDelete && !isBulkMode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(doc.id, doc.nom_fichier)}
                    style={styles.gridDeleteButton}
                    title="Supprimer"
                  >
                    <FiTrash2 size={14} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Résumé des filtres */}
      {searchTerm && filteredDocuments.length > 0 && (
        <div style={styles.filterSummary}>
          <small style={{ color: '#64748b' }}>
            {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} trouvé{filteredDocuments.length > 1 ? 's' : ''}
          </small>
        </div>
      )}

      {/* Mode sélection multiple - Barre flottante */}
      <AnimatePresence>
        {isBulkMode && selectedDocuments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={styles.bulkBar}
          >
            <div style={styles.bulkBarContent}>
              <span>{selectedDocuments.length} document(s) sélectionné(s)</span>
              <div style={styles.bulkBarActions}>
                <label style={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                    onChange={toggleAllDocuments}
                    style={styles.checkbox}
                  />
                  <span>Tout sélectionner</span>
                </label>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBulkDelete}
                  style={styles.bulkDeleteButtonSmall}
                >
                  Supprimer
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBulkMode(false)}
                  style={styles.bulkCancelButton}
                >
                  Annuler
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============ STYLES FUTURISTES ============
const styles = {
  container: {
    padding: '1.5rem',
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(0,255,247,0.2)',
    borderTop: '3px solid #00fff7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  loadingText: {
    color: '#94a3b8'
  },
  permissionDenied: {
    textAlign: 'center',
    padding: '3rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #00fff7 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  titleIcon: {
    color: '#00fff7'
  },
  badge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '20px',
    fontSize: '0.7rem',
    marginLeft: '0.5rem',
    color: '#00fff7'
  },
  subtitle: {
    fontSize: '0.7rem',
    color: '#64748b',
    marginTop: '0.25rem'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  bulkDeleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  statCard: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '12px',
    padding: '0.75rem',
    textAlign: 'center',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  statLabel: {
    fontSize: '0.6rem',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    marginBottom: '1rem',
    color: '#f87171',
    fontSize: '0.8rem'
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer'
  },
  uploadCard: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.2)',
    marginBottom: '1.5rem',
    overflow: 'hidden'
  },
  uploadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid rgba(0,255,247,0.15)'
  },
  uploadTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    margin: 0,
    color: '#e2e8f0'
  },
  uploadClose: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  uploadBody: {
    padding: '1.5rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: '0.5rem'
  },
  fileInput: {
    width: '100%',
    padding: '0.5rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.8rem'
  },
  filePreview: {
    marginTop: '0.5rem'
  },
  filePreviewBadge: {
    padding: '0.25rem 0.5rem',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '8px',
    fontSize: '0.7rem',
    color: '#00fff7'
  },
  formInput: {
    width: '100%',
    padding: '0.6rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.8rem',
    outline: 'none'
  },
  uploadActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1rem'
  },
  searchContainer: {
    flex: 1,
    minWidth: '200px'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '10px'
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#e2e8f0',
    fontSize: '0.8rem',
    outline: 'none'
  },
  searchClear: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer'
  },
  toolbarActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  filterSelect: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },
  sortSelect: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },
  sortOrderButton: {
    padding: '0.4rem 0.6rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#00fff7',
    cursor: 'pointer'
  },
  viewToggle: {
    display: 'flex',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  toggleButton: {
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleActive: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none'
  },
  toggleInactive: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none'
  },
  bulkModeButton: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  bulkModeActive: {
    background: 'rgba(239,68,68,0.2)',
    borderColor: '#ef4444',
    color: '#f87171'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '20px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  emptyAddButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: 'rgba(0,255,247,0.1)',
    border: '1px solid rgba(0,255,247,0.3)',
    borderRadius: '8px',
    color: '#00fff7',
    cursor: 'pointer'
  },
  listContainer: {
    overflowY: 'auto',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,255,247,0.15)'
  },
  listItem: {
    borderBottom: '1px solid rgba(0,255,247,0.08)',
    transition: 'background-color 0.2s'
  },
  selectedItem: {
    background: 'rgba(0,255,247,0.05)'
  },
  listItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem'
  },
  checkboxContainer: {
    flexShrink: 0
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#00fff7'
  },
  fileIcon: {
    flexShrink: 0
  },
  fileInfo: {
    flex: 1
  },
  fileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  fileName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    margin: 0,
    color: '#e2e8f0'
  },
  fileMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '0.25rem',
    fontSize: '0.65rem',
    color: '#64748b'
  },
  fileDescription: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.375rem',
    background: 'rgba(0,255,247,0.1)',
    borderRadius: '4px',
    color: '#00fff7'
  },
  fileActions: {
    display: 'flex',
    gap: '0.5rem',
    flexShrink: 0
  },
  downloadButton: {
    padding: '0.3rem',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '6px',
    color: '#3b82f6',
    cursor: 'pointer'
  },
  deleteButton: {
    padding: '0.3rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px',
    color: '#f87171',
    cursor: 'pointer'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
    overflowY: 'auto',
    background: 'transparent'
  },
  gridItem: {
    position: 'relative',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.55))',
    backdropFilter: 'blur(18px)',
    borderRadius: '16px',
    padding: '1rem',
    textAlign: 'center',
    border: '1px solid rgba(0,255,247,0.15)',
    transition: 'all 0.3s ease'
  },
  gridCheckbox: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem'
  },
  gridIcon: {
    marginBottom: '0.75rem'
  },
  gridFileName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  gridDescription: {
    fontSize: '0.65rem',
    color: '#64748b',
    margin: '0 0 0.5rem 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  gridMeta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    fontSize: '0.6rem',
    color: '#64748b',
    marginBottom: '0.75rem'
  },
  gridActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  gridDownloadButton: {
    padding: '0.3rem 0.6rem',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '6px',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  gridDeleteButton: {
    padding: '0.3rem 0.6rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  filterSummary: {
    textAlign: 'center',
    marginTop: '1rem'
  },
  bulkBar: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000
  },
  bulkBarContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
    backdropFilter: 'blur(20px)',
    borderRadius: '40px',
    border: '1px solid rgba(0,255,247,0.3)',
    color: '#e2e8f0',
    fontSize: '0.8rem'
  },
  bulkBarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  },
  bulkDeleteButtonSmall: {
    padding: '0.3rem 0.75rem',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none',
    borderRadius: '20px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  bulkCancelButton: {
    padding: '0.3rem 0.75rem',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(0,255,247,0.2)',
    borderRadius: '20px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  smallSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default DocumentList;