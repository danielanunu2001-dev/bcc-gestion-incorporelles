const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createAdmin() {
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

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 Mot de passe hashé créé');

    // Supprimer l'ancien admin s'il existe
    await client.query('DELETE FROM users WHERE email = $1', ['admin@bcc.cd']);
    console.log('🗑️ Ancien admin supprimé');

    // Créer le nouvel admin
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
    );
    console.log('✅ Admin créé avec succès');

    // Vérifier
    const verify = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    
    if (verify.rows.length > 0) {
      console.log('\n✅ Vérification:');
      console.log('   Email:', verify.rows[0].email);
      console.log('   Rôle:', verify.rows[0].role);
      
      // Tester le mot de passe
      const testHash = await bcrypt.compare('admin123', hashedPassword);
      console.log('   Test mot de passe:', testHash ? '✅ OK' : '❌ ÉCHEC');
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
    console.log('\n🔌 Déconnexion');
  }
}

createAdmin();