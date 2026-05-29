const { sequelize } = require('./src/config/database');

async function check() {
  try {
    // Vérifier le schéma actuel
    const [currentSchema] = await sequelize.query('SELECT current_schema()');
    console.log('📌 Schéma actuel:', currentSchema[0].current_schema);
    
    // Chercher la table users dans tous les schémas
    const tables = await sequelize.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users'"
    );
    console.log('📋 Tables "users" trouvées:', tables[0]);
    
    // Vérifier le search_path
    const [searchPath] = await sequelize.query('SHOW search_path');
    console.log('🔍 Search path:', searchPath[0].search_path);
    
    await sequelize.close();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
  process.exit();
}

check();