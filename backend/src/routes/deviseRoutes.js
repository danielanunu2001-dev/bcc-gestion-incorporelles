// backend/src/routes/deviseRoutes.js

const express = require('express');
const router = express.Router();
const deviseController = require('../controllers/deviseController');

// ✅ IMPORT CORRECT
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// ==================== ROUTES STATIQUES (SANS PARAMÈTRE) ====================
// ⚠️ IMPORTANT : Ces routes DOIVENT être AVANT les routes avec paramètres (:id)

/**
 * Récupérer la devise principale (CDF)
 * GET /api/devises/principale
 */
router.get('/principale', authorize('admin', 'comptable', 'auditeur'), deviseController.getDevisePrincipale);

/**
 * Convertir un montant d'une devise à une autre
 * GET /api/devises/convertir?montant=100&from=USD&to=CDF
 */
router.get('/convertir', authorize('admin', 'comptable'), deviseController.convertirDevise);

/**
 * Convertir un montant en CDF (devise locale)
 * GET /api/devises/convertir-en-cdf?montant=100&from=USD
 */
router.get('/convertir-en-cdf', authorize('admin', 'comptable'), deviseController.convertirEnCDF);

// ==================== NOUVELLES ROUTES API TEMPS RÉEL ====================

/**
 * Récupérer les taux en temps réel depuis l'API Frankfurter
 * GET /api/devises/taux-reels
 */
router.get('/taux-reels', authorize('admin', 'comptable', 'auditeur'), deviseController.getTauxTempsReel);

/**
 * Récupérer toutes les devises avec leurs taux (format pour affichage)
 * GET /api/devises/affichage
 */
router.get('/affichage', authorize('admin', 'comptable', 'auditeur'), deviseController.getTauxPourAffichage);

/**
 * Récupérer la liste des providers Frankfurter
 * GET /api/devises/providers
 */
router.get('/providers', authorize('admin', 'comptable', 'auditeur'), deviseController.getProviders);

/**
 * Forcer le rafraîchissement des taux depuis l'API Frankfurter
 * POST /api/devises/rafraichir-taux
 */
router.post('/rafraichir-taux', authorize('admin'), deviseController.rafraichirTaux);

/**
 * Mettre à jour manuellement le taux USD (admin uniquement)
 * PUT /api/devises/usd/taux
 */
router.put('/usd/taux', authorize('admin'), deviseController.updateUSDRate);

// ==================== ROUTES AVEC PARAMÈTRES ====================

/**
 * Récupérer le taux de change d'une devise par son code
 * GET /api/devises/taux/:code
 */
router.get('/taux/:code', authorize('admin', 'comptable'), deviseController.getTauxChange);

/**
 * Récupérer toutes les devises
 * GET /api/devises
 */
router.get('/', authorize('admin', 'comptable', 'auditeur'), deviseController.getAllDevises);

/**
 * Récupérer une devise par son ID
 * GET /api/devises/:id
 * ⚠️ Cette route DOIT être la DERNIÈRE des routes GET
 */
router.get('/:id', authorize('admin', 'comptable', 'auditeur'), deviseController.getDeviseById);

// ==================== ROUTES DE GESTION (POST/PUT/DELETE) ====================

/**
 * Créer une nouvelle devise
 * POST /api/devises
 */
router.post('/', authorize('admin'), deviseController.createDevise);

/**
 * Mettre à jour le taux de change d'une devise
 * PUT /api/devises/:id/taux
 */
router.put('/:id/taux', authorize('admin', 'comptable'), deviseController.updateTauxChange);

/**
 * Désactiver une devise
 * DELETE /api/devises/:id
 */
router.delete('/:id', authorize('admin'), deviseController.desactiverDevise);

module.exports = router;