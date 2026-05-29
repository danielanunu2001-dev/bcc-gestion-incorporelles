// backend/src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');

// ==================== ROUTES IA ====================

/**
 * POST /api/ai/analyser-amortissements
 * Analyser les amortissements d'un actif avec l'IA
 */
router.post('/analyser-amortissements', authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), async (req, res) => {
  try {
    const { actif, amortissements } = req.body;
    
    if (!actif || !amortissements) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'actif et amortissements requis'
      });
    }
    
    const duree = actif.duree_utile_ans;
    const cout = actif.cout_acquisition;
    const valeurResiduelle = actif.valeur_residuelle || 0;
    const tauxTheorique = 100 / duree;
    
    const anomalies = [];
    const recommandations = [];
    
    if (amortissements.length !== duree) {
      anomalies.push({
        type: 'duree',
        severity: 'high',
        message: `Nombre d'années d'amortissement (${amortissements.length}) différent de la durée utile (${duree} ans)`
      });
      recommandations.push(`Le plan doit comporter exactement ${duree} années d'amortissement`);
    }
    
    let totalAnnuités = 0;
    for (let i = 0; i < amortissements.length; i++) {
      const am = amortissements[i];
      totalAnnuités += am.annuite;
      
      if (Math.abs(am.taux - tauxTheorique) > 0.1) {
        anomalies.push({
          type: 'taux',
          severity: 'medium',
          message: `Taux de l'année ${am.exercice} (${am.taux}%) différent du taux théorique (${tauxTheorique.toFixed(2)}%)`
        });
      }
      
      const annuiteTheorique = (cout - valeurResiduelle) / duree;
      if (Math.abs(am.annuite - annuiteTheorique) > cout * 0.01) {
        anomalies.push({
          type: 'annuite',
          severity: 'medium',
          message: `Annuité ${am.exercice} (${am.annuite.toLocaleString()} FC) différente de l'annuité théorique (${annuiteTheorique.toLocaleString()} FC)`
        });
      }
    }
    
    const totalTheorique = cout - valeurResiduelle;
    if (Math.abs(totalAnnuités - totalTheorique) > 1) {
      anomalies.push({
        type: 'total',
        severity: 'high',
        message: `Total des annuités (${totalAnnuités.toLocaleString()} FC) différent du montant amortissable (${totalTheorique.toLocaleString()} FC)`
      });
    }
    
    const derniereValeur = amortissements[amortissements.length - 1]?.valeur_nette || 0;
    if (derniereValeur > valeurResiduelle) {
      anomalies.push({
        type: 'residuelle',
        severity: 'high',
        message: `Valeur nette finale (${derniereValeur.toLocaleString()} FC) supérieure à la valeur résiduelle (${valeurResiduelle.toLocaleString()} FC)`
      });
    }
    
    const estCoherent = anomalies.length === 0;
    const scoreSante = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 20) - (anomalies.filter(a => a.severity === 'medium').length * 10));
    
    let resume = "";
    if (scoreSante >= 80) {
      resume = "✅ Le plan d'amortissement est cohérent et conforme aux règles comptables.";
    } else if (scoreSante >= 50) {
      resume = "⚠️ Le plan d'amortissement présente quelques incohérences. Des corrections sont recommandées.";
    } else {
      resume = "🔴 Le plan d'amortissement est fortement incohérent. Une correction immédiate est nécessaire.";
    }
    
    if (!estCoherent) {
      recommandations.push(`Recalculer l'amortissement avec les paramètres: durée=${duree} ans, taux=${tauxTheorique.toFixed(2)}%`);
      recommandations.push("Utiliser le bouton 'Recalculer' pour générer un plan correct");
    }
    
    res.json({
      success: true,
      analyse: {
        est_coherent: estCoherent,
        score_sante: scoreSante,
        resume: resume,
        anomalies: anomalies,
        recommandations: recommandations,
        metriques: {
          duree_actuelle: amortissements.length,
          duree_attendue: duree,
          total_annuites: totalAnnuités,
          total_attendu: totalTheorique,
          valeur_residuelle_actuelle: derniereValeur,
          valeur_residuelle_attendue: valeurResiduelle
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur analyse amortissements IA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/ai/analyser-investissements
 * Analyser les investissements avec l'IA
 */
router.post('/analyser-investissements', authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), async (req, res) => {
  try {
    const { investissements } = req.body;
    
    if (!investissements || !Array.isArray(investissements)) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'investissements requises'
      });
    }
    
    const totalInvesti = investissements.reduce((sum, inv) => sum + (inv.realise || inv.montant || 0), 0);
    const moyenneParAn = totalInvesti / investissements.length;
    
    let tendance = "stable";
    if (investissements.length >= 2) {
      const dernierAn = investissements[investissements.length - 1]?.realise || 0;
      const avantDernier = investissements[investissements.length - 2]?.realise || 0;
      
      if (dernierAn > avantDernier * 1.2) tendance = "hausse";
      else if (dernierAn < avantDernier * 0.8) tendance = "baisse";
    }
    
    const anneesExceptionnelles = [];
    for (const inv of investissements) {
      const montant = inv.realise || inv.montant || 0;
      if (montant > moyenneParAn * 1.5) {
        anneesExceptionnelles.push({
          annee: inv.annee,
          montant: montant,
          type: "hausse_exceptionnelle"
        });
      } else if (montant < moyenneParAn * 0.5) {
        anneesExceptionnelles.push({
          annee: inv.annee,
          montant: montant,
          type: "baisse_exceptionnelle"
        });
      }
    }
    
    let budgetTotal = 0;
    let realiseTotal = 0;
    
    for (const inv of investissements) {
      const realise = inv.realise || 0;
      const budget = inv.budget || inv.prevision || 0;
      realiseTotal += realise;
      budgetTotal += budget;
    }
    
    const tauxRealisation = budgetTotal > 0 ? (realiseTotal / budgetTotal) * 100 : 0;
    
    const anomalies = [];
    const recommandations = [];
    
    if (tauxRealisation < 80) {
      anomalies.push({
        type: 'budget',
        severity: 'high',
        message: `Taux de réalisation du budget faible (${tauxRealisation.toFixed(1)}%)`
      });
      recommandations.push("Revoir la planification budgétaire des investissements");
    }
    
    if (anneesExceptionnelles.length > 0) {
      anomalies.push({
        type: 'volatilite',
        severity: 'medium',
        message: `${anneesExceptionnelles.length} année(s) avec des investissements exceptionnels`
      });
    }
    
    const scoreSante = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 25));
    
    let resume = "";
    if (scoreSante >= 80) {
      resume = `✅ Les investissements sont bien maîtrisés. Tendance à la ${tendance}.`;
    } else if (scoreSante >= 50) {
      resume = `⚠️ Attention: ${tauxRealisation.toFixed(0)}% du budget réalisé. Tendance à la ${tendance}.`;
    } else {
      resume = `🔴 Situation critique: seulement ${tauxRealisation.toFixed(0)}% du budget réalisé.`;
    }
    
    res.json({
      success: true,
      analyse: {
        est_coherent: scoreSante >= 70,
        score_sante: scoreSante,
        resume: resume,
        anomalies: anomalies,
        recommandations: recommandations,
        tendance: tendance,
        metriques: {
          total_investi: totalInvesti,
          moyenne_annuelle: moyenneParAn,
          taux_realisation: parseFloat(tauxRealisation.toFixed(1)),
          annees_exceptionnelles: anneesExceptionnelles
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur analyse investissements IA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/ai/analyser-portefeuille
 * Analyser le portefeuille d'immobilisations avec l'IA
 */
router.post('/analyser-portefeuille', authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), async (req, res) => {
  try {
    const { actifs, totaux } = req.body;
    
    const nombreActifs = totaux?.nombre || actifs?.length || 0;
    const valeurBrute = totaux?.valeur_brute || 0;
    const valeurNette = totaux?.valeur_nette || 0;
    const amortissements = totaux?.amortissements_cumules || 0;
    
    const tauxAmortissementGlobal = valeurBrute > 0 ? (amortissements / valeurBrute) * 100 : 0;
    const valeurResiduelleMoyenne = valeurBrute > 0 ? (valeurNette / valeurBrute) * 100 : 0;
    
    const anomalies = [];
    const recommandations = [];
    
    if (valeurResiduelleMoyenne < 20) {
      anomalies.push(`Le portefeuille est amorti à ${(100 - valeurResiduelleMoyenne).toFixed(1)}%`);
      recommandations.push("Envisager le remplacement des actifs fortement amortis");
    }
    
    if (nombreActifs === 0) {
      anomalies.push("Aucun actif trouvé dans le portefeuille");
      recommandations.push("Ajoutez des actifs pour commencer à utiliser l'analyse");
    }
    
    let scoreSante = 100;
    scoreSante -= anomalies.length * 15;
    scoreSante = Math.max(0, Math.min(100, scoreSante));
    
    let resume = "";
    if (scoreSante >= 80) {
      resume = `✅ Le portefeuille est en bonne santé. ${nombreActifs} actifs pour une valeur nette de ${Math.round(valeurNette).toLocaleString()} FC.`;
    } else if (scoreSante >= 50) {
      resume = `⚠️ Le portefeuille présente quelques points d'attention. ${anomalies.length} anomalie(s) détectée(s).`;
    } else {
      resume = `🔴 Le portefeuille nécessite une attention particulière. ${anomalies.length} anomalie(s) critique(s) détectée(s).`;
    }
    
    if (recommandations.length === 0) {
      recommandations.push("Effectuer un inventaire physique annuel des actifs");
      recommandations.push("Vérifier la cohérence des contrats associés");
    }
    
    res.json({
      success: true,
      analyse: {
        score_sante: scoreSante,
        niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 50 ? "moyen" : "élevé",
        resume: resume,
        anomalies: anomalies,
        recommandations: recommandations,
        metriques: {
          nombre_actifs: nombreActifs,
          valeur_brute: Math.round(valeurBrute),
          valeur_nette: Math.round(valeurNette),
          taux_amortissement_global: parseFloat(tauxAmortissementGlobal.toFixed(1))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur analyse portefeuille IA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/ai/analyser/:id
 * Analyser un actif spécifique
 */
router.get('/analyser/:id', authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), async (req, res) => {
  try {
    const { Actif, CategorieAmortissement, Amortissement } = require('../models');
    
    const actif = await Actif.findByPk(req.params.id, {
      include: [
        { model: CategorieAmortissement, as: 'categorie' },
        { model: Amortissement, as: 'Amortissements' }
      ]
    });
    
    if (!actif) {
      return res.status(404).json({ success: false, message: 'Actif non trouvé' });
    }
    
    const anomalies = [];
    const recommandations = [];
    
    if (!actif.categorie_id) {
      anomalies.push({ type: 'categorie', severity: 'high', message: "Actif sans catégorie d'amortissement" });
      recommandations.push("Attribuez une catégorie GCEC à cet actif");
    }
    
    if (actif.categorie && actif.duree_utile_ans !== actif.categorie.duree_vie_ans) {
      anomalies.push({ type: 'duree', severity: 'high', message: `Durée (${actif.duree_utile_ans} ans) incohérente avec catégorie (${actif.categorie.duree_vie_ans} ans)` });
    }
    
    const scoreSante = Math.max(0, 100 - anomalies.length * 20);
    
    res.json({
      success: true,
      analyse: {
        score_sante: scoreSante,
        niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 50 ? "moyen" : "élevé",
        anomalies: anomalies,
        recommandations: recommandations
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur analyse actif IA:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ai/assistant
 * Assistant IA général
 */
router.post('/assistant', authorize('admin', 'comptable', 'auditeur', 'informatique', 'gestionnaire'), async (req, res) => {
  try {
    const { question, actifId } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question requise'
      });
    }
    
    const questionLower = question.toLowerCase();
    let reponse = "";
    let suggestions = [];
    
    if (questionLower.includes("taux") && questionLower.includes("amortissement")) {
      reponse = "**💡 Calcul du taux d'amortissement**\n\nLe taux d'amortissement linéaire se calcule avec la formule : Taux = 100 / Durée d'utilité (en années).\n\nExemples :\n- Durée 3 ans → Taux = 33.33%\n- Durée 4 ans → Taux = 25%\n- Durée 5 ans → Taux = 20%\n- Durée 10 ans → Taux = 10%";
      suggestions = ["Vérifiez la durée d'utilité de vos actifs", "Utilisez les catégories GCEC"];
    } 
    else if (questionLower.includes("categorie") || questionLower.includes("gc")) {
      reponse = "**📂 Catégories d'amortissement GCEC**\n\n| Catégorie | Durée | Taux | Compte |\n|-----------|-------|------|--------|\n| Logiciels | 3 ans | 33.33% | 205 |\n| Matériel informatique | 4 ans | 25% | 2183 |\n| Véhicules | 5 ans | 20% | 2182 |\n| Mobilier | 10 ans | 10% | 2184 |\n| Bâtiments | 20 ans | 5% | 213 |";
      suggestions = ["Assurez-vous que chaque actif a une catégorie", "Utilisez le recalcul automatique"];
    }
    else {
      reponse = "**🤖 Assistant Comptable GCEC**\n\nJe peux vous aider sur :\n- 📊 Calcul des taux d'amortissement\n- 📂 Catégories d'amortissement\n- 🔍 Détection des anomalies\n- 🔄 Recalcul des amortissements\n- 📈 Suivi des investissements\n\nPosez-moi une question précise !";
      suggestions = ["Comment calculer le taux d'amortissement ?", "Quelles sont les catégories GCEC ?"];
    }
    
    res.json({
      success: true,
      reponse: reponse,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur assistant IA:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;