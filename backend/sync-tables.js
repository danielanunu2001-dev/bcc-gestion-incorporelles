const { sequelize } = require('./src/config/database');

async function syncTables() {
  try {
    console.log('🔄 Synchronisation de toutes les tables...');
    await sequelize.sync({ alter: true });
    console.log('✅ Toutes les tables ont été créées ou mises à jour');
    
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('📋 Tables disponibles:');
    tables.forEach(t => console.log(   - ));
    
    await sequelize.close();
    console.log('✅ Synchronisation terminée!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

syncTables();