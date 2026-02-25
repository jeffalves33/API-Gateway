// services/stripeService.js
const { stripe } = require('../config/stripeConfig');
const { pool } = require('../config/db'); // :contentReference[oaicite:7]{index=7}

const EXTRA_PRICE_ID = process.env.STRIPE_PRICE_CLIENT_EXTRA || null;

async function createBillingPortalSession({ user }) {
    const customerId = await ensureStripeCustomer(user);
    const configId = process.env.STRIPE_PORTAL_CONFIGURATION_ID || null;
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html`,
        ...(configId ? { configuration: configId } : {})
    }); // :contentReference[oaicite:12]{index=12}
    return session.url;
}

async function createCheckoutSession({ user, priceId, planCode, promoCode }) {
    const customerId = await ensureStripeCustomer(user);

    // item base do plano (Pro/Starter)
    const lineItems = [{ price: priceId, quantity: 1 }];

    // item de cliente extra: só adiciona se houver extras no momento da compra
    const extrasQty = 0; // por enquanto não cobra extras no checkout inicial
    if (EXTRA_PRICE_ID && extrasQty >= 1) lineItems.push({ price: EXTRA_PRICE_ID, quantity: extrasQty });


    const params = {
        mode: 'subscription',
        customer: customerId,
        line_items: lineItems,
        subscription_data: {
            trial_period_days: 30,
            metadata: {
                plan_code: planCode,
                app_user_id: String(user.id_user)
            }
        },
        metadata: {
            plan_code: planCode,
            app_user_id: String(user.id_user)
        },
        allow_promotion_codes: true,
        success_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html?checkout=success`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/settingsAccountPage.html?checkout=cancel`,
    };

    if (promoCode) {
        const found = await stripe.promotionCodes.list({ code: promoCode, limit: 1 });
        if (found.data[0]) params.discounts = [{ promotion_code: found.data[0].id }];

    }

    const session = await stripe.checkout.sessions.create(params);
    return session.url;
}

async function ensureStripeCustomer(user) {
    // se já tem, retorna
    if (user.stripe_customer_id) return user.stripe_customer_id;

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

// Recalcula quantidade de clientes extras (acima de 3) e atualiza item extra na assinatura.
// Por padrão, só aumenta quantidade. Redução fica para job/Lambda chamando com allowDecrease=true.
async function syncExtraClientsForUser(id_user, { allowDecrease = false } = {}) {
    console.log('[SYNC_EXTRAS] start', { id_user, allowDecrease, hasExtraPrice: !!EXTRA_PRICE_ID });

    if (!EXTRA_PRICE_ID) {
        console.log('[SYNC_EXTRAS] exit: EXTRA_PRICE_ID missing');
        return;
    }

    // 1) Conta clientes ativos
    const { rows: rowsCount } = await pool.query(
        `SELECT COUNT(*) AS total 
           FROM customer 
          WHERE id_user = $1 
            AND status = 'active'`,
        [id_user]
    );

    const totalActive = Number(rowsCount[0]?.total || 0);
    const extrasWanted = Math.max(totalActive - 3, 0);

    console.log('[SYNC_EXTRAS] counted', { totalActive, extrasWanted });

    // 2) Busca info de cobrança do usuário
    const { rows } = await pool.query(
        `SELECT stripe_subscription_id, stripe_extra_item_id 
           FROM "user" 
          WHERE id_user = $1`,
        [id_user]
    );

    if (!rows[0]) {
        console.log('[SYNC_EXTRAS] exit: user not found in DB');
        return;
    }

    const { stripe_subscription_id, stripe_extra_item_id } = rows[0];

    console.log('[SYNC_EXTRAS] billing ids', {
        hasSubscriptionId: !!stripe_subscription_id,
        hasExtraItemId: !!stripe_extra_item_id,
        sub: stripe_subscription_id ? String(stripe_subscription_id).slice(0, 12) + '...' : null,
        item: stripe_extra_item_id ? String(stripe_extra_item_id).slice(0, 12) + '...' : null
    });

    if (!stripe_subscription_id || !stripe_extra_item_id) {
        console.log('[SYNC_EXTRAS] exit: missing stripe_subscription_id or stripe_extra_item_id');
        return;
    }

    // 3) Recupera assinatura no Stripe
    let sub;
    try {
        sub = await stripe.subscriptions.retrieve(stripe_subscription_id);
    } catch (err) {
        console.log('[SYNC_EXTRAS] exit: stripe.subscriptions.retrieve failed', {
            message: err?.message,
            type: err?.type,
            code: err?.code
        });
        throw err; // melhor estourar pra você ver no Render
    }

    const items = sub.items?.data || [];
    console.log('[SYNC_EXTRAS] stripe subscription retrieved', {
        subStatus: sub.status,
        itemsCount: items.length,
        itemIds: items.map(i => i.id),
        itemPriceIds: items.map(i => i.price?.id)
    });

    const extraItem = items.find(i => i.id === stripe_extra_item_id);

    if (!extraItem) {
        console.log('[SYNC_EXTRAS] exit: extraItem not found in subscription items', {
            stripe_extra_item_id,
            subscriptionItems: items.map(i => i.id)
        });
        return;
    }

    const currentQty = extraItem.quantity || 0;

    console.log('[SYNC_EXTRAS] quantities', { currentQty, extrasWanted });

    // Se não mudou, não faz nada
    if (extrasWanted === currentQty) {
        console.log('[SYNC_EXTRAS] exit: no change needed');
        return;
    }

    // Diminuição de extras só quando allowDecrease=true (ex.: job mensal)
    if (extrasWanted < currentQty && !allowDecrease) {
        console.log('[SYNC_EXTRAS] exit: decrease blocked by rule', { currentQty, extrasWanted });
        return;
    }

    // 4) Atualiza item de extra com nova quantidade
    const proration_behavior = extrasWanted > currentQty ? 'create_prorations' : 'none';
    console.log('[SYNC_EXTRAS] updating subscription', { stripe_subscription_id, stripe_extra_item_id, extrasWanted, proration_behavior });

    try {
        const updated = await stripe.subscriptions.update(stripe_subscription_id, {
            items: [{ id: stripe_extra_item_id, quantity: extrasWanted }],
            proration_behavior
        });

        const updatedExtra = (updated.items?.data || []).find(i => i.id === stripe_extra_item_id);
        console.log('[SYNC_EXTRAS] update ok', { updatedQty: updatedExtra?.quantity ?? null });
    } catch (err) {
        console.log('[SYNC_EXTRAS] update failed', {
            message: err?.message,
            type: err?.type,
            code: err?.code
        });
        throw err;
    }
}

module.exports = { ensureStripeCustomer, createBillingPortalSession, createCheckoutSession, ensureStripeCustomer, syncExtraClientsForUser };
