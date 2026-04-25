// frontend/src/pages/Inventaire/Inventaire.jsx
// Version avec DEUX méthodes : Scan + Formulaire manuel

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import api from '../../services/api';
import localforage from 'localforage';
import {
  FiCamera,
  FiMapPin,
  FiAlertCircle,
  FiX,
  FiSave,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiImage,
  FiInfo,
  FiSmartphone,
  FiSearch,
  FiUser,
  FiFileText,
  FiCheckCircle
} from 'react-icons/fi';
import { AiOutlineQrcode } from 'react-icons/ai';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';

// Configuration IndexedDB
localforage.config({
  name: 'bcc-inventaire',
  storeName: 'pending_actions'
});

const Inventaire = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  // États principaux
  const [mode, setMode] = useState('scan'); // 'scan' ou 'manuel'
  const [step, setStep] = useState(1); // 1: choix actif, 2: formulaire anomalie
  const [selectedActif, setSelectedActif] = useState(null);
  
  // États pour le scan
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanningImage, setScanningImage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // États pour la recherche manuelle
  const [searchTerm, setSearchTerm] = useState('');
  const [actifs, setActifs] = useState([]);
  const [filteredActifs, setFilteredActifs] = useState([]);
  const [loadingActifs, setLoadingActifs] = useState(false);
  
  // États généraux
  const [modeHorsLigne, setModeHorsLigne] = useState(!navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Formulaire anomalie
  const [formData, setFormData] = useState({
    localisation: '',
    type_anomalie: '',
    description: '',
    priorite: 'moyenne'
  });
  const [showAnomalieForm, setShowAnomalieForm] = useState(false);
  
  // Refs
  const scannerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const scanSuccessRef = useRef(false);

  // Types d'anomalies
  const typesAnomalie = [
    { value: 'manquant', label: 'Bien manquant', icon: '❌', color: '#ef4444', bgClass: 'danger' },
    { value: 'endommage', label: 'Bien endommagé', icon: '💔', color: '#f59e0b', bgClass: 'warning' },
    { value: 'non_conforme', label: 'Non conforme', icon: '⚠️', color: '#8b5cf6', bgClass: 'purple' },
    { value: 'autre', label: 'Autre', icon: '📝', color: '#64748b', bgClass: 'secondary' }
  ];

  // Priorités
  const priorites = [
    { value: 'critique', label: 'Critique', icon: '🔴', color: '#dc2626', bgClass: 'danger' },
    { value: 'haute', label: 'Haute', icon: '🟠', color: '#f97316', bgClass: 'orange' },
    { value: 'moyenne', label: 'Moyenne', icon: '🟡', color: '#eab308', bgClass: 'warning' },
    { value: 'basse', label: 'Basse', icon: '🟢', color: '#10b981', bgClass: 'success' }
  ];

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|windows phone/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    checkMobile();
    
    chargerActionsEnAttente();
    
    const handleOnline = () => setModeHorsLigne(false);
    const handleOffline = () => setModeHorsLigne(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Charger les actifs pour la recherche manuelle
  const chargerActifs = async () => {
    try {
      setLoadingActifs(true);
      const response = await api.get('/actifs', { params: { limit: 100 } });
      setActifs(response.data.actifs || []);
      setFilteredActifs(response.data.actifs || []);
    } catch (err) {
      console.error('Erreur chargement actifs:', err);
      setError('Impossible de charger la liste des actifs');
    } finally {
      setLoadingActifs(false);
    }
  };

  // Filtrer les actifs
  useEffect(() => {
    if (searchTerm) {
      const filtered = actifs.filter(a => 
        a.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.numero_inventaire?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredActifs(filtered);
    } else {
      setFilteredActifs(actifs);
    }
  }, [searchTerm, actifs]);

  // Actions hors ligne
  const chargerActionsEnAttente = useCallback(async () => {
    const actions = await localforage.getItem('pendingActions') || [];
    setPendingActions(actions);
  }, []);

  const ajouterActionEnAttente = useCallback(async (action) => {
    setPendingActions(prev => {
      const newActions = [...prev, action];
      localforage.setItem('pendingActions', newActions);
      return newActions;
    });
  }, []);

  const supprimerActionEnAttente = useCallback(async (index) => {
    setPendingActions(prev => {
      const newActions = prev.filter((_, i) => i !== index);
      localforage.setItem('pendingActions', newActions);
      return newActions;
    });
  }, []);

  const synchroniser = useCallback(async () => {
    setLoading(true);
    const actions = [...pendingActions];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        if (action.type === 'mise_a_jour') {
          await api.put(`/actifs/${action.actifId}`, action.data);
        } else if (action.type === 'anomalie') {
          await api.post('/anomalies', action.data);
        }
        await supprimerActionEnAttente(i);
      } catch (error) {
        console.error('Erreur synchronisation', error);
      }
    }
    setLoading(false);
    setSuccess('Synchronisation terminée');
    setTimeout(() => setSuccess(''), 3000);
  }, [pendingActions, supprimerActionEnAttente]);

  const showTemporaryError = useCallback((message) => {
    setScanError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setScanError(null);
    }, 4000);
  }, []);

  // ==================== MÉTHODE 1 : SCAN QR CODE ====================
  
  const onScanSuccess = useCallback(async (decodedText) => {
    if (scanSuccessRef.current) return;
    scanSuccessRef.current = true;
    
    try {
      if (scannerInstanceRef.current) {
        await scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
      setScanning(false);
      
      const response = await api.get(`/actifs/code/${encodeURIComponent(decodedText)}`);
      setSelectedActif(response.data);
      setStep(2);
      setShowAnomalieForm(true);
      setFormData(prev => ({
        ...prev,
        localisation: response.data.localisation || ''
      }));
      setScanError(null);
      
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 404) {
        showTemporaryError('Actif non trouvé. Vérifiez le code QR.');
      } else {
        showTemporaryError('Erreur de connexion au serveur');
      }
      setScanning(false);
    } finally {
      setTimeout(() => {
        scanSuccessRef.current = false;
      }, 1000);
    }
  }, [showTemporaryError]);

  const demarrerScan = useCallback(() => {
    setScanning(true);
    setSelectedActif(null);
    setScanError(null);
    scanSuccessRef.current = false;
    
    requestAnimationFrame(() => {
      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        showTemporaryError('Erreur: impossible de démarrer le scanner');
        setScanning(false);
        return;
      }
      
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
      
      const qrScanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            let minSize = Math.min(viewfinderWidth, viewfinderHeight);
            let size = Math.floor(minSize * 0.7);
            return { width: size, height: size };
          },
          fps: 8,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          aspectRatio: 1.0,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          videoConstraints: {
            facingMode: isMobile ? 'environment' : 'user'
          }
        },
        false
      );
      
      scannerInstanceRef.current = qrScanner;
      qrScanner.render(onScanSuccess, () => {});
    });
  }, [isMobile, onScanSuccess, showTemporaryError]);

  const scannerDepuisImage = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showTemporaryError('Veuillez sélectionner une image valide');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showTemporaryError('Image trop volumineuse (max 10MB)');
      return;
    }
    
    setScanningImage(true);
    setScanError(null);
    
    const tempElement = document.createElement('div');
    tempElement.id = 'temp-qr-scanner-dynamic';
    tempElement.style.display = 'none';
    document.body.appendChild(tempElement);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('temp-qr-scanner-dynamic');
        const decodedText = await html5QrCode.scanFile(file, true);
        await html5QrCode.clear();
        
        if (document.body.contains(tempElement)) {
          document.body.removeChild(tempElement);
        }
        
        if (decodedText && decodedText.trim()) {
          const response = await api.get(`/actifs/code/${encodeURIComponent(decodedText)}`);
          setSelectedActif(response.data);
          setStep(2);
          setShowAnomalieForm(true);
          setFormData(prev => ({
            ...prev,
            localisation: response.data.localisation || ''
          }));
          setScanning(false);
        } else {
          showTemporaryError('Aucun QR code détecté dans cette image');
        }
      } catch (error) {
        console.error('Erreur scan image:', error);
        showTemporaryError('QR code non détecté. Essayez avec la caméra.');
        if (document.body.contains(tempElement)) {
          document.body.removeChild(tempElement);
        }
      } finally {
        setScanningImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }, 50);
  }, [showTemporaryError]);

  const arreterScan = useCallback(() => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
      scannerInstanceRef.current = null;
    }
    setScanning(false);
    setScanError(null);
    scanSuccessRef.current = false;
  }, []);

  // ==================== MÉTHODE 2 : RECHERCHE MANUELLE ====================
  
  const handleModeManuel = () => {
    setMode('manuel');
    setStep(1);
    setSelectedActif(null);
    setShowAnomalieForm(false);
    setSearchTerm('');
    chargerActifs();
  };

  const handleModeScan = () => {
    setMode('scan');
    setStep(1);
    setSelectedActif(null);
    setShowAnomalieForm(false);
    setScanError(null);
  };

  const selectActifManuel = (actif) => {
    setSelectedActif(actif);
    setStep(2);
    setShowAnomalieForm(true);
    setFormData(prev => ({
      ...prev,
      localisation: actif.localisation || ''
    }));
  };

  // ==================== FORMULAIRE ANOMALIE ====================
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const enregistrerLocalisation = useCallback(async () => {
    if (!formData.localisation.trim()) {
      showTemporaryError('Veuillez saisir une localisation');
      return;
    }
    
    const data = { localisation: formData.localisation };
    
    if (modeHorsLigne) {
      await ajouterActionEnAttente({
        type: 'mise_a_jour',
        actifId: selectedActif.id,
        data,
        date: new Date()
      });
      setSuccess('Mise à jour enregistrée hors ligne');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      await api.put(`/actifs/${selectedActif.id}`, data);
      setSuccess('Localisation mise à jour');
      setTimeout(() => setSuccess(''), 3000);
    }
    
    const response = await api.get(`/actifs/${selectedActif.id}`);
    setSelectedActif(response.data);
  }, [formData.localisation, modeHorsLigne, selectedActif, ajouterActionEnAttente, showTemporaryError]);

  const signalerAnomalie = useCallback(async () => {
    if (!formData.type_anomalie) {
      showTemporaryError('Veuillez sélectionner un type d\'anomalie');
      return;
    }
    
    if (!formData.description.trim()) {
      showTemporaryError('Veuillez remplir la description');
      return;
    }
    
    const data = {
      actif_id: selectedActif.id,
      type_anomalie: formData.type_anomalie,
      description: formData.description,
      localisation: formData.localisation || selectedActif.localisation,
      date_constat: new Date().toISOString().split('T')[0],
      priorite: formData.priorite
    };
    
    if (modeHorsLigne) {
      await ajouterActionEnAttente({
        type: 'anomalie',
        data,
        date: new Date()
      });
      setSuccess('Anomalie enregistrée hors ligne');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      await api.post('/anomalies', data);
      setSuccess('Anomalie signalée avec succès');
      setTimeout(() => setSuccess(''), 3000);
    }
    
    setShowAnomalieForm(false);
    setStep(1);
    setSelectedActif(null);
    setFormData({
      localisation: '',
      type_anomalie: '',
      description: '',
      priorite: 'moyenne'
    });
  }, [formData, modeHorsLigne, selectedActif, ajouterActionEnAttente, showTemporaryError]);

  const nouveauScan = useCallback(() => {
    setSelectedActif(null);
    setStep(1);
    setShowAnomalieForm(false);
    setScanError(null);
    scanSuccessRef.current = false;
  }, []);

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .inventaire-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .inventaire-pulse {
      animation: pulse 0.5s ease-out;
    }
  `;

  if (!can(['admin', 'inventoriste', 'gestionnaire'])) {
    return (
      <Container className="py-5 text-center">
        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
          <Card.Body className="py-5">
            <FiAlertCircle size={48} className="text-danger mb-3" />
            <h2 className="text-danger">Accès non autorisé</h2>
            <p className="text-muted">Vous n'avez pas les droits pour accéder à l'inventaire.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4 inventaire-fade-in" style={{ maxWidth: '800px', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-4">
          <AiOutlineQrcode size={32} className="text-primary" />
          <h1 className="h2 fw-bold text-primary mb-0">Inventaire physique</h1>
        </div>

        {/* Messages */}
        {scanError && (
          <Alert variant="danger" className="mb-3 d-flex align-items-center gap-2" onClose={() => setScanError(null)} dismissible>
            <FiAlertCircle size={18} />
            <span>{scanError}</span>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="mb-3 d-flex align-items-center gap-2" onClose={() => setSuccess('')} dismissible>
            <FiCheckCircle size={18} />
            <span>{success}</span>
          </Alert>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
            <span>{error}</span>
          </Alert>
        )}

        {/* Mode hors ligne banner */}
        {modeHorsLigne && (
          <div className="d-flex justify-content-between align-items-center p-3 mb-3 rounded-3" style={{ backgroundColor: '#fef3c7' }}>
            <div className="d-flex align-items-center gap-2">
              <FiWifiOff className="text-warning" />
              <span className="small">Mode hors ligne</span>
            </div>
            {pendingActions.length > 0 && (
              <Button 
                variant="warning" 
                size="sm" 
                onClick={synchroniser} 
                disabled={loading}
                className="d-flex align-items-center gap-1"
              >
                <FiRefreshCw size={12} className={loading ? 'spin' : ''} />
                <span>Synchroniser ({pendingActions.length})</span>
              </Button>
            )}
          </div>
        )}

        {/* ÉTAPE 1 : Choix de la méthode et sélection de l'actif */}
        {step === 1 && (
          <>
            {/* Sélecteur de méthode */}
            <div className="d-flex gap-3 mb-4">
              <Button
                onClick={handleModeScan}
                variant={mode === 'scan' ? 'primary' : 'light'}
                className="flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-3 rounded-3"
              >
                <FiCamera size={20} /> Scanner un QR code
              </Button>
              <Button
                onClick={handleModeManuel}
                variant={mode === 'manuel' ? 'primary' : 'light'}
                className="flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-3 rounded-3"
              >
                <FiSearch size={20} /> Rechercher un actif
              </Button>
            </div>

            {/* MODE SCAN */}
            {mode === 'scan' && (
              <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-4">
                  {!scanning ? (
                    <div className="d-flex flex-column gap-3">
                      <Button onClick={demarrerScan} variant="primary" size="lg" className="py-3 d-flex align-items-center justify-content-center gap-2">
                        <FiCamera size={20} /> Scanner avec la caméra
                      </Button>
                      
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        variant="success" 
                        size="lg"
                        className="py-3 d-flex align-items-center justify-content-center gap-2"
                        disabled={scanningImage}
                      >
                        <FiImage size={20} /> 
                        {scanningImage ? 'Scan en cours...' : 'Scanner depuis une image'}
                      </Button>
                      
                      <div className="d-flex align-items-center gap-2 p-3 rounded-3" style={{ backgroundColor: '#e0f2fe' }}>
                        <FiInfo size={16} className="text-info" />
                        <small className="text-info">
                          {isMobile 
                            ? 'Placez le QR code devant la caméra pour le scanner automatiquement'
                            : 'Utilisez la caméra de votre appareil ou importez une photo contenant un QR code'}
                        </small>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>
                      <Button onClick={arreterScan} variant="secondary" className="mt-3 d-inline-flex align-items-center gap-2">
                        <FiX size={16} /> Annuler le scan
                      </Button>
                      {isMobile && (
                        <p className="mt-3 small text-muted d-flex align-items-center justify-content-center gap-2">
                          <FiSmartphone size={14} /> Placez le QR code dans le cadre
                        </p>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* MODE MANUEL - Recherche d'actif */}
            {mode === 'manuel' && (
              <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-4">
                  <InputGroup className="mb-3">
                    <InputGroup.Text className="bg-white border-end-0">
                      <FiSearch className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Rechercher par code, nom ou numéro d'inventaire..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0"
                    />
                    {searchTerm && (
                      <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                        <FiX size={16} />
                      </Button>
                    )}
                  </InputGroup>
                  
                  {loadingActifs ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" className="mb-2" />
                      <p className="text-muted small">Chargement des actifs...</p>
                    </div>
                  ) : filteredActifs.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <FiAlertCircle size={48} className="mb-2 opacity-50" />
                      <p>Aucun actif trouvé</p>
                    </div>
                  ) : (
                    <div className="vstack gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {filteredActifs.map(actif => (
                        <div
                          key={actif.id}
                          className="p-3 border rounded-3 cursor-pointer hover-bg-light transition-all"
                          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                          onClick={() => selectActifManuel(actif)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <code className="small bg-light px-2 py-1 rounded">{actif.code}</code>
                            <Badge bg={actif.type_immobilisation === 'corporel' ? 'info' : 'warning'} className="bg-opacity-10 text-dark">
                              {actif.type_immobilisation === 'corporel' ? '🏭 Corporel' : '📄 Incorporel'}
                            </Badge>
                          </div>
                          <h6 className="fw-semibold mb-1">{actif.nom}</h6>
                          <div className="d-flex gap-3 small text-muted">
                            <span className="d-flex align-items-center gap-1"><FiMapPin size={12} /> {actif.localisation || 'Non définie'}</span>
                            {actif.numero_inventaire && (
                              <span className="d-flex align-items-center gap-1"><FiFileText size={12} /> {actif.numero_inventaire}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </>
        )}

        {/* ÉTAPE 2 : Formulaire d'anomalie */}
        {step === 2 && selectedActif && (
          <Card className="border-0 shadow-sm rounded-3 inventaire-pulse">
            <Card.Body className="p-4">
              {/* Actif sélectionné */}
              <div className="text-center mb-4">
                <Badge bg="primary" className="px-3 py-2 mb-2 fs-6">{selectedActif.code}</Badge>
                <h3 className="h4 fw-bold mt-2 mb-1">{selectedActif.nom}</h3>
                <div className="d-flex justify-content-center gap-3 mt-2 small text-muted">
                  <span><strong>Valeur :</strong> {parseFloat(selectedActif.cout_acquisition).toLocaleString()} FC</span>
                  <span><strong>Localisation :</strong> {selectedActif.localisation || 'Non définie'}</span>
                </div>
              </div>

              {/* Formulaire localisation */}
              <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: '#f0fdf4' }}>
                <Form.Label className="fw-semibold d-flex align-items-center gap-2">
                  <FiMapPin size={16} /> Nouvelle localisation constatée
                </Form.Label>
                <Form.Control
                  type="text"
                  name="localisation"
                  value={formData.localisation}
                  onChange={handleFormChange}
                  placeholder="Ex: Bâtiment A - Bureau 12"
                  className="mb-2"
                />
                <Button onClick={enregistrerLocalisation} variant="success" className="w-100 d-flex align-items-center justify-content-center gap-2">
                  <FiSave size={16} /> Enregistrer la localisation
                </Button>
              </div>

              {/* Toggle formulaire anomalie */}
              <Button 
                onClick={() => setShowAnomalieForm(!showAnomalieForm)} 
                variant="warning"
                className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
              >
                <FiAlertCircle size={16} /> {showAnomalieForm ? 'Fermer le formulaire' : 'Signaler une anomalie'}
              </Button>

              {/* Formulaire anomalie */}
              {showAnomalieForm && (
                <div className="p-3 rounded-3" style={{ backgroundColor: '#fef2f2' }}>
                  <h6 className="fw-semibold mb-3">Signaler une anomalie</h6>
                  
                  {/* Type d'anomalie */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Type d'anomalie *</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {typesAnomalie.map(type => (
                        <Button
                          key={type.value}
                          variant={formData.type_anomalie === type.value ? type.bgClass : 'outline-secondary'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, type_anomalie: type.value }))}
                          className="d-flex align-items-center gap-1"
                        >
                          <span>{type.icon}</span> {type.label}
                        </Button>
                      ))}
                    </div>
                  </Form.Group>

                  {/* Priorité */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Priorité</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {priorites.map(p => (
                        <Button
                          key={p.value}
                          variant={formData.priorite === p.value ? p.bgClass : 'outline-secondary'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, priorite: p.value }))}
                        >
                          {p.icon} {p.label}
                        </Button>
                      ))}
                    </div>
                  </Form.Group>
                  
                  {/* Description */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Description détaillée *</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Décrivez précisément l'anomalie constatée..."
                      rows={4}
                    />
                  </Form.Group>
                  
                  <Button onClick={signalerAnomalie} variant="danger" className="w-100 d-flex align-items-center justify-content-center gap-2">
                    <FiAlertCircle size={16} /> Confirmer l'anomalie
                  </Button>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="d-flex gap-2 mt-4">
                <Button onClick={nouveauScan} variant="primary" className="flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                  <AiOutlineQrcode size={16} /> Autre actif
                </Button>
                <Button onClick={() => { setStep(1); setSelectedActif(null); setShowAnomalieForm(false); }} variant="secondary" className="flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                  <FiX size={16} /> Fermer
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={scannerDepuisImage}
        />
      </Container>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .hover-bg-light:hover {
          background-color: #f8f9fa;
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .bg-purple {
          background-color: #8b5cf6;
        }
        .bg-orange {
          background-color: #f97316;
        }
      `}</style>
    </>
  );
};

export default Inventaire;