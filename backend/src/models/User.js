// backend/src/models/User.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'gestionnaire',
      validate: {
        isIn: [['admin', 'gestionnaire', 'comptable', 'auditeur', 'juridique', 'informatique', 'inventoriste']]
      }
    },
    
    // ==================== SÉCURITÉ ET AUTHENTIFICATION ====================
    
    /**
     * Statut actif du compte (désactivation possible par admin)
     */
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'actif'
    },
    
    /**
     * Nombre de tentatives de connexion échouées consécutives
     */
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_login_attempts'
    },
    
    /**
     * Date de verrouillage du compte (jusqu'à cette date)
     */
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    },
    
    /**
     * Date de dernière connexion réussie
     */
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    
    /**
     * Adresse IP de la dernière connexion
     */
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'last_login_ip'
    },
    
    /**
     * Date de dernière modification du mot de passe
     */
    last_password_change: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_password_change'
    },
    
    /**
     * Token de réinitialisation du mot de passe
     */
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'reset_password_token'
    },
    
    /**
     * Expiration du token de réinitialisation
     */
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_password_expires'
    },
    
    /**
     * Token de rafraîchissement JWT (pour rotation)
     */
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token'
    },
    
    /**
     * Liste des tokens JWT actifs (blacklist inverse)
     */
    active_tokens: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'active_tokens',
      get() {
        const rawValue = this.getDataValue('active_tokens');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('active_tokens', JSON.stringify(value));
      }
    },
    
    // ==================== INFORMATIONS PERSONNELLES ====================
    
    /**
     * URL de la photo de profil
     */
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'photo_url'
    },
    
    /**
     * Numéro de téléphone
     */
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone'
    },
    
    /**
     * Fonction/Poste
     */
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'position'
    },
    
    /**
     * Département/Service
     */
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'department'
    },
    
    /**
     * Signature numérique (base64 ou chemin)
     */
    signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'signature'
    },
    
    // ==================== PRÉFÉRENCES UTILISATEUR ====================
    
    /**
     * Thème préféré (light/dark/system)
     */
    theme_preference: {
      type: DataTypes.STRING(20),
      defaultValue: 'light',
      field: 'theme_preference'
    },
    
    /**
     * Devise préférée pour l'affichage
     */
    currency_preference: {
      type: DataTypes.STRING(3),
      defaultValue: 'CDF',
      field: 'currency_preference'
    },
    
    /**
     * Langue préférée (fr/en)
     */
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'fr',
      field: 'language'
    },
    
    /**
     * Notification email activées
     */
    email_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'email_notifications'
    },
    
    // ==================== CHAMPS AUDIT ====================
    
    /**
     * ID de l'utilisateur qui a créé ce compte
     */
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    
    /**
     * ID de l'utilisateur qui a modifié ce compte
     */
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by'
    },
    
    /**
     * Date de suppression (soft delete)
     */
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
    
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    // Hooks pour la sécurité
    hooks: {
      beforeCreate: async (user) => {
        // S'assurer que le mot de passe est hashé
        if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
          const bcrypt = require('bcrypt');
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      beforeUpdate: async (user) => {
        // Si le mot de passe change, mettre à jour last_password_change
        if (user.changed('password_hash')) {
          user.last_password_change = new Date();
          
          // Réinitialiser les tokens actifs
          user.active_tokens = [];
        }
      }
    },
    
    // Indexes pour les performances
    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['actif'] },
      { fields: ['created_at'] },
      { fields: ['last_login'] }
    ]
  });

  // ==================== MÉTHODES D'INSTANCE ====================
  
  /**
   * Vérifie si le compte est verrouillé
   * @returns {boolean}
   */
  User.prototype.isLocked = function() {
    if (!this.locked_until) return false;
    return new Date(this.locked_until) > new Date();
  };
  
  /**
   * Vérifie si le compte est actif
   * @returns {boolean}
   */
  User.prototype.isActive = function() {
    return this.actif === true && !this.isLocked();
  };
  
  /**
   * Incrémente le compteur de tentatives échouées
   * @returns {Promise<void>}
   */
  User.prototype.incrementFailedAttempts = async function() {
    const attempts = (this.failed_login_attempts || 0) + 1;
    this.failed_login_attempts = attempts;
    
    // Verrouillage après 5 tentatives échouées
    if (attempts >= 5) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      this.locked_until = new Date(Date.now() + lockDuration);
      this.failed_login_attempts = 0;
      console.log(`🔒 Compte verrouillé pour 15 minutes: ${this.email}`);
    }
    
    await this.save();
    return attempts;
  };
  
  /**
   * Réinitialise le compteur de tentatives échouées
   * @returns {Promise<void>}
   */
  User.prototype.resetFailedAttempts = async function() {
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  };
  
  /**
   * Enregistre la dernière connexion
   * @param {string} ipAddress - Adresse IP
   * @returns {Promise<void>}
   */
  User.prototype.recordLogin = async function(ipAddress) {
    this.last_login = new Date();
    this.last_login_ip = ipAddress;
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  };
  
  /**
   * Ajoute un token actif
   * @param {string} token - JWT token
   * @returns {Promise<void>}
   */
  User.prototype.addActiveToken = async function(token) {
    const tokens = this.active_tokens || [];
    // Limiter à 10 tokens actifs max par utilisateur
    if (tokens.length >= 10) {
      tokens.shift();
    }
    tokens.push(token);
    this.active_tokens = tokens;
    await this.save();
  };
  
  /**
   * Supprime un token actif (logout)
   * @param {string} token - JWT token à supprimer
   * @returns {Promise<void>}
   */
  User.prototype.removeActiveToken = async function(token) {
    const tokens = (this.active_tokens || []).filter(t => t !== token);
    this.active_tokens = tokens;
    await this.save();
  };
  
  /**
   * Vérifie si un token est actif
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  User.prototype.hasActiveToken = function(token) {
    const tokens = this.active_tokens || [];
    return tokens.includes(token);
  };
  
  /**
   * Supprime tous les tokens actifs (logout de tous les appareils)
   * @returns {Promise<void>}
   */
  User.prototype.revokeAllTokens = async function() {
    this.active_tokens = [];
    if (this.refresh_token) {
      this.refresh_token = null;
    }
    await this.save();
    console.log(`🔑 Tous les tokens révoqués pour: ${this.email}`);
  };
  
  /**
   * Génère un token de réinitialisation de mot de passe
   * @param {number} expiresInHours - Durée de validité en heures
   * @returns {Promise<string>} Token généré
   */
  User.prototype.generatePasswordResetToken = async function(expiresInHours = 24) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    this.reset_password_token = token;
    this.reset_password_expires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    await this.save();
    
    return token;
  };
  
  /**
   * Vérifie si un token de réinitialisation est valide
   * @param {string} token - Token à vérifier
   * @returns {boolean}
   */
  User.prototype.isPasswordResetTokenValid = function(token) {
    return this.reset_password_token === token && 
           this.reset_password_expires && 
           new Date(this.reset_password_expires) > new Date();
  };
  
  /**
   * Efface le token de réinitialisation après utilisation
   * @returns {Promise<void>}
   */
  User.prototype.clearPasswordResetToken = async function() {
    this.reset_password_token = null;
    this.reset_password_expires = null;
    await this.save();
  };
  
  /**
   * Retourne les données publiques (sans infos sensibles)
   * @returns {Object}
   */
  User.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      email: this.email,
      full_name: this.full_name,
      role: this.role,
      photo_url: this.photo_url,
      phone: this.phone,
      position: this.position,
      department: this.department,
      theme_preference: this.theme_preference,
      currency_preference: this.currency_preference,
      language: this.language,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  };

  return User;
};