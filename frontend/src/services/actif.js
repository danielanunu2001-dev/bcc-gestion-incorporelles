import api from './api';

const actifService = {
  // Récupérer tous les actifs avec filtres
  async getAll(filtres = {}) {
    try {
      const params = new URLSearchParams();
      
      // Ajouter les paramètres de filtre
      if (filtres.type) params.append('type', filtres.type);
      if (filtres.statut) params.append('statut', filtres.statut);
      if (filtres.recherche) params.append('recherche', filtres.recherche);
      
      // Pagination
      if (filtres.page) params.append('page', filtres.page);
      if (filtres.limit) params.append('limit', filtres.limit);
      
      // Tri
      if (filtres.sortBy) params.append('sortBy', filtres.sortBy);
      if (filtres.sortOrder) params.append('sortOrder', filtres.sortOrder);

      const response = await api.get(`/actifs?${params.toString()}`);
      return response.data; // Format attendu: { total, page, limit, actifs }
    } catch (error) {
      console.error('❌ Erreur chargement actifs:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer un actif par ID
  async getById(id) {
    try {
      const response = await api.get(`/actifs/${id}`);
      return response.data; // L'actif complet avec relations
    } catch (error) {
      console.error(`❌ Erreur chargement actif ${id}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Créer un nouvel actif
  async create(actifData) {
    try {
      // Validation basique côté client
      if (!actifData.code || !actifData.nom || !actifData.type) {
        throw new Error('Code, nom et type sont requis');
      }

      const response = await api.post('/actifs', actifData);
      return response.data; // L'actif créé
    } catch (error) {
      console.error('❌ Erreur création actif:', error.response?.data || error.message);
      throw error;
    }
  },

  // Mettre à jour un actif
  async update(id, actifData) {
    try {
      const response = await api.put(`/actifs/${id}`, actifData);
      return response.data; // L'actif mis à jour
    } catch (error) {
      console.error(`❌ Erreur modification actif ${id}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Supprimer un actif
  async delete(id) {
    try {
      const response = await api.delete(`/actifs/${id}`);
      return response.data; // Message de confirmation
    } catch (error) {
      console.error(`❌ Erreur suppression actif ${id}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les amortissements d'un actif
  async getAmortissements(actifId) {
    try {
      const response = await api.get(`/actifs/${actifId}/amortissements`);
      return response.data; // Liste des amortissements
    } catch (error) {
      console.error(`❌ Erreur chargement amortissements actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Recalculer les amortissements d'un actif
  async recalculerAmortissements(actifId) {
    try {
      const response = await api.post(`/actifs/${actifId}/amortissements/recalculer`);
      return response.data; // Nouveaux amortissements
    } catch (error) {
      console.error(`❌ Erreur recalcul amortissements actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les contrats liés à un actif
  async getContrats(actifId) {
    try {
      const response = await api.get(`/actifs/${actifId}/contrats`);
      return response.data; // Liste des contrats
    } catch (error) {
      console.error(`❌ Erreur chargement contrats actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Ajouter un contrat à un actif
  async addContrat(actifId, contratData) {
    try {
      const response = await api.post(`/actifs/${actifId}/contrats`, contratData);
      return response.data; // Contrat créé
    } catch (error) {
      console.error(`❌ Erreur ajout contrat à l'actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les dépréciations d'un actif
  async getDepreciations(actifId) {
    try {
      const response = await api.get(`/actifs/${actifId}/depreciations`);
      return response.data; // Liste des dépréciations
    } catch (error) {
      console.error(`❌ Erreur chargement dépréciations actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Ajouter une dépréciation
  async addDepreciation(actifId, depreciationData) {
    try {
      const response = await api.post(`/actifs/${actifId}/depreciations`, depreciationData);
      return response.data; // Dépréciation créée
    } catch (error) {
      console.error(`❌ Erreur ajout dépréciation à l'actif ${actifId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Exporter la liste des actifs
  async exporter(format = 'csv', filtres = {}) {
    try {
      const params = new URLSearchParams(filtres);
      const response = await api.get(`/actifs/export?format=${format}&${params.toString()}`, {
        responseType: 'blob' // Important pour les fichiers
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `actifs.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur export actifs:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtenir les statistiques des actifs
  async getStats() {
    try {
      const response = await api.get('/actifs/stats');
      return response.data; // Statistiques
    } catch (error) {
      console.error('❌ Erreur chargement stats actifs:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default actifService;