// backend/src/routes/reevaluationRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const reevaluationController = require('../controllers/reevaluationController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent une authentification et les droits admin/comptable
router.use(authMiddleware);
router.use(authorize('admin', 'comptable'));

// ==================== ROUTES POUR LES RÉÉVALUATIONS D'UN ACTIF ====================

/**
 * Récupérer toutes les réévaluations d'un actif
 * GET /api/actifs/:actifId/reevaluations
 */
router.get('/', reevaluationController.getReevaluations);

/**
 * Créer une nouvelle réévaluation
 * POST /api/actifs/:actifId/reevaluations
 */
router.post('/', reevaluationController.createReevaluation);

// ==================== ROUTES POUR UNE RÉÉVALUATION SPÉCIFIQUE ====================

/**
 * Récupérer une réévaluation par son ID
 * GET /api/actifs/:actifId/reevaluations/:reevaluationId
 */
router.get('/:reevaluationId', reevaluationController.getReevaluationById);

/**
 * Mettre à jour une réévaluation
 * PUT /api/actifs/:actifId/reevaluations/:reevaluationId
 */
router.put('/:reevaluationId', reevaluationController.updateReevaluation);

/**
 * Supprimer une réévaluation
 * DELETE /api/actifs/:actifId/reevaluations/:reevaluationId
 */
router.delete('/:reevaluationId', reevaluationController.deleteReevaluation);

module.exports = router;