// backend/scripts/generateMissingFactures.js
const { sequelize } = require('../src/config/database');
const { Contrat, Actif, User } = require('../src/models');
const { genererFactureContrat } = require('../src/services/contratFactureService');

async function generateMissingFactures() {
  try {
    console.log('🔍 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion établie\n');

    // Récupérer tous les contrats sans facture
    const contrats = await Contrat.findAll({
      where: {
        facture_pdf: null  // ou [Op.or]: [{ facture_pdf: null }, { facture_pdf: '' }]
      },
      include: [{ model: Actif, as: 'Actif' }]
    });

    console.log(`📦 ${contrats.length} contrat(s) sans facture trouvé(s)\n`);

    if (contrats.length === 0) {
      console.log('✅ Tous les contrats ont déjà une facture.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contrat of contrats) {
      console.log(`📄 Traitement du contrat ${contrat.numero_contrat}...`);
      
      try {
        // Créer un utilisateur système pour l'audit
        const systemUser = await User.findOne({ where: { email: 'system@bcc.cd' } });
        const userId = systemUser ? systemUser.id : null;
        
        const facturePath = await genererFactureContrat(contrat, { id: userId, ip: '127.0.0.1' });
        await contrat.update({ facture_pdf: facturePath });
        
        console.log(`   ✅ Facture générée : ${facturePath}\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Erreur pour ${contrat.numero_contrat}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n=== RÉSUMÉ ===');
    console.log(`✅ Factures générées : ${successCount}`);
    console.log(`❌ Échecs : ${errorCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
}

generateMissingFactures();