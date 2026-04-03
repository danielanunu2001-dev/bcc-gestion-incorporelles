const express = require('express');
const router = express.Router();
const { uploadPhoto, uploadDocument } = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Upload de photo (pour les actifs, inventaire, etc.)
router.post('/photo', authorize('admin', 'comptable', 'inventoriste'), uploadPhoto.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    res.json({
      message: 'Photo uploadée avec succès',
      file: {
        filename: req.file.filename,
        path: `/uploads/photos/${req.file.filename}`,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload' });
  }
});

// Upload de document (contrats, factures, etc.)
router.post('/document', authorize('admin', 'comptable', 'juridique'), uploadDocument.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    res.json({
      message: 'Document uploadé avec succès',
      file: {
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload' });
  }
});

module.exports = router;