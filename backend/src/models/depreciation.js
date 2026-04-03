const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Depreciation = sequelize.define('Depreciation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date_test: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valeur_recouvrable: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    valeur_comptable: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    provision: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    commentaire: {
      type: DataTypes.TEXT
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'depreciations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  Depreciation.associate = (models) => {
    Depreciation.belongsTo(models.Actif, { foreignKey: 'actif_id', onDelete: 'CASCADE' });
    Depreciation.belongsTo(models.User, { as: 'createur', foreignKey: 'created_by' });
  };

  return Depreciation;
};