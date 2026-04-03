// backend/src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser'); // ✅ Correction: cookie-parser
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// ✅ IMPORT CORRECT - Utiliser la destructuration
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

// ROUTES DOCUMENTS
const documentRoutes = require('./routes/documentRoutes');

// NOUVELLES ROUTES
const categorieAmortissementRoutes = require('./routes/categorieAmortissementRoutes');
const reevaluationRoutes = require('./routes/reevaluationRoutes');

// ROUTES D'UPLOAD
const uploadRoutes = require('./routes/uploadRoutes');

// ROUTES DES ANOMALIES
const anomalieRoutes = require('./routes/anomalieRoutes');

// ROUTES DES DEVISES
const deviseRoutes = require('./routes/deviseRoutes');

// ✅ ROUTES DES EXERCICES COMPTABLES
const exerciceRoutes = require('./routes/exerciceRoutes');

// SERVICE DE MISE À JOUR AUTOMATIQUE DES TAUX DE CHANGE
const TauxService = require('./services/tauxService');

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ✅ ROUTE INDÉPENDANTE POUR LES DOCUMENTS (ARCHIVE LÉGALE)
app.use('/api/documents', documentRoutes);

// ✅ ROUTE POUR LES EXERCICES COMPTABLES
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
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      actifs: '/api/actifs',
      categories: '/api/categories-amortissement',
      contrats: '/api/contrats',
      contrats_actif: '/api/actifs/:id/contrats',
      depreciations: '/api/actifs/:id/depreciations',
      mouvements: '/api/actifs/:id/mouvements',
      documents: '/api/documents',
      documents_actif: '/api/actifs/:id/documents',
      reevaluations: '/api/actifs/:id/reevaluations',
      anomalies: '/api/anomalies',
      devises: '/api/devises',
      audit: '/api/audit-logs',
      reports: '/api/reports',
      uploads: '/api/uploads',
      exercices: '/api/exercices'
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
    const fs = require('fs');
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

    const uploadDir = path.join(__dirname, '../uploads/factures_contrats');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Dossier créé: ${uploadDir}\n`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contrat of contrats) {
      try {
        console.log(`   📄 Génération facture pour ${contrat.numero_contrat}...`);
        
        const fileName = `facture_contrat_${contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
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
    console.log(`   📁 Dossier: ${path.join(__dirname, '../uploads/factures_contrats')}\n`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des factures:', error);
  }
}

async function startServer() {
  try {
    console.log('\n🔄 Connexion à PostgreSQL...');
    
    // ✅ Utiliser testConnection pour vérifier la connexion
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

    // Démarrer le service de taux de change
    console.log('\n💰 Initialisation du service de taux de change...');
    try {
      await TauxService.initialize();
      TauxService.startAutoUpdate();
      console.log('✅ Service de taux de change démarré (mise à jour automatique toutes les 24h)');
    } catch (error) {
      console.error('⚠️ Erreur service de taux:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Serveur sur http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 CORS autorisé pour: ${allowedOrigins.join(', ')}`);
      console.log(`🍪 Cookies: activés`);
      console.log(`📦 Routes chargées:`);
      console.log(`   - Auth: /api/auth`);
      console.log(`   - Users: /api/users`);
      console.log(`   - Actifs: /api/actifs`);
      console.log(`   - Catégories: /api/categories-amortissement`);
      console.log(`   - Contrats: /api/contrats`);
      console.log(`   - Anomalies: /api/anomalies`);
      console.log(`   - 💰 Devises: /api/devises`);
      console.log(`   - Audit: /api/audit-logs`);
      console.log(`   - Reports: /api/reports`);
      console.log(`   - Uploads: /api/uploads`);
      console.log(`   - 📄 Documents: /api/documents`);
      console.log(`   - 📊 Exercices comptables: /api/exercices`);
      console.log(`   - 📑 Factures contrats: génération automatique au démarrage`);
    });

    // Arrêt propre
    process.on('SIGTERM', () => {
      console.log('🛑 Arrêt du serveur...');
      TauxService.stopAutoUpdate();
      server.close(() => {
        sequelize.close();
        console.log('✅ Serveur arrêté');
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Arrêt par Ctrl+C...');
      TauxService.stopAutoUpdate();
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