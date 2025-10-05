// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware'); // :contentReference[oaicite:17]{index=17}
const { startCheckout, openBillingPortal, getMySubscription } = require('../controllers/billingController');

router.post('/checkout', authenticateToken, startCheckout); // cria Checkout Session (subscription)
router.post('/portal', authenticateToken, openBillingPortal); // abre Billing Portal
router.get('/me', authenticateToken, getMySubscription); // status da assinatura

module.exports = router;
