// backend/src/controllers/aiController.js

const { Actif, Amortissement, Contrat, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ==================== MISTRAL AI CONFIGURATION ====================
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Appel à l'API Mistral pour générer une réponse
 */
async function callMistral(messages, model = 'mistral-tiny') {
  if (!MISTRAL_API_KEY) {
    console.warn('⚠️ MISTRAL_API_KEY non configurée, utilisation du mode fallback');
    return null;
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Erreur Mistral API:', error.message);
    return null;
  }
}

/**
 * Générer une réponse de fallback (hors ligne)
 */
function fallbackResponse(question, contexte, actif = null) {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('valeur nette') || questionLower.includes('vnc')) {
    const valeurNette = actif?.valeur_nette || actif?.cout_acquisition || 0;
    return `La valeur nette comptable (VNC) de cet actif est de ${Math.round(valeurNette).toLocaleString()} Francs Congolais.`;
  }
  
  if (questionLower.includes('amortissement') || questionLower.includes('taux')) {
    const taux = actif?.taux_amortissement || (actif?.duree_utile_ans ? 100 / actif.duree_utile_ans : 0);
    return `Le taux d'amortissement de cet actif est de ${taux}% (mode ${actif?.mode_amortissement === 'lineaire' ? 'linéaire' : 'dégressif'}).`;
  }
  
  if (questionLower.includes('anomalie') || questionLower.includes('probleme') || questionLower.includes('erreur')) {
    return "Je n'ai détecté aucune anomalie majeure sur cet actif. Voici les points de vigilance : vérifiez les dates de fin de contrat et assurez-vous que les amortissements sont correctement calculés.";
  }
  
  if (questionLower.includes('contrat')) {
    return "Pour consulter les contrats associés à cet actif, rendez-vous dans l'onglet 'Contrats' de la page de détail. Vous y trouverez la liste complète des contrats avec leurs dates d'échéance.";
  }
  
  return "Je suis votre assistant comptable. Je peux vous aider à analyser les actifs, leurs amortissements, et détecter d'éventuelles anomalies. Posez-moi une question précise sur l'actif (valeur, amortissement, contrat, anomalies).";
}

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Analyser un actif avec l'IA (détection d'anomalies)
 * POST /api/ai/analyser/:actifId
 */
