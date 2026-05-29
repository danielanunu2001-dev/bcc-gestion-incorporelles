// backend/src/services/conformityAIService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
require('dotenv').config();

class ConformityAIService {
  constructor() {
    this.useGemini = !!process.env.GEMINI_API_KEY;
    this.useMistral = !!process.env.MISTRAL_API_KEY;
    
    if (this.useGemini) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log('✅ IA Conformité: Gemini initialisé');
    } else if (this.useMistral) {
      this.openai = new OpenAI({
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: 'https://api.mistral.ai/v1'
      });
      console.log('✅ IA Conformité: Mistral initialisé');
    } else {
      console.log('⚠️ IA Conformité: Aucune clé API trouvée, mode fallback');
    }
  }

  /**
   * Base de connaissances de conformité BCC/GCEC
   */
  getKnowledgeBase() {
    return {
      indicateurs: {
        "Plan comptable GCEC": {
          description: "Plan comptable harmonisé pour les entreprises congolaises",
          utilite: "Standardiser la présentation des états financiers, faciliter les comparaisons entre entreprises, garantir la transparence financière",
          consequences_positives: [
            "Amélioration de la qualité de l'information financière",
            "Comparabilité des comptes entre entités",
            "Réduction des risques d'erreurs comptables"
          ],
          consequences_negatives: [
            "Non-conformité: amendes pouvant aller jusqu'à 10 millions CDF",
            "Refus des états financiers par les auditeurs",
            "Pénalités fiscales majorées de 25%"
          ],
          seuil: 80,
          recommandations: "Former régulièrement le personnel et maintenir un manuel des procédures à jour"
        },
        "Clôture exercices": {
          description: "Processus de clôture annuelle des comptes",
          utilite: "Permet d'arrêter les comptes, déterminer le résultat, préparer les états financiers légaux",
          consequences_positives: [
            "Vision claire de la performance annuelle",
            "Base pour la déclaration fiscale",
            "Prise de décisions éclairée pour l'année suivante"
          ],
          consequences_negatives: [
            "Délais: astreinte de 5000 CDF/jour de retard",
            "Non-clôture: impossibilité de certifier les comptes",
            "Suspension des subventions BCC"
          ],
          seuil: 80,
          recommandations: "Planifier la clôture 3 mois à l'avance, utiliser un calendrier de clôture"
        },
        "Piste d'audit": {
          description: "Traçabilité complète de toutes les opérations",
          utilite: "Permet de retracer chaque transaction, garantir l'intégrité des données, faciliter les contrôles",
          consequences_positives: [
            "Traçabilité totale des modifications",
            "Détection rapide des anomalies",
            "Conformité avec les exigences des auditeurs externes"
          ],
          consequences_negatives: [
            "Absence de piste: nullité des opérations",
            "Risque de fraude non détectée",
            "Sanctions disciplinaires pour le responsable"
          ],
          seuil: 80,
          recommandations: "Conserver les logs minimum 10 ans, mettre en place des alertes de surveillance"
        },
        "Taux de change": {
          description: "Mise à jour quotidienne des taux de change BCC",
          utilite: "Valorisation correcte des transactions en devises, calcul précis des écarts de change",
          consequences_positives: [
            "Valorisation exacte des actifs en devises",
            "Réduction des risques de change",
            "Conformité avec IFRS"
          ],
          consequences_negatives: [
            "Taux obsolètes: redressement fiscal",
            "Différence de change non comptabilisée",
            "Ajustements forcés en fin d'exercice"
          ],
          seuil: 80,
          recommandations: "Automatiser la mise à jour quotidienne via API, conserver l'historique"
        },
        "Sécurité BCC": {
          description: "Mesures de sécurité des accès et des données",
          utilite: "Protéger les données sensibles, prévenir les accès non autorisés, garantir la confidentialité",
          consequences_positives: [
            "Protection des données stratégiques",
            "Réduction des risques de cyberattaques",
            "Conformité RGPD/LOGD"
          ],
          consequences_negatives: [
            "Faille de sécurité: suspension d'accès",
            "Perte de données: responsabilité pénale",
            "Amendes jusqu'à 50 millions CDF"
          ],
          seuil: 80,
          recommandations: "2FA obligatoire, audit de sécurité annuel, mots de passe robustes"
        },
        "Archivage légal": {
          description: "Conservation des documents selon la réglementation",
          utilite: "Garantir la disponibilité des preuves en cas de contrôle, respecter les délais légaux",
          consequences_positives: [
            "Preuves disponibles pour contrôles fiscaux",
            "Patrimoine informationnel préservé",
            "Conformité avec la loi sur les archives"
          ],
          consequences_negatives: [
            "Non-archivage: amende de 1% du CA",
            "Destruction anticipée: peine de prison 6 mois",
            "Documents non recevables en justice"
          ],
          seuil: 80,
          recommandations: "Archiver 10 ans minimum, utiliser format sécurisé horodaté"
        }
      },
      normes: {
        "IFRS": "Normes internationales d'information financière - Obligatoires pour les entités d'intérêt public",
        "GCEC": "Guide Comptable des Entreprises du Congo - Référentiel local harmonisé",
        "SYSCOA": "Système Comptable Ouest-Africain - Référence pour la sous-région",
        "LOGD": "Loi sur la Gouvernance des Données - Protection des données personnelles"
      },
      seuils: {
        "conforme": "≥ 80% - Situation satisfaisante",
        "attention": "50-79% - Nécessite une surveillance renforcée", 
        "critique": "< 50% - Action corrective immédiate requise"
      }
    };
  }

  /**
   * Générer une réponse contextuelle
   */
  async generateResponse(question, contexte = {}) {
    try {
      const knowledgeBase = this.getKnowledgeBase();
      
      // Analyser l'intention de la question
      const intent = this.analyzeIntent(question);
      
      // Construire le prompt
      const prompt = this.buildPrompt(question, intent, contexte, knowledgeBase);
      
      // Appeler l'IA appropriée
      let response;
      if (this.useGemini) {
        response = await this.callGemini(prompt);
      } else if (this.useMistral) {
        response = await this.callMistral(prompt);
      } else {
        response = this.getFallbackResponse(question, knowledgeBase);
      }
      
      return {
        success: true,
        reponse: response,
        intent: intent,
        source: this.useGemini ? "Gemini AI" : (this.useMistral ? "Mistral AI" : "Base de connaissances"),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Erreur IA Conformité:', error);
      return {
        success: false,
        reponse: "Désolé, je rencontre une difficulté technique. Veuillez réessayer ou consulter la documentation.",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyser l'intention de la question
   */
  analyzeIntent(question) {
    const q = question.toLowerCase();
    
    if (q.includes('quoi') || q.includes('c\'est quoi') || q.includes('définition')) {
      return 'definition';
    }
    if (q.includes('pourquoi') || q.includes('utilité') || q.includes('à quoi sert')) {
      return 'utilite';
    }
    if (q.includes('consequence') || q.includes('risque') || q.includes('si pas') || q.includes('sanction')) {
      return 'consequence';
    }
    if (q.includes('comment') || q.includes('améliorer') || q.includes('remédier')) {
      return 'action';
    }
    if (q.includes('seuil') || q.includes('note')) {
      return 'seuil';
    }
    if (q.includes('compara') || q.includes('différence')) {
      return 'comparaison';
    }
    return 'general';
  }

  /**
   * Construire le prompt pour l'IA
   */
  buildPrompt(question, intent, contexte, knowledgeBase) {
    let contexteStr = '';
    if (contexte.indicateur) {
      const data = knowledgeBase.indicateurs[contexte.indicateur];
      if (data) {
        contexteStr = `
Indicateur spécifique: ${contexte.indicateur}
- Description: ${data.description}
- Utilité: ${data.utilite}
- Conséquences positives: ${data.consequences_positives.join(', ')}
- Conséquences négatives: ${data.consequences_negatives.join(', ')}
- Seuil requis: ${data.seuil}%
- Recommandation: ${data.recommandations}
`;
      }
    }
    
    if (contexte.score !== undefined) {
      contexteStr += `\nScore actuel: ${contexte.score}% (${this.getScoreLevel(contexte.score)})`;
    }
    
    return `Tu es un expert en conformité financière pour la Banque Centrale du Congo (BCC) et le Guide Comptable des Entreprises du Congo (GCEC).

${contexteStr}

Question de l'utilisateur: "${question}"

Règles de réponse:
1. Sois précis, professionnel et bienveillant
2. Cite les textes officiels quand pertinent
3. Donne des exemples concrets
4. Propose des actions correctives si applicable
5. Structure ta réponse en paragraphes clairs
6. Termine par une recommandation pratique

Ta réponse:`;
  }

  /**
   * Appeler l'API Gemini
   */
  async callGemini(prompt) {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Appeler l'API Mistral
   */
  async callMistral(prompt) {
    const completion = await this.openai.chat.completions.create({
      model: "mistral-tiny",
      messages: [
        { role: "system", content: "Tu es un expert en conformité financière BCC/GCEC." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    return completion.choices[0].message.content;
  }

  /**
   * Réponse de fallback basée sur la base de connaissances
   */
  getFallbackResponse(question, knowledgeBase) {
    const q = question.toLowerCase();
    
    // Chercher l'indicateur concerné
    for (const [nom, data] of Object.entries(knowledgeBase.indicateurs)) {
      if (q.includes(nom.toLowerCase())) {
        return this.generateResponseForIndicator(nom, data, q);
      }
    }
    
    // Réponse générique
    return `📋 **Conformité BCC/GCEC**

${question}

Je vous invite à consulter les indicateurs suivants du tableau de bord:
${Object.keys(knowledgeBase.indicateurs).map(i => `- ${i}`).join('\n')}

Pour plus de détails, précisez l'indicateur qui vous intéresse.`;
  }

  /**
   * Générer réponse pour un indicateur spécifique
   */
  generateResponseForIndicator(nom, data, question) {
    const intent = this.analyzeIntent(question);
    
    let response = `## ${nom}\n\n`;
    response += `**📖 Définition:** ${data.description}\n\n`;
    
    if (intent === 'definition' || intent === 'general') {
      response += `**🎯 Utilité:** ${data.utilite}\n\n`;
    }
    
    if (intent === 'consequence' || intent === 'general') {
      response += `**✅ Conséquences positives de la conformité:**\n${data.consequences_positives.map(c => `- ${c}`).join('\n')}\n\n`;
      response += `**❌ Conséquences négatives de la non-conformité:**\n${data.consequences_negatives.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    
    if (intent === 'action' || intent === 'general') {
      response += `**💡 Recommandations:** ${data.recommandations}\n\n`;
    }
    
    response += `**📊 Seuil requis:** ${data.seuil}%\n`;
    response += `**🏷️ Statut:** ${data.seuil >= 80 ? '✅ Conforme' : (data.seuil >= 50 ? '⚠️ À surveiller' : '🔴 Critique')}`;
    
    return response;
  }

  /**
   * Obtenir le niveau du score
   */
  getScoreLevel(score) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Bon";
    if (score >= 40) return "Moyen";
    if (score >= 20) return "Faible";
    return "Critique";
  }
}

module.exports = new ConformityAIService();