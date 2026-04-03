const { sequelize } = require('../src/models');
const { User } = require('../src/models');
const bcrypt = require('bcrypt');

async function resetComplete() {
  try {
    console.log('🔄 Réinitialisation complète de la base de données...');
    
    // Forcer la synchronisation (supprime et recrée toutes les tables)
    await sequelize.sync({ force: true });
    console.log('✅ Tables recréées avec succès');

    // Créer un utilisateur admin par défaut
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.create({
      email: 'admin@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Administrateur',
      role: 'admin'
    });

    // Créer des utilisateurs de test avec les différents rôles
    await User.create({
      email: 'comptable@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Comptable Test',
      role: 'comptable'
    });

    await User.create({
      email: 'juridique@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Juridique Test',
      role: 'juridique'
    });

    await User.create({
      email: 'informatique@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Informatique Test',
      role: 'informatique'
    });

    await User.create({
      email: 'auditeur@bcc.cd',
      password_hash: hashedPassword,
      full_name: 'Auditeur Test',
      role: 'auditeur'
    });

    console.log('\n✅ Utilisateurs créés avec succès :');
    console.log('   admin@bcc.cd / admin123 (Admin)');
    console.log('   comptable@bcc.cd / admin123 (Comptable)');
    console.log('   juridique@bcc.cd / admin123 (Juridique)');
    console.log('   informatique@bcc.cd / admin123 (Informatique)');
    console.log('   auditeur@bcc.cd / admin123 (Auditeur)');

    console.log('\n🎉 Réinitialisation terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error);
    process.exit(1);
  }
}

resetComplete();