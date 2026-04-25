// backend/scripts/createMissingPdfFixed.js
const { sequelize, Actif, Facture, Devise } = require('../src/models');
const factureService = require('../src/services/factureService');
const path = require('path');
const fs = require('fs');

async function createMissingPdfFixed() {
  const actifId = '29646c49-f922-4316-ba45-bfaa661be986';
  
  // Chemin CORRECT du dossier (dans backend/src/uploads/factures)
  const uploadsDir = path.join(__dirname, '../src/uploads/factures');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier créé: ${uploadsDir}`);
  }
  
  console.log(`📁 Dossier uploads: ${uploadsDir}`);
  
  const actif = await Actif.findByPk(actifId, {
    include: [{ model: Devise, as: 'devise' }]
  });
  
  if (!actif) {
    console.log('❌ Actif non trouvé');
    return;
  }
  
  console.log(`📄 Génération du PDF pour ${actif.code}`);
  
  const deviseCode = actif.devise?.code || 'CDF';
  
  // Générer le PDF
  const cheminFichier = await factureService.genererFacture(actif, { id: 'dbe3905d-82a0-4e52-b43e-5b7d84636303', full_name: 'Administrateur' }, deviseCode);
  
  if (!cheminFichier) {
    console.log('❌ Erreur lors de la génération du PDF');
    return;
  }
  
  console.log(`✅ PDF généré: ${cheminFichier}`);
  
  // Vérifier le chemin absolu CORRECT
  let absolutePath = cheminFichier;
  if (cheminFichier.startsWith('/uploads/')) {
    absolutePath = path.join(__dirname, '../src', cheminFichier);
  } else if (!path.isAbsolute(cheminFichier)) {
    absolutePath = path.join(uploadsDir, path.basename(cheminFichier));
  }
  
  console.log(`📄 Chemin absolu attendu: ${absolutePath}`);
  
  if (fs.existsSync(absolutePath)) {
    console.log(`   - Fichier existe: ✅ Oui`);
    console.log(`   - Taille: ${fs.statSync(absolutePath).size} octets`);
  } else {
    console.log(`   - Fichier existe: ❌ Non`);
    
    // Lister les fichiers dans le dossier
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`📁 Fichiers dans ${uploadsDir}:`, files);
    }
  }
  
  process.exit(0);
}

createMissingPdfFixed();