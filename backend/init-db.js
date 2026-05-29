const { sequelize } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function initDB() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    
    // Créer la table users
    await sequelize.query(\
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(255) DEFAULT 'gestionnaire',
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \);
    console.log('✅ Table users créée');
    
    // Créer les autres tables essentielles
    await sequelize.query(\
      CREATE TABLE IF NOT EXISTS devises (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        nom VARCHAR(100) NOT NULL,
        symbole VARCHAR(10),
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \);
    console.log('✅ Table devises créée');
    
    // Insérer quelques devises
    await sequelize.query(\
      INSERT INTO devises (code, nom, symbole, actif) VALUES
      ('USD', 'Dollar US', '$', true),
      ('EUR', 'Euro', '€', true),
      ('GBP', 'Livre Sterling', '£', true),
      ('CDF', 'Franc Congolais', 'FC', true)
      ON CONFLICT (code) DO NOTHING
    \);
    console.log('✅ Devises ajoutées');
    
    // Créer le compte admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await sequelize.query(\
      INSERT INTO users (email, password_hash, full_name, role, actif)
      VALUES ('admin@bcc.cd', '\', 'Administrateur', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    \);
    
    console.log('✅ Compte admin créé');
    console.log('📧 Email: admin@bcc.cd');
    console.log('🔑 Mot de passe: admin123');
    
    // Vérifier
    const [users] = await sequelize.query('SELECT COUNT(*) FROM users');
    console.log(\📊 Total utilisateurs: \\);
    
    await sequelize.close();
    console.log('✅ Initialisation terminée avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

initDB();