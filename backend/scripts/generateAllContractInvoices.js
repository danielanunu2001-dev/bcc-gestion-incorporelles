// backend/scripts/generateAllContractInvoices.js
const { sequelize } = require('../src/config/database');
const { Contrat } = require('../src/models');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Configuration
const uploadDir = path.join(__dirname, '../uploads/factures_contrats');

/**
 * Génère une facture PDF pour un contrat
 */
async function genererFactureContrat(contrat) {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `facture_contrat_${contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const relativePath = `/uploads/factures_contrats/${fileName}`;

      // Créer le PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ========== GÉNÉRATION PROFESSIONNELLE ==========
      
      // En-tête
      doc.fontSize(18).fillColor('#1e3a8a').text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });
      doc.moveDown();

      // Numéro de facture et date
      doc.fontSize(10).fillColor('#000');
      doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
      doc.text(`Date d'émission : ${moment().format('DD/MM/YYYY')}`, { align: 'right' });
      doc.moveDown();

      // Coordonnées BCC
      doc.fontSize(9)
         .text('BANQUE CENTRALE DU CONGO', 50, doc.y)
         .text('Direction des Immobilisations', 50, doc.y)
         .text('Boulevard Colonel Tshatshi, Kinshasa/Gombe', 50, doc.y)
         .text('Tél : +243 123 456 789', 50, doc.y)
         .text('Email : immobilisations@bcc.cd', 50, doc.y);

      doc.moveDown();

      // Détails du contrat
      doc.fontSize(12).fillColor('#1e3a8a').text('Détails du contrat', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');

      doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
      doc.text(`Fournisseur : ${contrat.fournisseur}`);
      doc.text(`Type de contrat : ${contrat.type || 'Licence'}`);
      doc.text(`Période : ${moment(contrat.date_debut).format('DD/MM/YYYY')} → ${moment(contrat.date_fin).format('DD/MM/YYYY')}`);

      // Montants
      const montantHT = parseFloat(contrat.montant) || 0;
      const tva = montantHT * 0.16;
      const montantTTC = montantHT + tva;

      doc.moveDown();
      doc.text(`Montant HT : ${montantHT.toLocaleString()} CDF`);
      doc.text(`TVA (16%) : ${tva.toLocaleString()} CDF`);
      doc.fontSize(12).fillColor('#10b981').text(`Montant TTC : ${montantTTC.toLocaleString()} CDF`);
      doc.fillColor('#000');

      // Description
      if (contrat.description) {
        doc.moveDown();
        doc.fontSize(10).text('Description des prestations :', { underline: true });
        doc.text(contrat.description);
      }

      // Pied de page
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666')
         .text('Cette facture fait office de justificatif de paiement.', { align: 'center' })
         .text('Conformément aux dispositions du Code des marchés publics.', { align: 'center' })
         .text(`Générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`      ✅ PDF créé: ${fileName}`);
        resolve(relativePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

async function generateAllContractInvoices() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // Récupérer TOUS les contrats
    const contrats = await Contrat.findAll({
      order: [['created_at', 'DESC']]
    });

    console.log(`📦 ${contrats.length} contrat(s) trouvé(s) en base\n`);

    if (contrats.length === 0) {
      console.log('Aucun contrat trouvé.');
      process.exit(0);
    }

    // Créer le dossier des factures
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Dossier créé: ${uploadDir}\n`);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contrat of contrats) {
      try {
        console.log(`📄 Traitement du contrat ${contrat.numero_contrat}...`);
        
        const facturePath = await genererFactureContrat(contrat);
        await contrat.update({ facture_pdf: facturePath });
        
        console.log(`   ✅ Facture générée : ${facturePath}\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Erreur pour ${contrat.numero_contrat}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n=== RÉSUMÉ FINAL ===');
    console.log(`✅ Factures générées avec succès : ${successCount}`);
    console.log(`❌ Échecs : ${errorCount}`);
    console.log(`📁 Dossier des factures : ${uploadDir}\n`);

    // Afficher la liste des contrats avec leurs factures
    console.log('📋 LISTE DES CONTRATS AVEC FACTURES:');
    const contratsMisAJour = await Contrat.findAll({
      attributes: ['id', 'numero_contrat', 'facture_pdf'],
      order: [['created_at', 'DESC']]
    });
    
    contratsMisAJour.forEach(c => {
      console.log(`   - ${c.numero_contrat} : ${c.facture_pdf || 'SANS FACTURE'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
}

// Exécuter le script
generateAllContractInvoices();