const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadDir = 'uploads/profiles';

const optimizeAndSavePhoto = async (filePath, userId) => {
  try {
    const outputFilename = `user-${userId}-optimized-${Date.now()}.jpg`;
    const outputPath = path.join(uploadDir, outputFilename);
    
    // Optimiser et redimensionner l'image
    await sharp(filePath)
      .resize(400, 400, { // Redimensionner à 400x400
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 }) // Convertir en JPEG avec 80% de qualité
      .toFile(outputPath);
    
    // Supprimer l'ancien fichier
    fs.unlinkSync(filePath);
    
    return `/uploads/profiles/${outputFilename}`;
  } catch (error) {
    console.error('Erreur lors de l\'optimisation:', error);
    throw error;
  }
};

const deleteOldPhoto = (photoUrl) => {
  if (photoUrl && photoUrl.includes('/uploads/profiles/')) {
    const filename = path.basename(photoUrl);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = {
  optimizeAndSavePhoto,
  deleteOldPhoto
};