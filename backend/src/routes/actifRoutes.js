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
 * Nettoie le taux d'amortissement (convertit 3333 -> 33.33)
 */
const sanitizeTaux = (value) => {
  if (value === undefined || value === null || value === '') return null;
  let num = parseFloat(value);
  if (isNaN(num)) return null;
  // Si la valeur est > 100 (ex: 3333), on divise par 100
  if (num > 100 && num <= 10000) {
    return parseFloat((num / 100).toFixed(2));
  }
  if (num >= 0 && num <= 100) {
    return parseFloat(num.toFixed(2));
  }
  return null;
};

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
  body('taux_amortissement')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeTaux)
    .custom(value => {
      if (value === null) return true;
      return value >= 0 && value <= 100;
    })
    .withMessage('Le taux d\'amortissement doit être compris entre 0 et 100%')
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
  body('taux_change_utilisation').optional().isFloat({ min: 0 }),
  body('taux_amortissement')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeTaux)
    .custom(value => {
      if (value === null) return true;
      return value >= 0 && value <= 100;
    })
    .withMessage('Le taux d\'amortissement doit être compris entre 0 et 100%')
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
 * Validation pour l'annulation de dépréciation
 */
const validateAnnulerDepreciation = [
  param('id').isUUID().withMessage('ID actif invalide')
];

/**
 * Validations pour les réévaluations
 */
const validateCreateReevaluation = [
  param('id').isUUID().withMessage('ID actif invalide'),
  body('date_reevaluation').isISO8601().withMessage('Date de réévaluation invalide'),
  body('nouvelle_valeur').isFloat({ min: 0 }).withMessage('La nouvelle valeur doit être positive'),
  body('nouvelle_duree_ans').optional().isInt({ min: 1, max: 50 }).withMessage('La durée doit être comprise entre 1 et 50 ans'),
  body('nouveau_taux').optional().isFloat({ min: 0, max: 100 }).withMessage('Le taux doit être compris entre 0 et 100%'),
  body('commentaire').optional().isString(),
  body('document_reference').optional().isString()
];

const validateSimulerReevaluation = [
  param('id').isUUID().withMessage('ID actif invalide'),
  body('nouvelle_valeur').isFloat({ min: 0 }).withMessage('La nouvelle valeur doit être positive'),
  body('nouvelle_duree_ans').optional().isInt({ min: 1, max: 50 }).withMessage('La durée doit être comprise entre 1 et 50 ans')
];

