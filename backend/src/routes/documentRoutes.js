// backend/src/routes/documentRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

router.use(authMiddleware);

// ==================== ROUTES DE LECTURE (ACCESSIBLES À L'AUDITEUR ET INFORMATIQUE) ====================
// ✅ AJOUT DE 'informatique' À TOUTES LES ROUTES GET
// ✅ AJOUT DE 'gestionnaire' POUR LA LECTURE
// ✅ AJOUT DE 'inventoriste' POUR LA LECTURE

// Route /all (tous les documents)
router.get('/all', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getAllDocuments
);

// Route pour récupérer un document par son nom de fichier
router.get('/by-filename/:filename', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getDocumentByFilename
);

// Route générique (documents d'un actif spécifique)
router.get('/', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getDocuments
);

// Téléchargement d'un document
router.get('/:documentId/download', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.downloadDocument
);

// ==================== ROUTES D'ÉCRITURE (INTERDITES À L'AUDITEUR, AUTORISÉES POUR INFORMATIQUE) ====================

// Upload d'un document (admin, comptable, juridique, informatique)
// ⚠️ Le gestionnaire ne peut PAS uploader de documents (lecture seule)
// ⚠️ L'inventoriste ne peut PAS uploader de documents
router.post('/', 
  authorize('admin', 'comptable', 'juridique', 'informatique'), 
  upload.uploadDocument.single('fichier'),
  documentController.uploadDocument
);

// Suppression d'un document (admin et informatique)
// ⚠️ Le gestionnaire ne peut PAS supprimer de documents
// ⚠️ L'inventoriste ne peut PAS supprimer de documents
router.delete('/:documentId', 
  authorize('admin', 'informatique'), 
  documentController.deleteDocument
);

module.exports = router;