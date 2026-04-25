// backend/scripts/regenerateFacturesFixed.js

const { sequelize, Actif, Contrat, Facture, User, Devise } = require('../src/models');
const { genererFacture } = require('../src/services/factureService');
const { genererFactureContrat } = require('../src/services/contratFactureService');

// Fonction pour s'assurer que les valeurs sont des nombres
const toNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

async function regenerateAllFactures() {
  try {
    console.log('🚀 Début de la régénération des factures...\n');

    // ========== RÉGÉNÉRATION DES FACTURES D'ACTIFS ==========
    console.log('📦 Régénération des factures d\'actifs...');
    
    const actifs = await Actif.findAll({
      include: [{ model: Devise, as: 'devise' }]
    });
    
    let actifsOk = 0;
    let actifsKo = 0;

    for (const actif of actifs) {
      try {
        console.log(`\n📄 Traitement de ${actif.code}...`);
        
        // Supprimer l'ancienne facture si elle existe
        await Facture.destroy({ where: { actif_id: actif.id } });
        
        // Déterminer la devise
        const deviseCode = actif.devise?.code || 'CDF';
        
        // Récupérer les valeurs en s'assurant que ce sont des nombres
        const montantOriginal = toNumber(actif.montant_devise);
        const coutAcquisition = toNumber(actif.cout_acquisition);
        
        let montantHT = montantOriginal;
        if (montantHT === 0 && coutAcquisition > 0) {
          montantHT = coutAcquisition;
        }
        
        // Calculer la TVA et le TTC (ADDITION NUMÉRIQUE)
        const montantTVA = Math.round(montantHT * 0.16);
        const montantTTC = montantHT + montantTVA;  // ← ADDITION NUMÉRIQUE
        const montantCDF = montantTTC;
        
        console.log(`   Montant HT: ${montantHT} ${deviseCode}`);
        console.log(`   TVA: ${montantTVA} ${deviseCode}`);
        console.log(`   TTC: ${montantHT} + ${montantTVA} = ${montantTTC} ${deviseCode}`);
        
        // Générer la nouvelle facture
        const factureData = await genererFacture(actif, { full_name: 'Système' }, deviseCode);
        
        if (!factureData || !factureData.chemin) {
          throw new Error('Échec de génération du PDF');
        }
        
        // Créer l'enregistrement en base
        const nouvelleFacture = await Facture.create({
          numero_facture: `FAC-${actif.code}-${new Date().getFullYear()}`,
          actif_id: actif.id,
          date_emission: new Date(),
          montant_ht: montantHT,
          montant_tva: montantTVA,
          montant_ttc: montantTTC,
          devise: deviseCode,
          fichier_pdf: factureData.chemin,
          created_by: actif.created_by
        });
        
        console.log(`   ✅ ${actif.code} - PDF: ${factureData.nom_fichier}`);
        console.log(`   ✅ Base: ${nouvelleFacture.id}`);
        actifsOk++;
        
      } catch (err) {
        console.error(`   ❌ Erreur pour ${actif.code}:`, err.message);
        console.error(`   Stack:`, err.stack);
        actifsKo++;
      }
    }
    
    console.log(`\n📊 Actifs: ${actifsOk} OK, ${actifsKo} KO\n`);
    
    // ========== RÉGÉNÉRATION DES FACTURES DE CONTRATS ==========
    console.log('📄 Régénération des factures de contrats...');
    
    const contrats = await Contrat.findAll();
    
    let contratsOk = 0;
    let contratsKo = 0;
    
    for (const contrat of contrats) {
      try {
        console.log(`\n📄 Traitement contrat: ${contrat.numero_contrat}...`);
        
        // Calculs
        const montantHT = toNumber(contrat.montant);
        const montantTVA = Math.round(montantHT * 0.16);
        const montantTTC = montantHT + montantTVA;  // ← ADDITION NUMÉRIQUE
        
        console.log(`   Montant HT: ${montantHT} CDF`);
        console.log(`   TVA: ${montantTVA} CDF`);
        console.log(`   TTC: ${montantHT} + ${montantTVA} = ${montantTTC} CDF`);
        
        // Régénérer la facture
        const facturePath = await genererFactureContrat(contrat, { full_name: 'Système' });
        
        if (!facturePath) {
          throw new Error('Échec de génération du PDF');
        }
        
        // Mettre à jour le contrat
        await contrat.update({ facture_pdf: facturePath });
        
        console.log(`   ✅ ${contrat.numero_contrat} - PDF: ${facturePath}`);
        contratsOk++;
      } catch (err) {
        console.error(`   ❌ Erreur pour ${contrat.numero_contrat}:`, err.message);
        contratsKo++;
      }
    }
    
    console.log(`\n📊 Contrats: ${contratsOk} OK, ${contratsKo} KO\n`);
    console.log('🎉 Régénération terminée !');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
}

// Exécuter le script
regenerateAllFactures();