// backend/middleware/upload.js
const multer = require('multer');

// Stockage en mémoire (pour conversion Base64)
const storage = multer.memoryStorage();

// Filtre : accepter uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        'Format de fichier non autorisé (JPG, PNG, GIF, WEBP uniquement)'
      ),
      false
    );
  }
};

// Configuration Multer
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // ✅ 5 MB
  },
  fileFilter
});

module.exports = upload;
