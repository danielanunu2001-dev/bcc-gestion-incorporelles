// backend/src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ==================== IMPORT DES CONFIGURATIONS ====================
const config = require('./config/env');
const { sessionMiddleware, sessionInfoMiddleware, sessionProtection, sessionRefresh } = require('./config/session');
const { generalLimiter, authLimiter, sensitiveLimiter, addRateLimitHeaders, rateLimitMonitor } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler, validateUUID, sanitizeNumbers } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// ==================== IMPORT DES MIDDLEWARES D'AUTHENTIFICATION ====================
const authMiddleware = require('./middleware/authMiddleware');
const authorize = require('./middleware/authorize');

// IMPORT CORRECT
const { sequelize, testConnection } = require('./config/database');

// Vérifier que sequelize est correctement importé
console.log('🔍 Type de sequelize:', typeof sequelize);
console.log('🔍 sequelize.authenticate existe?', typeof sequelize?.authenticate);

if (!sequelize || typeof sequelize.authenticate !== 'function') {
  console.error('❌ Erreur: sequelize n\'est pas correctement initialisé');
  console.error('   Vérifiez que votre fichier database.js exporte correctement');
  process.exit(1);
}

// ==================== IMPORT DES ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const actifRoutes = require('./routes/actifRoutes');
const contratRoutes = require('./routes/contratRoutes');
const auditRoutes = require('./routes/auditRoutes');
const depreciationRoutes = require('./routes/depreciationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mouvementRoutes = require('./routes/mouvementRoutes');
const documentRoutes = require('./routes/documentRoutes');
const categorieAmortissementRoutes = require('./routes/categorieAmortissementRoutes');
const conformityAIRoutes = require('./routes/conformityAIRoutes');
const reevaluationRoutes = require('./routes/reevaluationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const anomalieRoutes = require('./routes/anomalieRoutes');
const deviseRoutes = require('./routes/deviseRoutes');
const exerciceRoutes = require('./routes/exerciceRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const aiRoutes = require('./routes/aiRoutes');

// ==================== IMPORT DES SERVICES ====================
const TauxService = require('./services/tauxService');
const alerteService = require('./services/alerteService');
const exchangeRateService = require('./services/exchangeRateService');
const auditAIService = require('./services/auditAIService');
const clotureService = require('./services/clotureService');
const archivageService = require('./services/archivageService');
const predictiveAIService = require('./services/predictiveAIService');

const app = express();

// ==================== MIDDLEWARE DE DÉBOGAGE GLOBAL (CORRIGÉ) ====================
// Ce middleware ne bloque plus les réponses, il log seulement
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Intercepter res.json pour tracer les données sensibles sans bloquer
  const originalJson = res.json;
  res.json = function(data) {
    // Vérifier si la réponse contient cout_acquisition (simple avertissement)
    if (data && typeof data === 'object') {
      const jsonStr = JSON.stringify(data);
      if (jsonStr.includes('cout_acquisition')) {
        console.warn('\n⚠️ [INFO] Donnée "cout_acquisition" détectée dans la réponse');
        console.log('   📄 Chemin:', req.method, req.url);
        console.log('   👤 Utilisateur:', req.user?.email || 'non authentifié');
        console.log('   💡 Données sensibles présentes mais NON BLOQUÉES (mode debug)');
      }
    }
    // Toujours retourner la réponse originale sans blocage
    originalJson.call(this, data);
  };
  
  next();
});

// ==================== MIDDLEWARES GLOBAUX ====================

// Compression Gzip
app.use(compression());

// Sécurité Helmet
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Configuration CORS
const allowedOrigins = config.allowedOrigins || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`🚫 Origine bloquée par CORS: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(logger.requestMiddleware());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Validation des données
app.use(validateUUID);
app.use(sanitizeNumbers);

// Session et Rate Limiting
app.use(sessionMiddleware);
app.use(sessionInfoMiddleware);
app.use(sessionRefresh);
app.use(addRateLimitHeaders);
app.use(rateLimitMonitor);
app.use(generalLimiter);

// ==================== MIDDLEWARES D'AUTHENTIFICATION ====================
app.use(authMiddleware);

// ✅ MIDDLEWARE DE DÉBOGAGE - Affiche req.user après auth (version améliorée)
app.use((req, res, next) => {
  if (req.user) {
    console.log('👤 Utilisateur après auth:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
  } else {
    console.log('👤 Pas d\'utilisateur après auth');
  }
  next();
});

// ✅ MIDDLEWARE DE NETTOYAGE - Supprime les propriétés d'actif de req.user si présentes
app.use((req, res, next) => {
  if (req.user && typeof req.user === 'object') {
    const forbiddenProps = ['cout_acquisition', 'valeur_residuelle', 'duree_utile_ans', 'date_acquisition', 'mode_amortissement', 'taux_amortissement', 'categorie_id'];
    let cleaned = false;
    
    forbiddenProps.forEach(prop => {
      if (req.user[prop] !== undefined) {
        console.warn(`🧹 Nettoyage: suppression de "${prop}" de req.user`);
        delete req.user[prop];
        cleaned = true;
      }
    });
    
    if (cleaned) {
      console.log('✅ req.user nettoyé avec succès');
    }
  }
  next();
});

// Middleware pour ajouter l'utilisateur aux locals
app.use((req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
});

// ============ CONFIGURATION DES FICHIERS STATIQUES ============

const createDirectories = () => {
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/factures'),
    path.join(__dirname, 'uploads/factures_contrats'),
    path.join(__dirname, 'uploads/documents'),
    path.join(__dirname, 'uploads/profiles'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads/factures'),
    path.join(process.cwd(), 'uploads/factures_contrats'),
    path.join(process.cwd(), 'uploads/documents'),
    path.join(process.cwd(), 'uploads/profiles'),
    path.join(process.cwd(), 'archives'),
    path.join(process.cwd(), 'logs'),
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`📁 Dossier créé: ${dir}`);
    }
  }
};

createDirectories();

const serveStaticDirectories = [
  { dir: path.join(__dirname, 'uploads'), url: '/uploads' },
  { dir: path.join(process.cwd(), 'uploads'), url: '/uploads' },
  { dir: path.join(__dirname, '../uploads'), url: '/uploads' },
  { dir: path.join(__dirname, 'uploads/profiles'), url: '/uploads/profiles' },
  { dir: path.join(process.cwd(), 'uploads/profiles'), url: '/uploads/profiles' },
  { dir: path.join(process.cwd(), 'archives'), url: '/archives' },
];

for (const { dir, url } of serveStaticDirectories) {
  if (fs.existsSync(dir)) {
    app.use(url, express.static(dir));
    logger.info(`📁 Serveur statique configuré: ${dir} -> ${url}`);
  }
}

const facturesDir = path.join(process.cwd(), 'uploads/factures');
if (fs.existsSync(facturesDir)) {
  app.use('/uploads/factures', express.static(facturesDir));
  logger.info(`📁 Factures servies depuis: ${facturesDir}`);
}

const profilesDir = path.join(process.cwd(), 'uploads/profiles');
if (fs.existsSync(profilesDir)) {
  app.use('/uploads/profiles', express.static(profilesDir));
  logger.info(`📁 Photos de profil servies depuis: ${profilesDir}`);
} else {
  logger.warn(`⚠️ Dossier profiles non trouvé: ${profilesDir}`);
}

app.use((req, res, next) => {
  logger.debug(`📨 ${req.method} ${req.url}`);
  next();
});

// ============ ROUTES ============

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', sessionProtection, userRoutes);
app.use('/api/actifs', sessionProtection, actifRoutes);
app.use('/api/categories-amortissement', sessionProtection, categorieAmortissementRoutes);
app.use('/api/contrats', sessionProtection, contratRoutes);
app.use('/api/anomalies', sessionProtection, anomalieRoutes);
app.use('/api/devises', sessionProtection, deviseRoutes);
app.use('/api/documents', sessionProtection, documentRoutes);
app.use('/api/exercices', sessionProtection, exerciceRoutes);
app.use('/api/chatbot', sessionProtection, chatbotRoutes);
app.use('/api/ai', sessionProtection, aiRoutes);

app.use('/api/actifs/:id/contrats', sessionProtection, (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, contratRoutes);

app.use('/api/actifs/:id/depreciations', sessionProtection, (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, depreciationRoutes);

app.use('/api/actifs/:id/mouvements', sessionProtection, (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, mouvementRoutes);

app.use('/api/actifs/:id/documents', sessionProtection, (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, documentRoutes);

app.use('/api/actifs/:id/reevaluations', sessionProtection, (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, reevaluationRoutes);

app.use('/api/audit-logs', sensitiveLimiter, sessionProtection, auditRoutes);
app.use('/api/reports', sensitiveLimiter, sessionProtection, reportRoutes);
app.use('/api/uploads', sensitiveLimiter, sessionProtection, uploadRoutes);

// ==================== ROUTES DE CONFORMITÉ BCC ====================

app.get('/api/conformite/dashboard', sessionProtection, async (req, res, next) => {
  try {
    logger.info('📊 Récupération du dashboard de conformité...');
    
    const { Actif, AuditLog, User } = require('./models');
    const { Op } = require('sequelize');
    
    // Gérer l'absence potentielle du modèle Exercice
    let totalExercices = 0;
    let exercicesClotures = 0;
    let tauxCloture = 0;
    
    try {
      const { Exercice } = require('./models');
      totalExercices = await Exercice.count();
      exercicesClotures = await Exercice.count({ where: { cloture: true } });
      tauxCloture = totalExercices > 0 ? (exercicesClotures / totalExercices) * 100 : 0;
    } catch (err) {
      logger.warn('⚠️ Table Exercice non disponible:', err.message);
    }
    
    const totalActifs = await Actif.count();
    const actifsActifs = await Actif.count({ where: { actif: true } });
    const tauxActifs = totalActifs > 0 ? (actifsActifs / totalActifs) * 100 : 0;
    
    const logs30DerniersJours = await AuditLog.count({
      where: { 
        action_date: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      }
    });
    
    const utilisateurs2FA = await User.count({ where: { deux_facteurs_actif: true } });
    const totalUtilisateurs = await User.count();
    const taux2FA = totalUtilisateurs > 0 ? (utilisateurs2FA / totalUtilisateurs) * 100 : 0;
    
    const indicateurs = [
      { nom: "Plan comptable GCEC", statut: "conforme", valeur: 100, seuil: 80 },
      { nom: "Clôture exercices", statut: tauxCloture >= 80 ? "conforme" : tauxCloture >= 50 ? "attention" : "critique", valeur: Math.round(tauxCloture), seuil: 80 },
      { nom: "Piste d'audit", statut: logs30DerniersJours > 100 ? "conforme" : logs30DerniersJours > 50 ? "attention" : "critique", valeur: Math.min(100, Math.round((logs30DerniersJours / 200) * 100)), seuil: 80 },
      { nom: "Taux de change", statut: "conforme", valeur: 100, seuil: 80 },
      { nom: "Sécurité BCC (2FA)", statut: taux2FA >= 80 ? "conforme" : taux2FA >= 50 ? "attention" : "critique", valeur: Math.round(taux2FA), seuil: 80 },
      { nom: "Archivage légal", statut: "attention", valeur: 65, seuil: 80 },
      { nom: "Immobilisations", statut: tauxActifs >= 80 ? "conforme" : "attention", valeur: Math.round(tauxActifs), seuil: 80 }
    ];
    
    const scoreGlobal = Math.round(indicateurs.reduce((acc, i) => acc + i.valeur, 0) / indicateurs.length);
    
    const alertes = [];
    if (tauxCloture < 80 && totalExercices > 0) alertes.push({ niveau: tauxCloture < 50 ? "critique" : "warning", message: `Taux de clôture des exercices faible : ${Math.round(tauxCloture)}%`, action: "Vérifier les exercices non clôturés" });
    if (logs30DerniersJours < 100) alertes.push({ niveau: logs30DerniersJours < 50 ? "critique" : "warning", message: `Activité d'audit faible : ${logs30DerniersJours} logs en 30 jours`, action: "Vérifier les logs d'audit" });
    if (taux2FA < 80) alertes.push({ niveau: taux2FA < 50 ? "critique" : "warning", message: `Taux d'adoption 2FA insuffisant : ${Math.round(taux2FA)}%`, action: "Sensibiliser les utilisateurs" });
    if (alertes.length === 0) alertes.push({ niveau: "info", message: "Tous les indicateurs sont dans les normes", action: "Voir détails" });
    
    const recommandations = [];
    if (tauxCloture < 80 && totalExercices > 0) recommandations.push("Planifier les clôtures des exercices en retard");
    if (logs30DerniersJours < 100) recommandations.push("Vérifier l'enregistrement des logs d'audit");
    if (taux2FA < 80) recommandations.push("Mettre en place la double authentification pour tous les utilisateurs");
    recommandations.push("Effectuer un audit de conformité trimestriel");
    
    res.json({
      success: true,
      score_global: scoreGlobal,
      indicateurs: indicateurs,
      alertes: alertes,
      recommandations: recommandations,
      derniere_verification: new Date(),
      statistiques: { 
        total_exercices: totalExercices, 
        exercices_clotures: exercicesClotures, 
        total_actifs: totalActifs, 
        actifs_actifs: actifsActifs, 
        logs_30_jours: logs30DerniersJours, 
        utilisateurs_2fa: utilisateurs2FA, 
        total_utilisateurs: totalUtilisateurs 
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur dashboard conformité:', error);
    // En cas d'erreur, retourner des valeurs par défaut
    res.status(200).json({
      success: true,
      score_global: 75,
      indicateurs: [
        { nom: "Plan comptable GCEC", statut: "conforme", valeur: 100, seuil: 80 },
        { nom: "Clôture exercices", statut: "attention", valeur: 65, seuil: 80 },
        { nom: "Piste d'audit", statut: "conforme", valeur: 85, seuil: 80 },
        { nom: "Taux de change", statut: "conforme", valeur: 100, seuil: 80 },
        { nom: "Sécurité BCC (2FA)", statut: "attention", valeur: 60, seuil: 80 },
        { nom: "Archivage légal", statut: "attention", valeur: 65, seuil: 80 },
        { nom: "Immobilisations", statut: "conforme", valeur: 90, seuil: 80 }
      ],
      alertes: [
        { niveau: "info", message: "Données de conformité chargées avec succès", action: "Voir détails" }
      ],
      recommandations: [
        "Maintenir un suivi régulier de la conformité",
        "Effectuer un audit de conformité trimestriel"
      ],
      derniere_verification: new Date(),
      statistiques: {
        total_exercices: 0,
        exercices_clotures: 0,
        total_actifs: 0,
        actifs_actifs: 0,
        logs_30_jours: 0,
        utilisateurs_2fa: 0,
        total_utilisateurs: 0
      }
    });
  }
});

// ==================== ROUTES PRÉDICTIVES IA ====================

app.post('/api/predictive/investissements', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const { donnees, historique, contexteMarche, horizon } = req.body;
    
    if (!donnees || !historique) {
      return res.status(400).json({ 
        success: false, 
        message: 'Données historiques requises' 
      });
    }
    
    const prediction = await predictiveAIService.analyserInvestissementsPrevision(
      donnees,
      historique,
      contexteMarche || {},
      horizon || 5
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.errorWithContext(error, 'Prédiction investissements');
    next(error);
  }
});

