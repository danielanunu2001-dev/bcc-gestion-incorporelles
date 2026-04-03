// backend/scripts/generateExercicesWithPDF.js
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Paramètres de génération
const START_YEAR = 2000;
const END_YEAR = new Date().getFullYear(); // 2026
const ACTIF_ARCHIVES_CODE = 'DOC_ARCHIVES';

// Fonction pour générer un contenu PDF réaliste
function generatePDFContent(exercice) {
    const annee = exercice.annee;
    const dateFin = new Date(exercice.date_fin);
    
    const actifTotal = 800_000_000_000 + (annee - 2000) * 15_000_000_000;
    const passifTotal = actifTotal;
    const capitauxPropores = 300_000_000_000 + (annee - 2000) * 10_000_000_000;
    
    const resultat = exercice.resultat !== null ? exercice.resultat : 0;
    const produits = 70_000_000_000 + (annee - 2000) * 2_000_000_000;
    const charges = produits - resultat;
    
    const reservesChange = exercice.reserves_change !== null ? exercice.reserves_change : 2_000_000_000_000 + (annee - 2000) * 50_000_000_000;
    const operationsRefinancement = exercice.operations_refinancement !== null ? exercice.operations_refinancement : 1_500_000_000_000 + (annee - 2000) * 30_000_000_000;

    const formatNumber = (value) => {
        if (value === null || value === undefined) return 'Non disponible';
        return value.toLocaleString('fr-FR');
    };

    return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 2500 >>
stream
BT
/F1 24 Tf
100 750 Td
(BANQUE CENTRALE DU CONGO) Tj
/F1 18 Tf
0 -50 Td
(Rapport Annuel - Exercice ${annee}) Tj
/F1 12 Tf
0 -60 Td
(Le present rapport presente les resultats financiers de la Banque Centrale du Congo) Tj
0 -20 Td
(pour l'exercice clos le ${dateFin.toLocaleDateString('fr-FR')}.) Tj
0 -40 Td
(BILAN AU ${dateFin.toLocaleDateString('fr-FR')}) Tj
0 -30 Td
(ACTIF) Tj
0 -20 Td
(   - Immobilisations: ${formatNumber(actifTotal * 0.4)} CDF) Tj
0 -20 Td
(   - Stocks monetaires: ${formatNumber(actifTotal * 0.3)} CDF) Tj
0 -20 Td
(   - Creances sur l'Etat: ${formatNumber(actifTotal * 0.2)} CDF) Tj
0 -20 Td
(   - Tresorerie: ${formatNumber(actifTotal * 0.1)} CDF) Tj
0 -20 Td
(   TOTAL ACTIF: ${formatNumber(actifTotal)} CDF) Tj
0 -40 Td
(PASSIF) Tj
0 -20 Td
(   - Capitaux propres: ${formatNumber(capitauxPropores)} CDF) Tj
0 -20 Td
(   - Dettes: ${formatNumber(passifTotal - capitauxPropores)} CDF) Tj
0 -20 Td
(   TOTAL PASSIF: ${formatNumber(passifTotal)} CDF) Tj
0 -40 Td
(COMPTE DE RESULTAT) Tj
0 -20 Td
(   Produits: ${formatNumber(produits)} CDF) Tj
0 -20 Td
(   Charges: ${formatNumber(charges)} CDF) Tj
0 -20 Td
(   RESULTAT NET: ${formatNumber(resultat)} CDF) Tj
0 -40 Td
(INDICATEURS CLES) Tj
0 -20 Td
(   - Reserves de change: ${formatNumber(reservesChange)} CDF) Tj
0 -20 Td
(   - Operations de refinancement: ${formatNumber(operationsRefinancement)} CDF) Tj
0 -40 Td
(Observations: ${exercice.observations || 'Exercice cloture dans les delais reglementaires.'}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000220 00000 n
0000000770 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
2500
%%EOF
`;
}

// Générer un exercice avec des valeurs réalistes
function generateExercice(annee) {
    const date_debut = `${annee}-01-01`;
    const date_fin = `${annee}-12-31`;
    const cloture = annee <= 2024;
    let date_cloture = null;
    let date_approbation = null;
    let resultat = null;
    let report_a_nouveau = null;
    let observations = '';
    let reserves_change = null;
    let operations_refinancement = null;

    if (cloture) {
        date_cloture = `${annee + 1}-03-15`;
        date_approbation = `${annee + 1}-04-30`;
        resultat = Math.round(80_000_000_000 + (Math.random() * 70_000_000_000));
        report_a_nouveau = Math.round(resultat * 0.7);
        reserves_change = Math.round(2_000_000_000_000 + (annee - 2000) * 50_000_000_000 + Math.random() * 200_000_000_000);
        operations_refinancement = Math.round(1_500_000_000_000 + (annee - 2000) * 30_000_000_000 + Math.random() * 150_000_000_000);
        observations = `Exercice ${annee} cloture avec un benefice de ${(resultat / 1e9).toFixed(2)} Mds CDF.`;
    } else if (annee === 2025) {
        date_cloture = '2026-03-15';
        date_approbation = '2026-04-30';
        resultat = Math.round(85_000_000_000 + (Math.random() * 60_000_000_000));
        report_a_nouveau = Math.round(resultat * 0.7);
        reserves_change = Math.round(3_200_000_000_000);
        operations_refinancement = Math.round(2_100_000_000_000);
        observations = `Exercice 2025 cloture avec un benefice de ${(resultat / 1e9).toFixed(2)} Mds CDF.`;
    } else if (annee === 2026) {
        observations = `Exercice 2026 en cours. Les resultats seront publies apres cloture en mars 2027.`;
    }

    return {
        annee,
        date_debut,
        date_fin,
        cloture,
        date_cloture,
        date_approbation,
        resultat,
        report_a_nouveau,
        observations,
        reserves_change,
        operations_refinancement
    };
}

async function getOrCreateArchiveActif() {
    const result = await pool.query(
        `SELECT id FROM actifs WHERE code = $1`,
        [ACTIF_ARCHIVES_CODE]
    );
    if (result.rows.length > 0) {
        return result.rows[0].id;
    }
    const newId = uuidv4();
    await pool.query(
        `INSERT INTO actifs (id, code, nom, type, date_acquisition, cout_acquisition, 
            valeur_residuelle, duree_utile_ans, mode_amortissement, description, actif, created_at, updated_at)
         VALUES ($1, $2, $3, 'autres', '2020-01-01', 0, 0, 5, 'lineaire', 
                 'Actif pour les archives legales de la BCC', true, NOW(), NOW())`,
        [newId, ACTIF_ARCHIVES_CODE, 'Archives legales BCC']
    );
    return newId;
}

async function main() {
    console.log('🚀 Generation des exercices comptables BCC avec PDF...\n');

    try {
        const actifId = await getOrCreateArchiveActif();
        console.log(`📁 Actif pour documents: ${actifId}`);

        const uploadDir = path.join(__dirname, '../uploads/exercices');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => {
            rl.question('⚠️ Voulez-vous supprimer toutes les donnees existantes dans "exercices_comptables" ? (oui/non) ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() === 'oui') {
            try {
                await pool.query('TRUNCATE TABLE exercices_comptables CASCADE');
                console.log('✅ Table exercices_comptables videe.');
            } catch (err) {
                console.log('⚠️ La table n\'existe pas encore, elle sera creee.');
            }
        }

        const exercices = [];
        for (let annee = START_YEAR; annee <= END_YEAR; annee++) {
            exercices.push(generateExercice(annee));
        }

        console.log(`\n📊 Generation de ${exercices.length} exercices (${START_YEAR} - ${END_YEAR})...\n`);

        let inserted = 0;
        for (const ex of exercices) {
            const exerciceId = uuidv4();
            
            try {
                // Insertion dans exercices_comptables
                await pool.query(
                    `INSERT INTO exercices_comptables 
                     (id, annee, date_debut, date_fin, cloture, date_cloture, date_approbation, 
                      resultat, report_a_nouveau, observations, reserves_change, operations_refinancement)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        exerciceId,
                        ex.annee,
                        ex.date_debut,
                        ex.date_fin,
                        ex.cloture,
                        ex.date_cloture,
                        ex.date_approbation,
                        ex.resultat,
                        ex.report_a_nouveau,
                        ex.observations,
                        ex.reserves_change,
                        ex.operations_refinancement
                    ]
                );
                console.log(`✅ Exercice ${ex.annee} insere (ID ${exerciceId}) - ${ex.cloture ? 'Clôturé' : 'En cours'}`);

                // Générer le PDF
                const pdfContent = generatePDFContent(ex);
                const fileName = `Rapport_Annuel_BCC_${ex.annee}.pdf`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, pdfContent, 'binary');
                console.log(`   📄 PDF genere : ${fileName}`);

                // Insérer dans la table documents
                await pool.query(
                    `INSERT INTO documents (id, actif_id, nom_fichier, type_fichier, taille_fichier, description, chemin_fichier, date_upload)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        uuidv4(),
                        actifId,
                        fileName,
                        'application/pdf',
                        Buffer.byteLength(pdfContent, 'binary'),
                        `Rapport annuel de la Banque Centrale du Congo pour l'exercice ${ex.annee}`,
                        `/uploads/exercices/${fileName}`,
                        new Date(ex.date_fin)
                    ]
                );
                inserted++;
            } catch (err) {
                console.error(`❌ Erreur pour l'exercice ${ex.annee}:`, err.message);
            }
        }

        console.log(`\n🎉 Termine ! ${inserted} exercices inseres (${START_YEAR} - ${END_YEAR}), ${inserted} PDF generes.`);

        try {
            const count = await pool.query('SELECT COUNT(*) FROM exercices_comptables');
            console.log(`📊 Total exercices dans la base : ${count.rows[0].count}`);
        } catch (err) {
            console.log('⚠️ La table exercices_comptables n\'existe pas encore');
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermee');
    }
}

main();