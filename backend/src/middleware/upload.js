const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer les dossiers d'upload s'ils n'existent pas
const uploadBaseDir = path.join(__dirname, '../uploads');
const photosDir = path.join(uploadBaseDir, 'photos');
const profilesDir = path.join(uploadBaseDir, 'profiles');

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterPhotos
});

// ==================== CONFIGURATION POUR PHOTOS DE PROFIL UTILISATEUR ====================
const storageProfilePhotos = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.id || 'unknown';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${unique}${ext}`);
  }
});

// FILTRE CORRIGÉ AVEC LOGS
const fileFilterProfilePhotos = (req, file, cb) => {
  // Log pour déboguer
  console.log('📁 Fichier reçu pour photo de profil:');
  console.log('   - Nom original:', file.originalname);
  console.log('   - Type MIME:', file.mimetype);
  console.log('   - Extension:', path.extname(file.originalname));
  
  // Accepter plus de types MIME
  const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|bmp|heic)$/i;
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/x-icon'
  ];
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype);
  
  if (mimetype || extname) {
    console.log('   ✅ Fichier accepté');
    cb(null, true);
  } else {
    console.log('   ❌ Fichier rejeté - Type non supporté');
    cb(new Error(`Format non supporté: ${file.mimetype}. Utilisez JPG, PNG, GIF ou WEBP`), false);
  }
};

const uploadProfilePhoto = multer({
  storage: storageProfilePhotos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterProfilePhotos
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilterDocs
});

// ✅ EXPORT
module.exports = {
  upload: uploadDocument,
  uploadPhoto,
  uploadDocument,
  uploadProfilePhoto
};