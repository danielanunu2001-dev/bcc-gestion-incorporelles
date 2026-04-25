// backend/src/services/tauxService.js
const { Devise, TauxChange } = require('../models');
const { Op } = require('sequelize');

class TauxService {
    // Taux par défaut (décembre 2023)
    static getTauxParDefaut(deviseCode) {
        const TAUX_DEFAUT = {
            'USD': 2300,
            'EUR': 2600,
            'GBP': 3100,
            'CNY': 300
        };
        return TAUX_DEFAUT[deviseCode] || 2300;
    }

    // Convertir un montant en CDF
    static async convertToCDF(montantDevise, deviseCode, dateAcquisition) {
        if (deviseCode === 'CDF') {
            return { montant_cdf: montantDevise, taux_utilise: 1, date_taux: dateAcquisition };
        }
        
        // Gestion des dates antérieures à décembre 2023
        const dateLimite = new Date('2023-12-01');
        const dateAcquisitionObj = dateAcquisition ? new Date(dateAcquisition) : new Date();
        
        if (dateAcquisitionObj < dateLimite) {
            const tauxValue = this.getTauxParDefaut(deviseCode);
            console.log(`📅 Date ${dateAcquisition} antérieure à déc.2023, utilisation taux défaut: ${tauxValue}`);
            return {
                montant_cdf: montantDevise * tauxValue,
                taux_utilise: tauxValue,
                date_taux: '2023-12-01'
            };
        }
        
        // Trouver la devise avec ses taux
        const devise = await Devise.findOne({ 
            where: { code: deviseCode },
            attributes: ['id', 'code', 'nom', 'taux_achat', 'taux_vente', 'taux_moyen', 'date_taux']
        });
        
        // Si devise non trouvée, utiliser taux par défaut
        if (!devise) {
            const tauxValue = this.getTauxParDefaut(deviseCode);
            console.warn(`⚠️ Devise ${deviseCode} non trouvée, utilisation taux défaut: ${tauxValue}`);
            return {
                montant_cdf: montantDevise * tauxValue,
                taux_utilise: tauxValue,
                date_taux: dateAcquisition || new Date().toISOString().split('T')[0]
            };
        }
        
        // Chercher un taux historique dans la table TauxChange
        let tauxHistorique = null;
        if (dateAcquisition) {
            tauxHistorique = await TauxChange.findOne({
                where: {
                    devise_id: devise.id,
                    date_taux: dateAcquisition
                }
            });
            
            if (!tauxHistorique) {
                tauxHistorique = await TauxChange.findOne({
                    where: {
                        devise_id: devise.id,
                        date_taux: { [Op.lte]: dateAcquisition }
                    },
                    order: [['date_taux', 'DESC']]
                });
            }
        }
        
        let tauxValue;
        let dateTaux;
        
        if (tauxHistorique) {
            tauxValue = parseFloat(tauxHistorique.taux_cdf);
            dateTaux = tauxHistorique.date_taux;
            console.log(`✅ Taux historique trouvé pour ${deviseCode} à ${dateTaux}: ${tauxValue}`);
        } else {
            // Utiliser le taux moyen de la devise
            tauxValue = parseFloat(devise.taux_moyen);
            
            // Si le taux moyen est NaN ou 0, utiliser le taux d'achat
            if (isNaN(tauxValue) || tauxValue === 0) {
                tauxValue = parseFloat(devise.taux_achat);
            }
            
            // Si toujours pas de taux valide, utiliser taux par défaut
            if (isNaN(tauxValue) || tauxValue === 0) {
                tauxValue = this.getTauxParDefaut(deviseCode);
                console.warn(`⚠️ Aucun taux valide pour ${deviseCode}, utilisation taux défaut: ${tauxValue}`);
            }
            
            dateTaux = devise.date_taux || new Date().toISOString().split('T')[0];
        }
        
        const montantCDF = montantDevise * tauxValue;
        
        return {
            montant_cdf: montantCDF,
            taux_utilise: tauxValue,
            date_taux: dateTaux
        };
    }
    
    // Récupérer le taux du jour
    static async getTauxJour(deviseCode) {
        const devise = await Devise.findOne({ 
            where: { code: deviseCode },
            attributes: ['taux_achat', 'taux_vente', 'taux_moyen']
        });
        
        if (!devise) {
            return this.getTauxParDefaut(deviseCode);
        }
        
        let taux = parseFloat(devise.taux_moyen);
        if (isNaN(taux) || taux === 0) {
            taux = parseFloat(devise.taux_achat);
        }
        if (isNaN(taux) || taux === 0) {
            taux = this.getTauxParDefaut(deviseCode);
        }
        
        return taux;
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