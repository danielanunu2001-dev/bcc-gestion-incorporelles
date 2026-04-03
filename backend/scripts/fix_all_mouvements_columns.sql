-- =====================================================
-- AJOUTER TOUTES LES COLONNES MANQUANTES À LA TABLE MOUVEMENTS
-- =====================================================

-- 1. Ajouter la colonne type_mouvement (si pas déjà fait)
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS type_mouvement VARCHAR(50);

-- 2. Ajouter la colonne date_mouvement
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS date_mouvement DATE DEFAULT CURRENT_DATE;

-- 3. Ajouter les autres colonnes manquantes
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS localisation_source VARCHAR(200),
ADD COLUMN IF NOT EXISTS localisation_destination VARCHAR(200),
ADD COLUMN IF NOT EXISTS responsable VARCHAR(100),
ADD COLUMN IF NOT EXISTS document_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS prix_cession DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS plus_moins_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS nouvel_etat VARCHAR(50),
ADD COLUMN IF NOT EXISTS nouvelle_localisation VARCHAR(200),
ADD COLUMN IF NOT EXISTS nouvelle_affectation VARCHAR(200),
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'en_attente',
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Migrer les données existantes
DO $$
BEGIN
  -- Migrer type → type_mouvement
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'mouvements' AND column_name = 'type') THEN
    UPDATE mouvements SET type_mouvement = type WHERE type_mouvement IS NULL;
  END IF;

  -- Migrer date → date_mouvement
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'mouvements' AND column_name = 'date') THEN
    UPDATE mouvements SET date_mouvement = date WHERE date_mouvement IS NULL;
  END IF;
END $$;

-- 5. Rendre les colonnes NOT NULL
ALTER TABLE mouvements 
ALTER COLUMN type_mouvement SET NOT NULL,
ALTER COLUMN date_mouvement SET NOT NULL;

-- 6. Créer les index
CREATE INDEX IF NOT EXISTS idx_mouvements_type_mouvement ON mouvements(type_mouvement);
CREATE INDEX IF NOT EXISTS idx_mouvements_date_mouvement ON mouvements(date_mouvement);
CREATE INDEX IF NOT EXISTS idx_mouvements_statut ON mouvements(statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_validated_by ON mouvements(validated_by);

-- 7. Vérifier la structure finale
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mouvements' 
ORDER BY ordinal_position;