// backend/src/services/AmortissementService.js

const logger = require('../config/logger');

class AmortissementService {
  constructor() {
    // Coefficients pour l'amortissement dégressif selon la durée
    this.DEGRESSIF_COEFFICIENTS = {
      3: 1.25,  // 3-4 ans : coefficient 1.25
      4: 1.25,
      5: 1.75,  // 5-6 ans : coefficient 1.75
      6: 1.75,
      7: 2.25,  // 7 ans et plus : coefficient 2.25
      8: 2.25,
      9: 2.25,
      10: 2.25
    };
    
    // Taux maximum autorisé pour l'amortissement dégressif
    this.MAX_DEGRESSIF_RATE = 40;
  }

  /**
   * Calcule le plan d'amortissement linéaire
   * @param {number} coutAcquisition - Coût d'acquisition de l'actif
   * @param {number} valeurResiduelle - Valeur résiduelle estimée
   * @param {number} dureeUtile - Durée de vie utile en années
   * @param {Date} dateAcquisition - Date d'acquisition
   * @returns {Object} Plan d'amortissement linéaire
   */
  calculerLineaire(coutAcquisition, valeurResiduelle, dureeUtile, dateAcquisition) {
    const baseAmortissable = coutAcquisition - valeurResiduelle;
    const annuite = baseAmortissable / dureeUtile;
    const taux = (annuite / coutAcquisition) * 100;
    
    const plan = [];
    const dateDebut = new Date(dateAcquisition);
    let cumulAmortissements = 0;
    let valeurResiduelleCourante = coutAcquisition;
    
    for (let annee = 1; annee <= dureeUtile; annee++) {
      const dateFin = new Date(dateDebut);
      dateFin.setFullYear(dateDebut.getFullYear() + annee);
      
      cumulAmortissements += annuite;
      valeurResiduelleCourante -= annuite;
      
      plan.push({
        annee,
        exercice: dateFin.getFullYear(),
        date_debut: dateDebut.toISOString().split('T')[0],
        date_fin: dateFin.toISOString().split('T')[0],
        annuite: Math.round(annuite),
        cumul: Math.round(cumulAmortissements),
        valeur_nette: Math.round(valeurResiduelleCourante),
        taux: parseFloat(taux.toFixed(2))
      });
    }
    
    // Validation finale
    const isValid = this.validerPlan(plan, coutAcquisition, valeurResiduelle);
    
    return {
      plan,
      methode: 'lineaire',
      duree: dureeUtile,
      annuite: Math.round(annuite),
      taux: parseFloat(taux.toFixed(2)),
      totalAmorti: Math.round(baseAmortissable),
      isValid
    };
  }

