// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { addCustomer, getCustomersByUser, refreshCustomerKeys, removePlatformCustomer } = require('../controllers/customerController');

router.get('/', authenticateToken, getCustomersByUser);
router.post('/add', authenticateToken, addCustomer);
router.post('/cache', authenticateToken, refreshCustomerKeys);
router.delete('/remove/:platform', authenticateToken, removePlatformCustomer);

module.exports = router;