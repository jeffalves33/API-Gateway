// Arquivo: routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { addFacebookCustomer, removeFacebookCustomer } = require('../controllers/customerFacebookController');


router.post('/', authenticateToken, addFacebookCustomer);
router.delete('/:idCustomer', authenticateToken, removeFacebookCustomer);

module.exports = router;