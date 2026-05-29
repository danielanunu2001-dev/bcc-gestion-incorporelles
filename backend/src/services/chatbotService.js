// backend/src/services/chatbotService.js

const axios = require('axios');

class ChatbotService {
  static async sendMessage(userMessage, conversationHistory = []) {
    try {
      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [
          { 
            role: 'system', 
            content: `Tu es un assistant expert de la Banque Centrale du Congo (BCC). 
Tu réponds en français de manière claire, précise et professionnelle.
Tu utilises des émojis pour rendre les réponses plus agréables (📊 💰 📄 🔧).
Tu connais les taux de change (USD, EUR, GBP, FCFA, etc.).
Tu es spécialisé dans :
- Gestion des actifs corporels et incorporels
- Calcul des amortissements (linéaire et dégressif)
- Gestion des contrats (licences, maintenances)
- Facturation et génération PDF
- Conversion des devises

Sois utile et précis.` 
          },
          ...conversationHistory.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const reply = response.data.choices[0].message.content;
      
      console.log(`🤖 Mistral AI a répondu (${reply.length} caractères)`);
      
      return {
        success: true,
        message: reply
      };
      
    } catch (error) {
      console.error('❌ Erreur Mistral AI:', error.response?.data || error.message);
      
      // Message d'erreur convivial
      return {
        success: false,
        message: "❌ Désolé, une erreur technique s'est produite. Veuillez réessayer dans quelques instants."
      };
    }
  }
}

module.exports = ChatbotService;