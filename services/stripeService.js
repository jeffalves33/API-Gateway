// services/stripeService.js
const { stripe } = require('../config/stripeConfig');
const { pool } = require('../config/db'); // :contentReference[oaicite:7]{index=7}

async function ensureStripeCustomer(user) {
    // se já tem, retorna
    if (user.stripe_customer_id) {
        return user.stripe_customer_id;
    }
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { app_user_id: String(user.id_user) },
    });
    await pool.query(
        'UPDATE "user" SET stripe_customer_id = $1 WHERE id_user = $2',
        [customer.id, user.id_user]
    );
    return customer.id;
}

async function createCheckoutSession({ user, priceId, planCode, promoCode }) {
    const customerId = await ensureStripeCustomer(user);

    const params = {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        // trial de 30 dias
        subscription_data: { trial_period_days: 30, metadata: { plan_code: planCode, app_user_id: String(user.id_user) } }, // :contentReference[oaicite:8]{index=8}
        // permitir que o usuário digite cupom na tela
        allow_promotion_codes: true, // :contentReference[oaicite:9]{index=9}
        success_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html?checkout=success`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html?checkout=cancel`,
    };

    // Se você quiser aplicar um código específico por API:
    if (promoCode) {
        // precisa do ID da promotion_code (não o texto) para passar em discounts
        const found = await stripe.promotionCodes.list({ code: promoCode, limit: 1 });
        if (found.data[0]) {
            params.discounts = [{ promotion_code: found.data[0].id }]; // :contentReference[oaicite:10]{index=10}
        }
    }

    const session = await stripe.checkout.sessions.create(params); // :contentReference[oaicite:11]{index=11}
    return session.url;
}

async function createBillingPortalSession({ user }) {
    const customerId = await ensureStripeCustomer(user);
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html`,
        ...(configId ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID } : {})
    }); // :contentReference[oaicite:12]{index=12}
    return session.url;
}

module.exports = { ensureStripeCustomer, createCheckoutSession, createBillingPortalSession };