exports.analyserActif = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    const actif = await Actif.findByPk(actifId, {
      include: [
        { model: Amortissement, as: 'Amortissements' },
        { model: Contrat, as: 'Contrats' }
      ]
    });
    
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    const anomalies = [];
    const recommandations = [];
    
    // Vérifier la cohérence des amortissements
    const dernierAmort = actif.Amortissements?.[actif.Amortissements.length - 1];
    if (dernierAmort && dernierAmort.valeur_nette < 0) {
      anomalies.push("La valeur nette comptable est négative");
      recommandations.push("Vérifiez le calcul des amortissements ou la valeur résiduelle");
    }
    
    // Vérifier la durée d'utilité
    const dateAcquisition = new Date(actif.date_acquisition);
    const maintenant = new Date();
    const anneesEcoulees = maintenant.getFullYear() - dateAcquisition.getFullYear();
    
    if (anneesEcoulees > actif.duree_utile_ans && actif.actif === true) {
      anomalies.push(`L'actif a dépassé sa durée d'utilité de ${anneesEcoulees - actif.duree_utile_ans} ans mais n'est pas sorti`);
      recommandations.push("Envisager une sortie d'actif ou une réévaluation de la durée d'utilité");
    }
    
    // Vérifier la valeur résiduelle
    if (actif.valeur_residuelle > actif.cout_acquisition) {
      anomalies.push("La valeur résiduelle est supérieure au coût d'acquisition");
      recommandations.push("Corrigez la valeur résiduelle ou la valeur d'acquisition");
    }
    
    // Vérifier le taux d'amortissement
    if (actif.mode_amortissement === 'lineaire') {
      const tauxCalcule = 100 / actif.duree_utile_ans;
      if (Math.abs(actif.taux_amortissement - tauxCalcule) > 0.5) {
        anomalies.push(`Le taux d'amortissement (${actif.taux_amortissement}%) diffère du taux théorique (${tauxCalcule.toFixed(2)}%)`);
        recommandations.push(`Corriger le taux d'amortissement à ${tauxCalcule.toFixed(2)}%`);
      }
    }
    
    // Vérifier les contrats expirés
    const contratsExpires = actif.Contrats?.filter(c => new Date(c.date_fin) < new Date()) || [];
    if (contratsExpires.length > 0) {
      anomalies.push(`${contratsExpires.length} contrat(s) associé(s) sont expirés`);
      recommandations.push("Renouvelez les contrats expirés ou supprimez-les");
    }
    
    // Date de validité pour les incorporels
    if (actif.type_immobilisation === 'incorporel' && actif.date_validite) {
      const dateValidite = new Date(actif.date_validite);
      if (dateValidite < maintenant) {
        anomalies.push(`La licence/brevet est expiré depuis ${Math.floor((maintenant - dateValidite) / (1000 * 60 * 60 * 24))} jours`);
        recommandations.push("Renouvelez la licence ou sortez l'actif");
      } else if (dateValidite - maintenant < 90 * 24 * 60 * 60 * 1000) {
        anomalies.push(`La licence/brevet expire dans moins de 90 jours (le ${new Date(actif.date_validite).toLocaleDateString('fr-FR')})`);
        recommandations.push("Planifiez le renouvellement de la licence");
      }
    }
    
    const scoreSante = Math.max(0, 100 - (anomalies.length * 15));
    const niveauRisque = scoreSante >= 80 ? 'faible' : scoreSante >= 50 ? 'moyen' : scoreSante >= 25 ? 'élevé' : 'critique';
    
    const resume = `L'actif ${actif.code} - ${actif.nom} a une valeur nette de ${Math.round(actif.cout_acquisition).toLocaleString()} FC. ${anomalies.length > 0 ? `${anomalies.length} anomalie(s) ont été détectées.` : "Aucune anomalie majeure détectée."}`;
    
    res.json({
      actif: {
        id: actif.id,
        code: actif.code,
        nom: actif.nom
      },
      analyse: {
        est_coherent: anomalies.length === 0,
        score_sante: scoreSante,
        niveau_risque: niveauRisque,
        resume: resume,
        anomalies: anomalies,
        recommandations: recommandations,
        date_analyse: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur analyserActif:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse de l\'actif',
      error: error.message 
    });
  }
};

/**
 * Assistant conversationnel
 * POST /api/ai/assistant
 */
exports.assistant = async (req, res) => {
  try {
    const { question, actifId } = req.body;
    
    if (!question) {
      return res.status(400).json({ message: 'Question requise' });
    }
    
    let contexte = null;
    let actif = null;
    
    if (actifId) {
      actif = await Actif.findByPk(actifId, {
        include: [
          { model: Amortissement, as: 'Amortissements' },
          { model: Contrat, as: 'Contrats' }
        ]
      });
      
      if (actif) {
        const dernierAmort = actif.Amortissements?.[actif.Amortissements.length - 1];
        contexte = {
          nom: actif.nom,
          code: actif.code,
          valeur_nette: dernierAmort?.valeur_nette || actif.cout_acquisition,
          valeur_brute: actif.cout_acquisition,
          taux_amortissement: actif.taux_amortissement,
          duree_utile: actif.duree_utile_ans,
          mode_amortissement: actif.mode_amortissement,
          statut: actif.actif ? 'Actif' : 'Inactif',
          nombre_contrats: actif.Contrats?.length || 0
        };
      }
    }
    
    // Essayer Mistral
    let reponseIA = null;
    if (MISTRAL_API_KEY) {
      const messages = [
        {
          role: 'system',
          content: `Tu es un expert comptable spécialisé dans la gestion des immobilisations. Tu réponds de manière précise et professionnelle. ${contexte ? `Contexte: Actif "${contexte.nom}" (${contexte.code}) - Valeur nette: ${contexte.valeur_nette} FC - Taux d'amortissement: ${contexte.taux_amortissement}% - Statut: ${contexte.statut}` : ''}`
        },
        { role: 'user', content: question }
      ];
      
      reponseIA = await callMistral(messages, 'mistral-tiny');
    }
    
    const reponse = reponseIA || fallbackResponse(question, contexte, actif);
    
    res.json({
      question: question,
      reponse: reponse,
      contexte: contexte,
      source: reponseIA ? 'mistral' : 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Erreur assistant:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération de la réponse',
      error: error.message 
    });
  }
};

