// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { addCustomer, deleteCustomerById, getCustomersByUser, refreshCustomerKeys, removePlatformCustomer } = require('../controllers/customerController');

router.get('/', authenticateToken, getCustomersByUser);
router.post('/add', authenticateToken, addCustomer);
router.delete('/delete/:id_customer', authenticateToken, deleteCustomerById);
router.post('/cache', authenticateToken, refreshCustomerKeys);
router.delete('/remove/:platform', authenticateToken, removePlatformCustomer);

module.exports = router;