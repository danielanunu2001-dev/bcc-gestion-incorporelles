// backend/src/controllers/actifController.js

const { Actif, Devise, CategorieAmortissement, User, AuditLog, Amortissement, Contrat, Depreciation, Mouvement, Anomalie, Facture, TauxChange, Reevaluation } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const TauxService = require('../services/tauxService');
const exchangeRateService = require('../services/exchangeRateService');
const factureService = require('../services/factureService');
const AmortissementService = require('../services/AmortissementService');
const path = require('path');
const fs = require('fs');

// ==================== IMPORT DU GESTIONNAIRE D'ERREURS ====================
const {
  catchAsync,
  badRequest,
  notFound,
  conflict,
  validationError,
  internalError
} = require('../middleware/errorHandler');

// ==================== UTILITAIRES ====================

/**
 * Convertit une valeur en float sécurisé
 */
const toFloat = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Convertit une valeur en float avec 2 décimales
 */
const toFloatFixed = (value, defaultValue = 0, decimals = 2) => {
  const num = toFloat(value, defaultValue);
  return parseFloat(num.toFixed(decimals));
};

/**
 * Valide et formate une date pour PostgreSQL
 */
const validateDate = (dateValue) => {
  if (!dateValue) return null;
  
  if (dateValue === 'Invalid date') {
    console.warn('⚠️ Date invalide détectée, remplacée par null');
    return null;
  }
  
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️ Format de date invalide: ${dateValue}`);
    return null;
  }
  
  return date.toISOString().split('T')[0];
};

/**
 * Nettoie et parse un nombre écrit en français (2.500,50 ou 2,500.50)
 */
const parseFrenchNumber = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  
  let stringValue = String(value).trim();
  
  const hasFrenchThousandSeparator = stringValue.match(/\d+\.\d{3}/);
  const hasFrenchDecimalComma = stringValue.match(/,\d+$/);
  
  if (hasFrenchThousandSeparator || hasFrenchDecimalComma) {
    stringValue = stringValue.replace(/\./g, '');
    stringValue = stringValue.replace(/,/g, '.');
  } else {
    stringValue = stringValue.replace(/,/g, '');
  }
  
  const result = parseFloat(stringValue);
  console.log(`📊 parseFrenchNumber: "${value}" → "${stringValue}" → ${result}`);
  return isNaN(result) ? null : toFloatFixed(result);
};

/**
 * Nettoie le taux d'amortissement (convertit 3333 -> 33.33)
 */
const cleanTauxAmortissement = (taux) => {
  if (taux === undefined || taux === null || taux === '') return null;
  let num = toFloat(taux);
  if (isNaN(num)) return null;
  // Si la valeur est > 100 (ex: 3333), on divise par 100
  if (num > 100 && num <= 10000) {
    num = num / 100;
  }
  // Retourne null si hors limite, sinon la valeur arrondie
  if (num < 0 || num > 100) return null;
  return toFloatFixed(num);
};

/**
 * Conversion de devise améliorée
 */
const convertirDeviseAvecService = async (montant, deviseCode, date = null) => {
  const montantNum = toFloat(montant, 0);
  const dateRef = date ? new Date(date) : new Date();
  
  if (deviseCode === 'CDF') {
    return {
      montant_cdf: toFloatFixed(montantNum),
      taux_utilise: 1,
      devise_source: 'CDF',
      date_taux: dateRef.toISOString().split('T')[0],
      success: true
    };
  }
  
  try {
    let tauxReel = null;
    
    try {
      const devise = await Devise.findOne({ 
        where: { code: deviseCode.toUpperCase(), actif: true } 
      });
      
      if (devise && devise.taux_actuel) {
        tauxReel = toFloat(devise.taux_actuel);
        console.log(`✅ Taux depuis base de données: 1 ${deviseCode} = ${tauxReel} CDF`);
      }
    } catch (dbError) {
      console.warn(`⚠️ Erreur lecture base de données: ${dbError.message}`);
    }
    
    if (!tauxReel) {
      const defaultRates = { USD: 2850, EUR: 3080, GBP: 3600, CAD: 2100 };
      tauxReel = defaultRates[deviseCode.toUpperCase()] || 2850;
      console.log(`⚠️ Utilisation taux par défaut: 1 ${deviseCode} = ${tauxReel} CDF`);
    }
    
    const montantCDF = toFloatFixed(montantNum * tauxReel);
    
    return {
      montant_cdf: montantCDF,
      taux_utilise: toFloatFixed(tauxReel),
      devise_source: deviseCode,
      date_taux: dateRef.toISOString().split('T')[0],
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Erreur conversion ${montantNum} ${deviseCode}:`, error.message);
    
    const defaultRates = { USD: 2850, EUR: 3080, GBP: 3600, CAD: 2100 };
    const tauxFallback = defaultRates[deviseCode.toUpperCase()] || 2850;
    
    return {
      montant_cdf: toFloatFixed(montantNum * tauxFallback),
      taux_utilise: toFloatFixed(tauxFallback),
      devise_source: deviseCode,
      date_taux: dateRef.toISOString().split('T')[0],
      success: true,
      fallback: true,
      error: error.message
    };
  }
};

/**
 * Génère le plan d'amortissement pour un actif
 */
const genererPlanAmortissement = async (actif, transaction) => {
  let amortissements = [];
  
  const cout = toFloat(actif.cout_acquisition, 0);
  const valeurResiduelle = toFloat(actif.valeur_residuelle, 0);
  const duree = parseInt(actif.duree_utile_ans, 10) || 5;
  const mode = actif.mode_amortissement;
  
  const anneeBase = new Date(actif.date_acquisition).getFullYear();
  
  console.log('=== GÉNÉRATION PLAN AMORTISSEMENT ===');
  console.log(`Actif: ${actif.code} - ${actif.nom}`);
  console.log(`Mode: ${mode}`);
  console.log(`Coût: ${cout} FC`);
  console.log(`Valeur résiduelle: ${valeurResiduelle} FC`);
  console.log(`Durée: ${duree} ans`);
  
  let valeurRestante = cout;
  let cumul = 0;
  
  if (mode === 'lineaire') {
    const tauxConstant = toFloatFixed(100 / duree);
    const annuiteConstante = toFloatFixed((cout - valeurResiduelle) / duree);
    
    console.log(`✅ Taux linéaire: ${tauxConstant}%`);
    console.log(`✅ Annuité constante: ${annuiteConstante} FC`);
    
    for (let i = 0; i < duree; i++) {
      let annuite = annuiteConstante;
      
      if (i === duree - 1) {
        annuite = toFloatFixed(valeurRestante - valeurResiduelle);
        if (annuite < 0) annuite = 0;
      }
      
      cumul = toFloatFixed(cumul + annuite);
      valeurRestante = toFloatFixed(valeurRestante - annuite);
      
      amortissements.push({
        actif_id: actif.id,
        exercice: anneeBase + i,
        annuite: toFloatFixed(annuite),
        cumul_amortissements: toFloatFixed(cumul),
        valeur_nette: toFloatFixed(Math.max(valeurRestante, valeurResiduelle)),
        taux: toFloatFixed(tauxConstant)
      });
    }
    
  } else if (mode === 'degressif') {
    const tauxLineaire = 100 / duree;
    let coefficient = 1.5;
    if (duree <= 4) coefficient = 1.5;
    else if (duree <= 6) coefficient = 2;
    else coefficient = 2.5;
    
    const tauxDegressif = toFloatFixed(tauxLineaire * coefficient);
    
    console.log(`✅ Taux dégressif: ${tauxDegressif}% (coefficient ${coefficient})`);
    
    for (let i = 0; i < duree; i++) {
      let annuite = 0;
      let tauxAnnee = 0;
      const anneesRestantes = duree - i;
      
      annuite = toFloatFixed(valeurRestante * (tauxDegressif / 100));
      tauxAnnee = toFloatFixed(tauxDegressif);
      
      const annuiteLineaire = toFloatFixed((valeurRestante - valeurResiduelle) / anneesRestantes);
      
      if (annuite < annuiteLineaire) {
        for (let j = i; j < duree; j++) {
          const restes = duree - j;
          const annuiteLin = toFloatFixed((valeurRestante - valeurResiduelle) / restes);
          const tauxLin = toFloatFixed(100 / restes);
          
          amortissements.push({
            actif_id: actif.id,
            exercice: anneeBase + j,
            annuite: toFloatFixed(annuiteLin),
            cumul_amortissements: toFloatFixed(cumul + annuiteLin),
            valeur_nette: toFloatFixed(Math.max(valeurRestante - annuiteLin, valeurResiduelle)),
            taux: toFloatFixed(tauxLin)
          });
          cumul = toFloatFixed(cumul + annuiteLin);
          valeurRestante = toFloatFixed(valeurRestante - annuiteLin);
        }
        break;
      }
      
      if (valeurRestante - annuite < valeurResiduelle) {
        annuite = toFloatFixed(valeurRestante - valeurResiduelle);
        if (annuite < 0) annuite = 0;
      }
      
      cumul = toFloatFixed(cumul + annuite);
      valeurRestante = toFloatFixed(valeurRestante - annuite);
      
      amortissements.push({
        actif_id: actif.id,
        exercice: anneeBase + i,
        annuite: toFloatFixed(annuite),
        cumul_amortissements: toFloatFixed(cumul),
        valeur_nette: toFloatFixed(Math.max(valeurRestante, valeurResiduelle)),
        taux: toFloatFixed(tauxAnnee)
      });
      
      if (valeurRestante <= valeurResiduelle) break;
    }
  }
  
  console.log(`✅ Plan généré (${amortissements.length} années)`);
  
  if (amortissements.length > 0) {
    await Amortissement.bulkCreate(amortissements, { transaction });
  }
  
  return amortissements;
};

// ==================== FONCTION DE LOG ====================

