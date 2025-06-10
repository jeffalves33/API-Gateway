// Arquivo: routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/linkedinController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, metaController.startOAuth);
router.get('/auth/callback', metaController.handleOAuthCallback);

module.exports = router;