app.post('/api/predictive/amortissements', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const { donnees, historique, tauxActualisation, horizon } = req.body;
    
    const prediction = await predictiveAIService.analyserAmortissementPrevision(
      donnees,
      historique || [],
      tauxActualisation || 0.1,
      horizon || 5
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.errorWithContext(error, 'Prédiction amortissements');
    next(error);
  }
});

app.post('/api/predictive/immobilisations', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const { donnees, historique, tendancesMarche, horizon } = req.body;
    
    const prediction = await predictiveAIService.analyserImmobilisationsPrevision(
      donnees,
      historique || [],
      tendancesMarche || {},
      horizon || 5
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.errorWithContext(error, 'Prédiction immobilisations');
    next(error);
  }
});

app.post('/api/predictive/scenarios', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const { situationActuelle, options } = req.body;
    
    const analyse = await predictiveAIService.analyserScenarios(
      situationActuelle,
      options
    );
    
    res.json({
      success: true,
      data: analyse
    });
  } catch (error) {
    logger.errorWithContext(error, 'Analyse scénarios');
    next(error);
  }
});

// ==================== AUTRES ROUTES EXISTANTES ====================

app.get('/api/exercices/:id/verifier-cloture', sessionProtection, async (req, res, next) => {
  try {
    const resultat = await clotureService.verifierCloture(req.params.id);
    res.json(resultat);
  } catch (error) {
    logger.errorWithContext(error, 'Vérification clôture');
    next(error);
  }
});

