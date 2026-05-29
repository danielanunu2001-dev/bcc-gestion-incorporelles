// backend/src/routes/contratRoutes.js

const express = require('express');
const router = express.Router();
const contratController = require('../controllers/contratController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const { uploadDocument } = require('../middleware/upload');
const { body, param, query, validationResult } = require('express-validator');

// ==================== VALIDATIONS IA ====================

/**
 * Validations pour la création assistée par IA
 */
const validateAIAssistedCreate = [
  body('conversation').isArray().withMessage('La conversation doit être un tableau'),
  body('conversation.*.role').isIn(['user', 'assistant']).withMessage('Rôle invalide'),
  body('conversation.*.content').isString().notEmpty().withMessage('Contenu du message requis'),
  body('actif_id').optional().isUUID().withMessage('ID actif invalide')
];

/**
 * Validations pour la création d'un contrat
 */
const validateCreateContrat = [
  body('numero_contrat').notEmpty().withMessage('Le numéro de contrat est requis').trim(),
  body('fournisseur').notEmpty().withMessage('Le fournisseur est requis').trim(),
  body('date_debut').isISO8601().withMessage('Date de début invalide'),
  body('date_fin').isISO8601().withMessage('Date de fin invalide'),
  body('montant').isFloat({ min: 0 }).withMessage('Le montant doit être un nombre positif'),
  body('type').optional().isString(),
  body('description').optional().isString()
];

// ==================== MIDDLEWARE DE GESTION DES ERREURS DE VALIDATION ====================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Erreurs de validation:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

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
console.log('  - generateContratWithAI:', typeof contratController.generateContratWithAI);
console.log('  - validateContratDraft:', typeof contratController.validateContratDraft);
console.log('  - suggestContratCorrections:', typeof contratController.suggestContratCorrections);
console.log('  - createContratFromDraft:', typeof contratController.createContratFromDraft);

// ==================== TOUTES LES ROUTES PROTÉGÉES ====================
// Authentification requise pour toutes les routes suivantes
router.use(authMiddleware);

// ==================== ✅ NOUVELLES ROUTES IA POUR CONTRATS ====================

/**
 * @swagger
 * /api/contrats/ia/generate:
 *   post:
 *     summary: Générer un contrat via conversation avec l'IA
 *     tags: [Contrats, IA]
 *     description: L'IA analyse la conversation et propose une structure de contrat valide
 */
router.post(
  '/ia/generate',
  validateAIAssistedCreate,
  handleValidationErrors,
  authorize('admin', 'juridique', 'comptable', 'informatique', 'gestionnaire'),
  contratController.generateContratWithAI
);

/**
 * @swagger
 * /api/contrats/ia/validate:
 *   post:
 *     summary: Valider un brouillon de contrat avec l'IA
 *     tags: [Contrats, IA]
 *     description: L'IA analyse un brouillon de contrat et détecte les anomalies
 */
router.post(
  '/ia/validate',
  authorize('admin', 'juridique', 'comptable', 'informatique', 'gestionnaire'),
  contratController.validateContratDraft
);

/**
 * @swagger
 * /api/contrats/ia/suggest:
 *   post:
 *     summary: Suggérer des corrections pour un brouillon de contrat
 *     tags: [Contrats, IA]
 *     description: L'IA propose des corrections spécifiques pour chaque anomalie détectée
 */
router.post(
  '/ia/suggest',
  authorize('admin', 'juridique', 'comptable', 'informatique', 'gestionnaire'),
  contratController.suggestContratCorrections
);

/**
 * @swagger
 * /api/contrats/ia/create-from-draft:
 *   post:
 *     summary: Créer un contrat à partir d'un brouillon validé par l'IA
 *     tags: [Contrats, IA]
 *     description: Après validation IA, crée le contrat en base de données
 */
router.post(
  '/ia/create-from-draft',
  validateCreateContrat,
  handleValidationErrors,
  authorize('admin', 'juridique', 'comptable', 'informatique', 'gestionnaire'),
  contratController.createContratFromDraft
);

// ==================== ROUTES GÉNÉRIQUES ====================

/**
 * Récupérer tous les contrats avec filtres
 * GET /api/contrats
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getAllContrats);

/**
 * Créer un nouveau contrat
 * POST /api/contrats
 * Accessible à : admin, juridique
 */
router.post('/', validateCreateContrat, handleValidationErrors, authorize('admin', 'juridique'), contratController.createContrat);

// ==================== ROUTES D'EXPORT ====================

/**
 * Exporter la liste des contrats en PDF
 * GET /api/contrats/export/pdf
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/export/pdf', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.exportContratsPDF);

// ==================== ROUTES SPÉCIFIQUES ====================

/**
 * Récupérer un contrat par son ID
 * GET /api/contrats/:id
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:id', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getContratById);

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
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/:contratId/fichier/:fichierId', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.downloadContratFile);

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
 * Accessible à : admin, juridique, comptable, auditeur, informatique, gestionnaire
 */
router.get('/actif/:actifId', authorize('admin', 'juridique', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), contratController.getContratsByActif);

/**
 * Créer un contrat pour un actif spécifique
 * POST /api/contrats/actif/:actifId
 * Accessible à : admin, juridique
 */
router.post('/actif/:actifId', validateCreateContrat, handleValidationErrors, authorize('admin', 'juridique'), contratController.createContratForActif);

module.exports = router;