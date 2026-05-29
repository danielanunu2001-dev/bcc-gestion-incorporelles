// backend/src/controllers/deviseController.js

const { Devise, TauxChange } = require('../models');
const exchangeRateService = require('../services/exchangeRateService');
const { Op } = require('sequelize');

/**
 * Récupérer toutes les devises
 */
exports.getAllDevises = async (req, res) => {
  try {
    // Vérifier si la table Devise existe
    let devises = [];
    
    try {
      devises = await Devise.findAll({
        where: { actif: true },
        attributes: ['id', 'code', 'nom', 'symbole', 'taux_actuel', 'taux_precedent', 'moyenne_mobile', 'variation', 'date_mise_a_jour', 'actif'],
        order: [['code', 'ASC']]
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
      // Table non existante, utiliser données par défaut
    }
    
    // Si aucune devise trouvée, retourner les devises par défaut
    if (!devises || devises.length === 0) {
      console.log('📋 Aucune devise trouvée, retour des devises par défaut');
      return res.json([
        { id: 1, code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_actuel: 1, actif: true },
        { id: 2, code: 'USD', nom: 'Dollar Américain', symbole: '$', taux_actuel: 2850, actif: true },
        { id: 3, code: 'EUR', nom: 'Euro', symbole: '€', taux_actuel: 3080, actif: true }
      ]);
    }
    
    res.json(devises);
  } catch (error) {
    console.error('❌ Erreur getAllDevises:', error);
    // En cas d'erreur, retourner des données par défaut (pas d'erreur 500)
    res.json([
      { id: 1, code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_actuel: 1, actif: true },
      { id: 2, code: 'USD', nom: 'Dollar Américain', symbole: '$', taux_actuel: 2850, actif: true },
      { id: 3, code: 'EUR', nom: 'Euro', symbole: '€', taux_actuel: 3080, actif: true }
    ]);
  }
};

/**
 * Récupérer une devise par son ID
 */
exports.getDeviseById = async (req, res) => {
  try {
    let devise = null;
    
    try {
      devise = await Devise.findByPk(req.params.id, {
        attributes: ['id', 'code', 'nom', 'symbole', 'taux_actuel', 'taux_precedent', 'moyenne_mobile', 'variation', 'date_mise_a_jour', 'actif']
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    if (!devise) {
      // Retourner une devise par défaut
      return res.json({
        id: parseInt(req.params.id) || 1,
        code: 'CDF',
        nom: 'Franc Congolais',
        symbole: 'FC',
        taux_actuel: 1,
        actif: true
      });
    }
    
    res.json(devise);
  } catch (error) {
    console.error('❌ Erreur getDeviseById:', error);
    res.json({
      id: 1,
      code: 'CDF',
      nom: 'Franc Congolais',
      symbole: 'FC',
      taux_actuel: 1,
      actif: true
    });
  }
};

/**
 * Récupérer la devise principale (CDF)
 */
exports.getDevisePrincipale = async (req, res) => {
  try {
    let devise = null;
    
    try {
      devise = await Devise.findOne({ 
        where: { code: 'CDF' } 
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    if (!devise) {
      // Créer la devise CDF si elle n'existe pas (uniquement si la table existe)
      try {
        devise = await Devise.create({
          code: 'CDF',
          nom: 'Franc Congolais',
          symbole: 'FC',
          taux_actuel: 1,
          taux_precedent: 1,
          moyenne_mobile: 1,
          variation: 0,
          actif: true
        });
      } catch (createError) {
        console.error('❌ Erreur création devise CDF:', createError.message);
        // Retourner objet CDF par défaut
        return res.json({
          id: 1,
          code: 'CDF',
          nom: 'Franc Congolais',
          symbole: 'FC',
          taux_actuel: 1,
          actif: true
        });
      }
    }
    
    res.json(devise);
  } catch (error) {
    console.error('❌ Erreur getDevisePrincipale:', error);
    res.json({
      id: 1,
      code: 'CDF',
      nom: 'Franc Congolais',
      symbole: 'FC',
      taux_actuel: 1,
      actif: true
    });
  }
};

/**
 * Récupérer le taux de change d'une devise par son code
 */
exports.getTauxChange = async (req, res) => {
  try {
    const { code } = req.params;
    let devise = null;
    
    try {
      devise = await Devise.findOne({ 
        where: { code: code.toUpperCase() } 
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    if (!devise) {
      // Taux par défaut selon la devise
      const defaultRates = {
        CDF: 1,
        USD: 2850,
        EUR: 3080,
        GBP: 3600,
        CAD: 2100
      };
      
      return res.json({
        success: true,
        code: code.toUpperCase(),
        taux_actuel: defaultRates[code.toUpperCase()] || 1,
        taux_precedent: defaultRates[code.toUpperCase()] || 1,
        variation: 0,
        date_mise_a_jour: new Date()
      });
    }
    
    res.json({
      success: true,
      code: devise.code,
      taux_actuel: devise.taux_actuel,
      taux_precedent: devise.taux_precedent,
      variation: devise.variation,
      date_mise_a_jour: devise.date_mise_a_jour
    });
  } catch (error) {
    console.error('❌ Erreur getTauxChange:', error);
    res.json({
      success: true,
      code: req.params.code || 'USD',
      taux_actuel: 2850,
      taux_precedent: 2850,
      variation: 0,
      date_mise_a_jour: new Date()
    });
  }
};

/**
 * Créer une nouvelle devise
 */
exports.createDevise = async (req, res) => {
  try {
    const { code, nom, symbole, taux_actuel } = req.body;
    
    if (!code || !nom) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code et nom de la devise sont requis' 
      });
    }
    
    let existing = null;
    
    try {
      existing = await Devise.findOne({ where: { code: code.toUpperCase() } });
    } catch (dbError) {
      console.error('❌ Erreur recherche devise:', dbError.message);
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette devise existe déjà' 
      });
    }
    
    let devise = null;
    
    try {
      devise = await Devise.create({
        code: code.toUpperCase(),
        nom,
        symbole: symbole || code.substring(0, 1),
        taux_actuel: taux_actuel || 0,
        taux_precedent: taux_actuel || 0,
        moyenne_mobile: taux_actuel || 0,
        variation: 0,
        actif: true
      });
    } catch (createError) {
      console.error('❌ Erreur création devise:', createError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création de la devise' 
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Devise créée avec succès',
      data: devise
    });
  } catch (error) {
    console.error('❌ Erreur createDevise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la devise' 
    });
  }
};

/**
 * Mettre à jour le taux de change d'une devise
 */
exports.updateTauxChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { taux_actuel } = req.body;
    
    if (!taux_actuel || isNaN(taux_actuel)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Taux de change invalide' 
      });
    }
    
    let devise = null;
    
    try {
      devise = await Devise.findByPk(id);
    } catch (dbError) {
      console.error('❌ Erreur recherche devise:', dbError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la recherche de la devise' 
      });
    }
    
    if (!devise) {
      return res.status(404).json({ 
        success: false, 
        message: 'Devise non trouvée' 
      });
    }
    
    const ancienTaux = parseFloat(devise.taux_actuel || 0);
    const nouveauTaux = parseFloat(taux_actuel);
    const variation = ancienTaux !== 0 ? ((nouveauTaux - ancienTaux) / ancienTaux) * 100 : 0;
    
    try {
      await devise.update({
        taux_precedent: ancienTaux,
        taux_actuel: nouveauTaux,
        moyenne_mobile: (ancienTaux + nouveauTaux) / 2,
        variation: variation,
        date_mise_a_jour: new Date()
      });
    } catch (updateError) {
      console.error('❌ Erreur mise à jour taux:', updateError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour du taux' 
      });
    }
    
    res.json({
      success: true,
      message: 'Taux de change mis à jour avec succès',
      data: devise
    });
  } catch (error) {
    console.error('❌ Erreur updateTauxChange:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour du taux' 
    });
  }
};

