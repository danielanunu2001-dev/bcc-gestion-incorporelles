-- Table des catégories d'amortissement
CREATE TABLE IF NOT EXISTS categories_amortissement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_categorie VARCHAR(20) UNIQUE NOT NULL,
    nom_categorie VARCHAR(100) NOT NULL,
    description TEXT,
    duree_vie_ans INTEGER NOT NULL,
    mode_amortissement_defaut VARCHAR(20) DEFAULT 'lineaire',
    taux_amortissement DECIMAL(5,2),
    coefficient_degressif DECIMAL(3,2) DEFAULT 1.75,
    actif BOOLEAN DEFAULT true,
    compte_comptable_defaut VARCHAR(10),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des réévaluations
CREATE TABLE IF NOT EXISTS reevaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actif_id UUID NOT NULL REFERENCES actifs(id) ON DELETE CASCADE,
    date_reevaluation DATE NOT NULL,
    valeur_avant DECIMAL(15,2) NOT NULL,
    valeur_apres DECIMAL(15,2) NOT NULL,
    plus_value DECIMAL(15,2) DEFAULT 0,
    moins_value DECIMAL(15,2) DEFAULT 0,
    compte_reevaluation VARCHAR(10),
    nouvelle_duree_ans INTEGER,
    nouveau_taux DECIMAL(5,2),
    commentaire TEXT,
    document_reference VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ajout des colonnes à la table actifs
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES categories_amortissement(id);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS valeur_reevaluee DECIMAL(15,2) DEFAULT 0;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS date_derniere_reevaluation DATE;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS cumul_reevaluations DECIMAL(15,2) DEFAULT 0;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS duree_residuelle_ans INTEGER;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS provision_depreciation DECIMAL(15,2) DEFAULT 0;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS date_dernier_test_depreciation DATE;

-- Index
CREATE INDEX IF NOT EXISTS idx_categories_amortissement_code ON categories_amortissement(code_categorie);
CREATE INDEX IF NOT EXISTS idx_reevaluations_actif_id ON reevaluations(actif_id);
CREATE INDEX IF NOT EXISTS idx_reevaluations_date ON reevaluations(date_reevaluation DESC);