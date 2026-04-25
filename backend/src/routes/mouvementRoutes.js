// backend/src/routes/mouvementRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const mouvementController = require('../controllers/mouvementController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

router.use(authMiddleware);

// ==================== ROUTES ====================

// ✅ AJOUT DE 'juridique' POUR LA LECTURE DES MOUVEMENTS
router.get('/', authorize('admin', 'comptable', 'inventoriste', 'auditeur', 'gestionnaire', 'juridique'), mouvementController.getMouvements);
router.get('/:mouvementId', authorize('admin', 'comptable', 'auditeur', 'gestionnaire', 'juridique'), mouvementController.getMouvementById);

// Routes d'écriture (admin et comptable uniquement)
// ❌ Le juridique ne peut PAS créer/modifier/supprimer des mouvements
router.post('/', authorize('admin', 'comptable', 'gestionnaire'), mouvementController.createMouvement);
router.put('/:mouvementId', authorize('admin', 'comptable', 'gestionnaire'), mouvementController.updateMouvement);
router.delete('/:mouvementId', authorize('admin'), mouvementController.deleteMouvement);

// Routes d'action spécifiques
// ❌ Le juridique ne peut PAS valider/annuler des mouvements
router.put('/:mouvementId/valider', authorize('admin', 'comptable', 'gestionnaire'), mouvementController.validerMouvement);
router.put('/:mouvementId/annuler', authorize('admin', 'comptable', 'gestionnaire'), mouvementController.annulerMouvement);

module.exports = router;