// frontend/src/components/Common/NetworkStatus.jsx (version améliorée avec Bootstrap 5)
import React, { useState, useEffect } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { WifiOff, Wifi, CheckCircle, AlertTriangle } from 'lucide-react'; // Ou utilisez vos propres icônes
import 'bootstrap/dist/css/bootstrap.min.css';

export const NetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let retryInterval;

    const handleOnline = () => {
      setIsOffline(false);
      setIsReconnecting(false);
      setRetryCount(0);
      setVisible(true);
      
      // Masquer automatiquement après 3 secondes
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
      setIsReconnecting(true);
      
      // Tentative de reconnexion automatique toutes les 5 secondes
      retryInterval = setInterval(() => {
        if (navigator.onLine) {
          clearInterval(retryInterval);
          handleOnline();
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Afficher immédiatement si hors ligne
    if (!navigator.onLine) {
      setVisible(true);
      setIsReconnecting(true);
      
      retryInterval = setInterval(() => {
        if (navigator.onLine) {
          clearInterval(retryInterval);
          handleOnline();
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryInterval) clearInterval(retryInterval);
    };
  }, []);

  // Ne pas afficher si pas visible
  if (!visible) return null;

  // Styles d'animation
  const animationStyles = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .network-status-animate-in {
      animation: slideDown 0.3s ease-out;
    }
    
    .network-status-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .network-status-spin {
      animation: spin 1s linear infinite;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div 
        className="position-fixed top-0 start-0 end-0 d-flex justify-content-center z-index-1050 p-2"
        style={{ zIndex: 9999 }}
      >
        <div className="network-status-animate-in" style={{ minWidth: '280px', maxWidth: '90%' }}>
          {isOffline ? (
            // Mode hors ligne
            <Alert 
              variant="danger" 
              className="shadow-lg mb-0 border-0 rounded-3"
              style={{ 
                backgroundColor: '#fef2f2',
                borderLeft: '4px solid #dc2626'
              }}
            >
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                    <WifiOff size={20} className="text-danger" />
                  </div>
                  <div>
                    <h6 className="mb-0 fw-semibold text-danger">Connexion perdue</h6>
                    <small className="text-muted">
                      {isReconnecting && (
                        <span className="d-flex align-items-center gap-1">
                          <span className="network-status-spin d-inline-block">
                            <Spinner as="span" size="sm" animation="border" variant="danger" />
                          </span>
                          <span>Tentative de reconnexion...</span>
                          {retryCount > 0 && ` (${retryCount})`}
                        </span>
                      )}
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1">
                    Hors ligne
                  </span>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="btn btn-sm btn-outline-danger"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </Alert>
          ) : (
            // Mode en ligne (connexion rétablie)
            <Alert 
              variant="success" 
              className="shadow-lg mb-0 border-0 rounded-3"
              style={{ 
                backgroundColor: '#f0fdf4',
                borderLeft: '4px solid #22c55e'
              }}
              dismissible
              onClose={() => setVisible(false)}
              closeLabel="Fermer"
            >
              <div className="d-flex align-items-center gap-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-2">
                  <CheckCircle size={20} className="text-success" />
                </div>
                <div>
                  <h6 className="mb-0 fw-semibold text-success">Connexion rétablie</h6>
                  <small className="text-muted">Vous êtes de nouveau connecté</small>
                </div>
                <div className="ms-auto">
                  <div className="network-status-pulse">
                    <Wifi size={18} className="text-success" />
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </div>
    </>
  );
};

// Version alternative avec plus de fonctionnalités
export const NetworkStatusEnhanced = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, poor, unknown

  useEffect(() => {
    let retryInterval;
    let connectionMonitor;

    const checkConnectionQuality = async () => {
      if ('connection' in navigator && navigator.connection) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g') setConnectionQuality('good');
        else if (effectiveType === '3g') setConnectionQuality('poor');
        else if (effectiveType === '2g') setConnectionQuality('poor');
        else setConnectionQuality('unknown');
        
        // Écouter les changements de qualité
        connection.onchange = () => {
          const newType = connection.effectiveType;
          if (newType === '4g') setConnectionQuality('good');
          else if (newType === '3g' || newType === '2g') setConnectionQuality('poor');
          else setConnectionQuality('unknown');
        };
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsReconnecting(false);
      setRetryCount(0);
      setVisible(true);
      checkConnectionQuality();
      
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
      setIsReconnecting(true);
      setConnectionQuality('unknown');
      
      retryInterval = setInterval(() => {
        if (navigator.onLine) {
          clearInterval(retryInterval);
          handleOnline();
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkConnectionQuality();

    if (!navigator.onLine) {
      setVisible(true);
      setIsReconnecting(true);
      
      retryInterval = setInterval(() => {
        if (navigator.onLine) {
          clearInterval(retryInterval);
          handleOnline();
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryInterval) clearInterval(retryInterval);
      if (connectionMonitor) clearInterval(connectionMonitor);
    };
  }, []);

  if (!visible) return null;

  const animationStyles = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.8;
      }
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .network-status-slide-down {
      animation: slideDown 0.3s ease-out;
    }
    
    .network-status-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .network-status-spin {
      animation: spin 1s linear infinite;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="position-fixed top-0 start-0 end-0 d-flex justify-content-center p-3" style={{ zIndex: 9999 }}>
        <div className="network-status-slide-down" style={{ minWidth: '320px', maxWidth: '90%' }}>
          {isOffline ? (
            <div className="card shadow-lg border-0 rounded-3 overflow-hidden">
              <div className="card-body p-3" style={{ backgroundColor: '#fef2f2' }}>
                <div className="d-flex align-items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                      <AlertTriangle size={20} className="text-danger" />
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold text-danger">Connexion perdue</h6>
                      <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1">
                        Hors ligne
                      </span>
                    </div>
                    <p className="small text-muted mb-2">
                      Vérifiez votre connexion internet
                    </p>
                    {isReconnecting && (
                      <div className="d-flex align-items-center gap-2">
                        <div className="network-status-spin">
                          <Spinner as="span" size="sm" animation="border" variant="danger" />
                        </div>
                        <small className="text-danger">
                          Tentative de reconnexion... {retryCount > 0 && `(${retryCount})`}
                        </small>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="btn btn-sm btn-danger"
                    style={{ padding: '0.25rem 0.75rem' }}
                  >
                    Réessayer
                  </button>
                </div>
              </div>
              {retryCount > 3 && (
                <div className="card-footer bg-transparent p-2 text-center border-top-0">
                  <small className="text-muted">
                    <span className="me-1">💡</span>
                    Conseil: Vérifiez votre pare-feu ou votre connexion VPN
                  </small>
                </div>
              )}
            </div>
          ) : (
            <div className="card shadow-lg border-0 rounded-3 overflow-hidden">
              <div className="card-body p-3" style={{ backgroundColor: '#f0fdf4' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded-circle p-2">
                      <CheckCircle size={20} className="text-success" />
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-0 fw-semibold text-success">Connexion rétablie</h6>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <small className="text-muted">Vous êtes de nouveau connecté</small>
                      {connectionQuality === 'poor' && (
                        <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1">
                          Connexion lente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="network-status-pulse">
                    <Wifi size={18} className="text-success" />
                  </div>
                  <button 
                    onClick={() => setVisible(false)} 
                    className="btn-close"
                    aria-label="Fermer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Export par défaut de la version standard
export default NetworkStatus;