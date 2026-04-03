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

/**
 * Récupérer tous les contrats avec filtres
 * GET /api/contrats
 * Accessible à : admin, juridique, comptable
 */
router.get('/', authorize('admin', 'juridique', 'comptable'), contratController.getAllContrats);

/**
 * Créer un nouveau contrat
 * POST /api/contrats
 * Accessible à : admin, juridique
 */
router.post('/', authorize('admin', 'juridique'), contratController.createContrat);

// ==================== ROUTES D'EXPORT ====================

/**
 * Exporter la liste des contrats en PDF
 * GET /api/contrats/export/pdf
 * Accessible à : admin, juridique, comptable
 */
router.get('/export/pdf', authorize('admin', 'juridique', 'comptable'), contratController.exportContratsPDF);

// ==================== ROUTES SPÉCIFIQUES ====================

/**
 * Récupérer un contrat par son ID
 * GET /api/contrats/:id
 * Accessible à : admin, juridique, comptable
 */
router.get('/:id', authorize('admin', 'juridique', 'comptable'), contratController.getContratById);

/**
 * Mettre à jour un contrat
 * PUT /api/contrats/:id
 * Accessible à : admin, juridique
 */
router.put('/:id', authorize('admin', 'juridique'), contratController.updateContrat);

/**
 * Supprimer un contrat
 * DELETE /api/contrats/:id
 * Accessible à : admin, juridique
 */
router.delete('/:id', authorize('admin', 'juridique'), contratController.deleteContrat);

// ==================== ROUTES FACTURE ====================

/**
 * Obtenir les informations de la facture (métadonnées)
 * GET /api/contrats/:id/facture
 * Accessible à : admin, juridique, comptable
 */
router.get('/:id/facture', authorize('admin', 'juridique', 'comptable'), contratController.getFacture);

/**
 * Télécharger la facture PDF
 * GET /api/contrats/:id/facture/download
 * Accessible à : admin, juridique, comptable
 */
router.get('/:id/facture/download', authorize('admin', 'juridique', 'comptable'), contratController.downloadFacture);

/**
 * Régénérer la facture pour un contrat existant
 * POST /api/contrats/:id/regenerate-facture
 * Accessible à : admin, juridique
 */
router.post('/:id/regenerate-facture', authorize('admin', 'juridique'), contratController.regenerateFacture);

// ==================== ROUTES UPLOAD ====================

/**
 * Upload d'un fichier pour un contrat
 * POST /api/contrats/:contratId/upload
 * Accessible à : admin, juridique
 */
router.post('/:contratId/upload', authorize('admin', 'juridique'), uploadDocument.single('fichier'), contratController.uploadContratFile);

// ==================== ROUTES COMPLÉMENTAIRES ====================

/**
 * Télécharger un fichier de contrat
 * GET /api/contrats/:contratId/fichier/:fichierId
 * Accessible à : admin, juridique, comptable
 */
router.get('/:contratId/fichier/:fichierId', authorize('admin', 'juridique', 'comptable'), contratController.downloadContratFile);

/**
 * Renouveler un contrat
 * POST /api/contrats/:id/renouveler
 * Accessible à : admin, juridique
 */
router.post('/:id/renouveler', authorize('admin', 'juridique'), contratController.renouvelerContrat);

/**
 * Résilier un contrat
 * POST /api/contrats/:id/resilier
 * Accessible à : admin, juridique
 */
router.post('/:id/resilier', authorize('admin', 'juridique'), contratController.resilierContrat);

// ==================== ROUTES POUR LES CONTRATS LIÉS À UN ACTIF ====================

/**
 * Récupérer tous les contrats d'un actif spécifique
 * GET /api/contrats/actif/:actifId
 * Accessible à : admin, juridique, comptable
 */
router.get('/actif/:actifId', authorize('admin', 'juridique', 'comptable'), contratController.getContratsByActif);

/**
 * Créer un contrat pour un actif spécifique
 * POST /api/contrats/actif/:actifId
 * Accessible à : admin, juridique
 */
router.post('/actif/:actifId', authorize('admin', 'juridique'), contratController.createContratForActif);

module.exports = router;