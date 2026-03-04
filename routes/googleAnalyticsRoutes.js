// Arquivo: routes/googleAnalyticsRoutes.js
const express = require('express');
const router = express.Router();
const googleAnalyticsController = require('../controllers/googleAnalyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.get('/auth', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), googleAnalyticsController.startOAuth);
router.get('/auth/callback', googleAnalyticsController.handleOAuthCallback);

router.get('/properties', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), googleAnalyticsController.getProperties);
router.post('/connect', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), googleAnalyticsController.connectProperty);

router.get('/status', authenticateToken, requirePermission('page:platforms:view'), requireCustomerInAccount(), googleAnalyticsController.checkStatus);

module.exports = router;