// routes/metaRoutes.js
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/auth', authenticateToken, metaController.startOAuth);
router.get('/auth/callback', metaController.handleOAuthCallback);

// lista recursos (páginas FB / contas IG) baseado no token salvo pro cliente
router.get('/pages', authenticateToken, metaController.getMetaPages);

// conecta um recurso escolhido (FB page ou IG business) e salva no customer_integrations
router.post('/connect', authenticateToken, metaController.connectResource);

// (opcional/legado) status
router.get('/status', authenticateToken, metaController.checkMetaStatus);

module.exports = router;
