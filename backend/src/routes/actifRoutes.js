// backend/src/routes/actifRoutes.js

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const actifController = require('../controllers/actifController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// ==================== VALIDATIONS ====================

/**
 * Validations pour la création d'un actif
 */
const validateCreateActif = [
  body('code').notEmpty().withMessage('Le code est requis').trim(),
  body('nom').notEmpty().withMessage('Le nom est requis').trim(),
  body('type').optional().isString(),
  body('date_acquisition').isISO8601().withMessage('Date d\'acquisition invalide'),
  body('cout_acquisition').isFloat({ min: 0 }).withMessage('Le coût doit être un nombre positif'),
  body('devise_code').optional().isString().isIn(['CDF', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CNY']),
  body('valeur_residuelle').optional().isFloat({ min: 0 }),
  body('duree_utile_ans').isInt({ min: 1 }).withMessage('La durée doit être au moins 1 an'),
  body('mode_amortissement').isIn(['lineaire', 'degressif']),
  body('type_immobilisation').optional().isIn(['corporel', 'incorporel']),
  body('categorie_id').optional().isUUID(),
  body('localisation').optional().isString(),
  body('affectation').optional().isString(),
  body('etat').optional().isIn(['neuf', 'bon', 'usage', 'moyen', 'reparation', 'hors_service']),
  body('numero_inventaire').optional().isString(),
  body('numero_serie').optional().isString(),
  body('fournisseur').optional().isString(),
  body('date_validite').optional({ nullable: true }).isISO8601().withMessage('Date de validité invalide'),
  body('description').optional().isString(),
  body('compte_comptable').optional().isString(),
  body('taux_amortissement').optional().isFloat({ min: 0, max: 100 })
];

/**
 * Validations pour la mise à jour d'un actif
 */
const validateUpdateActif = [
  param('id').isUUID().withMessage('ID actif invalide'),
  body('code').optional().notEmpty().trim(),
  body('nom').optional().notEmpty().trim(),
  body('date_acquisition').optional().isISO8601(),
  body('cout_acquisition').optional().isFloat({ min: 0 }),
  body('duree_utile_ans').optional().isInt({ min: 1 }),
  body('mode_amortissement').optional().isIn(['lineaire', 'degressif']),
  body('localisation').optional().isString(),
  body('affectation').optional().isString(),
  body('etat').optional().isIn(['neuf', 'bon', 'usage', 'moyen', 'reparation', 'hors_service']),
  body('date_validite').optional({ nullable: true }).isISO8601().withMessage('Date de validité invalide'),
  body('devise_code').optional().isString().isIn(['CDF', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CNY']),
  body('montant_devise').optional().isFloat({ min: 0 }),
  body('taux_change_utilisation').optional().isFloat({ min: 0 })
];

/**
 * Validations pour l'enregistrement d'une sortie
 */
const validateSortie = [
  param('id').isUUID(),
  body('date_sortie').isISO8601().withMessage('Date de sortie invalide'),
  body('type_sortie').isIn(['cession', 'reforme', 'perte', 'don']).withMessage('Type de sortie invalide'),
  body('prix_cession').optional().isFloat({ min: 0 }),
  body('motif_sortie').optional().isString().trim()
];

/**
 * Validations pour les dépréciations
 */
const validateDepreciation = [
  param('id').isUUID(),
  body('date_test').isISO8601(),
  body('valeur_recouvrable').isFloat({ min: 0 }),
  body('commentaire').optional().isString()
];

/**
 * Validations pour les contrats
 */
const validateContrat = [
  param('id').isUUID(),
  body('numero_contrat').notEmpty().withMessage('Numéro de contrat requis'),
  body('fournisseur').notEmpty().withMessage('Fournisseur requis'),
  body('date_debut').isISO8601(),
  body('date_fin').isISO8601(),
  body('montant').isFloat({ min: 0 }),
  body('type').optional().isString()
];

/**
 * Validations pour les mouvements
 */
const validateMouvement = [
  param('id').isUUID(),
  body('type_mouvement').isIn(['entree', 'transfert_interne', 'maintenance', 'reparation', 'mise_hors_service', 'cession', 'don', 'reforme']).withMessage('Type de mouvement invalide'),
  body('date_mouvement').isISO8601().withMessage('Date de mouvement invalide'),
  body('description').optional().isString().trim()
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

// ==================== ROUTES SPÉCIFIQUES (SANS PARAMETRE :id) ====================
// ⚠️ IMPORTANT : Ces routes doivent être placées AVANT les routes avec :id

/**
 * @swagger
 * /api/actifs/preview-conversion:
 *   get:
 *     summary: Prévisualiser la conversion d'un montant en CDF
 *     tags: [Actifs, Devises]
 */
router.get(
  '/preview-conversion', 
  query('montant').isFloat({ min: 0 }),
  query('devise').isIn(['CDF', 'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CNY']),
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  handleValidationErrors,
  actifController.previewConversion
);

/**
 * @swagger
 * /api/actifs/code/{code}:
 *   get:
 *     summary: Récupérer un actif par son code QR ou numéro d'inventaire
 *     tags: [Actifs, Inventaire]
 */
router.get(
  '/code/:code', 
  param('code').notEmpty().withMessage('Code QR requis'),
  authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'), 
  handleValidationErrors,
  actifController.getActifByCode
);

// ==================== ROUTES DE RAPPORTS ====================

router.get(
  '/rapports/etat-immobilisations', 
  query('date_arrete').optional().isISO8601(),
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  handleValidationErrors,
  actifController.etatImmobilisations
);

router.get(
  '/rapports/tableau-amortissements', 
  query('exercice').optional().isInt({ min: 2000, max: 2100 }),
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  handleValidationErrors,
  actifController.tableauAmortissements
);

router.get(
  '/rapports/stats', 
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  actifController.getStats
);

router.get(
  '/rapports/etat-par-categorie', 
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  actifController.getEtatParCategorie
);

router.get(
  '/rapports/etat-par-localisation', 
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  actifController.getEtatParLocalisation
);

router.get(
  '/rapports/etat-par-service', 
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  actifController.getEtatParService
);

router.get(
  '/rapports/amortissement-previsionnel', 
  query('annee_debut').optional().isInt(),
  query('annee_fin').optional().isInt(),
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  handleValidationErrors,
  actifController.getAmortissementPrevisionnelVsRealise
);

router.get(
  '/rapports/suivi-investissements', 
  query('annee').optional().isInt(),
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  handleValidationErrors,
  actifController.getSuiviInvestissements
);

router.get(
  '/rapports/alertes', 
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), 
  actifController.getAlertes
);

// ==================== ROUTES PRINCIPALES CRUD ====================

/**
 * @swagger
 * /api/actifs:
 *   get:
 *     summary: Récupérer tous les actifs
 *     tags: [Actifs]
 */
router.get(
  '/', 
  authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'), 
  actifController.getAllActifs
);

/**
 * @swagger
 * /api/actifs:
 *   post:
 *     summary: Créer un nouvel actif
 *     tags: [Actifs]
 */
router.post(
  '/', 
  validateCreateActif,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  actifController.createActif
);

// ==================== ROUTES AVEC PARAMETRE :id (DOIVENT ÊTRE APRÈS LES ROUTES SPÉCIFIQUES) ====================

/**
 * @swagger
 * /api/actifs/{id}:
 *   get:
 *     summary: Récupérer un actif par son ID
 *     tags: [Actifs]
 */
router.get(
  '/:id', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'), 
  actifController.getActifById
);

/**
 * @swagger
 * /api/actifs/{id}:
 *   put:
 *     summary: Mettre à jour un actif
 *     tags: [Actifs]
 */
router.put(
  '/:id', 
  validateUpdateActif,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire', 'inventoriste'),
  actifController.updateActif
);

/**
 * @swagger
 * /api/actifs/{id}:
 *   delete:
 *     summary: Supprimer un actif
 *     tags: [Actifs]
 */
router.delete(
  '/:id', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.deleteActif
);

// ==================== ROUTES SPÉCIFIQUES AUX AMORTISSEMENTS ====================

router.get(
  '/:id/amortissements', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.getAmortissements
);

router.post(
  '/:id/recalculer', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.recalculerAmortissements
);

// ==================== ROUTES SPÉCIFIQUES AUX CONTRATS ====================

router.get(
  '/:id/contrats', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.getContrats
);

router.post(
  '/:id/contrats', 
  validateContrat,
  handleValidationErrors,
  authorize('admin', 'comptable', 'juridique'),
  actifController.createContrat
);

router.put(
  '/contrats/:contratId', 
  param('contratId').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'juridique'),
  actifController.updateContrat
);

router.delete(
  '/contrats/:contratId', 
  param('contratId').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'juridique'),
  actifController.deleteContrat
);

// ==================== ROUTES SPÉCIFIQUES AUX DÉPRÉCIATIONS ====================

router.get(
  '/:id/depreciations', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.getDepreciations
);

router.post(
  '/:id/depreciations', 
  validateDepreciation,
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.createDepreciation
);

// ==================== ROUTE POUR ENREGISTRER UNE SORTIE ====================

router.post(
  '/:id/sortie', 
  validateSortie,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique'),
  actifController.enregistrerSortie
);

// ==================== ROUTES DE FACTURES ====================

router.get(
  '/:id/facture', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.getFacture
);

router.get(
  '/:id/facture/download', 
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.downloadFacture
);

// ==================== ROUTES SPÉCIFIQUES AUX MOUVEMENTS ====================

/**
 * @swagger
 * /api/actifs/{id}/mouvements:
 *   get:
 *     summary: Récupérer les mouvements d'un actif
 *     tags: [Actifs, Mouvements]
 */
router.get(
  '/:id/mouvements',
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { Mouvement } = require('../models');
      
      const mouvements = await Mouvement.findAll({
        where: { actif_id: id },
        order: [['date_mouvement', 'DESC']]
      });
      
      res.json(mouvements);
    } catch (error) {
      console.error('❌ Erreur getMouvements:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des mouvements' });
    }
  }
);

