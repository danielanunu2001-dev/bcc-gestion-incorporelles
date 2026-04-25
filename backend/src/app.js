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
const reevaluationRoutes = require('./routes/reevaluationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const anomalieRoutes = require('./routes/anomalieRoutes');
const deviseRoutes = require('./routes/deviseRoutes');
const exerciceRoutes = require('./routes/exerciceRoutes');

// SERVICES
const TauxService = require('./services/tauxService');
const alerteService = require('./services/alerteService');

const app = express();

// Compression Gzip
app.use(compression());

// Configuration CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" } 
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('🚫 Origine bloquée par CORS:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============ CONFIGURATION DES FICHIERS STATIQUES ============

// ✅ Créer les dossiers nécessaires s'ils n'existent pas
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
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Dossier créé: ${dir}`);
    }
  }
};

createDirectories();

// ✅ Servir les fichiers statiques depuis plusieurs emplacements possibles
const serveStaticDirectories = [
  { dir: path.join(__dirname, 'uploads'), url: '/uploads' },
  { dir: path.join(process.cwd(), 'uploads'), url: '/uploads' },
  { dir: path.join(__dirname, '../uploads'), url: '/uploads' },
  { dir: path.join(__dirname, 'uploads/profiles'), url: '/uploads/profiles' },
  { dir: path.join(process.cwd(), 'uploads/profiles'), url: '/uploads/profiles' },
];

for (const { dir, url } of serveStaticDirectories) {
  if (fs.existsSync(dir)) {
    app.use(url, express.static(dir));
    console.log(`📁 Serveur statique configuré: ${dir} -> ${url}`);
  }
}

// ✅ Configuration supplémentaire pour les factures
const facturesDir = path.join(process.cwd(), 'uploads/factures');
if (fs.existsSync(facturesDir)) {
  app.use('/uploads/factures', express.static(facturesDir));
  console.log(`📁 Factures servies depuis: ${facturesDir}`);
}

// ✅ Configuration pour les photos de profil
const profilesDir = path.join(process.cwd(), 'uploads/profiles');
if (fs.existsSync(profilesDir)) {
  app.use('/uploads/profiles', express.static(profilesDir));
  console.log(`📁 Photos de profil servies depuis: ${profilesDir}`);
} else {
  console.log(`⚠️ Dossier profiles non trouvé: ${profilesDir}`);
}

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/actifs', actifRoutes);
app.use('/api/categories-amortissement', categorieAmortissementRoutes);
app.use('/api/contrats', contratRoutes);
app.use('/api/anomalies', anomalieRoutes);
app.use('/api/devises', deviseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/exercices', exerciceRoutes);

// Routes avec paramètre actifId
app.use('/api/actifs/:id/contrats', (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, contratRoutes);

app.use('/api/actifs/:id/depreciations', (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, depreciationRoutes);

app.use('/api/actifs/:id/mouvements', (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, mouvementRoutes);

app.use('/api/actifs/:id/documents', (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, documentRoutes);

app.use('/api/actifs/:id/reevaluations', (req, res, next) => {
  req.actifId = req.params.id;
  next();
}, reevaluationRoutes);

app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);

// Route de base
app.get('/', (req, res) => {
  res.json({
    message: 'API de gestion des incorporelles - BCC',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uploads: {
      factures: '/uploads/factures',
      factures_contrats: '/uploads/factures_contrats',
      documents: '/uploads/documents',
      profiles: '/uploads/profiles'
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
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Gestion 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée', 
    path: req.url 
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 5000;

// ==================== FONCTION DE GÉNÉRATION DES FACTURES MANQUANTES ====================

/**
 * Vérifie et génère les factures manquantes pour tous les contrats
 */
async function generateMissingFacturesOnStartup() {
  try {
    console.log('\n📄 Vérification des factures de contrats...');
    
    const { Contrat } = require('./models');
    const { Op } = require('sequelize');
    const PDFDocument = require('pdfkit');
    const moment = require('moment');

    // Vérifier les contrats sans facture
    const contrats = await Contrat.findAll({
      where: {
        [Op.or]: [
          { facture_pdf: null },
          { facture_pdf: '' }
        ]
      }
    });

    if (contrats.length === 0) {
      console.log('✅ Tous les contrats ont déjà une facture\n');
      return;
    }

    console.log(`📦 ${contrats.length} contrat(s) sans facture trouvé(s) - Génération en cours...\n`);

    const uploadDir = path.join(process.cwd(), 'uploads/factures_contrats');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Dossier créé: ${uploadDir}\n`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contrat of contrats) {
      try {
        console.log(`   📄 Génération facture pour ${contrat.numero_contrat}...`);
        
        const safeName = contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_');
        const fileName = `facture_contrat_${safeName}_${Date.now()}.pdf`;
        const filePath = path.join(uploadDir, fileName);
        const relativePath = `/uploads/factures_contrats/${fileName}`;

        // Créer le PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // En-tête
        doc.fontSize(18).fillColor('#1e3a8a').text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });
        doc.moveDown();

        // Infos facture
        doc.fontSize(10).fillColor('#000');
        doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
        doc.text(`Date d'émission : ${moment().format('DD/MM/YYYY')}`, { align: 'right' });
        doc.moveDown();

        // Coordonnées BCC
        doc.fontSize(9)
           .text('BANQUE CENTRALE DU CONGO', 50, doc.y)
           .text('Direction des Immobilisations', 50, doc.y)
           .text('Boulevard Colonel Tshatshi, Kinshasa/Gombe', 50, doc.y)
           .text('Tél : +243 123 456 789', 50, doc.y)
           .text('Email : immobilisations@bcc.cd', 50, doc.y);

        doc.moveDown();

        // Détails du contrat
        doc.fontSize(12).fillColor('#1e3a8a').text('Détails du contrat', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');

        doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
        doc.text(`Fournisseur : ${contrat.fournisseur}`);
        doc.text(`Type de contrat : ${contrat.type || 'Licence'}`);
        doc.text(`Période : ${moment(contrat.date_debut).format('DD/MM/YYYY')} → ${moment(contrat.date_fin).format('DD/MM/YYYY')}`);

        // Montants
        const montantHT = parseFloat(contrat.montant) || 0;
        const tva = montantHT * 0.16;
        const montantTTC = montantHT + tva;

        doc.moveDown();
        doc.text(`Montant HT : ${montantHT.toLocaleString()} CDF`);
        doc.text(`TVA (16%) : ${tva.toLocaleString()} CDF`);
        doc.fontSize(12).fillColor('#10b981').text(`Montant TTC : ${montantTTC.toLocaleString()} CDF`);
        doc.fillColor('#000');

        // Description
        if (contrat.description) {
          doc.moveDown();
          doc.fontSize(10).text('Description :', { underline: true });
          doc.text(contrat.description);
        }

        // Pied de page
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
        console.log(`      ✅ Facture générée: ${relativePath}`);
        
      } catch (err) {
        console.error(`      ❌ Erreur pour ${contrat.numero_contrat}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 RÉSUMÉ GÉNÉRATION FACTURES:`);
    console.log(`   ✅ Succès: ${successCount} facture(s)`);
    console.log(`   ❌ Échecs: ${errorCount} facture(s)`);
    console.log(`   📁 Dossier: ${uploadDir}\n`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des factures:', error);
  }
}

/**
 * Vérifie et corrige les chemins des factures d'actifs
 */
async function verifyAndFixActifFactures() {
  try {
    console.log('\n📄 Vérification des factures d\'actifs...');
    
    const { Actif, Facture } = require('./models');
    
    const actifsAvecFacture = await Actif.findAll({
      include: [{
        model: Facture,
        as: 'facture',
        required: true
      }]
    });
    
    if (actifsAvecFacture.length === 0) {
      console.log('✅ Aucun actif avec facture trouvé\n');
      return;
    }
    
    console.log(`📦 ${actifsAvecFacture.length} actif(s) avec facture trouvé(s)\n`);
    
    let fixedCount = 0;
    
    for (const actif of actifsAvecFacture) {
      const facture = actif.facture;
      const fileName = facture.nom_fichier;
      
      if (!fileName) {
        console.log(`⚠️ Actif ${actif.code}: Pas de nom de fichier`);
        continue;
      }
      
      // Vérifier si le fichier existe dans les dossiers possibles
      const possiblePaths = [
        path.join(process.cwd(), 'uploads/factures', fileName),
        path.join(__dirname, 'uploads/factures', fileName),
        path.join(__dirname, '../uploads/factures', fileName),
      ];
      
      let fileExists = false;
      let existingPath = null;
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          fileExists = true;
          existingPath = p;
          break;
        }
      }
      
      if (!fileExists) {
        console.log(`❌ Actif ${actif.code}: Fichier manquant - ${fileName}`);
        
        // Option: Marquer la facture comme non disponible
        await facture.update({ est_disponible: false });
      } else {
        console.log(`✅ Actif ${actif.code}: Fichier trouvé - ${fileName}`);
        await facture.update({ est_disponible: true });
        fixedCount++;
      }
    }
    
    console.log(`\n📊 RÉSUMÉ VÉRIFICATION FACTURES D\'ACTIFS:`);
    console.log(`   ✅ Disponibles: ${fixedCount} facture(s)`);
    console.log(`   ❌ Manquantes: ${actifsAvecFacture.length - fixedCount} facture(s)\n`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

async function startServer() {
  try {
    console.log('\n🔄 Connexion à PostgreSQL...');
    
    // Utiliser testConnection pour vérifier la connexion
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // Tester la table users
    try {
      const { User } = require('./models');
      const userCount = await User.count();
      console.log(`✅ Table users accessible: ${userCount} utilisateurs trouvés`);
    } catch (err) {
      console.log('⚠️ Table users non accessible (normal si pas encore synchronisée)');
    }

    // ✅ GÉNÉRER LES FACTURES MANQUANTES AU DÉMARRAGE
    await generateMissingFacturesOnStartup();
    
    // ✅ VÉRIFIER LES FACTURES D'ACTIFS
    await verifyAndFixActifFactures();

    // Démarrer le service de taux de change
    console.log('\n💰 Initialisation du service de taux de change...');
    try {
      await TauxService.initialize();
      TauxService.startAutoUpdate();
      console.log('✅ Service de taux de change démarré (mise à jour automatique toutes les 24h)');
    } catch (error) {
      console.error('⚠️ Erreur service de taux:', error.message);
    }

    // DÉMARRER LE SERVICE D'ALERTES
    console.log('\n🔔 Initialisation du service d\'alertes...');
    try {
      alerteService.startAlerteService();
      console.log('✅ Service d\'alertes démarré (vérification quotidienne à 8h)');
    } catch (error) {
      console.error('⚠️ Erreur service d\'alertes:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Serveur sur http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 CORS autorisé pour: ${allowedOrigins.join(', ')}`);
      console.log(`🍪 Cookies: activés`);
      console.log(`📁 Dossiers uploads:`);
      console.log(`   - Factures actifs: ${path.join(process.cwd(), 'uploads/factures')}`);
      console.log(`   - Factures contrats: ${path.join(process.cwd(), 'uploads/factures_contrats')}`);
      console.log(`   - Documents: ${path.join(process.cwd(), 'uploads/documents')}`);
      console.log(`   - Photos de profil: ${path.join(process.cwd(), 'uploads/profiles')}`);
    });

    // Arrêt propre
    process.on('SIGTERM', () => {
      console.log('🛑 Arrêt du serveur...');
      TauxService.stopAutoUpdate();
      alerteService.stopAlerteService();
      server.close(() => {
        sequelize.close();
        console.log('✅ Serveur arrêté');
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Arrêt par Ctrl+C...');
      TauxService.stopAutoUpdate();
      alerteService.stopAlerteService();
      server.close(() => {
        sequelize.close();
        console.log('✅ Serveur arrêté');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ Erreur démarrage:', err);
    process.exit(1);
  }
}

startServer(); 