// backend/src/config/session.js - Version sans Redis

const session = require('express-session');
const logger = require('./logger');

// Configuration de session sans Redis (MemoryStore - pour développement uniquement)
const sessionConfig = {
  name: 'bcc.sid',
  secret: process.env.SESSION_SECRET || 'bcc-session-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  
  cookie: {
    secure: false, // Mettre à true seulement en HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  
  rolling: true,
  unset: 'keep',
  
  genid: (req) => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
};

// Middleware pour ajouter des informations de session
const sessionInfoMiddleware = (req, res, next) => {
  if (req.session) {
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Session-ID', req.session.id);
    }
    
    if (req.session.userId && req.session.isNew) {
      logger.info(`🆕 Nouvelle session créée pour userId: ${req.session.userId}`);
    }
  }
  next();
};

// Middleware pour la protection des sessions
const sessionProtection = (req, res, next) => {
  if (!req.session) {
    return res.status(401).json({ 
      success: false, 
      message: 'Session invalide ou expirée' 
    });
  }
  
  if (req.session.userId && req.user && req.session.userId !== req.user.id) {
    logger.warn(`⚠️ Incohérence session: session.userId=${req.session.userId}, req.user.id=${req.user.id}`);
    req.session.destroy();
    return res.status(401).json({ 
      success: false, 
      message: 'Session invalide, veuillez vous reconnecter' 
    });
  }
  
  next();
};

// Middleware pour rafraîchir la session
const sessionRefresh = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.session.touch();
  }
  next();
};

// Fonction pour détruire une session
const destroySession = (req, res, callback) => {
  if (!req.session) {
    if (callback) callback();
    return;
  }
  
  const sessionId = req.session.id;
  const userId = req.session.userId;
  
  req.session.destroy((err) => {
    if (err) {
      logger.error(`❌ Erreur destruction session ${sessionId}:`, err.message);
    } else {
      logger.info(`🗑️ Session détruite: ${sessionId} pour userId: ${userId}`);
    }
    if (callback) callback(err);
  });
};

// Fonctions Redis simulées (retournent des valeurs par défaut)
const getSessionStats = async () => ({ total: 0, sessions: [], activeUsers: 0 });
const cleanupExpiredSessions = async () => 0;
const revokeUserSessions = async (userId) => 0;

// Créer le middleware de session
const sessionMiddleware = session(sessionConfig);

module.exports = {
  sessionMiddleware,
  sessionInfoMiddleware,
  sessionProtection,
  sessionRefresh,
  destroySession,
  getSessionStats,
  cleanupExpiredSessions,
  revokeUserSessions,
  redisClient: null
};