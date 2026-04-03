const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function cleanReset() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',  // Se connecter à postgres d'abord
    user: 'postgres',
    password: 'Anunudaniel2001'
  });

  try {
    console.log('🧹 NETTOYAGE COMPLET DE LA BASE\n');
    
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Supprimer la base si elle existe
    console.log('🗑️ Suppression de la base bcc_gestion...');
    await client.query('DROP DATABASE IF EXISTS bcc_gestion');
    console.log('✅ Base supprimée');

    // Recréer la base
    console.log('📦 Création de la base bcc_gestion...');
    await client.query('CREATE DATABASE bcc_gestion');
    console.log('✅ Base créée');

    await client.end();

    // Se connecter à la nouvelle base
    const dbClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'bcc_gestion',
      user: 'postgres',
      password: 'Anunudaniel2001'
    });

    await dbClient.connect();
    console.log('✅ Connecté à bcc_gestion');

    // Créer la table users avec la bonne structure
    console.log('📦 Création de la table users...');
    await dbClient.query(`
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
    console.log('✅ Table users créée');

    // Créer l'admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dbClient.query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4)`,
      ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
    );
    console.log('✅ Admin créé');

    // Vérifier
    const users = await dbClient.query('SELECT email, role FROM users');
    console.log('\n📋 Utilisateurs:');
    users.rows.forEach(u => console.log(`   - ${u.email} (${u.role})`));

    await dbClient.end();
    console.log('\n✅ Base prête !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

cleanReset();