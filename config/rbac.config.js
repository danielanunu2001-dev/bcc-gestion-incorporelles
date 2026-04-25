/**
 * RBAC - Role-Based Access Control Configuration
 * ================================================
 * Configuration centralisée des permissions par rôle
 * Utilisable côté backend (Node.js) et frontend (React)
 * 
 * @version 1.0.0
 * @author BCC - Direction des Systèmes d'Information
 */

// ==================== LISTE DES RÔLES ====================
const ROLES = {
  ADMIN: 'admin',
  COMPTABLE: 'comptable',
  AUDITEUR: 'auditeur',
  JURIDIQUE: 'juridique',
  INFORMATIQUE: 'informatique',
  INVENTORISTE: 'inventoriste',
  GESTIONNAIRE: 'gestionnaire'
};

// Hiérarchie des rôles (pour les héritages de permissions)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: ['admin'],
  [ROLES.COMPTABLE]: ['comptable', 'gestionnaire'],
  [ROLES.AUDITEUR]: ['auditeur'],
  [ROLES.JURIDIQUE]: ['juridique', 'gestionnaire'],
  [ROLES.INFORMATIQUE]: ['informatique', 'gestionnaire'],
  [ROLES.INVENTORISTE]: ['inventoriste'],
  [ROLES.GESTIONNAIRE]: ['gestionnaire']
};

// ==================== PERMISSIONS PAR MODULE ====================

// 1. ACTIFS
const ACTIFS_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR, ROLES.JURIDIQUE, ROLES.INFORMATIQUE, ROLES.INVENTORISTE, ROLES.GESTIONNAIRE],
  create: [ROLES.ADMIN, ROLES.COMPTABLE],
  update: [ROLES.ADMIN, ROLES.COMPTABLE],
  updateTechnique: [ROLES.ADMIN, ROLES.INFORMATIQUE],
  updateLocalisation: [ROLES.ADMIN, ROLES.INVENTORISTE, ROLES.GESTIONNAIRE],
  updateFinancier: [ROLES.ADMIN, ROLES.COMPTABLE],
  delete: [ROLES.ADMIN, ROLES.COMPTABLE],
  viewFinancier: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  viewITOnly: [ROLES.INFORMATIQUE],
  generateQRCode: [ROLES.ADMIN, ROLES.INVENTORISTE]
};

// 2. AMORTISSEMENTS
const AMORTISSEMENTS_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  calculer: [ROLES.ADMIN, ROLES.COMPTABLE],
  recalculer: [ROLES.ADMIN, ROLES.COMPTABLE],
  revaluation: [ROLES.ADMIN, ROLES.COMPTABLE],
  depreciation: [ROLES.ADMIN, ROLES.COMPTABLE],
  export: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR]
};

// 3. CONTRATS
const CONTRATS_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR, ROLES.JURIDIQUE],
  create: [ROLES.ADMIN, ROLES.JURIDIQUE],
  update: [ROLES.ADMIN, ROLES.JURIDIQUE],
  delete: [ROLES.ADMIN, ROLES.JURIDIQUE],
  upload: [ROLES.ADMIN, ROLES.JURIDIQUE],
  download: [ROLES.ADMIN, ROLES.JURIDIQUE, ROLES.COMPTABLE, ROLES.AUDITEUR]
};

// 4. MOUVEMENTS
const MOUVEMENTS_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  create: [ROLES.ADMIN, ROLES.COMPTABLE],
  createMaintenance: [ROLES.ADMIN, ROLES.INFORMATIQUE],
  createTransfert: [ROLES.ADMIN, ROLES.COMPTABLE],
  createSortie: [ROLES.ADMIN, ROLES.COMPTABLE],
  valider: [ROLES.ADMIN],
  delete: [ROLES.ADMIN]
};

