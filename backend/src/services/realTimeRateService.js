// backend/src/services/realTimeRateService.js

const axios = require('axios');

class RealTimeRateService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = null;
  }

  async getRate(deviseCode) {
    try {
      // Vérifier le cache (valable 1 heure)
      if (this.lastFetch && (Date.now() - this.lastFetch) < 3600000) {
        const cached = this.cache.get(deviseCode);
        if (cached) return cached;
      }
      
      // Appel API externe
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      const rates = response.data.rates;
      
      // Mettre en cache
      for (const [code, rate] of Object.entries(rates)) {
        this.cache.set(code, rate);
      }
      this.lastFetch = Date.now();
      
      return rates[deviseCode] || null;
    } catch (error) {
      console.error('❌ Erreur récupération taux temps réel:', error.message);
      return null;
    }
  }
  
  async getUSDToCDFRate() {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      return response.data.rates.CDF || 2850;
    } catch (error) {
      return 2850;
    }
  }
  
  async convert(devise, montant) {
    const rate = await this.getRate(devise);
    if (!rate) return null;
    return montant / rate * (await this.getUSDToCDFRate());
  }
}

module.exports = new RealTimeRateService();