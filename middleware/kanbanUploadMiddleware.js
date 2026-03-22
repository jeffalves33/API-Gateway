const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const { s3_kanban, BUCKET_NAME_KANBAN } = require('../config/s3Config');

const allowedMime = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'application/pdf'
]);

const uploadKanbanArts = multer({
    storage: multerS3({
        s3: s3_kanban,
        bucket: BUCKET_NAME_KANBAN,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
            });
        },
        key: (req, file, cb) => {
            const ext = path.extname(file.originalname || '');
            const safeExt = ext ? ext.toLowerCase() : '';
            const random = crypto.randomBytes(16).toString('hex');
            const cardId = String(req.params.id || 'sem-card');
            cb(null, `kanban/cards/${cardId}/${Date.now()}-${random}${safeExt}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!allowedMime.has(file.mimetype)) {
            return cb(new Error('Formato de arquivo não permitido. Use JPG, PNG, WEBP ou PDF.'));
        }
        cb(null, true);
    },
    limits: {
        files: 10,
        fileSize: 15 * 1024 * 1024
    }
});

module.exports = { uploadKanbanArts };