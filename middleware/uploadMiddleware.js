// Arquivo: middleware/uploadMiddleware.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3, BUCKET_NAME } = require('../config/s3Config');
const path = require('path');

// Configuração do multer para upload direto no S3
const uploadAvatar = multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        //acl: 'public-read', // Para que as imagens sejam públicas
        key: function (req, file, cb) {
            // Gera um nome único para o arquivo
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path.extname(file.originalname);
            const fileName = `avatar-${req.user.id}-${uniqueSuffix}${extension}`;
            cb(null, fileName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // Limite de 5MB
    },
    fileFilter: function (req, file, cb) {
        // Aceita apenas imagens
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.'), false);
        }
    }
});

module.exports = { uploadAvatar };