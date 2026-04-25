// backend/scripts/regenerate-facture.js
const { Actif, Facture } = require('../src/models');
const factureService = require('../src/services/factureService');

async function regenerate() {
  const actif = await Actif.findByPk('264698d0-d7bc-4403-ae13-5bb959b58b2f');
  if (actif) {
    // Supprimer l'ancienne facture
    await Facture.destroy({ where: { actif_id: actif.id } });
    // Générer la nouvelle
    const result = await factureService.genererFacture(actif, { full_name: 'Admin' }, 'USD');
    console.log('Nouvelle facture générée:', result);
  }
  process.exit();
}

regenerate();