/**
 * Résumé du tableau de bord
 * GET /api/ai/dashboard-resume
 */
exports.dashboardResume = async (req, res) => {
  try {
    const totalActifs = await Actif.count();
    const actifsActifs = await Actif.count({ where: { actif: true } });
    const actifsInactifs = totalActifs - actifsActifs;
    
    const contratsExpires = await Contrat.count({
      where: { date_fin: { [Op.lt]: new Date() } }
    });
    
    const contratsProchesExpiration = await Contrat.count({
      where: {
        date_fin: {
          [Op.between]: [new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)]
        }
      }
    });
    
    const amortTotal = await Amortissement.sum('annuite') || 0;
    const valeurBruteTotal = await Actif.sum('cout_acquisition') || 0;
    
    const tauxAmortissementGlobal = valeurBruteTotal > 0 ? (amortTotal / valeurBruteTotal) * 100 : 0;
    
    let resume = `Votre portefeuille d'immobilisations comprend ${totalActifs} actifs, dont ${actifsActifs} actifs (${Math.round((actifsActifs / totalActifs) * 100)}% du portefeuille). `;
    resume += `Le taux d'amortissement global est de ${tauxAmortissementGlobal.toFixed(1)}%. `;
    
    if (contratsExpires > 0) {
      resume += `${contratsExpires} contrat(s) sont expirés et ${contratsProchesExpiration} contrat(s) expirent dans les 90 jours. `;
    }
    
    const recommandations = [];
    if (actifsInactifs > 5) {
      recommandations.push("Plusieurs actifs sont inactifs. Envisagez leur sortie comptable.");
    }
    if (contratsExpires > 0) {
      recommandations.push("Renouvelez les contrats expirés pour maintenir la couverture.");
    }
    if (tauxAmortissementGlobal > 70) {
      recommandations.push("Le portefeuille est très amorti. Prévoyez le remplacement des actifs.");
    }
    
    res.json({
      resume: resume,
      statistiques: {
        total_actifs: totalActifs,
        actifs_actifs: actifsActifs,
        actifs_inactifs: actifsInactifs,
        contrats_expires: contratsExpires,
        contrats_proches_expiration: contratsProchesExpiration,
        amortissements_totaux: amortTotal,
        valeur_brute_totale: valeurBruteTotal,
        taux_amortissement_global: parseFloat(tauxAmortissementGlobal.toFixed(1))
      },
      recommandations: recommandations,
      date_analyse: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur dashboardResume:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du résumé',
      error: error.message 
    });
  }
};

/**
 * Health check du service IA
 * GET /api/ai/health
 */
exports.healthCheck = async (req, res) => {
  res.json({
    status: 'ok',
    mistral_configured: !!MISTRAL_API_KEY,
    timestamp: new Date().toISOString()
  });
};

// ==================== ANALYSE DU PORTEFEUILLE ====================

/**
 * Analyser le portefeuille d'immobilisations
 * POST /api/ai/analyser-portefeuille
 */
