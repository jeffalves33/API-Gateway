// Arquivo: routes/contentsRoutes.js
const express = require('express');
const router = express.Router();
const contentsController = require('../controllers/contentsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/posts', authenticateToken, contentsController.getGeneralMetricsPosts);

module.exports = router;