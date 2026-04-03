const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reevaluation = sequelize.define('Reevaluation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'actifs', key: 'id' }
    },
    date_reevaluation: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valeur_avant: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Valeur nette comptable avant réévaluation'
    },
    valeur_apres: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Nouvelle valeur après réévaluation'
    },
    plus_value: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    moins_value: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    compte_reevaluation: {
      type: DataTypes.STRING(10),
      comment: 'Compte de réévaluation (GCEC)'
    },
    nouvelle_duree_ans: {
      type: DataTypes.INTEGER,
      comment: 'Nouvelle durée d\'utilité après réévaluation'
    },
    nouveau_taux: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Nouveau taux d\'amortissement'
    },
    commentaire: {
      type: DataTypes.TEXT
    },
    document_reference: {
      type: DataTypes.STRING(100),
      comment: 'Référence du rapport d\'expertise'
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'reevaluations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Reevaluation;
};