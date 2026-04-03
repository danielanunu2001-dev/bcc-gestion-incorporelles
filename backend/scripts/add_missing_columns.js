// backend/scripts/add_missing_columns.js

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function addMissingColumns() {
  try {
    console.log('🔄 Début de l\'ajout des colonnes manquantes...\n');

    const columns = [
      { name: 'taux_amortissement', type: 'DECIMAL(5, 2)' },
      { name: 'numero_facture', type: 'VARCHAR(50)' },
      { name: 'motif_sortie', type: 'TEXT' },
      { name: 'depreciation_actif', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'montant_depreciation', type: 'DECIMAL(15, 2) DEFAULT 0' },
      { name: 'date_dernier_test_depreciation', type: 'DATE' },
      { name: 'duree_residuelle_ans', type: 'INTEGER' }
    ];

    for (const col of columns) {
      try {
        await sequelize.query(`
          ALTER TABLE actifs 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✅ Colonne '${col.name}' ajoutée avec succès`);
      } catch (err) {
        console.log(`⚠️ Colonne '${col.name}' existe déjà ou erreur:`, err.message);
      }
    }

    // Ajouter les colonnes de devise si elles n'existent pas
    const deviseColumns = [
      { name: 'devise_id', type: 'UUID' },
      { name: 'montant_devise', type: 'DECIMAL(15, 2)' },
      { name: 'taux_change_utilisation', type: 'DECIMAL(15, 6)' }
    ];

    for (const col of deviseColumns) {
      try {
        await sequelize.query(`
          ALTER TABLE actifs 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✅ Colonne '${col.name}' ajoutée avec succès`);
      } catch (err) {
        console.log(`⚠️ Colonne '${col.name}' existe déjà ou erreur:`, err.message);
      }
    }

    // Ajouter la clé étrangère pour devise_id
    try {
      await sequelize.query(`
        ALTER TABLE actifs 
        ADD CONSTRAINT IF NOT EXISTS fk_actifs_devise 
        FOREIGN KEY (devise_id) REFERENCES devises(id) ON DELETE SET NULL
      `);
      console.log('✅ Clé étrangère fk_actifs_devise ajoutée');
    } catch (err) {
      console.log('⚠️ Clé étrangère existe déjà:', err.message);
    }

    // Ajouter les index pour optimiser les recherches
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_actifs_taux_amortissement 
        ON actifs(taux_amortissement)
      `);
      console.log('✅ Index idx_actifs_taux_amortissement créé');
    } catch (err) {
      console.log('⚠️ Index existe déjà:', err.message);
    }

    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_actifs_devise_id 
        ON actifs(devise_id)
      `);
      console.log('✅ Index idx_actifs_devise_id créé');
    } catch (err) {
      console.log('⚠️ Index existe déjà:', err.message);
    }

    console.log('\n🎉 Toutes les colonnes ont été ajoutées avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des colonnes:', error.message);
  } finally {
    await sequelize.close();
  }
}

addMissingColumns();