const path = require('path');
// Corriger le chemin vers src
const { sequelize } = require(path.join(__dirname, '..', 'src', 'config', 'database'));
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

async function refreshModels() {
  try {
    console.log('🔄 Rafraîchissement des modèles...');
    
    // Forcer la synchronisation avec alter: true
    await User.sync({ alter: true });
    console.log('✅ Modèle User synchronisé');
    
    // Compter les utilisateurs
    const count = await User.count();
    console.log(`📊 Nombre d'utilisateurs: ${count}`);
    
    // Afficher les utilisateurs
    const users = await User.findAll({
      attributes: ['email', 'role', 'actif'],
      raw: true
    });
    
    console.log('📧 Utilisateurs dans la base:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Actif: ${user.actif}`);
    });
    
    await sequelize.close();
    console.log('✅ Refresh terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

refreshModels();