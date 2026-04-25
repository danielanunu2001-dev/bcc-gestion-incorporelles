// backend/scripts/checkFacture.js
const { sequelize, Actif, Facture } = require('../src/models');

async function checkFacture() {
  const actifId = '29646c49-f922-4316-ba45-bfaa661be986';
  
  const actif = await Actif.findByPk(actifId);
  console.log('📌 Actif:', actif ? `${actif.code} - ${actif.nom}` : 'Non trouvé');
  console.log('   - montant_devise:', actif?.montant_devise);
  console.log('   - cout_acquisition:', actif?.cout_acquisition);
  console.log('   - devise_id:', actif?.devise_id);
  
  const facture = await Facture.findOne({ where: { actif_id: actifId } });
  console.log('📄 Facture:', facture ? `Oui - ${facture.fichier_pdf}` : 'Non');
  
  process.exit(0);
}

checkFacture();