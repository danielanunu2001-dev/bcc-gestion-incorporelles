// backend/scripts/importFrontendData.js
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Anunudaniel2001',
    database: process.env.DB_NAME || 'bcc_gestion',
});

// ============================================
// DONNÉES FRONTEND (ADAPTÉES AUX COLONNES RÉELLES)
// ============================================

// 1. Catégories d'amortissement (table categories_amortissement)
const categories = [
    { code_categorie: 'LOG', nom_categorie: 'Logiciels', description: 'Logiciels et systèmes d\'information', duree_vie_ans: 3, mode_amortissement_defaut: 'lineaire', taux_amortissement: 33.33, actif: true, compte_comptable_defaut: '205' },
    { code_categorie: 'MAT', nom_categorie: 'Matériel informatique', description: 'Ordinateurs, serveurs, équipements réseau', duree_vie_ans: 4, mode_amortissement_defaut: 'lineaire', taux_amortissement: 25.00, actif: true, compte_comptable_defaut: '215' },
    { code_categorie: 'BAT', nom_categorie: 'Bâtiments', description: 'Bâtiments institutionnels et infrastructures', duree_vie_ans: 50, mode_amortissement_defaut: 'lineaire', taux_amortissement: 2.00, actif: true, compte_comptable_defaut: '211' },
    { code_categorie: 'SEC', nom_categorie: 'Équipements de sécurité', description: 'Matériel de sécurité monétaire et convoyage', duree_vie_ans: 10, mode_amortissement_defaut: 'lineaire', taux_amortissement: 10.00, actif: true, compte_comptable_defaut: '215' },
    { code_categorie: 'VEH', nom_categorie: 'Véhicules', description: 'Véhicules de service', duree_vie_ans: 5, mode_amortissement_defaut: 'lineaire', taux_amortissement: 20.00, actif: true, compte_comptable_defaut: '218' }
];

