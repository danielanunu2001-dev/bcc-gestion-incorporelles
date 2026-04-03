// backend/src/routes/actifRoutes.js

const express = require('express');
const router = express.Router();
const actifController = require('../controllers/actifController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// ==================== ROUTES PRINCIPALES ====================

// Routes GET accessibles à plusieurs rôles
router.get('/', authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique'), actifController.getAllActifs);
router.get('/:id', authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique'), actifController.getActifById);
router.get('/code/:code', authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique'), actifController.getActifByCode);

// ✅ ROUTE DE PRÉVISUALISATION DE CONVERSION (avant les routes avec paramètres)
router.get('/preview-conversion', authorize('admin', 'comptable'), actifController.previewConversion);

// Routes de modification (admin et comptable uniquement)
router.post('/', authorize('admin', 'comptable'), actifController.createActif);
router.put('/:id', authorize('admin', 'comptable'), actifController.updateActif);
router.delete('/:id', authorize('admin', 'comptable'), actifController.deleteActif);

// ==================== ROUTES SPÉCIFIQUES AUX ACTIFS ====================

// Routes spécifiques aux amortissements
router.get('/:id/amortissements', authorize('admin', 'comptable'), actifController.getAmortissements);
router.post('/:id/recalculer', authorize('admin', 'comptable'), actifController.recalculerAmortissements);

// Routes spécifiques aux contrats
router.get('/:id/contrats', authorize('admin', 'comptable', 'juridique'), actifController.getContrats);
router.post('/:id/contrats', authorize('admin', 'comptable', 'juridique'), actifController.createContrat);
router.put('/contrats/:contratId', authorize('admin', 'comptable', 'juridique'), actifController.updateContrat);
router.delete('/contrats/:contratId', authorize('admin', 'comptable', 'juridique'), actifController.deleteContrat);

// Routes spécifiques aux dépréciations
router.get('/:id/depreciations', authorize('admin', 'comptable'), actifController.getDepreciations);
router.post('/:id/depreciations', authorize('admin', 'comptable'), actifController.createDepreciation);

// Route pour enregistrer une sortie
router.post('/:id/sortie', authorize('admin', 'comptable'), actifController.enregistrerSortie);

// ==================== ROUTES DE FACTURES ====================

/**
 * Routes pour la gestion des factures d'actifs
 * Accessibles aux rôles : admin, comptable, auditeur
 */

// Récupérer la facture d'un actif
router.get('/:id/facture', authorize('admin', 'comptable', 'auditeur'), actifController.getFacture);

// Télécharger la facture PDF d'un actif
router.get('/:id/facture/download', authorize('admin', 'comptable', 'auditeur'), actifController.downloadFacture);

// ==================== ROUTES DE RAPPORTS DE BASE ====================

// Rapports généraux accessibles à plusieurs rôles
router.get('/rapports/etat-immobilisations', authorize('admin', 'comptable', 'auditeur'), actifController.etatImmobilisations);
router.get('/rapports/tableau-amortissements', authorize('admin', 'comptable', 'auditeur'), actifController.tableauAmortissements);
router.get('/rapports/stats', authorize('admin', 'comptable', 'auditeur'), actifController.getStats);

// ==================== ROUTES DE RAPPORTS ANALYTIQUES ====================

/**
 * Rapports d'état des immobilisations par catégorie/localisation/service
 * Accessibles aux rôles : admin, comptable, auditeur
 */
router.get('/rapports/etat-par-categorie', authorize('admin', 'comptable', 'auditeur'), actifController.getEtatParCategorie);
router.get('/rapports/etat-par-localisation', authorize('admin', 'comptable', 'auditeur'), actifController.getEtatParLocalisation);
router.get('/rapports/etat-par-service', authorize('admin', 'comptable', 'auditeur'), actifController.getEtatParService);

/**
 * Rapports de suivi financier
 * Accessibles aux rôles : admin, comptable uniquement (données sensibles)
 */
router.get('/rapports/amortissement-previsionnel', authorize('admin', 'comptable'), actifController.getAmortissementPrevisionnelVsRealise);
router.get('/rapports/suivi-investissements', authorize('admin', 'comptable'), actifController.getSuiviInvestissements);

/**
 * Rapports d'alertes
 * Accessibles aux rôles : admin, comptable, auditeur
 */
router.get('/rapports/alertes', authorize('admin', 'comptable', 'auditeur'), actifController.getAlertes);

module.exports = router;