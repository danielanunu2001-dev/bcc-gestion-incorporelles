-- =====================================================
-- CORRECTION DE LA TABLE MOUVEMENTS
-- =====================================================

-- 1. Vérifier les colonnes existantes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mouvements';

-- 2. Ajouter la colonne type_mouvement si elle n'existe pas
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS type_mouvement VARCHAR(50);

-- 3. Si la colonne 'type' existe, migrer les données
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mouvements' AND column_name = 'type') THEN
    UPDATE mouvements SET type_mouvement = type WHERE type_mouvement IS NULL;
  END IF;
END $$;

-- 4. Rendre type_mouvement NOT NULL
ALTER TABLE mouvements 
ALTER COLUMN type_mouvement SET NOT NULL;

-- 5. Ajouter les index
CREATE INDEX IF NOT EXISTS idx_mouvements_type ON mouvements(type_mouvement);

-- 6. Vérifier le résultat
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mouvements' 
ORDER BY ordinal_position;