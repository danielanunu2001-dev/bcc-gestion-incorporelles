// backend/src/services/tauxChangeService.js - Version corrigée

const axios = require('axios');
const { Devise, TauxChange } = require('../models');

class TauxChangeService {
  constructor() {
    this.baseURL = 'https://api.frankfurter.dev/v2';
    this.cache = {
      rates: null,
      timestamp: null
    };
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.interval = null;
    this.CDF_BASE_RATE = 2850; // 1 USD = 2850 CDF
  }

  async fetchRatesFromFrankfurter(baseCurrency = 'USD') {
    try {
      console.log(`🌍 Appel API Frankfurter...`);
      const response = await axios.get(`${this.baseURL}/rates?base=${baseCurrency}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'BCC-App/1.0' }
      });

      if (response.data && Array.isArray(response.data)) {
        const ratesMap = {};
        response.data.forEach(rate => {
          if (rate.base === baseCurrency) {
            ratesMap[rate.quote] = rate.rate;
          }
        });
        return {
          success: true,
          base: baseCurrency,
          date: response.data[0]?.date || new Date().toISOString().split('T')[0],
          rates: ratesMap,
          source: 'frankfurter-api'
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur Frankfurter:', error.message);
      return null;
    }
  }

  async updateRatesInDatabase() {
    try {
      console.log('🔄 Mise à jour des taux de change...');
      
      // Récupérer les taux depuis Frankfurter
      const usdRates = await this.fetchRatesFromFrankfurter('USD');
      
      if (!usdRates || !usdRates.rates) {
        console.log('⚠️ Impossible de récupérer les taux, utilisation des valeurs existantes');
        return false;
      }

      // Mettre à jour chaque devise
      const devises = await Devise.findAll({ where: { actif: true } });
      
      for (const devise of devises) {
        let newRate = null;
        
        if (devise.code === 'CDF') {
          newRate = 1;
        } else if (devise.code === 'USD') {
          newRate = this.CDF_BASE_RATE;
        } else if (usdRates.rates[devise.code]) {
          newRate = this.CDF_BASE_RATE * usdRates.rates[devise.code];
        }
        
        if (newRate !== null) {
          const oldRate = parseFloat(devise.taux_moyen);
          
          // Calculer la variation uniquement si l'ancien taux est raisonnable
          let variation = 0;
          if (oldRate > 0 && oldRate < 1000000) { // Éviter les variations absurdes
            variation = ((newRate - oldRate) / oldRate) * 100;
            // Limiter la variation à +/- 100% max pour éviter les débordements
            variation = Math.min(Math.max(variation, -100), 100);
          }
          
          // Arrondir à 2 décimales
          variation = Math.round(variation * 100) / 100;
          
          await devise.update({
            taux_achat: Math.round(newRate * 0.995 * 100) / 100,
            taux_vente: Math.round(newRate * 1.005 * 100) / 100,
            taux_moyen: Math.round(newRate * 100) / 100,
            variation: variation,
            date_taux: new Date(),
            source: 'frankfurter-api'
          });
          
          console.log(`   ✅ ${devise.code}: ${oldRate.toFixed(2)} → ${newRate.toFixed(2)} (${variation > 0 ? '+' : ''}${variation.toFixed(2)}%)`);
        }
      }
      
      // Sauvegarder aussi dans la table taux_change pour l'historique
      await this.saveHistoricalRates(devises, usdRates.date);
      
      console.log('✅ Mise à jour des taux terminée');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur updateRatesInDatabase:', error);
      return false;
    }
  }

  async saveHistoricalRates(devises, date) {
  try {
    for (const devise of devises) {
      // Ne pas inclure la colonne 'actif' car elle n'existe pas dans taux_change
      await TauxChange.upsert({
        devise_id: devise.id,
        taux_cdf: parseFloat(devise.taux_moyen),
        date_taux: new Date(date),
        source: 'frankfurter-api'
        // La colonne 'actif' n'existe pas dans cette table
      });
    }
    console.log(`💾 ${devises.length} taux sauvegardés dans l'historique`);
  } catch (error) {
    // Ignorer l'erreur silencieusement car ce n'est pas critique
    // console.error('❌ Erreur sauvegarde historique:', error.message);
  }
}

  async getRatesFromDatabase() {
    try {
      const devises = await Devise.findAll({
        where: { actif: true },
        order: [['code', 'ASC']]
      });

      const rates = {};
      devises.forEach(devise => {
        rates[devise.code] = parseFloat(devise.taux_moyen);
      });
      
      return {
        success: true,
        rates,
        devises: devises.map(d => ({
          code: d.code,
          nom: d.nom,
          symbole: d.symbole,
          taux_achat: parseFloat(d.taux_achat),
          taux_vente: parseFloat(d.taux_vente),
          taux_moyen: parseFloat(d.taux_moyen),
          variation: parseFloat(d.variation) || 0,
          date_taux: d.date_taux
        })),
        source: 'database',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Erreur lecture base:', error);
      return this.getDefaultRates();
    }
  }

  getDefaultRates() {
    console.log('⚠️ Utilisation des taux par défaut');
    return {
      success: true,
      rates: { USD: 2850, EUR: 2435, GBP: 2104, CDF: 1 },
      devises: [
        { code: 'CDF', nom: 'Franc Congolais', symbole: 'FC', taux_moyen: 1, variation: 0 },
        { code: 'USD', nom: 'Dollar US', symbole: '$', taux_moyen: 2850, variation: 0 },
        { code: 'EUR', nom: 'Euro', symbole: '€', taux_moyen: 2435, variation: 0 }
      ],
      source: 'default',
      timestamp: Date.now()
    };
  }

  async getRatesInCDF() {
    try {
      const now = Date.now();
      if (this.cache.rates && (now - this.cache.timestamp) < this.cacheTTL) {
        return this.cache.rates;
      }

      // Essayer d'abord de mettre à jour depuis Frankfurter
      const updated = await this.updateRatesInDatabase();
      
      // Récupérer les taux depuis la base
      const dbRates = await this.getRatesFromDatabase();
      
      const result = {
        success: true,
        base: 'USD',
        targetBase: 'CDF',
        date: new Date().toISOString().split('T')[0],
        rates: dbRates.rates,
        devises: dbRates.devises,
        source: updated ? 'frankfurter-api' : dbRates.source,
        timestamp: now
      };

      this.cache.rates = result;
      this.cache.timestamp = now;

      return result;
    } catch (error) {
      console.error('❌ Erreur getRatesInCDF:', error);
      return this.getDefaultRates();
    }
  }

  async getProviders() {
    try {
      const response = await axios.get(`${this.baseURL}/providers`, { timeout: 5000 });
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur récupération providers:', error.message);
      return [];
    }
  }

  invalidateCache() {
    this.cache.rates = null;
    this.cache.timestamp = null;
    console.log('🔄 Cache des taux invalidé');
  }

  startAutoUpdate() {
    // Mise à jour initiale immédiate
    this.updateRatesInDatabase().catch(err => console.error('Erreur mise à jour initiale:', err));
    
    // Mise à jour toutes les 24 heures
    this.interval = setInterval(async () => {
      console.log('🔄 Mise à jour automatique des taux (24h)...');
      await this.updateRatesInDatabase();
    }, 24 * 60 * 60 * 1000);
    
    console.log('✅ Service taux Frankfurter démarré (mise à jour toutes les 24h)');
  }

  stopAutoUpdate() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Service taux Frankfurter arrêté');
    }
  }
}

module.exports = new TauxChangeService();