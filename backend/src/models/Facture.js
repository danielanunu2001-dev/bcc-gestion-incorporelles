// backend/src/models/Facture.js

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
      allowNull: true,
      references: { model: 'actifs', key: 'id' },
      comment: 'Référence vers l’actif concerné (peut être null si facture de contrat)'
    },
    contrat_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contrats', key: 'id' },
      comment: 'Référence vers le contrat concerné (peut être null si facture d\'actif)'
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
    type_facture: {
      type: DataTypes.ENUM('acquisition', 'contrat'),
      defaultValue: 'acquisition',
      comment: 'Type de facture: acquisition (actif) ou contrat'
    },
    fichier_pdf: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chemin relatif du fichier PDF généré (peut être null si généré à la volée)'
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

  // ===== ASSOCIATIONS AVEC ALIAS UNIQUES =====
  Facture.associate = (models) => {
    Facture.belongsTo(models.Actif, { 
      as: 'factureActif',  // ✅ Alias UNIQUE (au lieu de "actif")
      foreignKey: 'actif_id' 
    });
    
    Facture.belongsTo(models.Contrat, { 
      as: 'factureContrat',  // ✅ Alias UNIQUE (au lieu de "contrat")
      foreignKey: 'contrat_id' 
    });
    
    Facture.belongsTo(models.User, { 
      as: 'factureCreateur',  // ✅ Alias UNIQUE (au lieu de "createur")
      foreignKey: 'created_by' 
    });
  };

  return Facture;
};