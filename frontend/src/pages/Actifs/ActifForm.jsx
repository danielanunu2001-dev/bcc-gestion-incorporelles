import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import actifService from '../../services/actif';
import api from '../../services/api';
import { fetchActifs } from '../../store/actifSlice';
import { 
  FiInfo, FiDollarSign, FiTrendingUp, FiCalendar, 
  FiTag, FiMapPin, FiUser, FiFileText, FiCheckCircle
} from 'react-icons/fi';

const ActifForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEditMode = !!id;

  // État pour les catégories d'amortissement
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // ✅ État pour les devises
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
    // Nouveaux champs
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
    // ✅ Devises
    devise_id: '',
    montant_devise: '',
    devise_code: 'CDF',
    taux_change: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // ✅ Charger les devises
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

  // ✅ Calculer le montant en CDF via l'API de conversion
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
      
      // Utiliser l'API de conversion avec la date d'acquisition
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
      
      // Mettre à jour le taux de change dans le formulaire
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

  // ✅ Gestion du changement de devise
  const handleDeviseChange = (deviseId) => {
    setFormData(prev => ({ ...prev, devise_id: deviseId }));
    calculerMontantCDF(deviseId, formData.montant_devise || formData.cout_acquisition, formData.date_acquisition);
  };

  // ✅ Gestion du changement de montant en devise
  const handleMontantDeviseChange = (montant) => {
    setFormData(prev => ({ ...prev, montant_devise: montant }));
    calculerMontantCDF(formData.devise_id, montant, formData.date_acquisition);
  };

  // ✅ Gestion du changement de date d'acquisition
  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, date_acquisition: date }));
    if (formData.devise_id && formData.montant_devise) {
      calculerMontantCDF(formData.devise_id, formData.montant_devise, date);
    } else if (formData.devise_id && formData.cout_acquisition) {
      calculerMontantCDF(formData.devise_id, formData.cout_acquisition, date);
    }
  };

  // ✅ Calculer la conversion en temps réel pour la première version
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
        // ✅ Devises
        devise_id: actif.devise_id || '',
        montant_devise: actif.montant_devise || '',
        devise_code: actif.devise?.code || 'CDF',
        taux_change: actif.taux_change_utilisation || ''
      });

      // Si l'actif a une devise et un montant, calculer l'équivalent CDF
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Calcul automatique du taux d'amortissement si durée modifiée
    if (name === 'duree_utile_ans' && formData.mode_amortissement === 'lineaire') {
      const duree = parseInt(value);
      if (duree > 0) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: taux }));
      }
    }
    
    // Calcul automatique du taux si mode modifié
    if (name === 'mode_amortissement' && value === 'lineaire') {
      const duree = parseInt(formData.duree_utile_ans);
      if (duree > 0) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: taux }));
      }
    }
  };

  const handleGoBack = () => navigate(-1);

  // ✅ Fonction pour valider et formater les dates
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
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validations de base
      if (!formData.code || !formData.nom) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }
      
      // Utiliser le montant en CDF s'il existe via conversion, sinon le cout_acquisition
      let coutFinal = formData.cout_acquisition;
      if (montantCDF && formData.devise_code !== 'CDF') {
        coutFinal = montantCDF;
      } else if (coutCDF && formData.devise_code !== 'CDF') {
        coutFinal = coutCDF;
      }
      
      if (parseFloat(coutFinal) <= 0) {
        throw new Error('Le coût d\'acquisition doit être positif');
      }

      const dataToSend = {
        ...formData,
        cout_acquisition: parseFloat(coutFinal),
        valeur_residuelle: parseFloat(formData.valeur_residuelle) || 0,
        duree_utile_ans: parseInt(formData.duree_utile_ans),
        nombre_utilisateurs: formData.nombre_utilisateurs ? parseInt(formData.nombre_utilisateurs) : null,
        taux_amortissement: formData.taux_amortissement ? parseFloat(formData.taux_amortissement) : null,
        date_validite: validateAndFormatDate(formData.date_validite),
        date_acquisition: validateAndFormatDate(formData.date_acquisition),
        categorie_id: formData.categorie_id || null,
        // ✅ Devises
        devise_id: formData.devise_id || null,
        montant_devise: formData.montant_devise ? parseFloat(formData.montant_devise) : null,
        taux_change_utilisation: formData.taux_change ? parseFloat(formData.taux_change) : null,
        // ✅ Devise code pour la conversion
        devise_code: formData.devise_code
      };

      if (dataToSend.date_validite === 'Invalid date') {
        dataToSend.date_validite = null;
      }

      console.log('📤 Données envoyées:', dataToSend);

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
      console.error('❌ Erreur lors de la soumission:', err);
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

  // ✅ Calcul des montants TVA pour l'information
  const montantHT = montantCDF || coutCDF || formData.cout_acquisition;
  const tauxChange = tauxChangeActuel || tauxActuel;
  const montantTVA = montantHT ? montantHT * 0.16 : 0;
  const montantTTC = montantHT ? montantHT + montantTVA : 0;

  if (loading && isEditMode) {
    return <div style={styles.container}><div style={styles.loading}>Chargement...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{isEditMode ? 'Modifier l\'actif' : 'Nouvel actif'}</h1>
        <button onClick={handleGoBack} style={styles.backButton}>← Retour</button>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}
      {success && <div style={styles.successMessage}>{success} Redirection...</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          {/* Colonne 1 */}
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Code *</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom *</label>
              <input type="text" name="nom" value={formData.nom} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type *</label>
              <select name="type" value={formData.type} onChange={handleChange} style={styles.select}>
                {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type d'immobilisation</label>
              <select name="type_immobilisation" value={formData.type_immobilisation} onChange={handleChange} style={styles.select}>
                <option value="corporel">Corporel</option>
                <option value="incorporel">Incorporel</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Numéro d'inventaire</label>
              <input type="text" name="numero_inventaire" value={formData.numero_inventaire} onChange={handleChange} style={styles.input} />
            </div>
          </div>

          {/* Colonne 2 */}
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date acquisition *</label>
              <input 
                type="date" 
                name="date_acquisition" 
                value={formData.date_acquisition || ''} 
                onChange={(e) => handleDateChange(e.target.value)} 
                style={styles.input} 
                required 
              />
            </div>
            
            {/* ✅ SECTION DEVISE - Version améliorée */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiDollarSign size={14} /> Devise d'acquisition
              </label>
              <select
                name="devise_id"
                value={formData.devise_id}
                onChange={(e) => handleDeviseChange(e.target.value)}
                style={styles.select}
                disabled={loadingDevises}
              >
                <option value="">-- Sélectionner une devise --</option>
                {devises.map(dev => (
                  <option key={dev.id} value={dev.id}>
                    {dev.code} - {dev.nom} ({dev.symbole})
                  </option>
                ))}
              </select>
              {loadingDevises && <small>Chargement des devises...</small>}
              <small style={styles.helperText}>La devise de la facture d'acquisition</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Montant ({formData.devise_code || 'CDF'})
              </label>
              <input
                type="number"
                name="montant_devise"
                value={formData.montant_devise}
                onChange={(e) => handleMontantDeviseChange(e.target.value)}
                style={styles.input}
                step="0.01"
                min="0"
                placeholder="Montant dans la devise choisie"
                disabled={!formData.devise_id}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiFileText size={14} /> Numéro de facture
              </label>
              <input 
                type="text" 
                name="numero_facture" 
                value={formData.numero_facture} 
                onChange={handleChange} 
                style={styles.input} 
                placeholder="FAC-2025-001" 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiUser size={14} /> Fournisseur
              </label>
              <input type="text" name="fournisseur" value={formData.fournisseur} onChange={handleChange} style={styles.input} />
            </div>
          </div>
        </div>

        {/* ✅ Information de conversion - Version améliorée */}
        {formData.devise_code !== 'CDF' && conversionInfo && (
          <div style={styles.conversionCard}>
            <div style={styles.conversionHeader}>
              <FiInfo size={16} color="#10b981" />
              <strong>Informations de conversion</strong>
            </div>
            <div style={styles.conversionGrid}>
              <div style={styles.conversionItem}>
                <span>Montant saisi:</span>
                <strong>{conversionInfo.montant_original} {conversionInfo.devise_originale}</strong>
              </div>
              <div style={styles.conversionItem}>
                <span>Taux appliqué:</span>
                <strong>1 {conversionInfo.devise_originale} = {conversionInfo.taux_utilise?.toLocaleString()} CDF</strong>
                <small>(taux du {new Date(formData.date_acquisition).toLocaleDateString('fr-FR')})</small>
              </div>
              <div style={styles.conversionItemHighlight}>
                <span>Équivalent en CDF:</span>
                <strong className={styles.conversionHighlight}>
                  {conversionInfo.montant_cdf?.toLocaleString()} CDF
                </strong>
              </div>
              <div style={styles.conversionItem}>
                <span>TVA (16%):</span>
                <strong>{(conversionInfo.montant_cdf * 0.16).toLocaleString()} CDF</strong>
              </div>
              <div style={styles.conversionItem}>
                <span>Total TTC:</span>
                <strong>{(conversionInfo.montant_cdf * 1.16).toLocaleString()} CDF</strong>
              </div>
            </div>
            <small style={styles.conversionNote}>
              <FiInfo size={12} /> Le montant en CDF sera automatiquement enregistré dans le champ "Coût d'acquisition"
            </small>
          </div>
        )}

        {/* Valeur en CDF (si devise différente) ou montant direct */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Valeur d'acquisition (CDF)
            {formData.devise_code !== 'CDF' && <span style={styles.labelNote}> (calculé automatiquement)</span>}
          </label>
          <input
            type="text"
            value={(montantCDF || coutCDF) !== null ? (montantCDF || coutCDF).toLocaleString() : ''}
            style={{ ...styles.input, backgroundColor: '#f3f4f6', fontWeight: 'bold' }}
            readOnly
            disabled
          />
          {formData.devise_code !== 'CDF' && (
            <small style={styles.helperText}>Ce montant est calculé à partir du taux de change à la date d'acquisition</small>
          )}
        </div>

        {/* Section Amortissement */}
        <div style={styles.section}>
          <h3><FiTrendingUp size={18} /> Amortissement</h3>
          <div style={styles.formGrid}>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Mode d'amortissement *</label>
                <select name="mode_amortissement" value={formData.mode_amortissement} onChange={handleChange} style={styles.select}>
                  {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Durée utile (ans) *</label>
                <input type="number" name="duree_utile_ans" value={formData.duree_utile_ans} onChange={handleChange} style={styles.input} min="1" max="50" required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Taux d'amortissement (%)</label>
                <input type="number" name="taux_amortissement" value={formData.taux_amortissement} onChange={handleChange} style={styles.input} step="0.01" min="0" max="100" placeholder="Calculé automatiquement" />
                <small style={styles.helperText}>Laissé vide, le taux sera calculé automatiquement (100% / durée)</small>
              </div>
            </div>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Valeur résiduelle (CDF)</label>
                <input type="number" name="valeur_residuelle" value={formData.valeur_residuelle} onChange={handleChange} style={styles.input} min="0" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Catégorie d'amortissement */}
        <div style={styles.section}>
          <h3><FiTag size={18} /> Catégorie d'amortissement (GCEC)</h3>
          <div style={styles.formGrid}>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Catégorie</label>
                <select 
                  name="categorie_id" 
                  value={formData.categorie_id} 
                  onChange={handleChange} 
                  style={styles.select}
                  disabled={loadingCategories}
                >
                  <option value="">-- Sélectionner une catégorie --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.code_categorie} - {cat.nom_categorie} ({cat.duree_vie_ans} ans)
                    </option>
                  ))}
                </select>
                {loadingCategories && <small>Chargement des catégories...</small>}
                {formData.categorie_id && (
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#10b981' }}>
                    <FiCheckCircle size={12} /> La durée et le mode d'amortissement seront automatiquement appliqués
                  </small>
                )}
              </div>
            </div>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Compte comptable GCEC</label>
                <input 
                  type="text" 
                  name="compte_comptable" 
                  value={formData.compte_comptable} 
                  onChange={handleChange} 
                  style={styles.input} 
                  placeholder="205"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Champs spécifiques selon le type d'immobilisation */}
        {formData.type_immobilisation === 'corporel' && (
          <div style={styles.section}>
            <h3>🖥️ Informations matérielles</h3>
            <div style={styles.formGrid}>
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label>Marque</label>
                  <input type="text" name="marque" value={formData.marque} onChange={handleChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label>Modèle</label>
                  <input type="text" name="modele" value={formData.modele} onChange={handleChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label>Numéro de série</label>
                  <input type="text" name="numero_serie" value={formData.numero_serie} onChange={handleChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label>État</label>
                  <select name="etat" value={formData.etat} onChange={handleChange} style={styles.select}>
                    {etats.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.type_immobilisation === 'incorporel' && (
          <div style={styles.section}>
            <h3>📜 Informations licence</h3>
            <div style={styles.formGrid}>
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label><FiCalendar size={14} /> Date de validité</label>
                  <input 
                    type="date" 
                    name="date_validite" 
                    value={formData.date_validite || ''} 
                    onChange={handleChange} 
                    style={styles.input} 
                  />
                  <small style={{ color: '#666' }}>Laissez vide si non applicable</small>
                </div>
                <div style={styles.formGroup}>
                  <label>Nombre d'utilisateurs</label>
                  <input type="number" name="nombre_utilisateurs" value={formData.nombre_utilisateurs} onChange={handleChange} style={styles.input} min="1" />
                </div>
              </div>
              <div style={styles.formColumn}>
                <div style={styles.formGroup}>
                  <label>Support</label>
                  <input type="text" name="support" value={formData.support} onChange={handleChange} style={styles.input} placeholder="CD, téléchargement, etc." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informations complémentaires */}
        <div style={styles.section}>
          <h3><FiMapPin size={18} /> Informations complémentaires</h3>
          <div style={styles.formGrid}>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label>Localisation</label>
                <input type="text" name="localisation" value={formData.localisation} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Affectation (service/utilisateur)</label>
                <input type="text" name="affectation" value={formData.affectation} onChange={handleChange} style={styles.input} />
              </div>
            </div>
            <div style={styles.formColumn}>
              <div style={styles.formGroup}>
                <label>Compte comptable</label>
                <input type="text" name="compte_comptable" value={formData.compte_comptable} onChange={handleChange} style={styles.input} />
              </div>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} style={styles.textarea} rows="3" />
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={handleGoBack} style={styles.cancelButton}>Annuler</button>
          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading ? 'En cours...' : (isEditMode ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem', backgroundColor: '#f3f4f6', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '2rem', color: '#1e3a8a', margin: 0 },
  backButton: { padding: '0.5rem 1rem', backgroundColor: 'var(--text-secondary)', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  form: { backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '1rem' },
  formColumn: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  section: { marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' },
  labelNote: { fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' },
  input: { width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem' },
  select: { width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'var(--bg-card)' },
  textarea: { width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' },
  helperText: { fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' },
  // ✅ Nouveaux styles pour la conversion
  conversionCard: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' },
  conversionHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #bbf7d0' },
  conversionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' },
  conversionItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#334155', padding: '0.25rem 0' },
  conversionItemHighlight: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '600', color: '#10b981', padding: '0.5rem 0', borderTop: '1px solid #bbf7d0', marginTop: '0.25rem' },
  conversionHighlight: { fontSize: '1rem', fontWeight: 'bold', color: '#059669' },
  conversionNote: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #bbf7d0' },
  // Styles existants
  infoBox: { backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginTop: '1rem', marginBottom: '1rem', border: '1px solid #bae6fd' },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  infoLabel: { fontSize: '0.875rem', color: '#075985' },
  infoValue: { fontSize: '0.875rem', fontWeight: 'bold', color: '#0369a1' },
  conversionResult: { fontSize: '1rem', fontWeight: 'bold', color: '#2563eb' },
  loadingSmall: { fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' },
  buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
  submitButton: { padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
  cancelButton: { padding: '0.75rem 1.5rem', backgroundColor: '#9ca3af', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
  errorMessage: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' },
  successMessage: { backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' },
  loading: { textAlign: 'center', padding: '2rem', fontSize: '1.2rem', color: '#666' }
};

export default ActifForm;