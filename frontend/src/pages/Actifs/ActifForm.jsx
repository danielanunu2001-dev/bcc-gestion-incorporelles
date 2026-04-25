import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import actifService from '../../services/actif';
import api from '../../services/api';
import { fetchActifs } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import { 
  FiInfo, FiDollarSign, FiTrendingUp, FiCalendar, 
  FiTag, FiMapPin, FiUser, FiFileText, FiCheckCircle,
  FiLock, FiSave, FiX, FiHelpCircle, FiAlertCircle
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const ActifForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEditMode = !!id;
  const { can } = usePermissions();

  // Vérification des droits d'accès au formulaire
  const canAccessForm = can(['admin', 'comptable']);
  const canModify = can(['admin', 'comptable']);

  // États pour les catégories d'amortissement
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // État pour les devises
  const [devises, setDevises] = useState([]);
  const [loadingDevises, setLoadingDevises] = useState(false);
  const [montantCDF, setMontantCDF] = useState(null);
  const [tauxChangeActuel, setTauxChangeActuel] = useState(null);
  const [coutCDF, setCoutCDF] = useState(null);
  const [tauxActuel, setTauxActuel] = useState(null);
  const [loadingTaux, setLoadingTaux] = useState(false);
  const [conversionInfo, setConversionInfo] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    type: 'logiciel',
    date_acquisition: new Date().toISOString().split('T')[0],
    cout_acquisition: '',
    valeur_residuelle: '0',
    duree_utile_ans: '5',
    mode_amortissement: 'lineaire',
    taux_amortissement: '',
    numero_facture: '',
    description: '',
    compte_comptable: '205',
    numero_inventaire: '',
    marque: '',
    modele: '',
    numero_serie: '',
    localisation: '',
    fournisseur: '',
    etat: 'bon',
    affectation: '',
    type_immobilisation: 'incorporel',
    date_validite: '',
    nombre_utilisateurs: '',
    support: '',
    categorie_id: '',
    devise_id: '',
    montant_devise: '',
    devise_code: 'CDF',
    taux_change: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirection si l'utilisateur n'a pas les droits
  useEffect(() => {
    if (!canAccessForm && !isEditMode) {
      setError('Vous n\'avez pas les droits pour créer un actif');
      setTimeout(() => navigate('/actifs'), 2000);
    }
    if (!canModify && isEditMode) {
      setError('Vous n\'avez pas les droits pour modifier un actif');
      setTimeout(() => navigate('/actifs'), 2000);
    }
  }, [canAccessForm, canModify, isEditMode, navigate]);

  // Charger les catégories d'amortissement et devises au montage
  useEffect(() => {
    chargerCategories();
    chargerDevises();
  }, []);

  const chargerCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.get('/categories-amortissement');
      setCategories(res.data);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Charger les devises
  const chargerDevises = async () => {
    try {
      setLoadingDevises(true);
      const res = await api.get('/devises');
      setDevises(res.data);
    } catch (err) {
      console.error('Erreur chargement devises:', err);
    } finally {
      setLoadingDevises(false);
    }
  };

  // Calculer le montant en CDF via l'API de conversion
  const calculerMontantCDF = async (deviseId, montant, dateAcquisition) => {
    if (!deviseId || !montant || parseFloat(montant) <= 0) {
      setMontantCDF(null);
      setTauxChangeActuel(null);
      setConversionInfo(null);
      return;
    }
    try {
      setLoadingTaux(true);
      const devise = devises.find(d => d.id === parseInt(deviseId));
      if (!devise) return;
      
      const res = await api.get('/actifs/preview-conversion', {
        params: {
          montant: parseFloat(montant),
          devise: devise.code,
          date: dateAcquisition || formData.date_acquisition
        }
      });
      
      setMontantCDF(res.data.montant_cdf);
      setTauxChangeActuel(res.data.taux_utilise);
      setCoutCDF(res.data.montant_cdf);
      setTauxActuel(res.data.taux_utilise);
      setConversionInfo(res.data);
      
      setFormData(prev => ({
        ...prev,
        devise_code: devise.code,
        taux_change: res.data.taux_utilise
      }));
    } catch (err) {
      console.error('Erreur conversion:', err);
      setMontantCDF(null);
      setCoutCDF(null);
      setConversionInfo(null);
    } finally {
      setLoadingTaux(false);
    }
  };

  // Gestion du changement de devise
  const handleDeviseChange = (deviseId) => {
    if (!canModify) return;
    setFormData(prev => ({ ...prev, devise_id: deviseId }));
    calculerMontantCDF(deviseId, formData.montant_devise || formData.cout_acquisition, formData.date_acquisition);
  };

  // Gestion du changement de montant en devise
  const handleMontantDeviseChange = (montant) => {
    if (!canModify) return;
    setFormData(prev => ({ ...prev, montant_devise: montant }));
    calculerMontantCDF(formData.devise_id, montant, formData.date_acquisition);
  };

  // Gestion du changement de date d'acquisition
  const handleDateChange = (date) => {
    if (!canModify) return;
    setFormData(prev => ({ ...prev, date_acquisition: date }));
    if (formData.devise_id && formData.montant_devise) {
      calculerMontantCDF(formData.devise_id, formData.montant_devise, date);
    } else if (formData.devise_id && formData.cout_acquisition) {
      calculerMontantCDF(formData.devise_id, formData.cout_acquisition, date);
    }
  };

  // Calculer la conversion en temps réel pour la première version
  useEffect(() => {
    const calculateConversion = async () => {
      if (formData.devise_code === 'CDF') {
        setCoutCDF(formData.cout_acquisition);
        setTauxActuel(null);
        setConversionInfo(null);
        return;
      }
      
      if (formData.cout_acquisition && formData.date_acquisition) {
        setLoadingTaux(true);
        try {
          const res = await api.get('/actifs/preview-conversion', {
            params: {
              montant: formData.cout_acquisition,
              devise: formData.devise_code,
              date: formData.date_acquisition,
            },
          });
          setCoutCDF(res.data.montant_cdf);
          setTauxActuel(res.data.taux_utilise);
          setConversionInfo(res.data);
        } catch (err) {
          console.error('Erreur conversion:', err);
          setCoutCDF(null);
          setConversionInfo(null);
        } finally {
          setLoadingTaux(false);
        }
      }
    };
    
    calculateConversion();
  }, [formData.cout_acquisition, formData.devise_code, formData.date_acquisition]);

  useEffect(() => {
    if (isEditMode) chargerActif();
  }, [id]);

  const chargerActif = async () => {
    try {
      setLoading(true);
      const actif = await actifService.getById(id);
      setFormData({
        code: actif.code || '',
        nom: actif.nom || '',
        type: actif.type || 'logiciel',
        date_acquisition: actif.date_acquisition?.split('T')[0] || '',
        cout_acquisition: actif.cout_acquisition || '',
        valeur_residuelle: actif.valeur_residuelle || '0',
        duree_utile_ans: actif.duree_utile_ans || '5',
        mode_amortissement: actif.mode_amortissement || 'lineaire',
        taux_amortissement: actif.taux_amortissement || '',
        numero_facture: actif.numero_facture || '',
        description: actif.description || '',
        compte_comptable: actif.compte_comptable || '205',
        numero_inventaire: actif.numero_inventaire || '',
        marque: actif.marque || '',
        modele: actif.modele || '',
        numero_serie: actif.numero_serie || '',
        localisation: actif.localisation || '',
        fournisseur: actif.fournisseur || '',
        etat: actif.etat || 'bon',
        affectation: actif.affectation || '',
        type_immobilisation: actif.type_immobilisation || 'incorporel',
        date_validite: actif.date_validite || '',
        nombre_utilisateurs: actif.nombre_utilisateurs || '',
        support: actif.support || '',
        categorie_id: actif.categorie_id || '',
        devise_id: actif.devise_id || '',
        montant_devise: actif.montant_devise || '',
        devise_code: actif.devise?.code || 'CDF',
        taux_change: actif.taux_change_utilisation || ''
      });

      if (actif.devise_id && actif.montant_devise) {
        await calculerMontantCDF(actif.devise_id, actif.montant_devise, actif.date_acquisition);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'actif');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `${(value || 0).toLocaleString()} FC`;
    }
  };

  const handleChange = (e) => {
    if (!canModify) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'duree_utile_ans' && formData.mode_amortissement === 'lineaire') {
      const duree = parseInt(value);
      if (duree > 0) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: taux }));
      }
    }
    
    if (name === 'mode_amortissement' && value === 'lineaire') {
      const duree = parseInt(formData.duree_utile_ans);
      if (duree > 0) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: taux }));
      }
    }
  };

  const handleGoBack = () => navigate(-1);

  const validateAndFormatDate = (dateValue) => {
    if (!dateValue) return null;
    
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn('Date invalide détectée:', dateValue);
      return null;
    }
    
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canModify) {
      setError('Vous n\'avez pas les droits pour effectuer cette action');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.code || !formData.nom) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }
      
      let coutAcquisitionCDF = null;
      
      if (formData.devise_code === 'CDF') {
        coutAcquisitionCDF = parseFloat(formData.montant_devise) || parseFloat(formData.cout_acquisition);
      } else if (formData.devise_id && formData.montant_devise) {
        coutAcquisitionCDF = montantCDF || coutCDF;
        
        if (!coutAcquisitionCDF || coutAcquisitionCDF <= 0) {
          throw new Error('Conversion impossible. Vérifiez le taux de change.');
        }
      } else {
        coutAcquisitionCDF = parseFloat(formData.cout_acquisition);
      }
      
      if (!coutAcquisitionCDF || isNaN(coutAcquisitionCDF) || coutAcquisitionCDF <= 0) {
        throw new Error('Le coût d\'acquisition doit être positif');
      }

      const dataToSend = {
        ...formData,
        cout_acquisition: parseFloat(coutAcquisitionCDF),
        valeur_residuelle: parseFloat(formData.valeur_residuelle) || 0,
        duree_utile_ans: parseInt(formData.duree_utile_ans),
        nombre_utilisateurs: formData.nombre_utilisateurs ? parseInt(formData.nombre_utilisateurs) : null,
        taux_amortissement: formData.taux_amortissement ? parseFloat(formData.taux_amortissement) : null,
        date_validite: validateAndFormatDate(formData.date_validite),
        date_acquisition: validateAndFormatDate(formData.date_acquisition),
        categorie_id: formData.categorie_id || null,
        devise_id: formData.devise_id || null,
        montant_devise: formData.montant_devise ? parseFloat(formData.montant_devise) : null,
        taux_change_utilisation: (tauxChangeActuel || tauxActuel) ? parseFloat(tauxChangeActuel || tauxActuel) : null,
        devise_code: formData.devise_code
      };

      if (dataToSend.date_validite === 'Invalid date') {
        dataToSend.date_validite = null;
      }

      if (isEditMode) {
        await actifService.update(id, dataToSend);
        setSuccess('Actif modifié avec succès !');
      } else {
        await actifService.create(dataToSend);
        setSuccess('Actif créé avec succès !');
      }

      await dispatch(fetchActifs({}));
      setTimeout(() => navigate('/actifs'), 1500);
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { value: 'logiciel', label: 'Logiciel' },
    { value: 'brevet', label: 'Brevet' },
    { value: 'licence', label: 'Licence' },
    { value: 'fonds_commercial', label: 'Fonds commercial' },
    { value: 'materiel', label: 'Matériel' },
    { value: 'vehicule', label: 'Véhicule' },
    { value: 'bâtiment', label: 'Bâtiment' },
    { value: 'terrain', label: 'Terrain' },
    { value: 'autres', label: 'Autres' }
  ];

  const modes = [
    { value: 'lineaire', label: 'Linéaire' },
    { value: 'degressif', label: 'Dégressif' }
  ];

  const etats = [
    { value: 'neuf', label: 'Neuf' },
    { value: 'bon', label: 'Bon' },
    { value: 'reparation', label: 'En réparation' },
    { value: 'hors_service', label: 'Hors service' }
  ];

  // ✅ CORRECTION : Calcul correct du TTC (HT + TVA)
  const montantHT = montantCDF || coutCDF || formData.cout_acquisition;
  const tauxChange = tauxChangeActuel || tauxActuel;
  const montantTVA = montantHT ? Math.round(montantHT * 0.16) : 0;
  const montantTTC = montantHT ? montantHT + montantTVA : 0;  // ← CORRECTION ICI

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .form-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .form-slide-in {
      animation: slideIn 0.3s ease-out;
    }
  `;

  // Si l'utilisateur n'a pas les droits, afficher un message d'erreur
  if (!canAccessForm && !isEditMode) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container py-5" style={{ maxWidth: '1200px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 fw-bold text-primary">Accès refusé</h1>
            <button onClick={handleGoBack} className="btn btn-secondary d-flex align-items-center gap-2">
              ← Retour
            </button>
          </div>
          <div className="alert alert-danger d-flex align-items-center gap-3">
            <FiLock size={20} />
            <span>Vous n'avez pas les droits pour créer ou modifier des actifs. Cette action est réservée aux administrateurs et comptables.</span>
          </div>
        </div>
      </>
    );
  }

  if (loading && isEditMode) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="text-muted">Chargement de l'actif...</p>
      </div>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="container py-4 px-3 px-md-4 form-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <h1 className="h2 fw-bold text-primary mb-0">
            {isEditMode ? 'Modifier l\'actif' : 'Nouvel actif'}
          </h1>
          <button onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">
            ← Retour
          </button>
        </div>

        {/* Messages d'erreur et de succès */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiCheckCircle size={18} />
              <span>{success} Redirection...</span>
            </div>
          </div>
        )}

        {/* Formulaire principal */}
        <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-3 overflow-hidden">
          <div className="card-body p-4">
            {/* Section 1: Informations générales */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    Code <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="code" 
                    value={formData.code} 
                    onChange={handleChange} 
                    className="form-control" 
                    required 
                    disabled={!canModify}
                    placeholder="ACT-001"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    Nom <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="nom" 
                    value={formData.nom} 
                    onChange={handleChange} 
                    className="form-control" 
                    required 
                    disabled={!canModify}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Type *</label>
                  <select 
                    name="type" 
                    value={formData.type} 
                    onChange={handleChange} 
                    className="form-select"
                    disabled={!canModify}
                  >
                    {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Type d'immobilisation</label>
                  <select 
                    name="type_immobilisation" 
                    value={formData.type_immobilisation} 
                    onChange={handleChange} 
                    className="form-select"
                    disabled={!canModify}
                  >
                    <option value="corporel">🏭 Corporel</option>
                    <option value="incorporel">📄 Incorporel</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Numéro d'inventaire</label>
                  <input 
                    type="text" 
                    name="numero_inventaire" 
                    value={formData.numero_inventaire} 
                    onChange={handleChange} 
                    className="form-control"
                    disabled={!canModify}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiCalendar size={14} /> Date acquisition <span className="text-danger">*</span>
                  </label>
                  <input 
                    type="date" 
                    name="date_acquisition" 
                    value={formData.date_acquisition || ''} 
                    onChange={(e) => handleDateChange(e.target.value)} 
                    className="form-control" 
                    required 
                    disabled={!canModify}
                  />
                </div>
                
                {/* Section Devise */}
                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiDollarSign size={14} /> Devise d'acquisition
                  </label>
                  <select
                    name="devise_id"
                    value={formData.devise_id}
                    onChange={(e) => handleDeviseChange(e.target.value)}
                    className="form-select"
                    disabled={loadingDevises || !canModify}
                  >
                    <option value="">-- Sélectionner une devise --</option>
                    {devises.map(dev => (
                      <option key={dev.id} value={dev.id}>
                        {dev.code} - {dev.nom} ({dev.symbole})
                      </option>
                    ))}
                  </select>
                  {loadingDevises && <small className="text-muted">Chargement des devises...</small>}
                  <small className="text-muted d-block mt-1">La devise de la facture d'acquisition</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Montant ({formData.devise_code || 'CDF'})
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">💰</span>
                    <input
                      type="number"
                      name="montant_devise"
                      value={formData.montant_devise}
                      onChange={(e) => handleMontantDeviseChange(e.target.value)}
                      className="form-control"
                      step="0.01"
                      min="0"
                      placeholder="Montant dans la devise choisie"
                      disabled={!formData.devise_id || !canModify}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiFileText size={14} /> Numéro de facture
                  </label>
                  <input 
                    type="text" 
                    name="numero_facture" 
                    value={formData.numero_facture} 
                    onChange={handleChange} 
                    className="form-control" 
                    placeholder="FAC-2025-001"
                    disabled={!canModify}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold d-flex align-items-center gap-2">
                    <FiUser size={14} /> Fournisseur
                  </label>
                  <input 
                    type="text" 
                    name="fournisseur" 
                    value={formData.fournisseur} 
                    onChange={handleChange} 
                    className="form-control"
                    disabled={!canModify}
                  />
                </div>
              </div>
            </div>

            {/* Information de conversion */}
            {formData.devise_code !== 'CDF' && conversionInfo && (
              <div className="card border-success bg-success bg-opacity-10 mb-4 form-slide-in">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-success">
                    <FiInfo size={16} className="text-success" />
                    <strong className="text-success">Informations de conversion</strong>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <small className="text-muted d-block">Montant saisi:</small>
                      <strong>{conversionInfo.montant_original} {conversionInfo.devise_originale}</strong>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted d-block">Taux appliqué:</small>
                      <strong>1 {conversionInfo.devise_originale} = {conversionInfo.taux_utilise?.toLocaleString()} CDF</strong>
                      <small className="text-muted d-block">(taux du {new Date(formData.date_acquisition).toLocaleDateString('fr-FR')})</small>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted d-block">Équivalent en CDF:</small>
                      <strong className="text-success fs-5">{conversionInfo.montant_cdf?.toLocaleString()} CDF</strong>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted d-block">TVA (16%):</small>
                      <strong>{(conversionInfo.montant_cdf * 0.16).toLocaleString()} CDF</strong>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted d-block">Total TTC:</small>
                      <strong>{((conversionInfo.montant_cdf * 0.16) + conversionInfo.montant_cdf).toLocaleString()} CDF</strong>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-3 pt-2 border-top border-success">
                    <FiInfo size={12} className="me-1" /> Le montant en CDF sera automatiquement enregistré dans le champ "Coût d'acquisition"
                  </small>
                </div>
              </div>
            )}

            {/* Valeur d'acquisition en CDF */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Valeur d'acquisition (CDF)
                {formData.devise_code !== 'CDF' && <span className="text-muted ms-2 small">(calculé automatiquement)</span>}
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">FC</span>
                <input
                  type="text"
                  value={(montantCDF || coutCDF) !== null ? (montantCDF || coutCDF).toLocaleString() : ''}
                  className="form-control bg-light fw-bold"
                  readOnly
                  disabled
                />
              </div>
              {formData.devise_code !== 'CDF' && (
                <small className="text-muted d-block mt-1">Ce montant est calculé à partir du taux de change à la date d'acquisition</small>
              )}
            </div>

            {/* Section Amortissement */}
            <div className="card bg-light border-0 mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiTrendingUp size={16} /> Amortissement
                </h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Mode d'amortissement *</label>
                      <select 
                        name="mode_amortissement" 
                        value={formData.mode_amortissement} 
                        onChange={handleChange} 
                        className="form-select"
                        disabled={!canModify}
                      >
                        {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Durée utile (ans) *</label>
                      <input 
                        type="number" 
                        name="duree_utile_ans" 
                        value={formData.duree_utile_ans} 
                        onChange={handleChange} 
                        className="form-control" 
                        min="1" 
                        max="50" 
                        required
                        disabled={!canModify}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Taux d'amortissement (%)</label>
                      <div className="input-group">
                        <input 
                          type="number" 
                          name="taux_amortissement" 
                          value={formData.taux_amortissement} 
                          onChange={handleChange} 
                          className="form-control" 
                          step="0.01" 
                          min="0" 
                          max="100" 
                          placeholder="Calculé automatiquement"
                          disabled={!canModify}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                      <small className="text-muted">Laissé vide, le taux sera calculé automatiquement (100% / durée)</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Valeur résiduelle (CDF)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white">FC</span>
                        <input 
                          type="number" 
                          name="valeur_residuelle" 
                          value={formData.valeur_residuelle} 
                          onChange={handleChange} 
                          className="form-control" 
                          min="0"
                          disabled={!canModify}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Catégorie d'amortissement */}
            <div className="card bg-light border-0 mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiTag size={16} /> Catégorie d'amortissement (GCEC)
                </h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Catégorie</label>
                    <select 
                      name="categorie_id" 
                      value={formData.categorie_id} 
                      onChange={handleChange} 
                      className="form-select"
                      disabled={loadingCategories || !canModify}
                    >
                      <option value="">-- Sélectionner une catégorie --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.code_categorie} - {cat.nom_categorie} ({cat.duree_vie_ans} ans)
                        </option>
                      ))}
                    </select>
                    {loadingCategories && <small className="text-muted">Chargement des catégories...</small>}
                    {formData.categorie_id && (
                      <small className="text-success d-block mt-1">
                        <FiCheckCircle size={12} className="me-1" /> La durée et le mode d'amortissement seront automatiquement appliqués
                      </small>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Compte comptable GCEC</label>
                    <input 
                      type="text" 
                      name="compte_comptable" 
                      value={formData.compte_comptable} 
                      onChange={handleChange} 
                      className="form-control" 
                      placeholder="205"
                      disabled={!canModify}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Champs spécifiques selon le type d'immobilisation */}
            {formData.type_immobilisation === 'corporel' && (
              <div className="card bg-light border-0 mb-4">
                <div className="card-body">
                  <h3 className="h6 fw-semibold mb-3">🖥️ Informations matérielles</h3>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Marque</label>
                        <input 
                          type="text" 
                          name="marque" 
                          value={formData.marque} 
                          onChange={handleChange} 
                          className="form-control"
                          disabled={!canModify}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Modèle</label>
                        <input 
                          type="text" 
                          name="modele" 
                          value={formData.modele} 
                          onChange={handleChange} 
                          className="form-control"
                          disabled={!canModify}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Numéro de série</label>
                        <input 
                          type="text" 
                          name="numero_serie" 
                          value={formData.numero_serie} 
                          onChange={handleChange} 
                          className="form-control"
                          disabled={!canModify}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">État</label>
                        <select 
                          name="etat" 
                          value={formData.etat} 
                          onChange={handleChange} 
                          className="form-select"
                          disabled={!canModify}
                        >
                          {etats.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.type_immobilisation === 'incorporel' && (
              <div className="card bg-light border-0 mb-4">
                <div className="card-body">
                  <h3 className="h6 fw-semibold mb-3">📜 Informations licence</h3>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label d-flex align-items-center gap-2">
                          <FiCalendar size={14} /> Date de validité
                        </label>
                        <input 
                          type="date" 
                          name="date_validite" 
                          value={formData.date_validite || ''} 
                          onChange={handleChange} 
                          className="form-control"
                          disabled={!canModify}
                        />
                        <small className="text-muted">Laissez vide si non applicable</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Nombre d'utilisateurs</label>
                        <input 
                          type="number" 
                          name="nombre_utilisateurs" 
                          value={formData.nombre_utilisateurs} 
                          onChange={handleChange} 
                          className="form-control" 
                          min="1"
                          disabled={!canModify}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Support</label>
                        <input 
                          type="text" 
                          name="support" 
                          value={formData.support} 
                          onChange={handleChange} 
                          className="form-control" 
                          placeholder="CD, téléchargement, etc."
                          disabled={!canModify}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Informations complémentaires */}
            <div className="card bg-light border-0 mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiMapPin size={16} /> Informations complémentaires
                </h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Localisation</label>
                      <input 
                        type="text" 
                        name="localisation" 
                        value={formData.localisation} 
                        onChange={handleChange} 
                        className="form-control"
                        disabled={!canModify}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Affectation (service/utilisateur)</label>
                      <input 
                        type="text" 
                        name="affectation" 
                        value={formData.affectation} 
                        onChange={handleChange} 
                        className="form-control"
                        disabled={!canModify}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Compte comptable</label>
                      <input 
                        type="text" 
                        name="compte_comptable" 
                        value={formData.compte_comptable} 
                        onChange={handleChange} 
                        className="form-control"
                        disabled={!canModify}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    className="form-control" 
                    rows="3"
                    disabled={!canModify}
                  />
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="d-flex justify-content-end gap-3 pt-3 border-top">
              <button type="button" onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">
                <FiX size={16} /> Annuler
              </button>
              {canModify && (
                <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>En cours...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={16} /> {isEditMode ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default ActifForm;