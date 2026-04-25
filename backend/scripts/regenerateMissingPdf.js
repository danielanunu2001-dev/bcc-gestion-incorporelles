// backend/scripts/regenerateMissingPdf.js
const { sequelize, Actif, Facture, Devise } = require('../src/models');
const factureService = require('../src/services/factureService');
const path = require('path');
const fs = require('fs');

async function regenerateMissingPdf() {
  const actifId = '29646c49-f922-4316-ba45-bfaa661be986';
  
  // Créer le dossier si nécessaire
  const uploadsDir = path.join(__dirname, '../src/uploads/factures');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier créé: ${uploadsDir}`);
  }
  
  const actif = await Actif.findByPk(actifId, {
    include: [{ model: Devise, as: 'devise' }]
  });
  
  if (!actif) {
    console.log('❌ Actif non trouvé');
    return;
  }
  
  console.log(`📄 Régénération PDF pour ${actif.code}`);
  console.log(`   - Chemin attendu: /uploads/factures/facture_VEH-004_2026-04-12.pdf`);
  
  // Supprimer l'ancien enregistrement facture
  await Facture.destroy({ where: { actif_id: actifId } });
  console.log(`🗑️ Ancienne facture supprimée de la base`);
  
  // Générer un nouveau PDF
  const deviseCode = actif.devise?.code || 'CDF';
  const cheminFichier = await factureService.genererFacture(actif, { id: 'system', full_name: 'System' }, deviseCode);
  
  if (!cheminFichier) {
    console.log('❌ Erreur lors de la génération du PDF');
    return;
  }
  
  const montantDevise = actif.montant_devise || actif.cout_acquisition;
  const montantTVA = montantDevise * 0.16;
  const montantTTC = montantDevise + montantTVA;
  
  const facture = await Facture.create({
    numero_facture: `FAC-${actif.code}-${new Date().getFullYear()}`,
    actif_id: actif.id,
    date_emission: actif.date_acquisition || new Date(),
    montant_ht: montantDevise,
    montant_tva: montantTVA,
    montant_ttc: montantTTC,
    devise: deviseCode,
    fichier_pdf: cheminFichier,
    created_by: 'system'
  });
  
  console.log(`✅ Nouvelle facture créée avec succès!`);
  console.log(`   - Nouveau chemin: ${cheminFichier}`);
  
  // Vérifier que le fichier existe
  let absolutePath = cheminFichier;
  if (cheminFichier.startsWith('/uploads/')) {
    absolutePath = path.join(__dirname, '../..', cheminFichier);
  } else if (!path.isAbsolute(cheminFichier)) {
    absolutePath = path.join(uploadsDir, path.basename(cheminFichier));
  }
  
  if (fs.existsSync(absolutePath)) {
    console.log(`   - Fichier existe: ✅ Oui (${absolutePath})`);
  } else {
    console.log(`   - Fichier existe: ❌ Non (${absolutePath})`);
  }
  
  process.exit(0);
}

regenerateMissingPdf();