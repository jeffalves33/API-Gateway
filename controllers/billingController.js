// controllers/billingController.js
const { pool } = require('../config/db'); // :contentReference[oaicite:13]{index=13}
const { stripe } = require('../config/stripeConfig');
const { createCheckoutSession, createBillingPortalSession } = require('../services/stripeService');

const startCheckout = async (req, res) => {
    try {
        const { plan_code, promo_code } = req.body;            // ex.: 'starter'
        const priceId = process.env[`STRIPE_PRICE_${plan_code.toUpperCase()}`] || req.body.stripe_price_id;

        if (!priceId) return res.status(400).json({ success: false, message: 'priceId do Stripe ausente' });

        const userRow = await pool.query('SELECT id_user, name, email, stripe_customer_id FROM "user" WHERE id_user = $1', [req.user.id]);
        const user = userRow.rows[0];

        const url = await createCheckoutSession({
            user,
            priceId,
            planCode: plan_code || 'custom',
            promoCode: promo_code || null
        });

        res.json({ success: true, url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao criar Checkout Session' });
    }
};

const openBillingPortal = async (req, res) => {
    try {
        const userRow = await pool.query('SELECT id_user, name, email, stripe_customer_id FROM "user" WHERE id_user = $1', [req.user.id]);
        const user = userRow.rows[0];
        const url = await createBillingPortalSession({ user });
        res.json({ success: true, url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao criar Billing Portal' });
    }
};

const getMySubscription = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id_user, plan_code, stripe_subscription_id, subscription_status, current_period_start, current_period_end, trial_start, trial_end, cancel_at, cancel_at_period_end FROM "user" WHERE id_user=$1',
            [req.user.id]
        );
        res.json({ success: true, subscription: rows[0] || null });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao buscar assinatura' });
    }
};

module.exports = { startCheckout, openBillingPortal, getMySubscription };
