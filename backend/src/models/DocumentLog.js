// backend/src/models/DocumentLog.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DocumentLog = sequelize.define('DocumentLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'documents', key: 'id' },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['VIEW', 'DOWNLOAD', 'SHARE', 'DELETE', 'UPLOAD']]
      }
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    action_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'document_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Associations avec des alias UNIQUES
  DocumentLog.associate = (models) => {
    DocumentLog.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'documentLogDocument'
    });
    
    DocumentLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'documentLogUser'
    });
  };

  return DocumentLog;
};