/**
 * @swagger
 * /api/actifs/{id}/mouvements:
 *   post:
 *     summary: Créer un mouvement pour un actif
 *     tags: [Actifs, Mouvements]
 */
router.post(
  '/:id/mouvements',
  validateMouvement,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type_mouvement, date_mouvement, description } = req.body;
      const { Mouvement } = require('../models');
      
      const mouvement = await Mouvement.create({
        actif_id: id,
        type_mouvement,
        date_mouvement,
        description: description || null,
        statut: 'brouillon',
        created_by: req.user.id
      });
      
      res.status(201).json(mouvement);
    } catch (error) {
      console.error('❌ Erreur createMouvement:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la création du mouvement' });
    }
  }
);

/**
 * @swagger
 * /api/actifs/{id}/mouvements/{mouvementId}:
 *   put:
 *     summary: Modifier un mouvement
 *     tags: [Actifs, Mouvements]
 */
router.put(
  '/:id/mouvements/:mouvementId',
  param('id').isUUID(),
  param('mouvementId').isUUID(),
  body('statut').optional().isIn(['brouillon', 'valide', 'annule']),
  body('description').optional().isString(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  async (req, res) => {
    try {
      const { id, mouvementId } = req.params;
      const { statut, description } = req.body;
      const { Mouvement } = require('../models');
      
      const mouvement = await Mouvement.findOne({
        where: { id: mouvementId, actif_id: id }
      });
      
      if (!mouvement) {
        return res.status(404).json({ message: 'Mouvement non trouvé' });
      }
      
      const updateData = {};
      if (statut !== undefined) updateData.statut = statut;
      if (description !== undefined) updateData.description = description;
      
      if (statut === 'valide') {
        updateData.date_validation = new Date();
        updateData.valide_par = req.user.id;
      }
      
      if (statut === 'annule') {
        updateData.date_annulation = new Date();
        updateData.annule_par = req.user.id;
      }
      
      await mouvement.update({
        ...updateData,
        updated_by: req.user.id
      });
      
      res.json(mouvement);
    } catch (error) {
      console.error('❌ Erreur updateMouvement:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la modification du mouvement' });
    }
  }
);

/**
 * @swagger
 * /api/actifs/{id}/mouvements/{mouvementId}:
 *   delete:
 *     summary: Supprimer un mouvement
 *     tags: [Actifs, Mouvements]
 */
router.delete(
  '/:id/mouvements/:mouvementId',
  param('id').isUUID(),
  param('mouvementId').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable'),
  async (req, res) => {
    try {
      const { id, mouvementId } = req.params;
      const { Mouvement } = require('../models');
      
      const mouvement = await Mouvement.findOne({
        where: { id: mouvementId, actif_id: id }
      });
      
      if (!mouvement) {
        return res.status(404).json({ message: 'Mouvement non trouvé' });
      }
      
      await mouvement.destroy();
      
      res.json({ message: 'Mouvement supprimé avec succès' });
    } catch (error) {
      console.error('❌ Erreur deleteMouvement:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la suppression du mouvement' });
    }
  }
);

module.exports = router;