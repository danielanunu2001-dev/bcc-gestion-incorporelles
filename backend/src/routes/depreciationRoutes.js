const express = require('express');
const router = express.Router({ mergeParams: true });
const depreciationController = require('../controllers/depreciationController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// Toutes les routes nécessitent les rôles admin ou comptable
router.use(authorize('admin', 'comptable'));

// ==================== ROUTES POUR LES DÉPRÉCIATIONS D'UN ACTIF ====================

/**
 * Récupérer toutes les dépréciations d'un actif
 * GET /api/actifs/:actifId/depreciations
 */
router.get('/', depreciationController.getDepreciations);

/**
 * Créer une nouvelle dépréciation pour un actif
 * POST /api/actifs/:actifId/depreciations
 */
router.post('/', depreciationController.createDepreciation);

// ==================== ROUTES POUR UNE DÉPRÉCIATION SPÉCIFIQUE ====================

/**
 * Récupérer une dépréciation spécifique par son ID
 * GET /api/actifs/:actifId/depreciations/:id
 */
router.get('/:id', depreciationController.getDepreciationById);

/**
 * Mettre à jour une dépréciation
 * PUT /api/actifs/:actifId/depreciations/:id
 */
router.put('/:id', depreciationController.updateDepreciation);

/**
 * Supprimer une dépréciation
 * DELETE /api/actifs/:actifId/depreciations/:id
 */
router.delete('/:id', depreciationController.deleteDepreciation);

module.exports = router;