// backend/test-gemini.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test() {
  console.log('🔑 Test de la clé API Gemini...');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Essayer différents modèles
  const models = [
    "models/gemini-1.5-pro-latest",
    "models/gemini-1.5-flash-latest", 
    "gemini-1.5-pro",
    "gemini-pro"
  ];
  
  for (const modelName of models) {
    try {
      console.log(`\n📡 Test avec ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Dis 'OK'");
      console.log(`✅ ${modelName} fonctionne !`);
      console.log(`Réponse: ${result.response.text()}`);
      return;
    } catch (err) {
      console.log(`❌ ${modelName} échoue: ${err.message}`);
    }
  }
}

test();