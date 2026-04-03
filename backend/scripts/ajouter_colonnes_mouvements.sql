-- =====================================================
-- AJOUTER LES COLONNES DE VALIDATION À LA TABLE MOUVEMENTS
-- =====================================================

-- Ajouter la colonne statut
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'en_attente';

-- Ajouter la colonne validated_by
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id);

-- Ajouter la colonne date_validation
ALTER TABLE mouvements 
ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP;

-- =====================================================
-- CRÉER LES INDEX POUR LES NOUVELLES COLONNES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mouvements_statut ON mouvements(statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_validated_by ON mouvements(validated_by);

-- =====================================================
-- METTRE À JOUR LES MOUVEMENTS EXISTANTS
-- =====================================================

-- Mettre à jour les mouvements existants avec un statut par défaut
UPDATE mouvements SET statut = 'valide' WHERE statut IS NULL;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher la structure de la table après modifications
\d mouvements;