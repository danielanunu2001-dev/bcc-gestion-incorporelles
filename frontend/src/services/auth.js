import api from './api';

const authService = {
  // Login
  async login(email, password) {
    try {
      console.log('📤 Tentative de login:', email);
      
      if (!email || !password) {
        throw { message: 'Email et mot de passe requis' };
      }

      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.user) {
        // Stocker l'utilisateur
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Optionnel : stocker le token si renvoyé par l'API
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        console.log('✅ Login réussi - Utilisateur:', response.data.user.email);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur login:', error.response?.data || error.message);
      
      // Améliorer le message d'erreur
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur de connexion au serveur';
      
      throw { message: errorMessage };
    }
  },

  // Logout
  async logout() {
    try {
      await api.post('/auth/logout');
      console.log('👋 Déconnexion réussie');
    } catch (error) {
      console.error('⚠️ Erreur lors de la déconnexion:', error.message);
    } finally {
      // Nettoyer le stockage local
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },

  // Récupérer l'utilisateur courant (via API)
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.user) {
        // Mettre à jour le localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.log('ℹ️ Non authentifié ou session expirée');
      
      // Si 401, nettoyer le localStorage
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      
      return null;
    }
  },

  // Récupérer l'utilisateur stocké dans localStorage
  getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('❌ Erreur parsing utilisateur stocké:', error);
      localStorage.removeItem('user'); // Nettoyer les données corrompues
      return null;
    }
  },

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated() {
    return !!this.getStoredUser();
  },

  // Mettre à jour l'utilisateur dans localStorage
  updateStoredUser(userData) {
    if (!userData) return;
    
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('✅ Utilisateur mis à jour dans localStorage');
    } catch (error) {
      console.error('❌ Erreur mise à jour utilisateur stocké:', error);
    }
  },

  // Vérifier si l'utilisateur a un rôle spécifique
  hasRole(role) {
    const user = this.getStoredUser();
    return user?.role === role;
  },

  // Vérifier si l'utilisateur a au moins un des rôles
  hasAnyRole(roles = []) {
    const user = this.getStoredUser();
    return user && roles.includes(user.role);
  },

  // Récupérer le token (si stocké)
  getToken() {
    return localStorage.getItem('token');
  },

  // Rafraîchir la session (vérifier et mettre à jour)
  async refreshSession() {
    const currentUser = this.getStoredUser();
    
    if (!currentUser) {
      return null;
    }
    
    // Essayer de récupérer les données fraîches depuis l'API
    try {
      const freshUser = await this.getCurrentUser();
      return freshUser;
    } catch (error) {
      console.log('⚠️ Impossible de rafraîchir la session');
      return currentUser;
    }
  },

  // Obtenir les informations de session
  getSessionInfo() {
    const user = this.getStoredUser();
    const token = this.getToken();
    
    return {
      isAuthenticated: !!user,
      user: user,
      hasToken: !!token,
      role: user?.role || null
    };
  },

  // Effacer toutes les données de session (force logout)
  clearSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.log('🧹 Session effacée');
  }
};

export default authService;