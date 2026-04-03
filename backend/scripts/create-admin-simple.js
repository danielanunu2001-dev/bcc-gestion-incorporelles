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

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Supprimer l'ancien admin
    await client.query('DELETE FROM users WHERE email = $1', ['admin@bcc.cd']);
    
    // Créer le nouvel admin
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4)`,
      ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
    );
    
    console.log('✅ Admin créé avec succès');

    // Vérifier
    const result = await client.query(
      'SELECT email, role FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    
    console.log('📋 Admin:', result.rows[0]);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

createAdmin();