exports.analyserPortefeuille = async (req, res) => {
  try {
    const { actifs, totaux, date_arrete } = req.body;
    
    console.log('🤖 IA - Analyse du portefeuille d\'immobilisations');
    
    let actifsData = actifs;
    let totauxData = totaux;
    
    // Si les données ne sont pas fournies, les récupérer de la base
    if (!actifsData || !totauxData) {
      const actifsQuery = await Actif.findAll({
        include: [
          { model: Amortissement, as: 'Amortissements' },
          { model: Contrat, as: 'Contrats' }
        ]
      });
      
      actifsData = actifsQuery;
      totauxData = {
        nombre: actifsData.length,
        valeur_brute: actifsData.reduce((sum, a) => sum + (parseFloat(a.cout_acquisition) || 0), 0),
        valeur_nette: actifsData.reduce((sum, a) => {
          const dernierAmort = a.Amortissements?.[a.Amortissements.length - 1];
          return sum + (dernierAmort?.valeur_nette || parseFloat(a.cout_acquisition) || 0);
        }, 0),
        amortissements_cumules: actifsData.reduce((sum, a) => {
          const dernierAmort = a.Amortissements?.[a.Amortissements.length - 1];
          return sum + (dernierAmort?.cumul_amortissements || 0);
        }, 0)
      };
    }
    
    // Calculer des métriques
    const nombreActifs = totauxData.nombre || actifsData?.length || 0;
    const valeurBrute = totauxData.valeur_brute || 0;
    const valeurNette = totauxData.valeur_nette || 0;
    const amortissements = totauxData.amortissements_cumules || 0;
    
    // Taux d'amortissement global
    const tauxAmortissementGlobal = valeurBrute > 0 ? (amortissements / valeurBrute) * 100 : 0;
    
    // Valeur résiduelle moyenne
    const valeurResiduelleMoyenne = valeurBrute > 0 ? (valeurNette / valeurBrute) * 100 : 0;
    
    // Détection des anomalies
    const anomalies = [];
    const recommandations = [];
    
    // Vérifier si la valeur nette est trop basse
    if (valeurResiduelleMoyenne < 20) {
      anomalies.push(`Le portefeuille est amorti à ${(100 - valeurResiduelleMoyenne).toFixed(1)}% (valeur résiduelle moyenne: ${valeurResiduelleMoyenne.toFixed(1)}%)`);
      recommandations.push("Envisager le remplacement ou la cession des actifs fortement amortis");
    }
    
    // Vérifier si trop d'actifs sont inactifs
    const actifsInactifs = actifsData?.filter(a => a.actif === false || a.actif === 0)?.length || 0;
    if (actifsInactifs > 0) {
      anomalies.push(`${actifsInactifs} actif(s) sont inactifs (${((actifsInactifs / nombreActifs) * 100).toFixed(1)}% du portefeuille)`);
      recommandations.push("Sortir comptablement les actifs inactifs pour clarifier l'état du portefeuille");
    }
    
    // Vérifier les contrats expirés
    const contratsExpires = actifsData?.filter(a => {
      if (a.Contrats && a.Contrats.length > 0) {
        return a.Contrats.some(c => new Date(c.date_fin) < new Date());
      }
      return false;
    })?.length || 0;
    
    if (contratsExpires > 0) {
      anomalies.push(`${contratsExpires} actif(s) ont des contrats expirés`);
      recommandations.push("Renouveler les contrats de maintenance et de licence");
    }
    
    // Vérifier les actifs sans amortissement
    const actifsSansAmortissement = actifsData?.filter(a => !a.Amortissements || a.Amortissements.length === 0)?.length || 0;
    if (actifsSansAmortissement > 0) {
      anomalies.push(`${actifsSansAmortissement} actif(s) n'ont pas de plan d'amortissement`);
      recommandations.push("Générer les plans d'amortissement pour les actifs concernés");
    }
    
    // Vérifier les actifs avec valeur résiduelle anormale
    const actifsValeurResiduelleAnormale = actifsData?.filter(a => {
      const valeurResiduelle = a.valeur_residuelle || 0;
      const coutAcquisition = a.cout_acquisition || 0;
      return coutAcquisition > 0 && valeurResiduelle > coutAcquisition;
    })?.length || 0;
    
    if (actifsValeurResiduelleAnormale > 0) {
      anomalies.push(`${actifsValeurResiduelleAnormale} actif(s) ont une valeur résiduelle supérieure au coût d'acquisition`);
      recommandations.push("Corriger les valeurs résiduelles anormales");
    }
    
    // Calculer le score de santé
    let scoreSante = 100;
    scoreSante -= anomalies.filter(a => !a.includes('contrats expirés') && !a.includes('sans plan')).length * 10;
    scoreSante -= (contratsExpires > 0 ? 5 : 0);
    scoreSante -= (actifsSansAmortissement > 0 ? 10 : 0);
    scoreSante = Math.max(0, Math.min(100, scoreSante));
    
    // Déterminer le niveau de risque
    let niveauRisque = "faible";
    if (scoreSante < 40) niveauRisque = "critique";
    else if (scoreSante < 60) niveauRisque = "élevé";
    else if (scoreSante < 80) niveauRisque = "moyen";
    
    // Générer un résumé
    let resume = "";
    if (scoreSante >= 80) {
      resume = `✅ Le portefeuille d'immobilisations est en bonne santé. Avec ${nombreActifs} actifs pour une valeur nette de ${Math.round(valeurNette).toLocaleString()} FC, le taux d'amortissement global est de ${tauxAmortissementGlobal.toFixed(1)}%. La gestion des actifs semble bien maîtrisée.`;
    } else if (scoreSante >= 50) {
      resume = `⚠️ Le portefeuille d'immobilisations présente quelques points d'attention. ${anomalies.length} anomalie(s) ont été détectées. Une analyse plus détaillée est recommandée pour optimiser la gestion des actifs.`;
    } else {
      resume = `🔴 Le portefeuille d'immobilisations nécessite une attention particulière. ${anomalies.length} anomalie(s) critique(s) ont été détectées. Une action rapide est recommandée pour corriger ces anomalies.`;
    }
    
    // Ajouter des recommandations par défaut si nécessaire
    if (recommandations.length === 0) {
      recommandations.push("Effectuer un inventaire physique annuel des actifs");
      recommandations.push("Vérifier la cohérence entre les actifs et leurs contrats associés");
      recommandations.push("Mettre à jour les localisations et affectations des actifs");
    }
    
    // Tenter d'obtenir une analyse via Mistral
    let analyseIA = null;
    if (MISTRAL_API_KEY) {
      try {
        const prompt = `Analyse le portefeuille d'immobilisations suivant:
- Nombre d'actifs: ${nombreActifs}
- Valeur brute: ${Math.round(valeurBrute).toLocaleString()} FC
- Valeur nette: ${Math.round(valeurNette).toLocaleString()} FC
- Taux d'amortissement: ${tauxAmortissementGlobal.toFixed(1)}%
- Anomalies: ${anomalies.join(', ') || 'Aucune'}

Donne un résumé concis de la situation et 3 recommandations prioritaires.`;
        
        analyseIA = await callMistral([
          { role: 'system', content: 'Tu es un expert comptable spécialisé dans les immobilisations.' },
          { role: 'user', content: prompt }
        ]);
      } catch (err) {
        console.error('Erreur Mistral:', err);
      }
    }
    
    res.json({
      score_sante: scoreSante,
      niveau_risque: niveauRisque,
      resume: analyseIA || resume,
      anomalies: anomalies,
      recommandations: recommandations,
      metriques: {
        nombre_actifs: nombreActifs,
        valeur_brute: Math.round(valeurBrute),
        valeur_nette: Math.round(valeurNette),
        amortissements_cumules: Math.round(amortissements),
        taux_amortissement_global: parseFloat(tauxAmortissementGlobal.toFixed(1)),
        valeur_residuelle_moyenne: parseFloat(valeurResiduelleMoyenne.toFixed(1)),
        actifs_inactifs: actifsInactifs,
        actifs_sans_amortissement: actifsSansAmortissement,
        contrats_expires: contratsExpires
      },
      date_analyse: new Date().toISOString(),
      date_arrete: date_arrete || new Date().toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur analyserPortefeuille:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse du portefeuille',
      error: error.message 
    });
  }
};

