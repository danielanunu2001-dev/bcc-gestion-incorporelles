const express = require('express');
const router = express.Router({ mergeParams: true });
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

router.use(authMiddleware);

// ✅ ROUTE /all DOIT ÊTRE AVANT / (plus spécifique d'abord)
router.get('/all', 
  authorize('admin', 'comptable', 'juridique'), 
  documentController.getAllDocuments
);

// ✅ ROUTE POUR RÉCUPÉRER UN DOCUMENT PAR SON NOM DE FICHIER
router.get('/by-filename/:filename', 
  authorize('admin', 'comptable', 'juridique'), 
  documentController.getDocumentByFilename
);

// ✅ ROUTE GÉNÉRIQUE ENSUITE (celle qui utilise req.actifId)
router.get('/', 
  authorize('admin', 'comptable', 'juridique'), 
  documentController.getDocuments
);

router.post('/', 
  authorize('admin', 'comptable', 'juridique'), 
  upload.uploadDocument.single('fichier'),
  documentController.uploadDocument
);

router.get('/:documentId/download', 
  authorize('admin', 'comptable', 'juridique'), 
  documentController.downloadDocument
);

router.delete('/:documentId', 
  authorize('admin'), 
  documentController.deleteDocument
);

module.exports = router;