// frontend/src/pages/Parametres/TauxChange.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiActivity, 
  FiClock, FiGlobe, FiDollarSign, FiBarChart2, FiZap, FiShield, FiServer, FiInfo
} from 'react-icons/fi';
import api from '../../services/api';

const TauxChange = () => {
  const navigate = useNavigate();
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [variations, setVariations] = useState({});
  const [apiStatus, setApiStatus] = useState('checking');
  const [providers, setProviders] = useState([]);

  // Informations des devises
  const currencyInfo = {
    USD: { name: 'Dollar US', flag: '🇺🇸', symbol: '$' },
    EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
    GBP: { name: 'Livre Sterling', flag: '🇬🇧', symbol: '£' },
    CHF: { name: 'Franc Suisse', flag: '🇨🇭', symbol: 'Fr' },
    CAD: { name: 'Dollar Canadien', flag: '🇨🇦', symbol: 'C$' },
    JPY: { name: 'Yen Japonais', flag: '🇯🇵', symbol: '¥' },
    CNY: { name: 'Yuan Chinois', flag: '🇨🇳', symbol: '¥' },
    AUD: { name: 'Dollar Australien', flag: '🇦🇺', symbol: 'A$' },
    NZD: { name: 'Dollar Néo-Zélandais', flag: '🇳🇿', symbol: 'NZ$' },
    SEK: { name: 'Couronne Suédoise', flag: '🇸🇪', symbol: 'kr' },
    NOK: { name: 'Couronne Norvégienne', flag: '🇳🇴', symbol: 'kr' },
    DKK: { name: 'Couronne Danoise', flag: '🇩🇰', symbol: 'kr' },
    PLN: { name: 'Zloty Polonais', flag: '🇵🇱', symbol: 'zł' },
    CZK: { name: 'Couronne Tchèque', flag: '🇨🇿', symbol: 'Kč' },
    HUF: { name: 'Forint Hongrois', flag: '🇭🇺', symbol: 'Ft' },
    TRY: { name: 'Lire Turque', flag: '🇹🇷', symbol: '₺' },
    ZAR: { name: 'Rand Sud-Africain', flag: '🇿🇦', symbol: 'R' },
    INR: { name: 'Roupie Indienne', flag: '🇮🇳', symbol: '₹' },
    BRL: { name: 'Real Brésilien', flag: '🇧🇷', symbol: 'R$' },
    MXN: { name: 'Peso Mexicain', flag: '🇲🇽', symbol: '$' },
    SGD: { name: 'Dollar de Singapour', flag: '🇸🇬', symbol: 'S$' },
    HKD: { name: 'Dollar de Hong Kong', flag: '🇭🇰', symbol: 'HK$' },
    IDR: { name: 'Roupie Indonésienne', flag: '🇮🇩', symbol: 'Rp' },
    THB: { name: 'Baht Thaïlandais', flag: '🇹🇭', symbol: '฿' },
    PHP: { name: 'Peso Philippin', flag: '🇵🇭', symbol: '₱' },
    KRW: { name: 'Won Sud-Coréen', flag: '🇰🇷', symbol: '₩' },
    CDF: { name: 'Franc Congolais', flag: '🇨🇩', symbol: 'FC' }
  };

  const animationStyles = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .fade-slide-up { animation: fadeSlideUp 0.4s ease-out; }
    .countdown-text { font-family: 'Courier New', monospace; font-weight: bold; }
  `;

  const fetchRatesViaBackend = async () => {
    try {
      const response = await api.get('/devises/taux-reels');
      if (response.data && response.data.success) {
        setApiStatus('online');
        if (response.data.data && response.data.data.rates) {
          return response.data.data.rates;
        }
        if (response.data.rates) {
          return response.data.rates;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur backend ExchangeRate:', error);
      return null;
    }
  };

  const fetchDevisesFromDB = async () => {
    try {
      const response = await api.get('/devises/affichage');
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération devises DB:', error);
      return null;
    }
  };

  const getLocalFallbackRates = () => {
    return {
      USD: 2850,
      EUR: 2850 * 0.8521,
      GBP: 2850 * 0.7359,
      CNY: 2850 * 6.8356,
      CHF: 2850 * 0.7808,
      CAD: 2850 * 1.3580,
      JPY: 2850 * 156.78,
      CDF: 1
    };
  };

  const chargerDevises = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const oldTaux = devises.reduce((acc, d) => {
        acc[d.code] = d.taux_change_actuel;
        return acc;
      }, {});
      
      let tauxData = null;
      
      const apiRates = await fetchRatesViaBackend();
      
      if (apiRates && Object.keys(apiRates).length > 0) {
        tauxData = apiRates;
        setApiStatus('online');
        console.log('✅ Taux chargés depuis ExchangeRate API');
      } else {
        tauxData = getLocalFallbackRates();
        setApiStatus('fallback');
        console.log('⚠️ Fallback: utilisation des données locales');
      }
      
      const devisesList = Object.entries(tauxData)
        .filter(([code]) => currencyInfo[code])
        .map(([code, taux]) => ({
          code,
          nom: currencyInfo[code].name,
          symbole: currencyInfo[code].symbol,
          taux_change_actuel: typeof taux === 'number' ? taux : parseFloat(taux),
          date_mise_a_jour: new Date().toISOString()
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
      
      const newVariations = {};
      devisesList.forEach(devise => {
        const oldValue = oldTaux[devise.code];
        if (oldValue && devise.taux_change_actuel) {
          let variation = ((devise.taux_change_actuel - oldValue) / oldValue) * 100;
          variation = Math.min(Math.max(variation, -100), 100);
          newVariations[devise.code] = parseFloat(variation.toFixed(2));
        } else {
          newVariations[devise.code] = 0;
        }
      });
      
      setVariations(newVariations);
      setDevises(devisesList);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('❌ Erreur chargerDevises:', error);
      setError('Erreur lors du chargement des devises');
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  }, [devises]);

  const fetchProviders = async () => {
    try {
      const response = await api.get('/devises/providers');
      if (response.data && response.data.success) {
        setProviders(response.data.data);
      } else {
        setProviders([{ name: 'ExchangeRate-API', key: 'exchangerate-api' }]);
      }
    } catch (error) {
      console.error('❌ Erreur récupération providers:', error);
      setProviders([{ name: 'ExchangeRate-API', key: 'exchangerate-api' }]);
    }
  };

  useEffect(() => {
    chargerDevises();
    fetchProviders();
  }, []);

  useEffect(() => {
    let interval, countdownInterval;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        chargerDevises();
        setCountdown(60);
      }, 60000);
      
      countdownInterval = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 60);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [autoRefresh, chargerDevises]);

  const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getVariationColor = (variation) => {
    if (variation > 0) return '#10b981';
    if (variation < 0) return '#ef4444';
    return '#6b7280';
  };

  const getVariationIcon = (variation) => {
    if (variation > 0) return <FiTrendingUp size={14} />;
    if (variation < 0) return <FiTrendingDown size={14} />;
    return <FiActivity size={14} />;
  };

  const getApiStatusLabel = () => {
    switch(apiStatus) {
      case 'online': return 'ExchangeRate API (taux réels)';
      case 'direct': return 'ExchangeRate API (direct)';
      case 'fallback': return 'Données locales';
      default: return 'Source inconnue';
    }
  };

  const getApiStatusColor = () => {
    switch(apiStatus) {
      case 'online': return '#10b981';
      case 'direct': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'fallback': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const handleRefresh = () => {
    chargerDevises();
    setCountdown(60);
  };

  if (loading && devises.length === 0) {
    return (
      <>
        <style>{animationStyles}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement des taux de change...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => navigate('/parametres')} style={styles.backButton}>
              <FiArrowLeft size={16} /> Retour
            </button>
            <div style={styles.headerInfo}>
              <div style={styles.iconWrapper}>
                <FiGlobe size={28} />
              </div>
              <div>
                <h1 style={styles.title}>Taux de change en temps réel</h1>
                <p style={styles.subtitle}>Données fournies par ExchangeRate-API - Taux officiels du marché</p>
              </div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.apiStatus}>
              <FiServer size={12} />
              <span style={{ color: getApiStatusColor() }}>●</span>
              <span style={{ fontSize: '0.7rem' }}>{getApiStatusLabel()}</span>
            </div>
            <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ ...styles.autoRefreshBtn, backgroundColor: autoRefresh ? '#10b981' : '#6b7280' }}>
              <FiZap size={14} /> Auto {autoRefresh ? `(${countdown}s)` : 'OFF'}
            </button>
            <button onClick={handleRefresh} style={styles.refreshButton}>
              <FiRefreshCw size={16} /> Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            <span>{error}</span>
            <button onClick={chargerDevises} style={styles.retryBtn}>Réessayer</button>
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiBarChart2 size={20} /></div>
            <div><div style={styles.statValue}>{devises.length}</div><div style={styles.statLabel}>Devises suivies</div></div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiTrendingUp size={20} /></div>
            <div><div style={styles.statValue}>{devises.filter(d => variations[d.code] > 0).length}</div><div style={styles.statLabel}>En hausse</div></div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiTrendingDown size={20} /></div>
            <div><div style={styles.statValue}>{devises.filter(d => variations[d.code] < 0).length}</div><div style={styles.statLabel}>En baisse</div></div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiClock size={20} /></div>
            <div><div style={styles.statValue} className="countdown-text">{lastUpdate ? formatDate(lastUpdate) : '--:--:--'}</div><div style={styles.statLabel}>Dernière MAJ</div></div>
          </div>
        </div>

        {/* Tableau des devises */}
        <div style={styles.tableWrapper}>
          <div style={styles.tableHeaderBar}>
            <h3 style={styles.tableTitle}>📊 Cours des devises</h3>
            <div style={styles.liveBadge}><span style={styles.liveDot}></span>LIVE</div>
          </div>
          
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Devise</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Taux (1 X → CDF)</th>
                  <th style={styles.th}>Variation</th>
                  <th style={styles.th}>Dernière MAJ</th>
                </tr>
              </thead>
              <tbody>
                {devises.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyState}>
                      <FiGlobe size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                      <p>Aucune devise trouvée</p>
                    </td>
                  </tr>
                ) : (
                  devises.map((devise) => {
                    const variation = variations[devise.code] || 0;
                    return (
                      <tr key={devise.code} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div style={styles.currencyCell}>
                            <span style={styles.flagEmoji}>{currencyInfo[devise.code]?.flag || '🌍'}</span>
                            <span style={styles.currencyName}>{devise.nom}</span>
                          </div>
                        </td>
                        <td style={styles.td}><span style={styles.currencyCode}>{devise.code}</span></td>
                        <td style={styles.td}>
                          <div style={styles.tauxContainer}>
                            <FiDollarSign size={14} style={{ color: '#f59e0b' }} />
                            <span style={styles.tauxValue}>{formatNumber(devise.taux_change_actuel)}</span>
                            <span style={styles.tauxUnit}>CDF</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ ...styles.variationBadge, backgroundColor: variation > 0 ? '#10b98120' : variation < 0 ? '#ef444420' : '#6b728020' }}>
                            <span style={{ color: getVariationColor(variation) }}>{getVariationIcon(variation)}</span>
                            <span style={{ color: getVariationColor(variation), fontWeight: 500 }}>{variation > 0 ? '+' : ''}{variation.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.updateTime}>
                            <FiClock size={12} style={{ opacity: 0.6 }} />
                            <span style={styles.updateText}>{formatDate(devise.date_mise_a_jour)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Providers */}
        {providers.length > 0 && (
          <div style={styles.providersBox}>
            <div style={styles.providersHeader}>
              <FiInfo size={14} />
              <span>Source des données</span>
            </div>
            <div style={styles.providersList}>
              {providers.slice(0, 5).map(provider => (
                <span key={provider.key} style={styles.providerTag}>
                  {provider.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div style={styles.infoBox}>
          <div style={styles.infoContent}>
            <FiActivity size={20} style={{ color: '#3b82f6' }} />
            <div>
              <p style={styles.infoTitle}>Mise à jour en temps réel avec ExchangeRate-API</p>
              <p style={styles.infoText}>
                Les taux sont actualisés automatiquement toutes les 60 secondes.
                {autoRefresh && ` Prochaine mise à jour dans ${countdown} secondes.`}
                <br />
                <strong>📊 Source:</strong> ExchangeRate-API (taux réels du marché) | 
                <strong>🔄 Cache:</strong> 5 minutes | 
                <strong>💡 Taux USD/CDF:</strong> mis à jour quotidiennement
              </p>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <small style={styles.footerText}>
            <FiShield size={12} /> Taux de change officiels - Données fournies par ExchangeRate-API
          </small>
        </div>
      </div>
    </>
  );
};

const styles = {
  container: { 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh'
  },
  loadingContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '100vh', 
    padding: '2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },
  spinner: { 
    width: '50px', 
    height: '50px', 
    border: '3px solid rgba(255,255,255,0.3)', 
    borderTopColor: 'white', 
    borderRadius: '50%', 
    animation: 'spin 1s linear infinite', 
    marginBottom: '1rem' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    flexWrap: 'wrap', 
    gap: '1rem', 
    marginBottom: '2rem' 
  },
  headerLeft: { flex: 1 },
  backButton: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    padding: '0.5rem 1rem', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    border: '1px solid rgba(255,255,255,0.3)', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontSize: '0.875rem', 
    color: 'white', 
    marginBottom: '1rem' 
  },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { 
    width: '56px', 
    height: '56px', 
    borderRadius: '14px', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: '1.5rem', 
    fontWeight: '600', 
    color: 'white', 
    margin: '0 0 0.25rem 0' 
  },
  subtitle: { 
    fontSize: '0.875rem', 
    color: 'rgba(255,255,255,0.8)', 
    margin: 0 
  },
  headerActions: { 
    display: 'flex', 
    gap: '0.75rem', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  apiStatus: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    padding: '0.5rem 0.75rem', 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: '8px', 
    fontSize: '0.7rem', 
    color: 'white' 
  },
  autoRefreshBtn: { 
    padding: '0.5rem 1rem', 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontSize: '0.75rem', 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    fontWeight: '500' 
  },
  refreshButton: { 
    padding: '0.5rem 1rem', 
    backgroundColor: '#3b82f6', 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontSize: '0.875rem', 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  errorMessage: { 
    backgroundColor: '#fee2e2', 
    border: '1px solid #ef4444', 
    borderRadius: '10px', 
    padding: '1rem', 
    marginBottom: '1.5rem', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    color: '#991b1b' 
  },
  retryBtn: { 
    backgroundColor: '#ef4444', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    padding: '0.25rem 0.75rem', 
    cursor: 'pointer' 
  },
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4, 1fr)', 
    gap: '1rem', 
    marginBottom: '2rem' 
  },
  statCard: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    backdropFilter: 'blur(10px)', 
    borderRadius: '16px', 
    padding: '1rem', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1rem' 
  },
  statIcon: { 
    width: '44px', 
    height: '44px', 
    borderRadius: '12px', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: 'white'
  },
  statValue: { 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    color: 'white' 
  },
  statLabel: { 
    fontSize: '0.7rem', 
    color: 'rgba(255,255,255,0.7)' 
  },
  tableWrapper: { 
    backgroundColor: '#ffffff', 
    borderRadius: '16px', 
    overflow: 'hidden', 
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
  },
  tableHeaderBar: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '1rem 1.5rem', 
    borderBottom: '1px solid #e2e8f0' 
  },
  tableTitle: { 
    fontSize: '0.875rem', 
    fontWeight: '600', 
    color: '#1e293b', 
    margin: 0 
  },
  liveBadge: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    backgroundColor: '#fee2e2', 
    padding: '0.25rem 0.75rem', 
    borderRadius: '20px', 
    fontSize: '0.7rem', 
    fontWeight: 'bold', 
    color: '#dc2626' 
  },
  liveDot: { 
    width: '8px', 
    height: '8px', 
    backgroundColor: '#dc2626', 
    borderRadius: '50%', 
    animation: 'pulse 2s ease-in-out infinite' 
  },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { 
    backgroundColor: '#f8fafc', 
    borderBottom: '2px solid #e2e8f0' 
  },
  th: { 
    padding: '0.75rem 1rem', 
    textAlign: 'left', 
    fontSize: '0.75rem', 
    fontWeight: '600', 
    color: '#475569', 
    textTransform: 'uppercase' 
  },
  td: { 
    padding: '1rem', 
    borderBottom: '1px solid #e2e8f0', 
    fontSize: '0.875rem', 
    color: '#334155' 
  },
  tableRow: { 
    transition: 'background-color 0.2s', 
    cursor: 'pointer' 
  },
  emptyState: { 
    textAlign: 'center', 
    padding: '3rem', 
    color: '#64748b' 
  },
  currencyCell: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  flagEmoji: { fontSize: '1.25rem' },
  currencyName: { 
    fontWeight: '500', 
    color: '#1e293b' 
  },
  currencyCode: { 
    fontFamily: 'monospace', 
    fontWeight: 'bold', 
    backgroundColor: '#f1f5f9', 
    padding: '0.25rem 0.5rem', 
    borderRadius: '6px', 
    fontSize: '0.75rem', 
    color: '#334155' 
  },
  tauxContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  },
  tauxValue: { 
    fontWeight: 'bold', 
    fontSize: '1rem', 
    color: '#059669' 
  },
  tauxUnit: { 
    fontSize: '0.7rem', 
    color: '#6b7280' 
  },
  variationBadge: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.25rem', 
    padding: '0.25rem 0.75rem', 
    borderRadius: '20px', 
    fontSize: '0.75rem', 
    fontWeight: '500' 
  },
  updateTime: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    fontSize: '0.7rem', 
    color: '#6b7280' 
  },
  updateText: { fontSize: '0.7rem' },
  providersBox: { 
    marginTop: '1rem', 
    padding: '0.75rem 1rem', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: '8px' 
  },
  providersHeader: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    fontSize: '0.7rem', 
    color: 'rgba(255,255,255,0.7)', 
    marginBottom: '0.5rem' 
  },
  providersList: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '0.5rem' 
  },
  providerTag: { 
    fontSize: '0.65rem', 
    padding: '0.2rem 0.5rem', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: '4px', 
    color: 'white' 
  },
  infoBox: { 
    marginTop: '1rem', 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    backdropFilter: 'blur(10px)', 
    borderRadius: '12px', 
    padding: '1rem' 
  },
  infoContent: { 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: '1rem' 
  },
  infoTitle: { 
    fontSize: '0.875rem', 
    fontWeight: '600', 
    color: 'white', 
    margin: '0 0 0.25rem 0' 
  },
  infoText: { 
    fontSize: '0.75rem', 
    color: 'rgba(255,255,255,0.8)', 
    margin: 0, 
    lineHeight: 1.5 
  },
  footer: { 
    textAlign: 'center', 
    marginTop: '2rem', 
    paddingTop: '1rem' 
  },
  footerText: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: '0.75rem', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '0.5rem' 
  }
};

// Ajout des animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  tr:hover { background-color: #f8fafc; }
`;
document.head.appendChild(styleSheet);

export default TauxChange;