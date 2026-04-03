// backend/src/models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// ============ IMPORTER TOUS LES MODÈLES ============
// Importer les modèles existants
const User = require('./user')(sequelize);
const Actif = require('./Actif')(sequelize);
const Amortissement = require('./amortissement')(sequelize);
const AuditLog = require('./auditLog')(sequelize);
const Contrat = require('./contrat')(sequelize);
const Depreciation = require('./depreciation')(sequelize);
const Mouvement = require('./mouvement')(sequelize);

// Modèles pour la gestion avancée
const CategorieAmortissement = require('./categorieAmortissement')(sequelize);
const Reevaluation = require('./reevaluation')(sequelize);

// Modèles pour les anomalies et documents
const Anomalie = require('./anomalie')(sequelize);
const Document = require('./document')(sequelize);

// ✅ MODÈLE POUR LES DEVISES (GESTION MULTI-DEVISES)
const Devise = require('./Devise')(sequelize);

// ✅ MODÈLE POUR LES EXERCICES COMPTABLES
const ExerciceComptable = require('./ExerciceComptable')(sequelize);

// ✅ MODÈLE POUR LES FACTURES
const Facture = require('./Facture')(sequelize);

// ============ ASSOCIATIONS EXISTANTES ============

// Associations User ↔ Actif
User.hasMany(Actif, { as: 'actifsCrees', foreignKey: 'created_by' });
User.hasMany(Actif, { as: 'actifsModifiees', foreignKey: 'updated_by' });

Actif.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
Actif.belongsTo(User, { as: 'modificateur', foreignKey: 'updated_by' });

// Associations Actif ↔ Amortissement
Actif.hasMany(Amortissement, { foreignKey: 'actif_id', onDelete: 'CASCADE' });
Amortissement.belongsTo(Actif, { foreignKey: 'actif_id' });

// Associations Actif ↔ Contrat
Actif.hasMany(Contrat, { foreignKey: 'actif_id', onDelete: 'CASCADE' });
Contrat.belongsTo(Actif, { foreignKey: 'actif_id' });

// Associations Actif ↔ Depreciation
Actif.hasMany(Depreciation, { foreignKey: 'actif_id', onDelete: 'CASCADE' });
Depreciation.belongsTo(Actif, { foreignKey: 'actif_id' });

// ============ ASSOCIATIONS POUR MOUVEMENT ============

// Actif ↔ Mouvement
Actif.hasMany(Mouvement, { 
  foreignKey: 'actif_id', 
  as: 'mouvements',
  onDelete: 'CASCADE' 
});
Mouvement.belongsTo(Actif, { 
  foreignKey: 'actif_id',
  as: 'actif' 
});

// User (créateur) ↔ Mouvement
User.hasMany(Mouvement, { 
  foreignKey: 'created_by',
  as: 'mouvementsCrees' 
});
Mouvement.belongsTo(User, { 
  as: 'createur', 
  foreignKey: 'created_by' 
});

// User (validateur) ↔ Mouvement
User.hasMany(Mouvement, { 
  foreignKey: 'validated_by',
  as: 'mouvementsValides' 
});
Mouvement.belongsTo(User, { 
  as: 'validateur', 
  foreignKey: 'validated_by' 
});

// ============ ASSOCIATIONS AVEC CATÉGORIES ET RÉÉVALUATIONS ============

// Associations Actif ↔ CategorieAmortissement
Actif.belongsTo(CategorieAmortissement, { 
  as: 'categorie', 
  foreignKey: 'categorie_id' 
});
CategorieAmortissement.hasMany(Actif, { 
  foreignKey: 'categorie_id',
  as: 'actifs'
});

// Associations Actif ↔ Reevaluation
Actif.hasMany(Reevaluation, { 
  foreignKey: 'actif_id', 
  as: 'reevaluations',
  onDelete: 'CASCADE' 
});
Reevaluation.belongsTo(Actif, { 
  foreignKey: 'actif_id',
  as: 'actif' 
});

// Associations User ↔ Reevaluation
Reevaluation.belongsTo(User, { 
  as: 'createurReevaluation', 
  foreignKey: 'created_by' 
});
User.hasMany(Reevaluation, { 
  foreignKey: 'created_by',
  as: 'reevaluationsCrees'
});

// ============ ASSOCIATIONS POUR ANOMALIE ============