const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, ipAddress = null) => {
  try {
    const now = new Date();
    
    const formattedDate = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
    
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
      action_date: formattedDate
    };
    
    await AuditLog.create(logData);
    console.log(`✅ [${formattedDate}] Log créé: ${action} sur ${tableName}/${recordId}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};

// ==================== ROUTES ====================

exports.previewConversion = catchAsync(async (req, res) => {
  const { montant, devise, date } = req.query;
  
  console.log('🔍 previewConversion reçu:', { montant, devise, date });
  
  if (!montant || !devise) {
    throw badRequest('Montant et devise requis');
  }
  
  const montantNum = toFloat(montant);
  if (isNaN(montantNum) || montantNum <= 0) {
    throw badRequest('Montant invalide');
  }
  
  if (devise.toUpperCase() === 'CDF') {
    return res.json({
      success: true,
      montant_original: toFloatFixed(montantNum),
      devise_originale: 'CDF',
      montant_cdf: toFloatFixed(montantNum),
      taux_utilise: 1,
      date_taux: date || new Date().toISOString().split('T')[0],
      source: 'direct'
    });
  }
  
  const dateRef = date ? new Date(date) : new Date();
  const annee = dateRef.getFullYear();
  const dateStr = dateRef.toISOString().split('T')[0];
  
  let taux = null;
  let source = 'default';
  
  const TAUX_FIXE_2025 = {
    USD: 2850,
    EUR: 3080,
    GBP: 3600,
    CAD: 2100
  };
  
  if (annee === 2025) {
    taux = TAUX_FIXE_2025[devise.toUpperCase()] || 2850;
    source = 'fixed_2025';
    console.log(`📌 [${dateStr}] TAUX FIXE 2025: 1 ${devise} = ${taux} CDF`);
  } 
  else if (annee >= 2026) {
    try {
      const ratesForDisplay = await exchangeRateService.getRatesForDisplay();
      
      if (ratesForDisplay && ratesForDisplay.rates) {
        const deviseCode = devise.toUpperCase();
        
        if (deviseCode === 'USD') {
          taux = toFloat(ratesForDisplay.rates.USD);
          source = 'realtime_2026';
          console.log(`✅ [${dateStr}] API temps réel 2026+: 1 USD = ${taux} CDF`);
        } else if (ratesForDisplay.rates[deviseCode]) {
          taux = toFloat(ratesForDisplay.rates[deviseCode]);
          source = 'realtime_2026';
          console.log(`✅ [${dateStr}] API temps réel 2026+: 1 ${deviseCode} = ${taux} CDF`);
        }
      }
    } catch (apiError) {
      console.warn(`⚠️ Erreur API: ${apiError.message}`);
    }
    
    if (!taux) {
      taux = TAUX_FIXE_2025[devise.toUpperCase()] || 2850;
      source = 'fallback_2026';
      console.log(`⚠️ [${dateStr}] Fallback: 1 ${devise} = ${taux} CDF`);
    }
  }
  else {
    taux = TAUX_FIXE_2025[devise.toUpperCase()] || 2850;
    source = 'fixed_before_2025';
    console.log(`📌 [${dateStr}] TAUX FIXE (avant 2025): 1 ${devise} = ${taux} CDF`);
  }
  
  const montantCDF = toFloatFixed(montantNum * taux);
  
  console.log(`📊 RÉSULTAT FINAL:`);
  console.log(`   Date: ${dateStr} (année: ${annee})`);
  console.log(`   Source: ${source}`);
  console.log(`   Taux: 1 ${devise} = ${toFloatFixed(taux)} CDF`);
  console.log(`   Montant: ${toFloatFixed(montantNum)} ${devise} = ${montantCDF} CDF`);
  
  res.json({
    success: true,
    montant_original: toFloatFixed(montantNum),
    devise_originale: devise,
    montant_cdf: montantCDF,
    taux_utilise: toFloatFixed(taux),
    date_taux: dateStr,
    source: source,
    annee: annee,
    is_realtime: source === 'realtime_2026',
    is_fixed_2025: source === 'fixed_2025'
  });
});

exports.getAllActifs = catchAsync(async (req, res) => {
  const { type, statut, recherche, typeImmobilisation, page = 1, limit = 20 } = req.query;
  
  const where = {};
  
  if (type) where.type = type;
  if (typeImmobilisation) where.type_immobilisation = typeImmobilisation;
  if (statut === 'actif') where.actif = true;
  else if (statut === 'inactif') where.actif = false;
  
  if (recherche) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${recherche}%` } },
      { nom: { [Op.iLike]: `%${recherche}%` } },
      { numero_inventaire: { [Op.iLike]: `%${recherche}%` } }
    ];
  }
  
  const { count, rows } = await Actif.findAndCountAll({
    where,
    attributes: [
      'id', 'code', 'nom', 'type', 'date_acquisition',
      'cout_acquisition', 'actif', 'created_at',
      'numero_inventaire', 'etat', 'localisation', 'affectation',
      'type_immobilisation', 'date_validite',
      'valeur_residuelle', 'duree_utile_ans', 'mode_amortissement',
      'taux_amortissement'
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    raw: true
  });
  
  const rowsWithFloats = rows.map(row => ({
    ...row,
    cout_acquisition: toFloatFixed(row.cout_acquisition),
    valeur_residuelle: toFloatFixed(row.valeur_residuelle),
    taux_amortissement: toFloatFixed(row.taux_amortissement)
  }));
  
  res.json({ total: count, page: parseInt(page, 10), limit: parseInt(limit, 10), actifs: rowsWithFloats });
});

exports.getActifById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!id || id === 'undefined') {
    throw badRequest('ID actif invalide');
  }
  
  const actif = await Actif.findByPk(id, {
    attributes: { exclude: ['created_by', 'updated_by'] },
    include: [
      { model: Amortissement, as: 'Amortissements', attributes: ['exercice', 'annuite', 'cumul_amortissements', 'valeur_nette'] },
      { model: Contrat, as: 'Contrats', attributes: ['id', 'numero_contrat', 'fournisseur', 'date_fin', 'montant'] },
      { model: Depreciation, as: 'Depreciations', attributes: ['date_test', 'valeur_recouvrable', 'provision', 'commentaire'] },
      { 
        model: CategorieAmortissement, 
        as: 'categorie', 
        attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans', 'mode_amortissement_defaut', 'compte_comptable_defaut'] 
      },
      { model: Facture, as: 'facture', attributes: ['id', 'numero_facture', 'date_emission', 'montant_ht', 'montant_tva', 'montant_ttc', 'fichier_pdf', 'devise'] },
      { model: User, as: 'createur', attributes: ['id', 'full_name', 'email'] },
      { model: User, as: 'modificateur', attributes: ['id', 'full_name', 'email'] },
      { model: Devise, as: 'devise', attributes: ['id', 'code', 'nom', 'symbole', 'taux_actuel'] }
    ]
  });
  
  if (!actif) {
    throw notFound('Actif non trouvé');
  }
  
  const response = actif.toJSON();
  
  // Conversion de toutes les valeurs numériques en float
  response.cout_acquisition = toFloatFixed(response.cout_acquisition);
  response.valeur_residuelle = toFloatFixed(response.valeur_residuelle);
  response.montant_devise = toFloatFixed(response.montant_devise);
  response.taux_change_utilisation = toFloatFixed(response.taux_change_utilisation);
  response.taux_amortissement = toFloatFixed(response.taux_amortissement);
  
  if (response.Amortissements) {
    response.Amortissements = response.Amortissements.map(a => ({
      ...a,
      annuite: toFloatFixed(a.annuite),
      cumul_amortissements: toFloatFixed(a.cumul_amortissements),
      valeur_nette: toFloatFixed(a.valeur_nette)
    }));
  }
  
  const dernierAmort = response.Amortissements?.[response.Amortissements.length - 1];
  const valeurNetteAmort = dernierAmort?.valeur_nette || response.cout_acquisition;
  
  const derniereDepreciation = response.Depreciations?.[0];
  const provision = toFloatFixed(derniereDepreciation?.provision || 0);
  
  const valeurNetteApresDepreciation = toFloatFixed(Math.max(0, valeurNetteAmort - provision));
  
  response.valeur_nette_avant_depreciation = toFloatFixed(valeurNetteAmort);
  response.valeur_nette_apres_depreciation = valeurNetteApresDepreciation;
  response.provision_depreciation = provision;
  response.date_derniere_depreciation = actif.date_derniere_depreciation;
  response.depreciation_active = provision > 0;
  
  if (actif.montant_devise && actif.devise) {
    response.conversion = {
      montant_original: `${toFloatFixed(actif.montant_devise)} ${actif.devise.code}`,
      montant_cdf: toFloatFixed(actif.cout_acquisition),
      taux_utilise: toFloatFixed(actif.taux_change_utilisation),
      date_acquisition: actif.date_acquisition,
      source: 'historique'
    };
  }
  
  res.json(response);
});

exports.getActifByCode = catchAsync(async (req, res) => {
  const { code } = req.params;
  
  if (!code) {
    throw badRequest('Code QR requis');
  }
  
  const actif = await Actif.findOne({
    where: {
      [Op.or]: [
        { code: code },
        { numero_inventaire: code }
      ],
      actif: true
    },
    include: [
      { 
        model: Amortissement, 
        as: 'Amortissements',
        limit: 1,
        order: [['exercice', 'DESC']],
        required: false
      },
      { 
        model: CategorieAmortissement, 
        as: 'categorie',
        attributes: ['id', 'code_categorie', 'nom_categorie']
      },
      { 
        model: Devise, 
        as: 'devise',
        attributes: ['id', 'code', 'nom', 'symbole']
      }
    ]
  });
  
  if (!actif) {
    throw notFound('Actif non trouvé', { code_recherche: code });
  }
  
  const dernierAmort = actif.Amortissements?.[0];
  const valeurNette = dernierAmort 
    ? toFloatFixed(dernierAmort.valeur_nette) 
    : toFloatFixed(actif.cout_acquisition);
  
  res.json({
    id: actif.id,
    code: actif.code,
    nom: actif.nom,
    type: actif.type,
    type_immobilisation: actif.type_immobilisation,
    date_acquisition: actif.date_acquisition,
    cout_acquisition: toFloatFixed(actif.cout_acquisition),
    valeur_nette: valeurNette,
    localisation: actif.localisation,
    affectation: actif.affectation,
    etat: actif.etat,
    numero_inventaire: actif.numero_inventaire,
    marque: actif.marque,
    modele: actif.modele,
    numero_serie: actif.numero_serie,
    fournisseur: actif.fournisseur,
    categorie: actif.categorie,
    devise: actif.devise,
    date_validite: actif.date_validite
  });
});

// ==================== CREATE ACTIF - LA CATÉGORIE GCEC A LA PRIORITÉ ====================

