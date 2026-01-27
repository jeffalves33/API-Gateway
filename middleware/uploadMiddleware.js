// Arquivo: middleware/uploadMiddleware.js
const crypto = require('crypto');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { REGION, s3_profile, BUCKET_NAME_PROFILE, s3_kanban, BUCKET_NAME_KANBAN } = require('../config/s3Config');
const path = require('path');

// Configuração do multer para upload direto no S3
const uploadAvatar = multer({
    storage: multerS3({
        s3: s3_profile,
        bucket: BUCKET_NAME_PROFILE,
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

const uploadCardArts = multer({
    storage: multerS3({
        s3: s3_kanban,
        bucket: BUCKET_NAME_KANBAN,
        key: function (req, file, cb) {
            const { card_id } = req.params;
            const id_user = req.user.id;
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `kanban/${id_user}/cards/${card_id}/${uniqueSuffix}${ext}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Tipo não permitido'), false);
    }
});

module.exports = { uploadAvatar, uploadCardArts };