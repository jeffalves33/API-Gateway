// Arquivo: routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, linkedinController.startOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);

// lista organizations para o cliente
router.get('/organizations', authenticateToken, linkedinController.getOrganizations);

// conecta organization escolhida
router.post('/connect', authenticateToken, linkedinController.connectOrganization);


module.exports = router;