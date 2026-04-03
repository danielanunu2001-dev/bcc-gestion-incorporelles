const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function finalReset() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Anunudaniel2001'
  });

  try {
    console.log('🧹 RÉINITIALISATION FINALE\n');
    
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Supprimer et recréer la base
    console.log('🗑️ Suppression de bcc_gestion...');
    await client.query('DROP DATABASE IF EXISTS bcc_gestion');
    console.log('✅ Base supprimée');

    console.log('📦 Création de bcc_gestion...');
    await client.query('CREATE DATABASE bcc_gestion');
    console.log('✅ Base créée');

    await client.end();

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n🎉 Base prête ! Relance le backend avec: npm run dev');
    console.log('Puis crée l\'admin avec: node scripts/create-admin.js');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

finalReset();