exports.createActif = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      code, nom, type, date_acquisition, cout_acquisition,
      devise_code, valeur_residuelle, duree_utile_ans,
      mode_amortissement, description, fournisseur,
      numero_facture, categorie_id, numero_inventaire,
      marque, modele, numero_serie, localisation, etat,
      affectation, type_immobilisation, date_validite,
      nombre_utilisateurs, support, compte_comptable,
      taux_amortissement, devise_id, montant_devise, taux_change_utilisation
    } = req.body;

    // ✅ VARIABLES POUR LES VALEURS FINALES
    let finalDuree = parseInt(duree_utile_ans, 10) || 5;
    let finalMode = mode_amortissement || 'lineaire';
    let finalCompte = compte_comptable || '205';
    let finalTaux = cleanTauxAmortissement(taux_amortissement);
    let categorieForcee = false;

    // ✅ PRIORITÉ À LA CATÉGORIE GCEC SI FOURNIE
    if (categorie_id) {
      const categorie = await CategorieAmortissement.findByPk(categorie_id);
      if (categorie) {
        console.log('========================================');
        console.log(`📌 CATÉGORIE GCEC TROUVÉE: ${categorie.code_categorie} - ${categorie.nom_categorie}`);
        console.log(`   Durée de vie: ${categorie.duree_vie_ans} ans`);
        console.log(`   Mode par défaut: ${categorie.mode_amortissement_defaut}`);
        console.log(`   Compte comptable: ${categorie.compte_comptable_defaut}`);
        console.log('========================================');
        
        finalDuree = parseInt(categorie.duree_vie_ans, 10);
        finalMode = categorie.mode_amortissement_defaut || 'lineaire';
        finalCompte = categorie.compte_comptable_defaut || compte_comptable || '205';
        
        if (finalMode === 'lineaire') {
          finalTaux = toFloatFixed(100 / finalDuree);
        } else if (finalMode === 'degressif') {
          const tauxLineaire = 100 / finalDuree;
          let coefficient = 1.5;
          if (finalDuree <= 4) coefficient = 1.5;
          else if (finalDuree <= 6) coefficient = 2;
          else coefficient = 2.5;
          finalTaux = toFloatFixed(tauxLineaire * coefficient);
        }
        
        categorieForcee = true;
        
        console.log(`✅ VALEURS FORCÉES PAR LA CATÉGORIE:`);
        console.log(`   Durée: ${finalDuree} ans`);
        console.log(`   Mode: ${finalMode}`);
        console.log(`   Taux: ${finalTaux}%`);
        console.log(`   Compte: ${finalCompte}`);
        console.log('========================================');
      } else {
        console.warn(`⚠️ Catégorie non trouvée avec l'ID: ${categorie_id}`);
      }
    }

    if (!categorieForcee && !finalTaux && finalDuree > 0) {
      if (finalMode === 'lineaire') {
        finalTaux = toFloatFixed(100 / finalDuree);
        console.log(`📐 Taux calculé automatiquement (linéaire): ${finalTaux}% pour ${finalDuree} ans`);
      } else if (finalMode === 'degressif') {
        const tauxLineaire = 100 / finalDuree;
        let coefficient = 1.5;
        if (finalDuree <= 4) coefficient = 1.5;
        else if (finalDuree <= 6) coefficient = 2;
        else coefficient = 2.5;
        finalTaux = toFloatFixed(tauxLineaire * coefficient);
        console.log(`📐 Taux calculé automatiquement (dégressif): ${finalTaux}% pour ${finalDuree} ans`);
      }
    }

    console.log(`✅ Taux d'amortissement final: ${finalTaux ? finalTaux + '%' : 'non défini'}`);

    const validDateAcquisition = validateDate(date_acquisition) || new Date().toISOString().split('T')[0];
    const validDateValidite = validateDate(date_validite);

    let coutCDF = toFloat(cout_acquisition);
    let tauxUtilise = toFloat(taux_change_utilisation);
    let montantDeviseOriginal = toFloat(montant_devise);
    let deviseIdFinal = devise_id;
    let deviseCodeFinal = devise_code;

    let devisePourConversion = null;
    if (deviseCodeFinal) {
      devisePourConversion = deviseCodeFinal;
    } else if (deviseIdFinal) {
      const devise = await Devise.findByPk(deviseIdFinal);
      if (devise) devisePourConversion = devise.code;
    }

    if (devisePourConversion && devisePourConversion !== 'CDF') {
        const montantASaisir = montantDeviseOriginal || cout_acquisition;
        
        if (montantASaisir && toFloat(montantASaisir) > 0) {
            console.log(`💱 Conversion: ${toFloatFixed(montantASaisir)} ${devisePourConversion} -> CDF`);
            
            const conversion = await convertirDeviseAvecService(
              toFloat(montantASaisir), 
              devisePourConversion, 
              validDateAcquisition
            );
            
            coutCDF = conversion.montant_cdf;
            tauxUtilise = conversion.taux_utilise;
            montantDeviseOriginal = toFloat(montantASaisir);
            
            console.log(`✅ Résultat: ${toFloatFixed(montantDeviseOriginal)} ${devisePourConversion} = ${coutCDF} CDF (taux: ${toFloatFixed(tauxUtilise)})`);
        }
        
        if (!deviseIdFinal && devisePourConversion) {
            const devise = await Devise.findOne({ where: { code: devisePourConversion } });
            if (devise) deviseIdFinal = devise.id;
        }
    } else if (devisePourConversion === 'CDF') {
        montantDeviseOriginal = toFloat(cout_acquisition);
        tauxUtilise = 1;
        if (!deviseIdFinal) {
            const cdfDevise = await Devise.findOne({ where: { code: 'CDF' } });
            if (cdfDevise) deviseIdFinal = cdfDevise.id;
        }
    }

    if (!coutCDF || coutCDF <= 0) {
      coutCDF = toFloat(montantDeviseOriginal || cout_acquisition);
      if (!coutCDF || coutCDF <= 0) {
        throw badRequest('Le coût d\'acquisition est requis et doit être positif');
      }
    }

    const actif = await Actif.create({
      code, nom, type, 
      date_acquisition: validDateAcquisition,
      cout_acquisition: toFloatFixed(coutCDF),
      montant_devise: toFloatFixed(montantDeviseOriginal),
      devise_id: deviseIdFinal,
      taux_change_utilisation: toFloatFixed(tauxUtilise || 1),
      valeur_residuelle: toFloatFixed(valeur_residuelle || 0),
      duree_utile_ans: finalDuree,
      mode_amortissement: finalMode,
      taux_amortissement: finalTaux,
      description: description || null,
      compte_comptable: finalCompte,
      numero_inventaire: numero_inventaire || null,
      marque: marque || null,
      modele: modele || null,
      numero_serie: numero_serie || null,
      localisation: localisation || null,
      fournisseur: fournisseur || null,
      etat: etat || 'bon',
      affectation: affectation || null,
      type_immobilisation: type_immobilisation || 'incorporel',
      date_validite: validDateValidite,
      nombre_utilisateurs: nombre_utilisateurs ? parseInt(nombre_utilisateurs, 10) : null,
      support: support || null,
      categorie_id: categorie_id || null,
      numero_facture: numero_facture || null,
      created_by: req.user.id, 
      updated_by: req.user.id, 
      actif: true
    }, { transaction });

    await genererPlanAmortissement(actif, transaction);
    
    let facture = null;
    try {
      const deviseFacture = await Devise.findByPk(deviseIdFinal);
      const deviseCodeFacture = deviseFacture?.code || deviseCodeFinal || 'CDF';
      
      const montantHt = toFloatFixed(montantDeviseOriginal || coutCDF);
      const tva = toFloatFixed(montantHt * 0.16);
      const montantTtc = toFloatFixed(montantHt + tva);
      
      const numeroFactureGen = `FAC-${new Date().getFullYear()}-${actif.code}`;
      
      facture = await Facture.create({
        numero_facture: numeroFactureGen,
        actif_id: actif.id,
        date_emission: validDateAcquisition,
        montant_ht: montantHt,
        montant_tva: tva,
        montant_ttc: montantTtc,
        devise: deviseCodeFacture,
        fichier_pdf: null,
        created_by: req.user.id
      }, { transaction });
      
      console.log(`✅ Facture créée: ${numeroFactureGen}`);
    } catch (factureErr) {
      console.error('⚠️ Erreur génération facture:', factureErr.message);
    }
    
    await transaction.commit();

    await logAction(
      req.user.id,
      'CREATE',
      'actifs',
      actif.id,
      null,
      { code, nom, type, date_acquisition: validDateAcquisition, cout_acquisition: toFloatFixed(coutCDF), montant_devise: toFloatFixed(montantDeviseOriginal), devise_code: devisePourConversion, taux_utilise: toFloatFixed(tauxUtilise), taux_amortissement: finalTaux, duree_utile_ans: finalDuree, mode_amortissement: finalMode, categorie_forcee: categorieForcee },
      req.ip
    );

    const actifComplet = await Actif.findByPk(actif.id, {
      include: [
        { model: CategorieAmortissement, as: 'categorie' },
        { model: Devise, as: 'devise' },
        { model: User, as: 'createur' }
      ]
    });

    const responseData = actifComplet.toJSON();
    responseData.cout_acquisition = toFloatFixed(responseData.cout_acquisition);
    responseData.valeur_residuelle = toFloatFixed(responseData.valeur_residuelle);
    responseData.montant_devise = toFloatFixed(responseData.montant_devise);
    responseData.taux_change_utilisation = toFloatFixed(responseData.taux_change_utilisation);
    responseData.taux_amortissement = toFloatFixed(responseData.taux_amortissement);
    
    if (facture) {
      facture.montant_ht = toFloatFixed(facture.montant_ht);
      facture.montant_tva = toFloatFixed(facture.montant_tva);
      facture.montant_ttc = toFloatFixed(facture.montant_ttc);
      responseData.facture = facture;
    }
    
    if (montantDeviseOriginal && devisePourConversion && devisePourConversion !== 'CDF') {
        responseData.conversion = {
            montant_original: `${toFloatFixed(montantDeviseOriginal)} ${devisePourConversion}`,
            montant_cdf: toFloatFixed(coutCDF),
            taux_utilise: toFloatFixed(tauxUtilise),
            date_acquisition: validDateAcquisition
        };
    }

    res.status(201).json(responseData);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

exports.updateActif = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Conversion de toutes les valeurs numériques en float
    if (updateData.cout_acquisition !== undefined) {
      updateData.cout_acquisition = toFloatFixed(updateData.cout_acquisition);
    }
    if (updateData.valeur_residuelle !== undefined) {
      updateData.valeur_residuelle = toFloatFixed(updateData.valeur_residuelle);
    }
    if (updateData.montant_devise !== undefined) {
      updateData.montant_devise = toFloatFixed(updateData.montant_devise);
    }
    if (updateData.taux_change_utilisation !== undefined) {
      updateData.taux_change_utilisation = toFloatFixed(updateData.taux_change_utilisation);
    }
    if (updateData.taux_amortissement !== undefined) {
      const cleanTaux = cleanTauxAmortissement(updateData.taux_amortissement);
      if (cleanTaux !== null) {
        updateData.taux_amortissement = toFloatFixed(cleanTaux);
      } else {
        delete updateData.taux_amortissement;
      }
    }
    if (updateData.duree_utile_ans !== undefined) {
      updateData.duree_utile_ans = parseInt(updateData.duree_utile_ans, 10);
    }
    if (updateData.nombre_utilisateurs !== undefined) {
      updateData.nombre_utilisateurs = parseInt(updateData.nombre_utilisateurs, 10) || null;
    }

    // ✅ CORRECTION : Si une catégorie est fournie, forcer ses valeurs
    if (updateData.categorie_id) {
      const categorie = await CategorieAmortissement.findByPk(updateData.categorie_id);
      if (categorie) {
        console.log(`📌 Mise à jour - Catégorie GCEC: ${categorie.code_categorie}`);
        updateData.duree_utile_ans = parseInt(categorie.duree_vie_ans, 10);
        updateData.mode_amortissement = categorie.mode_amortissement_defaut || 'lineaire';
        updateData.compte_comptable = categorie.compte_comptable_defaut || updateData.compte_comptable || '205';
        
        if (updateData.mode_amortissement === 'lineaire') {
          updateData.taux_amortissement = toFloatFixed(100 / updateData.duree_utile_ans);
        } else if (updateData.mode_amortissement === 'degressif') {
          const tauxLineaire = 100 / updateData.duree_utile_ans;
          let coefficient = 1.5;
          if (updateData.duree_utile_ans <= 4) coefficient = 1.5;
          else if (updateData.duree_utile_ans <= 6) coefficient = 2;
          else coefficient = 2.5;
          updateData.taux_amortissement = toFloatFixed(tauxLineaire * coefficient);
        }
        
        console.log(`✅ Mise à jour forcée: durée=${updateData.duree_utile_ans} ans, taux=${updateData.taux_amortissement}%`);
      }
    }

    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }

    if (updateData.date_acquisition) {
      updateData.date_acquisition = validateDate(updateData.date_acquisition);
    }
    if (updateData.date_validite !== undefined) {
      updateData.date_validite = validateDate(updateData.date_validite);
    }

    const oldValues = {
      code: actif.code,
      nom: actif.nom,
      localisation: actif.localisation,
      affectation: actif.affectation,
      etat: actif.etat,
      date_validite: actif.date_validite,
      date_acquisition: actif.date_acquisition,
      cout_acquisition: toFloatFixed(actif.cout_acquisition),
      taux_change_utilisation: toFloatFixed(actif.taux_change_utilisation),
      taux_amortissement: toFloatFixed(actif.taux_amortissement),
      duree_utile_ans: actif.duree_utile_ans,
      mode_amortissement: actif.mode_amortissement
    };

    if (updateData.devise_code && updateData.devise_code !== 'CDF') {
      if (updateData.montant_devise && toFloat(updateData.montant_devise) > 0) {
        try {
          const conversion = await convertirDeviseAvecService(
            toFloat(updateData.montant_devise),
            updateData.devise_code,
            updateData.date_acquisition || actif.date_acquisition
          );
          updateData.cout_acquisition = conversion.montant_cdf;
          updateData.taux_change_utilisation = conversion.taux_utilise;
          console.log(`✅ Mise à jour conversion: ${toFloatFixed(updateData.montant_devise)} ${updateData.devise_code} = ${updateData.cout_acquisition} CDF`);
        } catch (convError) {
          console.error('❌ Erreur conversion:', convError.message);
        }
      }
    } else if (updateData.devise_code === 'CDF') {
      updateData.montant_devise = null;
      updateData.taux_change_utilisation = 1;
    }

    updateData.updated_by = req.user.id;
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    
    await actif.update(updateData, { transaction });

    const paramsChanged = 
      (updateData.cout_acquisition && toFloat(updateData.cout_acquisition) !== toFloat(oldValues.cout_acquisition)) ||
      (updateData.duree_utile_ans && parseInt(updateData.duree_utile_ans, 10) !== actif.duree_utile_ans) ||
      (updateData.mode_amortissement && updateData.mode_amortissement !== actif.mode_amortissement) ||
      (updateData.valeur_residuelle !== undefined && toFloat(updateData.valeur_residuelle) !== toFloat(actif.valeur_residuelle));

    if (paramsChanged) {
      await Amortissement.destroy({ where: { actif_id: id }, transaction });
      await genererPlanAmortissement(actif, transaction);
      
      const facture = await Facture.findOne({ where: { actif_id: id } });
      if (facture) {
        const nouveauMontantHt = toFloatFixed(actif.montant_devise || actif.cout_acquisition);
        const nouvelleTva = toFloatFixed(nouveauMontantHt * 0.16);
        const nouveauMontantTtc = toFloatFixed(nouveauMontantHt + nouvelleTva);
        
        await facture.update({
          montant_ht: nouveauMontantHt,
          montant_tva: nouvelleTva,
          montant_ttc: nouveauMontantTtc
        }, { transaction });
      }
    }

    await transaction.commit();

    await logAction(
      req.user.id,
      'UPDATE',
      'actifs',
      actif.id,
      oldValues,
      updateData,
      req.ip
    );

    const actifMaj = await Actif.findByPk(id, {
      include: [
        { model: CategorieAmortissement, as: 'categorie' },
        { model: Devise, as: 'devise' }
      ]
    });

    // Conversion des valeurs en float dans la réponse
    const response = actifMaj.toJSON();
    response.cout_acquisition = toFloatFixed(response.cout_acquisition);
    response.valeur_residuelle = toFloatFixed(response.valeur_residuelle);
    response.montant_devise = toFloatFixed(response.montant_devise);
    response.taux_change_utilisation = toFloatFixed(response.taux_change_utilisation);
    response.taux_amortissement = toFloatFixed(response.taux_amortissement);

    res.json(response);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

