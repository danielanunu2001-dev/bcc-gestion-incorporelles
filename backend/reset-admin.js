const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bcc_gestion', 'postgres', 'Anunudaniel2001', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432
});

async function resetAdminPassword() {
  try {
    // Synchroniser la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');
    
    const newPassword = 'Admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await sequelize.query(
      'UPDATE users SET password_hash = :hash WHERE email = :email',
      {
        replacements: { 
          hash: hashedPassword, 
          email: 'admin@bcc.cd' 
        },
        type: Sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('✅ Mot de passe admin réinitialisé avec succès !');
    console.log(`📧 Email: admin@bcc.cd`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    
    // Vérifier la mise à jour
    const [result] = await sequelize.query(
      'SELECT email FROM users WHERE email = :email',
      {
        replacements: { email: 'admin@bcc.cd' },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    if (result) {
      console.log('✅ Vérification: Utilisateur trouvé dans la base');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

resetAdminPassword();