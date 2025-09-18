// Arquivo: routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, linkedinController.startOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);

module.exports = router;