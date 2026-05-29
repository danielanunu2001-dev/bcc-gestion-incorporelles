// backend/src/middleware/rateLimiter.js
// Version DÉSACTIVÉE pour le développement - AUCUNE LIMITE

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Crée un limiteur de taux personnalisé - Version désactivée pour le développement
 */
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Trop de requêtes, veuillez réessayer plus tard.',
    statusCode = 429,
    keyPrefix = 'rl',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max: 100000, // ← DÉSACTIVÉ : limite extrêmement haute
    message: { error: message, code: 'RATE_LIMIT_EXCEEDED', statusCode },
    statusCode,
    skip: (req) => {
      // ← IGNORE TOUTES LES REQUÊTES
      return true; // ← TOUJOURS SKIP - DÉSACTIVÉ
    },
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res, next, options) => {
      logger.warn(`⚠️ Rate limit exceeded: ${req.ip} - ${req.method} ${req.path}`);
      res.status(options.statusCode).json({
        success: false,
        error: options.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// ==================== LIMITEURS PRÉDÉFINIS (TOUS DÉSACTIVÉS) ====================

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.',
  keyPrefix: 'rl:general'
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ (anciennement 100)
  message: 'Trop de tentatives de connexion. Compte temporairement bloqué. Réessayez dans 15 minutes.',
  statusCode: 429,
  keyPrefix: 'rl:auth',
  skipSuccessfulRequests: true
});

const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Limite d\'utilisation des opérations sensibles atteinte. Réessayez dans 1 heure.',
  statusCode: 429,
  keyPrefix: 'rl:sensitive'
});

const actifLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Trop de modifications d\'actifs. Veuillez ralentir.',
  statusCode: 429,
  keyPrefix: 'rl:actif'
});

const exportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Limite d\'exports atteinte. Réessayez dans 1 heure.',
  statusCode: 429,
  keyPrefix: 'rl:export'
});

const aiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Limite d\'appels à l\'IA atteinte. Réessayez dans 1 heure.',
  statusCode: 429,
  keyPrefix: 'rl:ai'
});

const downloadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Trop de téléchargements. Réessayez dans 1 heure.',
  statusCode: 429,
  keyPrefix: 'rl:download'
});

const searchLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Trop de recherches. Veuillez patienter.',
  statusCode: 429,
  keyPrefix: 'rl:search'
});

const criticalLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Limite des opérations critiques atteinte. Réessayez dans 1 heure.',
  statusCode: 429,
  keyPrefix: 'rl:critical'
});

const publicApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100000,  // ← DÉSACTIVÉ
  message: 'Trop de requêtes sur l\'API publique. Veuillez patienter.',
  statusCode: 429,
  keyPrefix: 'rl:public'
});

const addRateLimitHeaders = (req, res, next) => {
  res.setHeader('X-RateLimit-Limit', '100000');
  res.setHeader('X-RateLimit-Window', '900');
  next();
};

const rateLimitMonitor = (req, res, next) => {
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveLimiter,
  actifLimiter,
  exportLimiter,
  aiLimiter,
  downloadLimiter,
  searchLimiter,
  criticalLimiter,
  publicApiLimiter,
  createRateLimiter,
  addRateLimitHeaders,
  rateLimitMonitor,
  redisClient: null
};