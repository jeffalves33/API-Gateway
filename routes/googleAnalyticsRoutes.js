// Arquivo: routes/googleAnalyticsRoutes.js
const express = require('express');
const router = express.Router();
const googleAnalyticsController = require('../controllers/googleAnalyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.get('/auth', authenticateToken, requireCustomerInAccount(), googleAnalyticsController.startOAuth);
router.get('/auth/callback', googleAnalyticsController.handleOAuthCallback);

router.get('/properties', authenticateToken, requireCustomerInAccount(), googleAnalyticsController.getProperties);
router.post('/connect', authenticateToken, requireCustomerInAccount(), googleAnalyticsController.connectProperty);

router.get('/status', authenticateToken, requireCustomerInAccount(), googleAnalyticsController.checkStatus);

module.exports = router;