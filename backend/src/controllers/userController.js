const { User, AuditLog } = require('../models');
const bcrypt = require('bcrypt');
const { sequelize } = require('../models');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ==================== UTILITAIRES ====================

/**
 * Journaliser une action dans AuditLog
 */
const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, ipAddress) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress
    });
  } catch (error) {
    console.error('❌ Erreur lors du logging:', error);
    // Ne pas bloquer l'action principale si le logging échoue
  }
};

// ==================== GESTION DE LA PHOTO DE PROFIL ====================

/**
 * Uploader une photo de profil
 */
exports.uploadUserPhoto = async (req, res) => {
  console.log('📸 Upload photo pour user:', req.params.id);
  
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun fichier uploadé' 
      });
    }
    
    console.log('📁 Fichier reçu:', req.file.filename);
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(id);
    if (!user) {
      // Supprimer le fichier uploadé si l'utilisateur n'existe pas
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }
    
    // Supprimer l'ancienne photo si elle existe
    if (user.photo_url) {
      const oldPhotoPath = path.join(__dirname, '../uploads/profiles', path.basename(user.photo_url));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
        console.log('🗑️ Ancienne photo supprimée');
      }
    }
    
    // Optimiser l'image avec Sharp
    const profilesDir = path.join(__dirname, '../uploads/profiles');
    const optimizedFilename = `profile-${id}-optimized-${Date.now()}.jpg`;
    const optimizedPath = path.join(profilesDir, optimizedFilename);
    
    await sharp(req.file.path)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(optimizedPath);
    
    console.log('🖼️ Image optimisée:', optimizedFilename);
    
    // Supprimer le fichier temporaire original
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // URL de la photo
    const photoUrl = `/uploads/profiles/${optimizedFilename}`;
    
    // Mettre à jour l'utilisateur
    await user.update({
      photo_url: photoUrl,
      updated_at: new Date()
    });
    
    console.log('✅ Photo mise à jour pour user:', id);
    
    // Journaliser l'action
    await logAction(
      req.user.id,
      'UPDATE',
      'users',
      user.id,
      { photo_url: user.photo_url },
      { photo_url: photoUrl },
      req.ip
    );
    
    // Récupérer l'utilisateur mis à jour (sans le mot de passe)
    const updatedUser = user.toJSON();
    delete updatedUser.password_hash;
    
    res.json({
      success: true,
      message: 'Photo mise à jour avec succès',
      photo_url: photoUrl,
      user: updatedUser
    });
    
  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'upload de la photo'
    });
  }
};

/**
 * Supprimer la photo de profil
 */
exports.deleteUserPhoto = async (req, res) => {
  console.log('🗑️ Suppression photo pour user:', req.params.id);
  
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }
    
    if (user.photo_url) {
      const photoPath = path.join(__dirname, '../uploads/profiles', path.basename(user.photo_url));
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log('🗑️ Photo supprimée du disque');
      }
      
      const oldPhotoUrl = user.photo_url;
      
      await user.update({
        photo_url: null,
        updated_at: new Date()
      });
      
      // Journaliser l'action
      await logAction(
        req.user.id,
        'UPDATE',
        'users',
        user.id,
        { photo_url: oldPhotoUrl },
        { photo_url: null },
        req.ip
      );
      
      console.log('✅ Photo supprimée pour user:', id);
    }
    
    // Récupérer l'utilisateur mis à jour
    const updatedUser = user.toJSON();
    delete updatedUser.password_hash;
    
    res.json({
      success: true,
      message: 'Photo supprimée avec succès',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression photo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la photo'
    });
  }
};

// ==================== CRUD UTILISATEURS ====================

/**
 * Récupérer tous les utilisateurs
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log('📋 Récupération de tous les utilisateurs');
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
    console.log(`✅ ${users.length} utilisateurs trouvés`);
    res.json(users);
  } catch (error) {
    console.error('❌ Erreur getAllUsers:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer un utilisateur par ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Recherche utilisateur ID: ${id}`);
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      console.log(`⚠️ Utilisateur ID ${id} non trouvé`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.email}`);
    res.json(user);
  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer un nouvel utilisateur
 */
