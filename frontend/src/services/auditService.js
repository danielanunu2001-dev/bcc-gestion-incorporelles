// frontend/src/services/auditService.js

import api from './api';

/**
 * Récupérer l'activité récente d'un utilisateur
 */
export const getUserRecentActivity = async (userId, limit = 10) => {
  try {
    // ✅ CORRECTION: Utiliser audit-logs
    const response = await api.get(`/audit-logs/user/${userId}/activity`, {
      params: { limit }
    });
    return { success: true, activities: response.data.activities || response.data || [] };
  } catch (error) {
    console.error('Erreur chargement activité:', error);
    
    // Fallback: retourner un tableau vide pour ne pas bloquer l'UI
    return { 
      success: false, 
      activities: [],
      message: 'Service d\'activité temporairement indisponible'
    };
  }
};

/**
 * Récupérer tous les logs d'audit d'un utilisateur (admin uniquement)
 */
export const getUserAuditLogs = async (userId, filters = {}) => {
  try {
    const { page = 1, limit = 20, action, table_name, startDate, endDate } = filters;
    // ✅ CORRECTION: Utiliser audit-logs
    const response = await api.get(`/audit-logs/user/${userId}/logs`, {
      params: { page, limit, action, table_name, startDate, endDate }
    });
    
    return { 
      success: true, 
      logs: response.data.logs || response.data || [],
      pagination: response.data.pagination || { page, total: 0, totalPages: 0 }
    };
  } catch (error) {
    console.error('Erreur chargement logs audit:', error);
    
    // Fallback: retourner des données vides
    return { 
      success: false, 
      logs: [],
      pagination: { page: filters.page || 1, total: 0, totalPages: 0 },
      message: 'Service d\'audit temporairement indisponible'
    };
  }
};

/**
 * Récupérer l'activité récente d'un utilisateur (version alternative avec fallback)
 * Cette version utilise les logs d'audit généraux si l'endpoint spécifique n'existe pas
 */
export const getUserRecentActivityWithFallback = async (userId, limit = 10) => {
  try {
    // Essayer d'abord l'endpoint spécifique
    const response = await api.get(`/audit-logs/user/${userId}/activity`, {
      params: { limit }
    });
    return { success: true, activities: response.data.activities || response.data || [] };
  } catch (specificError) {
    console.log('Endpoint spécifique non disponible, tentative avec fallback...');
    
    try {
      // Fallback: utiliser les logs généraux
      const fallbackResponse = await api.get(`/audit-logs`, {
        params: { userId, limit }
      });
      
      const logs = fallbackResponse.data.logs || [];
      const activities = logs.map(log => ({
        id: log.id,
        description: getActivityDescription(log),
        entity_type: log.table_name,
        created_at: log.action_date || log.created_at,
        ip_address: log.ip_address,
        color: getActivityColor(log.action),
        icon: getActivityIcon(log.action)
      }));
      
      return { success: true, activities };
    } catch (fallbackError) {
      console.error('Fallback également en erreur:', fallbackError);
      return { 
        success: false, 
        activities: [],
        message: 'Service d\'activité temporairement indisponible'
      };
    }
  }
};

/**
 * Récupérer les logs d'audit d'un utilisateur avec fallback
 */
export const getUserAuditLogsWithFallback = async (userId, filters = {}) => {
  try {
    const { page = 1, limit = 20, action, table_name, startDate, endDate } = filters;
    
    // Essayer l'endpoint spécifique
    const response = await api.get(`/audit-logs/user/${userId}/logs`, {
      params: { page, limit, action, table_name, startDate, endDate }
    });
    
    return { 
      success: true, 
      logs: response.data.logs || response.data || [],
      pagination: response.data.pagination || { page, total: 0, totalPages: 0 }
    };
  } catch (specificError) {
    console.log('Endpoint spécifique non disponible, tentative avec fallback...');
    
    try {
      // Fallback: utiliser les logs généraux
      const params = new URLSearchParams({
        page,
        limit,
        userId,
        ...(action && { action }),
        ...(table_name && { table_name }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });
      
      const fallbackResponse = await api.get(`/audit-logs?${params.toString()}`);
      const logs = fallbackResponse.data.logs || [];
      const total = fallbackResponse.data.total || 0;
      
      return {
        success: true,
        logs,
        pagination: {
          page: parseInt(page),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (fallbackError) {
      console.error('Fallback également en erreur:', fallbackError);
      return { 
        success: false, 
        logs: [],
        pagination: { page: parseInt(page), total: 0, totalPages: 0 },
        message: 'Service d\'audit temporairement indisponible'
      };
    }
  }
};

// ==================== FONCTIONS HELPER ====================

const getActivityDescription = (log) => {
  const actionLabels = {
    'CREATE': 'a créé',
    'UPDATE': 'a modifié',
    'DELETE': 'a supprimé',
    'REEVALUATION': 'a réévalué',
    'DEPRECIATION': 'a déprécié',
    'RECALCUL': 'a recalculé',
    'SORTIE': 'a sorti'
  };
  
  const tableLabels = {
    'actifs': 'un actif',
    'users': 'un utilisateur',
    'contrats': 'un contrat',
    'reevaluations': 'une réévaluation',
    'depreciations': 'une dépréciation',
    'mouvements': 'un mouvement',
    'documents': 'un document'
  };
  
  const action = actionLabels[log.action] || 'a effectué une action sur';
  const entity = tableLabels[log.table_name] || log.table_name;
  
  return `${action} ${entity}`;
};

const getActivityColor = (action) => {
  const colors = {
    'CREATE': '#10b981',
    'UPDATE': '#f59e0b',
    'DELETE': '#ef4444',
    'REEVALUATION': '#8b5cf6',
    'DEPRECIATION': '#ec489a',
    'RECALCUL': '#3b82f6',
    'SORTIE': '#64748b'
  };
  return colors[action] || '#64748b';
};

const getActivityIcon = (action) => {
  const icons = {
    'CREATE': '➕',
    'UPDATE': '✏️',
    'DELETE': '🗑️',
    'REEVALUATION': '📈',
    'DEPRECIATION': '📉',
    'RECALCUL': '🔄',
    'SORTIE': '📦'
  };
  return icons[action] || '📋';
};