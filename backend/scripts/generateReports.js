// backend/scripts/generateReports.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const generateReport = (year, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    
    // En-tête
    doc.fontSize(20)
       .fillColor('#2563eb')
       .text('BANQUE CENTRALE DU CONGO', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(16)
       .fillColor('#000000')
       .text(`Rapport Annuel ${year}`, { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12)
       .fillColor('#333333')
       .text(`Exercice comptable ${year}`, { align: 'center' });
    
    doc.moveDown();
    doc.moveDown();
    
    // Contenu
    doc.fontSize(11)
       .fillColor('#000000')
       .text('RÉSULTATS FINANCIERS', { underline: true });
    
    doc.moveDown();
    doc.text(`• Résultat net: ${(Math.random() * 100 + 50).toFixed(2)} milliards CDF`);
    doc.text(`• Actif total: ${(Math.random() * 500 + 200).toFixed(2)} milliards CDF`);
    doc.text(`• Réserves de change: ${(Math.random() * 30 + 10).toFixed(2)} milliards CDF`);
    doc.text(`• Taux d'inflation: ${(Math.random() * 5 + 2).toFixed(1)}%`);
    
    doc.moveDown();
    doc.text('INDICATEURS CLÉS', { underline: true });
    doc.moveDown();
    doc.text(`• Croissance économique: ${(Math.random() * 4 + 1).toFixed(1)}%`);
    doc.text(`• Taux directeur: ${(Math.random() * 5 + 3).toFixed(1)}%`);
    doc.text(`• Réserves internationales: ${(Math.random() * 20 + 10).toFixed(2)} milliards USD`);
    
    doc.moveDown();
    doc.text('PERSPECTIVES', { underline: true });
    doc.moveDown();
    doc.text(`Pour l'exercice ${year + 1}, la Banque Centrale prévoit une stabilisation`);
    doc.text(`du taux de change et une maîtrise de l'inflation autour de ${(Math.random() * 3 + 1).toFixed(1)}%.`);
    
    doc.moveDown();
    doc.moveDown();
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    
    doc.end();
    
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

// Générer les rapports
const years = [2025, 2026];
const docsDir = path.join(__dirname, '../uploads/documents');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

async function generateAll() {
  for (const year of years) {
    const outputPath = path.join(docsDir, `Rapport_Annuel_BCC_${year}.pdf`);
    console.log(`📄 Génération du rapport ${year}...`);
    await generateReport(year, outputPath);
    console.log(`✅ Rapport ${year} généré: ${outputPath}`);
  }
  console.log('🎉 Tous les rapports ont été générés !');
}

generateAll().catch(console.error);