// backend/src/services/predictiveAIService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const moment = require('moment');

class PredictiveAIService {
  constructor() {
    this.useGemini = !!process.env.GEMINI_API_KEY;
    this.useMistral = !!process.env.MISTRAL_API_KEY;
    
    if (this.useGemini) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log('✅ IA Prédictive: Gemini initialisé');
    } else if (this.useMistral) {
      this.openai = new OpenAI({
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: 'https://api.mistral.ai/v1'
      });
      console.log('✅ IA Prédictive: Mistral initialisé');
    } else {
      console.log('⚠️ IA Prédictive: Aucune clé API trouvée, mode fallback uniquement');
    }
  }

  /**
   * Analyse prédictive des investissements
   */
  async analyserInvestissementsPrevision(donnees, historique, contexteMarche = {}, horizon = 5) {
    try {
      // Si aucune clé API, retourner directement le fallback
      if (!this.useGemini && !this.useMistral) {
        return this.getFallbackInvestissementPrediction(donnees, historique, horizon);
      }
      
      const prompt = this.buildInvestissementPrompt(donnees, historique, contexteMarche, horizon);
      const prediction = await this.callAI(prompt);
      return this.parsePrediction(prediction, 'investissement', horizon);
    } catch (error) {
      console.error('Erreur analyse prédictive investissements:', error);
      return this.getFallbackInvestissementPrediction(donnees, historique, horizon);
    }
  }

  /**
   * Analyse prédictive du plan d'amortissement - CORRIGÉE
   */
  async analyserAmortissementPrevision(donnees, historique, tauxActualisation = 0.1, horizon = 5) {
    try {
      // Si aucune clé API, retourner directement le fallback
      if (!this.useGemini && !this.useMistral) {
        return this.getFallbackAmortissementPrediction(donnees, horizon);
      }
      
      const prompt = this.buildAmortissementPrompt(donnees, historique, tauxActualisation, horizon);
      const prediction = await this.callAI(prompt);
      return this.parsePrediction(prediction, 'amortissement', horizon);
    } catch (error) {
      console.error('Erreur analyse prédictive amortissement:', error);
      return this.getFallbackAmortissementPrediction(donnees, horizon);
    }
  }

  /**
   * Analyse prédictive de l'état des immobilisations
   */
  async analyserImmobilisationsPrevision(donnees, historique, tendancesMarche = {}, horizon = 5) {
    try {
      if (!this.useGemini && !this.useMistral) {
        return this.getFallbackImmobilisationPrediction(donnees, horizon);
      }
      
      const prompt = this.buildImmobilisationPrompt(donnees, historique, tendancesMarche, horizon);
      const prediction = await this.callAI(prompt);
      return this.parsePrediction(prediction, 'immobilisation', horizon);
    } catch (error) {
      console.error('Erreur analyse prédictive immobilisations:', error);
      return this.getFallbackImmobilisationPrediction(donnees, horizon);
    }
  }

  /**
   * FALLBACK pour l'amortissement - CORRIGÉ
   */
  getFallbackAmortissementPrediction(donnees, horizon = 5) {
    console.log('📊 Génération fallback pour amortissement, horizon:', horizon);
    
    const valeurBrute = donnees.valeur_brute || 0;
    const annuite = donnees.annuite || (valeurBrute / 10); // Si pas d'annuité, supposer 10 ans
    const cumulActuel = donnees.cumul || 0;
    const vncActuelle = donnees.vnc || valeurBrute;
    
    const projections = [];
    let vncCourante = vncActuelle;
    let cumulCourant = cumulActuel;
    
    for (let i = 1; i <= horizon; i++) {
      vncCourante = Math.max(0, vncCourante - annuite);
      cumulCourant = cumulCourant + annuite;
      
      projections.push({
        annee: new Date().getFullYear() + i,
        annuite: Math.round(annuite),
        vnc: Math.round(vncCourante),
        cumul: Math.round(cumulCourant)
      });
    }
    
    const tauxAmortissement = valeurBrute > 0 ? (annuite / valeurBrute * 100).toFixed(1) : 0;
    
    return {
      confiance: 0.82,
      projections: projections,
      recommandations: [
        "💰 Provisionner pour le renouvellement des actifs dans 5 ans",
        "🔄 Planifier la mise à jour des équipements obsolètes",
        "📊 Réviser les durées d'amortissement annuellement",
        "🏗️ Envisager des investissements dans des actifs plus performants",
        "📈 Optimiser la stratégie de maintenance préventive"
      ],
      risques: [
        "🔴 Risque d'obsolescence accélérée des actifs technologiques",
        "🟠 Dépréciation non anticipée des actifs",
        "🟡 Changements réglementaires impactant les normes d'amortissement"
      ],
      metriques: {
        taux_amortissement_projete: parseFloat(tauxAmortissement),
        valeur_residuelle_finale: Math.round(vncCourante),
        besoin_renouvellement: Math.ceil((donnees.nombre_actifs || 0) * 0.3)
      }
    };
  }

  /**
   * FALLBACK pour les investissements - CORRIGÉ
   */
  getFallbackInvestissementPrediction(donnees, historique, horizon = 5) {
    console.log('📊 Génération fallback pour investissement, horizon:', horizon);
    
    // Calculer la tendance à partir de l'historique
    let tendance = 5.5; // Valeur par défaut
    if (historique && historique.length >= 2) {
      const dernieresValeurs = historique.slice(-3);
      const sommeVariation = dernieresValeurs.reduce((sum, item, idx) => {
        if (idx > 0) {
          const prev = dernieresValeurs[idx-1].realise || dernieresValeurs[idx-1].valeur || 0;
          const curr = item.realise || item.valeur || 0;
          if (prev > 0) return sum + ((curr - prev) / prev);
        }
        return sum;
      }, 0);
      tendance = (sommeVariation / (dernieresValeurs.length - 1)) * 100;
      if (isNaN(tendance)) tendance = 5.5;
    }
    
    const budgetInitial = donnees.budget_total || donnees.valeur_nette || 10000000;
    const realiseInitial = donnees.realise_total || donnees.valeur_nette || 9000000;
    
    const projections = [];
    for (let i = 1; i <= horizon; i++) {
      projections.push({
        annee: new Date().getFullYear() + i,
        budget: Math.round(budgetInitial * Math.pow(1 + tendance / 100, i)),
        realise: Math.round(realiseInitial * Math.pow(1 + (tendance - 1) / 100, i)),
        taux: Math.min(100, Math.round((realiseInitial / budgetInitial) * 100) + i)
      });
    }
    
    return {
      confiance: 0.78,
      projections: projections,
      recommandations: [
        "📈 Augmenter les investissements dans les secteurs porteurs",
        "🔄 Revoir la stratégie d'allocation budgétaire annuellement",
        "📊 Mettre en place des indicateurs de suivi trimestriel",
        "🏗️ Anticiper les besoins de financement",
        "💡 Former les équipes à la gestion financière"
      ],
      risques: [
        "🔴 Risque de dépassement budgétaire",
        "🟠 Volatilité des taux de change",
        "🟡 Inflation non maîtrisée"
      ],
      metriques: {
        croissance_annuelle_estimee: parseFloat(tendance.toFixed(1)),
        budget_projete_5ans: projections[projections.length - 1]?.budget || 0,
        realise_projete_5ans: projections[projections.length - 1]?.realise || 0
      }
    };
  }

  /**
   * FALLBACK pour les immobilisations - CORRIGÉ
   */
  getFallbackImmobilisationPrediction(donnees, horizon = 5) {
    console.log('📊 Génération fallback pour immobilisation, horizon:', horizon);
    
    const valeurInitiale = donnees.valeur_nette || 10000000;
    const croissance = 5.5; // 5.5% de croissance par an
    
    const projections = [];
    let valeurCourante = valeurInitiale;
    
    for (let i = 1; i <= horizon; i++) {
      valeurCourante = valeurCourante * (1 + croissance / 100);
      projections.push({
        annee: new Date().getFullYear() + i,
        valeur: Math.round(valeurCourante)
      });
    }
    
    return {
      confiance: 0.82,
      projections: projections,
      recommandations: [
        "💰 Augmenter les investissements dans les actifs technologiques",
        "🔄 Planifier le remplacement des équipements obsolètes d'ici 3 ans",
        "📊 Optimiser la stratégie de maintenance préventive",
        "🏗️ Envisager l'acquisition d'actifs écologiques",
        "📈 Suivre mensuellement l'évolution des valeurs de marché"
      ],
      risques: [
        "🔴 Risque d'obsolescence accélérée",
        "🟠 Volatilité des prix des matières premières",
        "🟡 Changements réglementaires possibles",
        "🔵 Concurrence accrue sur le marché"
      ],
      metriques: {
        croissance_annuelle_estimee: croissance,
        valeur_residuelle_projetee: projections[projections.length - 1]?.valeur || 0,
        besoin_renouvellement: Math.ceil((donnees.nombre_actifs || 0) * 0.25)
      }
    };
  }

  /**
   * Construire le prompt pour l'amortissement - CORRIGÉ
   */
  buildAmortissementPrompt(donnees, historique, tauxActualisation, horizon) {
    return `
Tu es un expert en gestion d'actifs et en planification des amortissements pour la BCC.

**SITUATION ACTUELLE DU PORTEFEUILLE D'ACTIFS:**
- Valeur brute totale: ${this.formatCurrency(donnees.valeur_brute || 0)}
- Amortissements annuels: ${this.formatCurrency(donnees.annuite || 0)}
- Amortissements cumulés: ${this.formatCurrency(donnees.cumul || 0)}
- Valeur nette comptable: ${this.formatCurrency(donnees.vnc || 0)}
- Nombre d'actifs: ${donnees.nombre_actifs || 0}

**HISTORIQUE (${historique?.length || 0} années):**
${historique?.slice(-5).map(h => `- ${h.annee}: Annuité=${this.formatCurrency(h.annuite)}, VNC=${this.formatCurrency(h.vnc)}`).join('\n') || 'Aucun historique disponible'}

**DEMANDE:**
Réalise une projection des amortissements sur les ${horizon} prochaines années.

Ta réponse doit inclure les projections par année, des recommandations et des risques.

Structure ta réponse en sections claires.
    `;
  }

  /**
   * Construire le prompt pour les investissements
   */
  buildInvestissementPrompt(donnees, historique, contexteMarche, horizon) {
    return `
Tu es un expert en analyse financière et en prévision des investissements.

**DONNÉES ACTUELLES:**
- Budget total: ${this.formatCurrency(donnees.budget_total || 0)}
- Réalisé total: ${this.formatCurrency(donnees.realise_total || 0)}
- Taux global: ${donnees.taux_global || 0}%

**HISTORIQUE (${historique?.length || 0} années):**
${historique?.slice(-5).map(h => `- ${h.annee}: Budget=${this.formatCurrency(h.budget)}, Réalisé=${this.formatCurrency(h.realise)}`).join('\n') || 'Aucun historique disponible'}

**DEMANDE:**
Effectue une analyse prédictive des investissements sur les ${horizon} prochaines années.
    `;
  }

  /**
   * Appeler l'IA (Gemini ou Mistral)
   */
  async callAI(prompt) {
    if (this.useGemini) {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } else if (this.useMistral) {
      const completion = await this.openai.chat.completions.create({
        model: "mistral-tiny",
        messages: [
          { role: "system", content: "Tu es un expert en analyse financière et en prévision." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      return completion.choices[0].message.content;
    }
    throw new Error('Aucun service IA configuré');
  }

  /**
   * Parser la réponse de l'IA
   */
  parsePrediction(response, type, horizon) {
    return {
      raw: response.substring(0, 500),
      type: type,
      confiance: 0.85,
      metriques: {},
      recommandations: this.extractRecommendations(response),
      risques: this.extractRisks(response),
      projections: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extraire les recommandations
   */
  extractRecommendations(response) {
    const recs = [];
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\.|^•|^\-|recommandation|préconisation/i) && line.length > 10 && line.length < 200) {
        recs.push(line.trim());
      }
    }
    return recs.slice(0, 8);
  }

  /**
   * Extraire les risques
   */
  extractRisks(response) {
    const risks = [];
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.match(/risque|danger|menace|incertitude/i) && line.length > 10 && line.length < 200) {
        risks.push(line.trim());
      }
    }
    return risks.slice(0, 5);
  }

  /**
   * Formater un montant
   */
  formatCurrency(value) {
    if (!value) return '0 FC';
    return `${Math.round(value).toLocaleString()} CDF`;
  }
}

module.exports = new PredictiveAIService();