const path = require('path');

// Corriger le chemin pour pointer vers src/models
const modelsPath = path.join(__dirname, '..', 'src', 'models');
const { sequelize } = require(modelsPath);
const { QueryTypes } = require('sequelize');

async function syncMouvementsTable() {
  try {
    console.log('🔄 Vérification de la table mouvements...');
    console.log('📁 Chemin des modèles:', modelsPath);

    // Liste de toutes les colonnes nécessaires
    const requiredColumns = [
      { name: 'type_mouvement', type: 'VARCHAR(50)', notNull: true },
      { name: 'date_mouvement', type: 'DATE', notNull: true, default: 'CURRENT_DATE' },
      { name: 'localisation_source', type: 'VARCHAR(200)' },
      { name: 'localisation_destination', type: 'VARCHAR(200)' },
      { name: 'responsable', type: 'VARCHAR(100)' },
      { name: 'document_reference', type: 'VARCHAR(100)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'prix_cession', type: 'DECIMAL(15,2)' },
      { name: 'plus_moins_value', type: 'DECIMAL(15,2)' },
      { name: 'nouvel_etat', type: 'VARCHAR(50)' },
      { name: 'nouvelle_localisation', type: 'VARCHAR(200)' },
      { name: 'nouvelle_affectation', type: 'VARCHAR(200)' },
      { name: 'statut', type: 'VARCHAR(20)', default: "'en_attente'" },
      { name: 'validated_by', type: 'UUID' },
      { name: 'date_validation', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
    ];

    // Vérifier la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base établie');

    // Récupérer les colonnes existantes
    const existingColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mouvements'
    `, { type: QueryTypes.SELECT });

    const existingNames = existingColumns.map(c => c.column_name);
    console.log('📋 Colonnes existantes:', existingNames);

    // Ajouter les colonnes manquantes
    for (const col of requiredColumns) {
      if (!existingNames.includes(col.name)) {
        console.log(`➕ Ajout de la colonne: ${col.name}`);
        
        let sql = `ALTER TABLE mouvements ADD COLUMN ${col.name} ${col.type}`;
        
        if (col.default) {
          sql += ` DEFAULT ${col.default}`;
        }
        
        await sequelize.query(sql);
        
        if (col.notNull) {
          await sequelize.query(`ALTER TABLE mouvements ALTER COLUMN ${col.name} SET NOT NULL`);
        }
      } else {
        console.log(`✅ Colonne déjà existante: ${col.name}`);
      }
    }

    // Vérifier la structure finale
    const finalColumns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'mouvements' 
      ORDER BY ordinal_position
    `, { type: QueryTypes.SELECT });

    console.log('\n📊 Structure finale de la table:');
    finalColumns.forEach(c => {
      console.log(`   - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Synchronisation terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

syncMouvementsTable();