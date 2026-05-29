// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Middleware d'authentification JWT
 * Vérifie le token et ajoute l'utilisateur à req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // 1. Vérifier le cookie HTTP-only (prioritaire)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // 2. Vérifier le header Authorization (fallback pour mobile/API)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // 3. Aucun token trouvé
    if (!token) {
      req.user = null;
      return next();
    }
    
    // 4. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    
    // 5. Récupérer l'utilisateur depuis la base de données
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    // 6. Vérifier que l'utilisateur existe et est actif
    if (!user || !user.actif) {
      req.user = null;
      return next();
    }
    
    // 7. Vérifier que le compte n'est pas verrouillé
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      req.user = null;
      return next();
    }
    
    // 8. Ajouter l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      actif: user.actif,
      last_login: user.last_login
    };
    
    next();
  } catch (error) {
    // Gestion des erreurs de token
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`⚠️ Token JWT invalide: ${error.message}`);
      req.user = null;
      return next();
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.warn(`⚠️ Token JWT expiré`);
      req.user = null;
      return next();
    }
    
    // Autres erreurs
    logger.error(`❌ Erreur dans le middleware auth: ${error.message}`);
    req.user = null;
    next();
  }
};

/**
 * Middleware pour les routes nécessitant une authentification
 * Redirige vers 401 si non authentifié
 */
const requireAuth = async (req, res, next) => {
  await protect(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié. Veuillez vous connecter.',
        code: 'UNAUTHORIZED'
      });
    }
    next();
  });
};

/**
 * Middleware pour vérifier les rôles
 * @param {...string} roles - Liste des rôles autorisés
 */
const requireRoles = (...roles) => {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }
      
      // Admin a tous les droits
      if (req.user.role === 'admin') {
        return next();
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Accès refusé. Rôle requis: ${roles.join(', ')}`,
          code: 'FORBIDDEN'
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware pour vérifier les permissions spécifiques
 * @param {string} permission - Permission requise
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }
      
      // Admin a tous les droits
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Définir les permissions par rôle
      const rolePermissions = {
        comptable: ['read:actifs', 'write:actifs', 'read:rapports', 'write:amortissements'],
        gestionnaire: ['read:actifs', 'write:actifs', 'read:rapports'],
        auditeur: ['read:actifs', 'read:audit', 'read:rapports'],
        informaticien: ['read:actifs', 'write:actifs'],
        juriste: ['read:actifs', 'read:contrats', 'write:contrats'],
        inventoriste: ['read:actifs', 'write:inventaire']
      };
      
      const userPermissions = rolePermissions[req.user.role] || [];
      
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission refusée: ${permission}`,
          code: 'FORBIDDEN'
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware pour rafraîchir le token automatiquement
 */
const refreshTokenIfNeeded = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Si l'utilisateur est authentifié, ajouter un nouveau token
    if (req.user && req.cookies && req.cookies.token) {
      try {
        const decoded = jwt.decode(req.cookies.token);
        const exp = decoded.exp * 1000;
        const now = Date.now();
        
        // Si le token expire dans moins de 1 heure, le rafraîchir
        if (exp - now < 60 * 60 * 1000) {
          const newToken = jwt.sign(
            {
              id: req.user.id,
              email: req.user.email,
              role: req.user.role,
              full_name: req.user.full_name
            },
            process.env.JWT_SECRET || 'votre_secret_temporaire',
            { expiresIn: '24h' }
          );
          
          const isProduction = process.env.NODE_ENV === 'production';
          res.cookie('token', newToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
          });
          
          logger.debug('🔄 Token JWT rafraîchi automatiquement');
        }
      } catch (error) {
        logger.error('❌ Erreur lors du rafraîchissement du token:', error.message);
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Export des middlewares
module.exports = {
  protect,
  requireAuth,
  requireRoles,
  requirePermission,
  refreshTokenIfNeeded
};