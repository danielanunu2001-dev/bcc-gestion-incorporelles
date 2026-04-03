// backend/src/models/Anomalie.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Anomalie = sequelize.define('Anomalie', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'actifs', key: 'id' }
    },
    type_anomalie: {
      type: DataTypes.ENUM('manquant', 'endommage', 'non_conforme', 'autre'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    date_constat: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    localisation: {                      // ✅ Ajouté
      type: DataTypes.STRING(200)
    },
    commentaire: {                       // ✅ Ajouté
      type: DataTypes.TEXT
    },
    statut: {
      type: DataTypes.ENUM('signalé', 'en_cours', 'résolu'),
      defaultValue: 'signalé'
    },
    date_resolution: {
      type: DataTypes.DATEONLY
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    },
    resolu_par: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'anomalies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Anomalie;
};