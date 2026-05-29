// frontend/src/services/aiService.js
import api from './api';

const aiService = {
  /**
   * Analyser un actif avec l'IA (détection d'anomalies, cohérence)
   * @param {string} actifId - ID de l'actif à analyser
   * @returns {Promise<object>} Analyse complète avec anomalies et recommandations
   */
  async analyserActif(actifId) {
    try {
      // ✅ CORRECTION: Utiliser la route existante
      const response = await api.get(`/actifs/ia/anomalies/${actifId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur analyse actif:', error);
      throw error;
    }
  },
  
  /**
   * Poser une question à l'assistant comptable
   * @param {string} question - Question posée par l'utilisateur
   * @param {string|null} actifId - ID de l'actif (optionnel, pour contexte)
   * @returns {Promise<object>} Réponse de l'assistant
   */
  async askAssistant(question, actifId = null) {
    try {
      const response = await api.post('/ai/assistant', { question, actifId });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur assistant IA:', error);
      throw error;
    }
  },
  
  /**
   * Obtenir le résumé du tableau de bord
   * @returns {Promise<object>} Résumé des indicateurs clés
   */
  async getDashboardResume() {
    try {
      const response = await api.get('/ai/dashboard-resume');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur résumé dashboard:', error);
      throw error;
    }
  },
  
  /**
   * Vérifier le statut du service IA
   * @returns {Promise<object>} Statut du service
   */
  async healthCheck() {
    try {
      const response = await api.get('/ai/health');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur health check IA:', error);
      return { status: 'unavailable', message: 'Service IA indisponible' };
    }
  },

  // ==================== FONCTIONS POUR LA CRÉATION ASSISTÉE D'ACTIFS ====================

  /**
   * Générer un brouillon d'actif à partir d'une conversation
   * @param {Array} conversation - Historique de la conversation [{role, content}]
   * @param {Object} context - Contexte additionnel (devises, catégories existantes...)
   * @returns {Promise<object>} Brouillon d'actif généré par l'IA
   */
  async generateActifDraft(conversation, context = {}) {
    try {
      const response = await api.post('/actifs/ia/generate', {
        conversation,
        context: {
          availableDevises: context.devises || [],
          availableCategories: context.categories || [],
          existingCodes: context.existingCodes || [],
          ...context
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération brouillon IA:', error);
      throw error;
    }
  },

  /**
   * Valider un brouillon d'actif avec l'IA
   * @param {Object} draft - Brouillon d'actif à valider
   * @returns {Promise<object>} Résultat de validation (anomalies, suggestions)
   */
  async validateActifDraft(draft) {
    try {
      const response = await api.post('/actifs/ia/validate', { draft });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur validation brouillon IA:', error);
      throw error;
    }
  },

  /**
   * Obtenir des suggestions de correction pour un brouillon d'actif
   * @param {Object} draft - Brouillon d'actif
   * @param {Array} anomalies - Liste des anomalies détectées
   * @returns {Promise<object>} Suggestions de correction
   */
  async getCorrectionSuggestions(draft, anomalies) {
    try {
      const response = await api.post('/actifs/ia/suggest', { draft, anomalies });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur suggestions correction IA:', error);
      throw error;
    }
  },

  /**
   * Créer un actif à partir d'un brouillon validé par l'IA
   * @param {Object} draft - Brouillon d'actif validé
   * @returns {Promise<object>} Actif créé
   */
  async createFromAIDraft(draft) {
    try {
      const response = await api.post('/actifs/ia/create-from-draft', draft);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur création depuis brouillon IA:', error);
      throw error;
    }
  },

  /**
   * Détecter les anomalies sur un actif existant
   * @param {string} actifId - ID de l'actif à analyser
   * @returns {Promise<object>} Anomalies détectées avec recommandations
   */
  async detectAnomalies(actifId) {
    try {
      // ✅ CORRECTION: Utiliser la route existante
      const response = await api.get(`/actifs/ia/anomalies/${actifId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur détection anomalies IA:', error);
      throw error;
    }
  },

  /**
   * Générer un code d'actif unique avec l'IA
   * @param {string} baseName - Nom de base pour le code
   * @param {Array} existingCodes - Codes existants pour éviter les doublons
   * @returns {Promise<object>} Code généré
   */
  async generateActifCode(baseName, existingCodes = []) {
    try {
      const response = await api.post('/ai/generate-code', { baseName, existingCodes });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération code IA:', error);
      const prefix = baseName.substring(0, 3).toUpperCase();
      const number = existingCodes.length + 1;
      return { code: `${prefix}-${String(number).padStart(3, '0')}` };
    }
  },

  /**
   * Vérifier la cohérence des amortissements d'un actif
   * @param {Object} actifData - Données de l'actif
   * @param {Array} amortissements - Liste des amortissements existants
   * @returns {Promise<object>} Analyse de cohérence
   */
  async verifierCohérenceAmortissements(actifData, amortissements) {
    try {
      const response = await api.post('/ai/verifier-amortissements', {
        actif: actifData,
        amortissements
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur vérification amortissements IA:', error);
      return {
        est_coherent: true,
        anomalies: [],
        recommandations: []
      };
    }
  },

  /**
   * Suggérer un taux d'amortissement optimal
   * @param {Object} actifData - Données de l'actif (type, durée, catégorie)
   * @returns {Promise<object>} Taux suggéré et justification
   */
  async suggererTauxAmortissement(actifData) {
    try {
      const response = await api.post('/ai/suggerer-taux', actifData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur suggestion taux IA:', error);
      const taux = 100 / (actifData.duree_utile_ans || 5);
      return {
        taux_suggere: parseFloat(taux.toFixed(2)),
        justification: "Calcul basé sur la durée d'utilité standard",
        methode: "linéaire"
      };
    }
  },

  /**
   * Analyser la conversation et extraire les informations d'actif
   * @param {Array} conversation - Historique de la conversation
   * @returns {Promise<object>} Informations extraites
   */
  async extraireInfosActif(conversation) {
    try {
      const response = await api.post('/ai/extraire-infos', { conversation });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur extraction infos IA:', error);
      throw error;
    }
  },

  /**
   * Générer un rapport d'analyse complet pour un actif
   * @param {string} actifId - ID de l'actif
   * @returns {Promise<object>} Rapport d'analyse
   */
  async genererRapportAnalyse(actifId) {
    try {
      // ✅ CORRECTION: Utiliser la route existante
      const response = await api.get(`/actifs/ia/anomalies/${actifId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération rapport IA:', error);
      throw error;
    }
  },

  /**
   * Comparer un actif avec les standards du secteur
   * @param {Object} actifData - Données de l'actif
   * @returns {Promise<object>} Comparaison sectorielle
   */
  async comparerAvecStandards(actifData) {
    try {
      const response = await api.post('/ai/comparer-standards', actifData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur comparaison standards IA:', error);
      return {
        message: "Comparaison non disponible actuellement",
        recommandations: []
      };
    }
  },

  // ==================== FONCTIONS POUR LES CONTRATS ====================

  /**
   * Générer un brouillon de contrat à partir d'une conversation
   * @param {Array} conversation - Historique de la conversation [{role, content}]
   * @param {Object} context - Contexte additionnel (actif_id, contrats existants...)
   * @returns {Promise<object>} Brouillon de contrat généré par l'IA
   */
  async generateContratDraft(conversation, context = {}) {
    try {
      const response = await api.post('/contrats/ia/generate', {
        conversation,
        context: {
          actif_id: context.actifId || null,
          existingContrats: context.existingContrats || [],
          ...context
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération brouillon contrat IA:', error);
      throw error;
    }
  },

  /**
   * Valider un brouillon de contrat avec l'IA
   * @param {Object} draft - Brouillon de contrat à valider
   * @returns {Promise<object>} Résultat de validation (anomalies, suggestions)
   */
  async validateContratDraft(draft) {
    try {
      const response = await api.post('/contrats/ia/validate', { draft });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur validation brouillon contrat IA:', error);
      throw error;
    }
  },

  /**
   * Obtenir des suggestions de correction pour un brouillon de contrat
   * @param {Object} draft - Brouillon de contrat
   * @param {Array} anomalies - Liste des anomalies détectées
   * @returns {Promise<object>} Suggestions de correction
   */
  async getContratCorrectionSuggestions(draft, anomalies) {
    try {
      const response = await api.post('/contrats/ia/suggest', { draft, anomalies });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur suggestions correction contrat IA:', error);
      throw error;
    }
  },

  /**
   * Créer un contrat à partir d'un brouillon validé par l'IA
   * @param {Object} draft - Brouillon de contrat validé
   * @param {string} actifId - ID de l'actif associé
   * @returns {Promise<object>} Contrat créé
   */
  async createContratFromDraft(draft, actifId) {
    try {
      const response = await api.post('/contrats/ia/create-from-draft', {
        draft,
        actif_id: actifId
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur création contrat depuis brouillon IA:', error);
      throw error;
    }
  },

  /**
   * Détecter les anomalies sur un contrat existant
   * @param {string} contratId - ID du contrat à analyser
   * @returns {Promise<object>} Anomalies détectées avec recommandations
   */
  async detectContratAnomalies(contratId) {
    try {
      const response = await api.get(`/contrats/ia/anomalies/${contratId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur détection anomalies contrat IA:', error);
      throw error;
    }
  },

  /**
   * Générer un numéro de contrat unique avec l'IA
   * @param {string} type - Type de contrat (licence, maintenance, etc.)
   * @param {Array} existingNumbers - Numéros existants pour éviter les doublons
   * @returns {Promise<object>} Numéro de contrat généré
   */
  async generateContratNumber(type, existingNumbers = []) {
    try {
      const response = await api.post('/ai/generate-contrat-number', { type, existingNumbers });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur génération numéro contrat IA:', error);
      const prefix = type === 'licence' ? 'LIC' : type === 'maintenance' ? 'MAI' : 'CTR';
      const year = new Date().getFullYear();
      const number = existingNumbers.length + 1;
      return { numero_contrat: `${prefix}-${year}-${String(number).padStart(3, '0')}` };
    }
  },

  /**
   * Analyser les conditions d'un contrat et suggérer des améliorations
   * @param {Object} contratData - Données du contrat
   * @returns {Promise<object>} Suggestions d'amélioration
   */
  async analyserConditionsContrat(contratData) {
    try {
      const response = await api.post('/ai/analyser-conditions-contrat', contratData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur analyse conditions contrat IA:', error);
      return {
        alertes: [],
        recommandations: [],
        niveau_risque: 'non_analyse'
      };
    }
  },

  /**
   * Vérifier l'éligibilité d'un contrat au renouvellement
   * @param {Object} contratData - Données du contrat
   * @returns {Promise<object>} Analyse de renouvellement
   */
  async verifierRenouvellementContrat(contratData) {
    try {
      const response = await api.post('/ai/verifier-renouvellement', contratData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur vérification renouvellement IA:', error);
      const dateFin = new Date(contratData.date_fin);
      const aujourdhui = new Date();
      const joursRestants = Math.ceil((dateFin - aujourdhui) / (1000 * 60 * 60 * 24));
      return {
        peut_renouveler: joursRestants > 0,
        echeance_jours: joursRestants,
        recommandation: joursRestants < 30 ? 'Renouvellement urgent recommandé' : 'Le contrat peut être renouvelé'
      };
    }
  },

  /**
   * Extraire les informations clés d'un contrat à partir d'une description
   * @param {string} description - Description du contrat
   * @returns {Promise<object>} Informations extraites
   */
  async extraireInfosContrat(description) {
    try {
      const response = await api.post('/ai/extraire-infos-contrat', { description });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur extraction infos contrat IA:', error);
      throw error;
    }
  },

  // ==================== ANALYSE DU PORTEFEUILLE ====================

  /**
   * Analyser le portefeuille d'immobilisations
   * @param {Array} actifs - Liste des actifs (optionnel)
   * @param {Object} totaux - Totaux du portefeuille (optionnel)
   * @param {string} dateArrete - Date d'arrêté (YYYY-MM-DD)
   * @returns {Promise<object>} Analyse complète du portefeuille
   */
  async analyserPortefeuille(actifs = null, totaux = null, dateArrete = null) {
    try {
      const response = await api.post('/ai/analyser-portefeuille', {
        actifs,
        totaux,
        date_arrete: dateArrete || new Date().toISOString().split('T')[0]
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur analyse portefeuille IA:', error);
      return this.analyserPortefeuilleLocal(actifs, totaux, dateArrete);
    }
  },

  /**
   * Analyse locale du portefeuille (fallback)
   * @param {Array} actifs - Liste des actifs
   * @param {Object} totaux - Totaux du portefeuille
   * @param {string} dateArrete - Date d'arrêté
   * @returns {Promise<object>} Analyse locale
   */
  async analyserPortefeuilleLocal(actifs, totaux, dateArrete) {
    console.log('📊 Analyse locale du portefeuille (fallback)');
    
    const nombreActifs = totaux?.nombre || actifs?.length || 0;
    const valeurBrute = totaux?.valeur_brute || 0;
    const valeurNette = totaux?.valeur_nette || 0;
    const amortissements = totaux?.amortissements_cumules || 0;
    
    const tauxAmortissementGlobal = valeurBrute > 0 ? (amortissements / valeurBrute) * 100 : 0;
    const valeurResiduelleMoyenne = valeurBrute > 0 ? (valeurNette / valeurBrute) * 100 : 0;
    
    const anomalies = [];
    const recommandations = [];
    
    if (valeurResiduelleMoyenne < 20) {
      anomalies.push(`Le portefeuille est amorti à ${(100 - valeurResiduelleMoyenne).toFixed(1)}%`);
      recommandations.push("Envisager le remplacement des actifs fortement amortis");
    }
    
    if (nombreActifs === 0) {
      anomalies.push("Aucun actif trouvé dans le portefeuille");
      recommandations.push("Ajoutez des actifs pour commencer à utiliser l'analyse");
    }
    
    let scoreSante = 100;
    scoreSante -= anomalies.length * 15;
    scoreSante = Math.max(0, Math.min(100, scoreSante));
    
    let resume = "";
    if (scoreSante >= 80) {
      resume = `✅ Le portefeuille est en bonne santé. ${nombreActifs} actifs pour une valeur nette de ${Math.round(valeurNette).toLocaleString()} FC.`;
    } else if (scoreSante >= 50) {
      resume = `⚠️ Le portefeuille présente quelques points d'attention. ${anomalies.length} anomalie(s) détectée(s).`;
    } else {
      resume = `🔴 Le portefeuille nécessite une attention particulière. ${anomalies.length} anomalie(s) critique(s) détectée(s).`;
    }
    
    if (recommandations.length === 0) {
      recommandations.push("Effectuer un inventaire physique annuel des actifs");
      recommandations.push("Vérifier la cohérence des contrats associés");
    }
    
    return {
      score_sante: scoreSante,
      niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 50 ? "moyen" : scoreSante >= 25 ? "élevé" : "critique",
      resume: resume,
      anomalies: anomalies.length > 0 ? anomalies : ["Aucune anomalie majeure détectée"],
      recommandations: recommandations,
      metriques: {
        nombre_actifs: nombreActifs,
        valeur_brute: Math.round(valeurBrute),
        valeur_nette: Math.round(valeurNette),
        taux_amortissement_global: parseFloat(tauxAmortissementGlobal.toFixed(1))
      },
      date_analyse: new Date().toISOString(),
      date_arrete: dateArrete || new Date().toISOString().split('T')[0]
    };
  }
};

export default aiService;