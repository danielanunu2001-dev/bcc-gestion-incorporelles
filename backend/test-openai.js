const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  console.log('🔑 Clé API:', process.env.OPENAI_API_KEY ? 'Présente ✅' : 'Manquante ❌');
  console.log('📡 Test de connexion à OpenAI...');
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Dis "Bonjour, ça fonctionne !"' }
      ],
      max_tokens: 50,
    });
    
    console.log('✅ Succès:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

test();