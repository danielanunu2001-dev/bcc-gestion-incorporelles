const path = require('path');
const modelsPath = path.join(__dirname, '..', 'src', 'models');
const { sequelize } = require(modelsPath);
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('🔄 Début de la migration...');
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    // 1. Ajouter les colonnes à la table actifs si elles n'existent pas
    console.log('📦 Mise à jour de la table actifs...');
    
    const compteComptableExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='actifs' AND column_name='compte_comptable'`,
      { type: QueryTypes.SELECT }
    );
    if (compteComptableExists.length === 0) {
      await sequelize.query(
        `ALTER TABLE actifs ADD COLUMN compte_comptable VARCHAR(10) DEFAULT '205'`
      );
      console.log('   ✅ Colonne compte_comptable ajoutée');
    }

    const dateSortieExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='actifs' AND column_name='date_sortie'`,
      { type: QueryTypes.SELECT }
    );
    if (dateSortieExists.length === 0) {
      await sequelize.query(`ALTER TABLE actifs ADD COLUMN date_sortie DATE`);
      console.log('   ✅ Colonne date_sortie ajoutée');
    }

    const typeSortieExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='actifs' AND column_name='type_sortie'`,
      { type: QueryTypes.SELECT }
    );
    if (typeSortieExists.length === 0) {
      await sequelize.query(`ALTER TABLE actifs ADD COLUMN type_sortie VARCHAR(20)`);
      console.log('   ✅ Colonne type_sortie ajoutée');
    }

    const prixCessionExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='actifs' AND column_name='prix_cession'`,
      { type: QueryTypes.SELECT }
    );
    if (prixCessionExists.length === 0) {
      await sequelize.query(`ALTER TABLE actifs ADD COLUMN prix_cession DECIMAL(15,2)`);
      console.log('   ✅ Colonne prix_cession ajoutée');
    }

    const plusMoinsValueExists = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='actifs' AND column_name='plus_moins_value'`,
      { type: QueryTypes.SELECT }
    );
    if (plusMoinsValueExists.length === 0) {
      await sequelize.query(`ALTER TABLE actifs ADD COLUMN plus_moins_value DECIMAL(15,2) DEFAULT 0`);
      console.log('   ✅ Colonne plus_moins_value ajoutée');
    }

    // 2. Créer la table contrats si elle n'existe pas
    console.log('📦 Création de la table contrats...');
    const contratsTableExists = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name='contrats'`,
      { type: QueryTypes.SELECT }
    );
    if (contratsTableExists.length === 0) {
      await sequelize.query(`
        CREATE TABLE contrats (
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
      console.log('   ✅ Table contrats créée');
    } else {
      console.log('   ℹ️ Table contrats existe déjà');
    }

    // 3. Créer la table depreciations si elle n'existe pas
    console.log('📦 Création de la table depreciations...');
    const depreciationsTableExists = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name='depreciations'`,
      { type: QueryTypes.SELECT }
    );
    if (depreciationsTableExists.length === 0) {
      await sequelize.query(`
        CREATE TABLE depreciations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
          date_test DATE NOT NULL,
          valeur_recouvrable DECIMAL(15,2) NOT NULL,
          valeur_comptable DECIMAL(15,2) NOT NULL,
          provision DECIMAL(15,2) NOT NULL DEFAULT 0,
          commentaire TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ Table depreciations créée');
    } else {
      console.log('   ℹ️ Table depreciations existe déjà');
    }

    // 4. Mettre à jour le type ENUM des rôles si nécessaire (PostgreSQL)
    console.log('📦 Mise à jour des rôles utilisateur...');
    try {
      await sequelize.query(
        `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'juridique'`
      );
      await sequelize.query(
        `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'informatique'`
      );
      console.log('   ✅ Rôles juridique et informatique ajoutés');
    } catch (err) {
      console.log('   ℹ️ Les rôles existent probablement déjà');
    }

    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration :', error);
    process.exit(1);
  }
}

migrate();