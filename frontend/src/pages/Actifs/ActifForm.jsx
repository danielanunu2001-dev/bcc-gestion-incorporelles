// frontend/src/pages/Actifs/ActifForm.jsx - VERSION FINALE CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import actifService from '../../services/actifService';
import api from '../../services/api';
import { fetchActifs } from '../../store/actifSlice';
import usePermissions from '../../hooks/usePermissions';
import { 
  FiInfo, FiDollarSign, FiTrendingUp, FiCalendar, 
  FiTag, FiMapPin, FiUser, FiFileText, FiCheckCircle,
  FiLock, FiSave, FiX, FiHelpCircle, FiAlertCircle,
  FiMessageSquare, FiSend, FiRotateCcw, FiCheck, FiAlertTriangle,
  FiCpu, FiZap, FiShield, FiStar, FiRefreshCw, FiDatabase,
  FiClock, FiDownload, FiEye, FiTrash2, FiPlus, FiMaximize2,
  FiFile, FiActivity, FiFileText as FiInvoice,
  FiChevronDown, FiChevronUp, FiPackage
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';

// ✅ Fonction utilitaire pour extraire un message d'erreur lisible
const getErrorMessage = (error) => {
  if (!error) return 'Une erreur est survenue';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.point) return `${data.point} ${data.justification || ''}`.trim();
    if (data.justification) return data.justification;
    try {
      return JSON.stringify(data);
    } catch (e) {
      return 'Erreur serveur';
    }
  }
  if (error.point) return `${error.point} ${error.justification || ''}`.trim();
  if (error.justification) return error.justification;
  return 'Une erreur est survenue';
};

// ✅ Fonction qui convertit les virgules en points et nettoie le taux
const sanitizeTaux = (value) => {
  if (value === undefined || value === null || value === '') return '';
  
  let strValue = String(value).trim();
  strValue = strValue.replace(',', '.');
  
  let num = parseFloat(strValue);
  if (isNaN(num)) return '';
  
  if (num > 100 && num <= 10000) {
    console.log(`🔧 Conversion automatique: ${num} -> ${num / 100}`);
    num = num / 100;
  }
  
  if (num > 100) num = 100;
  if (num < 0) num = 0;
  
  return num.toFixed(2);
};

// ✅ Conversion des IDs numériques vers UUID
const convertToValidUUID = (id, type) => {
  if (!id) return null;
  if (typeof id === 'string' && id.includes('-') && id.length === 36) return id;
  
  const deviseMap = {
    '1': '2e5024e4-db70-4098-af06-c1fda1b4f9a7',  // CDF
    '2': '9caed707-6ab3-4697-87ff-439e21375f44',  // USD
    '3': 'ed5700d2-6ac5-4606-aae0-4b4db95a53d6'   // EUR
  };
  
  const categorieMap = {
    '1': '2a7a8de9-0cf4-4852-acf6-5923315923cf',  // LOG
    '2': 'ae54a678-e547-4f55-9c19-385937a740ce',  // VEH
    '3': '3cd11295-995e-4a4a-ae7e-349029cf5955',  // MAT
    '4': 'ab03fe01-c801-4f11-b534-4e792136b904',  // ICT02
    '5': 'c56b32a8-68e7-455d-b1d3-306f5f71dfc7',  // BAT
    '6': 'b38aaed5-b6b5-4367-ba2c-0a8ecd98ec77',  // SEC
    '7': 'c8bbc0fd-02b8-4cfd-b032-05ed1a2dc22c'   // ICT05
  };
  
  if (type === 'devise') return deviseMap[String(id)] || id;
  if (type === 'categorie') return categorieMap[String(id)] || id;
  return id;
};

