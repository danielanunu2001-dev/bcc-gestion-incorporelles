const { sequelize } = require('./src/config/database');

async function sync() {
  try {
    console.log('🔄 Synchronisation des modèles...');
    
    // Forcer la synchronisation de tous les modèles
    await sequelize.sync({ force: true });
    console.log('✅ Toutes les tables ont été créées');
    
    // Importer les modèles après la synchronisation
    const User = require('./src/models/User');
    const bcrypt = require('bcrypt');
    
    // Créer un admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await User.create({
      email: 'admin@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Administrateur',
      role: 'admin',
      actif: true
    });
    
    console.log('✅ Compte admin créé:', admin.email);
    console.log('✅ Synchronisation terminée avec succès!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

sync();