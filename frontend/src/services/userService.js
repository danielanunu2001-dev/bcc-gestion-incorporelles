import api from './api';

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export const getMyProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    console.error('Erreur chargement profil:', error);
    throw error;
  }
};

/**
 * Mettre à jour son propre profil
 */
export const updateMyProfile = async (data) => {
  try {
    const response = await api.put('/users/profile', data);
    return response.data;
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    throw error;
  }
};

/**
 * Changer son mot de passe
 */
export const changeMyPassword = async (oldPassword, newPassword) => {
  try {
    const response = await api.post('/users/change-password', { oldPassword, newPassword });
    return response.data;
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    throw error;
  }
};

/**
 * Récupérer l'activité récente de l'utilisateur connecté
 */
export const getMyRecentActivity = async (limit = 20) => {
  try {
    const response = await api.get('/audit/me/activity', { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Erreur chargement activité:', error);
    throw error;
  }
};