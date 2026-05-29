const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

async function finalTest() {
  try {
    console.log('=== TEST COMPLET ===\n');
    
    // 1. Vérifier la connexion
    const [dbName] = await sequelize.query('SELECT current_database()');
    console.log('📌 Base:', dbName[0].current_database);
    
    // 2. Compter avec SQL brut
    const [sqlCount] = await sequelize.query('SELECT COUNT(*) FROM users');
    console.log('✅ SQL COUNT:', sqlCount[0].count);
    
    // 3. Lister les colonnes de la table users
    const columns = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('📋 Colonnes de users:', columns[0].map(c => c.column_name).join(', '));
    
    // 4. Tester avec Sequelize
    try {
      const count = await User.count();
      console.log('✅ Sequelize COUNT:', count);
    } catch (err) {
      console.log('❌ Sequelize erreur:', err.message);
    }
    
    await sequelize.close();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
  process.exit();
}

finalTest();