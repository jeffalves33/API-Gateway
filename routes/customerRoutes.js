// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireCustomerInAccount } = require('../middleware/tenantGuard');
const { addCustomer, deleteCustomerById, getCustomerById, getCustomersByUser, getCustomersList, refreshCustomerKeys, removePlatformCustomerById, updateCustomerById } = require('../controllers/customerController');

router.get('/', authenticateToken, getCustomersByUser);
router.post('/add', authenticateToken, addCustomer);
router.post('/cache', authenticateToken, requireCustomerInAccount(), refreshCustomerKeys);
router.delete('/delete/:id_customer', authenticateToken, requireCustomerInAccount(), deleteCustomerById);
router.put('/edit/:id_customer', authenticateToken, requireCustomerInAccount(), updateCustomerById);
router.get('/get/:id_customer', authenticateToken, requireCustomerInAccount(), getCustomerById);
router.get('/list', authenticateToken, getCustomersList);
router.delete('/remove/:id_customer/:platform', authenticateToken, requireCustomerInAccount(), removePlatformCustomerById);

module.exports = router;