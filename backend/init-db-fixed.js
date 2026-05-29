const { sequelize } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function init() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables créées');
    
    const hash = await bcrypt.hash('admin123', 10);
    await sequelize.query(
      "INSERT INTO users (email, password_hash, full_name, role, actif) VALUES ('admin@bcc.cd', '" + hash + "', 'Administrateur', 'admin', true)"
    );
    
    console.log('✅ Base initialisée avec succès');
    console.log('📧 Email: admin@bcc.cd');
    console.log('🔑 Mot de passe: admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

init();