const validateAnnulerReevaluation = [
  param('id').isUUID().withMessage('ID actif invalide')
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

/**
 * Validations pour la création assistée par IA
 */
const validateAIAssistedCreate = [
  body('conversation').isArray().withMessage('La conversation doit être un tableau'),
  body('conversation.*.role').isIn(['user', 'assistant']).withMessage('Rôle invalide'),
  body('conversation.*.content').isString().notEmpty().withMessage('Contenu du message requis')
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

// ==================== ROUTES IA ====================

/**
 * @swagger
 * /api/actifs/ia/generate:
 *   post:
 *     summary: Générer un actif via conversation avec l'IA
 *     tags: [Actifs, IA]
 */
router.post(
  '/ia/generate',
  validateAIAssistedCreate,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  actifController.generateActifWithAI
);

/**
 * @swagger
 * /api/actifs/ia/validate:
 *   post:
 *     summary: Valider un brouillon d'actif avec l'IA
 *     tags: [Actifs, IA]
 */
router.post(
  '/ia/validate',
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  actifController.validateDraftWithAI
);

/**
 * @swagger
 * /api/actifs/ia/suggest:
 *   post:
 *     summary: Suggérer des corrections pour un brouillon d'actif
 *     tags: [Actifs, IA]
 */
router.post(
  '/ia/suggest',
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  actifController.suggestCorrections
);

/**
 * @swagger
 * /api/actifs/ia/create-from-draft:
 *   post:
 *     summary: Créer un actif à partir d'un brouillon validé par l'IA
 *     tags: [Actifs, IA]
 */
router.post(
  '/ia/create-from-draft',
  validateCreateActif,
  handleValidationErrors,
  authorize('admin', 'comptable', 'informatique', 'gestionnaire'),
  actifController.createFromAIDraft
);

/**
 * @swagger
 * /api/actifs/ia/anomalies/{id}:
 *   get:
 *     summary: Analyser les anomalies d'un actif existant avec l'IA
 *     tags: [Actifs, IA]
 */
router.get(
  '/ia/anomalies/:id',
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.detectAnomaliesWithAI
);

/**
 * @swagger
 * /api/ai/analyser/{id}:
 *   get:
 *     summary: Analyser un actif avec l'IA (alias)
 *     tags: [IA]
 */
router.get(
  '/ai/analyser/:id',
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.detectAnomaliesWithAI
);

// ✅ NOUVELLE ROUTE: Analyser les amortissements d'un actif
/**
 * @swagger
 * /api/ai/analyser-amortissements:
 *   post:
 *     summary: Analyser les amortissements d'un actif avec l'IA
 *     tags: [IA, Amortissements]
 */
router.post(
  '/ai/analyser-amortissements',
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  async (req, res) => {
    try {
      const { actif, amortissements } = req.body;
      
      if (!actif || !amortissements) {
        return res.status(400).json({
          success: false,
          message: 'Données d\'actif et amortissements requis'
        });
      }
      
      const duree = actif.duree_utile_ans;
      const cout = actif.cout_acquisition;
      const valeurResiduelle = actif.valeur_residuelle || 0;
      const tauxTheorique = 100 / duree;
      
      const anomalies = [];
      const recommandations = [];
      
      if (amortissements.length !== duree) {
        anomalies.push({
          type: 'duree',
          severity: 'high',
          message: `Nombre d'années d'amortissement (${amortissements.length}) différent de la durée utile (${duree} ans)`
        });
        recommandations.push(`Le plan doit comporter exactement ${duree} années d'amortissement`);
      }
      
      let totalAnnuités = 0;
      for (let i = 0; i < amortissements.length; i++) {
        const am = amortissements[i];
        totalAnnuités += am.annuite;
        
        if (Math.abs(am.taux - tauxTheorique) > 0.1) {
          anomalies.push({
            type: 'taux',
            severity: 'medium',
            message: `Taux de l'année ${am.exercice} (${am.taux}%) différent du taux théorique (${tauxTheorique.toFixed(2)}%)`
          });
        }
        
        const annuiteTheorique = (cout - valeurResiduelle) / duree;
        if (Math.abs(am.annuite - annuiteTheorique) > cout * 0.01) {
          anomalies.push({
            type: 'annuite',
            severity: 'medium',
            message: `Annuité ${am.exercice} (${am.annuite.toLocaleString()} FC) différente de l'annuité théorique (${annuiteTheorique.toLocaleString()} FC)`
          });
        }
      }
      
      const totalTheorique = cout - valeurResiduelle;
      if (Math.abs(totalAnnuités - totalTheorique) > 1) {
        anomalies.push({
          type: 'total',
          severity: 'high',
          message: `Total des annuités (${totalAnnuités.toLocaleString()} FC) différent du montant amortissable (${totalTheorique.toLocaleString()} FC)`
        });
      }
      
      const derniereValeur = amortissements[amortissements.length - 1]?.valeur_nette || 0;
      if (derniereValeur > valeurResiduelle) {
        anomalies.push({
          type: 'residuelle',
          severity: 'high',
          message: `Valeur nette finale (${derniereValeur.toLocaleString()} FC) supérieure à la valeur résiduelle (${valeurResiduelle.toLocaleString()} FC)`
        });
      }
      
      const estCoherent = anomalies.length === 0;
      const scoreSante = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 20) - (anomalies.filter(a => a.severity === 'medium').length * 10));
      
      let resume = "";
      if (scoreSante >= 80) {
        resume = "✅ Le plan d'amortissement est cohérent et conforme aux règles comptables.";
      } else if (scoreSante >= 50) {
        resume = "⚠️ Le plan d'amortissement présente quelques incohérences. Des corrections sont recommandées.";
      } else {
        resume = "🔴 Le plan d'amortissement est fortement incohérent. Une correction immédiate est nécessaire.";
      }
      
      if (!estCoherent) {
        recommandations.push(`Recalculer l'amortissement avec les paramètres: durée=${duree} ans, taux=${tauxTheorique.toFixed(2)}%`);
        recommandations.push("Utiliser le bouton 'Recalculer' pour générer un plan correct");
      }
      
      res.json({
        success: true,
        analyse: {
          est_coherent: estCoherent,
          score_sante: scoreSante,
          resume: resume,
          anomalies: anomalies,
          recommandations: recommandations,
          metriques: {
            duree_actuelle: amortissements.length,
            duree_attendue: duree,
            total_annuites: totalAnnuités,
            total_attendu: totalTheorique,
            valeur_residuelle_actuelle: derniereValeur,
            valeur_residuelle_attendue: valeurResiduelle
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur analyse amortissements IA:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ✅ NOUVELLE ROUTE: Analyser les investissements
/**
 * @swagger
 * /api/ai/analyser-investissements:
 *   post:
 *     summary: Analyser les investissements avec l'IA
 *     tags: [IA, Investissements]
 */
router.post(
  '/ai/analyser-investissements',
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  async (req, res) => {
    try {
      const { investissements, periode } = req.body;
      
      if (!investissements || !Array.isArray(investissements)) {
        return res.status(400).json({
          success: false,
          message: 'Données d\'investissements requises'
        });
      }
      
      const totalInvesti = investissements.reduce((sum, inv) => sum + (inv.realise || inv.montant || 0), 0);
      const moyenneParAn = totalInvesti / investissements.length;
      
      let tendance = "stable";
      if (investissements.length >= 2) {
        const dernierAn = investissements[investissements.length - 1]?.realise || 0;
        const avantDernier = investissements[investissements.length - 2]?.realise || 0;
        
        if (dernierAn > avantDernier * 1.2) tendance = "hausse";
        else if (dernierAn < avantDernier * 0.8) tendance = "baisse";
      }
      
      const anneesExceptionnelles = [];
      for (const inv of investissements) {
        const montant = inv.realise || inv.montant || 0;
        if (montant > moyenneParAn * 1.5) {
          anneesExceptionnelles.push({
            annee: inv.annee,
            montant: montant,
            type: "hausse_exceptionnelle"
          });
        } else if (montant < moyenneParAn * 0.5) {
          anneesExceptionnelles.push({
            annee: inv.annee,
            montant: montant,
            type: "baisse_exceptionnelle"
          });
        }
      }
      
      let budgetTotal = 0;
      let realiseTotal = 0;
      
      for (const inv of investissements) {
        const realise = inv.realise || 0;
        const budget = inv.budget || inv.prevision || 0;
        realiseTotal += realise;
        budgetTotal += budget;
      }
      
      const tauxRealisation = budgetTotal > 0 ? (realiseTotal / budgetTotal) * 100 : 0;
      
      const anomalies = [];
      const recommandations = [];
      
      if (tauxRealisation < 80) {
        anomalies.push({
          type: 'budget',
          severity: 'high',
          message: `Taux de réalisation du budget faible (${tauxRealisation.toFixed(1)}%)`
        });
        recommandations.push("Revoir la planification budgétaire des investissements");
      }
      
      if (anneesExceptionnelles.length > 0) {
        anomalies.push({
          type: 'volatilite',
          severity: 'medium',
          message: `${anneesExceptionnelles.length} année(s) avec des investissements exceptionnels`
        });
      }
      
      const scoreSante = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 25));
      
      let resume = "";
      if (scoreSante >= 80) {
        resume = `✅ Les investissements sont bien maîtrisés. Tendance à la ${tendance}.`;
      } else if (scoreSante >= 50) {
        resume = `⚠️ Attention: ${tauxRealisation.toFixed(0)}% du budget réalisé. Tendance à la ${tendance}.`;
      } else {
        resume = `🔴 Situation critique: seulement ${tauxRealisation.toFixed(0)}% du budget réalisé.`;
      }
      
      res.json({
        success: true,
        analyse: {
          est_coherent: scoreSante >= 70,
          score_sante: scoreSante,
          resume: resume,
          anomalies: anomalies,
          recommandations: recommandations,
          tendance: tendance,
          metriques: {
            total_investi: totalInvesti,
            moyenne_annuelle: moyenneParAn,
            taux_realisation: parseFloat(tauxRealisation.toFixed(1)),
            annees_exceptionnelles: anneesExceptionnelles
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur analyse investissements IA:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ✅ NOUVELLE ROUTE: Assistant IA général
/**
 * @swagger
 * /api/ai/assistant:
 *   post:
 *     summary: Poser une question à l'assistant IA
 *     tags: [IA]
 */
router.post(
  '/ai/assistant',
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  async (req, res) => {
    try {
      const { question, actifId } = req.body;
      
      if (!question) {
        return res.status(400).json({
          success: false,
          message: 'Question requise'
        });
      }
      
      const questionLower = question.toLowerCase();
      let reponse = "";
      let suggestions = [];
      
      if (questionLower.includes("taux") && questionLower.includes("amortissement")) {
        reponse = `**💡 Calcul du taux d'amortissement**\n\nLe taux d'amortissement linéaire se calcule avec la formule : Taux = 100 / Durée d'utilité (en années).\n\nExemples :\n- Durée 3 ans → Taux = 33.33%\n- Durée 4 ans → Taux = 25%\n- Durée 5 ans → Taux = 20%\n- Durée 10 ans → Taux = 10%`;
        suggestions = ["Vérifiez la durée d'utilité de vos actifs", "Utilisez les catégories GCEC"];
      } 
      else if (questionLower.includes("categorie") || questionLower.includes("gc")) {
        reponse = `**📂 Catégories d'amortissement GCEC**\n\n| Catégorie | Durée | Taux | Compte |\n|-----------|-------|------|--------|\n| Logiciels | 3 ans | 33.33% | 205 |\n| Matériel informatique | 4 ans | 25% | 2183 |\n| Véhicules | 5 ans | 20% | 2182 |\n| Mobilier | 10 ans | 10% | 2184 |\n| Bâtiments | 20 ans | 5% | 213 |`;
        suggestions = ["Assurez-vous que chaque actif a une catégorie", "Utilisez le recalcul automatique"];
      }
      else {
        reponse = `**🤖 Assistant Comptable GCEC**\n\nJe peux vous aider sur :\n- 📊 Calcul des taux d'amortissement\n- 📂 Catégories d'amortissement\n- 🔍 Détection des anomalies\n- 🔄 Recalcul des amortissements\n- 📈 Suivi des investissements\n\nPosez-moi une question précise !`;
        suggestions = ["Comment calculer le taux d'amortissement ?", "Quelles sont les catégories GCEC ?"];
      }
      
      res.json({
        success: true,
        reponse: reponse,
        suggestions: suggestions,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erreur assistant IA:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ==================== ROUTES AVEC PARAMETRE :id ====================

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

router.delete(
  '/:id/depreciations/last',
  validateAnnulerDepreciation,
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.annulerDepreciation
);

// ==================== ROUTES SPÉCIFIQUES AUX RÉÉVALUATIONS ====================

router.get(
  '/:id/reevaluations',
  param('id').isUUID(),
  handleValidationErrors,
  authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'),
  actifController.getReevaluations
);

router.post(
  '/:id/reevaluations/simuler',
  validateSimulerReevaluation,
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.simulerReevaluation
);

router.post(
  '/:id/reevaluations',
  validateCreateReevaluation,
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.createReevaluation
);

router.delete(
  '/:id/reevaluations/last',
  validateAnnulerReevaluation,
  handleValidationErrors,
  authorize('admin', 'comptable'),
  actifController.annulerReevaluation
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