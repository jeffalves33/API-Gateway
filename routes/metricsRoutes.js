// Arquivo: routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/reach', authenticateToken, metricsController.getReachMetrics);
router.post('/impressions', authenticateToken, metricsController.getImpressionMetrics);
router.post('/followers', authenticateToken, metricsController.getfollowersMetrics);
router.post('/traffic', authenticateToken, metricsController.getTrafficMetrics);

module.exports = router;