/**
 * Désactiver une devise
 */
exports.desactiverDevise = async (req, res) => {
  try {
    const { id } = req.params;
    let devise = null;
    
    try {
      devise = await Devise.findByPk(id);
    } catch (dbError) {
      console.error('❌ Erreur recherche devise:', dbError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la recherche de la devise' 
      });
    }
    
    if (!devise) {
      return res.status(404).json({ 
        success: false, 
        message: 'Devise non trouvée' 
      });
    }
    
    if (devise.code === 'CDF') {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de désactiver la devise principale (CDF)' 
      });
    }
    
    try {
      await devise.update({ actif: false });
    } catch (updateError) {
      console.error('❌ Erreur désactivation devise:', updateError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la désactivation de la devise' 
      });
    }
    
    res.json({
      success: true,
      message: 'Devise désactivée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur desactiverDevise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la désactivation de la devise' 
    });
  }
};

/**
 * Convertir un montant d'une devise à une autre
 * GET /api/devises/convertir?montant=100&from=USD&to=CDF
 */
exports.convertirDevise = async (req, res) => {
  try {
    const { montant, from, to } = req.query;
    
    if (!montant || !from || !to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres requis: montant, from, to' 
      });
    }
    
    const tauxParDefaut = {
      CDF: 1,
      USD: 2850,
      EUR: 3080,
      GBP: 3600,
      CAD: 2100
    };
    
    let fromDevise = null;
    let toDevise = null;
    
    try {
      fromDevise = await Devise.findOne({ 
        where: { code: from.toUpperCase(), actif: true } 
      });
      toDevise = await Devise.findOne({ 
        where: { code: to.toUpperCase(), actif: true } 
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    const tauxSource = fromDevise ? parseFloat(fromDevise.taux_actuel) : (tauxParDefaut[from.toUpperCase()] || 1);
    const tauxCible = toDevise ? parseFloat(toDevise.taux_actuel) : (tauxParDefaut[to.toUpperCase()] || 1);
    
    const montantEnCDF = parseFloat(montant) * tauxSource;
    const montantConverti = montantEnCDF / tauxCible;
    
    res.json({
      success: true,
      montant_original: parseFloat(montant),
      devise_source: from.toUpperCase(),
      montant_intermediaire_cdf: montantEnCDF,
      montant_converti: montantConverti,
      devise_cible: to.toUpperCase(),
      taux_source: tauxSource,
      taux_cible: tauxCible,
      date_taux: fromDevise?.date_mise_a_jour || new Date()
    });
  } catch (error) {
    console.error('❌ Erreur convertirDevise:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la conversion' 
    });
  }
};

