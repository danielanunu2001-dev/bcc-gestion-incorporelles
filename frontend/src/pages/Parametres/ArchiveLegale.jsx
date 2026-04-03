import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiArchive, FiDownload, FiSearch, FiUpload, 
  FiTrash2, FiEye, FiFile, FiFileText, FiImage,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiFilter,
  FiCalendar, FiDatabase, FiHardDrive, FiClock,
  FiAlertCircle, FiPlus, FiPrinter, FiShare2
} from 'react-icons/fi';
import api from '../../services/api';
import DocumentViewer from '../../components/DocumentViewer/DocumentViewer';

const ArchiveLegale = () => {
  const navigate = useNavigate();
  const [archives, setArchives] = useState([]);
  const [filteredArchives, setFilteredArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [annee, setAnnee] = useState('');
  const [typeFichier, setTypeFichier] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    nom: '',
    description: '',
    type: 'PDF'
  });
  const [downloading, setDownloading] = useState(false);
  
  // État pour le visionneur de documents
  const [viewer, setViewer] = useState({
    open: false,
    file: null,
    filename: null,
    fileType: null
  });

  // Types de fichiers disponibles
  const typesFichiers = [
    { value: 'PDF', label: 'PDF', icon: <FiFileText size={14} />, color: '#ef4444' },
    { value: 'XLSX', label: 'Excel', icon: <FiFile size={14} />, color: '#10b981' },
    { value: 'DOCX', label: 'Word', icon: <FiFileText size={14} />, color: '#3b82f6' },
    { value: 'JPG', label: 'Image', icon: <FiImage size={14} />, color: '#f59e0b' },
    { value: 'ZIP', label: 'Archive', icon: <FiArchive size={14} />, color: '#8b5cf6' }
  ];

  // Charger les documents depuis l'API
  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterArchives();
  }, [archives, searchTerm, annee, typeFichier]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // ✅ MODIFICATION: Utiliser /all au lieu de /
      const response = await api.get('/documents/all');
      // Transformer les données de l'API pour correspondre à la structure du frontend
      const formattedDocs = response.data.map(doc => ({
        id: doc.id,
        nom: doc.nom_fichier,
        type: doc.type_fichier?.split('/')[1]?.toUpperCase() || 'PDF',
        date: doc.date_upload?.split('T')[0] || new Date().toISOString().split('T')[0],
        taille: `${(doc.taille_fichier / (1024 * 1024)).toFixed(1)} MB`,
        description: doc.description || '',
        uploadedBy: doc.createurDocument?.full_name || 'Système',
        uploadedAt: doc.date_upload,
        reference: doc.nom_fichier,
        auteur: 'Banque Centrale du Congo'
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

  const filterArchives = () => {
    let filtered = [...archives];
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.reference && a.reference.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (annee) {
      filtered = filtered.filter(a => a.date.includes(annee));
    }
    
    if (typeFichier) {
      filtered = filtered.filter(a => a.type === typeFichier);
    }
    
    setFilteredArchives(filtered);
  };

  // Fonction pour générer le contenu PDF pour l'aperçu
  const generatePDFContent = (archive) => {
    return `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 24 Tf
100 700 Td
(BANQUE CENTRALE DU CONGO) Tj
/F1 18 Tf
0 -50 Td
(${archive.nom}) Tj
/F1 12 Tf
0 -80 Td
(Reference: ${archive.reference}) Tj
0 -30 Td
(Date: ${new Date(archive.date).toLocaleDateString('fr-FR')}) Tj
0 -30 Td
(Auteur: ${archive.auteur}) Tj
0 -50 Td
(Description:) Tj
0 -20 Td
(${archive.description}) Tj
0 -100 Td
(Document officiel de la Banque Centrale du Congo) Tj
0 -30 Td
(www.bcc.cd) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000220 00000 n
0000000770 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
820
%%EOF
    `;
  };

  const generateExcelContent = (archive) => {
    return `Banque Centrale du Congo - ${archive.nom}
Date: ${new Date(archive.date).toLocaleDateString('fr-FR')}
Référence: ${archive.reference}
Auteur: ${archive.auteur}

Description: ${archive.description}

--- Ce document est un fichier Excel généré automatiquement ---
--- Banque Centrale du Congo - Tous droits réservés ---
    `;
  };

  // Fonction pour télécharger un document depuis l'API
  const handleDownload = async (archive) => {
    setDownloading(true);
    try {
      // Récupérer le fichier depuis l'API
      const response = await api.get(`/documents/${archive.id}/download`, {
        responseType: 'blob'
      });
      
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
      console.error('Erreur téléchargement:', err);
      setError('Erreur lors du téléchargement du document');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDownloading(false);
    }
  };

  // Fonction pour ouvrir un document dans le visionneur
  const openDocumentInViewer = async (archive, action = 'preview') => {
    try {
      // Récupérer le fichier depuis l'API
      const response = await api.get(`/documents/${archive.id}/download`, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const fileType = archive.type.toLowerCase();
      
      setViewer({
        open: true,
        file: blob,
        filename: archive.nom,
        fileType: fileType
      });
      
    } catch (err) {
      console.error('Erreur ouverture document:', err);
      setError('Impossible d\'ouvrir le document');
      setTimeout(() => setError(''), 3000);
    }
  };

  const closeViewer = () => {
    setViewer({ open: false, file: null, filename: null, fileType: null });
  };

  const handlePreview = (archive) => {
    openDocumentInViewer(archive, 'preview');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm(prev => ({
        ...prev,
        nom: file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!uploadForm.nom.trim()) {
      setError('Veuillez saisir un nom pour le document');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nom', uploadForm.nom);
      formData.append('description', uploadForm.description);
      formData.append('type', uploadForm.type);
      
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess('Document ajouté avec succès dans l\'archive légale');
      setTimeout(() => setSuccess(''), 3000);
      
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ nom: '', description: '', type: 'PDF' });
      
      // Recharger les documents
      fetchDocuments();
    } catch (err) {
      console.error('Erreur upload:', err);
      setError('Erreur lors de l\'upload du document');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) {
      try {
        await api.delete(`/documents/${id}`);
        setSuccess('Document supprimé avec succès');
        setTimeout(() => setSuccess(''), 3000);
        fetchDocuments(); // Recharger la liste
      } catch (err) {
        console.error('Erreur suppression:', err);
        setError('Erreur lors de la suppression du document');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setAnnee('');
    setTypeFichier('');
  };

  const getTypeBadge = (type) => {
    const typeConfig = typesFichiers.find(t => t.value === type) || typesFichiers[0];
    return (
      <span style={{
        ...styles.typeBadge,
        backgroundColor: `${typeConfig.color}20`,
        color: typeConfig.color
      }}>
        {typeConfig.icon}
        {typeConfig.label}
      </span>
    );
  };

  const getTotalSize = () => {
    return filteredArchives.reduce((total, archive) => {
      const size = parseFloat(archive.taille);
      return total + (isNaN(size) ? 0 : size);
    }, 0).toFixed(1);
  };

  const getAnneeOptions = () => {
    const annees = [...new Set(archives.map(a => a.date.split('-')[0]))];
    return annees.sort().reverse();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Chargement des archives BCC...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/parametres')} style={styles.backButton}>
            <FiArrowLeft size={18} /> Retour
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.iconWrapper}>
              <FiArchive size={28} color="#8b5cf6" />
            </div>
            <div>
              <h1 style={styles.title}>Archive légale - BCC</h1>
              <p style={styles.subtitle}>
                Banque Centrale du Congo - Gestion des documents juridiques et administratifs
              </p>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleReset} style={styles.resetButton}>
            <FiRefreshCw /> Réinitialiser
          </button>
          <button onClick={() => setShowUploadModal(true)} style={styles.uploadButton}>
            <FiUpload /> Ajouter un document
          </button>
        </div>
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
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
              <FiArchive size={24} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Total documents BCC</span>
              <span style={styles.statValue}>{filteredArchives.length}</span>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#e0e7ff', color: '#6366f1' }}>
              <FiHardDrive size={24} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Taille totale archive</span>
              <span style={styles.statValue}>{getTotalSize()} MB</span>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#d1fae5', color: '#10b981' }}>
              <FiDatabase size={24} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Types de documents</span>
              <span style={styles.statValue}>{[...new Set(archives.map(a => a.type))].length}</span>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#fed7aa', color: '#f59e0b' }}>
              <FiCalendar size={24} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Dernier document</span>
              <span style={styles.statValue}>
                {archives.length > 0 ? new Date(archives[0].uploadedAt).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.filtersSection}>
          <div style={styles.searchWrapper}>
            <FiSearch size={18} color="#94a3b8" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par titre, référence ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <FiFilter size={18} color="#94a3b8" />
            <select
              value={annee}
              onChange={(e) => setAnnee(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">Toutes les années</option>
              {getAnneeOptions().map(an => (
                <option key={an} value={an}>{an}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={typeFichier}
              onChange={(e) => setTypeFichier(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">Tous les types</option>
              {typesFichiers.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {(searchTerm || annee || typeFichier) && (
            <button onClick={handleReset} style={styles.clearButton}>
              <FiXCircle size={14} /> Effacer
            </button>
          )}
        </div>

        <div style={styles.listSection}>
          <div style={styles.listHeader}>
            <h3 style={styles.listTitle}>Archives officielles BCC</h3>
            <span style={styles.listCount}>
              <FiClock size={12} /> {filteredArchives.length} document(s)
            </span>
          </div>
          
          {filteredArchives.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle size={64} color="#cbd5e1" />
              <h4 style={styles.emptyTitle}>Aucun document trouvé</h4>
              <p style={styles.emptyText}>
                Aucun document ne correspond à vos critères de recherche
              </p>
              <button onClick={() => setShowUploadModal(true)} style={styles.emptyButton}>
                <FiPlus /> Ajouter un document
              </button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Document</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Référence</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Taille</th>
                    <th style={styles.th}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {filteredArchives.map(archive => (
                    <tr key={archive.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.documentInfo}>
                          <FiFileText size={16} color="#8b5cf6" />
                          <div>
                            <strong>{archive.nom}</strong>
                            <small style={styles.documentRef}>{archive.reference}</small>
                          </div>
                        </div>
                       </td>
                      <td style={styles.td}>{getTypeBadge(archive.type)}</td>
                      <td style={styles.td}>
                        <span style={styles.referenceBadge}>{archive.reference}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.dateCell}>
                          <FiCalendar size={12} color="#94a3b8" />
                          <span>{new Date(archive.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.sizeBadge}>{archive.taille}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handlePreview(archive)}
                            style={styles.previewButton}
                            title="Aperçu"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(archive)}
                            style={styles.downloadButton}
                            title="Télécharger"
                            disabled={downloading}
                          >
                            <FiDownload size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(archive.id)}
                            style={styles.deleteButton}
                            title="Supprimer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'upload */}
      {showUploadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}>
                <FiUpload size={24} color="#8b5cf6" />
              </div>
              <div>
                <h3 style={styles.modalTitle}>Ajouter un document BCC</h3>
                <p style={styles.modalSubtitle}>Téléchargez un nouveau document dans l'archive légale</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={styles.modalClose}>
                <FiXCircle size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.uploadArea}>
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileSelect}
                  style={styles.fileInput}
                  accept=".pdf,.xlsx,.docx,.jpg,.png,.zip"
                />
                <label htmlFor="file-upload" style={styles.fileLabel}>
                  {selectedFile ? (
                    <>
                      <FiCheckCircle size={32} color="#10b981" />
                      <span>{selectedFile.name}</span>
                      <small>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</small>
                    </>
                  ) : (
                    <>
                      <FiUpload size={32} color="#8b5cf6" />
                      <span>Cliquez pour sélectionner un fichier</span>
                      <small>PDF, Excel, Word, Image ou ZIP - Max 50 MB</small>
                    </>
                  )}
                </label>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nom du document</label>
                <input
                  type="text"
                  value={uploadForm.nom}
                  onChange={(e) => setUploadForm({ ...uploadForm, nom: e.target.value })}
                  placeholder="Ex: Circulaire_BCC_2025-003_Taux_Change"
                  style={styles.formInput}
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Type de document</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                    style={styles.formSelect}
                  >
                    {typesFichiers.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Décrivez le contenu de ce document..."
                  rows="3"
                  style={styles.formTextarea}
                />
              </div>
              
              <div style={styles.infoBox}>
                <FiAlertCircle size={16} color="#8b5cf6" />
                <span>Les documents ajoutés seront automatiquement référencés et archivés selon les normes de la Banque Centrale du Congo.</span>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button onClick={() => setShowUploadModal(false)} style={styles.cancelButton}>
                Annuler
              </button>
              <button onClick={handleUpload} style={styles.confirmButton} disabled={uploading}>
                {uploading ? (
                  <>
                    <div style={styles.savingSpinner}></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <FiUpload /> Ajouter à l'archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visionneur de documents */}
      {viewer.open && (
        <DocumentViewer
          file={viewer.file}
          filename={viewer.filename}
          fileType={viewer.fileType}
          onClose={closeViewer}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto'
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
    flex: 1
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569',
    marginBottom: '1rem',
    transition: 'all 0.2s'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#f3e8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#475569',
    transition: 'all 0.2s'
  },
  uploadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#8b5cf6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  },
  downloadingMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#1e40af',
    fontSize: '0.875rem'
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '2px solid #3b82f6',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#065f46',
    fontSize: '0.875rem',
    animation: 'fadeIn 0.3s ease'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#991b1b',
    fontSize: '0.875rem',
    animation: 'fadeIn 0.3s ease'
  },
  content: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.2s',
    border: '1px solid #e5e7eb'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statInfo: {
    flex: 1
  },
  statLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.25rem'
  },
  statValue: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  filtersSection: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchWrapper: {
    flex: 2,
    position: 'relative',
    minWidth: '250px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)'
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 0.625rem 0.625rem 2.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  filterSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outline: 'none'
  },
  clearButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: '#475569'
  },
  listSection: {
    marginTop: '1rem'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #f1f5f9'
  },
  listTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  listCount: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '0.75rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  documentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  documentRef: {
    display: 'block',
    fontSize: '0.65rem',
    color: '#8b5cf6',
    fontFamily: 'monospace'
  },
  referenceBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f3e8ff',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500',
    fontFamily: 'monospace',
    color: '#8b5cf6'
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem'
  },
  sizeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500',
    fontFamily: 'monospace'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  previewButton: {
    padding: '0.375rem',
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  downloadButton: {
    padding: '0.375rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  deleteButton: {
    padding: '0.375rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  emptyTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '1rem 0 0.5rem 0'
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#8b5cf6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  },
  modal: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '550px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    animation: 'slideUp 0.3s ease'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative'
  },
  modalIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f3e8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  modalSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: '0.25rem 0 0 0'
  },
  modalClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'all 0.2s'
  },
  modalBody: {
    padding: '1.5rem'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f8fafc'
  },
  uploadArea: {
    marginBottom: '1.5rem'
  },
  fileInput: {
    display: 'none'
  },
  fileLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '2rem',
    border: '2px dashed #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem'
  },
  formLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  formInput: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  },
  formSelect: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-card)'
  },
  formTextarea: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#f3e8ff',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: '#8b5cf6',
    marginTop: '1rem'
  },
  cancelButton: {
    padding: '0.625rem 1.5rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#475569'
  },
  confirmButton: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#8b5cf6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  savingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid white',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
};

// Ajout des animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ArchiveLegale;