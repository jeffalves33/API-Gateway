// Arquivo: routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const linkedinController = require('../controllers/linkedinController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.get('/auth', authenticateToken, requireCustomerInAccount(), linkedinController.startOAuth);
router.get('/auth/callback', linkedinController.handleOAuthCallback);

// lista organizations para o cliente
router.get('/organizations', authenticateToken, requireCustomerInAccount(), linkedinController.getOrganizations);

// conecta organization escolhida
router.post('/connect', authenticateToken, requireCustomerInAccount(), linkedinController.connectOrganization);


module.exports = router;