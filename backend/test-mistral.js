const axios = require('axios');
require('dotenv').config();

async function test() {
  console.log('🔑 Test clé Mistral AI...');
  
  try {
    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: 'Bonjour, dis-moi bonjour en français' }],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Succès !');
    console.log('Réponse:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

test();