const { Client } = require('pg');

async function fixUsersTable() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'bcc_gestion',
    user: 'postgres',
    password: 'Anunudaniel2001'
  });

  try {
    console.log('🔄 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté');

    // Supprimer la table users si elle existe
    console.log('🗑️ Suppression de la table users...');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Table users supprimée');

    // Recréer la table avec la bonne structure
    console.log('📦 Création de la nouvelle table users...');
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'gestionnaire',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table users créée avec succès');

    // Vérifier la structure
    const columns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('\n📋 Structure de la table:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.column_default || ''}`);
    });

    console.log('\n✅ Table prête !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

fixUsersTable();