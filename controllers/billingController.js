// controllers/billingController.js
const { pool } = require('../config/db');
const { createCheckoutSession, createBillingPortalSession } = require('../services/stripeService');

// GET /api/billing/plans
exports.listPlans = async (req, res) => {
    try {
        const { rows } = await pool.query(`
        SELECT code, name, amount_cents, currency, interval, stripe_price_id
        FROM plans
        WHERE active = true
        ORDER BY amount_cents ASC
    `);
        res.json({ success: true, plans: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao listar planos' });
    }
};

// GET /api/billing/me
exports.getMySubscription = async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT id_user, plan_code, stripe_subscription_id, subscription_status,
             current_period_start, current_period_end, trial_start, trial_end, cancel_at, cancel_at_period_end
      FROM "user" WHERE id_user=$1
    `, [req.user.id]);
        res.json({ success: true, subscription: rows[0] || null });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao buscar assinatura' });
    }
};

// POST /api/billing/checkout
exports.startCheckout = async (req, res) => {
    try {
        const { plan_code, promo_code } = req.body;
        if (!plan_code) return res.status(400).json({ success: false, message: 'plan_code é obrigatório' });

        const u = await pool.query('SELECT id_user, name, email, stripe_customer_id FROM "user" WHERE id_user=$1', [req.user.id]);
        const user = u.rows[0];

        // Preferir env STRIPE_PRICE_*; fallback: buscar price no banco por plan_code
        const envPrice = process.env[`STRIPE_PRICE_${plan_code.toUpperCase()}`];
        let priceId = envPrice;
        if (!priceId) {
            const q = await pool.query('SELECT stripe_price_id FROM plans WHERE code=$1 AND active=true', [plan_code]);
            priceId = q.rows[0]?.stripe_price_id;
        }
        if (!priceId) return res.status(400).json({ success: false, message: 'priceId do Stripe não encontrado' });

        const url = await createCheckoutSession({ user, priceId, planCode: plan_code, promoCode: promo_code || null });
        res.json({ success: true, url });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao criar Checkout Session' });
    }
};

// POST /api/billing/portal
exports.openBillingPortal = async (req, res) => {
    try {
        const u = await pool.query('SELECT id_user, name, email, stripe_customer_id FROM "user" WHERE id_user=$1', [req.user.id]);
        const user = u.rows[0];
        const url = await createBillingPortalSession({ user });
        res.json({ success: true, url });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao criar Billing Portal Session' });
    }
};
