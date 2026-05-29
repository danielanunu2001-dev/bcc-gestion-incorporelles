const { sequelize } = require('./src/config/database');

async function check() {
  try {
    // Vérifier la base de données actuelle
    const [dbName] = await sequelize.query('SELECT current_database()');
    console.log('📌 Base de données connectée:', dbName[0].current_database);
    
    const [dbUser] = await sequelize.query('SELECT current_user');
    console.log('👤 Utilisateur:', dbUser[0].current_user);
    
    // Vérifier les tables
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('📋 Tables disponibles:', tables[0].map(t => t.table_name).join(', '));
    
    // Compter les utilisateurs
    const [userCount] = await sequelize.query('SELECT COUNT(*) FROM users');
    console.log('👥 Nombre d\'utilisateurs:', userCount[0].count);
    
    await sequelize.close();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.message.includes('n\'existe pas')) {
      console.log('⚠️ La table users n\'existe pas dans cette base');
    }
  }
  process.exit();
}

check();