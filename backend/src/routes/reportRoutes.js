const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// ==================== ROUTES DE RAPPORTS ====================

/**
 * État des immobilisations (avec regroupement optionnel)
 */
router.get(
  '/etat-immobilisations',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.etatImmobilisations
);

/**
 * Tableau des amortissements par exercice
 */
router.get(
  '/tableau-amortissements',
  authorize('admin', 'comptable'),
  reportController.tableauAmortissements
);

/**
 * Fiche détaillée d'un actif
 */
router.get(
  '/fiche-actif/:id',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.ficheActif
);

// ==================== RAPPORTS ANALYTIQUES ====================

/**
 * État des immobilisations par catégorie
 */
router.get(
  '/etat-par-categorie',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.getEtatParCategorie
);

/**
 * État des immobilisations par localisation
 */
router.get(
  '/etat-par-localisation',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.getEtatParLocalisation
);

/**
 * État des immobilisations par service
 */
router.get(
  '/etat-par-service',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.getEtatParService
);

/**
 * Plan d'amortissement prévisionnel vs réalisé
 */
router.get(
  '/amortissement-previsionnel',
  authorize('admin', 'comptable'),
  reportController.getAmortissementPrevisionnelVsRealise
);

/**
 * Suivi des investissements (budget vs réalisé)
 */
router.get(
  '/suivi-investissements',
  authorize('admin', 'comptable'),
  reportController.getSuiviInvestissements
);

/**
 * Alertes : fin de licence, échéance maintenance, etc.
 */
router.get(
  '/alertes',
  authorize('admin', 'comptable', 'auditeur'),
  reportController.getAlertes
);

// ==================== EXPORTS ====================

/**
 * Export Excel
 */
router.get(
  '/export-excel',
  authorize('admin', 'comptable'),
  reportController.exportExcel
);

/**
 * Export PDF
 */
router.get(
  '/export-pdf',
  authorize('admin', 'comptable'),
  reportController.exportPDF
);

module.exports = router;