  /**
   * Calcule le plan d'amortissement dégressif
   * @param {number} coutAcquisition - Coût d'acquisition de l'actif
   * @param {number} valeurResiduelle - Valeur résiduelle estimée
   * @param {number} dureeUtile - Durée de vie utile en années
   * @param {Date} dateAcquisition - Date d'acquisition
   * @param {number} coefficient - Coefficient personnalisé (optionnel)
   * @returns {Object} Plan d'amortissement dégressif
   */
  calculerDegressif(coutAcquisition, valeurResiduelle, dureeUtile, dateAcquisition, coefficient = null) {
    // Déterminer le coefficient en fonction de la durée
    let coeff = coefficient;
    if (!coeff) {
      coeff = this.DEGRESSIF_COEFFICIENTS[dureeUtile] || 2.25;
    }
    
    // Calcul du taux linéaire et du taux dégressif
    const tauxLineaire = 100 / dureeUtile;
    let tauxDegressif = tauxLineaire * coeff;
    
    // Plafonnement du taux dégressif à 40%
    if (tauxDegressif > this.MAX_DEGRESSIF_RATE) {
      tauxDegressif = this.MAX_DEGRESSIF_RATE;
    }
    
    const plan = [];
    const dateDebut = new Date(dateAcquisition);
    let valeurResiduelleCourante = coutAcquisition;
    let cumulAmortissements = 0;
    let currentYear = 1;
    let passeEnLineaire = false;
    
    logger.info(`📊 Calcul amortissement dégressif - Coef: ${coeff}, Taux: ${tauxDegressif}%`);
    
    while (currentYear <= dureeUtile && valeurResiduelleCourante > valeurResiduelle) {
      let annuite;
      
      if (!passeEnLineaire) {
        // Calcul dégressif
        annuite = (valeurResiduelleCourante * tauxDegressif) / 100;
        
        // Vérifier si on doit passer en linéaire
        const anneesRestantes = dureeUtile - currentYear + 1;
        const annuiteLineaire = valeurResiduelleCourante / anneesRestantes;
        
        if (annuite <= annuiteLineaire) {
          passeEnLineaire = true;
          logger.debug(`🔄 Passage en amortissement linéaire à l'année ${currentYear}`);
          continue; // Recalculer avec la nouvelle méthode
        }
      }
      
      if (passeEnLineaire) {
        // Passage en linéaire pour les années restantes
        const anneesRestantes = dureeUtile - currentYear + 1;
        annuite = valeurResiduelleCourante / anneesRestantes;
      }
      
      // S'assurer de ne pas dépasser la valeur résiduelle
      const amortissementMax = valeurResiduelleCourante - valeurResiduelle;
      const annuiteFinale = Math.min(annuite, amortissementMax);
      
      if (annuiteFinale <= 0) break;
      
      const dateFin = new Date(dateDebut);
      dateFin.setFullYear(dateDebut.getFullYear() + currentYear);
      
      cumulAmortissements += annuiteFinale;
      valeurResiduelleCourante -= annuiteFinale;
      
      plan.push({
        annee: currentYear,
        exercice: dateFin.getFullYear(),
        date_debut: dateDebut.toISOString().split('T')[0],
        date_fin: dateFin.toISOString().split('T')[0],
        annuite: Math.round(annuiteFinale),
        cumul: Math.round(cumulAmortissements),
        valeur_nette: Math.round(Math.max(valeurResiduelleCourante, valeurResiduelle)),
        taux: passeEnLineaire 
          ? parseFloat((annuiteFinale / coutAcquisition * 100).toFixed(2))
          : parseFloat(tauxDegressif.toFixed(2)),
        methode: passeEnLineaire ? 'lineaire' : 'degressif'
      });
      
      currentYear++;
    }
    
    // Ajuster la dernière année si nécessaire
    const dernierAnnee = plan[plan.length - 1];
    if (dernierAnnee && dernierAnnee.valeur_nette !== valeurResiduelle) {
      const difference = dernierAnnee.valeur_nette - valeurResiduelle;
      dernierAnnee.annuite += difference;
      dernierAnnee.cumul += difference;
      dernierAnnee.valeur_nette = valeurResiduelle;
    }
    
    // Validation finale
    const isValid = this.validerPlan(plan, coutAcquisition, valeurResiduelle);
    
    return {
      plan,
      methode: 'degressif',
      coefficient: coeff,
      tauxLineaire: parseFloat(tauxLineaire.toFixed(2)),
      tauxDegressif: parseFloat(tauxDegressif.toFixed(2)),
      duree: dureeUtile,
      totalAmorti: Math.round(coutAcquisition - valeurResiduelle),
      isValid
    };
  }

