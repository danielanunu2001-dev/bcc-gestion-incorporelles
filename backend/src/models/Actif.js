// backend/src/models/Actif.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Actif = sequelize.define('Actif', {
    // ===== IDENTIFICATION =====
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Code interne (peut être le numéro d\'inventaire)'
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        'logiciel', 'brevet', 'licence', 'fonds_commercial', 'autres',
        'materiel', 'vehicule', 'bâtiment', 'terrain'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },

    // ===== INVENTAIRE ET CARACTÉRISTIQUES =====
    numero_inventaire: {
      type: DataTypes.STRING(50),
      unique: true,
      comment: 'Numéro d\'inventaire unique (peut être identique au code)'
    },
    marque: DataTypes.STRING(100),
    modele: DataTypes.STRING(100),
    numero_serie: DataTypes.STRING(100),
    localisation: DataTypes.STRING(200),
    fournisseur: DataTypes.STRING(200),
    etat: {
      type: DataTypes.ENUM('neuf', 'bon', 'reparation', 'hors_service'),
      defaultValue: 'bon'
    },
    affectation: DataTypes.STRING(200),
    type_immobilisation: {
      type: DataTypes.ENUM('corporel', 'incorporel'),
      defaultValue: 'incorporel'
    },

    // ===== POUR LES INCORPORELS =====
    date_validite: DataTypes.DATEONLY,
    nombre_utilisateurs: DataTypes.INTEGER,
    support: DataTypes.STRING(100),

    // ===== ACQUISITION =====
    date_acquisition: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    cout_acquisition: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },

    // ===== DEVISE (GESTION MULTI-DEVISES) =====
    devise_id: {
      type: DataTypes.UUID,
      references: {
        model: 'devises',
        key: 'id'
      },
      allowNull: true,
      comment: 'Devise d\'acquisition (CDF, USD, EUR, etc.)'
    },
    montant_devise: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Montant dans la devise d\'origine'
    },
    taux_change_utilisation: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Taux de change utilisé à l\'acquisition'
    },

    // ===== AMORTISSEMENT =====
    valeur_residuelle: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    duree_utile_ans: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mode_amortissement: {
      type: DataTypes.ENUM('lineaire', 'degressif'),
      allowNull: false
    },
    
    // Taux d'amortissement (peut être calculé automatiquement)
    taux_amortissement: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Taux d\'amortissement en pourcentage (calculé automatiquement si non spécifié)'
    },
    
    // Numéro de facture pour le suivi comptable
    numero_facture: {
      type: DataTypes.STRING(50),
      comment: 'Numéro de facture d\'acquisition'
    },
    
    // ✅ Catégorie d'amortissement (selon GCEC)
    categorie_id: {
      type: DataTypes.UUID,
      references: {
        model: 'categories_amortissement',
        key: 'id'
      },
      allowNull: true,
      comment: 'Catégorie d\'amortissement selon le GCEC'
    },

    // ===== RÉÉVALUATION (selon normes IFRS) =====
    valeur_reevaluee: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Valeur après réévaluation (modèle de la réévaluation)'
    },
    date_derniere_reevaluation: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    cumul_reevaluations: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Cumul des plus-values de réévaluation'
    },
    duree_residuelle_ans: {
      type: DataTypes.INTEGER,
      comment: 'Durée de vie résiduelle après réévaluation'
    },

    // ===== DÉPRÉCIATION =====
    depreciation_actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indique si l\'actif a subi une dépréciation'
    },
    provision_depreciation: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Provision pour dépréciation (pertes de valeur)'
    },
    montant_depreciation: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Montant de la dépréciation constatée'
    },
    date_dernier_test_depreciation: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    // ===== SORTIE / CESSION =====
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'True = actif en service, False = sorti'
    },
    date_sortie: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    type_sortie: {
      type: DataTypes.ENUM('cession', 'mise_au_rebut', 'don'),
      allowNull: true
    },
    prix_cession: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    plus_moins_value: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Plus ou moins-value réalisée à la sortie'
    },
    motif_sortie: {
      type: DataTypes.TEXT,
      comment: 'Motif de la sortie (cession, obsolescence, perte, etc.)'
    },

    // ===== COMPTABILITÉ (GCEC) =====
    compte_comptable: {
      type: DataTypes.STRING(10),
      defaultValue: '205',
      comment: 'Compte comptable selon le GCEC (205 = incorporels, 218 = matériel, etc.)'
    },

    // ===== MÉTADONNÉES =====
    created_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    },
    updated_by: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' }
    }

  }, {
    tableName: 'actifs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    // Index pour optimiser les recherches
    indexes: [
      { fields: ['code'] },
      { fields: ['numero_inventaire'] },
      { fields: ['type'] },
      { fields: ['etat'] },
      { fields: ['type_immobilisation'] },
      { fields: ['actif'] },
      { fields: ['date_acquisition'] },
      { fields: ['compte_comptable'] },
      { fields: ['categorie_id'] },
      { fields: ['devise_id'] },
      { fields: ['numero_facture'] }
    ],
    
    // Hooks pour calculer automatiquement le taux d'amortissement
    hooks: {
      beforeCreate: async (actif, options) => {
        // Calculer le taux d'amortissement si non fourni
        if (!actif.taux_amortissement && actif.duree_utile_ans > 0) {
          if (actif.mode_amortissement === 'lineaire') {
            actif.taux_amortissement = 100 / actif.duree_utile_ans;
          } else if (actif.mode_amortissement === 'degressif') {
            // Taux dégressif = taux linéaire × coefficient
            const tauxLineaire = 100 / actif.duree_utile_ans;
            let coefficient = 1.5;
            if (actif.duree_utile_ans <= 4) coefficient = 1.5;
            else if (actif.duree_utile_ans <= 6) coefficient = 2;
            else coefficient = 2.5;
            actif.taux_amortissement = tauxLineaire * coefficient;
          }
        }
      },
      beforeUpdate: async (actif, options) => {
        // Recalculer le taux si la durée ou le mode change
        if (actif.changed('duree_utile_ans') || actif.changed('mode_amortissement')) {
          if (actif.mode_amortissement === 'lineaire') {
            actif.taux_amortissement = 100 / actif.duree_utile_ans;
          } else if (actif.mode_amortissement === 'degressif') {
            const tauxLineaire = 100 / actif.duree_utile_ans;
            let coefficient = 1.5;
            if (actif.duree_utile_ans <= 4) coefficient = 1.5;
            else if (actif.duree_utile_ans <= 6) coefficient = 2;
            else coefficient = 2.5;
            actif.taux_amortissement = tauxLineaire * coefficient;
          }
        }
      }
    }
  });

  // ===== ASSOCIATIONS =====
  Actif.associate = (models) => {
    // Un actif peut avoir plusieurs amortissements
    Actif.hasMany(models.Amortissement, {
      foreignKey: 'actif_id',
      as: 'Amortissements'
    });
    
    // Un actif peut avoir plusieurs contrats
    Actif.hasMany(models.Contrat, {
      foreignKey: 'actif_id',
      as: 'Contrats'
    });
    
    // Un actif peut avoir plusieurs dépréciations
    Actif.hasMany(models.Depreciation, {
      foreignKey: 'actif_id',
      as: 'Depreciations'
    });
    
    // Un actif peut avoir plusieurs mouvements
    Actif.hasMany(models.Mouvement, {
      foreignKey: 'actif_id',
      as: 'Mouvements'
    });
    
    // Un actif peut avoir plusieurs documents
    Actif.hasMany(models.Document, {
      foreignKey: 'actif_id',
      as: 'Documents'
    });
    
    // Un actif peut avoir plusieurs réévaluations
    Actif.hasMany(models.Reevaluation, {
      foreignKey: 'actif_id',
      as: 'Reevaluations'
    });
    
    // Un actif peut avoir plusieurs anomalies
    Actif.hasMany(models.Anomalie, {
      foreignKey: 'actif_id',
      as: 'Anomalies'
    });
    
    // Un actif appartient à une catégorie d'amortissement
    Actif.belongsTo(models.CategorieAmortissement, {
      foreignKey: 'categorie_id',
      as: 'categorie'
    });
    
    // ✅ Un actif appartient à une devise
    Actif.belongsTo(models.Devise, {
      foreignKey: 'devise_id',
      as: 'devise'
    });
    
    // Un actif est créé par un utilisateur
    Actif.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'createur'
    });
    
    // Un actif est modifié par un utilisateur
    Actif.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'modificateur'
    });
  };

  return Actif;
};