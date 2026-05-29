// backend/src/validators/actifValidator.js

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware pour vérifier les erreurs de validation
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  // ✅ Extraire uniquement les messages sous forme de strings
  const errorMessages = errors.array().map(err => err.msg);
  const firstErrorMessage = errorMessages[0] || 'Erreur de validation';
  
  console.log('❌ Erreurs de validation:', errors.array());
  
  // ✅ Retourner une réponse simple avec un message string
  return res.status(400).json({
    success: false,
    message: firstErrorMessage
  });
};

/**
 * Validation pour la création d'un actif
 */
const validateActif = [
  // ===== CHAMPS OBLIGATOIRES =====
  body('code')
    .notEmpty().withMessage('Le code est requis')
    .isLength({ min: 3, max: 50 }).withMessage('Le code doit contenir entre 3 et 50 caractères')
    .matches(/^[A-Z0-9\-_]+$/i).withMessage('Le code ne peut contenir que des lettres, chiffres, tirets et underscores'),
  
  body('nom')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 200 }).withMessage('Le nom doit contenir entre 2 et 200 caractères'),
  
  body('type')
    .notEmpty().withMessage('Le type est requis')
    .isIn(['logiciel', 'brevet', 'licence', 'fonds_commercial', 'materiel', 'vehicule', 'bâtiment', 'terrain', 'autres'])
    .withMessage('Type d\'actif invalide'),
  
  body('date_acquisition')
    .notEmpty().withMessage('La date d\'acquisition est requise')
    .isISO8601().withMessage('Format de date invalide (YYYY-MM-DD)'),
  
  // ===== CHAMPS OBLIGATOIRES AVEC VALEUR PAR DÉFAUT =====
  body('cout_acquisition')
    .notEmpty().withMessage('Le coût d\'acquisition est requis')
    .isFloat({ min: 0 }).withMessage('Le coût d\'acquisition doit être un nombre positif'),
  
  body('devise_id')
    .notEmpty().withMessage('La devise est requise')
    .isInt().withMessage('ID devise invalide'),
  
  body('montant_devise')
    .notEmpty().withMessage('Le montant en devise est requis')
    .isFloat({ min: 0 }).withMessage('Le montant en devise doit être un nombre positif'),
  
  body('duree_utile_ans')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 50 }).withMessage('La durée utile doit être comprise entre 1 et 50 ans')
    .default(5),
  
  body('mode_amortissement')
    .optional({ nullable: true })
    .isIn(['lineaire', 'degressif']).withMessage('Le mode d\'amortissement doit être "lineaire" ou "degressif"')
    .default('lineaire'),
  
  // ===== CHAMPS OPTIONNELS (ACCEPTENT NULL) =====
  body('valeur_residuelle')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('La valeur résiduelle doit être un nombre positif')
    .default(0),
  
  body('taux_amortissement')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(value => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      const num = parseFloat(value);
      if (isNaN(num)) return undefined;
      // ✅ Forcer entre 0 et 100
      return Math.min(100, Math.max(0, num));
    })
    .custom(value => {
      if (value === undefined) return true;
      return value >= 0 && value <= 100;
    })
    .withMessage('Le taux d\'amortissement doit être compris entre 0 et 100%'),
  
  body('categorie_id')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(value => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      return value;
    }),
  
  body('type_immobilisation')
    .optional({ nullable: true })
    .isIn(['corporel', 'incorporel']).withMessage('Le type d\'immobilisation doit être "corporel" ou "incorporel"')
    .default('incorporel'),
  
  body('compte_comptable')
    .optional()
    .isLength({ max: 20 }).withMessage('Le compte comptable ne peut pas dépasser 20 caractères'),
  
  body('etat')
    .optional()
    .isIn(['neuf', 'bon', 'reparation', 'hors_service']).withMessage('État invalide')
    .default('bon'),
  
  // ===== CHAMPS TEXTE OPTIONNELS =====
  body('description').optional().isLength({ max: 2000 }),
  body('numero_facture').optional().isLength({ max: 100 }),
  body('fournisseur').optional().isLength({ max: 200 }),
  body('numero_inventaire').optional().isLength({ max: 50 }),
  body('localisation').optional().isLength({ max: 255 }),
  body('affectation').optional().isLength({ max: 255 }),
  body('marque').optional().isLength({ max: 100 }),
  body('modele').optional().isLength({ max: 100 }),
  body('numero_serie').optional().isLength({ max: 100 }),
  body('support').optional().isLength({ max: 100 }),
  
  // ===== CHAMPS DATE OPTIONNELS =====
  body('date_validite')
    .optional({ nullable: true })
    .isISO8601().withMessage('Format de date de validité invalide'),
  
  body('nombre_utilisateurs')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Le nombre d\'utilisateurs doit être un entier positif'),
  
  body('devise_code')
    .optional({ nullable: true })
    .isIn(['CDF', 'USD', 'EUR', 'GBP', 'CAD']).withMessage('Code devise invalide'),
  
  body('taux_change_utilisation')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Le taux de change doit être positif'),
  
  // ===== VALIDATION PERSONNALISÉE =====
  body().custom((value, { req }) => {
    const cout = req.body.cout_acquisition;
    const montantDevise = req.body.montant_devise;
    
    if ((!cout || cout === '') && (!montantDevise || montantDevise === '')) {
      throw new Error('Veuillez fournir soit le coût d\'acquisition, soit le montant en devise');
    }
    
    return true;
  }),
  
  // ✅ Exécuter la validation
  validate
];

