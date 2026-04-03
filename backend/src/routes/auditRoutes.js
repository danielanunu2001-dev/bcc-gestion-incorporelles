const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// Seuls admin et auditeur peuvent consulter les logs
router.use(authorize('admin', 'auditeur'));

// ==================== ROUTES PRINCIPALES ====================

/**
 * Récupérer tous les logs avec pagination et filtres
 * GET /api/audit
 */
router.get('/', auditController.getAllLogs);

/**
 * Récupérer les logs pour un actif spécifique
 * GET /api/audit/actif/:actifId
 */
router.get('/actif/:actifId', auditController.getLogsForActif);

/**
 * Récupérer les logs pour un enregistrement spécifique (table générique)
 * GET /api/audit/:tableName/:recordId
 */
router.get('/:tableName/:recordId', auditController.getLogsForRecord);

/**
 * Exporter les logs (CSV/Excel)
 * GET /api/audit/export
 */
router.get('/export', authorize('admin', 'auditeur'), auditController.exportLogs);

// ==================== ROUTES COMPLÉMENTAIRES ====================

/**
 * Récupérer les statistiques des logs
 * GET /api/audit/stats
 */
router.get('/stats', auditController.getStats);

/**
 * Récupérer l'activité d'un utilisateur spécifique
 * GET /api/audit/user/:userId
 */
router.get('/user/:userId', auditController.getUserActivity);

/**
 * Récupérer l'activité récente de l'utilisateur connecté
 * GET /api/audit/me/activity
 */
router.get('/me/activity', auditController.getMyActivity);

/**
 * Rechercher des logs par mot-clé
 * GET /api/audit/search?q=mot
 */
router.get('/search', auditController.searchLogs);

/**
 * Résumé d'activité par période
 * GET /api/audit/summary?periode=30d
 */
router.get('/summary', auditController.getActivitySummary);

/**
 * Nettoyer les logs anciens (admin uniquement)
 * DELETE /api/audit/clean?days=90
 */
router.delete('/clean', authorize('admin'), auditController.cleanOldLogs);

module.exports = router;