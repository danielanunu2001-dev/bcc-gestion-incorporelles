import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiFile, FiDownload, FiTrash2, FiUpload,
  FiX, FiFileText, FiImage, FiArchive
} from 'react-icons/fi';

const DocumentList = ({ onRefresh }) => {
  const { id } = useParams();
  const { can } = usePermissions();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/actifs/${id}/documents`);
      setDocuments(res.data);
    } catch (err) {
      setError('Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('fichier', uploadFile);
    formData.append('description', description);

    try {
      setUploading(true);
      await api.post(`/actifs/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadFile(null);
      setDescription('');
      setShowUpload(false);
      fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc) => {
    window.open(`http://localhost:5000/api/actifs/${id}/documents/${doc.id}/download`, '_blank');
  };

  const handleDelete = async (docId, nom) => {
    if (window.confirm(`Supprimer le document "${nom}" ?`)) {
      try {
        await api.delete(`/actifs/${id}/documents/${docId}`);
        fetchDocuments();
      } catch (err) {
        setError('Erreur suppression');
      }
    }
  };

  const getFileIcon = (mime) => {
    if (mime?.startsWith('image/')) return <FiImage color="#10b981" />;
    if (mime?.includes('pdf')) return <FiFileText color="#ef4444" />;
    if (mime?.includes('zip') || mime?.includes('archive')) return <FiArchive color="#f59e0b" />;
    return <FiFile color='var(--text-secondary)' />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* En-tête */}
      <div style={styles.header}>
        <h3 style={styles.title}>Documents ({documents.length})</h3>
        {can(['admin', 'comptable', 'juridique']) && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={styles.uploadButton}
          >
            <FiUpload /> Ajouter un document
          </button>
        )}
      </div>

      {/* Formulaire d'upload */}
      {showUpload && (
        <div style={styles.uploadCard}>
          <div style={styles.uploadHeader}>
            <h4 style={styles.uploadTitle}>Ajouter un document</h4>
            <button onClick={() => setShowUpload(false)} style={styles.closeButton}>
              <FiX />
            </button>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Fichier</label>
            <input
              type="file"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Facture, contrat, etc."
              style={styles.input}
            />
          </div>
          <div style={styles.formActions}>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              style={styles.saveButton}
            >
              {uploading ? 'Upload...' : 'Upload'}
            </button>
            <button onClick={() => setShowUpload(false)} style={styles.cancelButton}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des documents */}
      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : documents.length === 0 ? (
        <div style={styles.emptyState}>
          <FiFile size={32} color="#94a3b8" />
          <p style={styles.emptyText}>Aucun document</p>
        </div>
      ) : (
        <div style={styles.list}>
          {documents.map((doc) => (
            <div key={doc.id} style={styles.documentCard}>
              <div style={styles.docIcon}>
                {getFileIcon(doc.type_fichier)}
              </div>
              <div style={styles.docInfo}>
                <div style={styles.docName}>{doc.nom_fichier}</div>
                <div style={styles.docMeta}>
                  {doc.description && <span style={styles.docDesc}>{doc.description}</span>}
                  <span style={styles.docSize}>{formatFileSize(doc.taille_fichier)}</span>
                  <span style={styles.docDate}>{formatDate(doc.date_upload)}</span>
                  {doc.createurDocument && (
                    <span style={styles.docUser}>par {doc.createurDocument.full_name}</span>
                  )}
                </div>
              </div>
              <div style={styles.docActions}>
                <button
                  onClick={() => handleDownload(doc)}
                  style={styles.actionButton}
                  title="Télécharger"
                >
                  <FiDownload />
                </button>
                {can(['admin']) && (
                  <button
                    onClick={() => handleDelete(doc.id, doc.nom_fichier)}
                    style={{ ...styles.actionButton, color: '#ef4444' }}
                    title="Supprimer"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0
  },
  uploadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  uploadCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  uploadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  uploadTitle: {
    margin: 0,
    fontSize: '1rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  fileInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
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
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  documentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  docIcon: {
    fontSize: '1.5rem'
  },
  docInfo: {
    flex: 1
  },
  docName: {
    fontWeight: '500',
    marginBottom: '0.25rem'
  },
  docMeta: {
    display: 'flex',
    gap: '0.75rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    flexWrap: 'wrap'
  },
  docDesc: {
    backgroundColor: '#e0f2fe',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px'
  },
  docSize: {
    // rien
  },
  docDate: {
    // rien
  },
  docUser: {
    // rien
  },
  docActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionButton: {
    padding: '0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: 'var(--text-secondary)'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    color: 'var(--text-secondary)'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '4px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8'
  },
  emptyText: {
    marginTop: '0.5rem'
  }
};

export default DocumentList;