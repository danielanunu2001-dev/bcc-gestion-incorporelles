// backend/src/services/contratFactureService.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');

/**
 * Génère une facture professionnelle pour un contrat
 * @param {Object} contrat - Instance du contrat
 * @param {Object} user - Utilisateur connecté (pour l'audit)
 * @returns {Promise<string>} Chemin du fichier PDF généré
 */
const genererFactureContrat = async (contrat, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier de destination s'il n'existe pas
      const uploadDir = path.join(__dirname, '../../uploads/factures_contrats');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `facture_contrat_${contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const relativePath = `/uploads/factures_contrats/${fileName}`;

      // Créer le document PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- EN-TÊTE AVEC LOGO (optionnel) ---
      try {
        const logoPath = path.join(__dirname, '../../public/images/logo-bcc.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 45, { width: 100 });
        } else {
          doc.fontSize(10).text('BANQUE CENTRALE DU CONGO', 50, 50);
        }
      } catch (err) {
        console.warn('Logo introuvable');
      }

      doc.fontSize(18)
         .fillColor('#1e3a8a')
         .text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });

      doc.moveDown();

      // --- INFORMATIONS CONTRAT ---
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

      // --- DÉTAILS DU CONTRAT ---
      doc.fontSize(12).fillColor('#1e3a8a').text('Détails du contrat', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');

      doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
      doc.text(`Fournisseur : ${contrat.fournisseur}`);
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

      // --- PIED DE PAGE ---
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666')
         .text('Cette facture fait office de justificatif de paiement.', { align: 'center' })
         .text('Conformément aux dispositions du Code des marchés publics.', { align: 'center' })
         .text(`Générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, { align: 'center' });

      // Finaliser
      doc.end();

      stream.on('finish', () => {
        resolve(relativePath);
      });

      stream.on('error', reject);
    } catch (error) {
      console.error('Erreur génération facture contrat:', error);
      reject(error);
    }
  });
};

module.exports = { genererFactureContrat };