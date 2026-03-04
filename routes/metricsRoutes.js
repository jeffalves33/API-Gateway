// Arquivo: routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.post('/reach', authenticateToken, requireCustomerInAccount(), metricsController.getReachMetrics);
router.post('/impressions', authenticateToken, requireCustomerInAccount(), metricsController.getImpressionMetrics);
router.post('/followers', authenticateToken, requireCustomerInAccount(), metricsController.getfollowersMetrics);
router.post('/traffic', authenticateToken, requireCustomerInAccount(), metricsController.getTrafficMetrics);
router.post('/search-volume', authenticateToken, requireCustomerInAccount(), metricsController.getSearchVolumeMetrics);

module.exports = router;