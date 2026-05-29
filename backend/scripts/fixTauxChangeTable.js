// backend/src/scripts/fixTauxChangeTable.js

const { sequelize } = require('../config/database');

async function fixTauxChangeTable() {
  try {
    console.log('🔧 Début de la correction de la table taux_change...\n');

    // 1. Vérifier la structure actuelle
    console.log('📊 Vérification de la structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'taux_change'
      ORDER BY ordinal_position
    `);
    
    if (columns.length === 0) {
      console.log('⚠️ La table taux_change n\'existe pas encore');
      console.log('✅ Aucune correction nécessaire');
      return;
    }
    
    console.log('Structure trouvée avec', columns.length, 'colonnes');

    // 2. Mettre à jour les valeurs NULL
    console.log('\n🔄 Mise à jour des valeurs NULL...');
    await sequelize.query(`
      UPDATE taux_change SET taux_cdf = 0 WHERE taux_cdf IS NULL
    `);
    console.log('✅ Valeurs NULL mises à 0');

    // 3. Modifier la colonne
    console.log('\n🔧 Modification de la colonne taux_cdf...');
    
    try {
      await sequelize.query(`
        ALTER TABLE taux_change ALTER COLUMN taux_cdf SET DEFAULT 0
      `);
      console.log('✅ Valeur par défaut ajoutée');
    } catch (err) {
      console.log('⚠️ La valeur par défaut existe peut-être déjà:', err.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE taux_change ALTER COLUMN taux_cdf DROP NOT NULL
      `);
      console.log('✅ Contrainte NOT NULL supprimée');
    } catch (err) {
      console.log('⚠️ La contrainte NOT NULL n\'existe peut-être pas:', err.message);
    }

    // 4. Vérifier la nouvelle structure
    console.log('\n📊 Nouvelle structure:');
    const [newColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'taux_change' AND column_name = 'taux_cdf'
    `);
    
    if (newColumns.length > 0) {
      console.log(`   Colonne: ${newColumns[0].column_name}`);
      console.log(`   Type: ${newColumns[0].data_type}`);
      console.log(`   Nullable: ${newColumns[0].is_nullable}`);
      console.log(`   Default: ${newColumns[0].column_default || 'aucune'}`);
    }

    // 5. Vérifier les données
    console.log('\n📈 Statistiques des données:');
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN taux_cdf IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN taux_cdf = 0 THEN 1 END) as zero_count,
        MIN(taux_cdf) as min_value,
        MAX(taux_cdf) as max_value,
        AVG(taux_cdf) as avg_value
      FROM taux_change
    `);
    
    console.log(`   Total: ${stats[0].total}`);
    console.log(`   NULL: ${stats[0].null_count}`);
    console.log(`   Zéro: ${stats[0].zero_count}`);
    console.log(`   Min: ${stats[0].min_value}`);
    console.log(`   Max: ${stats[0].max_value}`);
    console.log(`   Moyenne: ${stats[0].avg_value}`);

    console.log('\n✅ Correction terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le script
fixTauxChangeTable();