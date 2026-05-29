// backend/src/routes/currencyRoutes.js

const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');

// GET /api/currencies/taux-reels - Récupérer les taux en CDF
router.get('/taux-reels', async (req, res) => {
  try {
    const rates = await currencyService.getRatesInCDF();
    
    if (rates) {
      res.json({
        success: true,
        data: rates,
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Impossible de récupérer les taux de change'
      });
    }
  } catch (error) {
    console.error('Erreur route taux-reels:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/currencies/list - Récupérer la liste des devises disponibles
router.get('/list', async (req, res) => {
  try {
    const currencies = await currencyService.getAvailableCurrencies();
    res.json({
      success: true,
      data: currencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération liste devises'
    });
  }
});

// GET /api/currencies/rate/:base/:quote - Récupérer un taux spécifique
router.get('/rate/:base/:quote', async (req, res) => {
  try {
    const { base, quote } = req.params;
    const rate = await currencyService.getSpecificRate(base.toUpperCase(), quote.toUpperCase());
    
    if (rate) {
      res.json({ success: true, data: rate });
    } else {
      res.status(404).json({ success: false, message: 'Taux non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/currencies/refresh - Forcer le rafraîchissement du cache
router.post('/refresh', async (req, res) => {
  currencyService.invalidateCache();
  const rates = await currencyService.getRatesInCDF();
  res.json({
    success: true,
    message: 'Cache invalidé',
    data: rates
  });
});

// GET /api/currencies/providers - Récupérer les providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await currencyService.getProviders();
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur récupération providers' });
  }
});

module.exports = router;