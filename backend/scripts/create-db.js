const { Client } = require('pg');

async function createDatabase() {
  // Se connecter à la base par défaut 'postgres'
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',  // Connexion à la base système
    user: 'postgres',
    password: 'Anunudaniel2001'
  });

  try {
    console.log('🔄 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté');

    // Vérifier si la base existe déjà
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'bcc_gestion'"
    );

    if (checkDb.rows.length === 0) {
      // Créer la base de données
      await client.query('CREATE DATABASE bcc_gestion');
      console.log('✅ Base de données "bcc_gestion" créée avec succès');
    } else {
      console.log('ℹ️ La base "bcc_gestion" existe déjà');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

createDatabase();