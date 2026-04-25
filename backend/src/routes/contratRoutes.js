// backend/src/routes/contratRoutes.js

const express = require('express');
const router = express.Router();
const contratController = require('../controllers/contratController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const { uploadDocument } = require('../middleware/upload');

// ==================== ROUTE DE TEST (PUBLIQUE) ====================
// ⚠️ À mettre AVANT authMiddleware pour éviter l'authentification
router.get('/test-direct', (req, res) => {
  console.log('✅ Route test-direct appelée');
  res.json({ message: 'Route test OK', timestamp: new Date().toISOString() });
});

// ==================== VÉRIFICATION DES FONCTIONS ====================
console.log('🔍 Vérification des fonctions contratController:');
console.log('  - getAllContrats:', typeof contratController.getAllContrats);
console.log('  - getContrats:', typeof contratController.getContrats);
console.log('  - getContratById:', typeof contratController.getContratById);
console.log('  - createContrat:', typeof contratController.createContrat);
console.log('  - updateContrat:', typeof contratController.updateContrat);
console.log('  - deleteContrat:', typeof contratController.deleteContrat);
console.log('  - getFacture:', typeof contratController.getFacture);
console.log('  - downloadFacture:', typeof contratController.downloadFacture);
console.log('  - uploadContratFile:', typeof contratController.uploadContratFile);
console.log('  - regenerateFacture:', typeof contratController.regenerateFacture);
console.log('  - downloadContratFile:', typeof contratController.downloadContratFile);
console.log('  - renouvelerContrat:', typeof contratController.renouvelerContrat);
console.log('  - resilierContrat:', typeof contratController.resilierContrat);
console.log('  - exportContratsPDF:', typeof contratController.exportContratsPDF);
console.log('  - getContratsByActif:', typeof contratController.getContratsByActif);
console.log('  - createContratForActif:', typeof contratController.createContratForActif);

// ==================== TOUTES LES ROUTES PROTÉGÉES ====================
// Authentification requise pour toutes les routes suivantes
router.use(authMiddleware);

// ==================== ROUTES GÉNÉRIQUES ====================
// ✅ AJOUT DE 'gestionnaire' À LA ROUTE GET

/**
 * Récupérer tous les contrats avec filtres
 * GET /api/contrats
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getAllContrats);

/**
 * Créer un nouveau contrat
 * POST /api/contrats
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/', authorize('admin', 'juridique'), contratController.createContrat);

// ==================== ROUTES D'EXPORT ====================
// ✅ AJOUT DE 'gestionnaire' À LA ROUTE GET

/**
 * Exporter la liste des contrats en PDF
 * GET /api/contrats/export/pdf
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/export/pdf', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.exportContratsPDF);

// ==================== ROUTES SPÉCIFIQUES ====================
// ✅ AJOUT DE 'gestionnaire' À LA ROUTE GET

/**
 * Récupérer un contrat par son ID
 * GET /api/contrats/:id
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:id', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getContratById);

/**
 * Mettre à jour un contrat
 * PUT /api/contrats/:id
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.put('/:id', authorize('admin', 'juridique'), contratController.updateContrat);

/**
 * Supprimer un contrat
 * DELETE /api/contrats/:id
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.delete('/:id', authorize('admin', 'juridique'), contratController.deleteContrat);

// ==================== ROUTES FACTURE ====================
// ✅ AJOUT DE 'gestionnaire' AUX ROUTES GET

/**
 * Obtenir les informations de la facture (métadonnées)
 * GET /api/contrats/:id/facture
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:id/facture', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getFacture);

/**
 * Télécharger la facture PDF
 * GET /api/contrats/:id/facture/download
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:id/facture/download', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.downloadFacture);

/**
 * Régénérer la facture pour un contrat existant
 * POST /api/contrats/:id/regenerate-facture
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/:id/regenerate-facture', authorize('admin', 'juridique'), contratController.regenerateFacture);

// ==================== ROUTES UPLOAD ====================

/**
 * Upload d'un fichier pour un contrat
 * POST /api/contrats/:contratId/upload
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/:contratId/upload', authorize('admin', 'juridique'), uploadDocument.single('fichier'), contratController.uploadContratFile);

// ==================== ROUTES COMPLÉMENTAIRES ====================
// ✅ AJOUT DE 'gestionnaire' À LA ROUTE GET

/**
 * Télécharger un fichier de contrat
 * GET /api/contrats/:contratId/fichier/:fichierId
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:contratId/fichier/:fichierId', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.downloadContratFile);

/**
 * Renouveler un contrat
 * POST /api/contrats/:id/renouveler
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/:id/renouveler', authorize('admin', 'juridique'), contratController.renouvelerContrat);

/**
 * Résilier un contrat
 * POST /api/contrats/:id/resilier
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/:id/resilier', authorize('admin', 'juridique'), contratController.resilierContrat);

// ==================== ROUTES POUR LES CONTRATS LIÉS À UN ACTIF ====================
// ✅ AJOUT DE 'gestionnaire' À LA ROUTE GET

/**
 * Récupérer tous les contrats d'un actif spécifique
 * GET /api/contrats/actif/:actifId
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/actif/:actifId', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getContratsByActif);

/**
 * Créer un contrat pour un actif spécifique
 * POST /api/contrats/actif/:actifId
 * Accessible à : admin, juridique (pas informatique, pas gestionnaire)
 */
router.post('/actif/:actifId', authorize('admin', 'juridique'), contratController.createContratForActif);

module.exports = router;