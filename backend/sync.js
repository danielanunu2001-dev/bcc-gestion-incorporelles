const { sequelize } = require('./src/models');

async function sync() {
  try {
    console.log('🔌 Test de connexion...');
    await sequelize.authenticate();
    console.log('✅ Connecté à PostgreSQL - Base:', sequelize.config.database);
    
    console.log('📦 Synchronisation des tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables créées avec succès');
    
    // Vérifier les tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📋 Tables dans la base:', tables);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

sync();