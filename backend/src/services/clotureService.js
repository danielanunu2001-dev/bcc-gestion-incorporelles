// backend/src/services/clotureService.js

const { sequelize, Exercice, Actif, Amortissement, AuditLog } = require('../models');
const { Op } = require('sequelize');

class ClotureService {
  
  // Vérifier si un exercice peut être clôturé
  async verifierCloture(exerciceId) {
    const exercice = await Exercice.findByPk(exerciceId);
    if (!exercice) throw new Error('Exercice non trouvé');
    
    const verifications = {
      tous_actifs_amortis: true,
      tous_contrats_valides: true,
      ecritures_equilibrees: true,
      piste_audit_complete: true
    };
    
    // Vérifier les actifs
    const actifsNonAmortis = await Actif.count({
      where: { 
        actif: true,
        [Op.or]: [
          { duree_utile_ans: { [Op.gt]: 0 } },
          { valeur_residuelle: { [Op.gt]: 0 } }
        ]
      }
    });
    
    if (actifsNonAmortis > 0) {
      verifications.tous_actifs_amortis = false;
    }
    
    // Calculer le résultat
    const resultat = await this.calculerResultatExercice(exercice);
    
    return {
      peut_cloturer: Object.values(verifications).every(v => v === true),
      verifications,
      resultat,
      recommandations: this.genererRecommandations(verifications)
    };
  }
  
  // Calculer le résultat de l'exercice
  async calculerResultatExercice(exercice) {
    // Calculer les amortissements de l'exercice
    const amortissements = await Amortissement.sum('annuite', {
      where: {
        exercice: exercice.annee
      }
    }) || 0;
    
    // Calculer les réévaluations
    // ... à implémenter selon ta structure
    
    return {
      annee: exercice.annee,
      amortissements: amortissements,
      resultat_net: 0, // À calculer selon ta logique
      report_a_nouveau: exercice.report_a_nouveau || 0
    };
  }
  
  // Générer des recommandations
  genererRecommandations(verifications) {
    const recommandations = [];
    if (!verifications.tous_actifs_amortis) {
      recommandations.push("Certains actifs ne sont pas entièrement amortis. Vérifiez les plans d'amortissement.");
    }
    if (!verifications.ecritures_equilibrees) {
      recommandations.push("Les écritures comptables ne sont pas équilibrées.");
    }
    return recommandations;
  }
  
  // Exécuter la clôture
  async executerCloture(exerciceId, userId) {
    const verification = await this.verifierCloture(exerciceId);
    
    if (!verification.peut_cloturer) {
      throw new Error('Impossible de clôturer: certaines vérifications ont échoué');
    }
    
    const exercice = await Exercice.findByPk(exerciceId);
    
    // Création de l'exercice suivant
    const nouvelExercice = await Exercice.create({
      annee: exercice.annee + 1,
      date_debut: new Date(exercice.date_fin.getTime() + 24 * 60 * 60 * 1000),
      date_fin: new Date(exercice.date_fin.getFullYear() + 1, 11, 31),
      report_a_nouveau: verification.resultat.resultat_net
    });
    
    // Clôture de l'exercice actuel
    await exercice.update({
      cloture: true,
      date_cloture: new Date(),
      resultat: verification.resultat.resultat_net,
      updated_by: userId
    });
    
    // Log d'audit
    await AuditLog.create({
      user_id: userId,
      action: 'CLOTURE_EXERCICE',
      table_name: 'exercices',
      record_id: exercice.id,
      new_data: { cloture: true, resultat: verification.resultat.resultat_net },
      action_date: new Date()
    });
    
    return {
      success: true,
      exercice_cloture: exercice,
      exercice_suivant: nouvelExercice,
      resultat: verification.resultat
    };
  }
}

module.exports = new ClotureService();