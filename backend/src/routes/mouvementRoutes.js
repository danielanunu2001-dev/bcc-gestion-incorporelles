// backend/src/routes/mouvementRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const mouvementController = require('../controllers/mouvementController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

router.use(authMiddleware);

// Routes
router.get('/', authorize('admin', 'comptable', 'inventoriste'), mouvementController.getMouvements);
router.post('/', authorize('admin', 'comptable'), mouvementController.createMouvement);
router.get('/:mouvementId', authorize('admin', 'comptable'), mouvementController.getMouvementById);
router.put('/:mouvementId', authorize('admin', 'comptable'), mouvementController.updateMouvement);
router.delete('/:mouvementId', authorize('admin'), mouvementController.deleteMouvement);

// ✅ Routes spécifiques - DOIVENT ÊTRE APRÈS LES ROUTES GÉNÉRIQUES
router.put('/:mouvementId/valider', authorize('admin', 'comptable'), mouvementController.validerMouvement);
router.put('/:mouvementId/annuler', authorize('admin', 'comptable'), mouvementController.annulerMouvement);

module.exports = router;