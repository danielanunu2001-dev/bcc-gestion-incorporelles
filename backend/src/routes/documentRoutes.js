// backend/src/routes/documentRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const { uploadDocument, handleMulterError } = require('../middleware/upload'); // ✅ CORRECTION

router.use(authMiddleware);

// ==================== ROUTES DE LECTURE ====================

// Route /all (tous les documents)
router.get('/all', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getAllDocuments
);

// Route pour récupérer les statistiques des documents
router.get('/stats', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getDocumentStats
);

// Route pour récupérer les logs d'accès aux documents
router.get('/access-logs', 
  authorize('admin', 'auditeur'), 
  documentController.getAccessLogs
);

// Route pour récupérer un document par son nom de fichier
router.get('/by-filename/:filename', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getDocumentByFilename
);

// Route générique (documents d'un actif spécifique)
// Note: Cette route doit être après les routes spécifiques comme /all, /stats, etc.
router.get('/actif/:actifId', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.getDocuments
);

// Téléchargement d'un document
router.get('/:documentId/download', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.downloadDocument
);

// ==================== ROUTES D'ÉCRITURE ====================

// Upload d'un document - ✅ CORRECTION ICI
router.post('/upload', 
  authorize('admin', 'comptable', 'juridique', 'informatique'), 
  uploadDocument.single('file'),  // ✅ Changé: 'fichier' → 'file', et plus de upload.
  handleMulterError,               // ✅ Gestion d'erreur
  documentController.uploadDocument
);

// Enregistrer un log d'accès à un document
router.post('/log-access', 
  authorize('admin', 'comptable', 'juridique', 'auditeur', 'informatique', 'gestionnaire', 'inventoriste'), 
  documentController.logDocumentAccess
);

// Partager un document par email
router.post('/share', 
  authorize('admin', 'comptable', 'juridique', 'informatique'), 
  documentController.shareDocument
);

// Suppression d'un document
router.delete('/:documentId', 
  authorize('admin', 'informatique'), 
  documentController.deleteDocument
);

module.exports = router;