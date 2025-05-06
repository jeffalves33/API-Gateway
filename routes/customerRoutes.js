// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getCustomersByUser, refreshCustomerKeys, addCustomer } = require('../controllers/customerController');

router.get('/', authenticateToken, getCustomersByUser);
router.post('/add', authenticateToken, addCustomer);
router.post('/cache', authenticateToken, refreshCustomerKeys);

module.exports = router;