// backend/src/models/Devise.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Devise = sequelize.define('Devise', {
    id: {
      type: DataTypes.INTEGER,  // ← Changé de UUID à INTEGER
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 3]
      }
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    symbole: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    taux_achat: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      field: 'taux_achat'
    },
    taux_vente: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      field: 'taux_vente'
    },
    taux_moyen: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      field: 'taux_moyen'
    },
    est_principale: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'est_principale'
    },
    date_taux: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_taux'
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: 'BCC',
      field: 'source'
    },
    variation: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'variation'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'actif'
    }
  }, {
    tableName: 'devises',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return Devise;
};