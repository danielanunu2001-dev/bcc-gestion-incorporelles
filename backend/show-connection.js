require('dotenv').config();
console.log('=== Configuration .env ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***présent***' : 'manquant');

const { sequelize } = require('./src/config/database');

async function show() {
  console.log('\n=== Connexion réelle ===');
  const [host] = await sequelize.query('SELECT inet_server_addr()');
  const [port] = await sequelize.query('SHOW port');
  const [version] = await sequelize.query('SELECT version()');
  
  console.log('🌐 Hôte PostgreSQL:', host[0].inet_server_addr);
  console.log('🔌 Port PostgreSQL:', port[0].port);
  console.log('📦 Version:', version[0].version.split(',')[0]);
  
  await sequelize.close();
  process.exit();
}

show();