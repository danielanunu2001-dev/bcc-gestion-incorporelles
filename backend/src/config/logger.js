// backend/src/config/logger.js

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configuration des niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Configuration des couleurs pour les logs en console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(meta).length > 0) {
      log += `\n  └─ 📦 Metadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      log += `\n  └─ 🔍 Stack trace:\n${stack}`;
    }
    
    return log;
  })
);

// Format pour les fichiers (JSON structuré)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Format simple pour la console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack === undefined) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Transport pour les fichiers avec rotation quotidienne
const fileRotateTransport = new DailyRotateFile({
  filename: path.join('logs', 'bcc-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: jsonFormat,
  level: 'info'
});

// Transport pour les erreurs uniquement
const errorFileTransport = new DailyRotateFile({
  filename: path.join('logs', 'bcc-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: jsonFormat
});

// Transport pour la console (développement)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Transport pour les requêtes HTTP
const httpFileTransport = new DailyRotateFile({
  filename: path.join('logs', 'bcc-http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  level: 'http',
  format: jsonFormat
});

// Création du logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    fileRotateTransport,
    errorFileTransport,
    httpFileTransport,
    consoleTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'bcc-exceptions.log'),
      format: jsonFormat
    }),
    consoleTransport
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'bcc-rejections.log'),
      format: jsonFormat
    }),
    consoleTransport
  ],
  exitOnError: false
});

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Crée un enfant du logger avec des métadonnées par défaut
 * @param {Object} defaultMeta - Métadonnées par défaut
 * @returns {winston.Logger} Logger enfant
 */
logger.child = (defaultMeta) => {
  return winston.createLogger({
    levels,
    level: logger.level,
    transports: logger.transports,
    exceptionHandlers: logger.exceptionHandlers,
    rejectionHandlers: logger.rejectionHandlers,
    defaultMeta: { ...logger.defaultMeta, ...defaultMeta }
  });
};

/**
 * Logger pour les requêtes HTTP
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
logger.httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    logger.http(message, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
  });
  
  next();
};

/**
 * Logger pour les opérations de base de données
 * @param {string} operation - Type d'opération
 * @param {string} table - Table concernée
 * @param {Object} data - Données de l'opération
 */
logger.db = (operation, table, data = {}) => {
  logger.debug(`🗄️ DB ${operation} on ${table}`, { operation, table, ...data });
};

/**
 * Logger pour les appels API externes
 * @param {string} service - Service appelé
 * @param {string} endpoint - Endpoint appelé
 * @param {Object} data - Données de l'appel
 */
logger.api = (service, endpoint, data = {}) => {
  logger.info(`🌐 API Call to ${service}${endpoint}`, { service, endpoint, ...data });
};

/**
 * Logger pour les erreurs avec contexte
 * @param {Error} error - Erreur à logger
 * @param {string} context - Contexte de l'erreur
 * @param {Object} additional - Informations supplémentaires
 */
logger.errorWithContext = (error, context, additional = {}) => {
  logger.error(`❌ ${context}: ${error.message}`, {
    context,
    error: error.message,
    stack: error.stack,
    ...additional
  });
};

/**
 * Logger pour les opérations de sécurité (auth, permissions)
 * @param {string} action - Action de sécurité
 * @param {Object} data - Données de l'opération
 */
logger.security = (action, data = {}) => {
  logger.info(`🔒 Security: ${action}`, { action, ...data });
};

/**
 * Logger pour les opérations métier importantes
 * @param {string} action - Action métier
 * @param {Object} data - Données de l'opération
 */
logger.business = (action, data = {}) => {
  logger.info(`💼 Business: ${action}`, { action, ...data });
};

/**
 * Logger pour les performances
 * @param {string} operation - Opération mesurée
 * @param {number} duration - Durée en ms
 * @param {Object} data - Données supplémentaires
 */
logger.performance = (operation, duration, data = {}) => {
  logger.debug(`⚡ Performance: ${operation} - ${duration}ms`, { operation, duration, ...data });
};

/**
 * Crée un timer pour mesurer les performances
 * @param {string} operation - Nom de l'opération
 * @returns {Object} Timer avec méthode end()
 */
logger.startTimer = (operation) => {
  const start = Date.now();
  return {
    end: (data = {}) => {
      const duration = Date.now() - start;
      logger.performance(operation, duration, data);
      return duration;
    }
  };
};

/**
 * Formate un objet pour le log (supprime les informations sensibles)
 * @param {Object} obj - Objet à formater
 * @returns {Object} Objet nettoyé
 */
logger.sanitize = (obj) => {
  if (!obj) return obj;
  
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
};

// ==================== MIDDLEWARE EXPRESS ====================

/**
 * Middleware pour logger toutes les requêtes
 */
logger.requestMiddleware = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    // Log de la requête entrante
    logger.http(`➡️ ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
    
    // Log de la réponse (après la fin)
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'warn' : 'http';
      
      logger[level](`⬅️ ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        userId: req.user?.id
      });
    });
    
    next();
  };
};

// Création du dossier logs s'il n'existe pas
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;