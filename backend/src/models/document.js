const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actif_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'actifs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    nom_fichier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nom original du fichier'
    },
    chemin_fichier: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Chemin de stockage du fichier'
    },
    type_fichier: {
      type: DataTypes.STRING(100),
      comment: 'Type MIME du fichier'
    },
    taille_fichier: {
      type: DataTypes.INTEGER,
      comment: 'Taille en octets'
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Description du document (facture, contrat, etc.)'
    },
    date_upload: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Document;
};