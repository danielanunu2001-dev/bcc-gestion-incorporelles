// backend/src/services/aiContratService.js

const { Op } = require('sequelize');
const { Devise } = require('../models');

class AIContratService {
    // Taux de change par défaut (avril 2025)
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

    /**
     * Nettoie et parse un nombre écrit en français
     * Exemple: "2.500" -> 2500, "2,500.50" -> 2500.50
     */
    static parseFrenchNumber(value) {
        if (!value) return null;
        if (typeof value === 'number') return value;
        
        let stringValue = String(value).trim();
        
        // Détecter le format français: 1.234,56 ou 1.234
        const hasFrenchThousandSeparator = stringValue.match(/\d+\.\d{3}/);
        const hasFrenchDecimalComma = stringValue.match(/,\d+$/);
        
        if (hasFrenchThousandSeparator || hasFrenchDecimalComma) {
            // Format français: supprimer les points (séparateurs milliers) et remplacer virgule par point
            stringValue = stringValue.replace(/\./g, '');
            stringValue = stringValue.replace(/,/g, '.');
        } else {
            // Format anglais: supprimer les virgules (séparateurs milliers)
            stringValue = stringValue.replace(/,/g, '');
        }
        
        const result = parseFloat(stringValue);
        console.log(`📊 parseFrenchNumber: "${value}" → "${stringValue}" → ${result}`);
        return isNaN(result) ? null : result;
    }

    /**
     * Convertir un montant en CDF
     */
    static async convertToCDF(montantDevise, deviseCode, dateContrat) {
        console.log(`💰 Conversion contrat: ${montantDevise} ${deviseCode} -> CDF`);
        
        if (deviseCode === 'CDF') {
            return { montant_cdf: montantDevise, taux_utilise: 1, date_taux: dateContrat };
        }
        
        try {
            // Essayer de trouver la devise dans la base
            const devise = await Devise.findOne({ 
                where: { code: deviseCode }
            });
            
            let tauxValue = this.getTauxParDefaut(deviseCode);
            
            // Utiliser le taux de la devise si disponible
            if (devise && devise.taux_moyen && parseFloat(devise.taux_moyen) > 0) {
                tauxValue = parseFloat(devise.taux_moyen);
                console.log(`💰 Taux ${deviseCode}: ${tauxValue} (source: taux_moyen de la devise)`);
            } else {
                console.log(`💰 Taux ${deviseCode}: ${tauxValue} (source: taux par défaut)`);
            }
            
            const montantCDF = montantDevise * tauxValue;
            console.log(`💰 Résultat conversion contrat: ${montantDevise} ${deviseCode} = ${montantCDF.toLocaleString()} CDF`);
            
            return {
                montant_cdf: montantCDF,
                taux_utilise: tauxValue,
                date_taux: dateContrat || new Date().toISOString().split('T')[0]
            };
            
        } catch (error) {
            console.error('❌ Erreur conversion contrat:', error.message);
            const tauxValue = this.getTauxParDefaut(deviseCode);
            return {
                montant_cdf: montantDevise * tauxValue,
                taux_utilise: tauxValue,
                date_taux: new Date().toISOString().split('T')[0]
            };
        }
    }

