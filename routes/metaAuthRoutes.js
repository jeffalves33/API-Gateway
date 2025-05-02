// Arquivo: routes/metaAuthRoutes.js
const express = require('express');
const router = express.Router();
const metaAuthController = require('../controllers/metaAuthController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Inicia o OAuth
router.get('/auth/meta', authenticateToken, metaAuthController.startOAuth);

// Callback do Meta após autorização
router.get('/auth/meta/callback', metaAuthController.handleOAuthCallback);

router.get('/api/meta/pages', authenticateToken, metaAuthController.getMetaPages);
router.get('/api/meta/status', authenticateToken, metaAuthController.checkMetaStatus);


module.exports = router;