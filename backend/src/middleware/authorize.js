// backend/src/middleware/authorize.js

const logger = require('../config/logger');

/**
 * Middleware d'autorisation basé sur les rôles
 * @param {...string} roles - Liste des rôles autorisés
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Admin a tous les droits
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Vérifier si le rôle de l'utilisateur est autorisé
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      logger.warn(`⛔ Accès refusé: ${req.user.email} (${req.user.role}) tente d'accéder à ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis: ${roles.join(', ')}`,
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Middleware pour vérifier les permissions spécifiques
 * @param {string} permission - Permission requise
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Admin a tous les droits
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Définir les permissions par rôle
    const rolePermissions = {
      comptable: ['read:actifs', 'write:actifs', 'read:rapports', 'write:amortissements', 'read:contrats', 'write:contrats'],
      gestionnaire: ['read:actifs', 'write:actifs', 'read:rapports', 'read:contrats'],
      auditeur: ['read:actifs', 'read:audit', 'read:rapports', 'read:contrats'],
      informatique: ['read:actifs', 'write:actifs', 'read:rapports'],
      juridique: ['read:actifs', 'read:contrats', 'write:contrats'],
      inventoriste: ['read:actifs', 'write:inventaire']
    };
    
    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      logger.warn(`⛔ Permission refusée: ${req.user.email} (${req.user.role}) - ${permission}`);
      return res.status(403).json({
        success: false,
        message: `Permission refusée: ${permission}`,
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire de la ressource
 * @param {Function} getResourceOwnerId - Fonction pour récupérer l'ID du propriétaire
 */
const isOwner = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Admin a tous les droits
    if (req.user.role === 'admin') {
      return next();
    }
    
    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (req.user.id !== ownerId) {
        logger.warn(`⛔ Accès refusé: ${req.user.email} n'est pas propriétaire de la ressource`);
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier cette ressource',
          code: 'FORBIDDEN'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`❌ Erreur lors de la vérification de propriété: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des droits',
        code: 'OWNER_CHECK_ERROR'
      });
    }
  };
};

module.exports = authorize;
module.exports.hasPermission = hasPermission;
module.exports.isOwner = isOwner;