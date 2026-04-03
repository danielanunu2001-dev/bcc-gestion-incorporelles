const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Amortissement = sequelize.define('Amortissement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'actifs', key: 'id' },
      comment: 'Référence vers l\'actif'
    },
    exercice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Année d\'exercice'
    },
    annuite: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Annuité d\'amortissement'
    },
    cumul_amortissements: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Amortissements cumulés'
    },
    valeur_nette: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Valeur nette comptable'
    },
    taux: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Taux d\'amortissement applicable (%)'
    }
  }, {
    tableName: 'amortissements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['actif_id', 'exercice'],
        name: 'amortissements_actif_exercice_unique'
      },
      {
        fields: ['actif_id'],
        name: 'amortissements_actif_id_idx'
      },
      {
        fields: ['exercice'],
        name: 'amortissements_exercice_idx'
      }
    ]
  });

  return Amortissement;
};