// ✅ Fonction pour arrondir les valeurs à 2 décimales
const roundToTwo = (value) => {
  if (isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

const ActifForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEditMode = !!id;
  const { can } = usePermissions();

  const canAccessForm = can(['admin', 'comptable']);
  const canModify = can(['admin', 'comptable']);

  // États IA
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiConversation, setAiConversation] = useState([]);
  const [aiUserInput, setAiUserInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState(null);
  const [showAIDraftPreview, setShowAIDraftPreview] = useState(false);
  const [isApplyingDraft, setIsApplyingDraft] = useState(false);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const defaultDevises = [
    { id: 1, code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_actuel: 1.0 },
    { id: 2, code: 'USD', nom: 'Dollar Américain', symbole: '$', taux_actuel: 2850.0 },
    { id: 3, code: 'EUR', nom: 'Euro', symbole: '€', taux_actuel: 3080.0 }
  ];

  const [devises, setDevises] = useState(defaultDevises);
  const [loadingDevises, setLoadingDevises] = useState(false);
  const [devisesError, setDevisesError] = useState(null);
  
  const [montantCDF, setMontantCDF] = useState(null);
  const [tauxChangeActuel, setTauxChangeActuel] = useState(null);
  const [loadingTaux, setLoadingTaux] = useState(false);
  const [conversionInfo, setConversionInfo] = useState(null);
  const [conversionDate, setConversionDate] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    type: 'logiciel',
    type_immobilisation: 'incorporel',
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
    date_validite: '',
    nombre_utilisateurs: '',
    support: '',
    categorie_id: '',
    devise_id: '1',
    montant_devise: '',
    devise_code: 'CDF',
    taux_change: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getTypeImmobilisationFromType = (type) => {
    const corporels = ['materiel', 'vehicule', 'bâtiment', 'terrain'];
    const incorporels = ['logiciel', 'brevet', 'licence', 'fonds_commercial'];
    if (corporels.includes(type)) return 'corporel';
    if (incorporels.includes(type)) return 'incorporel';
    return '';
  };

  const getCompteComptableByType = (type) => {
    const comptes = {
      'logiciel': '205', 'brevet': '2051', 'licence': '2052',
      'fonds_commercial': '207', 'materiel': '2183', 'vehicule': '2182',
      'bâtiment': '213', 'terrain': '211', 'autres': '205'
    };
    return comptes[type] || '205';
  };

  const getCategorieInfo = (categorieId) => {
    const categorie = categories.find(c => c.id === categorieId);
    if (!categorie) return null;
    const tauxCalcule = 100 / parseFloat(categorie.duree_vie_ans);
    return {
      duree_vie_ans: parseFloat(categorie.duree_vie_ans),
      taux_amortissement: roundToTwo(tauxCalcule),
      mode_amortissement: categorie.mode_amortissement_defaut || 'lineaire',
      compte_comptable: categorie.compte_comptable_defaut || getCompteComptableByType(formData.type)
    };
  };

  const handleTypeChange = (type) => {
    const typeImmobilisation = getTypeImmobilisationFromType(type);
    const compteSuggere = getCompteComptableByType(type);
    setFormData(prev => ({
      ...prev,
      type: type,
      type_immobilisation: typeImmobilisation,
      compte_comptable: compteSuggere
    }));
  };

  const handleCategorieChange = async (categorieId) => {
    setFormData(prev => ({ ...prev, categorie_id: categorieId }));
    if (categorieId) {
      const categorieInfo = getCategorieInfo(categorieId);
      if (categorieInfo) {
        setFormData(prev => ({
          ...prev,
          duree_utile_ans: categorieInfo.duree_vie_ans.toString(),
          taux_amortissement: sanitizeTaux(categorieInfo.taux_amortissement),
          mode_amortissement: categorieInfo.mode_amortissement,
          compte_comptable: categorieInfo.compte_comptable || prev.compte_comptable
        }));
      }
    }
  };

  const openAIAssistant = () => {
    setIsAIAssistantOpen(true);
    if (aiConversation.length === 0) {
      setAiConversation([{
        role: 'assistant',
        content: `👋 Bonjour ! Je suis votre **assistant comptable IA**. Décrivez-moi l'actif que vous souhaitez créer.`
      }]);
    }
  };

  const sendToAI = async () => {
    if (!aiUserInput.trim()) return;
    const userMessage = { role: 'user', content: aiUserInput };
    const updatedConversation = [...aiConversation, userMessage];
    setAiConversation(updatedConversation);
    setAiUserInput('');
    setAiLoading(true);
    try {
      const response = await api.post('/actifs/ia/generate', {
        conversation: updatedConversation,
        context: {
          existingCodes: [],
          availableCategories: categories.map(c => c.code_categorie),
          availableDevises: devises.map(d => d.code)
        }
      });
      const aiResponse = response.data;
      setAiConversation(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.message || "J'ai généré un brouillon d'actif."
      }]);
      if (aiResponse.draft) {
        if (aiResponse.draft.taux_amortissement) {
          aiResponse.draft.taux_amortissement = sanitizeTaux(aiResponse.draft.taux_amortissement);
        }
        setAiGeneratedDraft(aiResponse.draft);
        setShowAIDraftPreview(true);
      }
    } catch (error) {
      console.error('❌ Erreur IA:', error);
      setAiConversation(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur: ${getErrorMessage(error)}`
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const resetAIConversation = () => {
    setAiConversation([]);
    setAiGeneratedDraft(null);
    setShowAIDraftPreview(false);
    openAIAssistant();
  };

  const applyAIDraftToForm = async () => {
    if (!aiGeneratedDraft) return;
    setIsApplyingDraft(true);
    try {
      const draftData = aiGeneratedDraft;
      const cleanTaux = sanitizeTaux(draftData.taux_amortissement);
      setFormData(prev => ({
        ...prev,
        code: draftData.code || prev.code,
        nom: draftData.nom || prev.nom,
        numero_inventaire: draftData.numero_inventaire || prev.numero_inventaire,
        type: draftData.type || prev.type,
        date_acquisition: draftData.date_acquisition || prev.date_acquisition,
        devise_code: draftData.devise_code || prev.devise_code,
        montant_devise: draftData.montant_devise ? parseFloat(draftData.montant_devise).toString() : prev.montant_devise,
        cout_acquisition: draftData.cout_acquisition ? parseFloat(draftData.cout_acquisition).toString() : prev.cout_acquisition,
        valeur_residuelle: draftData.valeur_residuelle ? parseFloat(draftData.valeur_residuelle).toString() : prev.valeur_residuelle,
        duree_utile_ans: draftData.duree_utile_ans ? parseInt(draftData.duree_utile_ans).toString() : prev.duree_utile_ans,
        mode_amortissement: draftData.mode_amortissement || prev.mode_amortissement,
        taux_amortissement: cleanTaux !== '' ? cleanTaux : prev.taux_amortissement,
        fournisseur: draftData.fournisseur || prev.fournisseur,
        numero_facture: draftData.numero_facture || prev.numero_facture,
        marque: draftData.marque || prev.marque,
        modele: draftData.modele || prev.modele,
        numero_serie: draftData.numero_serie || prev.numero_serie,
        etat: draftData.etat || prev.etat,
        date_validite: draftData.date_validite || prev.date_validite,
        nombre_utilisateurs: draftData.nombre_utilisateurs || prev.nombre_utilisateurs,
        support: draftData.support || prev.support,
        localisation: draftData.localisation || prev.localisation,
        affectation: draftData.affectation || prev.affectation,
        compte_comptable: draftData.compte_comptable || prev.compte_comptable,
        categorie_id: convertToValidUUID(draftData.categorie_id, 'categorie') || prev.categorie_id,
        description: draftData.description || prev.description
      }));
      setSuccess(`✅ Brouillon IA appliqué ! Vérifiez et créez l'actif.`);
      setTimeout(() => {
        setIsAIAssistantOpen(false);
        setShowAIDraftPreview(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Erreur application brouillon:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsApplyingDraft(false);
    }
  };

  const calculerMontantCDF = async (deviseId, montant, dateAcquisition) => {
    if (!deviseId || !montant || parseFloat(montant) <= 0) {
      setMontantCDF(null);
      setTauxChangeActuel(null);
      setConversionInfo(null);
      setConversionDate(null);
      return;
    }

    try {
      setLoadingTaux(true);
      
      const devise = devises.find(d => d.id === parseInt(deviseId) || d.id === deviseId);
      if (!devise) {
        console.error('Devise non trouvée:', deviseId);
        return;
      }

      if (devise.code === 'CDF') {
        setMontantCDF(roundToTwo(parseFloat(montant)));
        setTauxChangeActuel(1.0);
        setConversionInfo(null);
        setConversionDate(null);
        return;
      }

      const datePourConversion = dateAcquisition || formData.date_acquisition;
      
      try {
        const res = await api.get('/actifs/preview-conversion', {
          params: {
            montant: parseFloat(montant),
            devise: devise.code,
            date: datePourConversion
          }
        });
        
        setMontantCDF(roundToTwo(parseFloat(res.data.montant_cdf)));
        setTauxChangeActuel(roundToTwo(parseFloat(res.data.taux_utilise)));
        setConversionInfo({
          ...res.data,
          source: res.data.source,
          annee: res.data.annee
        });
        setConversionDate(datePourConversion);
        setFormData(prev => ({
          ...prev,
          devise_code: devise.code,
          taux_change: res.data.taux_utilise.toString()
        }));
        
      } catch (apiError) {
        console.error('Erreur API conversion:', apiError);
        const dateObj = new Date(datePourConversion);
        const annee = dateObj.getFullYear();
        
        let tauxFallback = 2850.0;
        if (annee === 2025) {
          tauxFallback = 2850.0;
        } else if (annee >= 2026) {
          tauxFallback = 2257.74;
        }
        
        const montantCalcule = roundToTwo(parseFloat(montant) * tauxFallback);
        setMontantCDF(montantCalcule);
        setTauxChangeActuel(tauxFallback);
        setConversionInfo({
          montant_original: parseFloat(montant),
          devise_originale: devise.code,
          montant_cdf: montantCalcule,
          taux_utilise: tauxFallback,
          date_taux: datePourConversion,
          source: 'fallback',
          annee: annee
        });
        setConversionDate(datePourConversion);
      }
    } catch (err) {
      console.error('Erreur calcul conversion:', err);
      setMontantCDF(null);
      setConversionInfo(null);
    } finally {
      setLoadingTaux(false);
    }
  };

  const handleDeviseChange = (deviseId) => {
    if (!canModify) return;
    
    const selectedDevise = devises.find(d => d.id === parseInt(deviseId) || d.id === deviseId);
    if (!selectedDevise) return;
    
    setFormData(prev => ({ 
      ...prev, 
      devise_id: deviseId,
      devise_code: selectedDevise.code
    }));
    
    const montantValue = formData.montant_devise;
    if (montantValue && parseFloat(montantValue) > 0) {
      const datePourConversion = isEditMode ? formData.date_acquisition : new Date().toISOString().split('T')[0];
      calculerMontantCDF(deviseId, montantValue, datePourConversion);
    } else {
      setMontantCDF(null);
      setConversionInfo(null);
    }
  };

  const handleMontantDeviseChange = (montant) => {
    if (!canModify) return;
    setFormData(prev => ({ ...prev, montant_devise: montant }));
    
    if (formData.devise_id && montant && parseFloat(montant) > 0) {
      const datePourConversion = isEditMode ? formData.date_acquisition : new Date().toISOString().split('T')[0];
      calculerMontantCDF(formData.devise_id, montant, datePourConversion);
    } else {
      setMontantCDF(null);
      setConversionInfo(null);
    }
  };

  const handleDateChange = (date) => {
    if (!canModify) return;
    
    const formattedDate = date;
    setFormData(prev => ({ ...prev, date_acquisition: formattedDate }));
    
    if (formData.devise_id && formData.montant_devise && parseFloat(formData.montant_devise) > 0) {
      calculerMontantCDF(formData.devise_id, formData.montant_devise, formattedDate);
    }
  };

  useEffect(() => {
    const chargerCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get('/categories-amortissement');
        if (res.data && Array.isArray(res.data)) {
          setCategories(res.data);
          console.log('📋 Catégories chargées:', res.data);
        }
      } catch (err) {
        console.error('Erreur chargement catégories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    const chargerDevises = async () => {
      try {
        setLoadingDevises(true);
        setDevisesError(null);
        const res = await api.get('/devises');
        
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDevises(res.data);
          if (!formData.devise_id) {
            const cdfDevise = res.data.find(d => d.code === 'CDF');
            if (cdfDevise) {
              setFormData(prev => ({ 
                ...prev, 
                devise_id: cdfDevise.id, 
                devise_code: 'CDF' 
              }));
            }
          }
        } else {
          setDevises(defaultDevises);
          setDevisesError('Utilisation des devises par défaut');
        }
      } catch (err) {
        console.error('Erreur chargement devises:', err);
        setDevises(defaultDevises);
        setDevisesError('Impossible de charger les devises. Utilisation des valeurs par défaut.');
      } finally {
        setLoadingDevises(false);
      }
    };

    chargerCategories();
    chargerDevises();
  }, []);

  useEffect(() => {
    const chargerActif = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const actif = await actifService.getById(id);
        
        const cleanTaux = sanitizeTaux(actif.taux_amortissement);
        
        setFormData({
          code: actif.code || '',
          nom: actif.nom || '',
          type: actif.type || 'logiciel',
          type_immobilisation: actif.type_immobilisation || getTypeImmobilisationFromType(actif.type || 'logiciel'),
          date_acquisition: actif.date_acquisition?.split('T')[0] || new Date().toISOString().split('T')[0],
          cout_acquisition: actif.cout_acquisition ? roundToTwo(parseFloat(actif.cout_acquisition)).toString() : '',
          valeur_residuelle: actif.valeur_residuelle ? roundToTwo(parseFloat(actif.valeur_residuelle)).toString() : '0',
          duree_utile_ans: actif.duree_utile_ans ? parseInt(actif.duree_utile_ans).toString() : '5',
          mode_amortissement: actif.mode_amortissement || 'lineaire',
          taux_amortissement: cleanTaux !== '' ? cleanTaux : '',
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
          date_validite: actif.date_validite || '',
          nombre_utilisateurs: actif.nombre_utilisateurs ? parseInt(actif.nombre_utilisateurs).toString() : '',
          support: actif.support || '',
          categorie_id: actif.categorie_id || '',
          devise_id: actif.devise_id || '1',
          montant_devise: actif.montant_devise ? roundToTwo(parseFloat(actif.montant_devise)).toString() : '',
          devise_code: actif.devise?.code || 'CDF',
          taux_change: actif.taux_change_utilisation ? roundToTwo(parseFloat(actif.taux_change_utilisation)).toString() : ''
        });
        
        if (actif.devise_id && actif.montant_devise) {
          await calculerMontantCDF(actif.devise_id, actif.montant_devise, actif.date_acquisition);
        }
      } catch (err) {
        console.error('Erreur chargement actif:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    
    chargerActif();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    if (!canModify) return;
    const { name, value } = e.target;
    
    if (name === 'type') {
      handleTypeChange(value);
      return;
    }
    if (name === 'categorie_id') {
      handleCategorieChange(value);
      return;
    }
    
    if (name === 'taux_amortissement') {
      const sanitized = sanitizeTaux(value);
      setFormData(prev => ({ ...prev, taux_amortissement: sanitized }));
      return;
    }
    
    if (name === 'cout_acquisition' || name === 'montant_devise' || name === 'valeur_residuelle') {
      if (value === '' || value === null) {
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData(prev => ({ ...prev, [name]: roundToTwo(numValue).toString() }));
        } else {
          setFormData(prev => ({ ...prev, [name]: value }));
        }
      }
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'duree_utile_ans' && formData.mode_amortissement === 'lineaire' && !formData.categorie_id) {
      const duree = parseFloat(value);
      if (duree > 0 && !isNaN(duree)) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: sanitizeTaux(taux) }));
      }
    }
    
    if (name === 'mode_amortissement' && value === 'lineaire' && !formData.categorie_id) {
      const duree = parseFloat(formData.duree_utile_ans);
      if (duree > 0 && !isNaN(duree)) {
        const taux = (100 / duree).toFixed(2);
        setFormData(prev => ({ ...prev, taux_amortissement: sanitizeTaux(taux) }));
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
    if (isNaN(date.getTime())) return null;
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
      
      if (!formData.devise_id) {
        throw new Error('Veuillez sélectionner une devise');
      }
      
      if (!formData.montant_devise || parseFloat(formData.montant_devise) <= 0) {
        throw new Error('Veuillez saisir un montant valide');
      }
      
      let finalDeviseId = convertToValidUUID(formData.devise_id, 'devise');
      if (!finalDeviseId) finalDeviseId = formData.devise_id;
      
      const devise = devises.find(d => d.id === parseInt(finalDeviseId) || d.id === finalDeviseId);
      
      let coutAcquisitionCDF = null;
      
      if (devise?.code === 'CDF') {
        coutAcquisitionCDF = roundToTwo(parseFloat(formData.montant_devise));
      } else if (montantCDF && montantCDF > 0) {
        coutAcquisitionCDF = roundToTwo(montantCDF);
      } else {
        const taux = devise?.taux_actuel || 2850;
        coutAcquisitionCDF = roundToTwo(parseFloat(formData.montant_devise) * parseFloat(taux));
      }
      
      if (!coutAcquisitionCDF || isNaN(coutAcquisitionCDF) || coutAcquisitionCDF <= 0) {
        throw new Error('Le coût d\'acquisition doit être positif');
      }
      
      let finalCategorieId = convertToValidUUID(formData.categorie_id, 'categorie');
      if (!finalCategorieId) finalCategorieId = formData.categorie_id;
      
      console.log('🔍 devise_id final:', finalDeviseId);
      console.log('🔍 categorie_id final:', finalCategorieId);
      
      const dataToSend = {
        code: formData.code.trim(),
        nom: formData.nom.trim(),
        type: formData.type,
        date_acquisition: validateAndFormatDate(formData.date_acquisition),
        cout_acquisition: roundToTwo(coutAcquisitionCDF),
        valeur_residuelle: roundToTwo(parseFloat(formData.valeur_residuelle) || 0),
        duree_utile_ans: parseFloat(formData.duree_utile_ans) || 5,
        mode_amortissement: formData.mode_amortissement,
        devise_id: finalDeviseId,
        montant_devise: roundToTwo(parseFloat(formData.montant_devise)),
        devise_code: devise?.code || 'CDF',
        taux_change_utilisation: roundToTwo(tauxChangeActuel) || (devise?.code === 'USD' ? 2850 : 1),
        type_immobilisation: formData.type_immobilisation || 
          (['materiel', 'vehicule', 'bâtiment', 'terrain'].includes(formData.type) ? 'corporel' : 'incorporel'),
        etat: formData.etat || 'bon',
        compte_comptable: formData.compte_comptable || 
          (formData.type === 'vehicule' ? '2182' : formData.type === 'materiel' ? '2183' : '205')
      };
      
      // Ajout des champs optionnels
      if (formData.numero_facture && formData.numero_facture.trim() !== '') {
        dataToSend.numero_facture = formData.numero_facture.trim();
      }
      if (formData.fournisseur && formData.fournisseur.trim() !== '') {
        dataToSend.fournisseur = formData.fournisseur.trim();
      }
      if (formData.localisation && formData.localisation.trim() !== '') {
        dataToSend.localisation = formData.localisation.trim();
      }
      if (formData.affectation && formData.affectation.trim() !== '') {
        dataToSend.affectation = formData.affectation.trim();
      }
      if (formData.description && formData.description.trim() !== '') {
        dataToSend.description = formData.description.trim();
      }
      if (formData.numero_inventaire && formData.numero_inventaire.trim() !== '') {
        dataToSend.numero_inventaire = formData.numero_inventaire.trim();
      }
      if (formData.marque && formData.marque.trim() !== '') {
        dataToSend.marque = formData.marque.trim();
      }
      if (formData.modele && formData.modele.trim() !== '') {
        dataToSend.modele = formData.modele.trim();
      }
      if (formData.numero_serie && formData.numero_serie.trim() !== '') {
        dataToSend.numero_serie = formData.numero_serie.trim();
      }
      
      if (finalCategorieId && finalCategorieId !== '') {
        dataToSend.categorie_id = finalCategorieId;
      }
      
      let tauxFinal = null;
      if (formData.taux_amortissement && formData.taux_amortissement !== '') {
        let tauxStr = String(formData.taux_amortissement).replace(',', '.');
        let tauxParsed = parseFloat(tauxStr);
        
        if (tauxParsed > 100 && tauxParsed <= 10000) {
          tauxParsed = tauxParsed / 100;
        }
        
        if (!isNaN(tauxParsed) && tauxParsed >= 0 && tauxParsed <= 100) {
          tauxFinal = roundToTwo(tauxParsed);
        }
      }
      
      if (tauxFinal !== null && tauxFinal !== 3333) {
        dataToSend.taux_amortissement = tauxFinal;
        console.log(`✅ Taux envoyé: ${tauxFinal}%`);
      }
      
      if (formData.date_validite && formData.date_validite !== '') {
        const validDate = validateAndFormatDate(formData.date_validite);
        if (validDate) {
          dataToSend.date_validite = validDate;
        }
      }
      
      if (formData.nombre_utilisateurs && formData.nombre_utilisateurs !== '') {
        const nb = parseFloat(formData.nombre_utilisateurs);
        if (!isNaN(nb) && nb > 0) {
          dataToSend.nombre_utilisateurs = nb;
        }
      }
      
      if (formData.support && formData.support.trim() !== '') {
        dataToSend.support = formData.support.trim();
      }
      
      console.log('📤 Données finales envoyées:', JSON.stringify(dataToSend, null, 2));
      
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
      console.error('Erreur:', err);
      setError(err.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { value: 'logiciel', label: '📄 Logiciel', typeImmobilisation: 'incorporel' },
    { value: 'brevet', label: '📜 Brevet', typeImmobilisation: 'incorporel' },
    { value: 'licence', label: '📋 Licence', typeImmobilisation: 'incorporel' },
    { value: 'fonds_commercial', label: '🏢 Fonds commercial', typeImmobilisation: 'incorporel' },
    { value: 'materiel', label: '🖥️ Matériel', typeImmobilisation: 'corporel' },
    { value: 'vehicule', label: '🚗 Véhicule', typeImmobilisation: 'corporel' },
    { value: 'bâtiment', label: '🏠 Bâtiment', typeImmobilisation: 'corporel' },
    { value: 'terrain', label: '🌳 Terrain', typeImmobilisation: 'corporel' },
    { value: 'autres', label: '📦 Autres', typeImmobilisation: '' }
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

  const getTypeImmobilisationLabel = (value) => {
    if (value === 'corporel') return '🏭 Corporel';
    if (value === 'incorporel') return '📄 Incorporel';
    return '⚙️ À déterminer';
  };

  const isCategorieSelected = !!formData.categorie_id;
  
  // ✅ CORRECTION: Utiliser formData.devise_code pour l'affichage du placeholder
  const currentDeviseCode = formData.devise_code || 'CDF';
  const currentDeviseSymbole = devises.find(d => d.code === currentDeviseCode)?.symbole || 'FC';
  const isCDFSelected = currentDeviseCode === 'CDF';

  const animationStyles = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
    .form-fade-in { animation: fadeIn 0.3s ease-out; }
    .form-slide-in { animation: slideIn 0.3s ease-out; }
    .ai-assistant-container { position: fixed; bottom: 20px; right: 20px; z-index: 1050; }
    .ai-assistant-card { width: 420px; max-width: calc(100vw - 40px); height: 600px; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .ai-conversation-area { flex: 1; overflow-y: auto; padding: 1rem; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%); }
    .message-user { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; border-radius: 18px 18px 4px 18px; }
    .message-assistant { background: #2d2d3a; color: #e2e8f0; border-radius: 18px 18px 18px 4px; }
    .ai-draft-preview { background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 4px solid #10b981; }
    .disabled-field { background-color: #e9ecef !important; opacity: 0.8; }
    .text-white-custom { color: #ffffff !important; }
    .bg-dark-card { background: #1a1a2e; border-color: #2d2d3a; }
  `;

  if (!canAccessForm && !isEditMode) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="container py-5" style={{ maxWidth: '1200px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 fw-bold text-primary">Accès refusé</h1>
            <button onClick={handleGoBack} className="btn btn-secondary d-flex align-items-center gap-2">← Retour</button>
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

      {/* Assistant IA Flottant */}
      <div className="ai-assistant-container">
        {!isAIAssistantOpen && (
          <button
            onClick={openAIAssistant}
            className="btn rounded-circle d-flex align-items-center justify-content-center shadow-lg"
            style={{
              width: '60px', height: '60px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            <GiArtificialIntelligence size={30} style={{ color: 'white' }} />
          </button>
        )}

        {isAIAssistantOpen && (
          <div className="card ai-assistant-card border-0 shadow-xl">
            <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderBottom: 'none' }}>
              <div className="d-flex align-items-center gap-2">
                <GiArtificialIntelligence size={20} style={{ color: 'white' }} />
                <strong style={{ color: 'white' }}>Assistant IA - Création d'actifs</strong>
                <span className="badge bg-light text-dark ms-2" style={{ fontSize: '10px' }}>Expert comptable</span>
              </div>
              <div className="d-flex gap-2">
                <button onClick={resetAIConversation} className="btn btn-sm text-white p-0" title="Nouvelle conversation"><FiRotateCcw size={16} /></button>
                <button onClick={() => setIsAIAssistantOpen(false)} className="btn btn-sm text-white p-0"><FiX size={18} /></button>
              </div>
            </div>

            <div className="ai-conversation-area">
              {aiConversation.map((msg, idx) => (
                <div key={idx} className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-3 ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`} style={{ maxWidth: '85%', fontSize: '0.9rem' }}>
                    <small className="opacity-75 mb-1 d-block" style={{ fontSize: '0.7rem' }}>
                      {msg.role === 'user' ? '👤 Vous' : '🤖 Assistant IA'}
                    </small>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="d-flex justify-content-start mb-3">
                  <div className="message-assistant p-3" style={{ maxWidth: '85%' }}>
                    <div className="d-flex align-items-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" style={{ color: '#a78bfa' }}><span className="visually-hidden">Loading...</span></div>
                      <span>IA analyse votre demande...</span>
                    </div>
                  </div>
                </div>
              )}
              {showAIDraftPreview && aiGeneratedDraft && (
                <div className="ai-draft-preview rounded-3 p-3 mt-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <strong className="text-success">📄 Brouillon généré par IA</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                    <div><strong>Code:</strong> {aiGeneratedDraft.code || 'À définir'}</div>
                    <div><strong>Nom:</strong> {aiGeneratedDraft.nom || 'À définir'}</div>
                    <div><strong>Montant:</strong> {aiGeneratedDraft.montant_devise?.toLocaleString()} {aiGeneratedDraft.devise_code || 'CDF'}</div>
                    <div><strong>Durée:</strong> {aiGeneratedDraft.duree_utile_ans} ans</div>
                    <div><strong>Taux:</strong> {aiGeneratedDraft.taux_amortissement || 'auto'}%</div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button onClick={applyAIDraftToForm} disabled={isApplyingDraft} className="btn btn-success btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                      {isApplyingDraft ? <><span className="spinner-border spinner-border-sm"></span> Application...</> : <><FiCheck size={14} /> Appliquer</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer bg-light border-top border-secondary p-3">
              <div className="d-flex gap-2">
                <input type="text" className="form-control form-control-sm" placeholder="Décrivez l'actif à créer..." value={aiUserInput} onChange={(e) => setAiUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendToAI()} disabled={aiLoading} />
                <button onClick={sendToAI} disabled={aiLoading || !aiUserInput.trim()} className="btn btn-primary btn-sm d-flex align-items-center gap-2">
                  {aiLoading ? <span className="spinner-border spinner-border-sm"></span> : <FiSend size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="container py-4 px-3 px-md-4 form-fade-in" style={{ maxWidth: '1400px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <h1 className="h2 fw-bold text-primary mb-0">{isEditMode ? 'Modifier l\'actif' : 'Nouvel actif'}</h1>
          <div className="d-flex gap-2">
            {!isEditMode && !isAIAssistantOpen && (
              <button onClick={openAIAssistant} className="btn btn-outline-primary d-flex align-items-center gap-2">
                <GiArtificialIntelligence size={18} /> Créer avec l'IA
              </button>
            )}
            <button onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">← Retour</button>
          </div>
        </div>

        {devisesError && (
          <div className="alert alert-warning alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2"><FiAlertCircle size={18} /><span>{devisesError}</span></div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={18} />
              <span>{typeof error === 'string' ? error : String(error)}</span>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
            <div className="d-flex align-items-center gap-2"><FiCheckCircle size={18} /><span>{success}</span></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-3 overflow-hidden">
          <div className="card-body p-4">
            {/* Section 1: Informations générales */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Code / N° inventaire <span className="text-danger">*</span></label>
                  <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-control" required disabled={!canModify} placeholder="ACT-001" />
                  <small className="text-muted">Identifiant unique de l'actif</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nom <span className="text-danger">*</span></label>
                  <input type="text" name="nom" value={formData.nom} onChange={handleChange} className="form-control" required disabled={!canModify} />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Type d'actif <span className="text-danger">*</span></label>
                  <select name="type" value={formData.type} onChange={handleChange} className="form-select" disabled={!canModify}>
                    {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <small className="text-muted">Type d'immobilisation: <strong>{getTypeImmobilisationLabel(formData.type_immobilisation)}</strong></small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Numéro d'inventaire (optionnel)</label>
                  <input type="text" name="numero_inventaire" value={formData.numero_inventaire} onChange={handleChange} className="form-control" disabled={!canModify} />
                  <small className="text-muted">Si différent du code</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label fw-semibold"><FiCalendar size={14} className="me-1" /> Date acquisition <span className="text-danger">*</span></label>
                  <input type="date" name="date_acquisition" value={formData.date_acquisition || ''} onChange={(e) => handleDateChange(e.target.value)} className="form-control" required disabled={!canModify} />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold"><FiDollarSign size={14} className="me-1" /> Devise d'acquisition <span className="text-danger">*</span></label>
                  <select 
                    name="devise_id" 
                    value={formData.devise_id || ''} 
                    onChange={(e) => handleDeviseChange(e.target.value)} 
                    className="form-select" 
                    disabled={loadingDevises || !canModify}
                    required
                  >
                    {devises.map(dev => (
                      <option key={dev.id} value={dev.id}>
                        {dev.code} - {dev.nom} ({dev.symbole})
                      </option>
                    ))}
                  </select>
                  {loadingDevises && <small className="text-muted d-block mt-1">Chargement des devises...</small>}
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Montant d'acquisition <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">{currentDeviseSymbole}</span>
                    <input 
                      type="number" 
                      name="montant_devise" 
                      value={formData.montant_devise} 
                      onChange={(e) => handleMontantDeviseChange(e.target.value)} 
                      className="form-control" 
                      step="0.01" 
                      min="0" 
                      placeholder={`Montant en ${currentDeviseCode}`}
                      disabled={!canModify} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold"><FiFileText size={14} className="me-1" /> Numéro de facture</label>
                  <input type="text" name="numero_facture" value={formData.numero_facture} onChange={handleChange} className="form-control" placeholder="FAC-2025-001" disabled={!canModify} />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold"><FiUser size={14} className="me-1" /> Fournisseur</label>
                  <input type="text" name="fournisseur" value={formData.fournisseur} onChange={handleChange} className="form-control" disabled={!canModify} />
                </div>
              </div>
            </div>

            {/* Section Valeur d'acquisition en CDF */}
            {!isCDFSelected && montantCDF !== null && (
              <div className="alert alert-info mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <strong>💱 Équivalent en Francs Congolais :</strong>
                    <span className="ms-2 fs-5 fw-bold">{montantCDF.toLocaleString()} FC</span>
                  </div>
                  <div>
                    <small>Taux: 1 {currentDeviseCode} = {tauxChangeActuel?.toLocaleString()} CDF</small>
                  </div>
                  {conversionDate && (
                    <div>
                      <small>Date taux: {new Date(conversionDate).toLocaleDateString('fr-FR')}</small>
                    </div>
                  )}
                  {conversionInfo?.source === 'fixed_2025' && (
                    <div className="mt-1">
                      <small className="text-info">📌 Taux fixe 2025 (1 USD = 2850 CDF)</small>
                    </div>
                  )}
                  {conversionInfo?.source === 'realtime' && (
                    <div className="mt-1">
                      <small className="text-success">🌐 Taux API temps réel (2026)</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Catégorie d'amortissement */}
            <div className="card bg-light mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiTag size={16} /> Catégorie d'amortissement (GCEC)
                  {isCategorieSelected && <span className="badge bg-success ms-2">✓ Catégorie sélectionnée</span>}
                </h3>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">Catégorie</label>
                    <select name="categorie_id" value={formData.categorie_id} onChange={handleChange} className="form-select" disabled={loadingCategories || !canModify}>
                      <option value="">-- Sélectionner une catégorie --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.code_categorie} - {cat.nom_categorie} ({cat.duree_vie_ans} ans)
                        </option>
                      ))}
                    </select>
                    <small className="text-muted d-block mt-1">La catégorie définit automatiquement la durée, le taux et le mode d'amortissement</small>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Compte comptable GCEC</label>
                    <input type="text" name="compte_comptable" value={formData.compte_comptable} onChange={handleChange} className={`form-control ${isCategorieSelected ? 'disabled-field' : ''}`} disabled={isCategorieSelected || !canModify} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Amortissement */}
            <div className="card bg-light mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiTrendingUp size={16} /> Amortissement
                  {isCategorieSelected && <span className="badge bg-secondary ms-2">🔒 Verrouillé</span>}
                </h3>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Mode d'amortissement *</label>
                    <select name="mode_amortissement" value={formData.mode_amortissement} onChange={handleChange} className={`form-select ${isCategorieSelected ? 'disabled-field' : ''}`} disabled={isCategorieSelected || !canModify}>
                      {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Durée utile (ans) *</label>
                    <input type="number" name="duree_utile_ans" value={formData.duree_utile_ans} onChange={handleChange} className={`form-control ${isCategorieSelected ? 'disabled-field' : ''}`} min="1" max="50" required disabled={isCategorieSelected || !canModify} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Taux d'amortissement (%)</label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        name="taux_amortissement" 
                        value={formData.taux_amortissement} 
                        onChange={handleChange} 
                        className={`form-control ${isCategorieSelected ? 'disabled-field' : ''}`} 
                        step="1"
                        min="0" 
                        max="100" 
                        placeholder="Auto" 
                        disabled={isCategorieSelected || !canModify} 
                      />
                      <span className="input-group-text">%</span>
                    </div>
                    <small className="text-muted">Laissez vide pour calcul auto (ex: 33,333 pour 3 ans)</small>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Valeur résiduelle (CDF)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">FC</span>
                      <input type="number" name="valeur_residuelle" value={formData.valeur_residuelle} onChange={handleChange} className="form-control" min="0" disabled={!canModify} />
                    </div>
                    <small className="text-muted">Valeur estimée en fin de vie</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Champs spécifiques corporel */}
            {formData.type_immobilisation === 'corporel' && (
              <div className="card bg-light mb-4">
                <div className="card-body">
                  <h3 className="h6 fw-semibold mb-3">🖥️ Informations matérielles</h3>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Marque</label>
                      <input type="text" name="marque" value={formData.marque} onChange={handleChange} className="form-control" disabled={!canModify} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Modèle</label>
                      <input type="text" name="modele" value={formData.modele} onChange={handleChange} className="form-control" disabled={!canModify} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Numéro de série</label>
                      <input type="text" name="numero_serie" value={formData.numero_serie} onChange={handleChange} className="form-control" disabled={!canModify} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">État</label>
                      <select name="etat" value={formData.etat} onChange={handleChange} className="form-select" disabled={!canModify}>
                        {etats.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Champs spécifiques incorporel */}
            {formData.type_immobilisation === 'incorporel' && (
              <div className="card bg-light mb-4">
                <div className="card-body">
                  <h3 className="h6 fw-semibold mb-3">📜 Informations licence / brevet</h3>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Date de validité</label>
                      <input type="date" name="date_validite" value={formData.date_validite || ''} onChange={handleChange} className="form-control" disabled={!canModify} />
                      <small className="text-muted">Date d'expiration</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Nombre d'utilisateurs</label>
                      <input type="number" name="nombre_utilisateurs" value={formData.nombre_utilisateurs} onChange={handleChange} className="form-control" min="1" disabled={!canModify} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Support</label>
                      <input type="text" name="support" value={formData.support} onChange={handleChange} className="form-control" placeholder="CD, téléchargement..." disabled={!canModify} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Informations complémentaires */}
            <div className="card bg-light mb-4">
              <div className="card-body">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2"><FiMapPin size={16} /> Informations complémentaires</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Localisation</label>
                    <input type="text" name="localisation" value={formData.localisation} onChange={handleChange} className="form-control" placeholder="Ex: Siège, étage 3..." disabled={!canModify} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Affectation</label>
                    <input type="text" name="affectation" value={formData.affectation} onChange={handleChange} className="form-control" placeholder="Service ou utilisateur..." disabled={!canModify} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className="form-control" rows="3" placeholder="Informations complémentaires..." disabled={!canModify} />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-3 pt-3 border-top">
              <button type="button" onClick={handleGoBack} className="btn btn-outline-secondary d-flex align-items-center gap-2">
                <FiX size={16} /> Annuler
              </button>
              {canModify && (
                <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm"></span><span>En cours...</span></>
                  ) : (
                    <><FiSave size={16} /> {isEditMode ? 'Modifier' : 'Créer'}</>
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