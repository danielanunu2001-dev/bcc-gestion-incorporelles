const express = require('express');
const router = express.Router();
const categorieController = require('../controllers/categorieAmortissementController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

router.use(authMiddleware);

router.get('/', authorize('admin', 'comptable'), categorieController.getAllCategories);
router.get('/:id', authorize('admin', 'comptable'), categorieController.getCategorieById);
router.post('/', authorize('admin'), categorieController.createCategorie);
router.put('/:id', authorize('admin'), categorieController.updateCategorie);
router.delete('/:id', authorize('admin'), categorieController.deleteCategorie);

module.exports = router;