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