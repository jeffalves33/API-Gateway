// Arquivo: routes/youtubeRoutes.js
const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, youtubeController.startOAuth);
router.get('/auth/callback', youtubeController.handleOAuthCallback);

router.get('/channels', authenticateToken, youtubeController.getChannels);
router.post('/connect', authenticateToken, youtubeController.connectChannel);

router.get('/status', authenticateToken, youtubeController.checkStatus);

module.exports = router;