// Arquivo: routes/googleAnalyticsRoutes.js
const express = require('express');
const router = express.Router();
const googleAnalyticsController = require('../controllers/googleAnalyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, googleAnalyticsController.startOAuth);
router.get('/auth/callback', googleAnalyticsController.handleOAuthCallback);

module.exports = router;