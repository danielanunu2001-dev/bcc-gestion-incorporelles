// backend/src/config/database.js

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuration avancée de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bcc_gestion',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'Anunudaniel2001',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    
    // 🔍 LOGGING COMPLET pour déboguer l'erreur UNIQUE
    logging: (sql, time) => {
      // Afficher TOUTES les requêtes SQL pour déboguer
      console.log(`\n🔍 [SQL - ${time || 0}ms]:`);
      console.log(sql);
      
      // Détecter les erreurs potentielles
      if (sql.includes('UNIQUE') && sql.includes('users')) {
        console.warn('⚠️ REQUÊTE UNIQUE DÉTECTÉE SUR USERS');
      }
    },
    
    // Pool de connexions optimisé
    pool: {
      max: 10,              // Nombre maximum de connexions dans le pool
      min: 2,               // Nombre minimum de connexions
      acquire: 30000,       // Temps max pour acquérir une connexion (30s)
      idle: 10000           // Temps avant qu'une connexion inactive soit libérée (10s)
    },
    
    // Options du dialecte PostgreSQL
    dialectOptions: {
      statement_timeout: 5000, // Timeout des requêtes SQL (5 secondes)
      // Pour SSL en production (si nécessaire)
      ...(process.env.NODE_ENV === 'production' && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      })
    },
    
    // Timezone (UTC+1 pour Kinshasa)
    timezone: '+01:00',
    
    // 🔧 Option pour éviter les erreurs de syntaxe
    define: {
      freezeTableName: true,  // Évite de renommer les tables au pluriel
      underscored: true,      // Utilise snake_case pour les colonnes
      timestamps: true,       // Ajoute created_at et updated_at
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL établie avec succès.');
    
    // Vérifier la version de PostgreSQL
    const [result] = await sequelize.query('SELECT version()');
    console.log(`📦 PostgreSQL version: ${result[0].version.split(',')[0]}`);
    
    // Afficher les informations de connexion
    console.log(`🔗 Database: ${process.env.DB_NAME || 'bcc_gestion'}`);
    console.log(`👤 User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`🌐 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à PostgreSQL:', error.message);
    if (error.original) {
      console.error('Détails:', error.original.message);
    }
    return false;
  }
};

// Gestion des erreurs de connexion
sequelize.addHook('afterConnect', (connection, config) => {
  console.log('🔌 Nouvelle connexion à la base de données établie');
});

sequelize.addHook('beforeDisconnect', (connection) => {
  console.log('🔌 Connexion à la base de données fermée');
});

// Gestion globale des erreurs Sequelize
process.on('unhandledRejection', (err) => {
  if (err.name === 'SequelizeConnectionError') {
    console.error('❌ Erreur de connexion Sequelize:', err.message);
  }
});

module.exports = {
  sequelize,
  testConnection
};