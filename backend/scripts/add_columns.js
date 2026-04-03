const { sequelize } = require('../src/models');
const { QueryTypes } = require('sequelize');

async function addColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base');

    const alterQueries = [
      `ALTER TABLE actifs ADD COLUMN IF NOT EXISTS compte_comptable VARCHAR(10) DEFAULT '205'`,
      `ALTER TABLE actifs ADD COLUMN IF NOT EXISTS date_sortie DATE`,
      `ALTER TABLE actifs ADD COLUMN IF NOT EXISTS type_sortie VARCHAR(20)`,
      `ALTER TABLE actifs ADD COLUMN IF NOT EXISTS prix_cession DECIMAL(15,2)`,
      `ALTER TABLE actifs ADD COLUMN IF NOT EXISTS plus_moins_value DECIMAL(15,2) DEFAULT 0`
    ];

    for (const query of alterQueries) {
      await sequelize.query(query);
      console.log(`✅ Exécuté: ${query.split(' ').slice(0,5).join(' ')}...`);
    }

    console.log('✅ Colonnes ajoutées avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

addColumns();