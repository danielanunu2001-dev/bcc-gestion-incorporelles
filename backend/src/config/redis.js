// backend/src/config/redis.js
const Redis = require('ioredis');
const logger = require('./logger');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  enableOfflineQueue: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnexion tentative ${times}, délai: ${delay}ms`);
    return delay;
  }
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connecté');
});

redisClient.on('error', (err) => {
  logger.error(`❌ Redis erreur: ${err.message}`);
});

module.exports = redisClient;