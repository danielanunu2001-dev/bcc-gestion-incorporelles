// backend/src/middleware/errorHandler.js

const logger = require('../config/logger');

/**
 * Classe d'erreur personnalisée
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Types d'erreurs prédéfinis
 */
const ErrorTypes = {
  // Erreurs client (4xx)
  BAD_REQUEST: { statusCode: 400, code: 'BAD_REQUEST' },
  UNAUTHORIZED: { statusCode: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { statusCode: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { statusCode: 404, code: 'NOT_FOUND' },
  CONFLICT: { statusCode: 409, code: 'CONFLICT' },
  VALIDATION_ERROR: { statusCode: 422, code: 'VALIDATION_ERROR' },
  TOO_MANY_REQUESTS: { statusCode: 429, code: 'TOO_MANY_REQUESTS' },
  
  // Erreurs serveur (5xx)
  INTERNAL_ERROR: { statusCode: 500, code: 'INTERNAL_ERROR' },
  DATABASE_ERROR: { statusCode: 500, code: 'DATABASE_ERROR' },
  EXTERNAL_API_ERROR: { statusCode: 502, code: 'EXTERNAL_API_ERROR' },
  SERVICE_UNAVAILABLE: { statusCode: 503, code: 'SERVICE_UNAVAILABLE' }
};

/**
 * Crée une erreur personnalisée
 */
const createError = (type, message, details = null) => {
  return new AppError(message, type.statusCode, type.code, details);
};

/**
 * Erreur 400 - Mauvaise requête
 */
const badRequest = (message = 'Requête invalide', details = null) => {
  return createError(ErrorTypes.BAD_REQUEST, message, details);
};

/**
 * Erreur 401 - Non authentifié
 */
const unauthorized = (message = 'Non authentifié', details = null) => {
  return createError(ErrorTypes.UNAUTHORIZED, message, details);
};

/**
 * Erreur 403 - Accès interdit
 */
const forbidden = (message = 'Accès non autorisé', details = null) => {
  return createError(ErrorTypes.FORBIDDEN, message, details);
};

/**
 * Erreur 404 - Ressource non trouvée
 */
const notFound = (message = 'Ressource non trouvée', details = null) => {
  return createError(ErrorTypes.NOT_FOUND, message, details);
};

/**
 * Erreur 409 - Conflit
 */
const conflict = (message = 'Conflit avec les données existantes', details = null) => {
  return createError(ErrorTypes.CONFLICT, message, details);
};

/**
 * Erreur 422 - Erreur de validation
 */
const validationError = (message = 'Données invalides', details = null) => {
  return createError(ErrorTypes.VALIDATION_ERROR, message, details);
};

/**
 * Erreur 429 - Trop de requêtes
 */
const tooManyRequests = (message = 'Trop de requêtes, veuillez réessayer plus tard', details = null) => {
  return createError(ErrorTypes.TOO_MANY_REQUESTS, message, details);
};

/**
 * Erreur 500 - Erreur interne
 */
const internalError = (message = 'Erreur interne du serveur', details = null) => {
  return createError(ErrorTypes.INTERNAL_ERROR, message, details);
};

/**
 * Erreur 503 - Service indisponible
 */
const serviceUnavailable = (message = 'Service temporairement indisponible', details = null) => {
  return createError(ErrorTypes.SERVICE_UNAVAILABLE, message, details);
};

/**
 * Capture les erreurs async et les passe au middleware d'erreur
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de gestion des erreurs principal
 */
const errorHandler = (err, req, res, next) => {
  // Log détaillé de l'erreur
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  });

  // Erreur opérationnelle connue (créée par AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        details: err.details,
        timestamp: err.timestamp
      }
    });
  }

  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    return res.status(422).json({
      success: false,
      error: {
        message: 'Erreur de validation des données',
        code: 'VALIDATION_ERROR',
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur de contrainte d'unicité Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    return res.status(409).json({
      success: false,
      error: {
        message: `La valeur pour '${field}' existe déjà`,
        code: 'DUPLICATE_ERROR',
        field,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur de clé étrangère Sequelize
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Cette ressource est liée à d\'autres enregistrements',
        code: 'FOREIGN_KEY_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur de connexion à la base de données
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    logger.error('❌ Erreur de connexion à la base de données');
    return res.status(503).json({
      success: false,
      error: {
        message: 'Service de base de données temporairement indisponible',
        code: 'DATABASE_CONNECTION_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token invalide',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Token expiré
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Session expirée, veuillez vous reconnecter',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur Multer (upload de fichier)
  if (err.name === 'MulterError') {
    let message = 'Erreur lors de l\'upload du fichier';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Le fichier est trop volumineux';
    if (err.code === 'LIMIT_FILE_COUNT') message = 'Trop de fichiers';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Fichier inattendu';
    
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPLOAD_ERROR',
        details: err.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur de rate limiting
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: err.retryAfter,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Erreur par défaut (non opérationnelle)
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    success: false,
    error: {
      message: isProduction ? 'Une erreur inattendue est survenue' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(isProduction ? {} : { stack: err.stack }),
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Middleware pour les routes non trouvées (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.url} non trouvée`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Middleware pour valider les IDs UUID
 */
const validateUUID = (req, res, next) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idParams = ['id', 'actifId', 'userId', 'contratId'];
  
  for (const param of idParams) {
    if (req.params[param] && !uuidRegex.test(req.params[param])) {
      return next(validationError(`ID ${param} invalide (format UUID requis)`));
    }
  }
  
  next();
};

/**
 * Middleware pour valider les dates
 */
const validateDate = (req, res, next) => {
  const dateFields = ['date_acquisition', 'date_validite', 'date_debut', 'date_fin', 'date_test'];
  
  for (const field of dateFields) {
    if (req.body[field] && req.body[field] !== 'Invalid date') {
      const date = new Date(req.body[field]);
      if (isNaN(date.getTime())) {
        return next(validationError(`Le champ ${field} doit être une date valide`));
      }
    }
  }
  
  next();
};

/**
 * ✅ CORRECTION: Middleware pour nettoyer les nombres (format français)
 * Protégé contre les erreurs d'accès à undefined
 */
const sanitizeNumbers = (req, res, next) => {
  // ✅ Vérifier que req.body existe et est un objet
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }
  
  const numberFields = ['cout_acquisition', 'montant_devise', 'valeur_residuelle', 'taux_amortissement'];
  
  try {
    for (const field of numberFields) {
      // ✅ Vérifier que le champ existe et n'est pas undefined
      if (req.body[field] !== undefined && req.body[field] !== null) {
        // ✅ Vérifier que la valeur peut être convertie en string
        if (typeof req.body[field] === 'string' || typeof req.body[field] === 'number') {
          let value = String(req.body[field]);
          // Nettoyer les nombres format français (1.234,56 -> 1234.56)
          value = value.replace(/\./g, '').replace(/,/g, '.');
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            req.body[field] = parsed;
          } else {
            req.body[field] = null;
          }
        }
      }
    }
  } catch (error) {
    // ✅ Ignorer silencieusement les erreurs de sanitization
    console.warn('⚠️ Erreur dans sanitizeNumbers:', error.message);
  }
  
  next();
};

module.exports = {
  AppError,
  ErrorTypes,
  createError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  tooManyRequests,
  internalError,
  serviceUnavailable,
  catchAsync,
  errorHandler,
  notFoundHandler,
  validateUUID,
  validateDate,
  sanitizeNumbers
};