  /**
   * Calcule le plan d'amortissement selon la méthode choisie
   * @param {string} methode - 'lineaire' ou 'degressif'
   * @param {Object} params - Paramètres de l'actif
   * @returns {Object} Plan d'amortissement
   */
  calculer(methode, { coutAcquisition, valeurResiduelle, dureeUtile, dateAcquisition, coefficient }) {
    if (!coutAcquisition || coutAcquisition <= 0) {
      throw new Error('Le coût d\'acquisition doit être supérieur à 0');
    }
    
    if (!dureeUtile || dureeUtile <= 0) {
      throw new Error('La durée utile doit être supérieure à 0');
    }
    
    if (valeurResiduelle === undefined || valeurResiduelle === null) {
      valeurResiduelle = 0;
    }
    
    if (valeurResiduelle > coutAcquisition) {
      throw new Error('La valeur résiduelle ne peut pas être supérieure au coût d\'acquisition');
    }
    
    const dateAcquisitionObj = dateAcquisition ? new Date(dateAcquisition) : new Date();
    
    if (methode === 'lineaire') {
      return this.calculerLineaire(coutAcquisition, valeurResiduelle, dureeUtile, dateAcquisitionObj);
    } else if (methode === 'degressif') {
      return this.calculerDegressif(coutAcquisition, valeurResiduelle, dureeUtile, dateAcquisitionObj, coefficient);
    } else {
      throw new Error(`Méthode d'amortissement inconnue: ${methode}`);
    }
  }

  /**
   * Valide la cohérence du plan d'amortissement
   * @param {Array} plan - Plan d'amortissement
   * @param {number} coutAcquisition - Coût d'acquisition initial
   * @param {number} valeurResiduelle - Valeur résiduelle attendue
   * @returns {boolean} True si le plan est valide
   */
  validerPlan(plan, coutAcquisition, valeurResiduelle) {
    if (!plan || plan.length === 0) {
      logger.warn('⚠️ Plan d\'amortissement vide');
      return false;
    }
    
    const dernier = plan[plan.length - 1];
    const delta = Math.abs(dernier.valeur_nette - valeurResiduelle);
    const isValid = delta <= 5; // Marge d'erreur de 5 FC
    
    if (!isValid) {
      logger.warn(`⚠️ Plan invalide: VNC finale ${dernier.valeur_nette} != ${valeurResiduelle} (delta: ${delta})`);
    }
    
    // Vérifier la progression (les annuités doivent être positives)
    const hasNegative = plan.some(p => p.annuite < 0);
    if (hasNegative) {
      logger.warn('⚠️ Plan invalide: Annuités négatives détectées');
      return false;
    }
    
    // Vérifier que la VNC diminue
    let previousVNC = coutAcquisition;
    for (const p of plan) {
      if (p.valeur_nette > previousVNC + 1) {
        logger.warn(`⚠️ Plan invalide: VNC augmente à l'année ${p.annee}`);
        return false;
      }
      previousVNC = p.valeur_nette;
    }
    
    return isValid;
  }

  /**
   * Calcule l'amortissement pour une année spécifique
   * @param {Object} plan - Plan d'amortissement complet
   * @param {number} annee - Année recherchée (1-indexed)
   * @returns {Object|null} Annuité pour l'année spécifiée
   */
  getAmortissementParAnnee(plan, annee) {
    if (!plan || !plan.plan) {
      return null;
    }
    return plan.plan.find(p => p.annee === annee) || null;
  }

  /**
   * Calcule la valeur nette comptable à une date donnée
   * @param {Object} plan - Plan d'amortissement complet
   * @param {Date} date - Date de référence
   * @param {Date} dateAcquisition - Date d'acquisition
   * @returns {number} Valeur nette comptable à la date donnée
   */
  getVNCADate(plan, date, dateAcquisition) {
    if (!plan || !plan.plan) {
      return null;
    }
    
    const dateRef = new Date(date);
    const dateAcq = new Date(dateAcquisition);
    const diffYears = dateRef.getFullYear() - dateAcq.getFullYear();
    
    if (diffYears <= 0) {
      return plan.plan[0]?.valeur_nette + plan.plan[0]?.annuite || plan.plan[0]?.valeur_nette + plan.plan[0]?.annuite;
    }
    
    const yearIndex = Math.min(diffYears, plan.plan.length - 1);
    return plan.plan[yearIndex]?.valeur_nette || 0;
  }

