// backend/src/middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== CHEMINS DES DOSSIERS ====================
const uploadBaseDir = path.join(__dirname, '../uploads');
const photosDir = path.join(uploadBaseDir, 'photos');
const profilesDir = path.join(uploadBaseDir, 'profiles');
const documentsDir = path.join(uploadBaseDir, 'documents');

// Création des dossiers
const directories = [uploadBaseDir, photosDir, profilesDir, documentsDir];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Dossier créé: ${dir}`);
  }
});

// ==================== CONFIGURATION POUR DOCUMENTS ====================
const storageDocuments = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${unique}${ext}`);
  }
});

const fileFilterDocuments = (req, file, cb) => {
  const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png)$/i;
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const uploadDocument = multer({
  storage: storageDocuments,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilterDocuments
});

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
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP'), false);
  }
};

const uploadPhoto = multer({
  storage: storagePhotos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterPhotos
});

// ==================== CONFIGURATION POUR PHOTOS DE PROFIL ====================
const storageProfilePhotos = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.id || req.user?.id || 'unknown';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${unique}${ext}`);
  }
});

const fileFilterProfilePhotos = (req, file, cb) => {
  const allowedExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype);
  
  if (mimetype || extname) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté'), false);
  }
};

const uploadProfilePhoto = multer({
  storage: storageProfilePhotos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterProfilePhotos
});

// ==================== MIDDLEWARE DE GESTION D'ERREURS ====================
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Fichier trop volumineux (max 10MB)' 
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ==================== EXPORTS CORRIGÉS ====================
module.exports = {
  uploadDocument,      // ✅ Pour les documents
  uploadPhoto,         // ✅ Pour les photos générales
  uploadProfilePhoto,  // ✅ Pour les photos de profil
  handleMulterError    // ✅ Gestionnaire d'erreurs
};