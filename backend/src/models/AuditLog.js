const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
      allowNull: false
    },
    table_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    record_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    old_data: {
      type: DataTypes.JSONB
    },
    new_data: {
      type: DataTypes.JSONB
    },
    ip_address: {
      type: DataTypes.INET
    },
    action_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return AuditLog;
};