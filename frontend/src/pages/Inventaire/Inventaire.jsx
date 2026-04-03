import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import api from '../../services/api';
import localforage from 'localforage';
import Webcam from 'react-webcam';
import {
  FiCamera, FiMapPin, FiAlertCircle, FiCheck, FiX,
  FiSave, FiRefreshCw, FiWifi, FiWifiOff
} from 'react-icons/fi';

// Configuration localforage pour le stockage hors ligne
localforage.config({
  name: 'bcc-inventaire',
  storeName: 'pending_actions'
});

const Inventaire = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scannedActif, setScannedActif] = useState(null);
  const [modeHorsLigne, setModeHorsLigne] = useState(!navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [localisation, setLocalisation] = useState('');
  const [anomalie, setAnomalie] = useState({ type: '', description: '' });
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    // Vérifier la connexion
    const handleOnline = () => setModeHorsLigne(false);
    const handleOffline = () => setModeHorsLigne(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Charger les actions en attente
    chargerActionsEnAttente();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Nettoyer le scanner si actif
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const chargerActionsEnAttente = async () => {
    const actions = await localforage.getItem('pendingActions') || [];
    setPendingActions(actions);
  };

  const ajouterActionEnAttente = async (action) => {
    const actions = [...pendingActions, action];
    await localforage.setItem('pendingActions', actions);
    setPendingActions(actions);
  };

  const supprimerActionEnAttente = async (index) => {
    const actions = pendingActions.filter((_, i) => i !== index);
    await localforage.setItem('pendingActions', actions);
    setPendingActions(actions);
  };

  const synchroniser = async () => {
    setLoading(true);
    for (let i = 0; i < pendingActions.length; i++) {
      const action = pendingActions[i];
      try {
        if (action.type === 'mise_a_jour') {
          await api.put(`/actifs/${action.actifId}`, action.data);
        } else if (action.type === 'anomalie') {
          await api.post('/anomalies', action.data);
        } else if (action.type === 'photo') {
          const formData = new FormData();
          formData.append('photo', action.photoBlob);
          await api.post(`/actifs/${action.actifId}/photo`, formData);
        }
        await supprimerActionEnAttente(i);
        i--; // car l'index change après suppression
      } catch (error) {
        console.error('Erreur synchronisation', error);
      }
    }
    setLoading(false);
  };

  const demarrerScan = () => {
    setScanning(true);
    
    const qrScanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
      rememberLastUsedCamera: true
    }, false);
    
    setScanner(qrScanner);
    
    qrScanner.render(onScanSuccess, onScanError);
  };

  const onScanSuccess = async (decodedText) => {
    try {
      // Arrêter le scanner
      if (scanner) {
        await scanner.clear();
        setScanner(null);
        setScanning(false);
      }
      
      // Récupérer l'actif par son code
      const response = await api.get(`/actifs/code/${decodedText}`);
      setScannedActif(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'actif:', error);
      alert('Actif non trouvé ou erreur de connexion');
      setScanning(false);
    }
  };

  const onScanError = (error) => {
    // Ignorer les erreurs de scan mineures
    if (error?.includes('NotFound')) {
      console.log('Scanner prêt');
    }
  };

  const arreterScan = () => {
    if (scanner) {
      scanner.clear().then(() => {
        setScanner(null);
        setScanning(false);
      });
    } else {
      setScanning(false);
    }
  };

  const prendrePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPhoto(imageSrc);
    setShowCamera(false);
  };

  const enregistrerMiseAJour = async () => {
    const data = { localisation };
    if (modeHorsLigne) {
      await ajouterActionEnAttente({
        type: 'mise_a_jour',
        actifId: scannedActif.id,
        data,
        date: new Date()
      });
      alert('Mise à jour enregistrée hors ligne. Elle sera synchronisée plus tard.');
    } else {
      await api.put(`/actifs/${scannedActif.id}`, data);
      alert('Mise à jour effectuée');
    }
    setScannedActif(null);
    setLocalisation('');
  };

  const signalerAnomalie = async () => {
    const data = {
      actif_id: scannedActif.id,
      type_anomalie: anomalie.type,
      description: anomalie.description,
      localisation_constatee: localisation || scannedActif.localisation,
      photo: photo ? photo.split(',')[1] : null // en base64
    };
    if (modeHorsLigne) {
      await ajouterActionEnAttente({
        type: 'anomalie',
        data,
        date: new Date()
      });
      alert('Anomalie enregistrée hors ligne');
    } else {
      await api.post('/anomalies', data);
      alert('Anomalie signalée');
    }
    setAnomalie({ type: '', description: '' });
    setPhoto(null);
  };

  if (!can(['admin', 'inventoriste'])) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Inventaire physique</h1>
      
      {/* Bannière hors ligne */}
      {modeHorsLigne && (
        <div style={styles.offlineBanner}>
          <FiWifiOff /> Mode hors ligne - Les actions seront synchronisées plus tard.
          {pendingActions.length > 0 && (
            <button onClick={synchroniser} style={styles.syncButton} disabled={loading}>
              <FiRefreshCw /> {loading ? 'Synchronisation...' : `Synchroniser (${pendingActions.length})`}
            </button>
          )}
        </div>
      )}

      {!scanning && !scannedActif && (
        <button onClick={demarrerScan} style={styles.scanButton}>
          Scanner un QR code
        </button>
      )}

      {scanning && (
        <div style={styles.scanContainer}>
          <div id="reader" style={styles.reader}></div>
          <button onClick={arreterScan} style={styles.cancelScanButton}>
            <FiX /> Annuler le scan
          </button>
        </div>
      )}

      {scannedActif && (
        <div style={styles.actifCard}>
          <h2>{scannedActif.code} - {scannedActif.nom}</h2>
          <p><strong>Localisation actuelle:</strong> {scannedActif.localisation || 'Non définie'}</p>
          
          <div style={styles.formGroup}>
            <label>Nouvelle localisation</label>
            <input
              type="text"
              value={localisation}
              onChange={(e) => setLocalisation(e.target.value)}
              placeholder="Entrez la localisation constatée"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Prendre une photo</label>
            <button onClick={() => setShowCamera(!showCamera)} style={styles.cameraButton}>
              <FiCamera /> {showCamera ? 'Fermer' : 'Ouvrir la caméra'}
            </button>
            {showCamera && (
              <div style={styles.cameraContainer}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                />
                <button onClick={prendrePhoto} style={styles.captureButton}>Prendre photo</button>
              </div>
            )}
            {photo && <img src={photo} alt="Photo" style={styles.photoPreview} />}
          </div>

          <div style={styles.formGroup}>
            <label>Signaler une anomalie</label>
            <select
              value={anomalie.type}
              onChange={(e) => setAnomalie({ ...anomalie, type: e.target.value })}
              style={styles.select}
            >
              <option value="">Sélectionner</option>
              <option value="manquant">Bien manquant</option>
              <option value="non_etiquete">Non étiqueté</option>
              <option value="mauvais_etat">Mauvais état</option>
              <option value="autre">Autre</option>
            </select>
            {anomalie.type && (
              <textarea
                placeholder="Description de l'anomalie"
                value={anomalie.description}
                onChange={(e) => setAnomalie({ ...anomalie, description: e.target.value })}
                style={styles.textarea}
              />
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={enregistrerMiseAJour} style={styles.saveButton}>
              <FiSave /> Enregistrer la localisation
            </button>
            {anomalie.type && (
              <button onClick={signalerAnomalie} style={styles.anomalieButton}>
                <FiAlertCircle /> Signaler l'anomalie
              </button>
            )}
            <button onClick={() => setScannedActif(null)} style={styles.cancelButton}>
              <FiX /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    marginBottom: '2rem'
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  syncButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#92400e',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  scanButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  scanContainer: {
    textAlign: 'center'
  },
  reader: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto'
  },
  cancelScanButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  actifCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginTop: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    marginTop: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'var(--bg-card)',
    marginTop: '0.5rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    marginTop: '0.5rem',
    minHeight: '80px',
    resize: 'vertical'
  },
  cameraButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--text-secondary)',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem'
  },
  cameraContainer: {
    marginTop: '1rem',
    textAlign: 'center'
  },
  captureButton: {
    marginTop: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  photoPreview: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'cover',
    marginTop: '1rem',
    borderRadius: '4px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
    flexWrap: 'wrap'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  anomalieButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f59e0b',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

export default Inventaire;