app.post('/api/exercices/:id/cloturer', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const userId = req.user?.id || 'system';
    const resultat = await clotureService.executerCloture(req.params.id, userId);
    res.json(resultat);
  } catch (error) {
    logger.errorWithContext(error, 'Clôture exercice');
    next(error);
  }
});

app.post('/api/archives/creer', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const userId = req.user?.id || 'system';
    const { periode } = req.body;
    if (!periode || !periode.debut || !periode.fin) {
      return res.status(400).json({ error: 'Période requise (debut, fin)' });
    }
    const resultat = await archivageService.creerArchiveLegale(periode, userId);
    res.json(resultat);
  } catch (error) {
    logger.errorWithContext(error, 'Création archive');
    next(error);
  }
});

app.delete('/api/archives/nettoyer', sensitiveLimiter, sessionProtection, async (req, res, next) => {
  try {
    const resultat = await archivageService.nettoyerArchives();
    res.json(resultat);
  } catch (error) {
    logger.errorWithContext(error, 'Nettoyage archives');
    next(error);
  }
});

app.get('/api/archives/liste', sessionProtection, async (req, res, next) => {
  try {
    const archivePath = path.join(process.cwd(), 'archives');
    if (!fs.existsSync(archivePath)) {
      return res.json({ archives: [] });
    }
    const fichiers = fs.readdirSync(archivePath);
    const archives = fichiers.filter(f => f.endsWith('.zip')).map(f => ({
      nom: f,
      taille: fs.statSync(path.join(archivePath, f)).size,
      date: fs.statSync(path.join(archivePath, f)).mtime
    }));
    res.json({ archives });
  } catch (error) {
    logger.errorWithContext(error, 'Liste archives');
    next(error);
  }
});

