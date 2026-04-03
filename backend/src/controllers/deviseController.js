// backend/src/controllers/deviseController.js

const { Devise, Actif } = require('../models');
const { Op } = require('sequelize');

/**
 * Récupérer toutes les devises
 */
exports.getAllDevises = async (req, res) => {
  try {
    console.log('🔍 getAllDevises appelé');
    
    if (!Devise) {
      console.error('❌ Modèle Devise non trouvé');
      return res.status(500).json({ message: 'Modèle Devise non disponible' });
    }
    
    const devises = await Devise.findAll({
      where: { actif: true },
      order: [['code', 'ASC']]
    });
    
    console.log(`✅ ${devises.length} devise(s) trouvée(s)`);
    res.json(devises);
  } catch (error) {
    console.error('❌ Erreur getAllDevises:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Récupérer une devise par son ID
 */
exports.getDeviseById = async (req, res) => {
  try {
    const { id } = req.params;
    const devise = await Devise.findByPk(id);
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    
    res.json(devise);
  } catch (error) {
    console.error('❌ Erreur getDeviseById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer la devise principale (CDF)
 */
exports.getDevisePrincipale = async (req, res) => {
  try {
    const devise = await Devise.findOne({
      where: { est_principale: true, actif: true }
    });
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise principale non trouvée' });
    }
    
    res.json(devise);
  } catch (error) {
    console.error('❌ Erreur getDevisePrincipale:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer le taux de change d'une devise par son code
 */
exports.getTauxChange = async (req, res) => {
  try {
    const { code } = req.params;
    const devise = await Devise.findOne({ 
      where: { code: code.toUpperCase(), actif: true } 
    });
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    
    res.json({
      code: devise.code,
      nom: devise.nom,
      symbole: devise.symbole,
      taux_achat: devise.taux_achat,
      taux_vente: devise.taux_vente,
      taux_moyen: devise.taux_moyen,
      date_taux: devise.date_taux,
      source: devise.source,
      variation: devise.variation
    });
  } catch (error) {
    console.error('❌ Erreur getTauxChange:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer une nouvelle devise
 */
exports.createDevise = async (req, res) => {
  try {
    const { code, nom, symbole, taux_achat, taux_vente, source } = req.body;
    
    // Vérifier si la devise existe déjà
    const existing = await Devise.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ message: 'Cette devise existe déjà' });
    }

    // Calculer le taux moyen
    const taux_moyen = (parseFloat(taux_achat) + parseFloat(taux_vente)) / 2;

    const devise = await Devise.create({
      code: code.toUpperCase(),
      nom,
      symbole,
      taux_achat,
      taux_vente,
      taux_moyen,
      source: source || 'BCC',
      date_taux: new Date(),
      est_principale: code.toUpperCase() === 'CDF',
      actif: true
    });

    res.status(201).json(devise);
  } catch (error) {
    console.error('❌ Erreur createDevise:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Mettre à jour le taux de change d'une devise
 */
exports.updateTauxChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { taux_achat, taux_vente, source, date_taux } = req.body;

    const devise = await Devise.findByPk(id);
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }

    const ancienTaux = parseFloat(devise.taux_moyen);
    const nouveauTauxMoyen = (parseFloat(taux_achat) + parseFloat(taux_vente)) / 2;
    const variation = ((nouveauTauxMoyen - ancienTaux) / ancienTaux) * 100;

    await devise.update({
      taux_achat,
      taux_vente,
      taux_moyen: nouveauTauxMoyen,
      source: source || devise.source,
      date_taux: date_taux || new Date(),
      variation: variation
    });

    // Mettre à jour les actifs concernés (optionnel)
    await Actif.update(
      { taux_change_utilisation: nouveauTauxMoyen },
      { where: { devise_id: id } }
    );

    res.json({
      message: 'Taux mis à jour avec succès',
      devise: {
        code: devise.code,
        taux_achat: devise.taux_achat,
        taux_vente: devise.taux_vente,
        taux_moyen: devise.taux_moyen,
        variation: devise.variation,
        date_taux: devise.date_taux
      }
    });
  } catch (error) {
    console.error('❌ Erreur updateTauxChange:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Convertir un montant d'une devise vers une autre
 */
exports.convertirDevise = async (req, res) => {
  try {
    const { montant, from, to, devise_id } = req.query;
    
    let deviseSource;
    
    // Récupérer la devise source
    if (devise_id) {
      deviseSource = await Devise.findByPk(devise_id);
    } else if (from) {
      deviseSource = await Devise.findOne({ where: { code: from.toUpperCase() } });
    } else {
      return res.status(400).json({ message: 'Paramètre from ou devise_id requis' });
    }
    
    if (!deviseSource) {
      return res.status(404).json({ message: 'Devise source non trouvée' });
    }
    
    // Convertir en CDF d'abord
    const montantEnCDF = parseFloat(montant) * parseFloat(deviseSource.taux_moyen);
    
    // Si la devise cible est CDF, retourner directement
    if (to && to.toUpperCase() === 'CDF') {
      return res.json({
        montant_original: parseFloat(montant),
        devise_source: deviseSource.code,
        taux_change: deviseSource.taux_moyen,
        montant_cdf: montantEnCDF,
        date_taux: deviseSource.date_taux
      });
    }
    
    // Si besoin de convertir vers une autre devise
    if (to) {
      const deviseCible = await Devise.findOne({ where: { code: to.toUpperCase() } });
      if (!deviseCible) {
        return res.status(404).json({ message: 'Devise cible non trouvée' });
      }
      
      const montantConverti = montantEnCDF / parseFloat(deviseCible.taux_moyen);
      
      return res.json({
        montant_original: parseFloat(montant),
        devise_source: deviseSource.code,
        devise_cible: deviseCible.code,
        taux_source: deviseSource.taux_moyen,
        taux_cible: deviseCible.taux_moyen,
        montant_converti: montantConverti,
        montant_cdf: montantEnCDF,
        date_taux_source: deviseSource.date_taux,
        date_taux_cible: deviseCible.date_taux
      });
    }
    
    // Par défaut, retourner en CDF
    res.json({
      montant_original: parseFloat(montant),
      devise_source: deviseSource.code,
      symbole: deviseSource.symbole,
      taux_change: deviseSource.taux_moyen,
      montant_cdf: montantEnCDF,
      date_taux: deviseSource.date_taux
    });
    
  } catch (error) {
    console.error('❌ Erreur convertirDevise:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Convertir un montant en CDF (devise locale)
 */
exports.convertirEnCDF = async (req, res) => {
  try {
    const { montant, devise_id, from } = req.query;
    
    let devise;
    
    if (devise_id) {
      devise = await Devise.findByPk(devise_id);
    } else if (from) {
      devise = await Devise.findOne({ where: { code: from.toUpperCase() } });
    } else {
      return res.status(400).json({ message: 'Paramètre devise_id ou from requis' });
    }
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }

    const montantCDF = parseFloat(montant) * parseFloat(devise.taux_moyen);
    
    res.json({
      montant_original: parseFloat(montant),
      devise_originale: devise.code,
      symbole: devise.symbole,
      taux_change: parseFloat(devise.taux_moyen),
      montant_cdf: montantCDF,
      date_taux: devise.date_taux,
      source: devise.source
    });
  } catch (error) {
    console.error('❌ Erreur convertirEnCDF:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Désactiver une devise
 */
exports.desactiverDevise = async (req, res) => {
  try {
    const { id } = req.params;
    const devise = await Devise.findByPk(id);
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    
    if (devise.est_principale) {
      return res.status(400).json({ message: 'Impossible de désactiver la devise principale' });
    }
    
    // Vérifier si la devise est utilisée par des actifs
    const actifsCount = await Actif.count({ where: { devise_id: id } });
    if (actifsCount > 0) {
      return res.status(400).json({ 
        message: `Cette devise est utilisée par ${actifsCount} actif(s). Impossible de la désactiver.` 
      });
    }
    
    await devise.update({ actif: false });
    
    res.json({ message: 'Devise désactivée avec succès' });
  } catch (error) {
    console.error('❌ Erreur desactiverDevise:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Forcer la mise à jour des taux (manuel)
 */
exports.forceUpdate = async (req, res) => {
  try {
    const TauxService = require('../services/tauxService');
    const result = await TauxService.manualUpdate();
    
    res.json({ 
      message: 'Mise à jour des taux effectuée avec succès',
      result 
    });
  } catch (error) {
    console.error('❌ Erreur forceUpdate:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des taux' });
  }
};

/**
 * Récupérer l'historique des taux d'une devise
 */
exports.getHistoriqueTaux = async (req, res) => {
  try {
    const { code } = req.params;
    // À implémenter si vous avez une table d'historique
    // Pour l'instant, retourner le taux actuel
    const devise = await Devise.findOne({ 
      where: { code: code.toUpperCase() } 
    });
    
    if (!devise) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    
    res.json({
      devise: devise.code,
      taux_actuel: devise.taux_moyen,
      date_taux: devise.date_taux,
      variation: devise.variation,
      // Historique à ajouter si vous avez une table TauxHistorique
      historique: []
    });
  } catch (error) {
    console.error('❌ Erreur getHistoriqueTaux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};