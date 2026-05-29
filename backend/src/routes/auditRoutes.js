// backend/src/routes/auditRoutes.js

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// ==================== ROUTES PRINCIPALES ====================

/**
 * Récupérer tous les logs avec pagination et filtres
 * GET /api/audit-logs
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getAllLogs);

/**
 * Récupérer les logs pour un actif spécifique
 * GET /api/audit-logs/actif/:actifId
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/actif/:actifId', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getLogsForActif);

/**
 * Récupérer les logs pour un enregistrement spécifique
 * GET /api/audit-logs/:tableName/:recordId
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/:tableName/:recordId', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getLogsForRecord);

/**
 * Exporter les logs (CSV)
 * GET /api/audit-logs/export
 * ✅ Accessible à: admin, gestionnaire (export sécurisé)
 */
router.get('/export', authorize('admin', 'gestionnaire'), auditController.exportLogs);

// ==================== ROUTES COMPLÉMENTAIRES ====================

/**
 * Récupérer les statistiques des logs
 * GET /api/audit-logs/stats
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/stats', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getStats);

/**
 * Récupérer l'activité d'un utilisateur spécifique (format simplifié)
 * GET /api/audit-logs/user/:userId/activity
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/user/:userId/activity', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getUserActivity);

/**
 * Récupérer les logs détaillés d'un utilisateur spécifique
 * GET /api/audit-logs/user/:userId/logs
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/user/:userId/logs', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getUserLogs);

/**
 * Récupérer l'activité récente de l'utilisateur connecté
 * GET /api/audit-logs/me/activity
 * ✅ Accessible à tous les utilisateurs authentifiés (pour voir leur propre activité)
 */
router.get('/me/activity', auditController.getMyActivity);

/**
 * Rechercher des logs par mot-clé
 * GET /api/audit-logs/search?q=mot
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/search', authorize('admin', 'auditeur', 'gestionnaire'), auditController.searchLogs);

/**
 * Résumé d'activité par période
 * GET /api/audit-logs/summary?periode=30d
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/summary', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getActivitySummary);

/**
 * Nettoyer les logs anciens (admin uniquement)
 * DELETE /api/audit-logs/clean?days=90
 * ✅ Accessible uniquement à: admin (opération sensible)
 */
router.delete('/clean', authorize('admin'), auditController.cleanOldLogs);

// ==================== ALIAS POUR COMPATIBILITÉ AVEC LE FRONTEND ====================
// Ces alias permettent de supporter les URLs /api/audit/* (sans le -logs)

/**
 * Alias pour /api/audit/user/:userId/activity
 * GET /api/audit/user/:userId/activity
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/user/:userId/activity', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getUserActivity);

/**
 * Alias pour /api/audit/user/:userId/logs
 * GET /api/audit/user/:userId/logs
 * ✅ Accessible à: admin, auditeur, gestionnaire
 */
router.get('/user/:userId/logs', authorize('admin', 'auditeur', 'gestionnaire'), auditController.getUserLogs);

/**
 * Alias pour /api/audit/me/activity
 * GET /api/audit/me/activity
 * ✅ Accessible à tous les utilisateurs authentifiés
 */
router.get('/me/activity', auditController.getMyActivity);

module.exports = router;