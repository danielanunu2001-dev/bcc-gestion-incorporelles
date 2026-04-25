const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// ✅ IMPORTER LE MODÈLE
const { User } = require('../models');

// ✅ IMPORTER LE MIDDLEWARE D'UPLOAD (chemin corrigé)
const uploadMiddleware = require('../middleware/upload');

// ==================== VALIDATIONS ====================

const userValidationRules = {
  create: [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('full_name').notEmpty().withMessage('Le nom complet est requis'),
    body('role').isIn(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'])
      .withMessage('Rôle invalide'),
  ],
  update: [
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('password').optional().isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('full_name').optional().notEmpty().withMessage('Le nom complet ne peut pas être vide'),
    body('role').optional().isIn(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'])
      .withMessage('Rôle invalide'),
    body('active').optional().isBoolean().withMessage('Le statut actif doit être un booléen'),
  ],
  changePassword: [
    body('oldPassword').notEmpty().withMessage('L\'ancien mot de passe est requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  ],
  resetPassword: [
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  ],
  updateProfile: [
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('full_name').optional().notEmpty().withMessage('Le nom complet ne peut pas être vide'),
  ]
};

// ==================== ROUTES PUBLIQUES (avec authentification) ====================

router.use(authMiddleware);

// ==================== ROUTES PROFIL PERSONNEL ====================

router.post('/change-password', userValidationRules.changePassword, userController.changePassword);
router.get('/profile', userController.getMyProfile);
router.put('/profile', userValidationRules.updateProfile, userController.updateMyProfile);

// ==================== ROUTES POUR LA PHOTO DE PROFIL ====================

// Middleware de vérification des permissions pour la photo
const checkPhotoPermission = (req, res, next) => {
  const userId = req.params.id;
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Non autorisé à modifier cette photo' });
  }
  next();
};

// Upload de photo de profil
router.post('/:id/photo', checkPhotoPermission, uploadMiddleware.uploadProfilePhoto.single('photo'), userController.uploadUserPhoto);

// Supprimer la photo de profil
router.delete('/:id/photo', checkPhotoPermission, userController.deleteUserPhoto);

// ==================== ROUTE POUR L'AUDIT ====================

router.get('/audit-list', async (req, res) => {
  try {
    const userRole = req.user.role;
    
    console.log(`🔐 Accès à /audit-list par rôle: ${userRole}`);
    
    let attributes = ['id', 'full_name'];
    
    if (['admin', 'auditeur'].includes(userRole)) {
      attributes.push('email');
    }
    
    const users = await User.findAll({
      attributes,
      order: [['full_name', 'ASC']]
    });
    
    console.log(`✅ ${users.length} utilisateurs retournés pour ${userRole}`);
    return res.json(users);
  } catch (error) {
    console.error('❌ Erreur route /audit-list:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ROUTES ADMIN ====================

router.use(authorize('admin'));

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userValidationRules.create, userController.createUser);
router.put('/:id', userValidationRules.update, userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-password', userValidationRules.resetPassword, userController.resetPassword);

module.exports = router;