// backend/src/routes/conformityAIRoutes.js
const express = require('express');
const router = express.Router();
const conformityAIService = require('../services/conformityAIService');
const { Actif, CategorieAmortissement, Amortissement, Contrat, User } = require('../models');
const { Op } = require('sequelize');

/**
 * POST /api/conformity-ai/ask
 * Questionner l'IA sur la conformité
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, contexte } = req.body;
    
    if (!question || question.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Veuillez poser une question'
      });
    }
    
    console.log(`🤖 Question IA Conformité: ${question}`);
    
    const response = await conformityAIService.generateResponse(question, contexte || {});
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erreur route IA conformité:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/conformity-ai/indicateurs
 * Liste des indicateurs disponibles
 */
router.get('/indicateurs', (req, res) => {
  try {
    const knowledgeBase = conformityAIService.getKnowledgeBase();
    const indicateurs = Object.keys(knowledgeBase.indicateurs).map(nom => ({
      nom,
      description: knowledgeBase.indicateurs[nom].description,
      seuil: knowledgeBase.indicateurs[nom].seuil
    }));
    
    res.json({
      success: true,
      indicateurs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conformity-ai/seuils
 * Explication des niveaux de conformité
 */
router.get('/seuils', (req, res) => {
  try {
    const knowledgeBase = conformityAIService.getKnowledgeBase();
    res.json({
      success: true,
      seuils: knowledgeBase.seuils
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conformity-ai/dashboard
 * Tableau de bord de conformité
 */
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const totalActifs = await Actif.count({ where: { actif: true } });
    const actifsSansCategorie = await Actif.count({ where: { actif: true, categorie_id: null } });
    const actifsAvecCategorie = totalActifs - actifsSansCategorie;
    const actifsInactifs = await Actif.count({ where: { actif: false } });
    
    const tauxConformite = totalActifs > 0 ? ((actifsAvecCategorie / totalActifs) * 100).toFixed(1) : 0;
    
    const categories = await CategorieAmortissement.findAll({
      attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans'],
      include: [{
        model: Actif,
        as: 'actifCategorie',
        where: { actif: true },
        required: false,
        attributes: ['id', 'code', 'nom']
      }]
    });
    
    const contratsExpirant = await Contrat.count({
      where: { date_fin: { [Op.between]: [now, dans30Jours] } }
    });
    
    const licencesExpirant = await Actif.count({
      where: {
        type_immobilisation: 'incorporel',
        date_validite: { [Op.between]: [now, dans30Jours] },
        actif: true
      }
    });
    
    const actifsAvecAmort = await Amortissement.findAll({
      attributes: ['actif_id'],
      group: ['actif_id']
    });
    const actifIdsAvecAmort = actifsAvecAmort.map(a => a.actif_id);
    const actifsSansAmort = await Actif.count({
      where: {
        actif: true,
        id: { [Op.notIn]: actifIdsAvecAmort }
      }
    });
    
    const actifsEnMaintenance = await Actif.count({
      where: {
        actif: true,
        etat: { [Op.in]: ['reparation', 'hors_service'] }
      }
    });
    
    const totalUtilisateurs = await User.count();
    const utilisateurs2FA = await User.count({ where: { deux_facteurs_actif: true } });
    const taux2FA = totalUtilisateurs > 0 ? (utilisateurs2FA / totalUtilisateurs) * 100 : 0;
    
    let scoreSante = 100;
    if (totalActifs > 0) {
      if (actifsSansCategorie > 0) scoreSante -= (actifsSansCategorie / totalActifs) * 30;
      if (actifsSansAmort > 0) scoreSante -= (actifsSansAmort / totalActifs) * 20;
      if (actifsEnMaintenance > 0) scoreSante -= (actifsEnMaintenance / totalActifs) * 15;
    }
    if (contratsExpirant > 0) scoreSante -= Math.min(20, contratsExpirant * 5);
    if (licencesExpirant > 0) scoreSante -= Math.min(15, licencesExpirant * 5);
    if (taux2FA < 80) scoreSante -= (80 - taux2FA) / 4;
    scoreSante = Math.max(0, Math.min(100, Math.floor(scoreSante)));
    
    let niveauRisque = "faible";
    if (scoreSante < 60) niveauRisque = "critique";
    else if (scoreSante < 80) niveauRisque = "moyen";
    
    res.json({
      success: true,
      data: {
        score_global: scoreSante,
        niveau_risque: niveauRisque,
        total_actifs: totalActifs,
        actifs_avec_categorie: actifsAvecCategorie,
        actifs_sans_categorie: actifsSansCategorie,
        actifs_inactifs: actifsInactifs,
        taux_conformite: parseFloat(tauxConformite),
        alertes: {
          contrats_expirant: contratsExpirant,
          licences_expirant: licencesExpirant,
          actifs_sans_amortissement: actifsSansAmort,
          actifs_en_maintenance: actifsEnMaintenance
        },
        categories: categories.map(c => ({
          id: c.id,
          code: c.code_categorie,
          nom: c.nom_categorie,
          duree_vie: c.duree_vie_ans,
          nb_actifs: c.actifCategorie?.length || 0
        })),
        securite: {
          taux_2fa: parseFloat(taux2FA.toFixed(1)),
          utilisateurs_2fa: utilisateurs2FA,
          total_utilisateurs: totalUtilisateurs
        },
        date_analyse: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur dashboard conformité:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors du chargement du tableau de bord'
    });
  }
});

// ✅ ROUTE ALIAS POUR LE FRONTEND (correspond à /api/conformite/dashboard)
/**
 * GET /api/conformite/dashboard
 * Alias pour le tableau de bord de conformité (compatibilité frontend)
 */
router.get('/conformite/dashboard', async (req, res) => {
  try {
    // Rediriger vers la route /dashboard
    const now = new Date();
    const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const totalActifs = await Actif.count({ where: { actif: true } });
    const actifsSansCategorie = await Actif.count({ where: { actif: true, categorie_id: null } });
    const actifsAvecCategorie = totalActifs - actifsSansCategorie;
    const actifsInactifs = await Actif.count({ where: { actif: false } });
    
    const tauxConformite = totalActifs > 0 ? ((actifsAvecCategorie / totalActifs) * 100).toFixed(1) : 0;
    
    const categories = await CategorieAmortissement.findAll({
      attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans'],
      include: [{
        model: Actif,
        as: 'actifCategorie',
        where: { actif: true },
        required: false,
        attributes: ['id', 'code', 'nom']
      }]
    });
    
    const contratsExpirant = await Contrat.count({
      where: { date_fin: { [Op.between]: [now, dans30Jours] } }
    });
    
    const licencesExpirant = await Actif.count({
      where: {
        type_immobilisation: 'incorporel',
        date_validite: { [Op.between]: [now, dans30Jours] },
        actif: true
      }
    });
    
    const actifsAvecAmort = await Amortissement.findAll({
      attributes: ['actif_id'],
      group: ['actif_id']
    });
    const actifIdsAvecAmort = actifsAvecAmort.map(a => a.actif_id);
    const actifsSansAmort = await Actif.count({
      where: {
        actif: true,
        id: { [Op.notIn]: actifIdsAvecAmort }
      }
    });
    
    const actifsEnMaintenance = await Actif.count({
      where: {
        actif: true,
        etat: { [Op.in]: ['reparation', 'hors_service'] }
      }
    });
    
    const totalUtilisateurs = await User.count();
    const utilisateurs2FA = await User.count({ where: { deux_facteurs_actif: true } });
    const taux2FA = totalUtilisateurs > 0 ? (utilisateurs2FA / totalUtilisateurs) * 100 : 0;
    
    let scoreSante = 100;
    if (totalActifs > 0) {
      if (actifsSansCategorie > 0) scoreSante -= (actifsSansCategorie / totalActifs) * 30;
      if (actifsSansAmort > 0) scoreSante -= (actifsSansAmort / totalActifs) * 20;
      if (actifsEnMaintenance > 0) scoreSante -= (actifsEnMaintenance / totalActifs) * 15;
    }
    if (contratsExpirant > 0) scoreSante -= Math.min(20, contratsExpirant * 5);
    if (licencesExpirant > 0) scoreSante -= Math.min(15, licencesExpirant * 5);
    if (taux2FA < 80) scoreSante -= (80 - taux2FA) / 4;
    scoreSante = Math.max(0, Math.min(100, Math.floor(scoreSante)));
    
    let niveauRisque = "faible";
    if (scoreSante < 60) niveauRisque = "critique";
    else if (scoreSante < 80) niveauRisque = "moyen";
    
    res.json({
      success: true,
      data: {
        score_global: scoreSante,
        niveau_risque: niveauRisque,
        total_actifs: totalActifs,
        actifs_avec_categorie: actifsAvecCategorie,
        actifs_sans_categorie: actifsSansCategorie,
        actifs_inactifs: actifsInactifs,
        taux_conformite: parseFloat(tauxConformite),
        alertes: {
          contrats_expirant: contratsExpirant,
          licences_expirant: licencesExpirant,
          actifs_sans_amortissement: actifsSansAmort,
          actifs_en_maintenance: actifsEnMaintenance
        },
        categories: categories.map(c => ({
          id: c.id,
          code: c.code_categorie,
          nom: c.nom_categorie,
          duree_vie: c.duree_vie_ans,
          nb_actifs: c.actifCategorie?.length || 0
        })),
        securite: {
          taux_2fa: parseFloat(taux2FA.toFixed(1)),
          utilisateurs_2fa: utilisateurs2FA,
          total_utilisateurs: totalUtilisateurs
        },
        date_analyse: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur dashboard conformité:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors du chargement du tableau de bord'
    });
  }
});

module.exports = router;