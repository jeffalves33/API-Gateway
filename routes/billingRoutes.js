// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const { authenticatePageAccess } = require('../middleware/authMiddleware');
const { startCheckout, openBillingPortal, getMySubscription, listPlans } = require('../controllers/billingController');

router.get('/plans', authenticatePageAccess, listPlans);
router.post('/checkout', authenticatePageAccess, startCheckout);
router.post('/portal', authenticatePageAccess, openBillingPortal);
router.get('/me', authenticatePageAccess, getMySubscription);

module.exports = router;
