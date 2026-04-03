-- backend/seeders/devises.sql

-- Insérer les devises de base
INSERT INTO devises (id, code, nom, symbole, taux_change, est_principale, date_taux, source, actif)
VALUES 
  (gen_random_uuid(), 'CDF', 'Franc Congolais', 'FC', 1, true, CURRENT_DATE, 'BCC', true),
  (gen_random_uuid(), 'USD', 'Dollar US', '$', 2850, false, CURRENT_DATE, 'BCC', true),
  (gen_random_uuid(), 'EUR', 'Euro', '€', 3100, false, CURRENT_DATE, 'BCC', true),
  (gen_random_uuid(), 'GBP', 'Livre Sterling', '£', 3600, false, CURRENT_DATE, 'BCC', true),
  (gen_random_uuid(), 'CNY', 'Yuan Chinois', '¥', 395, false, CURRENT_DATE, 'BCC', true);