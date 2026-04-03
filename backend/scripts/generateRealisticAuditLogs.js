// backend/scripts/generateRealisticAuditLogs.js
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
// LISTE DES ACTIONS RÉELLES POSSIBLES DANS L'APPLICATION
// ============================================

const realActions = [
    { action: 'CONNEXION', table: 'users', description: 'Connexion à l\'application' },
    { action: 'CONSULTATION', table: 'actifs', description: 'Consultation de la liste des actifs' },
    { action: 'CONSULTATION', table: 'contrats', description: 'Consultation des contrats' },
    { action: 'CONSULTATION', table: 'documents', description: 'Consultation de l\'archive légale' },
    { action: 'CREATION', table: 'actifs', description: 'Création d\'un nouvel actif' },
    { action: 'CREATION', table: 'contrats', description: 'Création d\'un nouveau contrat' },
    { action: 'CREATION', table: 'documents', description: 'Upload d\'un document' },
    { action: 'MODIFICATION', table: 'actifs', description: 'Modification d\'un actif' },
    { action: 'MODIFICATION', table: 'contrats', description: 'Modification d\'un contrat' },
    { action: 'SUPPRESSION', table: 'documents', description: 'Suppression d\'un document' },
    { action: 'EXPORT', table: 'rapports', description: 'Export d\'un rapport' },
    { action: 'VALIDATION', table: 'amortissements', description: 'Validation d\'un amortissement' }
];

// Récupérer les utilisateurs réels
async function getRealUsers() {
    const result = await pool.query('SELECT id, email FROM users');
    return result.rows;
}

// Générer des logs basés sur des actions réelles
async function generateRealisticLogs(count = 10000) {
    console.log(`🚀 Génération de ${count} logs d'audit basés sur des actions réelles...`);

    const users = await getRealUsers();
    if (users.length === 0) {
        console.error('❌ Aucun utilisateur trouvé. Veuillez d\'abord importer des utilisateurs.');
        return;
    }

    const ips = ['10.0.1.45', '10.0.1.78', '10.0.1.92', '10.0.1.34', '10.0.1.67', '10.0.1.10', '10.0.1.88', '192.168.1.100'];
    const startDate = new Date('2024-01-01');
    const endDate = new Date();

    let inserted = 0;
    const batchSize = 1000;

    for (let i = 0; i < count; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const actionData = realActions[Math.floor(Math.random() * realActions.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const ip = ips[Math.floor(Math.random() * ips.length)];
        const recordId = uuidv4(); // ID fictif mais cohérent

        await pool.query(
            `INSERT INTO audit_logs (id, action, table_name, record_id, new_data, ip_address, created_at, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                uuidv4(),
                actionData.action,
                actionData.table,
                recordId,
                JSON.stringify({ details: actionData.description, timestamp: randomDate.toISOString() }),
                ip,
                randomDate,
                user.id
            ]
        );

        inserted++;
        if (inserted % 1000 === 0) {
            console.log(`   ✅ ${inserted}/${count} logs générés`);
        }
    }
    console.log(`✅ ${count} logs d'audit générés à partir d'actions réelles.`);
}

async function main() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connexion à PostgreSQL établie\n');

        // Afficher le nombre de logs existants
        const existingCount = await pool.query('SELECT COUNT(*) FROM audit_logs');
        console.log(`📊 Logs existants : ${existingCount.rows[0].count}\n`);

        // Demander confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question('⚠️  Voulez-vous ajouter des logs d\'audit ? (oui/non) ', resolve);
        });

        if (answer.toLowerCase() === 'oui') {
            await generateRealisticLogs(50000); // 50 000 logs
        } else {
            console.log('❌ Opération annulée.');
        }
        
        rl.close();

        // Afficher le nouveau total
        const newCount = await pool.query('SELECT COUNT(*) FROM audit_logs');
        console.log(`\n🎉 Total des logs d'audit : ${newCount.rows[0].count}`);
        
    } catch (err) {
        console.error('❌ Erreur :', err);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermée');
    }
}

main();