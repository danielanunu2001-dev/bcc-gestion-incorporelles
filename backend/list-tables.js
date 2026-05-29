const { sequelize } = require('./src/config/database');

async function listTables() {
  const [tables] = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('📋 Tables dans la base de données:');
  tables.forEach(t => {
    console.log('   - ' + t.table_name);
  });
  await sequelize.close();
}

listTables();
