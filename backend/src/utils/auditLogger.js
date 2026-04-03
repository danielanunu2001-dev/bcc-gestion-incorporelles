const { AuditLog } = require('../models');

const logAction = async ({ userId, action, tableName, recordId, oldData = null, newData = null, ipAddress = null }) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('Erreur lors de l\'écriture du log d\'audit:', error);
  }
};

module.exports = logAction;