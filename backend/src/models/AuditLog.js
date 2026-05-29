const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'RECALCUL', 'DEPRECIATION', 'SORTIE', 'CONTRAT_CREATE', 'CONTRAT_UPDATE', 'CONTRAT_DELETE', 'CONTRAT_RENOUVELEMENT', 'CONTRAT_RESILIATION'),
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
      type: DataTypes.DATE(6),  // ✅ Précision à la microseconde
      allowNull: false,
      defaultValue: DataTypes.NOW,
      // ✅ Getter pour retourner l'heure locale
      get() {
        const rawValue = this.getDataValue('action_date');
        if (!rawValue) return null;
        // Retourner la date brute sans modification
        return rawValue;
      }
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    // ✅ Définir le fuseau horaire pour ce modèle
    timezone: '+01:00'  // Fuseau horaire de Kinshasa (UTC+1)
  });

  return AuditLog;
};