/**
 * Générer un code d'actif unique
 * POST /api/ai/generate-code
 */
exports.generateCode = async (req, res) => {
  try {
    const { baseName, existingCodes = [] } = req.body;
    
    const prefix = baseName ? baseName.substring(0, 3).toUpperCase() : 'ACT';
    let code = `${prefix}-001`;
    let counter = 1;
    
    while (existingCodes.includes(code)) {
      counter++;
      code = `${prefix}-${String(counter).padStart(3, '0')}`;
    }
    
    const existingInDb = await Actif.findOne({ where: { code } });
    if (existingInDb) {
      let newCounter = counter + 1;
      let newCode = `${prefix}-${String(newCounter).padStart(3, '0')}`;
      while (await Actif.findOne({ where: { code: newCode } })) {
        newCounter++;
        newCode = `${prefix}-${String(newCounter).padStart(3, '0')}`;
      }
      code = newCode;
    }
    
    res.json({ code });
  } catch (error) {
    console.error('❌ Erreur generateCode:', error);
    const fallbackCode = `ACT-${Math.floor(Math.random() * 1000)}`;
    res.json({ code: fallbackCode });
  }
};

/**
 * Vérifier la cohérence des amortissements
 * POST /api/ai/verifier-amortissements
 */
exports.verifierAmortissements = async (req, res) => {
  try {
    const { actif, amortissements } = req.body;
    
    const anomalies = [];
    
    if (!amortissements || amortissements.length === 0) {
      anomalies.push("Aucun plan d'amortissement trouvé");
    } else {
      const totalAnnuites = amortissements.reduce((sum, a) => sum + (a.annuite || 0), 0);
      const valeurAcquisition = actif.cout_acquisition || 0;
      const valeurResiduelle = actif.valeur_residuelle || 0;
      const baseAmortissable = valeurAcquisition - valeurResiduelle;
      
      if (Math.abs(totalAnnuites - baseAmortissable) > 100) {
        anomalies.push(`La somme des annuités (${Math.round(totalAnnuites).toLocaleString()} FC) ne correspond pas à la base amortissable (${Math.round(baseAmortissable).toLocaleString()} FC)`);
      }
      
      const dernierAmort = amortissements[amortissements.length - 1];
      if (dernierAmort && dernierAmort.valeur_nette < 0) {
        anomalies.push("La valeur nette comptable finale est négative");
      }
    }
    
    res.json({
      est_coherent: anomalies.length === 0,
      anomalies: anomalies,
      recommandations: anomalies.length > 0 ? ["Revoyez le calcul du plan d'amortissement"] : []
    });
    
  } catch (error) {
    console.error('❌ Erreur verifierAmortissements:', error);
    res.json({
      est_coherent: true,
      anomalies: [],
      recommandations: []
    });
  }
};