exports.createUser = async (req, res) => {
  console.log('📦 Données reçues (createUser):', req.body);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Validation des entrées
    const errors = validationResult(req);
    console.log('🔍 Erreurs validation:', errors.array());
    
    if (!errors.isEmpty()) {
      console.log('❌ Validation échouée');
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, role } = req.body;
    console.log('📧 Email:', email);
    console.log('👤 Rôle:', role);
    console.log('📝 Nom complet:', full_name);
    console.log('🔑 Mot de passe présent:', !!password);

    // Vérifier si l'email existe déjà
    console.log('🔍 Vérification existence email...');
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('⚠️ Email déjà existant:', email);
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    console.log('✅ Email disponible');

    // Hacher le mot de passe
    console.log('🔒 Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Mot de passe haché');

    // Créer l'utilisateur
    console.log('💾 Création de l\'utilisateur...');
    const user = await User.create({
      email,
      password_hash: hashedPassword,
      full_name,
      role
    }, { transaction });

    console.log(`✅ Utilisateur créé avec ID: ${user.id}`);
    await transaction.commit();

    // Journaliser l'action
    await logAction(
      req.user?.id || user.id,
      'CREATE',
      'users',
      user.id,
      null,
      { email, full_name, role },
      req.ip
    );
    console.log('📝 Action journalisée');

    // Retourner l'utilisateur sans le mot de passe
    res.status(201).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createUser:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

/**
 * Mettre à jour un utilisateur
 */
exports.updateUser = async (req, res) => {
  console.log('📦 Données reçues (updateUser):', req.body);
  console.log('🔍 ID utilisateur:', req.params.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    // Validation des entrées
    const errors = validationResult(req);
    console.log('🔍 Erreurs validation:', errors.array());
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, full_name, role, password, active } = req.body;

    console.log('🔍 Recherche utilisateur...');
    const user = await User.findByPk(id);
    if (!user) {
      console.log(`⚠️ Utilisateur ID ${id} non trouvé`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.log(`✅ Utilisateur trouvé: ${user.email}`);

    // Sauvegarder les anciennes données pour le log
    const oldData = {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      active: user.active
    };
    console.log('📝 Anciennes données:', oldData);

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== user.email) {
      console.log(`🔍 Vérification nouvel email: ${email}`);
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.log('⚠️ Nouvel email déjà utilisé');
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      console.log('✅ Nouvel email disponible');
    }

    // Préparer les mises à jour
    const updates = {};
    if (email) updates.email = email;
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (password) {
      console.log('🔒 Hachage nouveau mot de passe...');
      updates.password_hash = await bcrypt.hash(password, 10);
      console.log('✅ Nouveau mot de passe haché');
    }

    console.log('🔄 Mise à jour avec:', updates);
    await user.update(updates, { transaction });
    console.log('✅ Utilisateur mis à jour');

    await transaction.commit();

    // Journaliser l'action
    await logAction(
      req.user.id,
      'UPDATE',
      'users',
      user.id,
      oldData,
      { email, full_name, role, active },
      req.ip
    );
    console.log('📝 Action journalisée');

    // Retourner l'utilisateur mis à jour
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      active: user.active,
      updated_at: user.updated_at
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur updateUser:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer (désactiver) un utilisateur
 */
exports.deleteUser = async (req, res) => {
  console.log('🗑️ Suppression utilisateur ID:', req.params.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      console.log(`⚠️ Utilisateur ID ${id} non trouvé`);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.log(`✅ Utilisateur trouvé: ${user.email}`);

    // Empêcher la suppression de son propre compte
    if (req.user.id === id) {
      console.log('⚠️ Tentative de suppression de son propre compte');
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Supprimer la photo de profil si elle existe
    if (user.photo_url) {
      const photoPath = path.join(__dirname, '../uploads/profiles', path.basename(user.photo_url));
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log('🗑️ Photo de profil supprimée');
      }
    }

    // Sauvegarder les données pour le log
    const oldData = {
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    console.log('💾 Suppression...');
    await user.destroy({ transaction });
    console.log('✅ Utilisateur supprimé');

    await transaction.commit();

    // Journaliser l'action
    await logAction(
      req.user.id,
      'DELETE',
      'users',
      id,
      oldData,
      null,
      req.ip
    );
    console.log('📝 Action journalisée');

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur deleteUser:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== GESTION DU MOT DE PASSE ====================

/**
 * Changer son propre mot de passe
 */
exports.changePassword = async (req, res) => {
  console.log('🔐 Changement de mot de passe pour user:', req.user.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { oldPassword, newPassword } = req.body;
    
    // Valider les entrées
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier l'ancien mot de passe
    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      console.log('⚠️ Ancien mot de passe incorrect');
      return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    }
    console.log('✅ Ancien mot de passe valide');

    // Mettre à jour le mot de passe
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save({ transaction });
    console.log('✅ Mot de passe mis à jour');

    await transaction.commit();

    // Journaliser l'action
    await logAction(
      req.user.id,
      'UPDATE',
      'users',
      user.id,
      null,
      { password_changed: true },
      req.ip
    );

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur changePassword:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
 */
exports.resetPassword = async (req, res) => {
  console.log('🔄 Réinitialisation mot de passe pour user:', req.params.id);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Réinitialiser le mot de passe
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save({ transaction });
    console.log('✅ Mot de passe réinitialisé');

    await transaction.commit();

    // Journaliser l'action
    await logAction(
      req.user.id,
      'RESET_PASSWORD',
      'users',
      user.id,
      null,
      { password_reset: true },
      req.ip
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== GESTION DES PROFILS ====================

/**
 * Récupérer son propre profil
 */
exports.getMyProfile = async (req, res) => {
  console.log('👤 Récupération profil user:', req.user.id);
  
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    console.log('✅ Profil récupéré');
    res.json(user);
  } catch (error) {
    console.error('❌ Erreur getMyProfile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Mettre à jour son propre profil
 */
exports.updateMyProfile = async (req, res) => {
  console.log('📝 Mise à jour profil user:', req.user.id);
  console.log('📦 Données reçues:', req.body);
  
  const transaction = await sequelize.transaction();
  
  try {
    const { full_name, email } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== user.email) {
      console.log(`🔍 Vérification nouvel email: ${email}`);
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.log('⚠️ Email déjà utilisé');
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      console.log('✅ Email disponible');
    }

    const oldData = {
      full_name: user.full_name,
      email: user.email
    };

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;

    console.log('🔄 Mise à jour avec:', updates);
    await user.update(updates, { transaction });
    console.log('✅ Profil mis à jour');

    await transaction.commit();

    // Journaliser l'action
    await logAction(
      userId,
      'UPDATE_PROFILE',
      'users',
      userId,
      oldData,
      updates,
      req.ip
    );

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      updated_at: user.updated_at
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur updateMyProfile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};