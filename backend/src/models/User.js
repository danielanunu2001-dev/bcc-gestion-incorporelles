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
    // ✅ AJOUT DE LA COLONNE PHOTO_URL
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'photo_url'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};