// backend/src/models/document.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'actifs', key: 'id' }
    },
    nom_fichier: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    chemin_fichier: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    type_fichier: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    taille_fichier: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    categorie: {
      type: DataTypes.STRING(50),
      defaultValue: 'reglementation'
    },
    confidentialite: {
      type: DataTypes.STRING(20),
      defaultValue: 'public'
    },
    mots_cles: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duree_conservation: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    date_expiration: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nombre_consultations: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    nombre_telechargements: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    date_upload: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,  // ✅ Désactiver updated_at
    // ✅ Empêcher Sequelize de sélectionner updated_at
    defaultScope: {
      attributes: { exclude: ['updated_at'] }
    },
    scopes: {
      withTimestamps: {
        attributes: { include: ['created_at'] }
      }
    }
  });

  Document.associate = (models) => {
    Document.belongsTo(models.Actif, { as: 'documentActif', foreignKey: 'actif_id' });
    Document.belongsTo(models.User, { as: 'documentCreateur', foreignKey: 'created_by' });
    Document.hasMany(models.DocumentLog, { as: 'documentLogs', foreignKey: 'document_id' });
  };

  return Document;
};