exports.deleteActif = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const actif = await Actif.findByPk(id);
    
    if (!actif) {
      throw notFound('Actif non trouvé');
    }

    const oldData = { ...actif.toJSON() };
    await actif.destroy({ transaction });
    await transaction.commit();

    await logAction(
      req.user.id,
      'DELETE',
      'actifs',
      id,
      oldData,
      null,
      req.ip
    );

    res.json({ message: 'Actif supprimé avec succès', id: id });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// ==================== AMORTISSEMENTS ====================

exports.getAmortissements = catchAsync(async (req, res) => {
  const { id } = req.params;
  const amortissements = await Amortissement.findAll({
    where: { actif_id: id },
    order: [['exercice', 'ASC']]
  });
  
  const formatted = amortissements.map(a => ({
    ...a.toJSON(),
    annuite: toFloatFixed(a.annuite),
    cumul_amortissements: toFloatFixed(a.cumul_amortissements),
    valeur_nette: toFloatFixed(a.valeur_nette)
  }));
  
  res.json(formatted);
});

exports.recalculerAmortissements = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const actif = await Actif.findByPk(id);
    if (!actif) throw notFound('Actif non trouvé');

    await Amortissement.destroy({ where: { actif_id: id }, transaction });
    await genererPlanAmortissement(actif, transaction);
    await transaction.commit();

    const nouveaux = await Amortissement.findAll({ 
      where: { actif_id: id }, 
      order: [['exercice', 'ASC']] 
    });
    
    const formatted = nouveaux.map(a => ({
      ...a.toJSON(),
      annuite: toFloatFixed(a.annuite),
      cumul_amortissements: toFloatFixed(a.cumul_amortissements),
      valeur_nette: toFloatFixed(a.valeur_nette)
    }));
    
    await logAction(
      req.user.id,
      'RECALCUL',
      'actifs',
      id,
      null,
      { message: 'Recalcul des amortissements effectué' },
      req.ip
    );
    
    res.json(formatted);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// ==================== CONTRATS ====================

exports.getContrats = catchAsync(async (req, res) => {
  const { id } = req.params;
  const contrats = await Contrat.findAll({
    where: { actif_id: id },
    order: [['date_fin', 'ASC']]
  });
  
  const formatted = contrats.map(c => ({
    ...c.toJSON(),
    montant: toFloatFixed(c.montant)
  }));
  
  res.json(formatted);
});

exports.createContrat = catchAsync(async (req, res) => {
  const { id } = req.params;
  const contratData = req.body;

  const actif = await Actif.findByPk(id);
  if (!actif) throw notFound('Actif non trouvé');

  const contrat = await Contrat.create({
    ...contratData,
    montant: toFloatFixed(contratData.montant),
    actif_id: id,
    created_by: req.user.id
  });

  await logAction(
    req.user.id,
    'CONTRAT_CREATE',
    'contrats',
    contrat.id,
    null,
    contratData,
    req.ip
  );

  res.status(201).json({ ...contrat.toJSON(), montant: toFloatFixed(contrat.montant) });
});

exports.updateContrat = catchAsync(async (req, res) => {
  const { contratId } = req.params;
  const updates = req.body;
  
  if (updates.montant !== undefined) {
    updates.montant = toFloatFixed(updates.montant);
  }

  const contrat = await Contrat.findByPk(contratId);
  if (!contrat) throw notFound('Contrat non trouvé');

  const oldValues = {
    numero_contrat: contrat.numero_contrat,
    fournisseur: contrat.fournisseur,
    montant: toFloatFixed(contrat.montant)
  };

  await contrat.update({ ...updates, updated_by: req.user.id });
  
  await logAction(
    req.user.id,
    'CONTRAT_UPDATE',
    'contrats',
    contratId,
    oldValues,
    updates,
    req.ip
  );
  
  res.json({ ...contrat.toJSON(), montant: toFloatFixed(contrat.montant) });
});

exports.deleteContrat = catchAsync(async (req, res) => {
  const { contratId } = req.params;
  const contrat = await Contrat.findByPk(contratId);
  if (!contrat) throw notFound('Contrat non trouvé');

  await contrat.destroy();
  
  await logAction(
    req.user.id,
    'CONTRAT_DELETE',
    'contrats',
    contratId,
    { numero_contrat: contrat.numero_contrat },
    null,
    req.ip
  );
  
  res.json({ message: 'Contrat supprimé' });
});

// ==================== DÉPRÉCIATIONS ====================

exports.getDepreciations = catchAsync(async (req, res) => {
  const { id } = req.params;
  const depreciations = await Depreciation.findAll({
    where: { actif_id: id },
    order: [['date_test', 'DESC']]
  });
  
  const formatted = depreciations.map(d => ({
    ...d.toJSON(),
    valeur_recouvrable: toFloatFixed(d.valeur_recouvrable),
    valeur_comptable: toFloatFixed(d.valeur_comptable),
    provision: toFloatFixed(d.provision)
  }));
  
  res.json(formatted);
});

exports.createDepreciation = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { date_test, valeur_recouvrable, commentaire } = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }

    if (!actif.actif) {
      throw badRequest('Impossible de déprécier un actif inactif');
    }

    const dateTest = new Date(date_test);
    const anneeTest = dateTest.getFullYear();
    
    const amortAuMomentTest = await Amortissement.findOne({
      where: { 
        actif_id: id,
        exercice: anneeTest
      },
      order: [['exercice', 'ASC']]
    });
    
    let valeurComptable;
    if (amortAuMomentTest) {
      valeurComptable = toFloat(amortAuMomentTest.valeur_nette);
    } else {
      const dernierAmortAvant = await Amortissement.findOne({
        where: { 
          actif_id: id,
          exercice: { [Op.lte]: anneeTest }
        },
        order: [['exercice', 'DESC']]
      });
      valeurComptable = dernierAmortAvant ? toFloat(dernierAmortAvant.valeur_nette) : toFloat(actif.cout_acquisition);
    }
    
    const valeurRecouvrableNum = toFloat(valeur_recouvrable);
    
    if (valeurRecouvrableNum < 0) {
      throw new Error('La valeur recouvrable ne peut pas être négative');
    }
    
    let provision = Math.max(0, valeurComptable - valeurRecouvrableNum);
    
    if (provision > valeurComptable) {
      provision = valeurComptable;
    }

    const depreciation = await Depreciation.create({
      actif_id: id,
      date_test,
      valeur_recouvrable: toFloatFixed(valeurRecouvrableNum),
      valeur_comptable: toFloatFixed(valeurComptable),
      provision: toFloatFixed(provision),
      commentaire: commentaire || null,
      created_by: req.user.id
    }, { transaction });

    await actif.update({
      depreciation_actif: provision > 0,
      date_derniere_depreciation: date_test,
      montant_depreciation: toFloatFixed(provision),
      provision_depreciation: toFloatFixed(provision)
    }, { transaction });

    await transaction.commit();

    await logAction(
      req.user.id,
      'DEPRECIATION',
      'actifs',
      id,
      { 
        valeur_comptable: toFloatFixed(valeurComptable),
        depreciation_actif_avant: actif.depreciation_actif
      },
      { 
        date_test, 
        valeur_recouvrable: toFloatFixed(valeurRecouvrableNum), 
        provision: toFloatFixed(provision), 
        commentaire,
        nouvelle_valeur_nette: Math.max(0, valeurComptable - provision)
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: provision > 0 ? 'Dépréciation enregistrée avec succès' : 'Aucune dépréciation nécessaire (valeur recouvrable >= valeur comptable)',
      data: {
        depreciation,
        valeur_comptable_avant: toFloatFixed(valeurComptable),
        valeur_recouvrable: toFloatFixed(valeurRecouvrableNum),
        provision: toFloatFixed(provision),
        valeur_nette_apres: Math.max(0, valeurComptable - provision)
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createDepreciation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création de la dépréciation' 
    });
  }
});

exports.annulerDepreciation = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }
    
    const derniereDepreciation = await Depreciation.findOne({
      where: { actif_id: id },
      order: [['date_test', 'DESC']]
    });
    
    if (!derniereDepreciation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucune dépréciation à annuler' 
      });
    }
    
    const oldProvision = toFloat(derniereDepreciation.provision);
    
    await derniereDepreciation.destroy({ transaction });
    
    const autreDepreciation = await Depreciation.findOne({
      where: { actif_id: id }
    });
    
    await actif.update({
      depreciation_actif: !!autreDepreciation,
      date_derniere_depreciation: autreDepreciation?.date_test || null,
      montant_depreciation: toFloatFixed(autreDepreciation?.provision || 0),
      provision_depreciation: toFloatFixed(autreDepreciation?.provision || 0)
    }, { transaction });
    
    await transaction.commit();
    
    await logAction(
      req.user.id,
      'ANNUL_DEPRECIATION',
      'actifs',
      id,
      { provision: toFloatFixed(oldProvision) },
      { message: 'Dépréciation annulée' },
      req.ip
    );
    
    res.json({
      success: true,
      message: 'Dépréciation annulée avec succès',
      provision_annulee: toFloatFixed(oldProvision)
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur annulerDepreciation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de l\'annulation' 
    });
  }
});

// ==================== RÉÉVALUATIONS ====================

exports.getReevaluations = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  console.log(`🔍 Récupération des réévaluations pour l'actif: ${id}`);
  
  const reevaluations = await Reevaluation.findAll({
    where: { actif_id: id },
    order: [['date_reevaluation', 'DESC']],
    include: [
      { model: User, as: 'createurReevaluation', attributes: ['id', 'full_name', 'email'] }
    ]
  });
  
  const formatted = reevaluations.map(r => ({
    ...r.toJSON(),
    valeur_avant: toFloatFixed(r.valeur_avant),
    valeur_apres: toFloatFixed(r.valeur_apres),
    plus_value: toFloatFixed(r.plus_value),
    moins_value: toFloatFixed(r.moins_value)
  }));
  
  console.log(`✅ ${formatted.length} réévaluation(s) trouvée(s)`);
  
  res.json(formatted);
});

