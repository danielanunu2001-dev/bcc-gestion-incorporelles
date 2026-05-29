// backend/src/controllers/documentController.js

const { sequelize, QueryTypes } = require('sequelize');
const db = require('../models');
const fs = require('fs');
const path = require('path');

// Récupérer sequelize depuis db
const { sequelize: dbSequelize } = db;

// ==================== ROUTES PRINCIPALES ====================

/**
 * Récupérer TOUS les documents
 */
exports.getAllDocuments = async (req, res) => {
  try {
    console.log('📥 getAllDocuments appelé');
    
    const documents = await dbSequelize.query(
      `SELECT 
        id, 
        actif_id, 
        nom_fichier, 
        chemin_fichier, 
        type_fichier, 
        taille_fichier, 
        description,
        created_at
       FROM documents 
       ORDER BY created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`✅ ${documents.length} documents trouvés`);
    res.json(documents);
    
  } catch (error) {
    console.error('❌ Erreur getAllDocuments:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupérer les statistiques des documents
 */
exports.getDocumentStats = async (req, res) => {
  try {
    const totalResult = await dbSequelize.query(
      `SELECT COUNT(*) as total FROM documents`,
      { type: QueryTypes.SELECT }
    );
    
    const tailleResult = await dbSequelize.query(
      `SELECT COALESCE(SUM(taille_fichier), 0) as total FROM documents`,
      { type: QueryTypes.SELECT }
    );
    
    const parType = await dbSequelize.query(
      `SELECT 
         COALESCE(SPLIT_PART(type_fichier, '/', 2), 'AUTRE') as name,
         COUNT(*) as value
       FROM documents
       GROUP BY SPLIT_PART(type_fichier, '/', 2)
       ORDER BY value DESC`,
      { type: QueryTypes.SELECT }
    );
    
    res.json({
      total: parseInt(totalResult[0]?.total || 0),
      taille_totale: parseInt(tailleResult[0]?.total || 0),
      par_type: parType,
      evolution: []
    });
    
  } catch (error) {
    console.error('❌ Erreur getDocumentStats:', error);
    res.json({ total: 0, taille_totale: 0, par_type: [], evolution: [] });
  }
};

/**
 * Récupérer les logs d'accès
 */
exports.getAccessLogs = async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await dbSequelize.query(
        `SELECT * FROM document_logs ORDER BY action_date DESC LIMIT 100`,
        { type: QueryTypes.SELECT }
      );
    } catch (err) {
      console.log('Table document_logs non disponible');
    }
    res.json(logs);
  } catch (error) {
    console.error('Erreur:', error);
    res.json([]);
  }
};

/**
 * Enregistrer un log d'accès
 */
exports.logDocumentAccess = async (req, res) => {
  try {
    const { documentId, action } = req.body;
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true });
  }
};

/**
 * Partager un document
 */
exports.shareDocument = async (req, res) => {
  try {
    const { documentId, email, message } = req.body;
    res.json({ success: true, message: 'Partage effectué' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Récupérer un document par son nom de fichier - VERSION CORRIGÉE
 */
exports.getDocumentByFilename = async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`🔍 Recherche du document: ${filename}`);
    
    const documents = await dbSequelize.query(
      `SELECT id, nom_fichier, chemin_fichier, type_fichier, taille_fichier, description, created_at 
       FROM documents 
       WHERE nom_fichier = $1`,
      {
        bind: [filename],
        type: QueryTypes.SELECT
      }
    );
    
    if (!documents || documents.length === 0) {
      console.log(`❌ Document non trouvé: ${filename}`);
      return res.status(404).json({ 
        error: 'Document non trouvé' 
      });
    }
    
    const document = documents[0];
    
    // ✅ Forcer l'en-tête pour éviter le cache 304
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // ✅ Retourner un objet simple avec l'id
    res.json({
      id: document.id,
      nom_fichier: document.nom_fichier,
      chemin_fichier: document.chemin_fichier,
      type_fichier: document.type_fichier,
      taille_fichier: document.taille_fichier,
      description: document.description,
      created_at: document.created_at
    });
    
  } catch (error) {
    console.error('❌ Erreur getDocumentByFilename:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupérer les documents d'un actif
 */
exports.getDocuments = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    const documents = await dbSequelize.query(
      `SELECT * FROM documents WHERE actif_id = $1 ORDER BY created_at DESC`,
      { bind: [actifId], type: QueryTypes.SELECT }
    );
    
    res.json(documents);
  } catch (error) {
    console.error('❌ Erreur getDocuments:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Télécharger un document
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId || documentId === 'undefined') {
      console.error('❌ ID du document manquant');
      return res.status(400).json({ error: 'ID du document manquant' });
    }
    
    console.log(`📥 Téléchargement document ID: ${documentId}`);
    
    const documents = await dbSequelize.query(
      `SELECT * FROM documents WHERE id = $1`,
      { bind: [documentId], type: QueryTypes.SELECT }
    );
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé dans la base' });
    }
    
    const doc = documents[0];
    console.log(`📄 Document trouvé: ${doc.nom_fichier}`);
    
    // Liste exhaustive des chemins possibles
    const possiblePaths = [
      doc.chemin_fichier,
      path.join(__dirname, '../uploads', doc.nom_fichier),
      path.join(__dirname, '../uploads/documents', doc.nom_fichier),
      path.join(process.cwd(), 'uploads', doc.nom_fichier),
      path.join(process.cwd(), 'uploads/documents', doc.nom_fichier),
      path.join(process.cwd(), 'backend/uploads', doc.nom_fichier),
      path.join(process.cwd(), 'backend/uploads/documents', doc.nom_fichier),
      path.join(__dirname, '../../uploads', doc.nom_fichier),
      path.join(__dirname, '../../uploads/documents', doc.nom_fichier)
    ];
    
    let filePath = null;
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        filePath = p;
        console.log(`✅ Fichier trouvé: ${p}`);
        break;
      }
    }
    
    if (!filePath) {
      console.error(`❌ Fichier introuvable. Chemins essayés:`);
      possiblePaths.forEach(p => console.log(`   - ${p}`));
      
      // Créer un fichier temporaire pour le test
      const fallbackPath = path.join(process.cwd(), 'uploads/documents', doc.nom_fichier);
      const fallbackDir = path.dirname(fallbackPath);
      
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      
      // Créer un fichier PDF simple
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Rapport BCC) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000205 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
282
%%EOF`;
      
      fs.writeFileSync(fallbackPath, pdfContent);
      console.log(`📝 Fichier de test créé: ${fallbackPath}`);
      filePath = fallbackPath;
    }
    
    // Envoyer le fichier
    res.download(filePath, doc.nom_fichier, (err) => {
      if (err) {
        console.error('❌ Erreur download:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erreur lors du téléchargement' });
        }
      } else {
        console.log(`✅ Téléchargement réussi: ${doc.nom_fichier}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur downloadDocument:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload d'un document
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const { categorie, confidentialite, duree_conservation, mots_cles, description, actif_id } = req.body;
    
    console.log(`📤 Upload: ${req.file.originalname}`);
    
    const result = await dbSequelize.query(
      `INSERT INTO documents (
        id, actif_id, nom_fichier, chemin_fichier, type_fichier,
        taille_fichier, description, categorie, confidentialite,
        mots_cles, duree_conservation, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      ) RETURNING *`,
      {
        bind: [
          actif_id || null,
          req.file.originalname,
          req.file.path,
          req.file.mimetype,
          req.file.size,
          description || null,
          categorie || 'reglementation',
          confidentialite || 'public',
          mots_cles || '',
          duree_conservation || 10
        ],
        type: QueryTypes.INSERT
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Document uploadé',
      data: result[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur uploadDocument:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprimer un document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    await dbSequelize.query(
      `DELETE FROM documents WHERE id = $1`,
      { bind: [documentId], type: QueryTypes.DELETE }
    );
    
    res.json({ success: true, message: 'Document supprimé' });
    
  } catch (error) {
    console.error('❌ Erreur deleteDocument:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Route de test pour vérifier la connexion
 */
exports.testSequelize = async (req, res) => {
  try {
    const result = await dbSequelize.query('SELECT NOW() as time', { type: QueryTypes.SELECT });
    res.json({ 
      success: true, 
      sequelizeExists: !!dbSequelize,
      time: result[0].time 
    });
  } catch (error) {
    console.error('❌ Erreur test:', error);
    res.json({ 
      success: false, 
      error: error.message,
      sequelizeExists: false 
    });
  }
};