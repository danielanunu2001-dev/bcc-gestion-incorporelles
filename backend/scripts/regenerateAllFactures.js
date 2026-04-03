// backend/scripts/regenerateAllFactures.js
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

const UPLOADS_DIR = path.join(__dirname, '../uploads/factures');
const TVA_RATE = 0.16;

// Fonction pour générer un PDF de facture
const genererFacturePDF = (actif, devise, montantHT, tauxChange) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    const montantTVA = montantHT * TVA_RATE;
    const montantTTC = montantHT + montantTVA;
    const montantCDF = montantHT * tauxChange;
    const montantTVACDF = montantTVA * tauxChange;
    const montantTTCCDF = montantTTC * tauxChange;
    
    // En-tête
    doc.fontSize(20).fillColor('#10b981').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#0f172a').text('FACTURE D\'ACQUISITION', { align: 'center' });
    doc.moveDown();
    
    // Informations facture
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Facture N°: ${actif.numero_facture || `FAC-${actif.code}-${new Date(actif.date_acquisition).getFullYear()}`}`, { align: 'right' });
    doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();
    
    // Informations actif
    doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Actif: ${actif.code} - ${actif.nom}`);
    doc.text(`Fournisseur: ${actif.fournisseur || 'Non spécifié'}`);
    doc.text(`Date d'acquisition: ${new Date(actif.date_acquisition).toLocaleDateString('fr-FR')}`);
    doc.moveDown();
    
    // Montants
    doc.fontSize(12).fillColor('#0f172a').text('Détails financiers', { underline: true });
    doc.moveDown(0.5);
    
    const startY = doc.y;
    const col1X = 50;
    const col2X = 350;
    
    doc.fontSize(10).fillColor('#475569');
    doc.text('Description', col1X, startY);
    doc.text('Montant', col2X, startY);
    doc.moveDown();
    
    const rowY = doc.y;
    doc.text('Montant HT', col1X, rowY);
    doc.text(`${montantHT.toLocaleString()} ${devise}`, col2X, rowY);
    doc.moveDown();
    
    doc.text(`TVA (${TVA_RATE * 100}%)`, col1X, doc.y);
    doc.text(`${montantTVA.toLocaleString()} ${devise}`, col2X, doc.y);
    doc.moveDown();
    
    doc.fontSize(12).fillColor('#10b981');
    doc.text('TOTAL TTC', col1X, doc.y);
    doc.text(`${montantTTC.toLocaleString()} ${devise}`, col2X, doc.y);
    doc.moveDown(2);
    
    // Conversion en CDF si nécessaire
    if (devise !== 'CDF') {
        doc.fontSize(10).fillColor('#64748b');
        doc.text('Conversion en Francs Congolais:', col1X, doc.y);
        doc.text(`Taux de change: 1 ${devise} = ${tauxChange.toLocaleString()} CDF`, col1X, doc.y + 15);
        doc.text(`Montant HT: ${montantCDF.toLocaleString()} CDF`, col1X, doc.y + 30);
        doc.text(`TVA: ${montantTVACDF.toLocaleString()} CDF`, col1X, doc.y + 45);
        doc.text(`TOTAL TTC: ${montantTTCCDF.toLocaleString()} CDF`, col1X, doc.y + 60);
        doc.moveDown(3);
    }
    
    // Pied de page
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Document officiel - Banque Centrale du Congo', 50, 750, { align: 'center' });
    doc.text('www.bcc.cd', 50, 765, { align: 'center' });
    
    return doc;
};

async function regenerateAllFactures() {
    console.log('🚀 Regénération de toutes les factures...\n');
    
    try {
        // Vérifier et ajouter les colonnes manquantes
        console.log('🔧 Vérification des colonnes de la table factures...');
        
        try {
            await pool.query(`ALTER TABLE factures ADD COLUMN IF NOT EXISTS devise VARCHAR(3) DEFAULT 'CDF'`);
            await pool.query(`ALTER TABLE factures ADD COLUMN IF NOT EXISTS taux_change_cdf NUMERIC(15,6)`);
            console.log('✅ Colonnes vérifiées/ajoutées');
        } catch (err) {
            console.log('⚠️ Note: Les colonnes existent probablement déjà');
        }
        
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => {
            rl.question('⚠️ Cette action va supprimer TOUTES les factures existantes et les recréer. Continuer ? (oui/non) ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() !== 'oui') {
            console.log('❌ Opération annulée.');
            return;
        }
        
        // Supprimer les factures existantes
        await pool.query('DELETE FROM factures');
        console.log('🗑️ Anciennes factures supprimées');
        
        // Créer le dossier
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        
        // Récupérer tous les actifs
        const result = await pool.query(`
            SELECT 
                a.id, 
                a.code, 
                a.nom, 
                a.date_acquisition, 
                a.cout_acquisition, 
                a.montant_devise, 
                a.devise_id,
                a.taux_change_utilisation, 
                a.numero_facture, 
                a.fournisseur,
                d.code as devise_code
            FROM actifs a
            LEFT JOIN devises d ON a.devise_id = d.id
            ORDER BY a.date_acquisition DESC
        `);
        
        const actifs = result.rows;
        console.log(`📊 ${actifs.length} actifs trouvés\n`);
        
        let created = 0;
        let errors = 0;
        
        for (const actif of actifs) {
            try {
                const devise = actif.devise_code || 'CDF';
                const montantHT = actif.montant_devise || actif.cout_acquisition;
                const tauxChange = actif.taux_change_utilisation || 1;
                
                const fileName = `facture_${actif.code}_${new Date().toISOString().split('T')[0]}.pdf`;
                const filePath = path.join(UPLOADS_DIR, fileName);
                
                console.log(`📝 Génération facture pour ${actif.code}...`);
                
                const doc = genererFacturePDF(actif, devise, montantHT, tauxChange);
                const writeStream = fs.createWriteStream(filePath);
                doc.pipe(writeStream);
                
                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                    doc.end();
                });
                
                await pool.query(`
                    INSERT INTO factures (
                        id, numero_facture, actif_id, date_emission,
                        montant_ht, montant_tva, montant_ttc,
                        devise, taux_change_cdf, fichier_pdf
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    uuidv4(),
                    actif.numero_facture || `FAC-${actif.code}-${new Date(actif.date_acquisition).getFullYear()}`,
                    actif.id,
                    new Date(),
                    montantHT,
                    montantHT * TVA_RATE,
                    montantHT * (1 + TVA_RATE),
                    devise,
                    tauxChange,
                    `/uploads/factures/${fileName}`
                ]);
                
                console.log(`   ✅ Facture générée pour ${actif.code}`);
                created++;
            } catch (err) {
                console.log(`   ❌ Erreur pour ${actif.code}:`, err.message);
                errors++;
            }
        }
        
        console.log(`\n🎉 Terminé !`);
        console.log(`   ✅ Factures générées: ${created}`);
        console.log(`   ❌ Erreurs: ${errors}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermée');
    }
}

regenerateAllFactures();