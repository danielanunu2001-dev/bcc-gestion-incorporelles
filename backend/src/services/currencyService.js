// backend/src/services/currencyService.js

const axios = require('axios');
const logger = require('../config/logger');

class CurrencyService {
  constructor() {
    this.baseURL = 'https://api.frankfurter.dev/v2';
    this.cache = {
      rates: null,
      timestamp: null,
      currencies: null,
      currenciesTimestamp: null
    };
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    // Taux de base CDF (à mettre à jour périodiquement via API Banque Centrale)
    this.CDF_BASE_RATE = 2850; // 1 USD = 2850 CDF
    this.lastCDFUpdate = null;
    this.useFallback = false;
  }

  /**
   * Récupère la liste de toutes les devises disponibles
   */
  async getAvailableCurrencies() {
    const now = Date.now();
    
    // Vérifier le cache
    if (this.cache.currencies && (now - this.cache.currenciesTimestamp) < this.cacheTTL) {
      logger.debug('📦 Devises récupérées depuis le cache');
      return this.cache.currencies;
    }

    try {
      logger.info('🔄 Récupération des devises depuis l\'API...');
      const response = await axios.get(`${this.baseURL}/currencies`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data && Array.isArray(response.data)) {
        this.cache.currencies = response.data;
        this.cache.currenciesTimestamp = now;
        logger.info(`✅ ${response.data.length} devises récupérées avec succès`);
        return response.data;
      }
      throw new Error('Format de réponse invalide');
    } catch (error) {
      logger.error(`❌ Erreur récupération devises: ${error.message}`);
      // Fallback avec devises communes
      const fallbackCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'CDF'];
      logger.warn(`⚠️ Utilisation des devises de fallback: ${fallbackCurrencies.join(', ')}`);
      return this.cache.currencies || fallbackCurrencies;
    }
  }

  /**
   * Récupère les taux de change pour une devise de base spécifique
   * @param {string} baseCurrency - Devise de base (ex: 'USD')
   * @param {string[]} quoteCurrencies - Devises cibles (optionnel)
   * @returns {Promise<Object>} Taux de change
   */
  async getExchangeRates(baseCurrency = 'USD', quoteCurrencies = null) {
    const now = Date.now();
    
    // Vérifier le cache
    if (this.cache.rates && (now - this.cache.timestamp) < this.cacheTTL) {
      logger.debug(`📦 Taux ${baseCurrency} récupérés depuis le cache`);
      return this.cache.rates;
    }

    try {
      let url = `${this.baseURL}/latest?from=${baseCurrency}`;
      
      // Ajouter les devises cibles si spécifiées
      if (quoteCurrencies && quoteCurrencies.length > 0) {
        url += `&to=${quoteCurrencies.join(',')}`;
      }

      logger.info(`🔄 Récupération des taux ${baseCurrency} depuis l'API...`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data && response.data.rates) {
        const result = {
          base: response.data.base,
          date: response.data.date,
          rates: response.data.rates,
          timestamp: new Date().toISOString()
        };
        
        this.cache.rates = result;
        this.cache.timestamp = now;
        logger.info(`✅ Taux ${baseCurrency} récupérés: ${Object.keys(result.rates).length} devises`);
        return result;
      }
      
      throw new Error('Format de réponse invalide');
    } catch (error) {
      logger.error(`❌ Erreur récupération taux ${baseCurrency}: ${error.message}`);
      
      // Fallback avec taux approximatifs si l'API échoue
      if (!this.useFallback) {
        this.useFallback = true;
        logger.warn('⚠️ Activation du mode fallback pour les taux de change');
      }
      
      return this.getFallbackRates(baseCurrency);
    }
  }

  /**
   * Récupère les taux de fallback en cas d'erreur API
   * @param {string} baseCurrency - Devise de base
   * @returns {Object} Taux de fallback
   */
  getFallbackRates(baseCurrency) {
    const fallbackRates = {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 150.2,
      CHF: 0.88,
      CAD: 1.36,
      CDF: this.CDF_BASE_RATE
    };

    const result = {
      base: baseCurrency,
      date: new Date().toISOString().split('T')[0],
      rates: {},
      isFallback: true
    };

    if (baseCurrency === 'USD') {
      result.rates = { ...fallbackRates };
    } else if (baseCurrency === 'EUR') {
      result.rates = {
        USD: 1.09,
        GBP: 0.86,
        JPY: 163.5,
        CHF: 0.96,
        CAD: 1.48,
        CDF: this.CDF_BASE_RATE / 1.09
      };
    } else {
      result.rates = fallbackRates;
    }

    return result;
  }

  /**
   * Récupère un taux de change spécifique pour une paire de devises
   * @param {string} fromCurrency - Devise source
   * @param {string} toCurrency - Devise cible
   * @returns {Promise<Object>} Taux de change spécifique
   */
  async getSpecificRate(fromCurrency, toCurrency) {
    try {
      logger.debug(`🔍 Récupération taux ${fromCurrency}/${toCurrency}`);
      const response = await axios.get(`${this.baseURL}/latest?from=${fromCurrency}&to=${toCurrency}`, {
        timeout: 5000
      });
      
      if (response.data && response.data.rates && response.data.rates[toCurrency]) {
        return {
          from: fromCurrency,
          to: toCurrency,
          rate: response.data.rates[toCurrency],
          date: response.data.date,
          success: true
        };
      }
      return null;
    } catch (error) {
      logger.error(`❌ Erreur récupération taux ${fromCurrency}/${toCurrency}: ${error.message}`);
      return null;
    }
  }

  /**
   * Met à jour le taux CDF depuis une source fiable
   * @returns {Promise<boolean>} Succès de la mise à jour
   */
  async updateCDFRate() {
    try {
      // Tentative de récupération du taux CDF officiel
      // Idéalement, appeler une API de la Banque Centrale du Congo
      const response = await axios.get('https://api.bcc.cd/api/v1/exchange-rates', {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data && response.data.usd_to_cdf) {
        const newRate = parseFloat(response.data.usd_to_cdf);
        if (!isNaN(newRate) && newRate > 0) {
          this.CDF_BASE_RATE = newRate;
          this.lastCDFUpdate = new Date();
          logger.info(`✅ Taux CDF mis à jour: 1 USD = ${this.CDF_BASE_RATE} CDF`);
          this.invalidateCache();
          return true;
        }
      }
      throw new Error('Taux invalide');
    } catch (error) {
      logger.warn(`⚠️ Impossible de mettre à jour le taux CDF: ${error.message}`);
      logger.warn(`💡 Utilisation du taux par défaut: 1 USD = ${this.CDF_BASE_RATE} CDF`);
      return false;
    }
  }

  /**
   * Convertit les taux en CDF (Franc Congolais)
   * @returns {Promise<Object>} Taux convertis en CDF
   */
  async getRatesInCDF() {
    try {
      // Vérifier si le cache est encore valide
      const now = Date.now();
      if (this.cache.ratesCDF && (now - this.cache.cdfTimestamp) < this.cacheTTL) {
        logger.debug('📦 Taux CDF récupérés depuis le cache');
        return this.cache.ratesCDF;
      }

      // Mettre à jour le taux CDF si nécessaire
      if (!this.lastCDFUpdate || (now - this.lastCDFUpdate) > 3600000) { // 1 heure
        await this.updateCDFRate();
      }

      // Récupérer les taux depuis USD
      const usdRates = await this.getExchangeRates('USD');
      
      if (!usdRates || !usdRates.rates) {
        throw new Error('Impossible de récupérer les taux USD');
      }

      // Construire les taux en CDF
      const ratesInCDF = {
        CDF: 1,
        USD: this.CDF_BASE_RATE
      };

      // Convertir toutes les devises par rapport à l'USD
      for (const [currency, rateToUSD] of Object.entries(usdRates.rates)) {
        if (currency !== 'USD') {
          ratesInCDF[currency] = this.CDF_BASE_RATE * rateToUSD;
        }
      }

      const result = {
        success: true,
        base: 'USD',
        targetBase: 'CDF',
        date: usdRates.date,
        rates: ratesInCDF,
        source: usdRates.isFallback ? 'fallback' : 'frankfurter-api',
        cdfRate: this.CDF_BASE_RATE,
        cdfRateUpdated: this.lastCDFUpdate
      };

      // Mettre en cache
      this.cache.ratesCDF = result;
      this.cache.cdfTimestamp = now;

      logger.info(`✅ Taux CDF générés: ${Object.keys(ratesInCDF).length} devises`);
      return result;
    } catch (error) {
      logger.error(`❌ Erreur conversion en CDF: ${error.message}`);
      
      // Fallback avec taux de base
      return {
        success: false,
        base: 'USD',
        targetBase: 'CDF',
        date: new Date().toISOString().split('T')[0],
        rates: {
          CDF: 1,
          USD: this.CDF_BASE_RATE,
          EUR: this.CDF_BASE_RATE * 0.92,
          GBP: this.CDF_BASE_RATE * 0.79
        },
        source: 'fallback',
        isEmergencyFallback: true
      };
    }
  }

  /**
   * Convertit un montant d'une devise à une autre
   * @param {number} amount - Montant à convertir
   * @param {string} fromCurrency - Devise source
   * @param {string} toCurrency - Devise cible
   * @returns {Promise<Object>} Résultat de la conversion
   */
  async convertAmount(amount, fromCurrency, toCurrency) {
    try {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        throw new Error('Montant invalide');
      }

      if (fromCurrency === toCurrency) {
        return {
          originalAmount: numericAmount,
          originalCurrency: fromCurrency,
          convertedAmount: numericAmount,
          targetCurrency: toCurrency,
          rate: 1,
          success: true
        };
      }

      // Récupérer le taux spécifique
      const rateData = await this.getSpecificRate(fromCurrency, toCurrency);
      
      if (rateData && rateData.rate) {
        const converted = numericAmount * rateData.rate;
        return {
          originalAmount: numericAmount,
          originalCurrency: fromCurrency,
          convertedAmount: Math.round(converted * 100) / 100,
          targetCurrency: toCurrency,
          rate: rateData.rate,
          date: rateData.date,
          success: true
        };
      }

      // Fallback: utiliser la conversion via CDF
      const ratesCDF = await this.getRatesInCDF();
      if (ratesCDF.rates && ratesCDF.rates[fromCurrency] && ratesCDF.rates[toCurrency]) {
        const amountInCDF = numericAmount * ratesCDF.rates[fromCurrency];
        const converted = amountInCDF / ratesCDF.rates[toCurrency];
        return {
          originalAmount: numericAmount,
          originalCurrency: fromCurrency,
          convertedAmount: Math.round(converted * 100) / 100,
          targetCurrency: toCurrency,
          rate: converted / numericAmount,
          viaCDF: true,
          success: true
        };
      }

      throw new Error('Impossible de convertir');
    } catch (error) {
      logger.error(`❌ Erreur conversion ${amount} ${fromCurrency} -> ${toCurrency}: ${error.message}`);
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        targetCurrency: toCurrency,
        rate: null,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupère les informations sur les providers de données
   */
  async getProviders() {
    try {
      const response = await axios.get(`${this.baseURL}/providers`, { timeout: 3000 });
      return { providers: response.data, success: true };
    } catch (error) {
      logger.error(`❌ Erreur récupération providers: ${error.message}`);
      return { providers: [], success: false, error: error.message };
    }
  }

  /**
   * Vérifie la santé du service
   * @returns {Promise<Object>} Statut du service
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/latest?from=USD&to=EUR`, { timeout: 5000 });
      return {
        status: 'healthy',
        api: 'frankfurter',
        responseTime: response.duration,
        cacheStatus: !!this.cache.rates,
        cacheAge: this.cache.timestamp ? Date.now() - this.cache.timestamp : null,
        cdfRate: this.CDF_BASE_RATE,
        cdfRateFresh: this.lastCDFUpdate ? (Date.now() - this.lastCDFUpdate) < 3600000 : false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'degraded',
        api: 'frankfurter',
        error: error.message,
        cdfRate: this.CDF_BASE_RATE,
        usingFallback: this.useFallback,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Force l'invalidation du cache
   */
  invalidateCache() {
    this.cache = {
      rates: null,
      timestamp: null,
      currencies: null,
      currenciesTimestamp: null,
      ratesCDF: null,
      cdfTimestamp: null
    };
    logger.info('🔄 Cache des taux de change invalidé');
  }

  /**
   * Met à jour manuellement le taux CDF
   * @param {number} newRate - Nouveau taux USD/CDF
   */
  setCDFRate(newRate) {
    const rate = parseFloat(newRate);
    if (!isNaN(rate) && rate > 0) {
      this.CDF_BASE_RATE = rate;
      this.lastCDFUpdate = new Date();
      this.invalidateCache();
      logger.info(`✏️ Taux CDF mis à jour manuellement: 1 USD = ${this.CDF_BASE_RATE} CDF`);
      return true;
    }
    logger.error(`❌ Taux CDF invalide: ${newRate}`);
    return false;
  }
}

module.exports = new CurrencyService();