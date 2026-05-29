// backend/src/services/mistralService.js
const axios = require('axios');

class MistralAIService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseURL = 'https://api.mistral.ai/v1';
    console.log('🔧 Initialisation du service Mistral AI');
    console.log('📌 Clé API présente:', !!this.apiKey);
    console.log('📌 Longueur clé:', this.apiKey ? this.apiKey.length : 0);
  }

  async ask(prompt, options = {}) {
    if (!this.apiKey) {
      console.error('❌ Aucune clé API Mistral configurée');
      throw new Error('MISTRAL_API_KEY non configurée dans le fichier .env');
    }

    console.log('🤖 Envoi requête à Mistral AI...');
    console.log('📝 Prompt (début):', prompt.substring(0, 100));

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: options.model || 'mistral-tiny',
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.3,
          max_tokens: options.maxTokens || 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const answer = response.data.choices[0].message.content;
      console.log('✅ Réponse reçue de Mistral AI');
      return answer;
    } catch (error) {
      console.error('❌ Erreur Mistral API:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('   Message:', error.message);
      }
      throw new Error(`Erreur API Mistral: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async analyserAmortissements(actif, amortissements) {
    console.log('📊 analyseAmortissements appelée');
    console.log('   Actif:', actif.code);
    console.log('   Nb amortissements:', amortissements.length);

    const prompt = `
      Tu es un expert en comptabilité. Analyse ce plan d'amortissement:
      
      Actif: ${actif.nom} (${actif.code})
      Coût d'acquisition: ${actif.cout_acquisition} CDF
      Durée de vie utile: ${actif.duree_utile_ans} ans
      Mode: ${actif.mode_amortissement === 'lineaire' ? 'Linéaire' : 'Dégressif'}
      Valeur résiduelle: ${actif.valeur_residuelle || 0} CDF
      
      Amortissements annuels:
      ${amortissements.slice(0, 5).map(a => `- ${a.exercice}: ${a.annuite} CDF (cumul: ${a.cumul_amortissements} CDF)`).join('\n')}
      ${amortissements.length > 5 ? `... et ${amortissements.length - 5} autres années` : ''}
      
      Réponds UNIQUEMENT en JSON (sans aucun autre texte):
      {
        "est_coherent": true,
        "anomalies": [],
        "taux_moyen": "X%",
        "recommandations": [],
        "resume": "résumé en une phrase"
      }
    `;

    try {
      const response = await this.ask(prompt, { temperature: 0.2 });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Aucun JSON trouvé');
    } catch (error) {
      console.error('❌ Erreur analyse, utilisation fallback:', error.message);
      
      // Fallback avec calculs simples
      const totalAmorti = amortissements[amortissements.length - 1]?.cumul_amortissements || 0;
      const tauxMoyen = (totalAmorti / actif.cout_acquisition * 100 / amortissements.length).toFixed(1);
      
      return {
        est_coherent: true,
        anomalies: [],
        taux_moyen: `${tauxMoyen}%`,
        recommandations: [
          "Vérifiez les paramètres d'amortissement",
          "Assurez-vous que la durée est appropriée"
        ],
        resume: `Amortissement ${actif.mode_amortissement} sur ${actif.duree_utile_ans} ans.`
      };
    }
  }

  async assistantComptable(question, actif = null) {
    const actifInfo = actif ? `
      Informations sur l'actif:
      - Nom: ${actif.nom}
      - Code: ${actif.code}
      - Valeur brute: ${actif.cout_acquisition?.toLocaleString()} CDF
      - Valeur nette: ${actif.valeur_nette?.toLocaleString()} CDF
      - Durée: ${actif.duree_utile_ans} ans
    ` : 'Aucun actif spécifique sélectionné.';

    const prompt = `
      Tu es un expert-comptable en immobilisations.
      
      ${actifInfo}
      
      Question: "${question}"
      
      Réponds en français, de manière concise (max 3-4 phrases).
    `;

    return await this.ask(prompt, { temperature: 0.3, maxTokens: 300 });
  }

  async healthCheck() {
    try {
      await this.ask("Réponds par 'OK'", { maxTokens: 5 });
      return true;
    } catch (error) {
      console.error('Health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new MistralAIService();