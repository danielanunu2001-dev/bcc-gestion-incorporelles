const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Générer un UUID manuellement si gen_random_uuid() n'existe pas
function generateUUID() {
  return crypto.randomUUID();
}

async function createAdminSQL() {
  // Configure les paramètres de connexion selon ta configuration PostgreSQL
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'bcc_gestion',      // Nom de ta base
    user: 'postgres',              // Ton utilisateur PostgreSQL
    password: 'postgres'           // Ton mot de passe PostgreSQL
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

    // Vérifier si l'admin existe déjà
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );

    if (checkResult.rows.length > 0) {
      // Mettre à jour
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, 'admin@bcc.cd']
      );
      console.log('✅ Admin mis à jour avec nouveau mot de passe');
    } else {
      // Créer avec UUID manuel si gen_random_uuid n'existe pas
      try {
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
          ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
        );
      } catch (uuidError) {
        // Si gen_random_uuid() n'existe pas, utiliser UUID manuel
        console.log('⚠️ gen_random_uuid() non disponible, utilisation UUID manuel');
        const manualUUID = generateUUID();
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [manualUUID, 'admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
        );
      }
      console.log('✅ Admin créé avec succès');
    }

    // Vérifier
    const verify = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    
    if (verify.rows.length > 0) {
      console.log('✅ Vérification réussie:');
      console.log('   Email:', verify.rows[0].email);
      console.log('   Rôle:', verify.rows[0].role);
      console.log('   ID:', verify.rows[0].id);
    } else {
      console.log('❌ Échec de la vérification');
    }

    // Lister tous les utilisateurs
    const allUsers = await client.query('SELECT email, role FROM users');
    console.log('\n📋 Tous les utilisateurs dans la base:');
    allUsers.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Erreur détaillée:', error);
  } finally {
    await client.end();
    console.log('🔌 Déconnexion de PostgreSQL');
  }
}

// Demander les infos de connexion si nécessaire
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askCredentials() {
  return new Promise((resolve) => {
    console.log('\n🔧 Configuration de la connexion PostgreSQL');
    readline.question('Host (default: localhost): ', (host) => {
      readline.question('Port (default: 5432): ', (port) => {
        readline.question('Database (default: bcc_gestion): ', (database) => {
          readline.question('User (default: postgres): ', (user) => {
            readline.question('Password: ', (password) => {
              readline.close();
              resolve({
                host: host || 'localhost',
                port: parseInt(port) || 5432,
                database: database || 'bcc_gestion',
                user: user || 'postgres',
                password: password || 'postgres'
              });
            });
          });
        });
      });
    });
  });
}

// Exécuter avec ou sans interaction
async function main() {
  // Si des arguments sont passés en ligne de commande, les utiliser
  if (process.argv.length > 2) {
    // Mode silencieux avec arguments
    await createAdminSQL();
  } else {
    // Mode interactif
    const config = await askCredentials();
    const client = new Client(config);
    try {
      await client.connect();
      console.log('✅ Connecté avec succès');
      await createAdminSQLWithClient(client);
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      console.log('\n💡 Vérifie que PostgreSQL est lancé et que les identifiants sont corrects');
    } finally {
      await client.end();
    }
  }
}

async function createAdminSQLWithClient(client) {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
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

    // Vérifier si l'admin existe
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );

    if (checkResult.rows.length > 0) {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, 'admin@bcc.cd']
      );
      console.log('✅ Admin mis à jour');
    } else {
      try {
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) 
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
          ['admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
        );
      } catch (e) {
        const manualUUID = generateUUID();
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [manualUUID, 'admin@bcc.cd', hashedPassword, 'Administrateur', 'admin']
        );
      }
      console.log('✅ Admin créé');
    }

    // Vérification finale
    const verify = await client.query(
      'SELECT email, role FROM users WHERE email = $1',
      ['admin@bcc.cd']
    );
    console.log('✅ Admin actif:', verify.rows[0]);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Lancer le script
main().catch(console.error);