// backend/src/models/Mouvement.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mouvement = sequelize.define('Mouvement', {
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
    // ✅ CORRECTION : Utiliser type_mouvement (pas type)
    type_mouvement: {
      type: DataTypes.ENUM('entree', 'transfert_interne', 'maintenance', 'reparation', 'mise_hors_service', 'cession', 'don', 'reforme'),
      allowNull: false,
      field: 'type_mouvement'  // ← Nom exact de la colonne en base
    },
    date_mouvement: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: DataTypes.TEXT,
    localisation_source: DataTypes.STRING(200),
    localisation_destination: DataTypes.STRING(200),
    nouvel_etat: DataTypes.STRING(50),
    nouvelle_localisation: DataTypes.STRING(200),
    nouvelle_affectation: DataTypes.STRING(200),
    provenance: DataTypes.STRING(200),
    document_reference: DataTypes.STRING(100),
    cout_maintenance: DataTypes.DECIMAL(15, 2),
    fournisseur_maintenance: DataTypes.STRING(200),
    duree_maintenance: DataTypes.INTEGER,
    prix_cession: DataTypes.DECIMAL(15, 2),
    acquereur: DataTypes.STRING(200),
    plus_moins_value: DataTypes.DECIMAL(15, 2),
    statut: {
      type: DataTypes.ENUM('brouillon', 'valide', 'annule'),
      defaultValue: 'brouillon'
    },
    date_validation: DataTypes.DATE,
    valide_par: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    },
    date_annulation: DataTypes.DATE,
    annule_par: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    },
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    },
    updated_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'mouvements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Mouvement;
};