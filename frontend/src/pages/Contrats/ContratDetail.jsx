import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiArrowLeft, FiEdit, FiTrash2, FiDownload,
  FiCalendar, FiDollarSign, FiUser, FiFileText,
  FiInfo, FiPrinter, FiEye
} from 'react-icons/fi';

const ContratDetail = () => {
  // ✅ CORRECTION : Selon l'URL que tu utilises
  // Si l'URL est /contrats/:contratId
  const { contratId } = useParams();
  
  // Si l'URL est /actifs/:id/contrats/:contratId, décommente ceci :
  // const { id, contratId } = useParams();
  
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  const [contrat, setContrat] = useState(null);
  const [actif, setActif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // ✅ Nouveaux états pour la facture
  const [factureInfo, setFactureInfo] = useState(null);
  const [loadingFacture, setLoadingFacture] = useState(false);
  const [downloadingFacture, setDownloadingFacture] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePdfUrl, setFacturePdfUrl] = useState(null);

  // ✅ Validation des IDs
  useEffect(() => {
    console.log('🆔 ID contrat reçu:', contratId);
    
    if (!contratId || contratId === 'undefined') {
      console.error('❌ ID contrat invalide:', contratId);
      setError('ID contrat invalide');
      setLoading(false);
      return;
    }
    
    chargerDonnees();
  }, [contratId]);

  // ✅ Charger les infos de la facture quand le contrat est chargé
  useEffect(() => {
    if (contrat && contrat.id) {
      chargerFacture();
    }
  }, [contrat]);

  const chargerDonnees = async () => {
    if (!contratId || contratId === 'undefined') {
      setError('ID contrat manquant');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Chargement du contrat:', contratId);
      
      // ✅ Charger le contrat directement
      const contratRes = await api.get(`/contrats/${contratId}`);
      setContrat(contratRes.data);
      
      // ✅ Si le contrat a un actif_id, charger l'actif associé
      if (contratRes.data.actif_id && contratRes.data.actif_id !== 'undefined') {
        try {
          const actifRes = await api.get(`/actifs/${contratRes.data.actif_id}`);
          setActif(actifRes.data);
        } catch (actifErr) {
          console.log('Impossible de charger l\'actif associé');
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Charger les informations de la facture
  const chargerFacture = async () => {
    if (!contratId) return;
    try {
      setLoadingFacture(true);
      const res = await api.get(`/contrats/${contratId}/facture`);
      setFactureInfo(res.data);
    } catch (err) {
      console.log('Aucune facture trouvée pour ce contrat');
      setFactureInfo(null);
    } finally {
      setLoadingFacture(false);
    }
  };

  // ✅ Télécharger la facture PDF
  const handleDownloadFacture = async () => {
    if (!contratId) return;
    setDownloadingFacture(true);
    try {
      const response = await api.get(`/contrats/${contratId}/facture/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_contrat_${contrat.numero_contrat}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement facture:', err);
      alert('Impossible de télécharger la facture. Vérifiez qu\'elle existe.');
    } finally {
      setDownloadingFacture(false);
    }
  };

  // ✅ Afficher la facture dans un modal
  const handleViewFacture = async () => {
    if (!contratId) return;
    setLoadingFacture(true);
    try {
      const response = await api.get(`/contrats/${contratId}/facture/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setFacturePdfUrl(url);
      setShowFactureModal(true);
    } catch (err) {
      console.error('Erreur chargement facture:', err);
      alert('Impossible de charger la facture. Vérifiez qu\'elle existe.');
    } finally {
      setLoadingFacture(false);
    }
  };

  const handleDelete = async () => {
    if (!contratId || contratId === 'undefined') return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      try {
        await api.delete(`/contrats/${contratId}`);
        navigate('/contrats');
      } catch (err) {
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleDownload = () => {
    if (contrat?.fichier) {
      window.open(contrat.fichier, '_blank');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR') + ' ' + 
             date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Date invalide';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0
      }).format(value);
    } catch {
      return `${value} FC`;
    }
  };

  const getStatutInfo = (dateFin) => {
    if (!dateFin) return { label: 'Non défini', color: 'var(--text-secondary)', bg: '#f3f4f6' };
    
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    
    if (fin < aujourdhui) {
      return { label: 'Expiré', color: '#ef4444', bg: '#fee2e2' };
    }
    
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) {
      return { label: 'Expire bientôt', color: '#f59e0b', bg: '#fed7aa' };
    }
    
    return { label: 'Actif', color: '#10b981', bg: '#dcfce7' };
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  if (error || !contrat) {
    return (
      <div style={styles.error}>
        <p>{error || 'Contrat non trouvé'}</p>
        <button onClick={() => navigate('/contrats')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
      </div>
    );
  }

  const statutInfo = getStatutInfo(contrat.date_fin);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/contrats')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <h1 style={styles.title}>Contrat {contrat.numero_contrat}</h1>
        <div style={styles.actions}>
          {contrat.fichier && (
            <button onClick={handleDownload} style={styles.downloadButton}>
              <FiDownload /> Télécharger
            </button>
          )}
          {can(['admin', 'juridique']) && (
            <>
              <button
                onClick={() => navigate(`/contrats/modifier/${contratId}`)}
                style={styles.editButton}
              >
                <FiEdit /> Modifier
              </button>
              <button onClick={handleDelete} style={styles.deleteButton}>
                <FiTrash2 /> Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Statut */}
      <div style={{ ...styles.statutBadge, backgroundColor: statutInfo.bg, color: statutInfo.color }}>
        {statutInfo.label}
      </div>

      {/* ✅ Carte de la facture */}
      {factureInfo && (
        <div style={styles.factureCard}>
          <div style={styles.factureHeader}>
            <FiFileText size={18} color="#2563eb" />
            <strong>Facture du contrat</strong>
          </div>
          <div style={styles.factureInfo}>
            <div>
              <span style={styles.factureLabel}>N° Facture:</span>
              <span style={styles.factureValue}>{factureInfo.nom_fichier?.replace('facture_contrat_', '').replace('.pdf', '') || `FAC-${contrat.numero_contrat}`}</span>
            </div>
            <div>
              <span style={styles.factureLabel}>Date de génération:</span>
              <span style={styles.factureValue}>{formatDateTime(contrat.created_at)}</span>
            </div>
          </div>
          <div style={styles.factureActions}>
            <button onClick={handleViewFacture} style={styles.viewFactureButton} disabled={loadingFacture}>
              <FiEye /> {loadingFacture ? 'Chargement...' : 'Aperçu'}
            </button>
            <button onClick={handleDownloadFacture} style={styles.downloadFactureButton} disabled={downloadingFacture}>
              <FiDownload /> {downloadingFacture ? 'Téléchargement...' : 'Télécharger PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Actif associé */}
      {actif && (
        <div style={styles.actifCard}>
          <FiFileText />
          <span>
            <strong>Actif associé :</strong> {actif.code} - {actif.nom}
          </span>
          <button onClick={() => navigate(`/actifs/${actif.id}`)} style={styles.viewButton}>
            Voir l'actif
          </button>
        </div>
      )}

      {/* Informations */}
      <div style={styles.infoCard}>
        {/* Ligne 1 - Numéro de contrat */}
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Numéro de contrat</span>
          <span style={styles.infoValue}>{contrat.numero_contrat}</span>
        </div>
        
        {/* Ligne 2 - Fournisseur */}
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Fournisseur</span>
          <span style={styles.infoValue}>{contrat.fournisseur}</span>
        </div>
        
        {/* Ligne 3 - Date de début */}
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Date de début</span>
          <span style={styles.infoValue}>{formatDate(contrat.date_debut)}</span>
        </div>
        
        {/* Ligne 4 - Date de fin */}
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Date de fin</span>
          <span style={styles.infoValue}>{formatDate(contrat.date_fin)}</span>
        </div>
        
        {/* Ligne 5 - Montant (dernière ligne sans bordure) */}
        <div style={{ ...styles.infoRow, ...styles.lastInfoRow }}>
          <span style={styles.infoLabel}>Montant</span>
          <span style={styles.infoValue}>{formatCurrency(contrat.montant)}</span>
        </div>
        
        {/* ✅ Ligne supplémentaire - Date de création */}
        <div style={{ ...styles.infoRow, ...styles.lastInfoRow }}>
          <span style={styles.infoLabel}>Date de création</span>
          <span style={styles.infoValue}>{formatDateTime(contrat.created_at)}</span>
        </div>
      </div>

      {/* Description */}
      {contrat.description && (
        <div style={styles.descriptionCard}>
          <h3>Description</h3>
          <p>{contrat.description}</p>
        </div>
      )}

      {/* ✅ Modal Facture PDF */}
      {showFactureModal && (
        <div style={styles.modalOverlay} onClick={() => {
          if (facturePdfUrl) {
            window.URL.revokeObjectURL(facturePdfUrl);
          }
          setShowFactureModal(false);
        }}>
          <div style={styles.modalFactureContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiFileText size={20} style={{ marginRight: '0.5rem' }} />
                Facture - Contrat {contrat.numero_contrat}
              </h3>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.URL.revokeObjectURL(facturePdfUrl);
                  }
                  setShowFactureModal(false);
                }}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.pdfContainer}>
              {facturePdfUrl && (
                <iframe
                  src={facturePdfUrl}
                  style={styles.pdfIframe}
                  title="Facture PDF"
                />
              )}
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    const link = document.createElement('a');
                    link.href = facturePdfUrl;
                    link.download = `facture_contrat_${contrat.numero_contrat}.pdf`;
                    link.click();
                  }
                }}
                style={styles.downloadButton}
              >
                <FiDownload /> Télécharger
              </button>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.open(facturePdfUrl, '_blank');
                  }
                }}
                style={styles.printButton}
              >
                <FiPrinter /> Ouvrir dans un nouvel onglet
              </button>
              <button 
                onClick={() => {
                  if (facturePdfUrl) {
                    window.URL.revokeObjectURL(facturePdfUrl);
                  }
                  setShowFactureModal(false);
                }}
                style={styles.cancelButton}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  title: {
    flex: 1,
    fontSize: '1.5rem',
    color: '#1e3a8a',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  downloadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statutBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '1rem',
  },
  // ✅ Styles pour la carte de facture
  factureCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  factureHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #bbf7d0',
  },
  factureInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  factureLabel: {
    fontSize: '0.75rem',
    color: '#166534',
    marginRight: '0.5rem',
  },
  factureValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#14532d',
  },
  factureActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  viewFactureButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  downloadFactureButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  actifCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  viewButton: {
    marginLeft: 'auto',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  infoCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  lastInfoRow: {
    borderBottom: 'none',
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#666',
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111',
  },
  descriptionCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '3rem',
    color: '#dc2626',
  },
  // ✅ Styles pour le modal facture
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalFactureContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1rem',
    width: '90%',
    maxWidth: '900px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
  },
  pdfContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    marginTop: '1rem',
  },
  pdfIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '4px',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
    marginTop: '1rem',
  },
  printButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
};

export default ContratDetail;