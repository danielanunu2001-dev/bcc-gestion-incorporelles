const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetAdmin() {
  // Configure la connexion PostgreSQL
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'bcc_gestion',
    user: 'postgres',
    password: 'Anunudaniel2001'  // Ton mot de passe
  });

  try {
    console.log('🔄 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 Mot de passe hashé créé');

    // Vérifier si la table users existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📦 Table users n\'existe pas, création...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Table users créée');
    }

    // Supprimer l'admin existant s'il existe
    await client.query(
      'DELETE FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    console.log('🗑️ Ancien admin supprimé');

    // Créer le nouvel admin
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
      ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
    );
    console.log('✅ Admin créé avec succès');

    // Vérifier
    const verify = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    
    if (verify.rows.length > 0) {
      console.log('✅ Vérification réussie:');
      console.log('   Email:', verify.rows[0].email);
      console.log('   Rôle:', verify.rows[0].role);
    }

    // Lister tous les utilisateurs
    const allUsers = await client.query('SELECT email, role FROM users');
    console.log('\n📋 Utilisateurs dans la base:');
    allUsers.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
    console.log('🔌 Déconnexion');
  }
}

// Exécuter
resetAdmin();