// backend/scripts/recalculer_amortissements.js

const { sequelize } = require('../src/config/database');
const { Actif, Amortissement } = require('../src/models');

// ==================== FONCTION DE CALCUL DIRECTE DANS LE SCRIPT ====================
const genererPlanAmortissement = async (actif, transaction) => {
  const amortissements = [];
  
  const cout = parseFloat(actif.cout_acquisition);
  const valeurResiduelle = parseFloat(actif.valeur_residuelle || 0);
  const duree = actif.duree_utile_ans;
  const mode = actif.mode_amortissement;
  let taux = actif.taux_amortissement ? parseFloat(actif.taux_amortissement) : null;
  
  const anneeBase = new Date(actif.date_acquisition).getFullYear();
  
  let resultats = [];
  
  if (mode === 'lineaire') {
    const annuite = (cout - valeurResiduelle) / duree;
    let cumul = 0;
    let vnc = cout;
    
    for (let i = 0; i < duree; i++) {
      cumul += annuite;
      vnc = cout - cumul;
      const tauxCalc = (100 / duree).toFixed(2);
      
      resultats.push({
        exercice: anneeBase + i,
        annuite: parseFloat(annuite.toFixed(2)),
        cumul_amortissements: parseFloat(cumul.toFixed(2)),
        valeur_nette: parseFloat(vnc.toFixed(2)),
        taux: parseFloat(tauxCalc)
      });
    }
  } 
  else if (mode === 'degressif') {
    let coefficient = 1.5;
    if (duree <= 4) coefficient = 1.5;
    else if (duree <= 6) coefficient = 2;
    else coefficient = 2.5;
    
    const tauxLineaire = 100 / duree;
    let tauxDegressif = tauxLineaire * coefficient;
    
    if (taux && taux > 0) {
      tauxDegressif = taux;
    }
    
    let vnc = cout;
    let cumul = 0;
    let passageLineaire = false;
    
    for (let i = 0; i < duree; i++) {
      let annuite = 0;
      let tauxActuel = 0;
      const anneesRestantes = duree - i;
      
      if (!passageLineaire) {
        annuite = vnc * (tauxDegressif / 100);
        tauxActuel = tauxDegressif;
        
        const annuiteLineaire = (vnc - valeurResiduelle) / anneesRestantes;
        
        if (annuite <= annuiteLineaire) {
          passageLineaire = true;
          annuite = annuiteLineaire;
          tauxActuel = (100 / anneesRestantes);
        }
      }
      
      if (passageLineaire) {
        const anneesRest = duree - i;
        annuite = (vnc - valeurResiduelle) / anneesRest;
        tauxActuel = (100 / anneesRest);
      }
      
      if (vnc - annuite < valeurResiduelle) {
        annuite = vnc - valeurResiduelle;
      }
      
      cumul += annuite;
      vnc -= annuite;
      
      resultats.push({
        exercice: anneeBase + i,
        annuite: parseFloat(annuite.toFixed(2)),
        cumul_amortissements: parseFloat(cumul.toFixed(2)),
        valeur_nette: parseFloat(vnc.toFixed(2)),
        taux: parseFloat(tauxActuel.toFixed(2))
      });
      
      if (vnc <= valeurResiduelle) break;
    }
  }
  
  for (const r of resultats) {
    amortissements.push({
      actif_id: actif.id,
      exercice: r.exercice,
      annuite: r.annuite,
      cumul_amortissements: r.cumul_amortissements,
      valeur_nette: r.valeur_nette,
      taux: r.taux
    });
  }
  
  await Amortissement.bulkCreate(amortissements, { transaction });
  return amortissements;
};

// ==================== SCRIPT PRINCIPAL ====================
async function recalculerTousLesAmortissements() {
  try {
    console.log('🔄 Début du recalcul des amortissements...\n');
    
    const actifs = await Actif.findAll({ 
      where: { actif: true },
      order: [['code', 'ASC']]
    });
    
    console.log(`📊 ${actifs.length} actif(s) à traiter\n`);
    
    for (const actif of actifs) {
      console.log(`📦 Traitement de: ${actif.code} - ${actif.nom}`);
      console.log(`   - Mode: ${actif.mode_amortissement}`);
      console.log(`   - Taux: ${actif.taux_amortissement}%`);
      console.log(`   - Durée: ${actif.duree_utile_ans} ans`);
      console.log(`   - Coût: ${actif.cout_acquisition} FC`);
      
      const transaction = await sequelize.transaction();
      
      try {
        await Amortissement.destroy({ 
          where: { actif_id: actif.id },
          transaction 
        });
        
        await genererPlanAmortissement(actif, transaction);
        
        await transaction.commit();
        console.log(`   ✅ Amortissements recalculés avec succès\n`);
      } catch (error) {
        await transaction.rollback();
        console.error(`   ❌ Erreur: ${error.message}\n`);
      }
    }
    
    console.log('🎉 Recalcul terminé !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
}

recalculerTousLesAmortissements();