// backend/src/services/tauxService.js
const { Devise } = require('../models');

class TauxService {
    // Taux par défaut (avril 2025)
    static getTauxParDefaut(deviseCode) {
        const TAUX_DEFAUT = {
            'USD': 2450,
            'EUR': 2650,
            'GBP': 3100,
            'CNY': 340,
            'CDF': 1
        };
        return TAUX_DEFAUT[deviseCode] || 2450;
    }

    // Convertir un montant en CDF
    static async convertToCDF(montantDevise, deviseCode, dateAcquisition) {
        console.log(`💰 Conversion: ${montantDevise} ${deviseCode} -> CDF`);
        
        if (deviseCode === 'CDF') {
            return { montant_cdf: montantDevise, taux_utilise: 1, date_taux: dateAcquisition };
        }
        
        try {
            const devise = await Devise.findOne({ where: { code: deviseCode } });
            let tauxValue = this.getTauxParDefaut(deviseCode);
            
            if (devise && devise.taux_moyen && parseFloat(devise.taux_moyen) > 0) {
                tauxValue = parseFloat(devise.taux_moyen);
            }
            
            const montantCDF = montantDevise * tauxValue;
            console.log(`✅ ${montantDevise} ${deviseCode} = ${montantCDF.toLocaleString()} CDF (taux: ${tauxValue})`);
            
            return {
                montant_cdf: montantCDF,
                taux_utilise: tauxValue,
                date_taux: dateAcquisition || new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            console.error('❌ Erreur conversion:', error.message);
            const tauxValue = this.getTauxParDefaut(deviseCode);
            return {
                montant_cdf: montantDevise * tauxValue,
                taux_utilise: tauxValue,
                date_taux: new Date().toISOString().split('T')[0]
            };
        }
    }
    
    static async getTauxJour(deviseCode) {
        try {
            const devise = await Devise.findOne({ where: { code: deviseCode } });
            if (devise && devise.taux_moyen && parseFloat(devise.taux_moyen) > 0) {
                return parseFloat(devise.taux_moyen);
            }
            return this.getTauxParDefaut(deviseCode);
        } catch (error) {
            return this.getTauxParDefaut(deviseCode);
        }
    }
    
    static async updateTaux(deviseCode, tauxAchat, tauxVente, tauxMoyen) {
        const devise = await Devise.findOne({ where: { code: deviseCode } });
        if (!devise) throw new Error(`Devise ${deviseCode} non trouvée`);
        await devise.update({
            taux_achat: tauxAchat,
            taux_vente: tauxVente,
            taux_moyen: tauxMoyen,
            date_taux: new Date().toISOString().split('T')[0]
        });
        return devise;
    }
    
    static async initialize() { return true; }
    static startAutoUpdate() { console.log('💰 Service de taux démarré'); }
    static stopAutoUpdate() { console.log('💰 Service de taux arrêté'); }
}

module.exports = TauxService;