// backend/src/models/TauxChange.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TauxChange = sequelize.define('TauxChange', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 10]
      }
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    symbole: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    taux_change_actuel: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: 0,
      field: 'taux_cdf' // ← Mapper vers la colonne existante 'taux_cdf'
    },
    date_mise_a_jour: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_taux' // ← Mapper vers la colonne existante 'date_taux'
    },
    devise_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devises',
        key: 'id'
      }
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'frankfurter-api'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'taux_change',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return TauxChange;
};