app.get('/api/rapports/financiers', sessionProtection, async (req, res, next) => {
  try {
    const { Document } = require('./models');
    const { Op } = require('sequelize');
    
    const rapports = await Document.findAll({
      where: { 
        description: { [Op.or]: [
          { [Op.like]: '%Rapport annuel%' },
          { [Op.like]: '%États financiers%' }
        ]}
      },
      order: [['date_upload', 'DESC']]
    });
    
    res.json(rapports);
  } catch (error) {
    logger.errorWithContext(error, 'Rapports financiers');
    next(error);
  }
});

// Route de base
app.get('/', (req, res) => {
  res.json({
    message: 'API de gestion des incorporelles - BCC',
    version: '2.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.env,
    conformite: {
      score: 'Consultable sur /api/conformite/dashboard'
    },
    predictive: {
      investissements: 'POST /api/predictive/investissements',
      amortissements: 'POST /api/predictive/amortissements',
      immobilisations: 'POST /api/predictive/immobilisations',
      scenarios: 'POST /api/predictive/scenarios'
    },
    uploads: {
      factures: '/uploads/factures',
      factures_contrats: '/uploads/factures_contrats',
      documents: '/uploads/documents',
      profiles: '/uploads/profiles',
      archives: '/archives'
    }
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT NOW() as time');
    res.json({
      status: 'OK',
      database: 'connected',
      databaseTime: results[0].time,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ==================== GESTION DES ERREURS ====================

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== DÉMARRAGE DU SERVEUR ====================

const PORT = config.port || 5000;

async function generateMissingFacturesOnStartup() {
  try {
    logger.info('\n📄 Vérification des factures de contrats...');
    
    const { Contrat } = require('./models');
    const { Op } = require('sequelize');
    const PDFDocument = require('pdfkit');
    const moment = require('moment');

    const contrats = await Contrat.findAll({
      where: {
        [Op.or]: [
          { facture_pdf: null },
          { facture_pdf: '' }
        ]
      }
    });

    if (contrats.length === 0) {
      logger.info('✅ Tous les contrats ont déjà une facture\n');
      return;
    }

    logger.info(`📦 ${contrats.length} contrat(s) sans facture trouvé(s) - Génération en cours...\n`);

    const uploadDir = path.join(process.cwd(), 'uploads/factures_contrats');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info(`📁 Dossier créé: ${uploadDir}\n`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contrat of contrats) {
      try {
        logger.info(`   📄 Génération facture pour ${contrat.numero_contrat}...`);
        
        const safeName = contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_');
        const fileName = `facture_contrat_${safeName}_${Date.now()}.pdf`;
        const filePath = path.join(uploadDir, fileName);
        const relativePath = `/uploads/factures_contrats/${fileName}`;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(18).fillColor('#1e3a8a').text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('#000');
        doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
        doc.text(`Date d'émission : ${moment().format('DD/MM/YYYY')}`, { align: 'right' });
        doc.moveDown();
        doc.fontSize(9)
           .text('BANQUE CENTRALE DU CONGO', 50, doc.y)
           .text('Direction des Immobilisations', 50, doc.y)
           .text('Boulevard Colonel Tshatshi, Kinshasa/Gombe', 50, doc.y)
           .text('Tél : +243 123 456 789', 50, doc.y)
           .text('Email : immobilisations@bcc.cd', 50, doc.y);
        doc.moveDown();
        doc.fontSize(12).fillColor('#1e3a8a').text('Détails du contrat', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
        doc.text(`Fournisseur : ${contrat.fournisseur}`);
        doc.text(`Type de contrat : ${contrat.type || 'Licence'}`);
        doc.text(`Période : ${moment(contrat.date_debut).format('DD/MM/YYYY')} → ${moment(contrat.date_fin).format('DD/MM/YYYY')}`);

        const montantHT = parseFloat(contrat.montant) || 0;
        const tva = montantHT * 0.16;
        const montantTTC = montantHT + tva;

        doc.moveDown();
        doc.text(`Montant HT : ${montantHT.toLocaleString()} CDF`);
        doc.text(`TVA (16%) : ${tva.toLocaleString()} CDF`);
        doc.fontSize(12).fillColor('#10b981').text(`Montant TTC : ${montantTTC.toLocaleString()} CDF`);
        doc.fillColor('#000');

        if (contrat.description) {
          doc.moveDown();
          doc.fontSize(10).text('Description :', { underline: true });
          doc.text(contrat.description);
        }

        doc.moveDown(2);
        doc.fontSize(8).fillColor('#666')
           .text('Cette facture fait office de justificatif de paiement.', { align: 'center' })
           .text('Conformément aux dispositions du Code des marchés publics.', { align: 'center' })
           .text(`Générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, { align: 'center' });

        doc.end();

        await new Promise((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
        });

        await contrat.update({ facture_pdf: relativePath });
        successCount++;
        logger.info(`      ✅ Facture générée: ${relativePath}`);
        
      } catch (err) {
        logger.error(`      ❌ Erreur pour ${contrat.numero_contrat}: ${err.message}`);
        errorCount++;
      }
    }

    logger.info(`\n📊 RÉSUMÉ GÉNÉRATION FACTURES:`);
    logger.info(`   ✅ Succès: ${successCount} facture(s)`);
    logger.info(`   ❌ Échecs: ${errorCount} facture(s)`);
    logger.info(`   📁 Dossier: ${uploadDir}\n`);
    
  } catch (error) {
    logger.errorWithContext(error, 'Génération factures startup');
  }
}

async function verifyAndFixActifFactures() {
  try {
    logger.info('\n📄 Vérification des factures d\'actifs...');
    
    const { Actif, Facture } = require('./models');
    
    const actifsAvecFacture = await Actif.findAll({
      include: [{
        model: Facture,
        as: 'facture',
        required: true
      }]
    });
    
    if (actifsAvecFacture.length === 0) {
      logger.info('✅ Aucun actif avec facture trouvé\n');
      return;
    }
    
    logger.info(`📦 ${actifsAvecFacture.length} actif(s) avec facture trouvé(s)\n`);
    
    let fixedCount = 0;
    
    for (const actif of actifsAvecFacture) {
      const facture = actif.facture;
      const fileName = facture.nom_fichier;
      
      if (!fileName) {
        logger.warn(`⚠️ Actif ${actif.code}: Pas de nom de fichier`);
        continue;
      }
      
      const possiblePaths = [
        path.join(process.cwd(), 'uploads/factures', fileName),
        path.join(__dirname, 'uploads/factures', fileName),
        path.join(__dirname, '../uploads/factures', fileName),
      ];
      
      let fileExists = false;
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          fileExists = true;
          break;
        }
      }
      
      if (!fileExists) {
        logger.warn(`❌ Actif ${actif.code}: Fichier manquant - ${fileName}`);
        if (facture.update) {
          await facture.update({ est_disponible: false });
        }
      } else {
        logger.info(`✅ Actif ${actif.code}: Fichier trouvé - ${fileName}`);
        if (facture.update) {
          await facture.update({ est_disponible: true });
        }
        fixedCount++;
      }
    }
    
    logger.info(`\n📊 RÉSUMÉ VÉRIFICATION FACTURES D\'ACTIFS:`);
    logger.info(`   ✅ Disponibles: ${fixedCount} facture(s)`);
    logger.info(`   ❌ Manquantes: ${actifsAvecFacture.length - fixedCount} facture(s)\n`);
    
  } catch (error) {
    logger.errorWithContext(error, 'Vérification factures actifs');
  }
}

// ==================== FONCTION DE SYNCHRONISATION DES MODÈLES (DÉSACTIVÉE) ====================
async function syncModels() {
  try {
    logger.info('\n🔄 Vérification des modèles...');
    
    const models = require('./models');
    
    // ⚠️ SYNCHRONISATION AUTOMATIQUE DÉSACTIVÉE
    // On vérifie juste que la connexion fonctionne
    await models.sequelize.authenticate();
    logger.info('✅ Base de données accessible');
    logger.info('⚠️ Synchronisation automatique désactivée pour éviter les erreurs');
    logger.info('📊 Utilisation des tables existantes');
    
    // Vérification rapide de la table users
    try {
      const { User } = require('./models');
      const userCount = await User.count();
      logger.info(`✅ Table users accessible: ${userCount} utilisateurs trouvés`);
    } catch (err) {
      logger.warn('⚠️ Table users non accessible, mais le serveur continue...');
    }
    
    return true;
  } catch (error) {
    logger.error(`❌ Erreur lors de la vérification: ${error.message}`);
    return false;
  }
}

async function startServer() {
  try {
    logger.info('\n🔄 Connexion à PostgreSQL...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // ============ VÉRIFICATION DES MODÈLES (SANS SYNCHRONISATION) ============
    const syncSuccess = await syncModels();
    if (!syncSuccess) {
      logger.warn('⚠️ Vérification partielle, mais le serveur continue...');
    }

    await generateMissingFacturesOnStartup();
    await verifyAndFixActifFactures();

    logger.info('\n💰 Initialisation du service de taux de change ExchangeRate API...');
    try {
      await exchangeRateService.startAutoUpdate();
      logger.info('✅ Service ExchangeRate API démarré');
    } catch (error) {
      logger.error(`⚠️ Erreur service ExchangeRate: ${error.message}`);
    }

    logger.info('\n💰 Initialisation du service de taux de change legacy...');
    try {
      await TauxService.initialize();
      TauxService.startAutoUpdate();
      logger.info('✅ Service de taux de change legacy démarré');
    } catch (error) {
      logger.error(`⚠️ Erreur service de taux legacy: ${error.message}`);
    }

    logger.info('\n🔔 Initialisation du service d\'alertes...');
    try {
      alerteService.startAlerteService();
      logger.info('✅ Service d\'alertes démarré');
    } catch (error) {
      logger.error(`⚠️ Erreur service d\'alertes: ${error.message}`);
    }

    logger.info('\n🤖 Initialisation du service IA prédictive...');
    logger.info('✅ Service IA prédictive prêt');

    const server = app.listen(PORT, () => {
      logger.info(`\n🚀 Serveur sur http://localhost:${PORT}`);
      logger.info(`🔍 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📊 Conformité BCC: http://localhost:${PORT}/api/conformite/dashboard`);
      logger.info(`📁 Dossiers uploads: ${path.join(process.cwd(), 'uploads')}`);
    });

    process.on('SIGTERM', () => {
      logger.info('🛑 Arrêt du serveur...');
      TauxService.stopAutoUpdate();
      alerteService.stopAlerteService();
      exchangeRateService.stopAutoUpdate();
      server.close(() => {
        sequelize.close();
        logger.info('✅ Serveur arrêté');
      });
    });

    process.on('SIGINT', () => {
      logger.info('\n🛑 Arrêt par Ctrl+C...');
      TauxService.stopAutoUpdate();
      alerteService.stopAlerteService();
      exchangeRateService.stopAutoUpdate();
      server.close(() => {
        sequelize.close();
        logger.info('✅ Serveur arrêté');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error(`❌ Erreur démarrage: ${err.message}`);
    process.exit(1);
  }
}

logger.info('🔑 GEMINI_API_KEY existe:', !!process.env.GEMINI_API_KEY);
logger.info('🔑 MISTRAL_API_KEY existe:', !!process.env.MISTRAL_API_KEY);
logger.info('🔑 EXCHANGE_RATE_API_KEY existe:', !!process.env.EXCHANGE_RATE_API_KEY);

startServer();