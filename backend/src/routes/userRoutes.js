const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// ==================== VALIDATIONS ====================

const userValidationRules = {
  create: [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('full_name').notEmpty().withMessage('Le nom complet est requis'),
    // ✅ Ajout de 'gestionnaire' à la liste des rôles autorisés
    body('role').isIn(['admin', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste', 'gestionnaire'])
      .withMessage('Rôle invalide'),
  ],
  update: [
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('password').optional().isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('full_name').optional().notEmpty().withMessage('Le nom complet ne peut pas être vide'),
    // ✅ Ajout de 'gestionnaire' à la liste des rôles autorisés
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
  // ✅ NOUVELLE VALIDATION pour mise à jour profil
  updateProfile: [
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('full_name').optional().notEmpty().withMessage('Le nom complet ne peut pas être vide'),
  ]
};

// ==================== ROUTES PUBLIQUES (avec authentification) ====================

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// ==================== ROUTES PROFIL PERSONNEL ====================

/**
 * Route pour changer son propre mot de passe
 * Accessible à tous les utilisateurs connectés (pas besoin d'être admin)
 */
router.post(
  '/change-password',
  userValidationRules.changePassword,
  userController.changePassword
);

/**
 * Route pour récupérer son propre profil
 * Accessible à tous les utilisateurs connectés
 */
router.get('/profile', userController.getMyProfile);

/**
 * Route pour mettre à jour son propre profil
 * Accessible à tous les utilisateurs connectés
 */
router.put(
  '/profile',
  userValidationRules.updateProfile,
  userController.updateMyProfile
);

// ==================== ROUTES ADMIN ====================

// Toutes les routes ci-dessous nécessitent d'être admin
router.use(authorize('admin'));

/**
 * Récupérer tous les utilisateurs
 */
router.get('/', userController.getAllUsers);

/**
 * Récupérer un utilisateur par ID
 */
router.get('/:id', userController.getUserById);

/**
 * Créer un nouvel utilisateur
 */
router.post(
  '/',
  userValidationRules.create,
  userController.createUser
);

/**
 * Mettre à jour un utilisateur
 */
router.put(
  '/:id',
  userValidationRules.update,
  userController.updateUser
);

/**
 * Supprimer (désactiver) un utilisateur
 */
router.delete('/:id', userController.deleteUser);

/**
 * Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
 */
router.post(
  '/:id/reset-password',
  userValidationRules.resetPassword,
  userController.resetPassword
);

module.exports = router;