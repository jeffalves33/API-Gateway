// Arquivo: routes/youtubeRoutes.js
const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.get('/auth', authenticateToken, requireCustomerInAccount(), youtubeController.startOAuth);
router.get('/auth/callback', youtubeController.handleOAuthCallback);

router.get('/channels', authenticateToken, requireCustomerInAccount(), youtubeController.getChannels);
router.post('/connect', authenticateToken, requireCustomerInAccount(), youtubeController.connectChannel);

router.get('/status', authenticateToken, requireCustomerInAccount(), youtubeController.checkStatus);

module.exports = router;