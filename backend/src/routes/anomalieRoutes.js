// backend/src/routes/anomalieRoutes.js

const express = require('express');
const router = express.Router();
const anomalieController = require('../controllers/anomalieController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Vérifier que le contrôleur est bien chargé
console.log('🔍 Vérification anomalieController:');
console.log('  - getAllAnomalies:', typeof anomalieController.getAllAnomalies);
console.log('  - getStats:', typeof anomalieController.getStats);
console.log('  - getAnomalieById:', typeof anomalieController.getAnomalieById);
console.log('  - createAnomalie:', typeof anomalieController.createAnomalie);
console.log('  - updateAnomalie:', typeof anomalieController.updateAnomalie);
console.log('  - deleteAnomalie:', typeof anomalieController.deleteAnomalie);
console.log('  - exportAnomaliesPDF:', typeof anomalieController.exportAnomaliesPDF);

router.use(authMiddleware);

// ==================== ROUTES SPÉCIFIQUES (SANS PARAMÈTRES) ====================
// Ces routes doivent être AVANT la route /:id
// ✅ AJOUT DE 'juridique' POUR LA LECTURE DES STATS
router.get('/stats', authorize('admin', 'comptable', 'auditeur', 'gestionnaire', 'inventoriste', 'juridique'), anomalieController.getStats);

// ✅ ROUTE D'EXPORT PDF (juridique peut exporter)
router.get('/export-pdf', authorize('admin', 'comptable', 'auditeur', 'gestionnaire', 'juridique'), anomalieController.exportAnomaliesPDF);

// ==================== ROUTES AVEC PARAMÈTRES ====================
// ✅ AJOUT DE 'juridique' POUR LA LECTURE DES ANOMALIES
router.get('/', authorize('admin', 'comptable', 'auditeur', 'gestionnaire', 'inventoriste', 'juridique'), anomalieController.getAllAnomalies);
router.get('/:id', authorize('admin', 'comptable', 'auditeur', 'gestionnaire', 'inventoriste', 'juridique'), anomalieController.getAnomalieById);

// ==================== ROUTES DE MODIFICATION ====================
// ❌ Le juridique ne peut PAS créer/modifier/supprimer des anomalies
router.post('/', authorize('admin', 'comptable', 'gestionnaire', 'inventoriste'), anomalieController.createAnomalie);
router.put('/:id', authorize('admin', 'comptable', 'gestionnaire', 'inventoriste'), anomalieController.updateAnomalie);
router.delete('/:id', authorize('admin'), anomalieController.deleteAnomalie);

module.exports = router;