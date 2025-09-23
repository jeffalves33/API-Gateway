// Arquivo: routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, linkedinController.startOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);
router.get('/status', authenticateToken, linkedinController.checkStatus);
router.get('/organizations', authenticateToken, linkedinController.getOrganizations);

module.exports = router;