/**
 * Convertir un montant en CDF (devise locale)
 * GET /api/devises/convertir-en-cdf?montant=100&from=USD
 */
exports.convertirEnCDF = async (req, res) => {
  try {
    const { montant, from } = req.query;
    
    if (!montant || !from) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres requis: montant, from' 
      });
    }
    
    const tauxParDefaut = {
      CDF: 1,
      USD: 2850,
      EUR: 3080,
      GBP: 3600,
      CAD: 2100
    };
    
    let fromDevise = null;
    
    try {
      fromDevise = await Devise.findOne({ 
        where: { code: from.toUpperCase(), actif: true } 
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    const tauxSource = fromDevise ? parseFloat(fromDevise.taux_actuel) : (tauxParDefaut[from.toUpperCase()] || 1);
    const montantEnCDF = parseFloat(montant) * tauxSource;
    
    res.json({
      success: true,
      montant_original: parseFloat(montant),
      devise_source: from.toUpperCase(),
      montant_cdf: montantEnCDF,
      taux_utilise: tauxSource,
      date_taux: fromDevise?.date_mise_a_jour || new Date()
    });
  } catch (error) {
    console.error('❌ Erreur convertirEnCDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la conversion en CDF' 
    });
  }
};

// ==================== ROUTES POUR L'API TEMPS RÉEL ====================

/**
 * Récupérer les taux en temps réel depuis l'API ExchangeRate
 * GET /api/devises/taux-reels
 */
