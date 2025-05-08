// Arquivo: routes/metaAuthRoutes.js
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, metaController.startOAuth);
router.get('/auth/callback', metaController.handleOAuthCallback);

router.get('/pages', authenticateToken, metaController.getMetaPages);
router.get('/status', authenticateToken, metaController.checkMetaStatus);


module.exports = router;