// 5. INVENTAIRE
const INVENTAIRE_PERMISSIONS = {
  scanner: [ROLES.ADMIN, ROLES.INVENTORISTE],
  updateLocalisation: [ROLES.ADMIN, ROLES.INVENTORISTE],
  prendrePhoto: [ROLES.ADMIN, ROLES.INVENTORISTE],
  signalerAnomalie: [ROLES.ADMIN, ROLES.INVENTORISTE, ROLES.COMPTABLE],
  modeHorsLigne: [ROLES.ADMIN, ROLES.INVENTORISTE],
  synchronisation: [ROLES.ADMIN, ROLES.INVENTORISTE],
  consulterAnomalies: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR]
};

// 6. RAPPORTS
const RAPPORTS_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  export: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  etatImmobilisations: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  planAmortissement: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  suiviInvestissements: [ROLES.ADMIN, ROLES.COMPTABLE],
  rapportAnomalies: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  alertes: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.JURIDIQUE, ROLES.INFORMATIQUE]
};

// 7. UTILISATEURS
const UTILISATEURS_PERMISSIONS = {
  read: [ROLES.ADMIN],
  create: [ROLES.ADMIN],
  update: [ROLES.ADMIN],
  delete: [ROLES.ADMIN],
  assignRole: [ROLES.ADMIN],
  resetPassword: [ROLES.ADMIN]
};

// 8. AUDIT
const AUDIT_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.AUDITEUR],
  export: [ROLES.ADMIN, ROLES.AUDITEUR],
  readUserActions: [ROLES.ADMIN, ROLES.AUDITEUR]
};

// 9. PARAMÈTRES
const PARAMETRES_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE],
  write: [ROLES.ADMIN],
  categoriesAmortissement: {
    read: [ROLES.ADMIN, ROLES.COMPTABLE],
    write: [ROLES.ADMIN]
  },
  exercicesComptables: {
    read: [ROLES.ADMIN, ROLES.COMPTABLE],
    write: [ROLES.ADMIN]
  }
};

// 10. TABLEAU DE BORD (DASHBOARD)
const DASHBOARD_PERMISSIONS = {
  read: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR, ROLES.JURIDIQUE, ROLES.INFORMATIQUE, ROLES.INVENTORISTE, ROLES.GESTIONNAIRE],
  voirAlertes: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.JURIDIQUE, ROLES.INFORMATIQUE],
  voirStats: [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR]
};

