// backend/src/models/CategorieAmortissement.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CategorieAmortissement = sequelize.define('CategorieAmortissement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code_categorie: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      field: 'code_categorie'
    },
    nom_categorie: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'nom_categorie'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    duree_vie_ans: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'duree_vie_ans'
    },
    // ✅ CORRECTION ICI : Remplacer ENUM par STRING
    mode_amortissement_defaut: {
      type: DataTypes.STRING(20),  // ← Changement clé
      defaultValue: 'lineaire',
      validate: {
        isIn: [['lineaire', 'degressif']]
      },
      field: 'mode_amortissement_defaut'
    },
    taux_amortissement: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'taux_amortissement'
    },
    coefficient_degressif: {
      type: DataTypes.DECIMAL(3, 2),
      field: 'coefficient_degressif'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'actif'
    },
    compte_comptable_defaut: {
      type: DataTypes.STRING(10),
      field: 'compte_comptable_defaut'
    },
    created_by: {
      type: DataTypes.UUID,
      field: 'created_by'
    },
    updated_by: {
      type: DataTypes.UUID,
      field: 'updated_by'
    }
  }, {
    tableName: 'categories_amortissement',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CategorieAmortissement;
};