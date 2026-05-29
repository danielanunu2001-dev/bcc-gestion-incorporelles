// backend/src/controllers/auditController.js

const { AuditLog, User, Actif, Contrat, Reevaluation, Depreciation, Document, Mouvement } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupérer tous les logs avec pagination et filtres
 * GET /api/audit-logs
 */
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, table, action, startDate, endDate } = req.query;
    const where = {};

    if (userId) where.user_id = userId;
    if (table) where.table_name = table;
    if (action) where.action = action;
    
    if (startDate || endDate) {
      where.action_date = {};
      if (startDate) where.action_date[Op.gte] = new Date(startDate);
      if (endDate) where.action_date[Op.lte] = new Date(endDate);
    }

    console.log('🔍 Filtres reçus:', { page, limit, userId, table, action, startDate, endDate });

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), logs: rows });
  } catch (error) {
    console.error('❌ Erreur getAllLogs:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Logs pour un enregistrement spécifique (actif, contrat, etc.)
 * GET /api/audit-logs/:tableName/:recordId
 */
exports.getLogsForRecord = async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    
    const logs = await AuditLog.findAll({
      where: {
        table_name: tableName,
        record_id: recordId
      },
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']]
    });

    res.json(logs);
  } catch (error) {
    console.error('❌ Erreur getLogsForRecord:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Logs pour un actif (toutes tables liées)
 * GET /api/audit-logs/actif/:actifId
 */
exports.getLogsForActif = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }

    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      return res.json([]);
    }

    let contratIds = [], reevaluationIds = [], depreciationIds = [], documentIds = [], mouvementIds = [];

    try {
      const contrats = await Contrat.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      contratIds = contrats.map(c => c.id);
    } catch (err) { console.error('Erreur contrats:', err.message); }

    try {
      const reevaluations = await Reevaluation.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      reevaluationIds = reevaluations.map(r => r.id);
    } catch (err) { console.error('Erreur reevaluations:', err.message); }

    try {
      const depreciations = await Depreciation.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      depreciationIds = depreciations.map(d => d.id);
    } catch (err) { console.error('Erreur depreciations:', err.message); }

    try {
      const documents = await Document.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      documentIds = documents.map(d => d.id);
    } catch (err) { console.error('Erreur documents:', err.message); }

    try {
      const mouvements = await Mouvement.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      mouvementIds = mouvements.map(m => m.id);
    } catch (err) { console.error('Erreur mouvements:', err.message); }

    const conditions = [{ table_name: 'actifs', record_id: actifId }];
    if (contratIds.length) conditions.push({ table_name: 'contrats', record_id: { [Op.in]: contratIds } });
    if (reevaluationIds.length) conditions.push({ table_name: 'reevaluations', record_id: { [Op.in]: reevaluationIds } });
    if (depreciationIds.length) conditions.push({ table_name: 'depreciations', record_id: { [Op.in]: depreciationIds } });
    if (documentIds.length) conditions.push({ table_name: 'documents', record_id: { [Op.in]: documentIds } });
    if (mouvementIds.length) conditions.push({ table_name: 'mouvements', record_id: { [Op.in]: mouvementIds } });

    const logs = await AuditLog.findAll({
      where: { [Op.or]: conditions },
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']]
    });

    res.json(logs);
  } catch (error) {
    console.error('❌ Erreur getLogsForActif:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ==================== NOUVELLES ROUTES POUR L'ACTIVITÉ UTILISATEUR ====================

/**
 * Récupérer l'activité d'un utilisateur spécifique (format simplifié pour le frontend)
 * GET /api/audit-logs/user/:userId/activity
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const logs = await AuditLog.findAll({
      where: { user_id: userId },
      order: [['action_date', 'DESC']],
      limit: parseInt(limit),
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'full_name', 'email'] }]
    });
    
    const activities = logs.map(log => ({
      id: log.id,
      description: getActivityDescription(log),
      entity_type: log.table_name,
      created_at: log.action_date || log.created_at,
      ip_address: log.ip_address,
      color: getActivityColor(log.action),
      icon: getActivityIcon(log.action)
    }));
    
    res.json({ success: true, activities });
  } catch (error) {
    console.error('❌ Erreur getUserActivity:', error);
    res.status(500).json({ success: false, message: error.message, activities: [] });
  }
};

/**
 * Récupérer les logs détaillés d'un utilisateur spécifique (avec pagination)
 * GET /api/audit-logs/user/:userId/logs
 */
exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, action, table_name, startDate, endDate } = req.query;
    
    const where = { user_id: userId };
    if (action) where.action = action;
    if (table_name) where.table_name = table_name;
    if (startDate) where.action_date = { [Op.gte]: new Date(startDate) };
    if (endDate) where.action_date = { ...where.action_date, [Op.lte]: new Date(endDate) };
    
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['action_date', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'full_name', 'email'] }]
    });
    
    res.json({
      success: true,
      logs: rows,
      pagination: {
        page: parseInt(page),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Erreur getUserLogs:', error);
    res.status(500).json({ success: false, message: error.message, logs: [], pagination: { page: 1, total: 0, totalPages: 0 } });
  }
};

/**
 * Récupérer l'activité récente de l'utilisateur connecté
 * GET /api/audit-logs/me/activity
 */
exports.getMyActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user.id;
    
    const logs = await AuditLog.findAll({
      where: { user_id: userId },
      order: [['action_date', 'DESC']],
      limit: parseInt(limit),
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }]
    });
    
    const activities = logs.map(log => ({
      id: log.id,
      action: log.action,
      entity_type: log.table_name,
      entity_id: log.record_id,
      created_at: log.action_date || log.created_at,
      ip_address: log.ip_address,
      description: getActionDescription(log),
      icon: getActionIcon(log.action),
      color: getActivityColor(log.action),
      old_data: log.old_data,
      new_data: log.new_data
    }));
    
    res.json({ success: true, activities, total: activities.length });
  } catch (error) {
    console.error('❌ Erreur getMyActivity:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ==================== STATISTIQUES ET ANALYSES ====================

/**
 * Statistiques compactes
 * GET /api/audit-logs/stats
 */
exports.getStats = async (req, res) => {
  try {
    const total = await AuditLog.count();
    
    const parAction = await AuditLog.findAll({
      attributes: ['action', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['action'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });

    const parTable = await AuditLog.findAll({
      attributes: ['table_name', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['table_name'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });

    res.json({ 
      total, 
      parAction: parAction.map(a => ({ action: a.action, count: parseInt(a.dataValues.count) })),
      parTable: parTable.map(t => ({ table: t.table_name, count: parseInt(t.dataValues.count) }))
    });
  } catch (error) {
    console.error('❌ Erreur getStats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Résumé par période
 * GET /api/audit-logs/summary?periode=30d
 */
exports.getActivitySummary = async (req, res) => {
  try {
    const { periode = '30d' } = req.query;
    let dateDebut = new Date();

    switch(periode) {
      case '24h': dateDebut.setHours(dateDebut.getHours() - 24); break;
      case '7d': dateDebut.setDate(dateDebut.getDate() - 7); break;
      case '30d': dateDebut.setDate(dateDebut.getDate() - 30); break;
      case '1y': dateDebut.setFullYear(dateDebut.getFullYear() - 1); break;
      default: dateDebut.setDate(dateDebut.getDate() - 30);
    }

    const resume = await AuditLog.findAll({
      attributes: ['action', [sequelize.fn('COUNT', '*'), 'total']],
      where: { action_date: { [Op.gte]: dateDebut } },
      group: ['action'],
      order: [[sequelize.literal('total'), 'DESC']]
    });

    res.json({
      periode,
      resume: resume.map(r => ({ action: r.action, total: parseInt(r.dataValues.total) }))
    });
  } catch (error) {
    console.error('❌ Erreur getActivitySummary:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== RECHERCHE ET MAINTENANCE ====================

/**
 * Recherche simple
 * GET /api/audit-logs/search?q=mot
 */
exports.searchLogs = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.length < 3) return res.status(400).json({ message: 'Minimum 3 caractères' });

    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        [Op.or]: [
          { table_name: { [Op.iLike]: `%${q}%` } },
          { action: { [Op.iLike]: `%${q}%` } }
        ]
      },
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), logs: rows });
  } catch (error) {
    console.error('❌ Erreur searchLogs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Nettoyage des logs anciens (admin only)
 * DELETE /api/audit-logs/clean?days=90
 */
exports.cleanOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - parseInt(days));
    
    const deleted = await AuditLog.destroy({
      where: { action_date: { [Op.lt]: dateLimite } }
    });
    
    res.json({ message: `${deleted} logs supprimés` });
  } catch (error) {
    console.error('❌ Erreur cleanOldLogs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Export des logs au format CSV
 * GET /api/audit-logs/export
 */
exports.exportLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [{ model: User, as: 'utilisateur', attributes: ['email', 'full_name'] }],
      order: [['action_date', 'DESC']]
    });

    const csv = [
      ['Date', 'Utilisateur', 'Action', 'Table', 'ID Enregistrement', 'IP', 'Anciennes valeurs', 'Nouvelles valeurs'].join(','),
      ...logs.map(log => [
        log.action_date || log.created_at,
        log.utilisateur?.full_name || 'Système',
        log.action,
        log.table_name,
        log.record_id,
        log.ip_address || '',
        `"${JSON.stringify(log.old_data || {}).replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.new_data || {}).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Erreur export:', error);
    res.status(500).json({ message: 'Erreur export' });
  }
};

// ==================== MIDDLEWARE D'AUDIT ====================

/**
 * Middleware d'enregistrement des actions
 */
exports.logAction = async (userId, action, tableName, recordId, oldValues = null, newValues = null, req = null, operationDate = null) => {
  try {
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldValues,
      new_data: newValues,
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      action_date: operationDate || new Date()
    };
    
    await AuditLog.create(logData);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
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

const getActionDescription = (log) => {
  const actions = {
    'CREATE': `Création d'un(e) ${getEntityName(log.table_name)}`,
    'UPDATE': `Modification d'un(e) ${getEntityName(log.table_name)}`,
    'DELETE': `Suppression d'un(e) ${getEntityName(log.table_name)}`
  };
  return actions[log.action] || `Action ${log.action}`;
};

const getEntityName = (tableName) => {
  const names = {
    'users': 'utilisateur',
    'actifs': 'actif',
    'contrats': 'contrat',
    'categories_amortissement': 'catégorie',
    'audit_logs': 'log',
    'reevaluations': 'réévaluation',
    'depreciations': 'dépréciation',
    'documents': 'document',
    'mouvements': 'mouvement'
  };
  return names[tableName] || tableName;
};