  /**
   * Calcule le taux d'amortissement effectif
   * @param {number} annuite - Annuité de l'année
   * @param {number} coutAcquisition - Coût d'acquisition
   * @returns {number} Taux d'amortissement en pourcentage
   */
  calculerTauxEffectif(annuite, coutAcquisition) {
    if (!coutAcquisition || coutAcquisition <= 0) return 0;
    return parseFloat(((annuite / coutAcquisition) * 100).toFixed(2));
  }

  /**
   * Projette l'amortissement sur plusieurs années
   * @param {Object} plan - Plan d'amortissement complet
   * @param {number} horizon - Nombre d'années à projeter
   * @returns {Array} Projection des amortissements
   */
  projeterAmortissement(plan, horizon) {
    if (!plan || !plan.plan) {
      return [];
    }
    
    const projection = [];
    const maxAnnees = Math.min(horizon, plan.plan.length);
    
    for (let i = 0; i < maxAnnees; i++) {
      projection.push({
        annee: plan.plan[i].annee,
        exercice: plan.plan[i].exercice,
        annuite: plan.plan[i].annuite,
        cumul: plan.plan[i].cumul,
        valeur_nette: plan.plan[i].valeur_nette
      });
    }
    
    return projection;
  }

  /**
   * Compare deux méthodes d'amortissement
   * @param {Object} params - Paramètres de l'actif
   * @returns {Object} Comparaison des deux méthodes
   */
  comparerMethodes(params) {
    const lineaire = this.calculer('lineaire', params);
    const degressif = this.calculer('degressif', params);
    
    const differenceAnnuelle = [];
    const maxAnnees = Math.max(lineaire.plan.length, degressif.plan.length);
    
    for (let i = 0; i < maxAnnees; i++) {
      const l = lineaire.plan[i];
      const d = degressif.plan[i];
      
      differenceAnnuelle.push({
        annee: i + 1,
        lineaire_annuite: l?.annuite || 0,
        degressif_annuite: d?.annuite || 0,
        difference: (d?.annuite || 0) - (l?.annuite || 0),
        lineaire_vnc: l?.valeur_nette || 0,
        degressif_vnc: d?.valeur_nette || 0
      });
    }
    
    return {
      methodes: {
        lineaire: {
          total_amorti: lineaire.totalAmorti,
          annuite_moyenne: lineaire.annuite,
          isValid: lineaire.isValid
        },
        degressif: {
          total_amorti: degressif.totalAmorti,
          coefficient: degressif.coefficient,
          taux_degressif: degressif.tauxDegressif,
          isValid: degressif.isValid
        }
      },
      differenceAnnuelle,
      recommandation: this.recommanderMethode(lineaire, degressif)
    };
  }

  /**
   * Recommande la méthode d'amortissement la plus adaptée
   * @param {Object} lineaire - Résultat linéaire
   * @param {Object} degressif - Résultat dégressif
   * @returns {Object} Recommandation
   */
  recommanderMethode(lineaire, degressif) {
    const earlyYears = degressif.plan.slice(0, 3);
    const earlyYearsTotal = earlyYears.reduce((sum, p) => sum + p.annuite, 0);
    const lineaireEarlyYearsTotal = lineaire.plan.slice(0, 3).reduce((sum, p) => sum + p.annuite, 0);
    
    let methode = 'lineaire';
    let raison = "Amortissement plus étalé dans le temps";
    
    if (earlyYearsTotal > lineaireEarlyYearsTotal * 1.3) {
      methode = 'degressif';
      raison = "Permet de déduire plus rapidement les premières années";
    }
    
    return {
      methode,
      raison,
      impact_fiscal: methode === 'degressif' ? 
        "Avantage fiscal à court terme" : 
        "Charge d'amortissement stable"
    };
  }
}

module.exports = new AmortissementService();