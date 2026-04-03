// backend/src/services/factureService.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Génère une facture PDF pour un actif
 * @param {Object} actif - L'actif concerné
 * @param {Object} user - L'utilisateur qui crée la facture
 * @param {string} deviseCode - Code de la devise d'origine
 * @returns {Promise<string>} - Chemin du fichier PDF généré
 */
const genererFacture = async (actif, user, deviseCode = 'CDF') => {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier factures s'il n'existe pas
      const facturesDir = path.join(__dirname, '../uploads/factures');
      if (!fs.existsSync(facturesDir)) {
        fs.mkdirSync(facturesDir, { recursive: true });
      }
      
      const fileName = `facture_${actif.code}_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(facturesDir, fileName);
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // ✅ Utiliser le montant en devise d'origine
      const montantDevise = actif.montant_devise || actif.cout_acquisition;
      const tauxChange = actif.taux_change_utilisation || 1;
      const montantTVA = montantDevise * 0.16;
      const montantTTC = montantDevise + montantTVA;
      
      // En-tête
      doc.fontSize(20).fillColor('#10b981').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).fillColor('#0f172a').text('FACTURE D\'ACQUISITION', { align: 'center' });
      doc.moveDown();
      
      // Infos facture
      doc.fontSize(10).fillColor('#475569');
      doc.text(`Facture N°: FAC-${actif.code}-${new Date().getFullYear()}`, { align: 'right' });
      doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
      doc.moveDown();
      
      // Infos actif
      doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#334155');
      doc.text(`Actif: ${actif.code} - ${actif.nom}`);
      doc.text(`Type: ${actif.type_immobilisation === 'incorporel' ? 'Incorporel' : 'Corporel'}`);
      doc.text(`Fournisseur: ${actif.fournisseur || 'Non spécifié'}`);
      doc.text(`Date d'acquisition: ${new Date(actif.date_acquisition).toLocaleDateString('fr-FR')}`);
      doc.moveDown();
      
      // ✅ Montants en devise d'origine
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
      doc.text(`${montantDevise.toLocaleString()} ${deviseCode}`, col2X, rowY);
      doc.moveDown();
      
      doc.text('TVA (16%)', col1X, doc.y);
      doc.text(`${montantTVA.toLocaleString()} ${deviseCode}`, col2X, doc.y);
      doc.moveDown();
      
      doc.fontSize(12).fillColor('#10b981');
      doc.text('TOTAL TTC', col1X, doc.y);
      doc.text(`${montantTTC.toLocaleString()} ${deviseCode}`, col2X, doc.y);
      doc.moveDown(2);
      
      // ✅ Section conversion si la devise n'est pas CDF
      if (deviseCode !== 'CDF') {
        doc.fontSize(10).fillColor('#64748b');
        doc.text('Conversion en Francs Congolais:', col1X, doc.y);
        doc.text(`Taux de change appliqué: 1 ${deviseCode} = ${tauxChange.toLocaleString()} CDF`, col1X, doc.y + 15);
        doc.text(`Montant équivalent: ${actif.cout_acquisition.toLocaleString()} CDF`, col1X, doc.y + 30);
        doc.moveDown(2);
      }
      
      // Pied de page
      doc.fontSize(8).fillColor('#94a3b8');
      doc.text('Document officiel - Banque Centrale du Congo', 50, 750, { align: 'center' });
      doc.text('www.bcc.cd', 50, 765, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(`/uploads/factures/${fileName}`);
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { genererFacture };