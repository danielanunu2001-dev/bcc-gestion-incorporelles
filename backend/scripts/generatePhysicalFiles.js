// backend/scripts/generatePhysicalFiles.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Anunudaniel2001',
    database: process.env.DB_NAME || 'bcc_gestion',
});

// Fonction pour générer un PDF de démonstration
const generatePDFContent = (document) => {
    const date = new Date(document.date_upload).toLocaleDateString('fr-FR');
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
<< /Length 800 >>
stream
BT
/F1 24 Tf
100 750 Td
(BANQUE CENTRALE DU CONGO) Tj
/F1 18 Tf
0 -50 Td
(Document Officiel) Tj
/F1 14 Tf
0 -40 Td
(Titre: ${document.nom_fichier}) Tj
/F1 12 Tf
0 -30 Td
(Reference: ${document.id}) Tj
0 -25 Td
(Date: ${date}) Tj
0 -25 Td
(Description: ${document.description || 'Document officiel de la BCC'}) Tj
0 -50 Td
(Ce document fait partie des archives legales de la) Tj
0 -20 Td
(Banque Centrale du Congo.) Tj
0 -40 Td
(Il est conforme aux normes et reglementations en vigueur.) Tj
0 -80 Td
(Document genere automatiquement par le systeme d'archivage) Tj
0 -20 Td
(Banque Centrale du Congo - Tous droits reserves) Tj
0 -30 Td
(www.bcc.cd) Tj
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
820
%%EOF
`;
};

// Fonction pour générer un fichier Excel de démonstration
const generateExcelContent = (document) => {
    const date = new Date(document.date_upload).toLocaleDateString('fr-FR');
    return `Banque Centrale du Congo - Document Officiel
================================================================================

Document: ${document.nom_fichier}
Reference: ${document.id}
Date: ${date}
Description: ${document.description || 'Document officiel de la BCC'}

--------------------------------------------------------------------------------
INFORMATIONS DETAILLEES
--------------------------------------------------------------------------------

Ce document fait partie des archives legales de la Banque Centrale du Congo.
Il est conforme aux normes et reglementations en vigueur.

Type de document: ${document.type_fichier || 'Document officiel'}
Date d'archivage: ${new Date(document.date_upload).toLocaleString('fr-FR')}

--------------------------------------------------------------------------------
Ce document est genere automatiquement par le systeme d'archivage de la BCC.
Banque Centrale du Congo - Tous droits reserves
www.bcc.cd
`;
};

// Fonction pour générer un fichier Word de démonstration
const generateWordContent = (document) => {
    const date = new Date(document.date_upload).toLocaleDateString('fr-FR');
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${document.nom_fichier}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { margin: 30px 0; }
        .info-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #8b5cf6; margin: 20px 0; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>BANQUE CENTRALE DU CONGO</h1>
        <h2>Document Officiel - Archives Legales</h2>
    </div>
    
    <div class="content">
        <table>
            <tr><th width="30%">Document</th><td>${document.nom_fichier}</td></tr>
            <tr><th>Reference</th><td>${document.id}</td></tr>
            <tr><th>Date d'archivage</th><td>${date}</td></tr>
            <tr><th>Description</th><td>${document.description || 'Document officiel de la Banque Centrale du Congo'}</td></tr>
        </table>
        
        <div class="info-box">
            <strong>📄 Information importante</strong><br>
            Ce document fait partie integrante des archives legales de la Banque Centrale du Congo.
            Il est conserve conformement aux dispositions legales et reglementaires en vigueur.
        </div>
        
        <h3>Contenu du document</h3>
        <p>Ce document officiel atteste de la conformite des operations et des transactions effectuees dans le cadre des missions de la Banque Centrale du Congo.</p>
        <p>Il est valable et opposable aux tiers dans les conditions prevues par la reglementation.</p>
    </div>
    
    <div class="footer">
        <p>Document genere automatiquement par le systeme d'archivage de la BCC</p>
        <p>Banque Centrale du Congo - Tous droits reserves</p>
        <p>www.bcc.cd</p>
    </div>
</body>
</html>`;
};

// Fonction principale
async function generatePhysicalFiles() {
    console.log('🚀 Démarrage de la generation des fichiers physiques...\n');
    
    try {
        // Récupérer tous les documents
        const result = await pool.query('SELECT id, nom_fichier, type_fichier, description, date_upload FROM documents');
        const documents = result.rows;
        
        console.log(`📁 ${documents.length} documents trouves\n`);
        
        // Créer le dossier uploads s'il n'existe pas
        const uploadsDir = path.join(__dirname, '../uploads');
        const archivesDir = path.join(uploadsDir, 'archives');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        if (!fs.existsSync(archivesDir)) {
            fs.mkdirSync(archivesDir, { recursive: true });
        }
        
        let created = 0;
        let errors = 0;
        
        for (const doc of documents) {
            try {
                // Créer un sous-dossier par année
                const year = new Date(doc.date_upload).getFullYear();
                const yearDir = path.join(archivesDir, year.toString());
                if (!fs.existsSync(yearDir)) {
                    fs.mkdirSync(yearDir, { recursive: true });
                }
                
                // Nom du fichier
                const fileName = doc.nom_fichier;
                const filePath = path.join(yearDir, fileName);
                
                // Déterminer le contenu selon le type de fichier
                let content = '';
                let isBinary = false;
                
                if (fileName.endsWith('.pdf')) {
                    content = generatePDFContent(doc);
                    isBinary = true;
                } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    content = generateExcelContent(doc);
                } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                    content = generateWordContent(doc);
                } else {
                    content = generateExcelContent(doc);
                }
                
                // Ecrire le fichier
                if (isBinary) {
                    fs.writeFileSync(filePath, content, 'binary');
                } else {
                    fs.writeFileSync(filePath, content, 'utf8');
                }
                
                // Mettre à jour le chemin dans la base de données
                const relativePath = `/uploads/archives/${year}/${fileName}`;
                await pool.query(
                    'UPDATE documents SET chemin_fichier = $1 WHERE id = $2',
                    [relativePath, doc.id]
                );
                
                created++;
                console.log(`✅ ${created}/${documents.length} - ${fileName}`);
                
            } catch (err) {
                errors++;
                console.error(`❌ Erreur pour ${doc.nom_fichier}:`, err.message);
            }
        }
        
        console.log('\n🎉 Generation terminee !');
        console.log(`📁 Fichiers crees: ${created}`);
        console.log(`❌ Erreurs: ${errors}`);
        console.log(`📂 Dossier: ${archivesDir}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermee');
    }
}

// Executer le script
generatePhysicalFiles();