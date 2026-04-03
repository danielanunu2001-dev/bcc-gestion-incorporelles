const { sequelize } = require('../src/models');
const { QueryTypes } = require('sequelize');

async function initTables() {
  try {
    console.log('🔄 Initialisation des tables manquantes...');
    await sequelize.authenticate();

    // Créer table contrats
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS contrats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
        numero_contrat VARCHAR(255) NOT NULL,
        fournisseur VARCHAR(255) NOT NULL,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        montant DECIMAL(15,2) NOT NULL,
        description TEXT,
        fichier VARCHAR(255),
        alertes_envoyees JSONB DEFAULT '[]',
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table contrats créée');

    // Créer table depreciations
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS depreciations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
        date_test DATE NOT NULL,
        valeur_recouvrable DECIMAL(15,2) NOT NULL,
        valeur_comptable DECIMAL(15,2) NOT NULL,
        provision DECIMAL(15,2) DEFAULT 0,
        commentaire TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table depreciations créée');

    // Créer tous les index
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_actifs_code ON actifs(code)',
      'CREATE INDEX IF NOT EXISTS idx_actifs_created_at ON actifs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_actifs_type ON actifs(type)',
      'CREATE INDEX IF NOT EXISTS idx_actifs_actif ON actifs(actif)',
      'CREATE INDEX IF NOT EXISTS idx_amortissements_actif_id ON amortissements(actif_id)',
      'CREATE INDEX IF NOT EXISTS idx_amortissements_exercice ON amortissements(exercice)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_contrats_actif_id ON contrats(actif_id)',
      'CREATE INDEX IF NOT EXISTS idx_contrats_date_fin ON contrats(date_fin)',
      'CREATE INDEX IF NOT EXISTS idx_depreciations_actif_id ON depreciations(actif_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'
    ];

    for (const idx of indexes) {
      await sequelize.query(idx);
    }
    console.log('✅ Tous les index créés');

    // Vérification finale
    const tables = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      { type: QueryTypes.SELECT }
    );
    console.log('\n📋 Tables présentes :');
    tables.forEach(t => console.log(`   - ${t.tablename}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error);
    process.exit(1);
  }
}

initTables();