    /**
     * Analyser un message utilisateur et extraire les informations du contrat
     */
    static async analyserMessage(message, context = {}) {
        console.log('🔍 Analyse IA du message contrat:', message);
        
        const messageLower = message.toLowerCase();
        
        // Structure de base du contrat
        const draft = {
            numero_contrat: null,
            type: 'licence',
            objet: null,
            date_debut: null,
            date_fin: null,
            montant: null,
            devise_code: 'CDF',
            montant_cdf: null,
            taux_change: null,
            fournisseur: null,
            client: null,
            description: message.substring(0, 500),
            periodicite: 'mensuelle',
            renouvellement_auto: false,
            preavis_jours: 30,
            contact_fournisseur: null,
            documents_associes: []
        };
        
        // Extraction du numéro de contrat
        let numMatch = message.match(/contrat\s*(?:n°|numero|n\.?)?\s*:?\s*["']?([A-Z0-9\-]+)["']?/i);
        if (numMatch) {
            draft.numero_contrat = numMatch[1];
        } else {
            // Générer un numéro basé sur le type
            const prefix = draft.type === 'licence' ? 'LIC' : draft.type === 'maintenance' ? 'MAI' : 'CTR';
            draft.numero_contrat = `${prefix}-${Math.floor(Math.random() * 10000)}`;
        }
        
        // Extraction du type de contrat
        if (messageLower.includes('licence') || messageLower.includes('license')) {
            draft.type = 'licence';
            draft.objet = 'Licence d\'utilisation de logiciel';
        } else if (messageLower.includes('maintenance')) {
            draft.type = 'maintenance';
            draft.objet = 'Contrat de maintenance';
        } else if (messageLower.includes('service') || messageLower.includes('prestation')) {
            draft.type = 'service';
            draft.objet = 'Prestation de services';
        } else if (messageLower.includes('location') || messageLower.includes('leasing')) {
            draft.type = 'location';
            draft.objet = 'Contrat de location';
        } else if (messageLower.includes('achat') || messageLower.includes('acquisition')) {
            draft.type = 'achat';
            draft.objet = 'Contrat d\'achat';
        } else {
            draft.type = 'licence';
            draft.objet = 'Contrat de licence';
        }
        
        // Extraction de l'objet personnalisé
        const objetMatch = message.match(/objet\s*(?:du contrat)?\s*:?\s*["']?([^"'\n,]+)["']?/i);
        if (objetMatch && objetMatch[1].length > 3) {
            draft.objet = objetMatch[1].trim();
        }
        
        // Extraction du fournisseur
        const fournisseurPatterns = [
            /fournisseur\s*:?\s*["']?([A-Za-z0-9\s\-]+)["']?/i,
            /prestataire\s*:?\s*["']?([A-Za-z0-9\s\-]+)["']?/i,
            /contractant\s*:?\s*["']?([A-Za-z0-9\s\-]+)["']?/i,
            /(?:avec|chez|de la part de)\s+["']?([A-Za-z0-9\s\-]+)["']?(?:\s+pour|\s+à|\s+le|$)/i,
            /(?:fournisseur|prestataire|contractant)\s+["']?([A-Za-z0-9\s\-]+)["']?/i
        ];
        
        for (const pattern of fournisseurPatterns) {
            const match = message.match(pattern);
            if (match && match[1] && match[1].length < 50 && match[1].length > 2) {
                draft.fournisseur = match[1].trim();
                break;
            }
        }
        
        // Extraction du montant
        const montantPatterns = [
            /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(USD|EUR|GBP|CDF|FC|dollars|euros|livres|francs)/i,
            /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*[\$€£]/i,
            /(?:montant|prix|coût|valeur)\s*(?:de|d'|à)?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)(?:\s*(USD|EUR|GBP|CDF|FC))?/i,
            /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:euros?|dollars?|livres?|francs?)\s*(?:par|pour|de)/i
        ];
        
        for (const pattern of montantPatterns) {
            const match = message.match(pattern);
            if (match) {
                const montant = this.parseFrenchNumber(match[1]);
                if (montant && montant > 0) {
                    draft.montant = montant;
                    
                    if (match[2]) {
                        let devise = match[2].toUpperCase();
                        if (devise === 'DOLLARS' || devise === 'DOLLAR') devise = 'USD';
                        if (devise === 'EUROS' || devise === 'EURO') devise = 'EUR';
                        if (devise === 'LIVRES' || devise === 'LIVRE') devise = 'GBP';
                        if (devise === 'FRANCS' || devise === 'FRANC' || devise === 'FC') devise = 'CDF';
                        draft.devise_code = devise;
                    } else if (match[0].includes('$')) {
                        draft.devise_code = 'USD';
                    } else if (match[0].includes('€')) {
                        draft.devise_code = 'EUR';
                    } else if (match[0].includes('£')) {
                        draft.devise_code = 'GBP';
                    }
                    
                    // Conversion en CDF
                    const conversion = await this.convertToCDF(montant, draft.devise_code, draft.date_debut);
                    draft.montant_cdf = conversion.montant_cdf;
                    draft.taux_change = conversion.taux_utilise;
                    
                    console.log(`💰 Montant extrait: ${montant} ${draft.devise_code} -> ${draft.montant_cdf} CDF`);
                    break;
                }
            }
        }
        
        // Extraction des dates
        const datePatterns = [
            { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, type: 'fr' },
            { pattern: /(\d{4})-(\d{2})-(\d{2})/, type: 'iso' },
            { pattern: /(?:du|le|début|à partir du)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i, type: 'debut' },
            { pattern: /(?:au|jusqu'au|fin)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i, type: 'fin' }
        ];
        
        const moisMap = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        };
        
        // Dates en toutes lettres
        const dateLettresPattern = /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i;
        const dateLettresMatch = message.match(dateLettresPattern);
        if (dateLettresMatch) {
            const jour = dateLettresMatch[1].padStart(2, '0');
            const mois = moisMap[dateLettresMatch[2].toLowerCase()];
            const annee = dateLettresMatch[3];
            const dateFormatee = `${annee}-${mois}-${jour}`;
            
            if (messageLower.includes('début') || messageLower.includes('du')) {
                draft.date_debut = dateFormatee;
            } else if (messageLower.includes('fin') || messageLower.includes('au')) {
                draft.date_fin = dateFormatee;
            } else if (!draft.date_debut) {
                draft.date_debut = dateFormatee;
            } else {
                draft.date_fin = dateFormatee;
            }
        }
        
        // Dates numériques
        for (const { pattern, type } of datePatterns) {
            const match = message.match(pattern);
            if (match && match[1] && match[2] && match[3]) {
                let jour, mois, annee;
                
                if (match[1].length === 4) { // Format AAAA-MM-JJ
                    annee = match[1];
                    mois = match[2].padStart(2, '0');
                    jour = match[3].padStart(2, '0');
                } else {
                    jour = match[1].padStart(2, '0');
                    mois = match[2].padStart(2, '0');
                    annee = match[3].length === 2 ? '20' + match[3] : match[3];
                }
                
                const dateFormatee = `${annee}-${mois}-${jour}`;
                
                if (type === 'debut' || (messageLower.includes('début') && !draft.date_debut)) {
                    draft.date_debut = dateFormatee;
                } else if (type === 'fin' || (messageLower.includes('fin') && !draft.date_fin)) {
                    draft.date_fin = dateFormatee;
                } else if (!draft.date_debut) {
                    draft.date_debut = dateFormatee;
                } else if (!draft.date_fin) {
                    draft.date_fin = dateFormatee;
                }
            }
        }
        
        // Dates par défaut
        if (!draft.date_debut) {
            draft.date_debut = new Date().toISOString().split('T')[0];
        }
        
        if (!draft.date_fin) {
            const dateFin = new Date(draft.date_debut);
            dateFin.setFullYear(dateFin.getFullYear() + 1);
            dateFin.setDate(dateFin.getDate() - 1);
            draft.date_fin = dateFin.toISOString().split('T')[0];
        }
        
        // Extraction de la périodicité
        if (messageLower.includes('mensuel') || messageLower.includes('chaque mois')) {
            draft.periodicite = 'mensuelle';
        } else if (messageLower.includes('trimestriel')) {
            draft.periodicite = 'trimestrielle';
        } else if (messageLower.includes('semestriel')) {
            draft.periodicite = 'semestrielle';
        } else if (messageLower.includes('annuel') || messageLower.includes('par an')) {
            draft.periodicite = 'annuelle';
        }
        
        // Extraction du renouvellement automatique
        if (messageLower.includes('renouvellement automatique') || messageLower.includes('tacite reconduction')) {
            draft.renouvellement_auto = true;
        }
        
        // Extraction du préavis
        const preavisMatch = message.match(/préavis\s*(?:de)?\s*(\d+)\s*(?:jours?|mois?)/i);
        if (preavisMatch) {
            draft.preavis_jours = parseInt(preavisMatch[1]);
            if (messageLower.includes('mois')) {
                draft.preavis_jours *= 30;
            }
        }
        
        // Extraction du contact fournisseur
        const contactMatch = message.match(/contact\s*(?:fournisseur)?\s*:?\s*["']?([^"'\n,]+)["']?(?:\s*\([^)]+\))?/i);
        if (contactMatch) {
            draft.contact_fournisseur = contactMatch[1].trim();
        }
        
        console.log('✅ Draft contrat généré:', {
            numero_contrat: draft.numero_contrat,
            type: draft.type,
            fournisseur: draft.fournisseur,
            montant: draft.montant,
            montant_cdf: draft.montant_cdf,
            devise: draft.devise_code,
            date_debut: draft.date_debut,
            date_fin: draft.date_fin
        });
        
        return draft;
    }

    /**
     * Valider un brouillon de contrat
     */
    static validerDraft(draft) {
        const anomalies = [];
        const warnings = [];
        
        if (!draft.numero_contrat || draft.numero_contrat.length < 3) {
            anomalies.push({
                field: 'numero_contrat',
                message: 'Le numéro de contrat doit contenir au moins 3 caractères',
                severity: 'high'
            });
        }
        
        if (!draft.fournisseur || draft.fournisseur.length < 2) {
            anomalies.push({
                field: 'fournisseur',
                message: 'Le nom du fournisseur est requis',
                severity: 'high'
            });
        }
        
        if (!draft.date_debut) {
            anomalies.push({
                field: 'date_debut',
                message: 'La date de début est requise',
                severity: 'high'
            });
        }
        
        if (!draft.date_fin) {
            anomalies.push({
                field: 'date_fin',
                message: 'La date de fin est requise',
                severity: 'high'
            });
        }
        
        if (draft.date_debut && draft.date_fin) {
            const dateDebut = new Date(draft.date_debut);
            const dateFin = new Date(draft.date_fin);
            if (dateFin <= dateDebut) {
                anomalies.push({
                    field: 'date_fin',
                    message: 'La date de fin doit être postérieure à la date de début',
                    severity: 'high'
                });
            }
        }
        
        const montant = parseFloat(draft.montant);
        if (isNaN(montant) || montant <= 0) {
            anomalies.push({
                field: 'montant',
                message: 'Le montant doit être un nombre positif',
                severity: 'high'
            });
        }
        
        if (draft.devise_code && !['CDF', 'USD', 'EUR', 'GBP'].includes(draft.devise_code)) {
            warnings.push({
                field: 'devise_code',
                message: `Devise non standard: ${draft.devise_code}. Utilisez CDF, USD, EUR ou GBP`,
                severity: 'low'
            });
        }
        
        const isValid = anomalies.filter(a => a.severity === 'high').length === 0;
        const score = Math.max(0, 100 - (anomalies.filter(a => a.severity === 'high').length * 15) - (warnings.length * 5));
        
        return {
            isValid,
            score: Math.min(100, score),
            anomalies,
            warnings
        };
    }

    /**
     * Générer des suggestions de correction
     */
    static genererSuggestions(draft, anomalies) {
        const suggestions = [];
        
        if (!draft.numero_contrat) {
            const prefix = draft.type === 'licence' ? 'LIC' : draft.type === 'maintenance' ? 'MAI' : 'CTR';
            suggestions.push({
                field: 'numero_contrat',
                current_value: null,
                corrected_value: `${prefix}-${Math.floor(Math.random() * 10000)}`,
                suggestion: `Numéro de contrat généré: ${prefix}-XXXX`,
                severity: 'medium',
                action: 'auto_fill'
            });
        }
        
        if (!draft.date_debut) {
            suggestions.push({
                field: 'date_debut',
                current_value: null,
                corrected_value: new Date().toISOString().split('T')[0],
                suggestion: 'Date de début: date du jour proposée',
                severity: 'medium',
                action: 'auto_fill'
            });
        }
        
        if (!draft.date_fin && draft.date_debut) {
            const dateFin = new Date(draft.date_debut);
            dateFin.setFullYear(dateFin.getFullYear() + 1);
            dateFin.setDate(dateFin.getDate() - 1);
            suggestions.push({
                field: 'date_fin',
                current_value: null,
                corrected_value: dateFin.toISOString().split('T')[0],
                suggestion: 'Date de fin proposée: 1 an après la date de début (moins 1 jour)',
                severity: 'medium',
                action: 'auto_fill'
            });
        }
        
        if (!draft.fournisseur) {
            suggestions.push({
                field: 'fournisseur',
                current_value: null,
                corrected_value: 'À définir',
                suggestion: 'Veuillez spécifier le nom du fournisseur',
                severity: 'high',
                action: 'manual'
            });
        }
        
        if ((!draft.montant || draft.montant <= 0) && draft.montant_cdf && draft.montant_cdf > 0) {
            suggestions.push({
                field: 'montant',
                current_value: null,
                corrected_value: draft.montant_cdf / (draft.taux_change || 2450),
                suggestion: `Montant recalculé à partir de ${draft.montant_cdf.toLocaleString()} CDF`,
                severity: 'low',
                action: 'auto_fill'
            });
        }
        
        if (draft.devise_code && draft.devise_code !== 'CDF' && !draft.montant_cdf && draft.montant) {
            const TAUX = { 'USD': 2450, 'EUR': 2650, 'GBP': 3100 };
            const taux = TAUX[draft.devise_code] || 2450;
            suggestions.push({
                field: 'montant_cdf',
                current_value: null,
                corrected_value: draft.montant * taux,
                suggestion: `Conversion automatique: ${draft.montant} ${draft.devise_code} = ${(draft.montant * taux).toLocaleString()} CDF`,
                severity: 'low',
                action: 'auto_fill'
            });
        }
        
        return suggestions;
    }

    /**
     * Récupérer le taux de change pour une date donnée
     */
    static async getTauxChange(deviseCode, date) {
        try {
            const devise = await Devise.findOne({ 
                where: { code: deviseCode }
            });
            
            if (devise && devise.taux_moyen && parseFloat(devise.taux_moyen) > 0) {
                return parseFloat(devise.taux_moyen);
            }
            return this.getTauxParDefaut(deviseCode);
        } catch (error) {
            return this.getTauxParDefaut(deviseCode);
        }
    }

    /**
     * Formater un contrat pour l'affichage
     */
    static formaterContratPourAffichage(contrat) {
        return {
            id: contrat.id,
            numero_contrat: contrat.numero_contrat,
            type: contrat.type,
            fournisseur: contrat.fournisseur,
            date_debut: contrat.date_debut,
            date_fin: contrat.date_fin,
            montant: contrat.montant,
            montant_formate: `${contrat.montant.toLocaleString()} FC`,
            description: contrat.description,
            statut: new Date(contrat.date_fin) > new Date() ? 'Actif' : 'Expiré',
            facture_pdf: contrat.facture_pdf,
            created_at: contrat.created_at
        };
    }
}

module.exports = AIContratService;