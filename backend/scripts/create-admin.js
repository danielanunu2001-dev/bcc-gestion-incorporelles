const path = require('path');
const bcrypt = require('bcrypt');
const modelsPath = path.join(__dirname, '..', 'models');
const { sequelize, User } = require(modelsPath);

async function createAdmin() {
  try {
    console.log('🔄 Connexion à la base...');
    await sequelize.authenticate();
    console.log('✅ Connecté à la base');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Supprimer l'ancien admin s'il existe
    await User.destroy({ where: { email: 'admin@bcc.cd' } });
    console.log('🗑️ Ancien admin supprimé');

    // Créer le nouvel admin
    const admin = await User.create({
      email: 'admin@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Administrateur',
      role: 'admin'
    });

    console.log('✅ Admin créé avec succès');
    console.log('Email:', admin.email);
    console.log('Rôle:', admin.role);

    // Vérifier
    const verify = await User.findOne({ 
      where: { email: 'admin@bcc.cd' } 
    });
    
    if (verify) {
      console.log('✅ Vérification: OK');
      
      // Tester le mot de passe
      const testPassword = await bcrypt.compare('admin123', verify.password_hash);
      console.log('🔑 Test mot de passe:', testPassword ? '✅ OK' : '❌ ÉCHEC');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Déconnexion');
  }
}

createAdmin();