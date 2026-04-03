-- =====================================================
-- AJOUTER LA COLONNE type_mouvement À LA TABLE mouvements
-- =====================================================

-- 1. Ajouter la colonne (peut être NULL temporairement)
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS type_mouvement VARCHAR(50);

-- 2. Si la colonne 'type' existe, copier les données
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'mouvements' AND column_name = 'type') THEN
    UPDATE mouvements SET type_mouvement = type WHERE type_mouvement IS NULL;
  END IF;
END $$;

-- 3. Rendre la colonne NOT NULL
ALTER TABLE mouvements 
ALTER COLUMN type_mouvement SET NOT NULL;

-- 4. Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_mouvements_type_mouvement ON mouvements(type_mouvement);

-- 5. Vérifier que tout est OK
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mouvements' 
ORDER BY ordinal_position;