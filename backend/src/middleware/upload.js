const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer les dossiers d'upload s'ils n'existent pas
const uploadBaseDir = path.join(__dirname, '../uploads');
const photosDir = path.join(uploadBaseDir, 'photos');

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

// ==================== CONFIGURATION POUR PHOTOS ====================
const storagePhotos = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + unique + ext);
  }
});

const fileFilterPhotos = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  cb(null, ok);
};

const uploadPhoto = multer({
  storage: storagePhotos,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter: fileFilterPhotos
});

// ==================== CONFIGURATION POUR DOCUMENTS ====================
const storageDocs = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadBaseDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  }
});

const fileFilterDocs = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Type de fichier non autorisé'), false);
};

const uploadDocument = multer({
  storage: storageDocs,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: fileFilterDocs
});

// ✅ EXPORT CORRECT - Exporte un objet avec toutes les configurations
module.exports = {
  upload: uploadDocument,        // Pour compatibilité (upload.single)
  uploadPhoto,                   // Pour les photos
  uploadDocument                 // Pour les documents
};