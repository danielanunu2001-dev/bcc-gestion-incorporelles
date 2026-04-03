const { Client } = require('pg');

async function initDatabase() {
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

    // Supprimer toutes les tables existantes
    console.log('🗑️ Suppression des tables existantes...');
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS amortissements CASCADE;
      DROP TABLE IF EXISTS actifs CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Tables supprimées');

    // Créer la table users
    console.log('📦 Création de la table users...');
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
    console.log('✅ Table users créée');

    // Créer la table actifs
    console.log('📦 Création de la table actifs...');
    await client.query(`
      CREATE TABLE actifs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        nom VARCHAR(200) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date_acquisition DATE NOT NULL,
        cout_acquisition DECIMAL(15,2) NOT NULL,
        valeur_residuelle DECIMAL(15,2) DEFAULT 0,
        duree_utile_ans INTEGER NOT NULL,
        mode_amortissement VARCHAR(20) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table actifs créée');

    // Créer la table amortissements
    console.log('📦 Création de la table amortissements...');
    await client.query(`
      CREATE TABLE amortissements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
        exercice INTEGER NOT NULL,
        annuite DECIMAL(15,2) NOT NULL,
        cumul_amortissements DECIMAL(15,2) NOT NULL,
        valeur_nette DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(actif_id, exercice)
      )
    `);
    console.log('✅ Table amortissements créée');

    // Créer la table audit_logs
    console.log('📦 Création de la table audit_logs...');
    await client.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(20) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id UUID NOT NULL,
        old_data JSONB,
        new_data JSONB,
        ip_address INET,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audit_logs créée');

    console.log('\n✅ Toutes les tables ont été créées avec succès !');

    // Vérifier les tables créées
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tables dans la base:');
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Déconnexion');
  }
}

initDatabase();