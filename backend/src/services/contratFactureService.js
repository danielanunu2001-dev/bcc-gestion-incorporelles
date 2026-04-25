// backend/src/services/contratFactureService.js

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');

// ✅ Fonction de formatage de montant sans aucun slash ni espace parasite
const formaterMontant = (montant) => {
  if (!montant && montant !== 0) return '0';
  const valeur = Math.round(parseFloat(montant) || 0);
  // Formatage avec séparateur d'espace INSÉCABLE (pas d'espace standard)
  // On utilise toString() et on ajoute des espaces tous les 3 chiffres
  const chaine = valeur.toString();
  let resultat = '';
  for (let i = chaine.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) resultat = ' ' + resultat;
    resultat = chaine[i] + resultat;
  }
  return resultat;
};

// ✅ Formatage des dates
const formaterDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formaterHeure = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// Conversion en lettres
const montantEnLettres = (montant) => {
  const unite = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaine = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  if (montant === 0) return 'zéro';
  let result = '';
  let valeur = Math.round(montant);
  if (valeur >= 1000000) {
    const millions = Math.floor(valeur / 1000000);
    result += montantEnLettres(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
    valeur %= 1000000;
  }
  if (valeur >= 1000) {
    const milliers = Math.floor(valeur / 1000);
    if (milliers > 1) result += montantEnLettres(milliers);
    result += ' mille ';
    valeur %= 1000;
  }
  if (valeur >= 100) {
    const cent = Math.floor(valeur / 100);
    if (cent > 1) result += unite[cent] + ' ';
    result += 'cent ';
    valeur %= 100;
  }
  if (valeur > 0) {
    if (valeur < 10) result += unite[valeur];
    else if (valeur < 20) {
      const exceptions = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      result += exceptions[valeur - 10];
    } else {
      const d = Math.floor(valeur / 10);
      const u = valeur % 10;
      result += dizaine[d];
      if (u === 1 && d !== 8) result += ' et ';
      else if (u > 0) result += '-';
      if (u > 0) result += (u === 1 && d === 8) ? 'un' : unite[u];
    }
  }
  return result.trim();
};

const genererFactureContrat = async (contrat, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadDir = path.join(__dirname, '../../uploads/factures_contrats');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = `facture_contrat_${contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const relativePath = `/uploads/factures_contrats/${fileName}`;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Données financières
      const montantHT = Math.round(parseFloat(contrat.montant) || 0);
      const tva = Math.round(montantHT * 0.16);
      const montantTTC = montantHT + tva;

      // Formater les montants avec la fonction robuste
      const htFormate = formaterMontant(montantHT);
      const tvaFormate = formaterMontant(tva);
      const ttcFormate = formaterMontant(montantTTC);
      const montantLettres = montantEnLettres(montantTTC);

      // Logo
      const logoPath = path.join(__dirname, '../../public/images/logo-bcc.png');
      if (fs.existsSync(logoPath)) doc.image(logoPath, 50, 45, { width: 80 });
      else doc.fontSize(12).fillColor('#1e3a8a').text('BANQUE CENTRALE DU CONGO', 50, 50);

      doc.fontSize(18).fillColor('#10b981').text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(9).fillColor('#475569');
      doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
      doc.text(`Date d'émission : ${formaterDate(new Date())}`, { align: 'right' });
      doc.text(`Généré par : ${user?.full_name || 'Système'}`, { align: 'right' });
      doc.moveDown();

      doc.fontSize(9).fillColor('#1e3a8a');
      doc.text('BANQUE CENTRALE DU CONGO', 50, doc.y);
      doc.fontSize(8).fillColor('#666');
      doc.text('Direction des Immobilisations', 50, doc.y);
      doc.text('Boulevard Colonel Tshatshi, Kinshasa/Gombe', 50, doc.y);
      doc.text('Tél : +243 123 456 789', 50, doc.y);
      doc.text('Email : immobilisations@bcc.cd', 50, doc.y);
      doc.moveDown();

      doc.fontSize(10).fillColor('#0f172a').text('DÉTAILS DU CONTRAT', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#334155');
      doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
      doc.text(`Fournisseur : ${contrat.fournisseur}`);
      doc.text(`Type : ${contrat.type || 'Licence'}`);
      doc.text(`Période : ${formaterDate(contrat.date_debut)} → ${formaterDate(contrat.date_fin)}`);
      doc.moveDown();

      doc.fontSize(10).fillColor('#0f172a').text('DÉTAILS FINANCIERS', { underline: true });
      doc.moveDown(0.5);

      const col1 = 50, col2 = 350;
      doc.fontSize(9).fillColor('#475569');
      doc.text('Description', col1, doc.y);
      doc.text('Montant (CDF)', col2, doc.y, { align: 'right' });
      doc.moveDown();

      doc.fontSize(9).fillColor('#334155');
      doc.text('Montant HT', col1, doc.y);
      doc.text(htFormate, col2, doc.y, { align: 'right' });
      doc.moveDown();

      doc.text('TVA (16%)', col1, doc.y);
      doc.text(tvaFormate, col2, doc.y, { align: 'right' });
      doc.moveDown();

      doc.fontSize(10).fillColor('#10b981');
      doc.text('TOTAL TTC', col1, doc.y);
      doc.text(ttcFormate, col2, doc.y, { align: 'right' });
      doc.fillColor('#000');
      doc.moveDown(1.5);

      if (montantLettres) {
        doc.fontSize(8).fillColor('#64748b');
        doc.text('Arrêté à la somme de :', col1, doc.y);
        doc.fontSize(9).fillColor('#0f172a');
        doc.text(`${montantLettres} CDF`, col1, doc.y + 10);
        doc.moveDown(2);
      }

      if (contrat.description) {
        doc.fontSize(9).fillColor('#0f172a').text('DESCRIPTION DES PRESTATIONS :', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor('#666');
        doc.text(contrat.description);
        doc.moveDown();
      }

      doc.fontSize(9).fillColor('#1e3a8a').text('MODALITÉS DE PAIEMENT', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#666');
      doc.text('Virement bancaire à l\'ordre de la Banque Centrale du Congo');
      doc.text('Compte BCC N° : 001 123456789 01');
      doc.text('Banque : Banque Centrale du Congo');
      doc.text('Code SWIFT : BCCGCDKX');
      doc.moveDown();

      const pageHeight = doc.page.height;
      doc.fontSize(8).fillColor('#94a3b8');
      doc.text('Cette facture fait office de justificatif de paiement.', 50, pageHeight - 70, { align: 'center' });
      doc.text('Conformément aux dispositions du Code des marchés publics.', 50, pageHeight - 60, { align: 'center' });
      doc.text(`Générée le ${formaterDate(new Date())} à ${formaterHeure(new Date())}`, 50, pageHeight - 50, { align: 'center' });
      doc.text('www.bcc.cd', 50, pageHeight - 40, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ Facture contrat générée: ${relativePath}`);
        resolve(relativePath);
      });
      stream.on('error', reject);
    } catch (error) {
      console.error('❌ Erreur génération facture contrat:', error);
      reject(error);
    }
  });
};

module.exports = { genererFactureContrat };