// ==================== ANALYSE DES AMORTISSEMENTS (NOUVEAU) ====================

/**
 * Analyser les amortissements d'un actif
 * POST /api/ai/analyser-amortissements
 */
exports.analyserAmortissements = async (req, res) => {
  try {
    const { actifId, amortissements, methode, duree, valeurAcquisition, valeurResiduelle } = req.body;
    
    console.log('🤖 IA - Analyse des amortissements');
    console.log('📦 Données reçues:', { actifId, methode, duree, valeurAcquisition, valeurResiduelle });
    
    // Si un actifId est fourni, récupérer les données depuis la base
    let actif = null;
    let amortissementsData = amortissements;
    
    if (actifId && !amortissementsData) {
      actif = await Actif.findByPk(actifId, {
        include: [{ model: Amortissement, as: 'Amortissements' }]
      });
      
      if (actif) {
        amortissementsData = actif.Amortissements;
        valeurAcquisition = valeurAcquisition || actif.cout_acquisition;
        valeurResiduelle = valeurResiduelle || actif.valeur_residuelle || 0;
        methode = methode || actif.mode_amortissement;
        duree = duree || actif.duree_utile_ans;
      }
    }
    
    // Vérifier les données
    if (!amortissementsData && !valeurAcquisition) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes: fournissez amortissements ou actifId/valeurAcquisition'
      });
    }
    
    // Calculer les métriques
    let totalAnnuites = 0;
    let valeurNetteFinale = valeurAcquisition || 0;
    let erreurs = [];
    let alertes = [];
    
    if (amortissementsData && amortissementsData.length > 0) {
      totalAnnuites = amortissementsData.reduce((sum, a) => sum + (parseFloat(a.annuite) || 0), 0);
      const dernierAmort = amortissementsData[amortissementsData.length - 1];
      valeurNetteFinale = dernierAmort?.valeur_nette || 0;
      
      // Vérifier la cohérence
      const baseAmortissable = (valeurAcquisition || 0) - (valeurResiduelle || 0);
      if (Math.abs(totalAnnuites - baseAmortissable) > 1000) {
        erreurs.push(`La somme des annuités (${Math.round(totalAnnuites).toLocaleString()} FC) ne correspond pas à la base amortissable (${Math.round(baseAmortissable).toLocaleString()} FC)`);
      }
      
      if (valeurNetteFinale < 0) {
        erreurs.push("La valeur nette comptable finale est négative");
      }
      
      if (valeurNetteFinale > (valeurResiduelle || 0) + 1000) {
        alertes.push(`La valeur nette finale (${Math.round(valeurNetteFinale).toLocaleString()} FC) est supérieure à la valeur résiduelle (${Math.round(valeurResiduelle || 0).toLocaleString()} FC)`);
      }
    } else {
      // Simulation si pas de données d'amortissement
      const baseAmortissable = (valeurAcquisition || 0) - (valeurResiduelle || 0);
      const annuiteTheorique = duree > 0 ? baseAmortissable / duree : 0;
      totalAnnuites = annuiteTheorique * duree;
      valeurNetteFinale = valeurResiduelle || 0;
      
      alertes.push("Aucun plan d'amortissement fourni, analyse basée sur des valeurs théoriques");
    }
    
    // Taux d'amortissement
    const tauxAmortissement = duree > 0 ? (100 / duree) : 0;
    const tauxActuel = valeurAcquisition > 0 ? ((totalAnnuites / valeurAcquisition) * 100) : 0;
    
    // Recommandations
    const recommandations = [];
    if (erreurs.length > 0) {
      recommandations.push("Revoir le calcul du plan d'amortissement");
    }
    if (tauxActuel > 90) {
      recommandations.push("L'actif est très amorti (plus de 90%), envisager son remplacement");
    }
    if (valeurNetteFinale < (valeurResiduelle || 0) * 0.8) {
      recommandations.push("La valeur nette est inférieure à la valeur résiduelle théorique");
    }
    
    // Générer un résumé via Mistral si disponible
    let analyseIA = null;
    if (MISTRAL_API_KEY && (amortissementsData || valeurAcquisition)) {
      try {
        const prompt = `Analyse le plan d'amortissement suivant:
- Valeur d'acquisition: ${Math.round(valeurAcquisition || 0).toLocaleString()} FC
- Valeur résiduelle: ${Math.round(valeurResiduelle || 0).toLocaleString()} FC
- Durée: ${duree} ans
- Méthode: ${methode || 'linéaire'}
- Total annuités: ${Math.round(totalAnnuites).toLocaleString()} FC
- Valeur nette finale: ${Math.round(valeurNetteFinale).toLocaleString()} FC
${erreurs.length > 0 ? `- Erreurs détectées: ${erreurs.join(', ')}` : ''}

Donne une analyse concise de la cohérence de ce plan d'amortissement.`;
        
        analyseIA = await callMistral([
          { role: 'system', content: 'Tu es un expert comptable spécialisé dans les amortissements.' },
          { role: 'user', content: prompt }
        ]);
      } catch (err) {
        console.error('Erreur Mistral:', err);
      }
    }
    
    // Score de cohérence
    let scoreCohérence = 100;
    scoreCohérence -= erreurs.length * 20;
    scoreCohérence -= alertes.length * 10;
    scoreCohérence = Math.max(0, Math.min(100, scoreCohérence));
    
    res.json({
      success: true,
      analyse: {
        est_coherent: erreurs.length === 0,
        score_coherence: scoreCohérence,
        resume: analyseIA || (scoreCohérence >= 80 
          ? "Le plan d'amortissement semble cohérent." 
          : "Le plan d'amortissement présente des incohérences à corriger."),
        metriques: {
          valeur_acquisition: Math.round(valeurAcquisition || 0),
          valeur_residuelle: Math.round(valeurResiduelle || 0),
          base_amortissable: Math.round((valeurAcquisition || 0) - (valeurResiduelle || 0)),
          total_annuites: Math.round(totalAnnuites),
          valeur_nette_finale: Math.round(valeurNetteFinale),
          duree_ans: duree,
          taux_amortissement_theorique: parseFloat(tauxAmortissement.toFixed(2)),
          taux_amortissement_actuel: parseFloat(tauxActuel.toFixed(2))
        },
        erreurs: erreurs,
        alertes: alertes,
        recommandations: recommandations
      },
      date_analyse: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur analyserAmortissements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'analyse des amortissements',
      error: error.message
    });
  }
};

