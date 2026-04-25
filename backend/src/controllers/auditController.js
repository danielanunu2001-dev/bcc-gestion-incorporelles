const { AuditLog, User, Actif, Contrat, Reevaluation, Depreciation, Document, Mouvement } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupérer tous les logs avec pagination et filtres
 * GET /api/audit
 */
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, table, action, startDate, endDate } = req.query;
    const where = {};

    if (userId) where.user_id = userId;
    if (table) where.table_name = table;
    
    // Vérifier que l'action est valide
    if (action) {
      where.action = action;
    }
    
    if (startDate || endDate) {
      where.action_date = {};  // ✅ Utiliser action_date au lieu de created_at
      if (startDate) where.action_date[Op.gte] = new Date(startDate);
      if (endDate) where.action_date[Op.lte] = new Date(endDate);
    }

    console.log('🔍 Filtres reçus:', { page, limit, userId, table, action, startDate, endDate });
    console.log('🔍 Condition WHERE:', JSON.stringify(where, null, 2));

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']],  // ✅ Trier par action_date
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), logs: rows });
  } catch (error) {
    console.error('❌ Erreur getAllLogs:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

/**
 * Logs pour un enregistrement spécifique (actif, contrat, etc.)
 * GET /api/audit/:tableName/:recordId
 */
exports.getLogsForRecord = async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    
    console.log(`🔍 AUDIT - Récupération logs pour ${tableName}/${recordId}`);

    const logs = await AuditLog.findAll({
    where: {
        [Op.or]: conditions
    },
    include: [{ 
        model: User, 
        as: 'utilisateur', 
        attributes: ['id', 'email', 'full_name'] 
    }],
    order: [['action_date', 'DESC']]  // ✅ Tri par action_date décroissant (plus récent d'abord)
});

    console.log(`✅ AUDIT - ${logs.length} logs trouvés`);
    res.json(logs);
  } catch (error) {
    console.error('❌ AUDIT - Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== LOGS POUR UN ACTIF (TOUTES TABLES) ====================

/**
 * Récupérer tous les logs liés à un actif (toutes tables confondues)
 * GET /api/audit/actif/:actifId
 */
exports.getLogsForActif = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    console.log('🔍 ========== AUDIT POUR ACTIF ==========');
    console.log('📦 actifId reçu:', actifId);
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }

    // 1. Vérifier que l'actif existe
    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      console.log(`⚠️ Actif ${actifId} non trouvé`);
      return res.json([]);
    }
    console.log('✅ Actif trouvé:', actif.code);

    // 2. Récupérer les IDs de tous les enregistrements liés à cet actif
    console.log('🔍 Récupération des IDs liés...');
    
    let contratIds = [];
    let reevaluationIds = [];
    let depreciationIds = [];
    let documentIds = [];
    let mouvementIds = [];

    try {
      const contrats = await Contrat.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      contratIds = contrats.map(c => c.id);
      console.log(`  - Contrats: ${contratIds.length}`);
    } catch (err) { console.error('Erreur contrats:', err.message); }

    try {
      const reevaluations = await Reevaluation.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      reevaluationIds = reevaluations.map(r => r.id);
      console.log(`  - Réévaluations: ${reevaluationIds.length}`);
    } catch (err) { console.error('Erreur reevaluations:', err.message); }

    try {
      const depreciations = await Depreciation.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      depreciationIds = depreciations.map(d => d.id);
      console.log(`  - Dépréciations: ${depreciationIds.length}`);
    } catch (err) { console.error('Erreur depreciations:', err.message); }

    try {
      const documents = await Document.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      documentIds = documents.map(d => d.id);
      console.log(`  - Documents: ${documentIds.length}`);
    } catch (err) { console.error('Erreur documents:', err.message); }

    try {
      const mouvements = await Mouvement.findAll({ where: { actif_id: actifId }, attributes: ['id'] });
      mouvementIds = mouvements.map(m => m.id);
      console.log(`  - Mouvements: ${mouvementIds.length}`);
    } catch (err) { console.error('Erreur mouvements:', err.message); }

    // 3. Construire la condition WHERE avec Op.or
    const conditions = [
      { table_name: 'actifs', record_id: actifId }
    ];

    if (contratIds.length > 0) {
      conditions.push({ table_name: 'contrats', record_id: { [Op.in]: contratIds } });
    }
    if (reevaluationIds.length > 0) {
      conditions.push({ table_name: 'reevaluations', record_id: { [Op.in]: reevaluationIds } });
    }
    if (depreciationIds.length > 0) {
      conditions.push({ table_name: 'depreciations', record_id: { [Op.in]: depreciationIds } });
    }
    if (documentIds.length > 0) {
      conditions.push({ table_name: 'documents', record_id: { [Op.in]: documentIds } });
    }
    if (mouvementIds.length > 0) {
      conditions.push({ table_name: 'mouvements', record_id: { [Op.in]: mouvementIds } });
    }

    console.log(`📊 Conditions totales: ${conditions.length}`);

    // 4. Récupérer tous les logs correspondants
    const logs = await AuditLog.findAll({
      where: {
        [Op.or]: conditions
      },
      include: [{ 
        model: User, 
        as: 'utilisateur', 
        attributes: ['id', 'email', 'full_name'] 
      }],
      order: [['action_date', 'DESC']]  // ✅ Trier par action_date
    });

    console.log(`✅ ${logs.length} logs trouvés pour l'actif ${actifId}`);
    
    // Afficher les premiers logs pour debug
    if (logs.length > 0) {
      console.log('📋 Premiers logs:');
      logs.slice(0, 3).forEach(log => {
        console.log(`  - ${log.action} sur ${log.table_name} (${log.record_id})`);
      });
    }

    res.json(logs);
    
  } catch (error) {
    console.error('❌ AUDIT - Erreur getLogsForActif:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// ==================== EXPORT DES LOGS ====================

/**
 * Export des logs au format CSV
 * GET /api/audit/export
 */
exports.exportLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [{ model: User, as: 'utilisateur', attributes: ['email', 'full_name'] }],
      order: [['action_date', 'DESC']]  // ✅ Trier par action_date
    });

    const csv = [
      ['Date', 'Utilisateur', 'Action', 'Table', 'ID Enregistrement', 'Anciennes valeurs', 'Nouvelles valeurs'].join(','),
      ...logs.map(log => [
        log.action_date || log.created_at,  // ✅ Utiliser action_date en priorité
        log.utilisateur?.full_name || 'Système',
        log.action,
        log.table_name,
        log.record_id,
        JSON.stringify(log.old_data),
        JSON.stringify(log.new_data)
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Erreur export:', error);
    res.status(500).json({ message: 'Erreur export' });
  }
};

// ==================== STATISTIQUES ET ANALYSES ====================

/**
 * Statistiques compactes
 * GET /api/audit/stats
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
 * Activité récente d'un utilisateur
 * GET /api/audit/user/:userId
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const logs = await AuditLog.findAll({
      where: { user_id: userId },
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']],  // ✅ Trier par action_date
      limit: parseInt(limit)
    });
    res.json(logs);
  } catch (error) {
    console.error('❌ Erreur getUserActivity:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Activité récente de l'utilisateur connecté
 * GET /api/audit/me/activity
 */
exports.getMyActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user.id;
    
    console.log(`👤 Récupération activité récente pour l'utilisateur connecté: ${userId}`);
    
    const logs = await AuditLog.findAll({
      where: { user_id: userId },
      include: [{ model: User, as: 'utilisateur', attributes: ['id', 'email', 'full_name'] }],
      order: [['action_date', 'DESC']],  // ✅ Trier par action_date
      limit: parseInt(limit)
    });
    
    // Formater les logs pour l'affichage
    const activities = logs.map(log => ({
      id: log.id,
      action: log.action,
      entity_type: log.table_name,
      entity_id: log.record_id,
      created_at: log.action_date || log.created_at,  // ✅ Utiliser action_date en priorité
      ip_address: log.ip_address,
      description: getActionDescription(log),
      icon: getActionIcon(log.action),
      color: getActionColor(log.action),
      old_data: log.old_data,
      new_data: log.new_data
    }));
    
    res.json({
      success: true,
      activities,
      total: activities.length
    });
  } catch (error) {
    console.error('❌ Erreur getMyActivity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

/**
 * Formater la description de l'action
 */
const getActionDescription = (log) => {
  const actions = {
    'CREATE': `Création d'un(e) ${getEntityName(log.table_name)}`,
    'UPDATE': `Modification d'un(e) ${getEntityName(log.table_name)}`,
    'DELETE': `Suppression d'un(e) ${getEntityName(log.table_name)}`
  };
  return actions[log.action] || `Action ${log.action}`;
};

/**
 * Récupérer le nom de l'entité en français
 */
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

/**
 * Récupérer l'icône pour une action
 */
const getActionIcon = (action) => {
  const icons = {
    'CREATE': '📝',
    'UPDATE': '✏️',
    'DELETE': '🗑️'
  };
  return icons[action] || '📌';
};

/**
 * Récupérer la couleur pour une action
 */
const getActionColor = (action) => {
  const colors = {
    'CREATE': '#10b981',
    'UPDATE': '#f59e0b',
    'DELETE': '#ef4444'
  };
  return colors[action] || '#6b7280';
};

/**
 * Résumé par période
 * GET /api/audit/summary?periode=30d
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
      where: { action_date: { [Op.gte]: dateDebut } },  // ✅ Utiliser action_date
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
 * GET /api/audit/search?q=mot
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
      order: [['action_date', 'DESC']],  // ✅ Trier par action_date
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
 * DELETE /api/audit/clean?days=90
 */
exports.cleanOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - parseInt(days));
    
    const deleted = await AuditLog.destroy({
      where: { action_date: { [Op.lt]: dateLimite } }  // ✅ Utiliser action_date
    });
    
    res.json({ message: `${deleted} logs supprimés` });
  } catch (error) {
    console.error('❌ Erreur cleanOldLogs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== MIDDLEWARE D'AUDIT ====================

/**
 * Middleware d'enregistrement des actions
 * @param {string} userId - ID de l'utilisateur
 * @param {string} action - Action effectuée (CREATE, UPDATE, DELETE, etc.)
 * @param {string} tableName - Nom de la table
 * @param {string} recordId - ID de l'enregistrement
 * @param {object|null} oldValues - Anciennes valeurs (optionnel)
 * @param {object|null} newValues - Nouvelles valeurs (optionnel)
 * @param {object|null} req - Requête Express (pour l'IP)
 * @param {Date|null} operationDate - Date de l'opération (optionnel)
 * @returns {Promise<boolean>}
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
      ip_address: req?.ip || null,
      action_date: operationDate || new Date()  // ✅ AJOUT de action_date avec la date exacte
    };
    
    if (operationDate) {
      logData.created_at = operationDate;
    }
    
    await AuditLog.create(logData);
    console.log(`✅ Log créé: ${action} sur ${tableName} (${recordId}) à ${new Date().toLocaleString('fr-FR')}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};