// backend/src/services/auditAIService.js

const axios = require('axios');

class AuditAIService {
  constructor() {
    this.mistralApiKey = process.env.MISTRAL_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async analyzeAuditQuery(question, context) {
    try {
      const prompt = this.buildAuditPrompt(question, context);
      
      // Essayer d'abord avec Mistral AI
      if (this.mistralApiKey) {
        const response = await this.callMistralAPI(prompt);
        if (response) return response;
      }
      
      // Fallback avec Gemini
      if (this.geminiApiKey) {
        const response = await this.callGeminiAPI(prompt);
        if (response) return response;
      }
      
      // Fallback: analyse locale simple
      return this.localAnalysis(question, context);
      
    } catch (error) {
      console.error('❌ Erreur analyse IA:', error.message);
      return this.localAnalysis(question, context);
    }
  }

  buildAuditPrompt(question, context) {
    const { stats, totalLogs, currentFilters, logsSummary } = context;
    
    return `Tu es un assistant expert en audit pour la Banque Centrale du Congo (BCC).
    
Voici le contexte des logs d'audit actuel:
- Nombre total de logs: ${totalLogs || 0}
- Période: du ${currentFilters?.startDate || 'début'} au ${currentFilters?.endDate || 'aujourd\'hui'}
- Actions les plus fréquentes: ${JSON.stringify(stats?.parAction?.slice(0, 5) || [])}
- Tables les plus actives: ${JSON.stringify(stats?.parTable?.slice(0, 5) || [])}
- Dernières actions: ${JSON.stringify(logsSummary?.recentLogs?.slice(0, 5) || [])}

Question de l'utilisateur: "${question}"

Réponds de manière claire, précise et professionnelle. Si l'utilisateur demande des filtres spécifiques, propose-les.
Formate ta réponse en texte lisible.`;
  }

  async callMistralAPI(prompt) {
    try {
      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-tiny',
        messages: [
          { role: 'system', content: 'Tu es un assistant expert en audit de la Banque Centrale du Congo.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.mistralApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return {
        answer: response.data.choices[0].message.content,
        source: 'mistral'
      };
    } catch (error) {
      console.error('Erreur Mistral:', error.message);
      return null;
    }
  }

  async callGeminiAPI(prompt) {
    try {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }, {
        timeout: 10000
      });
      
      return {
        answer: response.data.candidates[0].content.parts[0].text,
        source: 'gemini'
      };
    } catch (error) {
      console.error('Erreur Gemini:', error.message);
      return null;
    }
  }

