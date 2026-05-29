// backend/src/services/exchangeRateService.js

const axios = require('axios');
const { Devise, TauxChange } = require('../models');

class ExchangeRateService {
  constructor() {
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
    this.baseURL = 'https://v6.exchangerate-api.com/v6';
    this.cache = {
      rates: null,
      timestamp: null
    };
    this.cacheTTL = 5 * 60 * 1000;
    this.interval = null;
  }

  async fetchRealRates() {
    try {
      if (!this.apiKey) {
        console.error('❌ Clé API ExchangeRate manquante');
        return null;
      }

      console.log('🌍 Appel API ExchangeRate pour taux réels...');
      const response = await axios.get(`${this.baseURL}/${this.apiKey}/latest/USD`, {
        timeout: 10000
      });

      if (response.data && response.data.result === 'success') {
        const rates = response.data.conversion_rates;
        
        console.log('📊 Taux réels reçus:');
        console.log(`   ✅ USD → CDF: 1 USD = ${rates.CDF} CDF`);
        console.log(`   ✅ USD → EUR: 1 USD = ${rates.EUR} EUR (donc 1 EUR = ${(1/rates.EUR).toFixed(4)} USD)`);
        console.log(`   ✅ USD → GBP: 1 USD = ${rates.GBP} GBP (donc 1 GBP = ${(1/rates.GBP).toFixed(4)} USD)`);
        
        return {
          success: true,
          base: 'USD',
          date: response.data.time_last_update_utc,
          rates: rates,
          source: 'exchangerate-api'
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur ExchangeRate API:', error.message);
      return null;
    }
  }

  async updateRatesInDatabase() {
    try {
      console.log('\n🔄 Mise à jour des taux avec API ExchangeRate...');
      
      const realRates = await this.fetchRealRates();
      
      if (!realRates || !realRates.rates) {
        console.log('⚠️ Impossible de récupérer les taux réels');
        return false;
      }

      const devises = await Devise.findAll({ where: { actif: true } });
      const rates = realRates.rates;
      
      // Taux USD → CDF depuis l'API
      const usdToCdf = rates.CDF;
      
      console.log(`\n💰 Taux de référence: 1 USD = ${usdToCdf} CDF\n`);
      
      for (const devise of devises) {
        let newRate = null;
        
        if (devise.code === 'CDF') {
          newRate = 1;
          console.log(`   📌 ${devise.code}: 1 CDF = 1 CDF (devise de base)`);
        } 
        else if (devise.code === 'USD') {
          newRate = usdToCdf;
          console.log(`   📌 ${devise.code}: 1 USD = ${newRate.toFixed(2)} CDF (taux direct API)`);
        } 
        else if (rates[devise.code]) {
          // ✅ CORRECTION IMPORTANTE:
          // L'API donne "1 USD = X devise"
          // Donc pour obtenir "1 devise = ? USD", on prend l'inverse: 1 / X
          // Ensuite on convertit en CDF
          const usdRate = 1 / rates[devise.code];
          newRate = usdToCdf * usdRate;
          console.log(`   📌 ${devise.code}: 1 ${devise.code} = ${usdRate.toFixed(4)} USD → ${newRate.toFixed(2)} CDF`);
        }
        
        if (newRate !== null) {
          const oldRate = parseFloat(devise.taux_moyen);
          const variation = oldRate > 0 ? ((newRate - oldRate) / oldRate) * 100 : 0;
          
          await devise.update({
            taux_achat: newRate * 0.995,
            taux_vente: newRate * 1.005,
            taux_moyen: newRate,
            variation: parseFloat(variation.toFixed(2)),
            date_taux: new Date(),
            source: 'exchangerate-api'
          });
        }
      }
      
      await this.saveHistoricalRates(devises);
      
      console.log('\n✅ Mise à jour terminée avec les taux réels');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur updateRatesInDatabase:', error);
      return false;
    }
  }

  async saveHistoricalRates(devises) {
    try {
      for (const devise of devises) {
        await TauxChange.upsert({
          devise_id: devise.id,
          taux_cdf: parseFloat(devise.taux_moyen),
          date_taux: new Date(),
          source: 'exchangerate-api'
        });
      }
      console.log(`💾 ${devises.length} taux sauvegardés dans l'historique`);
    } catch (error) {
      // Non critique
    }
  }

  async getRatesForDisplay() {
    try {
      const now = Date.now();
      if (this.cache.rates && (now - this.cache.timestamp) < this.cacheTTL) {
        return this.cache.rates;
      }

      await this.updateRatesInDatabase();
      
      const devises = await Devise.findAll({
        where: { actif: true },
        attributes: ['code', 'nom', 'symbole', 'taux_moyen', 'variation', 'date_taux'],
        order: [['code', 'ASC']]
      });

      const rates = {};
      devises.forEach(d => {
        rates[d.code] = parseFloat(d.taux_moyen);
      });

      const result = {
        success: true,
        base: 'USD',
        date: new Date().toISOString().split('T')[0],
        rates: rates,
        devises: devises,
        source: 'exchangerate-api',
        timestamp: now
      };

      this.cache.rates = result;
      this.cache.timestamp = now;

      return result;
    } catch (error) {
      console.error('❌ Erreur getRatesForDisplay:', error);
      return null;
    }
  }

  async getProviders() {
    return [{ key: 'exchangerate-api', name: 'ExchangeRate-API' }];
  }

  invalidateCache() {
    this.cache.rates = null;
    this.cache.timestamp = null;
    console.log('🔄 Cache des taux invalidé');
  }

  startAutoUpdate() {
    console.log('🚀 Démarrage du service ExchangeRate API...');
    this.updateRatesInDatabase();
    this.interval = setInterval(async () => {
      console.log('\n🔄 Mise à jour automatique des taux (cycle 24h)...');
      await this.updateRatesInDatabase();
    }, 24 * 60 * 60 * 1000);
    console.log('✅ Service ExchangeRate API démarré (mise à jour toutes les 24h)');
  }

  stopAutoUpdate() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Service ExchangeRate API arrêté');
    }
  }
}

module.exports = new ExchangeRateService();