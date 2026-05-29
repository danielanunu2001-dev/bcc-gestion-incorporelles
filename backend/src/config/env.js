// backend/src/config/env.js
const dotenv = require('dotenv');
const path = require('path');

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Variables requises
const requiredEnvVars = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

// Vérifier les variables manquantes
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`⚠️ Variables d'environnement manquantes: ${missingVars.join(', ')}`);
}

// Export de la configuration
module.exports = {
  // Serveur
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || 'localhost',
  
  // Base de données
  db: {
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432
  },
  
  // Sécurité
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.TOKEN_EXPIRY || '7d',
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '30d'
  },
  sessionSecret: process.env.SESSION_SECRET,
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
  
  // Email
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    alertEmail: process.env.ALERTES_EMAIL
  },
  
  // Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880
  },
  
  // Logs
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
    sensitiveMax: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX, 10) || 20
  },
  
  // Devises
  defaultRates: {
    USD: parseFloat(process.env.DEFAULT_USD_RATE) || 2300,
    EUR: parseFloat(process.env.DEFAULT_EUR_RATE) || 2600,
    GBP: parseFloat(process.env.DEFAULT_GBP_RATE) || 3100,
    CNY: parseFloat(process.env.DEFAULT_CNY_RATE) || 300
  },
  
  // APIs externes
  exchangeRateApi: {
    key: process.env.EXCHANGE_RATE_API_KEY,
    url: process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/'
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    model: process.env.MISTRAL_MODEL || 'mistral-tiny',
    maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS, 10) || 2000
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  }
};