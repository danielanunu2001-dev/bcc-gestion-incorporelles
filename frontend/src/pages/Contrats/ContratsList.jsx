import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEye, FiEdit, FiTrash2, FiFileText,
  FiCalendar, FiDollarSign, FiUser
} from 'react-icons/fi';

const ContratsList = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ID de l'actif (optionnel)
  const { can } = usePermissions();
  
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🆔 ID actif reçu:', id);
    
    if (id && id !== 'undefined') {
      chargerContratsParActif();
    } else {
      chargerTousContrats();
    }
  }, [id]);

  const chargerContratsParActif = async () => {
    if (!id || id === 'undefined') {
      setError('ID actif invalide');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Chargement contrats pour actif:', id);
      
      const res = await api.get(`/actifs/${id}/contrats`);
      setContrats(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement contrats:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const chargerTousContrats = async () => {
    try {
      setLoading(true);
      console.log('📦 Chargement de tous les contrats');
      
      const res = await api.get('/contrats');
      setContrats(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement contrats:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contratId) => {
    if (window.confirm('Supprimer ce contrat ?')) {
      try {
        if (id && id !== 'undefined') {
          await api.delete(`/actifs/${id}/contrats/${contratId}`);
        } else {
          await api.delete(`/contrats/${contratId}`);
        }
        
        // Recharger la liste
        if (id && id !== 'undefined') {
          chargerContratsParActif();
        } else {
          chargerTousContrats();
        }
      } catch (err) {
        console.error('❌ Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
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

  const getStatutStyle = (dateFin) => {
    if (!dateFin) return { bg: '#f3f4f6', color: 'var(--text-secondary)', label: 'Non défini' };
    
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    
    if (fin < aujourdhui) {
      return { bg: '#fee2e2', color: '#ef4444', label: 'Expiré' };
    }
    
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) {
      return { bg: '#fed7aa', color: '#f59e0b', label: 'Expire bientôt' };
    }
    
    return { bg: '#dcfce7', color: '#10b981', label: 'Actif' };
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des contrats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorMessage}>{error}</p>
        <button onClick={() => navigate('/actifs')} style={styles.backButton}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {id ? 'Contrats de l\'actif' : 'Tous les contrats'}
        </h1>
        {can(['admin', 'juridique']) && id && (
          <button
            onClick={() => navigate(`/actifs/${id}/contrats/nouveau`)}
            style={styles.addButton}
          >
            <FiPlus /> Nouveau contrat
          </button>
        )}
      </div>

      {/* Liste des contrats */}
      {contrats.length === 0 ? (
        <div style={styles.noData}>
          <FiFileText size={48} color="#9ca3af" />
          <p>Aucun contrat trouvé</p>
        </div>
      ) : (
        <div style={styles.contratsGrid}>
          {contrats.map((contrat) => {
            const statut = getStatutStyle(contrat.date_fin);
            
            return (
              <div key={contrat.id} style={styles.contratCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.contratNumero}>{contrat.numero_contrat}</h3>
                  <span style={{
                    ...styles.statutBadge,
                    backgroundColor: statut.bg,
                    color: statut.color,
                  }}>
                    {statut.label}
                  </span>
                </div>
                
                <div style={styles.contratInfo}>
                  <div style={styles.infoItem}>
                    <FiUser style={styles.infoIcon} />
                    <span>{contrat.fournisseur || 'N/A'}</span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <FiCalendar style={styles.infoIcon} />
                    <span>
                      {formatDate(contrat.date_debut)} - {formatDate(contrat.date_fin)}
                    </span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <FiDollarSign style={styles.infoIcon} />
                    <span>{formatCurrency(contrat.montant)}</span>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => navigate(`/contrats/${contrat.id}`)}
                    style={styles.viewButton}
                    title="Voir détails"
                  >
                    <FiEye />
                  </button>
                  
                  {can(['admin', 'juridique']) && (
                    <>
                      <button
                        onClick={() => {
                          if (id) {
                            navigate(`/actifs/${id}/contrats/modifier/${contrat.id}`);
                          } else {
                            navigate(`/contrats/modifier/${contrat.id}`);
                          }
                        }}
                        style={styles.editButton}
                        title="Modifier"
                      >
                        <FiEdit />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(contrat.id)}
                        style={styles.deleteButton}
                        title="Supprimer"
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    color: '#1e3a8a',
    margin: 0,
  },
  addButton: {
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
  contratsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  contratCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s',
    ':hover': {
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  contratNumero: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0,
  },
  statutBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  contratInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  infoIcon: {
    color: '#2563eb',
    fontSize: '1rem',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
  },
  viewButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  noData: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    color: '#9ca3af',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '3rem',
  },
  errorMessage: {
    color: '#dc2626',
    marginBottom: '1rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

// Animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ContratsList;