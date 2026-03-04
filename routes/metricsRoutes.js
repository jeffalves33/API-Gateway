// Arquivo: routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');

router.post('/reach', authenticateToken, requirePermission('analyses:run'), requireCustomerInAccount(), metricsController.getReachMetrics);
router.post('/impressions', authenticateToken, requirePermission('analyses:run'), requireCustomerInAccount(), metricsController.getImpressionMetrics);
router.post('/followers', authenticateToken, requirePermission('analyses:run'), requireCustomerInAccount(), metricsController.getfollowersMetrics);
router.post('/traffic', authenticateToken, requirePermission('analyses:run'), requireCustomerInAccount(), metricsController.getTrafficMetrics);
router.post('/search-volume', authenticateToken, requirePermission('analyses:run'), requireCustomerInAccount(), metricsController.getSearchVolumeMetrics);

module.exports = router;