const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Facture = sequelize.define('Facture', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_facture: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Numéro unique de facture'
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'actifs', key: 'id' },
      comment: 'Référence vers l’actif concerné'
    },
    date_emission: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    montant_ht: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    montant_tva: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Montant de la TVA (si applicable)'
    },
    montant_ttc: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    devise: {
      type: DataTypes.STRING(3),
      defaultValue: 'CDF'
    },
    fichier_pdf: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Chemin relatif du fichier PDF généré'
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'factures',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Facture.associate = (models) => {
    Facture.belongsTo(models.Actif, { as: 'actif', foreignKey: 'actif_id' });
    Facture.belongsTo(models.User, { as: 'createur', foreignKey: 'created_by' });
  };

  return Facture;
};