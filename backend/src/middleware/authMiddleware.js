// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  try {
    let token;
    
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    
    // ✅ Récupérer UNIQUEMENT les champs de l'utilisateur
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'full_name', 'role', 'actif', 'last_login']
    });
    
    if (!user || !user.actif) {
      req.user = null;
      return next();
    }
    
    // ✅ Objet utilisateur propre
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
    logger.error(`❌ Erreur authMiddleware: ${error.message}`);
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;