const { sequelize } = require('../src/models');
const { QueryTypes } = require('sequelize');

async function add2FAColumns() {
  try {
    console.log('🔄 Ajout des colonnes 2FA à la table users...');
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    // Vérifier si la colonne two_factor_secret existe
    const secretExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='users' AND column_name='two_factor_secret'`,
      { type: QueryTypes.SELECT }
    );

    if (secretExists.length === 0) {
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255)`
      );
      console.log('   ✅ Colonne two_factor_secret ajoutée');
    } else {
      console.log('   ℹ️ Colonne two_factor_secret existe déjà');
    }

    // Vérifier si la colonne two_factor_enabled existe
    const enabledExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='users' AND column_name='two_factor_enabled'`,
      { type: QueryTypes.SELECT }
    );

    if (enabledExists.length === 0) {
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false`
      );
      console.log('   ✅ Colonne two_factor_enabled ajoutée');
    } else {
      console.log('   ℹ️ Colonne two_factor_enabled existe déjà');
    }

    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error);
    process.exit(1);
  }
}

add2FAColumns();