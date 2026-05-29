// backend/src/config/mistral.js
// Ce fichier est simplifié car on n'a plus besoin de client spécifique

if (!process.env.MISTRAL_API_KEY) {
  console.warn('⚠️ MISTRAL_API_KEY non définie dans .env');
}

module.exports = {
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1'
};