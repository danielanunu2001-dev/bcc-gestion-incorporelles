// backend/src/models/ExerciceComptable.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExerciceComptable = sequelize.define('ExerciceComptable', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    cloture: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    date_cloture: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    date_approbation: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    resultat: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
    },
    report_a_nouveau: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reserves_change: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
    },
    operations_refinancement: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
    }
    // ✅ Supprimer cette ligne: rapport_politique_monetaire
  }, {
    tableName: 'exercices_comptables',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return ExerciceComptable;
};