  localAnalysis(question, context) {
    const lowerQuestion = question.toLowerCase();
    const { stats, logsSummary, totalLogs } = context;
    
    let answer = "";
    
    // Analyse des suppressions
    if (lowerQuestion.includes('suppression') || lowerQuestion.includes('supprimer')) {
      const deleteCount = stats?.parAction?.find(a => a.action === 'DELETE')?.count || 0;
      answer = `📊 **Analyse des suppressions**\n\n`;
      answer += `- ${deleteCount} suppression(s) enregistrée(s) sur la période.\n`;
      
      const deleteLogs = logsSummary?.recentLogs?.filter(l => l.action === 'Suppression') || [];
      if (deleteLogs.length > 0) {
        answer += `- Dernières suppressions: ${deleteLogs.map(l => `${l.table} par ${l.user}`).join(', ')}\n`;
      }
    }
    
    // Analyse des réévaluations
    else if (lowerQuestion.includes('réévaluation') || lowerQuestion.includes('reevaluation')) {
      const reevalCount = stats?.parAction?.find(a => a.action === 'REEVALUATION')?.count || 0;
      answer = `📈 **Analyse des réévaluations**\n\n`;
      answer += `- ${reevalCount} réévaluation(s) effectuée(s) sur la période.\n`;
    }
    
    // Analyse des dépréciations
    else if (lowerQuestion.includes('dépréciation') || lowerQuestion.includes('depreciation')) {
      const deprCount = stats?.parAction?.find(a => a.action === 'DEPRECIATION')?.count || 0;
      answer = `📉 **Analyse des dépréciations**\n\n`;
      answer += `- ${deprCount} dépréciation(s) enregistrée(s) sur la période.\n`;
    }
    
    // Analyse des modifications
    else if (lowerQuestion.includes('modification') || lowerQuestion.includes('update')) {
      const updateCount = stats?.parAction?.find(a => a.action === 'UPDATE')?.count || 0;
      const createCount = stats?.parAction?.find(a => a.action === 'CREATE')?.count || 0;
      answer = `✏️ **Analyse des modifications**\n\n`;
      answer += `- ${updateCount} modification(s) enregistrée(s)\n`;
      answer += `- ${createCount} création(s) enregistrée(s)\n`;
    }
    
    // Résumé général
    else if (lowerQuestion.includes('résumé') || lowerQuestion.includes('resume') || lowerQuestion.includes('activité')) {
      answer = `📋 **Résumé de l'activité d'audit**\n\n`;
      answer += `- Total d'actions: ${totalLogs || 0}\n\n`;
      answer += `**Répartition par action:**\n`;
      stats?.parAction?.forEach(a => {
        answer += `- ${a.action}: ${a.count} action(s)\n`;
      });
      answer += `\n**Tables les plus actives:**\n`;
      stats?.parTable?.slice(0, 5).forEach(t => {
        answer += `- ${t.table}: ${t.count} action(s)\n`;
      });
    }
    
    // Détection d'anomalies
    else if (lowerQuestion.includes('anomalie') || lowerQuestion.includes('suspect')) {
      const deleteCount = stats?.parAction?.find(a => a.action === 'DELETE')?.count || 0;
      const nightActions = logsSummary?.recentLogs?.filter(l => {
        const hour = new Date(l.date).getHours();
        return hour < 6 || hour > 22;
      }) || [];
      
      answer = `🔍 **Détection d'anomalies potentielles**\n\n`;
      if (deleteCount > 10) {
        answer += `- ⚠️ Nombre élevé de suppressions: ${deleteCount}\n`;
      }
      if (nightActions.length > 0) {
        answer += `- 🌙 ${nightActions.length} action(s) effectuée(s) en dehors des heures ouvrables\n`;
      }
      if (deleteCount <= 10 && nightActions.length === 0) {
        answer += `- ✅ Aucune anomalie majeure détectée dans la période\n`;
      }
    }
    
    // Par défaut - analyse générale
    else {
      const deleteCount = stats?.parAction?.find(a => a.action === 'DELETE')?.count || 0;
      const createCount = stats?.parAction?.find(a => a.action === 'CREATE')?.count || 0;
      const updateCount = stats?.parAction?.find(a => a.action === 'UPDATE')?.count || 0;
      
      answer = `📊 **Analyse de l'audit**\n\n`;
      answer += `- Période analysée: ${context.currentFilters?.startDate || 'début'} → ${context.currentFilters?.endDate || 'aujourd\'hui'}\n`;
      answer += `- Total d'actions: ${totalLogs || 0}\n\n`;
      answer += `**Activité détaillée:**\n`;
      answer += `- ➕ Créations: ${createCount}\n`;
      answer += `- ✏️ Modifications: ${updateCount}\n`;
      answer += `- 🗑️ Suppressions: ${deleteCount}\n`;
      
      if (stats?.parAction?.length > 3) {
        answer += `\n**Autres actions:**\n`;
        stats.parAction.slice(3).forEach(a => {
          answer += `- ${a.action}: ${a.count}\n`;
        });
      }
      
      answer += `\n💡 **Conseil:** Utilisez les filtres pour affiner votre recherche par table ou par utilisateur.`;
    }
    
    return { answer, source: 'local' };
  }

  extractSuggestedFilters(analysis, question) {
    const suggestedFilters = {};
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('suppression') || lowerQuestion.includes('delete')) {
      suggestedFilters.action = 'DELETE';
    }
    if (lowerQuestion.includes('réévaluation') || lowerQuestion.includes('reevaluation')) {
      suggestedFilters.action = 'REEVALUATION';
    }
    if (lowerQuestion.includes('dépréciation') || lowerQuestion.includes('depreciation')) {
      suggestedFilters.action = 'DEPRECIATION';
    }
    if (lowerQuestion.includes('modification') || lowerQuestion.includes('update')) {
      suggestedFilters.action = 'UPDATE';
    }
    if (lowerQuestion.includes('création') || lowerQuestion.includes('create')) {
      suggestedFilters.action = 'CREATE';
    }
    if (lowerQuestion.includes('actif')) {
      suggestedFilters.table = 'actifs';
    }
    if (lowerQuestion.includes('utilisateur') || lowerQuestion.includes('user')) {
      suggestedFilters.table = 'users';
    }
    if (lowerQuestion.includes('contrat')) {
      suggestedFilters.table = 'contrats';
    }
    
    return suggestedFilters;
  }
}

module.exports = new AuditAIService();