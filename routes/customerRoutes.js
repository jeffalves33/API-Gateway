// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { addCustomer, deleteCustomerById, getCustomerById, getCustomersByUser, refreshCustomerKeys, removePlatformCustomer, updateCustomerById } = require('../controllers/customerController');

router.get('/', authenticateToken, getCustomersByUser);
router.post('/add', authenticateToken, addCustomer);
router.post('/cache', authenticateToken, refreshCustomerKeys);
router.delete('/delete/:id_customer', authenticateToken, deleteCustomerById);
router.put('/edit/:id_customer', authenticateToken, updateCustomerById);
router.get('/get/:id_customer', authenticateToken, getCustomerById);
router.delete('/remove/:platform', authenticateToken, removePlatformCustomer);

module.exports = router;