/**
 * Validation pour la mise à jour d'un actif
 */
const validateActifUpdate = [
  param('id').isUUID().withMessage('ID actif invalide'),
  
  body('code').optional().isLength({ min: 3, max: 50 }),
  body('nom').optional().isLength({ min: 2, max: 200 }),
  body('type').optional().isIn(['logiciel', 'brevet', 'licence', 'fonds_commercial', 'materiel', 'vehicule', 'bâtiment', 'terrain', 'autres']),
  body('date_acquisition').optional().isISO8601(),
  body('cout_acquisition').optional().isFloat({ min: 0 }),
  body('duree_utile_ans').optional().isInt({ min: 1, max: 50 }),
  body('mode_amortissement').optional().isIn(['lineaire', 'degressif']),
  body('taux_amortissement').optional({ nullable: true }).isFloat({ min: 0, max: 100 }),
  body('categorie_id').optional({ nullable: true }),
  body('devise_id').optional({ nullable: true }).isInt(),
  body('montant_devise').optional({ nullable: true }).isFloat({ min: 0 }),
  body('valeur_residuelle').optional({ nullable: true }).isFloat({ min: 0 }),
  body('localisation').optional().isString(),
  body('affectation').optional().isString(),
  body('etat').optional().isIn(['neuf', 'bon', 'reparation', 'hors_service']),
  body('date_validite').optional({ nullable: true }).isISO8601(),
  
  validate
];

/**
 * Validation pour l'ID paramètre
 */
const validateIdParam = [
  param('id').isUUID().withMessage('ID actif invalide'),
  validate
];

/**
 * Validation pour la conversion de devise
 */
const validateConversion = [
  query('montant').isFloat({ min: 0 }).withMessage('Montant invalide'),
  query('devise').isIn(['CDF', 'USD', 'EUR', 'GBP', 'CAD']).withMessage('Devise invalide'),
  query('date').optional().isISO8601(),
  validate
];

/**
 * Validation pour la recherche/pagination
 */
const validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['logiciel', 'brevet', 'licence', 'fonds_commercial', 'materiel', 'vehicule', 'bâtiment', 'terrain', 'autres']),
  query('typeImmobilisation').optional().isIn(['corporel', 'incorporel']),
  query('statut').optional().isIn(['actif', 'inactif']),
  query('recherche').optional().isLength({ max: 100 }),
  validate
];

/**
 * Validation pour la création de contrat
 */
const validateContrat = [
  param('id').isUUID(),
  body('numero_contrat').notEmpty().withMessage('Numéro de contrat requis'),
  body('fournisseur').notEmpty().withMessage('Fournisseur requis'),
  body('date_debut').isISO8601(),
  body('date_fin').isISO8601(),
  body('montant').isFloat({ min: 0 }),
  body('type').optional().isString(),
  validate
];

/**
 * Validation pour la sortie d'actif
 */
const validateSortie = [
  param('id').isUUID(),
  body('date_sortie').isISO8601(),
  body('type_sortie').isIn(['cession', 'reforme', 'perte', 'don']),
  body('prix_cession').optional().isFloat({ min: 0 }),
  body('motif_sortie').optional().isString(),
  validate
];

/**
 * Validation pour la dépréciation
 */
const validateDepreciation = [
  param('id').isUUID(),
  body('date_test').isISO8601(),
  body('valeur_recouvrable').isFloat({ min: 0 }),
  body('commentaire').optional().isString(),
  validate
];

/**
 * Validation pour l'IA (génération de brouillon)
 */
const validateAIGenerate = [
  body('conversation').isArray().withMessage('La conversation doit être un tableau'),
  body('conversation.*.role').isIn(['user', 'assistant']),
  body('conversation.*.content').isString().notEmpty(),
  validate
];

/**
 * Validation pour le brouillon IA
 */
const validateAIDraft = [
  body('draft').isObject().withMessage('Le brouillon doit être un objet'),
  validate
];

module.exports = {
  validate,
  validateActif,
  validateActifUpdate,
  validateIdParam,
  validateConversion,
  validateQueryParams,
  validateContrat,
  validateSortie,
  validateDepreciation,
  validateAIGenerate,
  validateAIDraft
};