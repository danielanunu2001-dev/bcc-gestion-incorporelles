// backend/src/models/TauxChange.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TauxChange = sequelize.define('TauxChange', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    devise_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'devises', key: 'id' },
    },
    taux_cdf: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
    },
    date_taux: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: 'BCC',
    },
  }, {
    tableName: 'taux_change',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['devise_id', 'date_taux'] }
    ],
  });

  return TauxChange;
};