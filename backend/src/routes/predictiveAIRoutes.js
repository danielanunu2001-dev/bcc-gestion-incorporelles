// backend/src/routes/predictiveAIRoutes.js
const express = require('express');
const router = express.Router();
const predictiveAIService = require('../services/predictiveAIService');

/**
 * POST /api/predictive/investissements
 * Analyse prédictive des investissements
 */
router.post('/investissements', async (req, res) => {
  try {
    const { donnees, historique, contexteMarche } = req.body;
    
    if (!donnees || !historique) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données historiques requises' 
      });
    }
    
    const prediction = await predictiveAIService.analyserInvestissementsPrevision(
      donnees,
      historique,
      contexteMarche || {}
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Erreur prédiction investissements:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * POST /api/predictive/amortissements
 * Analyse prédictive du plan d'amortissement
 */
router.post('/amortissements', async (req, res) => {
  try {
    const { donnees, historique, tauxActualisation } = req.body;
    
    const prediction = await predictiveAIService.analyserAmortissementPrevision(
      donnees,
      historique || [],
      tauxActualisation || 0.1
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Erreur prédiction amortissements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/predictive/immobilisations
 * Analyse prédictive des immobilisations
 */
router.post('/immobilisations', async (req, res) => {
  try {
    const { donnees, historique, tendancesMarche } = req.body;
    
    const prediction = await predictiveAIService.analyserImmobilisationsPrevision(
      donnees,
      historique || [],
      tendancesMarche || {}
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Erreur prédiction immobilisations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/predictive/scenarios
 * Analyse comparative de scénarios
 */
router.post('/scenarios', async (req, res) => {
  try {
    const { situationActuelle, options } = req.body;
    
    const analyse = await predictiveAIService.analyserScenarios(
      situationActuelle,
      options
    );
    
    res.json({
      success: true,
      data: analyse
    });
  } catch (error) {
    console.error('Erreur analyse scénarios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;