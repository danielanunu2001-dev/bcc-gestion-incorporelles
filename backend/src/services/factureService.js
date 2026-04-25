// backend/src/services/factureService.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const formatMontant = (montant, devise = 'CDF') => {
  const valeur = Math.round(Number(montant) || 0);
  const formate = valeur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formate} ${devise}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
};

const getUploadsDir = () => {
  const dir = path.join(process.cwd(), 'uploads/factures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const genererFacture = async (actif, user, deviseCode = 'CDF') => {
  return new Promise(async (resolve, reject) => {
    try {
      const facturesDir = getUploadsDir();
      const safeCode = actif.code.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `facture_${safeCode}_${Date.now()}.pdf`;
      const filePath = path.join(facturesDir, fileName);
      const relativePath = `/uploads/factures/${fileName}`;
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // ========== CALCUL SELON LA DEVISE ==========
      const montantHT = Number(actif.montant_devise) || Number(actif.cout_acquisition) || 0;
      
      let montantTVA = 0;
      let montantTTC = montantHT;
      let afficherTVA = false;
      
      // Si la devise n'est pas CDF, appliquer la TVA de 16%
      if (deviseCode !== 'CDF') {
        montantTVA = Math.round(montantHT * 0.16);
        montantTTC = montantHT + montantTVA;
        afficherTVA = true;
      }
      
      console.log('========== FACTURE GÉNÉRÉE ==========');
      console.log(`Actif: ${actif.code}`);
      console.log(`Devise: ${deviseCode}`);
      console.log(`Montant HT: ${montantHT}`);
      console.log(`TVA: ${afficherTVA ? montantTVA : 'Non applicable'}`);
      console.log(`TTC: ${montantTTC}`);
      console.log('======================================');
      
      // EN-TÊTE
      doc.fontSize(18).fillColor('#10b981').text('FACTURE D\'ACQUISITION', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(10).fillColor('#475569');
      doc.text(`N° Facture : FAC-${actif.code}-${new Date().getFullYear()}`, { align: 'right' });
      doc.text(`Date d'émission : ${formatDate(new Date())}`, { align: 'right' });
      doc.moveDown();
      
      // DÉTAILS DE L'ACTIF
      doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#334155');
      doc.text(`Actif : ${actif.code} - ${actif.nom}`);
      doc.text(`Fournisseur : ${actif.fournisseur || 'Non spécifié'}`);
      doc.text(`Date d'acquisition : ${formatDate(actif.date_acquisition)}`);
      doc.moveDown();
      
      // DÉTAILS FINANCIERS
      doc.fontSize(12).fillColor('#0f172a').text('Détails financiers', { underline: true });
      doc.moveDown(0.5);
      
      const col1X = 50;
      const col2X = 350;
      
      doc.fontSize(10).fillColor('#334155');
      doc.text('Montant HT', col1X, doc.y);
      doc.text(`${Math.round(montantHT).toLocaleString()} ${deviseCode}`, col2X, doc.y);
      doc.moveDown();
      
      // Afficher la TVA uniquement si applicable
      if (afficherTVA) {
        doc.text('TVA (16%)', col1X, doc.y);
        doc.text(`${Math.round(montantTVA).toLocaleString()} ${deviseCode}`, col2X, doc.y);
        doc.moveDown();
      }
      
      doc.fontSize(12).fillColor('#10b981');
      if (afficherTVA) {
        doc.text('TOTAL TTC', col1X, doc.y);
      } else {
        doc.text('TOTAL', col1X, doc.y);
      }
      doc.text(`${Math.round(montantTTC).toLocaleString()} ${deviseCode}`, col2X, doc.y);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ PDF généré : ${fileName}`);
        resolve({ chemin: relativePath, nom_fichier: fileName });
      });
      stream.on('error', reject);
    } catch (error) {
      console.error('❌ Erreur génération facture:', error);
      reject(error);
    }
  });
};

module.exports = { genererFacture };