// ==================== PERMISSIONS DES PAGES (MENU) ====================
const MENU_PERMISSIONS = {
  '/dashboard': [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR, ROLES.JURIDIQUE, ROLES.INFORMATIQUE, ROLES.INVENTORISTE, ROLES.GESTIONNAIRE],
  '/actifs': [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.JURIDIQUE, ROLES.INFORMATIQUE, ROLES.INVENTORISTE, ROLES.GESTIONNAIRE],
  '/inventaire': [ROLES.ADMIN, ROLES.INVENTORISTE],
  '/contrats': [ROLES.ADMIN, ROLES.JURIDIQUE],
  '/utilisateurs': [ROLES.ADMIN],
  '/audit': [ROLES.ADMIN, ROLES.AUDITEUR],
  '/parametres': [ROLES.ADMIN, ROLES.COMPTABLE],
  '/rapports': [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  '/amortissements': [ROLES.ADMIN, ROLES.COMPTABLE, ROLES.AUDITEUR],
  '/maintenance': [ROLES.ADMIN, ROLES.INFORMATIQUE]
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Vérifie si un rôle a une permission spécifique
 * @param {string} role - Le rôle de l'utilisateur
 * @param {Array} allowedRoles - Liste des rôles autorisés
 * @returns {boolean}
 */
const hasPermission = (role, allowedRoles) => {
  if (!role) return false;
  return allowedRoles.includes(role);
};

/**
 * Vérifie si un rôle a une permission en tenant compte de la hiérarchie
 * @param {string} role - Le rôle de l'utilisateur
 * @param {Array} allowedRoles - Liste des rôles autorisés
 * @returns {boolean}
 */
const hasPermissionWithHierarchy = (role, allowedRoles) => {
  if (!role) return false;
  const inheritedRoles = ROLE_HIERARCHY[role] || [role];
  return inheritedRoles.some(r => allowedRoles.includes(r));
};

/**
 * Retourne le middleware Express pour les routes
 * @param {...string} allowedRoles - Liste des rôles autorisés
 * @returns {function} Middleware Express
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Accès interdit. Rôle requis: ${allowedRoles.join(', ')}`,
        yourRole: req.user.role
      });
    }
    next();
  };
};

/**
 * Middleware pour vérifier la permission sur une action spécifique
 * @param {Object} permissionConfig - Configuration de permission (ex: ACTIFS_PERMISSIONS.create)
 * @returns {function} Middleware Express
 */
const authorizeAction = (permissionConfig) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (!permissionConfig.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Action non autorisée pour votre rôle`,
        yourRole: req.user.role
      });
    }
    next();
  };
};

/**
 * Hook React pour les permissions frontend
 * @param {string} role - Le rôle de l'utilisateur connecté
 * @returns {object} Objet avec les méthodes de vérification
 */
const usePermissions = (role) => {
  const can = (allowedRoles) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  const canWithHierarchy = (allowedRoles) => {
    if (!role) return false;
    const inheritedRoles = ROLE_HIERARCHY[role] || [role];
    return inheritedRoles.some(r => allowedRoles.includes(r));
  };

  return {
    can,
    canWithHierarchy,
    role,
    isAdmin: role === ROLES.ADMIN,
    isComptable: role === ROLES.COMPTABLE,
    isAuditeur: role === ROLES.AUDITEUR,
    isJuridique: role === ROLES.JURIDIQUE,
    isInformatique: role === ROLES.INFORMATIQUE,
    isInventoriste: role === ROLES.INVENTORISTE,
    isGestionnaire: role === ROLES.GESTIONNAIRE,
    
    // Permissions spécifiques (raccourcis)
    canReadActifs: () => hasPermission(role, ACTIFS_PERMISSIONS.read),
    canCreateActif: () => hasPermission(role, ACTIFS_PERMISSIONS.create),
    canUpdateActif: () => hasPermission(role, ACTIFS_PERMISSIONS.update),
    canDeleteActif: () => hasPermission(role, ACTIFS_PERMISSIONS.delete),
    canViewFinancier: () => hasPermission(role, ACTIFS_PERMISSIONS.viewFinancier),
    canManageUsers: () => hasPermission(role, UTILISATEURS_PERMISSIONS.read),
    canViewAudit: () => hasPermission(role, AUDIT_PERMISSIONS.read),
    canManageContrats: () => hasPermission(role, CONTRATS_PERMISSIONS.create),
    canDoInventory: () => hasPermission(role, INVENTAIRE_PERMISSIONS.scanner),
    canGenerateQRCode: () => hasPermission(role, ACTIFS_PERMISSIONS.generateQRCode),
    canSignalAnomalie: () => hasPermission(role, INVENTAIRE_PERMISSIONS.signalerAnomalie),
  };
};

// ==================== EXPORTS ====================
module.exports = {
  // Constantes
  ROLES,
  ROLE_HIERARCHY,
  
  // Permissions par module
  ACTIFS_PERMISSIONS,
  AMORTISSEMENTS_PERMISSIONS,
  CONTRATS_PERMISSIONS,
  MOUVEMENTS_PERMISSIONS,
  INVENTAIRE_PERMISSIONS,
  RAPPORTS_PERMISSIONS,
  UTILISATEURS_PERMISSIONS,
  AUDIT_PERMISSIONS,
  PARAMETRES_PERMISSIONS,
  DASHBOARD_PERMISSIONS,
  MENU_PERMISSIONS,
  
  // Fonctions utilitaires
  hasPermission,
  hasPermissionWithHierarchy,
  authorize,
  authorizeAction,
  usePermissions
};