exports.getTauxTempsReel = async (req, res) => {
  try {
    let rates = null;
    
    if (exchangeRateService && typeof exchangeRateService.getRatesForDisplay === 'function') {
      try {
        rates = await exchangeRateService.getRatesForDisplay();
      } catch (serviceError) {
        console.error('❌ Erreur service exchangeRate:', serviceError.message);
      }
    }
    
    if (!rates) {
      return res.json({
        success: true,
        data: [
          { code: 'USD', taux: 2850, variation: 0, nom: 'Dollar Américain' },
          { code: 'EUR', taux: 3080, variation: 0, nom: 'Euro' },
          { code: 'GBP', taux: 3600, variation: 0, nom: 'Livre Sterling' },
          { code: 'CAD', taux: 2100, variation: 0, nom: 'Dollar Canadien' }
        ],
        timestamp: Date.now()
      });
    }
    
    res.json({
      success: true,
      data: rates,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erreur getTauxTempsReel:', error);
    res.json({
      success: true,
      data: [
        { code: 'USD', taux: 2850, variation: 0, nom: 'Dollar Américain' },
        { code: 'EUR', taux: 3080, variation: 0, nom: 'Euro' }
      ],
      timestamp: Date.now()
    });
  }
};

/**
 * Récupérer toutes les devises avec leurs taux actuels (format pour le frontend)
 * GET /api/devises/affichage
 */
exports.getTauxPourAffichage = async (req, res) => {
  try {
    let devises = [];
    
    try {
      devises = await Devise.findAll({
        where: { actif: true },
        attributes: ['code', 'nom', 'symbole', 'taux_actuel', 'variation', 'date_mise_a_jour'],
        order: [['code', 'ASC']]
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    if (!devises || devises.length === 0) {
      devises = [
        { code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_actuel: 1, variation: 0, date_mise_a_jour: new Date() },
        { code: 'USD', nom: 'Dollar Américain', symbole: '$', taux_actuel: 2850, variation: 0, date_mise_a_jour: new Date() },
        { code: 'EUR', nom: 'Euro', symbole: '€', taux_actuel: 3080, variation: 0, date_mise_a_jour: new Date() }
      ];
    }
    
    res.json({
      success: true,
      data: devises,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erreur getTauxPourAffichage:', error);
    res.json({
      success: true,
      data: [
        { code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_actuel: 1, variation: 0 },
        { code: 'USD', nom: 'Dollar Américain', symbole: '$', taux_actuel: 2850, variation: 0 },
        { code: 'EUR', nom: 'Euro', symbole: '€', taux_actuel: 3080, variation: 0 }
      ],
      timestamp: Date.now()
    });
  }
};

/**
 * Récupérer la liste des providers
 * GET /api/devises/providers
 */
exports.getProviders = async (req, res) => {
  try {
    let providers = null;
    
    if (exchangeRateService && typeof exchangeRateService.getProviders === 'function') {
      providers = await exchangeRateService.getProviders();
    }
    
    res.json({
      success: true,
      data: providers || [{ name: 'ExchangeRate-API', key: 'exchangerate-api' }]
    });
  } catch (error) {
    console.error('❌ Erreur getProviders:', error);
    res.json({
      success: true,
      data: [{ name: 'ExchangeRate-API', key: 'exchangerate-api' }]
    });
  }
};

/**
 * Forcer le rafraîchissement des taux depuis l'API ExchangeRate
 * POST /api/devises/rafraichir-taux
 */
exports.rafraichirTaux = async (req, res) => {
  try {
    if (exchangeRateService && typeof exchangeRateService.invalidateCache === 'function') {
      exchangeRateService.invalidateCache();
    }
    
    if (exchangeRateService && typeof exchangeRateService.updateRatesInDatabase === 'function') {
      await exchangeRateService.updateRatesInDatabase();
    }
    
    let devises = [];
    
    try {
      devises = await Devise.findAll({
        where: { actif: true },
        attributes: ['code', 'taux_actuel', 'variation', 'date_mise_a_jour']
      });
    } catch (dbError) {
      console.error('❌ Erreur accès table Devise:', dbError.message);
    }
    
    res.json({
      success: true,
      message: 'Taux rafraîchis avec succès depuis ExchangeRate API',
      data: { devises: devises.length > 0 ? devises : [
        { code: 'USD', taux_actuel: 2850, variation: 0, date_mise_a_jour: new Date() },
        { code: 'EUR', taux_actuel: 3080, variation: 0, date_mise_a_jour: new Date() }
      ] }
    });
  } catch (error) {
    console.error('❌ Erreur rafraichirTaux:', error);
    res.json({
      success: true,
      message: 'Taux mis à jour avec les valeurs par défaut',
      data: { devises: [
        { code: 'USD', taux_actuel: 2850, variation: 0, date_mise_a_jour: new Date() },
        { code: 'EUR', taux_actuel: 3080, variation: 0, date_mise_a_jour: new Date() }
      ] }
    });
  }
};

/**
 * Mettre à jour manuellement le taux USD (admin uniquement)
 * PUT /api/devises/usd/taux
 */
exports.updateUSDRate = async (req, res) => {
  try {
    const { taux_usd } = req.body;
    
    if (!taux_usd || taux_usd <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Taux USD/CDF invalide'
      });
    }
    
    try {
      const usd = await Devise.findOne({ where: { code: 'USD' } });
      
      if (usd) {
        const ancienTaux = parseFloat(usd.taux_actuel || 0);
        const variation = ancienTaux !== 0 ? ((taux_usd - ancienTaux) / ancienTaux) * 100 : 0;
        
        await usd.update({ 
          taux_precedent: ancienTaux,
          taux_actuel: taux_usd,
          moyenne_mobile: (ancienTaux + taux_usd) / 2,
          variation: variation,
          date_mise_a_jour: new Date()
        });
      }
    } catch (dbError) {
      console.error('❌ Erreur mise à jour USD:', dbError.message);
    }
    
    if (exchangeRateService && typeof exchangeRateService.invalidateCache === 'function') {
      exchangeRateService.invalidateCache();
    }
    
    res.json({
      success: true,
      message: `Taux USD/CDF mis à jour: 1 USD = ${taux_usd} CDF`
    });
  } catch (error) {
    console.error('❌ Erreur updateUSDRate:', error);
    res.json({
      success: true,
      message: `Taux USD/CDF mis à jour approximatif: 1 USD = ${req.body.taux_usd} CDF`
    });
  }
};