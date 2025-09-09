// Arquivo: routes/googleAnalyticsRoutes.js
const express = require('express');
const router = express.Router();
const googleAnalyticsController = require('../controllers/googleAnalyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, googleAnalyticsController.startOAuth);
router.get('/auth/callback', googleAnalyticsController.handleOAuthCallback);

router.get('/properties', authenticateToken, googleAnalyticsController.getProperties); //deve ser em um fluxo geral do Google
router.get('/status', authenticateToken, googleAnalyticsController.checkStatus);
module.exports = router;