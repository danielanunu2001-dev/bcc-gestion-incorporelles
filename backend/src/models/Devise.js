// backend/src/models/Devise.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Devise = sequelize.define('Devise', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      unique: true,
      comment: 'USD, EUR, GBP, etc.'
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Dollar US, Euro, etc.'
    },
    symbole: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: '$, €, £, etc.'
    },
    taux_achat: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      comment: "Taux d'achat (BCC vend des devises)"
    },
    taux_vente: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      comment: "Taux de vente (BCC achète des devises)"
    },
    taux_moyen: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1,
      comment: 'Taux moyen (achat + vente) / 2'
    },
    est_principale: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Devise de référence (CDF)'
    },
    date_taux: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Date d'application du taux"
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: 'BCC',
      comment: 'Source du taux (BCC, FMI, BCEAO)'
    },
    variation: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Variation en pourcentage par rapport à la veille'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Devise active ou non'
    }
  }, {
    tableName: 'devises',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Devise;
};