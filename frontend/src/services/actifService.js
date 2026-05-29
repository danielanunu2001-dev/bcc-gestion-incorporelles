// frontend/src/services/actifService.js

import api from './api';

const actifService = {
  // Récupérer tous les actifs avec filtres
  async getAll(filtres = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.typeImmobilisation) params.append('typeImmobilisation', filtres.typeImmobilisation);
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.recherche) params.append('recherche', filtres.recherche);
      if (filtres.categorieId) params.append('categorieId', filtres.categorieId);
      if (filtres.localisation) params.append('localisation', filtres.localisation);
      if (filtres.affectation) params.append('affectation', filtres.affectation);
      if (filtres.page) params.append('page', filtres.page);
      if (filtres.limit) params.append('limit', filtres.limit);
      if (filtres.sortBy) params.append('sortBy', filtres.sortBy);
      if (filtres.sortOrder) params.append('sortOrder', filtres.sortOrder);

      const response = await api.get(`/actifs?${params.toString()}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur chargement actifs:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer un actif par ID
  async getById(id) {
    try {
      if (!id || id === 'undefined') {
        throw new Error('ID actif invalide');
      }
      const response = await api.get(`/actifs/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement actif ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer un actif par code QR
  async getByCode(code) {
    try {
      if (!code) {
        throw new Error('Code QR requis');
      }
      const response = await api.get(`/actifs/code/${code}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement actif par code ${code}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // ✅ Créer un nouvel actif - CORRIGÉ
  async create(actifData) {
    try {
      // Validation basique côté client
      if (!actifData.code || !actifData.nom || !actifData.type) {
        throw new Error('Code, nom et type sont requis');
      }
      
      if (!actifData.date_acquisition) {
        throw new Error('La date d\'acquisition est requise');
      }

      console.log('📤 Envoi création actif:', JSON.stringify(actifData, null, 2));
      
      const response = await api.post('/actifs', actifData);
      return response.data;
    } catch (error) {
      // ✅ Extraction du message d'erreur même si c'est un objet
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur création actif:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Mettre à jour un actif
  async update(id, actifData) {
    try {
      if (!id) throw new Error('ID actif requis');
      const response = await api.put(`/actifs/${id}`, actifData);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur modification actif ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Supprimer un actif
  async delete(id) {
    try {
      if (!id) throw new Error('ID actif requis');
      const response = await api.delete(`/actifs/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur suppression actif ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer les amortissements d'un actif
  async getAmortissements(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.get(`/actifs/${actifId}/amortissements`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement amortissements actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Recalculer les amortissements d'un actif
  async recalculerAmortissements(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.post(`/actifs/${actifId}/recalculer`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur recalcul amortissements actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer les contrats liés à un actif
  async getContrats(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.get(`/actifs/${actifId}/contrats`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement contrats actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Ajouter un contrat à un actif
  async addContrat(actifId, contratData) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.post(`/actifs/${actifId}/contrats`, contratData);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur ajout contrat à l'actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Mettre à jour un contrat
  async updateContrat(actifId, contratId, contratData) {
    try {
      const response = await api.put(`/actifs/${actifId}/contrats/${contratId}`, contratData);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur mise à jour contrat ${contratId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Supprimer un contrat
  async deleteContrat(actifId, contratId) {
    try {
      const response = await api.delete(`/actifs/${actifId}/contrats/${contratId}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur suppression contrat ${contratId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer les dépréciations d'un actif
  async getDepreciations(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.get(`/actifs/${actifId}/depreciations`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement dépréciations actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Ajouter une dépréciation
  async addDepreciation(actifId, depreciationData) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.post(`/actifs/${actifId}/depreciations`, depreciationData);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur ajout dépréciation à l'actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Enregistrer la sortie d'un actif
  async enregistrerSortie(actifId, sortieData) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.post(`/actifs/${actifId}/sortie`, sortieData);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur enregistrement sortie actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Récupérer la facture d'un actif
  async getFacture(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.get(`/actifs/${actifId}/facture`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur chargement facture actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Télécharger la facture PDF
  async downloadFacture(actifId) {
    try {
      if (!actifId) throw new Error('ID actif requis');
      const response = await api.get(`/actifs/${actifId}/facture/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${actifId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur téléchargement facture actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Exporter la liste des actifs
  async exporter(format = 'csv', filtres = {}) {
    try {
      const params = new URLSearchParams(filtres);
      const response = await api.get(`/actifs/export?format=${format}&${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `actifs.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur export actifs:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Obtenir les statistiques des actifs
  async getStats() {
    try {
      const response = await api.get('/actifs/stats');
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur chargement stats actifs:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Obtenir la liste des alertes
  async getAlertes() {
    try {
      const response = await api.get('/actifs/alertes');
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur chargement alertes:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Prévisualiser la conversion de devise
  async previewConversion(montant, devise, date = null) {
    try {
      const params = new URLSearchParams({ montant, devise });
      if (date) params.append('date', date);
      const response = await api.get(`/actifs/preview-conversion?${params.toString()}`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur preview conversion:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // ==================== FONCTIONS IA ====================
  
  async generateWithAI(conversation, context = {}) {
    try {
      const response = await api.post('/actifs/ai/generate', { conversation, context });
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur génération IA:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  async validateDraftWithAI(draft) {
    try {
      const response = await api.post('/actifs/ai/validate', { draft });
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur validation IA:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  async suggestCorrections(draft) {
    try {
      const response = await api.post('/actifs/ai/suggest', { draft });
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur suggestions IA:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  async createFromAIDraft(draft) {
    try {
      const response = await api.post('/actifs/ai/create', draft);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error('❌ Erreur création depuis brouillon IA:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  async detectAnomaliesWithAI(actifId) {
    try {
      const response = await api.get(`/actifs/${actifId}/ai/anomalies`);
      return response.data;
    } catch (error) {
      const errorMessage = this._extractErrorMessage(error);
      console.error(`❌ Erreur détection anomalies IA actif ${actifId}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // ==================== FONCTIONS UTILITAIRES ====================
  
  /**
   * ✅ Extrait un message d'erreur lisible même si l'erreur est un objet
   * Résout le problème "Objects are not valid as a React child"
   */
  _extractErrorMessage(error) {
    // Si c'est déjà une string
    if (typeof error === 'string') {
      return error;
    }
    
    // Si error.response?.data existe
    if (error.response?.data) {
      const data = error.response.data;
      
      // String
      if (typeof data === 'string') {
        return data;
      }
      
      // Objet avec message
      if (data.message && typeof data.message === 'string') {
        return data.message;
      }
      
      // Objet avec error.message
      if (data.error?.message) {
        return data.error.message;
      }
      
      // ✅ CAS SPÉCIFIQUE: Objet avec {point, justification}
      if (data.point !== undefined || data.justification !== undefined) {
        const point = data.point || '';
        const justification = data.justification || '';
        return `${point} ${justification}`.trim() || 'Erreur de validation';
      }
      
      // Array d'erreurs
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0];
        if (typeof firstError === 'string') {
          return firstError;
        }
        if (firstError.msg) {
          return firstError.msg;
        }
        if (firstError.message) {
          return firstError.message;
        }
      }
      
      // Objet générique - extraire la première propriété string
      for (const key in data) {
        if (typeof data[key] === 'string') {
          return data[key];
        }
      }
      
      // Dernier recours
      try {
        return JSON.stringify(data);
      } catch (e) {
        return 'Erreur serveur';
      }
    }
    
    // error.message
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    
    // Erreur par défaut
    return 'Une erreur est survenue';
  },

  // Gestionnaire d'erreur unifié
  handleError(error) {
    const message = this._extractErrorMessage(error);
    
    if (error.response?.status === 401) {
      return new Error('Session expirée, veuillez vous reconnecter');
    }
    if (error.response?.status === 403) {
      return new Error('Vous n\'avez pas les droits pour cette action');
    }
    if (error.response?.status === 404) {
      return new Error('Ressource non trouvée');
    }
    if (error.response?.status === 500) {
      return new Error('Erreur serveur. Veuillez réessayer plus tard.');
    }
    
    return new Error(message);
  }
};

export default actifService;