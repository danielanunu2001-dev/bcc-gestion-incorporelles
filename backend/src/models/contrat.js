// backend/src/models/Contrat.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contrat = sequelize.define('Contrat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_contrat: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fournisseur: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    montant: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    // ✅ SUPPRIMER la ligne "type" si elle existe
    // type: { ... }, // <-- À supprimer si présent
    fichier: {
      type: DataTypes.STRING,
      comment: 'Chemin du fichier uploadé'
    },
    facture_pdf: {
      type: DataTypes.STRING,
      comment: 'Chemin du fichier PDF de la facture associée'
    },
    alertes_envoyees: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Dates des alertes déjà envoyées'
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'contrats',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Contrat.associate = (models) => {
    Contrat.belongsTo(models.Actif, { foreignKey: 'actif_id', onDelete: 'CASCADE' });
    Contrat.belongsTo(models.User, { as: 'createur', foreignKey: 'created_by' });
    Contrat.belongsTo(models.User, { as: 'modificateur', foreignKey: 'updated_by' });
  };

  return Contrat;
};