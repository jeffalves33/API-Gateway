// Arquivo: routes/youtubeRoutes.js
const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.get('/auth', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), youtubeController.startOAuth);
router.get('/auth/callback', youtubeController.handleOAuthCallback);

router.get('/channels', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), youtubeController.getChannels);
router.post('/connect', authenticateToken, requirePermission('platforms:connect'), requireCustomerInAccount(), youtubeController.connectChannel);

router.get('/status', authenticateToken, requirePermission('page:platforms:view'), requireCustomerInAccount(), youtubeController.checkStatus);

module.exports = router;