// Associations Actif ↔ Anomalie
Actif.hasMany(Anomalie, { 
  foreignKey: 'actif_id', 
  as: 'anomalies',
  onDelete: 'CASCADE' 
});
Anomalie.belongsTo(Actif, { 
  foreignKey: 'actif_id',
  as: 'actif' 
});

// Associations User ↔ Anomalie (créateur)
Anomalie.belongsTo(User, { 
  as: 'createurAnomalie', 
  foreignKey: 'created_by' 
});
User.hasMany(Anomalie, { 
  foreignKey: 'created_by',
  as: 'anomaliesCrees'
});

// Associations User ↔ Anomalie (résolveur)
Anomalie.belongsTo(User, { 
  as: 'resoluPar', 
  foreignKey: 'resolu_par' 
});
User.hasMany(Anomalie, { 
  foreignKey: 'resolu_par',
  as: 'anomaliesResolues'
});

// ============ ASSOCIATIONS POUR DOCUMENT ============

// Associations Actif ↔ Document
Actif.hasMany(Document, { 
  foreignKey: 'actif_id', 
  as: 'documents',
  onDelete: 'CASCADE' 
});
Document.belongsTo(Actif, { 
  foreignKey: 'actif_id',
  as: 'actif' 
});

// Associations User ↔ Document (créateur)
Document.belongsTo(User, { 
  as: 'createurDocument', 
  foreignKey: 'created_by' 
});
User.hasMany(Document, { 
  foreignKey: 'created_by',
  as: 'documentsCrees'
});

// ============ ASSOCIATIONS POUR DEVISES (MULTI-DEVISES) ============

// ✅ Associations Actif ↔ Devise
Actif.belongsTo(Devise, { 
  as: 'devise', 
  foreignKey: 'devise_id' 
});
Devise.hasMany(Actif, { 
  foreignKey: 'devise_id',
  as: 'actifs'
});

// ============ ASSOCIATIONS POUR FACTURES ============

// ✅ Associations Actif ↔ Facture
Actif.hasOne(Facture, { 
  foreignKey: 'actif_id', 
  as: 'facture',
  onDelete: 'CASCADE' 
});
Facture.belongsTo(Actif, { 
  foreignKey: 'actif_id',
  as: 'actif' 
});

// Associations User ↔ Facture (créateur)
Facture.belongsTo(User, { 
  as: 'createurFacture', 
  foreignKey: 'created_by' 
});
User.hasMany(Facture, { 
  foreignKey: 'created_by',
  as: 'facturesCrees'
});

// ============ ASSOCIATIONS POUR EXERCICES COMPTABLES ============

// ✅ NOTE: La table exercices_comptables n'a pas les colonnes created_by et updated_by
// Les associations avec User sont donc commentées jusqu'à ce que ces colonnes soient ajoutées
// ExerciceComptable.belongsTo(User, { 
//   as: 'createurExercice', 
//   foreignKey: 'created_by' 
// });
// User.hasMany(ExerciceComptable, { 
//   foreignKey: 'created_by',
//   as: 'exercicesCrees'
// });

// Associations ExerciceComptable avec User (modificateur)
// ExerciceComptable.belongsTo(User, { 
//   as: 'modificateurExercice', 
//   foreignKey: 'updated_by' 
// });
// User.hasMany(ExerciceComptable, { 
//   foreignKey: 'updated_by',
//   as: 'exercicesModifies'
// });

// ============ AUTRES ASSOCIATIONS ============

// Associations AuditLog
User.hasMany(AuditLog, { as: 'logs', foreignKey: 'user_id' });
AuditLog.belongsTo(User, { as: 'utilisateur', foreignKey: 'user_id' });

// Associations Contrat avec User
Contrat.belongsTo(User, { as: 'createurContrat', foreignKey: 'created_by' });
Contrat.belongsTo(User, { as: 'modificateurContrat', foreignKey: 'updated_by' });

// Associations Depreciation avec User
Depreciation.belongsTo(User, { as: 'createurDepreciation', foreignKey: 'created_by' });

// ============ EXPORT DES MODÈLES ============

module.exports = {
  sequelize,
  Sequelize,
  User,
  Actif,
  Amortissement,
  AuditLog,
  Contrat,
  Depreciation,
  Mouvement,
  CategorieAmortissement,
  Reevaluation,
  Anomalie,
  Document,
  Devise,              // ✅ MODÈLE DEVISE
  ExerciceComptable,   // ✅ MODÈLE EXERCICE COMPTABLE
  Facture              // ✅ MODÈLE FACTURE
};