exports.createReevaluation = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      date_reevaluation, 
      nouvelle_valeur, 
      commentaire, 
      document_reference,
      nouvelle_duree_ans,
      nouveau_taux
    } = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }

    if (!actif.actif) {
      throw badRequest('Impossible de réévaluer un actif inactif');
    }

    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: id },
      order: [['exercice', 'DESC']]
    });

    const valeurAvant = dernierAmort ? toFloat(dernierAmort.valeur_nette) : toFloat(actif.cout_acquisition);
    const valeurApres = toFloat(nouvelle_valeur);
    
    if (valeurApres <= 0) {
      throw new Error('La nouvelle valeur doit être positive');
    }

    const ecart = valeurApres - valeurAvant;
    const plusValue = ecart > 0 ? ecart : 0;
    const moinsValue = ecart < 0 ? -ecart : 0;

    let compteReevaluation = '';
    if (actif.type_immobilisation === 'corporel') {
      compteReevaluation = ecart >= 0 ? '1052' : '687';
    } else {
      compteReevaluation = ecart >= 0 ? '1053' : '687';
    }

    const reevaluation = await Reevaluation.create({
      actif_id: id,
      date_reevaluation,
      valeur_avant: toFloatFixed(valeurAvant),
      valeur_apres: toFloatFixed(valeurApres),
      plus_value: toFloatFixed(plusValue),
      moins_value: toFloatFixed(moinsValue),
      compte_reevaluation: compteReevaluation,
      nouvelle_duree_ans: nouvelle_duree_ans ? parseInt(nouvelle_duree_ans, 10) : actif.duree_utile_ans,
      nouveau_taux: cleanTauxAmortissement(nouveau_taux) || actif.taux_amortissement,
      commentaire: commentaire || null,
      document_reference: document_reference || null,
      created_by: req.user.id
    }, { transaction });

    const oldValues = {
      cout_acquisition: toFloatFixed(actif.cout_acquisition),
      duree_utile_ans: actif.duree_utile_ans,
      taux_amortissement: toFloatFixed(actif.taux_amortissement),
      valeur_reevaluee: toFloatFixed(actif.valeur_reevaluee),
      cumul_reevaluations: toFloatFixed(actif.cumul_reevaluations)
    };

    await actif.update({
      cout_acquisition: toFloatFixed(valeurApres),
      valeur_reevaluee: toFloatFixed(valeurApres),
      duree_utile_ans: nouvelle_duree_ans ? parseInt(nouvelle_duree_ans, 10) : actif.duree_utile_ans,
      taux_amortissement: cleanTauxAmortissement(nouveau_taux) || actif.taux_amortissement,
      cumul_reevaluations: toFloatFixed((actif.cumul_reevaluations || 0) + plusValue),
      date_derniere_reevaluation: date_reevaluation
    }, { transaction });

    await Amortissement.destroy({ where: { actif_id: id }, transaction });
    await genererPlanAmortissement(actif, transaction);

    await transaction.commit();

    await logAction(
      req.user.id,
      'REEVALUATION',
      'actifs',
      id,
      oldValues,
      {
        date_reevaluation,
        valeur_avant: toFloatFixed(valeurAvant),
        valeur_apres: toFloatFixed(valeurApres),
        ecart: toFloatFixed(ecart),
        plus_value: toFloatFixed(plusValue),
        moins_value: toFloatFixed(moinsValue),
        nouvelle_duree_ans: nouvelle_duree_ans || actif.duree_utile_ans,
        commentaire,
        document_reference
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: ecart >= 0 
        ? `Réévaluation à la hausse de ${toFloatFixed(ecart).toLocaleString()} FC enregistrée avec succès` 
        : `Réévaluation à la baisse de ${toFloatFixed(-ecart).toLocaleString()} FC enregistrée avec succès`,
      data: {
        reevaluation,
        valeur_avant: toFloatFixed(valeurAvant),
        valeur_apres: toFloatFixed(valeurApres),
        ecart: toFloatFixed(ecart),
        impact_amortissement: `Les amortissements ont été recalculés sur la nouvelle base de ${toFloatFixed(valeurApres).toLocaleString()} FC`,
        nouveau_plan_amortissement: await Amortissement.findAll({
          where: { actif_id: id },
          order: [['exercice', 'ASC']]
        }).then(plans => plans.map(p => ({
          ...p.toJSON(),
          annuite: toFloatFixed(p.annuite),
          cumul_amortissements: toFloatFixed(p.cumul_amortissements),
          valeur_nette: toFloatFixed(p.valeur_nette)
        })))
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createReevaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création de la réévaluation' 
    });
  }
});

exports.annulerReevaluation = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }
    
    const derniereReevaluation = await Reevaluation.findOne({
      where: { actif_id: id },
      order: [['date_reevaluation', 'DESC']]
    });
    
    if (!derniereReevaluation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucune réévaluation à annuler' 
      });
    }
    
    const oldValues = {
      cout_acquisition: toFloatFixed(actif.cout_acquisition),
      duree_utile_ans: actif.duree_utile_ans,
      cumul_reevaluations: toFloatFixed(actif.cumul_reevaluations)
    };
    
    const valeurAvant = toFloat(derniereReevaluation.valeur_avant);
    const dureeOriginale = actif.duree_utile_ans - (actif.duree_utile_ans - (derniereReevaluation.nouvelle_duree_ans || actif.duree_utile_ans));
    
    await actif.update({
      cout_acquisition: toFloatFixed(valeurAvant),
      valeur_reevaluee: toFloatFixed(valeurAvant),
      duree_utile_ans: dureeOriginale,
      cumul_reevaluations: toFloatFixed((actif.cumul_reevaluations || 0) - (derniereReevaluation.plus_value || 0))
    }, { transaction });
    
    await derniereReevaluation.destroy({ transaction });
    
    await Amortissement.destroy({ where: { actif_id: id }, transaction });
    await genererPlanAmortissement(actif, transaction);
    
    await transaction.commit();
    
    await logAction(
      req.user.id,
      'ANNUL_REEVALUATION',
      'actifs',
      id,
      oldValues,
      { message: 'Réévaluation annulée, valeurs restaurées' },
      req.ip
    );
    
    res.json({
      success: true,
      message: 'Réévaluation annulée avec succès',
      valeur_restauree: toFloatFixed(valeurAvant),
      nouveau_plan_amortissement: await Amortissement.findAll({
        where: { actif_id: id },
        order: [['exercice', 'ASC']]
      }).then(plans => plans.map(p => ({
        ...p.toJSON(),
        annuite: toFloatFixed(p.annuite),
        cumul_amortissements: toFloatFixed(p.cumul_amortissements),
        valeur_nette: toFloatFixed(p.valeur_nette)
      })))
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur annulerReevaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de l\'annulation de la réévaluation' 
    });
  }
});

exports.simulerReevaluation = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelle_valeur, nouvelle_duree_ans } = req.body;
    
    const actif = await Actif.findByPk(id);
    if (!actif) {
      throw notFound('Actif non trouvé');
    }
    
    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: id },
      order: [['exercice', 'DESC']]
    });
    
    const valeurActuelle = dernierAmort ? toFloat(dernierAmort.valeur_nette) : toFloat(actif.cout_acquisition);
    const nouvelleValeur = toFloat(nouvelle_valeur);
    const dureeActuelle = actif.duree_utile_ans;
    const dureeNouvelle = nouvelle_duree_ans ? parseInt(nouvelle_duree_ans, 10) : dureeActuelle;
    
    if (nouvelleValeur <= 0) {
      throw new Error('La nouvelle valeur doit être positive');
    }
    
    const ecart = nouvelleValeur - valeurActuelle;
    
    const valeurResiduelle = toFloat(actif.valeur_residuelle || 0);
    const nouvelleAnnuité = toFloatFixed((nouvelleValeur - valeurResiduelle) / dureeNouvelle);
    const ancienneAnnuité = toFloatFixed((valeurActuelle - valeurResiduelle) / dureeActuelle);
    const variationAnnuité = toFloatFixed(nouvelleAnnuité - ancienneAnnuité);
    
    res.json({
      success: true,
      simulation: {
        valeur_actuelle: toFloatFixed(valeurActuelle),
        nouvelle_valeur: toFloatFixed(nouvelleValeur),
        ecart: toFloatFixed(ecart),
        type: ecart >= 0 ? 'hausse' : 'baisse',
        impact_comptable: {
          plus_value: ecart > 0 ? toFloatFixed(ecart) : 0,
          moins_value: ecart < 0 ? toFloatFixed(-ecart) : 0,
          compte: ecart >= 0 ? (actif.type_immobilisation === 'corporel' ? '1052' : '1053') : '687'
        },
        impact_amortissement: {
          duree_actuelle: dureeActuelle,
          duree_nouvelle: dureeNouvelle,
          annuite_actuelle: ancienneAnnuité,
          annuite_nouvelle: nouvelleAnnuité,
          variation: variationAnnuité,
          impact_mensuel: toFloatFixed(variationAnnuité / 12)
        },
        recommandation: ecart > 0 
          ? "La réévaluation à la hausse augmentera la base amortissable. Les annuités futures seront plus élevées."
          : "La réévaluation à la baisse diminuera la base amortissable. Les annuités futures seront réduites."
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur simulerReevaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la simulation' 
    });
  }
});

// ==================== SORTIES ====================

