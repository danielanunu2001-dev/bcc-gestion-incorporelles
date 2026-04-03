// backend/src/services/tauxService.js
const { Devise, TauxChange } = require('../models');
const { Op } = require('sequelize');

class TauxService {
    // Convertir un montant en CDF
    static async convertToCDF(montantDevise, deviseCode, dateAcquisition) {
        if (deviseCode === 'CDF') {
            return { montant_cdf: montantDevise, taux_utilise: 1, date_taux: dateAcquisition };
        }
        
        // Trouver la devise avec ses taux
        const devise = await Devise.findOne({ 
            where: { code: deviseCode },
            attributes: ['id', 'code', 'nom', 'taux_achat', 'taux_vente', 'taux_moyen']
        });
        
        if (!devise) {
            throw new Error(`Devise ${deviseCode} non trouvée`);
        }
        
        // Utiliser le taux moyen pour la conversion
        let tauxValue = parseFloat(devise.taux_moyen);
        
        // Si le taux moyen est NaN, utiliser le taux d'achat
        if (isNaN(tauxValue) || tauxValue === 0) {
            tauxValue = parseFloat(devise.taux_achat);
        }
        
        if (isNaN(tauxValue) || tauxValue === 0) {
            throw new Error(`Aucun taux valide trouvé pour ${deviseCode}`);
        }
        
        const montantCDF = montantDevise * tauxValue;
        
        return {
            montant_cdf: montantCDF,
            taux_utilise: tauxValue,
            date_taux: devise.date_taux || new Date().toISOString().split('T')[0]
        };
    }
    
    // Récupérer le taux du jour
    static async getTauxJour(deviseCode) {
        const devise = await Devise.findOne({ 
            where: { code: deviseCode },
            attributes: ['taux_achat', 'taux_vente', 'taux_moyen']
        });
        
        if (!devise) return null;
        
        let taux = parseFloat(devise.taux_moyen);
        if (isNaN(taux)) taux = parseFloat(devise.taux_achat);
        
        return isNaN(taux) ? null : taux;
    }
    
    // Mettre à jour les taux d'une devise
    static async updateTaux(deviseCode, tauxAchat, tauxVente, tauxMoyen) {
        const devise = await Devise.findOne({ where: { code: deviseCode } });
        if (!devise) {
            throw new Error(`Devise ${deviseCode} non trouvée`);
        }
        
        await devise.update({
            taux_achat: tauxAchat,
            taux_vente: tauxVente,
            taux_moyen: tauxMoyen,
            date_taux: new Date().toISOString().split('T')[0]
        });
        
        console.log(`✅ Taux ${deviseCode} mis à jour: Achat=${tauxAchat}, Vente=${tauxVente}, Moyen=${tauxMoyen}`);
        return devise;
    }
}

module.exports = TauxService;