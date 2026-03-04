// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const { authenticatePageAccess } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { startCheckout, openBillingPortal, getMySubscription, listPlans } = require('../controllers/billingController');

router.get('/plans', authenticatePageAccess, requirePermission('page:settings:view'), listPlans);
router.post('/checkout', authenticatePageAccess, requirePermission('page:settings:view'), startCheckout);
router.post('/portal', authenticatePageAccess, requirePermission('page:settings:view'), openBillingPortal);
router.get('/me', authenticatePageAccess, requirePermission('page:settings:view'), getMySubscription);

module.exports = router;
