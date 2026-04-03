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
console.log('  - exportAnomalies:', typeof anomalieController.exportAnomalies);  // ← Ajouté

router.use(authMiddleware);

// ==================== ROUTES SPÉCIFIQUES (SANS PARAMÈTRES) ====================
// Ces routes doivent être AVANT la route /:id
router.get('/stats', authorize('admin', 'comptable', 'auditeur'), anomalieController.getStats);
router.get('/export', authorize('admin', 'comptable', 'auditeur'), anomalieController.exportAnomalies);

// ==================== ROUTES AVEC PARAMÈTRES ====================
router.get('/', authorize('admin', 'comptable', 'auditeur'), anomalieController.getAllAnomalies);
router.get('/:id', authorize('admin', 'comptable', 'auditeur'), anomalieController.getAnomalieById);

// ==================== ROUTES DE MODIFICATION ====================
router.post('/', authorize('admin', 'comptable'), anomalieController.createAnomalie);
router.put('/:id', authorize('admin', 'comptable'), anomalieController.updateAnomalie);
router.delete('/:id', authorize('admin'), anomalieController.deleteAnomalie);

module.exports = router;