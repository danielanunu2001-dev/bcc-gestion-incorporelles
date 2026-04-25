const express = require('express');
const router = express.Router();
const categorieController = require('../controllers/categorieAmortissementController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

router.use(authMiddleware);

// ==================== ROUTES DE LECTURE ====================
// ✅ AJOUT DE 'gestionnaire' POUR LA LECTURE DES CATÉGORIES
router.get('/', authorize('admin', 'comptable', 'gestionnaire'), categorieController.getAllCategories);
router.get('/:id', authorize('admin', 'comptable', 'gestionnaire'), categorieController.getCategorieById);

// ==================== ROUTES D'ÉCRITURE ====================
// ⚠️ Le gestionnaire ne peut PAS créer/modifier/supprimer des catégories
router.post('/', authorize('admin'), categorieController.createCategorie);
router.put('/:id', authorize('admin'), categorieController.updateCategorie);
router.delete('/:id', authorize('admin'), categorieController.deleteCategorie);

module.exports = router;