// frontend/src/components/Devises/TauxManagement.jsx

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  FiRefreshCw, FiTrendingUp, FiTrendingDown, 
  FiClock, FiAlertCircle, FiCheckCircle,
  FiEdit2, FiSave, FiX
} from 'react-icons/fi';

const TauxManagement = () => {
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    chargerDevises();
    const interval = setInterval(() => {
      if (autoUpdate) chargerDevises();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoUpdate]);

  const chargerDevises = async () => {
    try {
      setLoading(true);
      const res = await api.get('/devises');
      setDevises(res.data);
      setLastUpdate(new Date());
      
      res.data.forEach(devise => {
        if (Math.abs(devise.variation) > 2) {
          addNotification({
            type: 'warning',
            message: `${devise.code} a varié de ${devise.variation.toFixed(2)}%`,
            variant: devise.variation > 0 ? 'up' : 'down'
          });
        }
      });
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== notif));
    }, 5000);
  };

  const updateTaux = async (deviseId, data) => {
    try {
      await api.put(`/devises/${deviseId}/taux`, data);
      chargerDevises();
      setEditing(null);
      addNotification({
        type: 'success',
        message: 'Taux mis à jour avec succès'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour'
      });
    }
  };

  const forceUpdate = async () => {
    setLoading(true);
    await api.post('/devises/force-update');
    await chargerDevises();
    addNotification({
      type: 'success',
      message: 'Mise à jour forcée effectuée'
    });
  };

  const getVariationIcon = (variation) => {
    if (variation > 0) return <FiTrendingUp color="#10b981" />;
    if (variation < 0) return <FiTrendingDown color="#ef4444" />;
    return <FiClock color='var(--text-secondary)' />;
  };

  const getVariationColor = (variation) => {
    if (variation > 0) return '#10b981';
    if (variation < 0) return '#ef4444';
    return 'var(--text-secondary)';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const devisePrincipale = devises.find(d => d.est_principale);
  const autresDevises = devises.filter(d => !d.est_principale);

  return (
    <div style={styles.container}>
      {/* Notifications flottantes */}
      <div style={styles.notificationsContainer}>
        {notifications.map((notif, index) => (
          <div key={index} style={{
            ...styles.notification,
            backgroundColor: notif.type === 'success' ? '#10b981' : 
                           notif.type === 'error' ? '#ef4444' : '#f59e0b'
          }}>
            {notif.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{notif.message}</span>
          </div>
        ))}
      </div>

      {/* En-tête */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des taux de change</h1>
          <p style={styles.subtitle}>
            Dernière mise à jour : {lastUpdate?.toLocaleTimeString('fr-FR')}
            {autoUpdate && <span style={styles.autoBadge}>Auto-actualisation active</span>}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            style={{
              ...styles.autoButton,
              backgroundColor: autoUpdate ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            <FiRefreshCw className={autoUpdate ? 'spin' : ''} />
            {autoUpdate ? 'Auto-actualisation ON' : 'Auto-actualisation OFF'}
          </button>
          <button onClick={forceUpdate} style={styles.refreshButton} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes */}
      <div style={styles.cardsContainer}>
        {/* Devise principale */}
        {devisePrincipale && (
          <div style={styles.principalCard}>
            <div style={styles.cardIcon}>🇨🇩</div>
            <div style={styles.cardContent}>
              <div style={styles.cardTitle}>{devisePrincipale.nom}</div>
              <div style={styles.cardCode}>{devisePrincipale.code}</div>
              <div style={styles.cardRate}>Devise de référence</div>
            </div>
          </div>
        )}

        {/* Autres devises */}
        {autresDevises.map(devise => (
          <div key={devise.id} style={styles.deviseCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>
                {devise.code === 'USD' && '🇺🇸'}
                {devise.code === 'EUR' && '🇪🇺'}
                {devise.code === 'GBP' && '🇬🇧'}
                {devise.code === 'CNY' && '🇨🇳'}
                {!['USD', 'EUR', 'GBP', 'CNY'].includes(devise.code) && '💱'}
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardTitle}>{devise.nom}</div>
                <div style={styles.cardCode}>{devise.code}</div>
              </div>
              <div style={{
                ...styles.variationBadge,
                backgroundColor: getVariationColor(devise.variation) + '20'
              }}>
                {getVariationIcon(devise.variation)}
                <span style={{ color: getVariationColor(devise.variation) }}>
                  {devise.variation > 0 ? '+' : ''}{devise.variation?.toFixed(2)}%
                </span>
              </div>
            </div>

            <div style={styles.ratesContainer}>
              <div style={styles.rateItem}>
                <span style={styles.rateLabel}>Achat (BCC vend)</span>
                {editing === devise.id ? (
                  <input
                    type="number"
                    value={editValues.taux_achat || devise.taux_achat}
                    onChange={(e) => setEditValues({...editValues, taux_achat: e.target.value})}
                    style={styles.rateInput}
                    step="0.000001"
                  />
                ) : (
                  <span style={styles.rateValue}>
                    {formatCurrency(devise.taux_achat)} <span style={styles.rateSymbol}>{devise.code}</span>
                  </span>
                )}
              </div>
              <div style={styles.rateItem}>
                <span style={styles.rateLabel}>Vente (BCC achète)</span>
                {editing === devise.id ? (
                  <input
                    type="number"
                    value={editValues.taux_vente || devise.taux_vente}
                    onChange={(e) => setEditValues({...editValues, taux_vente: e.target.value})}
                    style={styles.rateInput}
                    step="0.000001"
                  />
                ) : (
                  <span style={styles.rateValue}>
                    {formatCurrency(devise.taux_vente)} <span style={styles.rateSymbol}>{devise.code}</span>
                  </span>
                )}
              </div>
              <div style={styles.rateItem}>
                <span style={styles.rateLabel}>Taux moyen</span>
                <span style={styles.rateValue}>
                  {formatCurrency(devise.taux_moyen)} <span style={styles.rateSymbol}>{devise.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.cardFooter}>
              <div style={styles.sourceInfo}>
                <FiClock size={12} />
                <span>{new Date(devise.date_taux).toLocaleDateString('fr-FR')}</span>
                <span style={styles.source}>| {devise.source}</span>
              </div>
              <div style={styles.cardActions}>
                {editing === devise.id ? (
                  <>
                    <button
                      onClick={() => updateTaux(devise.id, editValues)}
                      style={styles.saveButton}
                    >
                      <FiSave /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={styles.cancelButton}
                    >
                      <FiX /> Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditing(devise.id);
                      setEditValues({
                        taux_achat: devise.taux_achat,
                        taux_vente: devise.taux_vente
                      });
                    }}
                    style={styles.editButton}
                  >
                    <FiEdit2 /> Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historique */}
      <div style={styles.historiqueSection}>
        <h3 style={styles.historiqueTitle}>
          <FiClock /> Évolution des taux (7 derniers jours)
        </h3>
        <div style={styles.historiqueContainer}>
          <p style={styles.historiquePlaceholder}>
            Graphique d'évolution à venir...
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative'
  },
  notificationsContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'var(--bg-card)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    animation: 'slideIn 0.3s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '1.8rem',
    color: '#1e3a8a',
    margin: 0
  },
  subtitle: {
    color: '#666',
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  autoBadge: {
    backgroundColor: '#10b98120',
    color: '#10b981',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem'
  },
  autoButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  refreshButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem'
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  principalCard: {
    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: 'var(--bg-card)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  deviseCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb'
  },
  cardIcon: {
    fontSize: '2.5rem'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#111'
  },
  cardCode: {
    fontSize: '0.8rem',
    color: '#666'
  },
  variationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  ratesContainer: {
    marginBottom: '1.5rem'
  },
  rateItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px dashed #e5e7eb'
  },
  rateLabel: {
    fontSize: '0.85rem',
    color: '#666'
  },
  rateValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111'
  },
  rateSymbol: {
    fontSize: '0.8rem',
    fontWeight: 'normal',
    color: '#666'
  },
  rateInput: {
    width: '120px',
    padding: '0.25rem 0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    textAlign: 'right'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  sourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#666'
  },
  source: {
    color: '#2563eb'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  editButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  saveButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  cancelButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: 'var(--text-secondary)',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  historiqueSection: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  historiqueTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  historiqueContainer: {
    minHeight: '200px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '1rem'
  },
  historiquePlaceholder: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem'
  },
  cardContent: {
    flex: 1
  },
  cardRate: {
    fontSize: '0.9rem',
    opacity: 0.9
  }
};

// Ajouter les animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleSheet);

export default TauxManagement;