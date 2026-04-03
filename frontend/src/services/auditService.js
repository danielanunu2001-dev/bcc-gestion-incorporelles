import api from './api';

/**
 * Récupérer l'activité récente d'un utilisateur
 */
export const getUserRecentActivity = async (userId, limit = 10) => {
  try {
    const response = await api.get(`/audit/user/${userId}`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur chargement activité:', error);
    throw error;
  }
};

/**
 * Récupérer tous les logs d'audit d'un utilisateur (admin uniquement)
 */
export const getUserAuditLogs = async (userId, filters = {}) => {
  try {
    const { page = 1, limit = 20, action, table_name, startDate, endDate } = filters;
    const response = await api.get(`/audit/user/${userId}`, {
      params: { page, limit, action, table_name, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur chargement logs audit:', error);
    throw error;
  }
};