// ==================== ANALYSE DES ANOMALIES ====================

/**
 * Analyser les anomalies d'inventaire
 * POST /api/ai/analyser-anomalies
 */
exports.analyserAnomalies = async (req, res) => {
  try {
    const { anomalies, stats, filtres } = req.body;
    
    console.log('🤖 IA - Analyse des anomalies d\'inventaire');
    
    const totalAnomalies = stats?.total || anomalies?.length || 0;
    const anomaliesResolues = anomalies?.filter(a => a.statut === 'résolu')?.length || 0;
    const tauxResolution = totalAnomalies > 0 ? (anomaliesResolues / totalAnomalies) * 100 : 0;
    
    const anomaliesParType = stats?.parType || [];
    
    const anomaliesCritiques = anomalies?.filter(a => a.type_anomalie === 'manquant' && a.statut !== 'résolu')?.length || 0;
    
    const alertes = [];
    const recommandations = [];
    
    if (anomaliesCritiques > 0) {
      alertes.push(`${anomaliesCritiques} anomalie(s) critique(s) de type "bien manquant" non résolues`);
      recommandations.push("Lancer une enquête approfondie sur les biens manquants");
    }
    
    if (tauxResolution < 50) {
      alertes.push(`Taux de résolution faible: ${tauxResolution.toFixed(1)}%`);
      recommandations.push("Accélérer le traitement des anomalies en cours");
    }
    
    if (anomaliesParType.some(t => t.type_anomalie === 'endommage' && t.count > 5)) {
      alertes.push("Nombre élevé d'actifs endommagés signalés");
      recommandations.push("Renforcer les mesures de protection des actifs");
    }
    
    const scoreSante = Math.max(0, 100 - (anomaliesCritiques * 10) - (100 - tauxResolution) / 2);
    
    res.json({
      score_sante: Math.min(100, Math.floor(scoreSante)),
      niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 50 ? "moyen" : "élevé",
      resume: `Analyse de ${totalAnomalies} anomalie(s). Taux de résolution: ${tauxResolution.toFixed(1)}%. ${anomaliesCritiques} anomalie(s) critique(s) non résolues.`,
      anomalies: alertes.length > 0 ? alertes : ["Aucune anomalie majeure détectée"],
      recommandations: recommandations.length > 0 ? recommandations : [
        "Maintenir un suivi régulier des anomalies signalées",
        "Former le personnel à la détection précoce des anomalies",
        "Mettre en place des audits périodiques"
      ],
      metriques: {
        total_anomalies: totalAnomalies,
        anomalies_resolues: anomaliesResolues,
        taux_resolution: parseFloat(tauxResolution.toFixed(1)),
        anomalies_par_type: anomaliesParType
      },
      date_analyse: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur analyserAnomalies:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse des anomalies',
      error: error.message 
    });
  }
};

// ==================== EXPORT ====================

module.exports = {
  analyserActif: exports.analyserActif,
  assistant: exports.assistant,
  dashboardResume: exports.dashboardResume,
  healthCheck: exports.healthCheck,
  analyserPortefeuille: exports.analyserPortefeuille,
  generateCode: exports.generateCode,
  verifierAmortissements: exports.verifierAmortissements,
  analyserAnomalies: exports.analyserAnomalies,
  analyserAmortissements: exports.analyserAmortissements  // ✅ NOUVELLE FONCTION
};