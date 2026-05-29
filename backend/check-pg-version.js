const { sequelize } = require('./src/config/database');

async function check() {
  try {
    const [version] = await sequelize.query('SELECT version()');
    console.log('Version PostgreSQL:', version[0].version);
    
    const [db] = await sequelize.query('SELECT current_database()');
    console.log('Base de données:', db[0].current_database);
    
    await sequelize.close();
  } catch (err) {
    console.error('Erreur:', err.message);
  }
  process.exit();
}

check();