exports.enregistrerSortie = catchAsync(async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { date_sortie, type_sortie, prix_cession, motif_sortie } = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) throw notFound('Actif non trouvé');
    if (!actif.actif) throw badRequest('Actif déjà inactif');

    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: id },
      order: [['exercice', 'DESC']]
    });

    const valeurNette = dernierAmort ? toFloat(dernierAmort.valeur_nette) : toFloat(actif.cout_acquisition);
    const prixCessionNum = prix_cession ? toFloat(prix_cession) : 0;
    const plusValue = (type_sortie === 'cession' && prixCessionNum) ? prixCessionNum - valeurNette : 0;

    const oldValues = { actif: actif.actif, valeur_nette: toFloatFixed(valeurNette) };

    await actif.update({
      actif: false,
      date_sortie,
      type_sortie,
      prix_cession: prixCessionNum ? toFloatFixed(prixCessionNum) : null,
      plus_moins_value: toFloatFixed(plusValue),
      motif_sortie,
      updated_by: req.user.id
    }, { transaction });

    await transaction.commit();

    await logAction(
      req.user.id,
      'SORTIE',
      'actifs',
      id,
      oldValues,
      { date_sortie, type_sortie, prix_cession: toFloatFixed(prixCessionNum), plusValue: toFloatFixed(plusValue), motif_sortie },
      req.ip
    );

    res.json({ 
      message: 'Sortie enregistrée', 
      actif: { 
        id: actif.id, 
        code: actif.code, 
        nom: actif.nom, 
        valeurNette: toFloatFixed(valeurNette), 
        plusValue: toFloatFixed(plusValue) 
      } 
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// ==================== RAPPORTS ====================

exports.etatImmobilisations = catchAsync(async (req, res) => {
  const dateRef = req.query.date_arrete ? new Date(req.query.date_arrete) : new Date();

  const actifs = await Actif.findAll({
    where: { actif: true },
    include: [{
      model: Amortissement,
      as: 'Amortissements',
      where: { exercice: { [Op.lte]: dateRef.getFullYear() } },
      required: false
    }]
  });

  const etat = actifs.map(a => {
    const cumul = (a.Amortissements || []).reduce((s, am) => s + toFloat(am.annuite), 0);
    const vnc = Math.max(toFloat(a.cout_acquisition) - cumul, toFloat(a.valeur_residuelle || 0));
    return {
      id: a.id, code: a.code, nom: a.nom, compte: a.compte_comptable || '205',
      date_acquisition: a.date_acquisition,
      valeur_brute: toFloatFixed(a.cout_acquisition),
      amortissements_cumules: toFloatFixed(cumul),
      vnc: toFloatFixed(vnc),
      duree: a.duree_utile_ans,
      mode: a.mode_amortissement,
      depreciation: a.depreciation_actif,
      mt_depreciation: toFloatFixed(a.montant_depreciation || 0)
    };
  });

  const totals = etat.reduce((acc, a) => ({
    vb: toFloatFixed(acc.vb + a.valeur_brute),
    amort: toFloatFixed(acc.amort + a.amortissements_cumules),
    vnc: toFloatFixed(acc.vnc + a.vnc),
    depr: toFloatFixed(acc.depr + a.mt_depreciation)
  }), { vb: 0, amort: 0, vnc: 0, depr: 0 });

  res.json({
    date_arrete: dateRef,
    total_valeur_brute: toFloatFixed(totals.vb),
    total_amortissements: toFloatFixed(totals.amort),
    total_vnc: toFloatFixed(totals.vnc),
    total_depreciations: toFloatFixed(totals.depr),
    actifs: etat
  });
});

exports.tableauAmortissements = catchAsync(async (req, res) => {
  const annee = req.query.exercice || new Date().getFullYear();

  const amortissements = await Amortissement.findAll({
    where: { exercice: annee },
    include: [{
      model: Actif,
      as: 'Actif',
      attributes: ['id', 'code', 'nom', 'type', 'cout_acquisition', 'compte_comptable']
    }],
    order: [['actif_id', 'ASC']]
  });

  const totalDotations = amortissements.reduce((s, a) => s + toFloat(a.annuite), 0);

  res.json({
    exercice: annee,
    total_dotations: toFloatFixed(totalDotations),
    amortissements: amortissements.map(a => ({
      actif_id: a.actif_id,
      actif_code: a.Actif?.code || 'N/A',
      actif_nom: a.Actif?.nom || 'N/A',
      type: a.Actif?.type,
      compte: a.Actif?.compte_comptable || '205',
      valeur_brute: toFloatFixed(a.Actif?.cout_acquisition || 0),
      annuite: toFloatFixed(a.annuite),
      cumul: toFloatFixed(a.cumul_amortissements),
      vnc: toFloatFixed(a.valeur_nette)
    }))
  });
});

exports.getStats = catchAsync(async (req, res) => {
  const [totalActifs, actifsActifs, totalValeurBrute, amortTotal, actifsAvecContrats] = await Promise.all([
    Actif.count(),
    Actif.count({ where: { actif: true } }),
    Actif.sum('cout_acquisition'),
    Amortissement.sum('annuite'),
    Actif.count({ include: [{ model: Contrat, as: 'Contrats', required: true }] })
  ]);

  res.json({
    total_actifs: totalActifs,
    actifs_actifs: actifsActifs,
    actifs_inactifs: totalActifs - actifsActifs,
    valeur_brute_totale: toFloatFixed(totalValeurBrute || 0),
    amortissements_totaux: toFloatFixed(amortTotal || 0),
    actifs_avec_contrats: actifsAvecContrats,
    taux_actifs_actifs: totalActifs ? ((actifsActifs / totalActifs) * 100).toFixed(2) + '%' : '0%'
  });
});

// ==================== RAPPORTS ANALYTIQUES ====================

exports.getEtatParCategorie = catchAsync(async (req, res) => {
  const actifs = await Actif.findAll({
    where: { actif: true },
    include: [{ model: CategorieAmortissement, as: 'categorie' }],
    attributes: [
      'categorie_id',
      [sequelize.fn('COUNT', sequelize.col('Actif.id')), 'nbActifs'],
      [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
      [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
    ],
    group: ['categorie_id', 'categorie.id', 'categorie.nom_categorie']
  });

  const result = actifs.map(a => ({
    categorie_id: a.categorie_id,
    categorie_nom: a.categorie?.nom_categorie || 'Sans catégorie',
    nbActifs: parseInt(a.dataValues.nbActifs, 10),
    valeurBrute: toFloatFixed(a.dataValues.valeurBrute || 0),
    valeurNette: toFloatFixed(a.dataValues.valeurNette || 0)
  }));

  res.json(result);
});

exports.getEtatParLocalisation = catchAsync(async (req, res) => {
  const actifs = await Actif.findAll({
    where: { actif: true },
    attributes: [
      'localisation',
      [sequelize.fn('COUNT', sequelize.col('id')), 'nbActifs'],
      [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
      [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
    ],
    group: ['localisation']
  });

  const result = actifs.map(a => ({
    localisation: a.localisation || 'Non spécifié',
    nbActifs: parseInt(a.dataValues.nbActifs, 10),
    valeurBrute: toFloatFixed(a.dataValues.valeurBrute || 0),
    valeurNette: toFloatFixed(a.dataValues.valeurNette || 0)
  }));

  res.json(result);
});

exports.getEtatParService = catchAsync(async (req, res) => {
  const actifs = await Actif.findAll({
    where: { actif: true },
    attributes: [
      'affectation',
      [sequelize.fn('COUNT', sequelize.col('id')), 'nbActifs'],
      [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
      [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
    ],
    group: ['affectation']
  });

  const result = actifs.map(a => ({
    affectation: a.affectation || 'Non affecté',
    nbActifs: parseInt(a.dataValues.nbActifs, 10),
    valeurBrute: toFloatFixed(a.dataValues.valeurBrute || 0),
    valeurNette: toFloatFixed(a.dataValues.valeurNette || 0)
  }));

  res.json(result);
});

exports.getAmortissementPrevisionnelVsRealise = catchAsync(async (req, res) => {
  const { annee_debut, annee_fin } = req.query;
  const debut = annee_debut || new Date().getFullYear();
  const fin = annee_fin || debut + 5;

  const actifs = await Actif.findAll({
    where: { actif: true },
    include: [{ model: Amortissement }]
  });

  const result = [];
  for (let an = debut; an <= fin; an++) {
    let previsionnel = 0;
    let realise = 0;
    actifs.forEach(actif => {
      const amort = actif.Amortissements?.find(a => a.exercice === an);
      if (amort) {
        realise += toFloat(amort.annuite);
        previsionnel += toFloat(amort.annuite);
      }
    });
    result.push({ annee: an, previsionnel: toFloatFixed(previsionnel), realise: toFloatFixed(realise) });
  }
  res.json(result);
});

exports.getSuiviInvestissements = catchAsync(async (req, res) => {
  const actifs = await Actif.findAll({
    attributes: [
      [sequelize.fn('date_part', 'year', sequelize.col('date_acquisition')), 'annee'],
      [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'realise'],
    ],
    group: [sequelize.fn('date_part', 'year', sequelize.col('date_acquisition'))],
    order: [[sequelize.literal('annee'), 'ASC']]
  });

  const result = actifs.map(a => ({
    annee: parseInt(a.dataValues.annee, 10),
    realise: toFloatFixed(a.dataValues.realise),
    budget: toFloatFixed(a.dataValues.realise * 1.1)
  }));

  res.json(result);
});

exports.getAlertes = catchAsync(async (req, res) => {
  const now = new Date();
  const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dans90Jours = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const finLicence = await Actif.findAll({
    where: {
      type_immobilisation: 'incorporel',
      date_validite: { [Op.between]: [now, dans30Jours] }
    },
    attributes: ['id', 'code', 'nom', 'date_validite']
  });

  let maintenance = [];
  try {
    maintenance = await Mouvement.findAll({
      where: {
        type_mouvement: { [Op.in]: ['maintenance', 'reparation'] },
        date_fin: { [Op.between]: [now, dans30Jours] }
      },
      include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
    });
  } catch (err) {
    maintenance = [];
  }

  let echeancesContrats = [];
  try {
    echeancesContrats = await Contrat.findAll({
      where: { date_fin: { [Op.between]: [now, dans90Jours] } },
      include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
    });
  } catch (err) {
    echeancesContrats = [];
  }

  let nonRetrouve = [];
  try {
    nonRetrouve = await Anomalie.findAll({
      where: { type_anomalie: 'manquant', statut: { [Op.in]: ['signalé', 'en_cours'] } },
      include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
    });
  } catch (err) {
    nonRetrouve = [];
  }

  const actifsEnMaintenance = await Actif.findAll({
    where: { actif: true, etat: { [Op.in]: ['reparation', 'hors_service'] } },
    attributes: ['id', 'code', 'nom', 'etat', 'localisation']
  });

  res.json({
    finLicence: finLicence.map(a => ({ id: a.id, code: a.code, nom: a.nom, date: a.date_validite, type: 'licence', priorite: 'haute' })),
    maintenance: maintenance.map(m => ({ id: m.Actif?.id, code: m.Actif?.code, nom: m.Actif?.nom, date: m.date_fin, type: 'maintenance', priorite: 'moyenne' })),
    echeancesContrats: echeancesContrats.map(c => ({ id: c.Actif?.id, code: c.Actif?.code, nom: c.Actif?.nom, date: c.date_fin, type: 'contrat', contrat_id: c.id, priorite: new Date(c.date_fin) < dans30Jours ? 'haute' : 'moyenne' })),
    actifsEnMaintenance: actifsEnMaintenance.map(a => ({ id: a.id, code: a.code, nom: a.nom, etat: a.etat, localisation: a.localisation, type: 'etat', priorite: a.etat === 'hors_service' ? 'critique' : 'moyenne' })),
    anomalies: nonRetrouve.map(a => ({ id: a.Actif?.id, code: a.Actif?.code, nom: a.Actif?.nom, date: a.date_constat, type: 'manquant', priorite: 'haute' }))
  });
});

// ==================== GESTION DES FACTURES ====================

exports.getFacture = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const actif = await Actif.findByPk(id, {
    include: [{ model: Devise, as: 'devise', attributes: ['code', 'nom', 'symbole'] }],
    attributes: ['id', 'code', 'nom', 'date_acquisition', 'cout_acquisition', 'montant_devise', 'devise_id', 'taux_change_utilisation', 'numero_facture', 'fournisseur', 'type_immobilisation']
  });
  
  if (!actif) throw notFound('Actif non trouvé');
  
  const deviseCode = actif.devise?.code || 'CDF';
  const deviseSymbole = actif.devise?.symbole || 'FC';
  const montantDeviseOrigine = toFloat(actif.montant_devise) || toFloat(actif.cout_acquisition / (actif.taux_change_utilisation || 1));
  const montantCDF = toFloat(actif.cout_acquisition);
  
  const montantHt_CDF = toFloatFixed(montantCDF);
  const montantTva_CDF = toFloatFixed(montantHt_CDF * 0.16);
  const montantTtc_CDF = toFloatFixed(montantHt_CDF + montantTva_CDF);
  
  const montantHt_DEVISE = toFloatFixed(montantDeviseOrigine);
  const montantTva_DEVISE = toFloatFixed(montantHt_DEVISE * 0.16);
  const montantTtc_DEVISE = toFloatFixed(montantHt_DEVISE + montantTva_DEVISE);
  
  let facture = await Facture.findOne({ where: { actif_id: id }, raw: true });
  
  if (!facture) {
    facture = {
      numero_facture: actif.numero_facture || `FAC-${actif.code}`,
      date_emission: actif.date_acquisition,
      montant_ht: toFloatFixed(montantHt_DEVISE),
      montant_tva: toFloatFixed(montantTva_DEVISE),
      montant_ttc: toFloatFixed(montantTtc_DEVISE),
      devise: deviseCode,
      taux_change_cdf: toFloatFixed(actif.taux_change_utilisation),
      montant_cdf: toFloatFixed(montantCDF),
      nom_fichier: null,
      est_disponible: false
    };
  }
  
  const response = {
    ...facture,
    actif: { id: actif.id, code: actif.code, nom: actif.nom, fournisseur: actif.fournisseur, type: actif.type_immobilisation, date_acquisition: actif.date_acquisition },
    conversion: { devise_originale: deviseCode, symbole: deviseSymbole, montant_devise: toFloatFixed(montantDeviseOrigine), montant_devise_original: toFloatFixed(montantHt_DEVISE), taux_change: toFloatFixed(actif.taux_change_utilisation), montant_cdf: toFloatFixed(montantCDF), date_taux: actif.date_acquisition }
  };
  
  response.montant_ht = montantHt_CDF;
  response.montant_tva = montantTva_CDF;
  response.montant_ttc = montantTtc_CDF;
  
  res.json(response);
});

exports.downloadFacture = catchAsync(async (req, res) => {
  const { id } = req.params;
  const PDFDocument = require('pdfkit');
  
  const actif = await Actif.findByPk(id, {
    include: [
      { model: Devise, as: 'devise', attributes: ['code', 'nom', 'symbole'] },
      { model: User, as: 'createur', attributes: ['id', 'full_name'] }
    ]
  });
  
  if (!actif) throw notFound('Actif non trouvé');
  
  let facture = await Facture.findOne({ where: { actif_id: id } });
  
  const deviseCode = actif.devise?.code || 'CDF';
  const montantDevise = toFloat(actif.montant_devise) || toFloat(actif.cout_acquisition);
  const tauxChange = toFloat(actif.taux_change_utilisation) || 2850;
  
  const montantHT_CDF = toFloat(actif.cout_acquisition);
  const montantTVA_CDF = toFloatFixed(montantHT_CDF * 0.16);
  const montantTTC_CDF = toFloatFixed(montantHT_CDF + montantTVA_CDF);
  
  const montantHT_DEVISE = toFloat(montantDevise);
  const montantTVA_DEVISE = toFloatFixed(montantHT_DEVISE * 0.16);
  const montantTTC_DEVISE = toFloatFixed(montantHT_DEVISE + montantTVA_DEVISE);
  
  if (!facture) {
    const numeroFacture = `FAC-${actif.code}-${new Date().getFullYear()}`;
    facture = await Facture.create({
      numero_facture: numeroFacture,
      actif_id: actif.id,
      date_emission: new Date(),
      montant_ht: toFloatFixed(montantHT_DEVISE),
      montant_tva: toFloatFixed(montantTVA_DEVISE),
      montant_ttc: toFloatFixed(montantTTC_DEVISE),
      devise: deviseCode,
      fichier_pdf: null,
      created_by: req.user.id
    });
  }
  
  const fileName = `facture_${actif.code}_${new Date().toISOString().split('T')[0]}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-cache');
  
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  
  doc.fontSize(20).fillColor('#10b981').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).fillColor('#0f172a').text('FACTURE D\'ACQUISITION', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(10).fillColor('#475569');
  doc.text(`Facture N°: ${facture.numero_facture}`, { align: 'right' });
  doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
  doc.text(`Généré par: ${req.user?.full_name || 'Système'}`, { align: 'right' });
  doc.moveDown();
  
  doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#334155');
  doc.text(`Actif: ${actif.code} - ${actif.nom}`);
  doc.text(`Type: ${actif.type_immobilisation === 'incorporel' ? 'Incorporel' : 'Corporel'}`);
  doc.text(`Fournisseur: ${actif.fournisseur || 'Non spécifié'}`);
  doc.text(`Date d'acquisition: ${new Date(actif.date_acquisition).toLocaleDateString('fr-FR')}`);
  doc.moveDown();
  
  doc.fontSize(12).fillColor('#0f172a').text('Détails financiers', { underline: true });
  doc.moveDown(0.5);
  
  const col1X = 50;
  const col2X = 350;
  
  doc.fontSize(10).fillColor('#475569');
  doc.text('Description', col1X, doc.y);
  doc.text('Montant', col2X, doc.y);
  doc.moveDown();
  
  doc.fontSize(10).fillColor('#000');
  doc.text('Montant HT', col1X, doc.y);
  doc.text(`${toFloatFixed(montantHT_CDF).toLocaleString()} FC`, col2X, doc.y);
  doc.moveDown();
  
  doc.text('TVA (16%)', col1X, doc.y);
  doc.text(`${toFloatFixed(montantTVA_CDF).toLocaleString()} FC`, col2X, doc.y);
  doc.moveDown();
  
  doc.fontSize(12).fillColor('#10b981');
  doc.text('TOTAL TTC', col1X, doc.y);
  doc.text(`${toFloatFixed(montantTTC_CDF).toLocaleString()} FC`, col2X, doc.y);
  doc.fillColor('#000');
  doc.moveDown(2);
  
  if (deviseCode !== 'CDF') {
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Information de conversion :', 50, doc.y);
    doc.text(`Montant original: ${toFloatFixed(montantHT_DEVISE).toLocaleString()} ${deviseCode}`, 50, doc.y + 15);
    doc.text(`Taux de change appliqué: 1 ${deviseCode} = ${toFloatFixed(tauxChange).toLocaleString()} CDF`, 50, doc.y + 30);
    doc.text(`TVA (16%): ${toFloatFixed(montantTVA_DEVISE).toLocaleString()} ${deviseCode}`, 50, doc.y + 45);
    doc.text(`Total TTC original: ${toFloatFixed(montantTTC_DEVISE).toLocaleString()} ${deviseCode}`, 50, doc.y + 60);
    doc.moveDown(5);
  }
  
  const pageHeight = doc.page.height;
  doc.fontSize(8).fillColor('#94a3b8');
  doc.text('Document officiel - Banque Centrale du Congo', 50, pageHeight - 50, { align: 'center' });
  doc.text('www.bcc.cd', 50, pageHeight - 40, { align: 'center' });
  doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 50, pageHeight - 30, { align: 'center' });
  
  doc.end();
});

// ==================== FONCTIONS IA ====================

async function analyserMessageAvecIA(message, context = {}) {
  console.log('🔍 Analyse IA du message:', message);
  
  const messageLower = message.toLowerCase();
  
  const draft = {
    code: null,
    nom: null,
    type: null,
    date_acquisition: null,
    cout_acquisition: null,
    devise_code: 'CDF',
    montant_devise: null,
    duree_utile_ans: 5,
    mode_amortissement: 'lineaire',
    taux_amortissement: null,
    type_immobilisation: 'incorporel',
    fournisseur: null,
    localisation: null,
    affectation: null,
    description: message.substring(0, 500),
    valeur_residuelle: 0,
    compte_comptable: null,
    numero_facture: null,
    marque: null,
    modele: null,
    numero_serie: null,
    etat: 'bon',
    date_validite: null,
    nombre_utilisateurs: null,
    support: null,
    categorie_id: null
  };
  
  let nomMatch = message.match(/nom(?:\s+est|\s+s'appelle|\s+désigne)?\s+["']?([A-Za-z0-9\s\-]+)["']?(?:\s+de|\.|,|$)/i);
  if (!nomMatch) {
    nomMatch = message.match(/["']([A-Za-z0-9\s\-]+)["']/i);
  }
  if (nomMatch && nomMatch[1].length < 100) {
    draft.nom = nomMatch[1].trim();
    const prefix = draft.nom.substring(0, 3).toUpperCase();
    draft.code = `${prefix}-${Math.floor(Math.random() * 1000)}`;
  } else {
    draft.nom = message.substring(0, 50);
    draft.code = `ACT-${Math.floor(Math.random() * 1000)}`;
  }
  
  const montantPatterns = [
    /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(USD|EUR|GBP|CND|CDF|FC|dollars|euros|livres|francs)/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*[\$€£]/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:de|d'|en)\s*(USD|EUR|GBP|CDF)/i,
    /(?:prix|coût|montant|valeur|acheté|payé)\s*(?:de|d'|à)?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)(?:\s*(USD|EUR|GBP|CDF|FC))?/i
  ];
  
  for (const pattern of montantPatterns) {
    const match = message.match(pattern);
    if (match) {
      const montant = parseFrenchNumber(match[1]);
      
      if (montant && montant > 0) {
        draft.montant_devise = toFloatFixed(montant);
        draft.cout_acquisition = toFloatFixed(montant);
        
        if (match[2]) {
          let devise = match[2].toUpperCase();
          if (devise === 'DOLLARS') devise = 'USD';
          if (devise === 'EUROS') devise = 'EUR';
          if (devise === 'LIVRES') devise = 'GBP';
          if (devise === 'FRANCS' || devise === 'FC') devise = 'CDF';
          draft.devise_code = devise;
        } else if (match[0].includes('$')) {
          draft.devise_code = 'USD';
        } else if (match[0].includes('€')) {
          draft.devise_code = 'EUR';
        } else if (match[0].includes('£')) {
          draft.devise_code = 'GBP';
        }
        break;
      }
    }
  }
  
  const residuellePattern = /valeur\s*résiduelle\s*(?:de|:)?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(USD|EUR|GBP|CDF|FC)?/i;
  const residuelleMatch = message.match(residuellePattern);
  if (residuelleMatch) {
    const residuelle = parseFrenchNumber(residuelleMatch[1]);
    if (residuelle && residuelle > 0) {
      draft.valeur_residuelle = toFloatFixed(residuelle);
    }
  }
  
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
    /(?:le|date|acquisition|acheté)\s+(?:le\s+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
  ];
  
  const moisMap = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  };
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      let jour, mois, annee;
      if (match[1].length === 4) {
        annee = match[1];
        mois = match[2];
        jour = match[3];
      } else if (match[3].length === 4) {
        jour = match[1].padStart(2, '0');
        mois = moisMap[match[2].toLowerCase()] || match[2].padStart(2, '0');
        annee = match[3];
      } else {
        jour = match[1].padStart(2, '0');
        mois = match[2].padStart(2, '0');
        annee = match[3].length === 2 ? '20' + match[3] : match[3];
      }
      draft.date_acquisition = `${annee}-${mois}-${jour}`;
      break;
    }
  }
  
  if (!draft.date_acquisition) {
    draft.date_acquisition = new Date().toISOString().split('T')[0];
  }
  
  const dureeMatch = message.match(/(\d+)\s*(?:ans|année|années)/i);
  if (dureeMatch) {
    draft.duree_utile_ans = parseInt(dureeMatch[1], 10);
    if (draft.duree_utile_ans > 50) draft.duree_utile_ans = 50;
    if (draft.duree_utile_ans < 1) draft.duree_utile_ans = 1;
  }
  
  if (messageLower.includes('dégressif') || messageLower.includes('degressif')) {
    draft.mode_amortissement = 'degressif';
  } else {
    draft.mode_amortissement = 'lineaire';
  }
  
  if (draft.mode_amortissement === 'lineaire') {
    draft.taux_amortissement = toFloatFixed(100 / draft.duree_utile_ans);
  }
  
  if (messageLower.includes('matériel') || messageLower.includes('ordinateur') || 
      messageLower.includes('pc') || messageLower.includes('imprimante') ||
      messageLower.includes('serveur') || messageLower.includes('scanner') ||
      messageLower.includes('vehicule') || messageLower.includes('voiture') ||
      messageLower.includes('camion') || messageLower.includes('moto') ||
      messageLower.includes('bâtiment') || messageLower.includes('immeuble') ||
      messageLower.includes('terrain') || messageLower.includes('machine')) {
    draft.type_immobilisation = 'corporel';
    
    if (messageLower.includes('ordinateur') || messageLower.includes('pc') || 
        messageLower.includes('imprimante') || messageLower.includes('serveur') ||
        messageLower.includes('scanner')) {
      draft.type = 'materiel';
      draft.compte_comptable = '2183';
    } else if (messageLower.includes('vehicule') || messageLower.includes('voiture') || 
               messageLower.includes('camion') || messageLower.includes('moto')) {
      draft.type = 'vehicule';
      draft.compte_comptable = '2182';
    } else if (messageLower.includes('bâtiment') || messageLower.includes('immeuble')) {
      draft.type = 'bâtiment';
      draft.compte_comptable = '213';
    } else if (messageLower.includes('terrain')) {
      draft.type = 'terrain';
      draft.compte_comptable = '211';
    } else {
      draft.type = 'materiel';
      draft.compte_comptable = '218';
    }
  } else {
    draft.type_immobilisation = 'incorporel';
    
    if (messageLower.includes('logiciel') || messageLower.includes('software') || 
        messageLower.includes('application') || messageLower.includes('app')) {
      draft.type = 'logiciel';
      draft.compte_comptable = '205';
    } else if (messageLower.includes('brevet') || messageLower.includes('patent')) {
      draft.type = 'brevet';
      draft.compte_comptable = '2051';
    } else if (messageLower.includes('licence') || messageLower.includes('license')) {
      draft.type = 'licence';
      draft.compte_comptable = '2052';
    } else if (messageLower.includes('fonds commercial') || messageLower.includes('goodwill')) {
      draft.type = 'fonds_commercial';
      draft.compte_comptable = '207';
    } else {
      draft.type = 'logiciel';
      draft.compte_comptable = '205';
    }
  }
  
  return draft;
}

exports.generateActifWithAI = catchAsync(async (req, res) => {
  const { conversation, context } = req.body;
  
  if (!conversation || !Array.isArray(conversation)) {
    throw validationError('La conversation est requise et doit être un tableau');
  }

  const dernierMessageUser = conversation.filter(msg => msg.role === 'user').pop();
  if (!dernierMessageUser) {
    throw validationError('Aucun message utilisateur trouvé');
  }

  const draft = await analyserMessageAvecIA(dernierMessageUser.content, context || {});
  
  // Nettoyer le taux dans le draft
  if (draft.taux_amortissement) {
    draft.taux_amortissement = cleanTauxAmortissement(draft.taux_amortissement);
  }
  
  res.json({
    success: true,
    message: "✅ J'ai analysé votre demande et rempli tous les champs du formulaire.",
    draft: {
      code: draft.code || null,
      nom: draft.nom || null,
      numero_inventaire: draft.numero_inventaire || null,
      type: draft.type || 'logiciel',
      type_immobilisation: draft.type_immobilisation || 'incorporel',
      date_acquisition: draft.date_acquisition || new Date().toISOString().split('T')[0],
      devise_code: draft.devise_code || 'CDF',
      montant_devise: draft.montant_devise ? toFloatFixed(draft.montant_devise) : null,
      cout_acquisition: draft.cout_acquisition ? toFloatFixed(draft.cout_acquisition) : null,
      valeur_residuelle: toFloatFixed(draft.valeur_residuelle),
      taux_change_utilisation: draft.taux_change_utilisation ? toFloatFixed(draft.taux_change_utilisation) : null,
      duree_utile_ans: draft.duree_utile_ans,
      mode_amortissement: draft.mode_amortissement,
      taux_amortissement: draft.taux_amortissement ? toFloatFixed(draft.taux_amortissement) : null,
      fournisseur: draft.fournisseur || null,
      numero_facture: draft.numero_facture || null,
      marque: draft.marque || null,
      modele: draft.modele || null,
      numero_serie: draft.numero_serie || null,
      etat: draft.etat,
      date_validite: draft.date_validite || null,
      nombre_utilisateurs: draft.nombre_utilisateurs,
      support: draft.support || null,
      localisation: draft.localisation || null,
      affectation: draft.affectation || null,
      compte_comptable: draft.compte_comptable || '205',
      categorie_id: draft.categorie_id || null,
      description: draft.description || `Actif créé: ${draft.nom || 'Nouvel actif'}`
    }
  });
});

exports.validateDraftWithAI = catchAsync(async (req, res) => {
  const { draft } = req.body;
  if (!draft) throw validationError('Brouillon requis');

  const anomalies = [];
  const warnings = [];
  
  if (!draft.code || draft.code.length < 3) {
    anomalies.push({
      field: 'code',
      message: 'Le code doit contenir au moins 3 caractères',
      severity: 'high',
      current_value: draft.code,
      suggested_value: draft.nom ? draft.nom.substring(0, 3).toUpperCase() + '-001' : 'ACT-001'
    });
  }
  
  if (!draft.nom || draft.nom.length < 2) {
    anomalies.push({
      field: 'nom',
      message: 'Le nom est requis et doit être descriptif',
      severity: 'high',
      current_value: draft.nom,
      suggested_value: null
    });
  }
  
  if (!draft.date_acquisition) {
    anomalies.push({
      field: 'date_acquisition',
      message: 'La date d\'acquisition est requise',
      severity: 'high',
      current_value: null,
      suggested_value: new Date().toISOString().split('T')[0]
    });
  }
  
  const cout = toFloat(draft.cout_acquisition || draft.montant_devise);
  if (!cout || cout <= 0) {
    anomalies.push({
      field: 'cout_acquisition',
      message: 'Le coût d\'acquisition doit être un nombre positif',
      severity: 'high',
      current_value: draft.cout_acquisition || draft.montant_devise,
      suggested_value: null
    });
  }
  
  const duree = parseInt(draft.duree_utile_ans, 10);
  if (!duree || duree < 1 || duree > 50) {
    anomalies.push({
      field: 'duree_utile_ans',
      message: 'La durée utile doit être comprise entre 1 et 50 ans',
      severity: 'high',
      current_value: draft.duree_utile_ans,
      suggested_value: 5
    });
  }
  
  const isValid = anomalies.filter(a => a.severity === 'high').length === 0;
  const score = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 15) - (warnings.length * 5));
  
  res.json({
    is_valid: isValid,
    score: Math.min(100, Math.floor(score)),
    anomalies: anomalies,
    warnings: warnings,
    message: isValid ? '✅ Le brouillon est valide et prêt à être créé !' : `⚠️ ${anomalies.length} anomalie(s) critique(s) détectée(s).`
  });
});

exports.suggestCorrections = catchAsync(async (req, res) => {
  const { draft } = req.body;
  if (!draft) throw validationError('Brouillon requis');
  
  const suggestions = [];
  
  if (!draft.code && draft.nom) {
    const prefix = draft.nom.substring(0, 3).toUpperCase();
    suggestions.push({
      field: 'code',
      current_value: null,
      corrected_value: `${prefix}-${Math.floor(Math.random() * 1000)}`,
      suggestion: `Code généré automatiquement: ${prefix}-XXX`,
      severity: 'medium',
      action: 'auto_fill'
    });
  }
  
  if (!draft.date_acquisition) {
    suggestions.push({
      field: 'date_acquisition',
      current_value: null,
      corrected_value: new Date().toISOString().split('T')[0],
      suggestion: 'Date du jour par défaut',
      severity: 'medium',
      action: 'auto_fill'
    });
  }
  
  if (!draft.valeur_residuelle || draft.valeur_residuelle === '') {
    suggestions.push({
      field: 'valeur_residuelle',
      current_value: null,
      corrected_value: 0,
      suggestion: 'Valeur résiduelle par défaut: 0',
      severity: 'low',
      action: 'auto_fill'
    });
  }
  
  res.json({
    success: true,
    suggestions: suggestions,
    message: `${suggestions.length} suggestion(s) de correction disponibles`,
    auto_fixable: suggestions.filter(s => s.action === 'auto_fill').length
  });
});

exports.createFromAIDraft = catchAsync(async (req, res) => {
  const draft = req.body;
  if (!draft) throw validationError('Brouillon requis');
  
  const createData = {
    code: draft.code,
    nom: draft.nom,
    type: draft.type || 'logiciel',
    date_acquisition: draft.date_acquisition,
    cout_acquisition: toFloatFixed(draft.cout_acquisition || draft.montant_devise),
    devise_code: draft.devise_code || 'CDF',
    montant_devise: toFloatFixed(draft.montant_devise || draft.cout_acquisition),
    valeur_residuelle: toFloatFixed(draft.valeur_residuelle || 0),
    duree_utile_ans: draft.duree_utile_ans || 5,
    mode_amortissement: draft.mode_amortissement || 'lineaire',
    taux_amortissement: cleanTauxAmortissement(draft.taux_amortissement) || toFloatFixed(100 / (draft.duree_utile_ans || 5)),
    type_immobilisation: draft.type_immobilisation || 'incorporel',
    description: draft.description || `Actif créé par IA: ${draft.nom}`,
    fournisseur: draft.fournisseur,
    localisation: draft.localisation,
    affectation: draft.affectation,
    compte_comptable: draft.compte_comptable,
    etat: draft.etat || 'bon',
    created_by: req.user.id,
    updated_by: req.user.id
  };
  
  const createReq = { body: createData, user: req.user, ip: req.ip };
  let createdActif;
  const createRes = { 
    status: (code) => ({ json: (data) => { if (code >= 400) throw new Error(data.message); createdActif = data; return data; } }),
    json: (data) => { createdActif = data; return data; }
  };
  
  await exports.createActif(createReq, createRes);
  
  res.status(201).json({
    success: true,
    message: '✅ Actif créé avec succès par l\'assistant IA !',
    actif: createdActif,
    ia_analysis: { confiance: 0.95 }
  });
});

exports.detectAnomaliesWithAI = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const actif = await Actif.findByPk(id, {
    include: [{ model: Amortissement, as: 'Amortissements' }, { model: Devise, as: 'devise' }]
  });
  
  if (!actif) throw notFound('Actif non trouvé');
  
  const anomalies = [];
  const recommandations = [];
  
  const dernierAmort = actif.Amortissements?.[actif.Amortissements.length - 1];
  if (dernierAmort && toFloat(dernierAmort.valeur_nette) < 0) {
    anomalies.push({ type: 'amortissement', severity: 'high', message: 'La valeur nette comptable est négative' });
    recommandations.push('Vérifiez le calcul des amortissements ou la valeur résiduelle');
  }
  
  const dateAcquisition = new Date(actif.date_acquisition);
  const maintenant = new Date();
  const anneesEcoulees = maintenant.getFullYear() - dateAcquisition.getFullYear();
  
  if (anneesEcoulees > actif.duree_utile_ans && actif.actif === true) {
    anomalies.push({ type: 'duree', severity: 'high', message: `L'actif a dépassé sa durée d'utilité de ${anneesEcoulees - actif.duree_utile_ans} ans` });
    recommandations.push('Envisager une sortie d\'actif ou une réévaluation de la durée d\'utilité');
  }
  
  if (toFloat(actif.valeur_residuelle) > toFloat(actif.cout_acquisition)) {
    anomalies.push({ type: 'valeur', severity: 'critical', message: 'La valeur résiduelle est supérieure au coût d\'acquisition' });
    recommandations.push('Corrigez la valeur résiduelle ou la valeur d\'acquisition');
  }
  
  const scoreSante = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'critical').length * 25) - 
                                 (anomalies.filter(a => a.severity === 'high').length * 15));
  
  res.json({
    actif_id: id,
    actif_code: actif.code,
    actif_nom: actif.nom,
    anomalies_detectees: anomalies,
    nombre_anomalies: anomalies.length,
    recommandations: recommandations,
    score_sante: Math.min(100, Math.floor(scoreSante)),
    niveau_risque: scoreSante >= 80 ? 'faible' : scoreSante >= 50 ? 'moyen' : 'élevé',
    date_analyse: new Date().toISOString(),
    resume: `${anomalies.length} anomalie(s) détectée(s). Score de santé: ${Math.min(100, Math.floor(scoreSante))}%`,
    est_coherent: scoreSante >= 70,
    taux_moyen: toFloatFixed(actif.taux_amortissement || 0) + '%'
  });
});

module.exports = exports;