// 2. Documents (table documents) – colonnes : nom_fichier, type_fichier, taille_fichier, description, chemin_fichier
const documentsMock = [
    { nom_fichier: 'Rapport_Annuel_BCC_2024.pdf', type_fichier: 'application/pdf', taille_fichier: 2_800_000, description: "Rapport d'activité annuel de la Banque Centrale du Congo - Exercice 2024", chemin_fichier: '/uploads/archives/BCC_RA_2024_001.pdf' },
    { nom_fichier: 'Circulaire_BCC_2025-002_Politique_Monetaire.pdf', type_fichier: 'application/pdf', taille_fichier: 1_200_000, description: "Circulaire relative à la politique monétaire pour l'année 2025", chemin_fichier: '/uploads/archives/BCC_CIR_2025_002.pdf' },
    { nom_fichier: 'Rapport_Stabilite_Financiere_2023.pdf', type_fichier: 'application/pdf', taille_fichier: 4_500_000, description: 'Rapport sur la stabilité financière en République Démocratique du Congo', chemin_fichier: '/uploads/archives/BCC_RSF_2023_001.pdf' },
    { nom_fichier: 'Instruction_BCC_2024-005_Comptabilite_Immobilisations.pdf', type_fichier: 'application/pdf', taille_fichier: 1_500_000, description: 'Instruction relative à la comptabilisation des immobilisations', chemin_fichier: '/uploads/archives/BCC_INS_2024_005.pdf' },
    { nom_fichier: 'Note_Information_BCC_2024-008_Amortissements.pdf', type_fichier: 'application/pdf', taille_fichier: 900_000, description: "Note d'information sur les nouvelles règles d'amortissement", chemin_fichier: '/uploads/archives/BCC_NI_2024_008.pdf' },
    { nom_fichier: 'Plan_Comptable_BCC_2024.xlsx', type_fichier: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', taille_fichier: 3_200_000, description: 'Plan comptable actualisé de la Banque Centrale du Congo', chemin_fichier: '/uploads/archives/BCC_PC_2024_001.xlsx' },
    { nom_fichier: 'Decision_BCC_2025-001_Taux_Directeur.pdf', type_fichier: 'application/pdf', taille_fichier: 600_000, description: 'Décision relative au taux directeur pour le premier trimestre 2025', chemin_fichier: '/uploads/archives/BCC_DEC_2025_001.pdf' },
    { nom_fichier: 'Etat_Immobilisations_BCC_2024.xlsx', type_fichier: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', taille_fichier: 2_100_000, description: 'État détaillé des immobilisations de la Banque Centrale du Congo', chemin_fichier: '/uploads/archives/BCC_EI_2024_003.xlsx' }
];

// 3. Logs d'audit (table audit_logs) – colonnes : action (enum), table_name, record_id, old_data, new_data, ip_address, created_at, user_id
// On utilise les données mock en les transformant pour correspondre
const auditLogsMock = [
    { action: 'CONNEXION', table_name: 'users', record_id: null, old_data: null, new_data: { details: 'Connexion réussie - Gouverneur' }, ip_address: '10.0.1.45', created_at: '2025-03-27 08:30:45+00', user_id: null },
    { action: 'CONSULTATION', table_name: 'reserves_change', record_id: null, old_data: null, new_data: { details: 'Consultation des réserves de change - Solde: 2.450.000.000.000 CDF' }, ip_address: '10.0.1.78', created_at: '2025-03-27 09:15:22+00', user_id: null },
    { action: 'MODIFICATION', table_name: 'operations_monetaires', record_id: null, old_data: null, new_data: { details: 'Ajustement taux directeur: 11.5% → 11.75%' }, ip_address: '10.0.1.92', created_at: '2025-03-27 10:00:10+00', user_id: null },
    { action: 'CREATION', table_name: 'immobilisations', record_id: null, old_data: null, new_data: { details: 'Création immobilisation: Bâtiment siège - 45.000.000.000 CDF' }, ip_address: '10.0.1.34', created_at: '2025-03-26 14:20:33+00', user_id: null },
    { action: 'CONSULTATION', table_name: 'rapports', record_id: null, old_data: null, new_data: { details: 'Export rapport annuel 2024 - Format PDF' }, ip_address: '10.0.1.67', created_at: '2025-03-26 11:45:17+00', user_id: null },
    { action: 'SUPPRESSION', table_name: 'utilisateurs', record_id: null, old_data: null, new_data: { details: 'Désactivation compte utilisateur: ancien_stagiaire' }, ip_address: '10.0.1.10', created_at: '2025-03-25 16:30:02+00', user_id: null },
    { action: 'MODIFICATION', table_name: 'reserves_change', record_id: null, old_data: null, new_data: { details: 'Mise à jour réserves or: +150.000.000 USD' }, ip_address: '10.0.1.88', created_at: '2025-03-25 09:10:55+00', user_id: null },
    { action: 'VALIDATION', table_name: 'politique_monetaire', record_id: null, old_data: null, new_data: { details: 'Validation rapport de politique monétaire T1 2025' }, ip_address: '10.0.1.45', created_at: '2025-03-24 15:20:44+00', user_id: null },
    { action: 'CLOTURE', table_name: 'exercices', record_id: null, old_data: null, new_data: { details: 'Clôture exercice 2024 - Résultat: 28.000.000.000 CDF' }, ip_address: '10.0.1.34', created_at: '2025-03-24 11:05:33+00', user_id: null },
    { action: 'CONNEXION_ECHOUEE', table_name: 'users', record_id: null, old_data: null, new_data: { details: 'Tentative de connexion échouée - IP: 192.168.1.100' }, ip_address: '192.168.1.100', created_at: '2025-03-23 08:45:12+00', user_id: null },
    { action: 'EXPORT', table_name: 'etats_financiers', record_id: null, old_data: null, new_data: { details: 'Export bilan 2024 - Format Excel' }, ip_address: '10.0.1.78', created_at: '2025-03-22 14:30:28+00', user_id: null },
    { action: 'CREATION', table_name: 'operations_monetaires', record_id: null, old_data: null, new_data: { details: 'Nouvelle opération de refinancement: 50.000.000.000 CDF' }, ip_address: '10.0.1.92', created_at: '2025-03-21 11:15:45+00', user_id: null }
];

// ============================================
// FONCTIONS D'IMPORT
// ============================================

async function importCategories() {
    console.log('📊 Importation des catégories d\'amortissement...');
    for (const cat of categories) {
        try {
            await pool.query(
                `INSERT INTO categories_amortissement 
                 (code_categorie, nom_categorie, description, duree_vie_ans, mode_amortissement_defaut, taux_amortissement, actif, compte_comptable_defaut)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (code_categorie) DO UPDATE SET
                     nom_categorie = EXCLUDED.nom_categorie,
                     description = EXCLUDED.description,
                     duree_vie_ans = EXCLUDED.duree_vie_ans,
                     mode_amortissement_defaut = EXCLUDED.mode_amortissement_defaut,
                     taux_amortissement = EXCLUDED.taux_amortissement,
                     actif = EXCLUDED.actif,
                     compte_comptable_defaut = EXCLUDED.compte_comptable_defaut`,
                [cat.code_categorie, cat.nom_categorie, cat.description, cat.duree_vie_ans, cat.mode_amortissement_defaut, cat.taux_amortissement, cat.actif, cat.compte_comptable_defaut]
            );
            console.log(`   ✅ ${cat.code_categorie} - ${cat.nom_categorie}`);
        } catch (err) {
            console.error(`   ❌ ${cat.code_categorie}:`, err.message);
        }
    }
    console.log(`✅ ${categories.length} catégories importées.\n`);
}

async function importDocuments() {
    console.log('📁 Importation des documents...');
    for (const doc of documentsMock) {
        try {
            await pool.query(
                `INSERT INTO documents (nom_fichier, type_fichier, taille_fichier, description, chemin_fichier)
                 VALUES ($1, $2, $3, $4, $5)`,
                [doc.nom_fichier, doc.type_fichier, doc.taille_fichier, doc.description, doc.chemin_fichier]
            );
            console.log(`   ✅ ${doc.nom_fichier}`);
        } catch (err) {
            console.error(`   ❌ ${doc.nom_fichier}:`, err.message);
        }
    }
    console.log(`✅ ${documentsMock.length} documents importés.\n`);
}

async function importAuditLogs() {
    console.log('📝 Importation des logs d\'audit...');
    for (const log of auditLogsMock) {
        try {
            const createdAt = new Date(log.created_at).toISOString();
            await pool.query(
                `INSERT INTO audit_logs 
                 (action, table_name, record_id, old_data, new_data, ip_address, created_at, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [log.action, log.table_name, log.record_id, log.old_data, log.new_data, log.ip_address, createdAt, log.user_id]
            );
        } catch (err) {
            console.error(`   ❌ ${log.action} à ${log.created_at}:`, err.message);
        }
    }
    console.log(`✅ ${auditLogsMock.length} logs importés.\n`);
}

// ============================================
// GÉNÉRATION DE DONNÉES MASSIVES
// ============================================

async function generateMassiveAuditLogs() {
    const total = 10000;
    console.log(`📝 Génération de ${total.toLocaleString()} logs d'audit supplémentaires...`);
    
    const actions = ['CONNEXION', 'CONSULTATION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'VALIDATION', 'EXPORT', 'CLOTURE'];
    const tables = ['users', 'actifs', 'contrats', 'documents', 'categories_amortissement', 'amortissements', 'anomalies'];
    const ips = ['10.0.1.45', '10.0.1.78', '10.0.1.92', '10.0.1.34', '10.0.1.67', '10.0.1.10', '10.0.1.88', '192.168.1.100', '10.0.1.120', '10.0.1.55'];
    
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    
    let inserted = 0;
    const batchSize = 500;
    
    for (let i = 0; i < total; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const action = actions[Math.floor(Math.random() * actions.length)];
        const table = tables[Math.floor(Math.random() * tables.length)];
        const ip = ips[Math.floor(Math.random() * ips.length)];
        const details = { details: `Opération ${action.toLowerCase()} sur la table ${table}` };
        
        try {
            await pool.query(
                `INSERT INTO audit_logs (action, table_name, old_data, new_data, ip_address, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [action, table, null, details, ip, randomDate]
            );
            inserted++;
        } catch (err) {
            // Ignorer silencieusement
        }
        
        if (inserted % 1000 === 0 && inserted > 0) {
            console.log(`   ✅ ${inserted.toLocaleString()}/${total.toLocaleString()} logs générés`);
        }
    }
    console.log(`✅ ${inserted.toLocaleString()} logs générés.\n`);
}

async function generateMassiveDocuments() {
    const total = 5000;
    console.log(`📁 Génération de ${total.toLocaleString()} documents supplémentaires...`);
    
    const types = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'application/msword'];
    const categories = ['rapport', 'circulaire', 'instruction', 'decision', 'etat'];
    
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    
    let inserted = 0;
    
    for (let i = 0; i < total; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const type = types[Math.floor(Math.random() * types.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const year = randomDate.getFullYear();
        const month = (randomDate.getMonth() + 1).toString().padStart(2, '0');
        const ext = type.includes('pdf') ? 'pdf' : (type.includes('sheet') ? 'xlsx' : (type.includes('image') ? 'jpg' : 'doc'));
        
        const filename = `${category.toUpperCase()}_BCC_${year}_${month}_${String(i + 1).padStart(4, '0')}.${ext}`;
        const path = `/uploads/archives/${filename}`;
        const size = Math.floor(Math.random() * 5_000_000) + 500_000; // entre 500KB et 5.5MB
        const description = `${category.charAt(0).toUpperCase() + category.slice(1)} officiel de la BCC pour ${month}/${year}`;
        
        try {
            await pool.query(
                `INSERT INTO documents (nom_fichier, type_fichier, taille_fichier, description, chemin_fichier, date_upload)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [filename, type, size, description, path, randomDate]
            );
            inserted++;
        } catch (err) {
            // Ignorer
        }
        
        if (inserted % 500 === 0 && inserted > 0) {
            console.log(`   ✅ ${inserted.toLocaleString()}/${total.toLocaleString()} documents générés`);
        }
    }
    console.log(`✅ ${inserted.toLocaleString()} documents générés.\n`);
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🚀 Démarrage de l\'import des données frontend...\n');
    console.log('📅 Date de début:', new Date().toLocaleString());
    console.log('');
    
    try {
        // Test de connexion
        await pool.query('SELECT 1');
        console.log('✅ Connexion à PostgreSQL établie\n');
        
        // Importer les données de base
        await importCategories();
        await importDocuments();
        await importAuditLogs();
        
        // Générer des données massives
        await generateMassiveAuditLogs();
        await generateMassiveDocuments();
        
        // Afficher un résumé final
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM categories_amortissement) as categories,
                (SELECT COUNT(*) FROM documents) as documents,
                (SELECT COUNT(*) FROM audit_logs) as audits
        `);
        
        console.log('\n🎉 Import terminé avec succès !');
        console.log('\n📈 STATISTIQUES FINALES:');
        console.log(`   📊 Catégories d\'amortissement : ${stats.rows[0].categories}`);
        console.log(`   📁 Documents : ${stats.rows[0].documents.toLocaleString()}`);
        console.log(`   📝 Logs d\'audit : ${stats.rows[0].audits.toLocaleString()}`);
        
    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermée');
    }
}

main();