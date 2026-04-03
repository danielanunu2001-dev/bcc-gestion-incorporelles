-- =====================================================
-- SCRIPT DE MISE À JOUR DE LA TABLE ACTIFS
-- Ajout des nouvelles colonnes pour la gestion complète
-- des immobilisations (corporelles et incorporelles)
-- =====================================================

-- Ajouter les colonnes manquantes à la table actifs
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS numero_inventaire VARCHAR(50) UNIQUE;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS marque VARCHAR(100);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS modele VARCHAR(100);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS localisation VARCHAR(200);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS fournisseur VARCHAR(200);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS etat VARCHAR(20) DEFAULT 'bon';
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS affectation VARCHAR(200);
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS type_immobilisation VARCHAR(20) DEFAULT 'incorporel';
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS date_validite DATE;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS nombre_utilisateurs INTEGER;
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS support VARCHAR(100);

-- Étendre le type ENUM pour les nouvelles catégories d'actifs
ALTER TYPE "enum_actifs_type" ADD VALUE IF NOT EXISTS 'materiel';
ALTER TYPE "enum_actifs_type" ADD VALUE IF NOT EXISTS 'vehicule';
ALTER TYPE "enum_actifs_type" ADD VALUE IF NOT EXISTS 'batiment';
ALTER TYPE "enum_actifs_type" ADD VALUE IF NOT EXISTS 'terrain';

-- =====================================================
-- COMMANDES POUR VÉRIFIER LES MODIFICATIONS
-- =====================================================

-- Vérifier la structure de la table après modifications
\d actifs;

-- Ou avec une requête plus détaillée
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'actifs' 
ORDER BY ordinal_position;

-- Voir les valeurs possibles de l'enum
SELECT unnest(enum_range(NULL::enum_actifs_type)) AS type_value;

-- =====================================================
-- COMMANDES DE ROLLBACK (au cas où)
-- =====================================================

/*
-- Pour annuler les modifications (si nécessaire)
ALTER TABLE actifs DROP COLUMN IF EXISTS numero_inventaire;
ALTER TABLE actifs DROP COLUMN IF EXISTS marque;
ALTER TABLE actifs DROP COLUMN IF EXISTS modele;
ALTER TABLE actifs DROP COLUMN IF EXISTS numero_serie;
ALTER TABLE actifs DROP COLUMN IF EXISTS localisation;
ALTER TABLE actifs DROP COLUMN IF EXISTS fournisseur;
ALTER TABLE actifs DROP COLUMN IF EXISTS etat;
ALTER TABLE actifs DROP COLUMN IF EXISTS affectation;
ALTER TABLE actifs DROP COLUMN IF EXISTS type_immobilisation;
ALTER TABLE actifs DROP COLUMN IF EXISTS date_validite;
ALTER TABLE actifs DROP COLUMN IF EXISTS nombre_utilisateurs;
ALTER TABLE actifs DROP COLUMN IF EXISTS support;
*/

-- =====================================================
-- SCRIPT POUR METTRE À JOUR LES DONNÉES EXISTANTES
-- =====================================================

-- Mettre à jour le type_immobilisation en fonction du type d'actif
UPDATE actifs 
SET type_immobilisation = 
    CASE 
        WHEN type IN ('logiciel', 'licence', 'brevet', 'fonds_commercial') THEN 'incorporel'
        WHEN type IN ('materiel', 'vehicule', 'batiment', 'terrain') THEN 'corporel'
        ELSE 'incorporel'
    END;

-- Définir l'état par défaut pour les actifs existants
UPDATE actifs SET etat = 'bon' WHERE etat IS NULL;

-- Définir un numéro d'inventaire pour les actifs qui n'en ont pas
-- (format: INV-CODE-ANNEE)
UPDATE actifs 
SET numero_inventaire = 'INV-' || code || '-' || EXTRACT(YEAR FROM date_acquisition)
WHERE numero_inventaire IS NULL;

-- =====================================================
-- CRÉATION D'INDEX POUR AMÉLIORER LES PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_actifs_numero_inventaire ON actifs(numero_inventaire);
CREATE INDEX IF NOT EXISTS idx_actifs_localisation ON actifs(localisation);
CREATE INDEX IF NOT EXISTS idx_actifs_etat ON actifs(etat);
CREATE INDEX IF NOT EXISTS idx_actifs_type_immobilisation ON actifs(type_immobilisation);
CREATE INDEX IF NOT EXISTS idx_actifs_date_validite ON actifs(date_validite);