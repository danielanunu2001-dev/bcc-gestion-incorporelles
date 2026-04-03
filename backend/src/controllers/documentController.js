// backend/src/controllers/documentController.js

const { Document, Actif, User, AuditLog } = require('../models');
const fs = require('fs');
const path = require('path');

// ==================== UTILITAIRE DE LOG ====================
const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, ipAddress = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress
    });
    console.log(`✅ Log créé: ${action} sur ${tableName}/${recordId}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};

// ==================== ROUTES ====================

/**
 * Récupérer TOUS les documents (pour l'archive légale)
 */
exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      include: [
        { 
          model: User, 
          as: 'createurDocument', 
          attributes: ['id', 'full_name', 'email'] 
        },
        {
          model: Actif,
          as: 'actif',
          attributes: ['id', 'code', 'nom']
        }
      ],
      order: [['date_upload', 'DESC']]
    });
    
    console.log(`✅ ${documents.length} documents récupérés pour l'archive légale`);
    res.json(documents);
  } catch (error) {
    console.error('❌ Erreur getAllDocuments:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des documents' });
  }
};

// ✅ NOUVELLE FONCTION : Récupérer un document par son nom de fichier
/**
 * Récupérer un document par son nom de fichier (pour les rapports annuels)
 */
exports.getDocumentByFilename = async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`🔍 Recherche du document par nom: ${filename}`);
    
    const document = await Document.findOne({
      where: { nom_fichier: filename },
      include: [
        { 
          model: User, 
          as: 'createurDocument', 
          attributes: ['id', 'full_name', 'email'] 
        },
        {
          model: Actif,
          as: 'actif',
          attributes: ['id', 'code', 'nom']
        }
      ]
    });
    
    if (!document) {
      console.log(`❌ Document non trouvé: ${filename}`);
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    
    console.log(`✅ Document trouvé: ${document.nom_fichier} (ID: ${document.id})`);
    res.json(document);
  } catch (error) {
    console.error('❌ Erreur getDocumentByFilename:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer tous les documents d'un actif
 */
exports.getDocuments = async (req, res) => {
  try {
    const { actifId } = req;
    const documents = await Document.findAll({
      where: { actif_id: actifId },
      include: [{ model: User, as: 'createurDocument', attributes: ['id', 'full_name'] }],
      order: [['date_upload', 'DESC']]
    });
    res.json(documents);
  } catch (error) {
    console.error('❌ Erreur getDocuments:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Upload d'un document
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { actifId } = req;
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const { description } = req.body;
    
    const document = await Document.create({
      actif_id: actifId,
      nom_fichier: req.file.originalname,
      chemin_fichier: req.file.path,
      type_fichier: req.file.mimetype,
      taille_fichier: req.file.size,
      description,
      created_by: req.user.id
    });

    console.log(`✅ Document uploadé: ${document.nom_fichier} (${document.taille_fichier} octets)`);

    // ✅ LOG D'AUDIT : Upload de document
    await logAction(
      req.user.id,
      'DOCUMENT_UPLOAD',
      'documents',
      document.id,
      null,
      {
        nom_fichier: req.file.originalname,
        type: req.file.mimetype,
        taille: req.file.size,
        description: description || null
      },
      req.ip
    );

    // Recharger avec les associations
    const nouveauDoc = await Document.findByPk(document.id, {
      include: [{ model: User, as: 'createurDocument', attributes: ['id', 'full_name'] }]
    });

    res.status(201).json(nouveauDoc);
  } catch (error) {
    console.error('❌ Erreur uploadDocument:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Télécharger un document
 */
exports.downloadDocument = async (req, res) => {
  try {
    console.log('🔍 ========== DOWNLOAD DOCUMENT ==========');
    console.log('📝 Document ID:', req.params.documentId);
    
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({ message: 'ID du document manquant' });
    }

    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    console.log(`✅ Document trouvé: ${document.nom_fichier}`);
    console.log(`📁 Chemin en base: ${document.chemin_fichier}`);

    // ✅ CORRECTION : Construire le chemin à partir du dossier backend
    // __dirname = C:\Users\oo\bcc-gestion-incorporelles\backend\src\controllers
    // On remonte de 2 niveaux pour atteindre le dossier backend
    const backendRoot = path.join(__dirname, '../..');
    const filePath = path.join(backendRoot, document.chemin_fichier);
    
    console.log(`📂 Dossier backend: ${backendRoot}`);
    console.log(`🔍 Chemin complet: ${filePath}`);
    console.log(`🔍 Le fichier existe? ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Fichier introuvable`);
      
      // Afficher les fichiers disponibles dans le dossier pour déboguer
      const archivesDir = path.join(backendRoot, 'uploads/archives');
      if (fs.existsSync(archivesDir)) {
        console.log(`📂 Fichiers disponibles dans ${archivesDir}:`);
        const years = fs.readdirSync(archivesDir);
        years.forEach(year => {
          const yearPath = path.join(archivesDir, year);
          if (fs.statSync(yearPath).isDirectory()) {
            const files = fs.readdirSync(yearPath);
            console.log(`   ${year}: ${files.length} fichiers`);
            files.slice(0, 5).forEach(f => console.log(`      - ${f}`));
          }
        });
      }
      
      return res.status(404).json({ 
        message: 'Fichier introuvable sur le serveur',
        expectedPath: filePath
      });
    }

    // ✅ LOG D'AUDIT : Téléchargement de document
    await logAction(
      req.user.id,
      'DOCUMENT_DOWNLOAD',
      'documents',
      documentId,
      null,
      { nom_fichier: document.nom_fichier, type: document.type_fichier },
      req.ip
    );

    console.log(`✅ Téléchargement du fichier: ${document.nom_fichier}`);
    res.download(filePath, document.nom_fichier);
  } catch (error) {
    console.error('❌ Erreur downloadDocument:', error);
    res.status(500).json({ message: 'Erreur serveur lors du téléchargement', error: error.message });
  }
};

/**
 * Supprimer un document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Sauvegarder les données pour le log
    const oldData = {
      nom_fichier: document.nom_fichier,
      type_fichier: document.type_fichier,
      taille_fichier: document.taille_fichier,
      description: document.description,
      chemin_fichier: document.chemin_fichier
    };

    // Supprimer le fichier physique
    try {
      fs.unlinkSync(document.chemin_fichier);
      console.log(`🗑️ Fichier physique supprimé: ${document.chemin_fichier}`);
    } catch (err) {
      console.warn('⚠️ Fichier déjà supprimé ou inaccessible:', err.message);
    }

    await document.destroy();

    console.log(`✅ Document supprimé: ${documentId} - ${document.nom_fichier}`);

    // ✅ LOG D'AUDIT : Suppression de document
    await logAction(
      req.user.id,
      'DOCUMENT_DELETE',
      'documents',
      documentId,
      oldData,
      null,
      req.ip
    );

    res.json({ message: 'Document supprimé' });
  } catch (error) {
    console.error('❌ Erreur deleteDocument:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};