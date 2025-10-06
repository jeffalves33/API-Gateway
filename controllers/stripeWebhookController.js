// controllers/stripeWebhookController.js
const { stripe } = require('../config/stripeConfig');
const { pool } = require('../config/db'); // :contentReference[oaicite:14]{index=14}

async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // importante: usar RAW body para verificar assinatura! :contentReference[oaicite:15]{index=15}
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verify failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // idempotência
    await pool.query(
        'INSERT INTO stripe_events (stripe_event_id, type, payload) VALUES ($1, $2, $3) ON CONFLICT (stripe_event_id) DO NOTHING',
        [event.id, event.type, event]
    );

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode === 'subscription') {
                    const subscriptionId = session.subscription;
                    const customerId = session.customer;
                    // pegar assinatura completa
                    const sub = await stripe.subscriptions.retrieve(subscriptionId); // status, period, trial, price etc. :contentReference[oaicite:16]{index=16}
                    const priceId = sub.items.data[0].price.id;
                    console.log("🚀1 ~ handleStripeWebhook ~ sub: ", sub)
                    const planCode = sub.metadata?.plan_code || session.metadata?.plan_code || null;

                    // encontrar user pelo metadata app_user_id (setado no subscription_data) ou pelo customer:
                    let userId = sub.metadata?.app_user_id || session.metadata?.app_user_id || null;
                    if (!userId) {
                        // como fallback, busque pelo stripe_customer_id
                        const q = await pool.query('SELECT id_user FROM "user" WHERE stripe_customer_id = $1', [customerId]);
                        if (q.rows[0]) userId = q.rows[0].id_user;
                    }

                    if (userId) {
                        await pool.query(`
                        UPDATE "user"
                            SET stripe_customer_id = $1,
                                stripe_subscription_id = $2,
                                subscription_status = $3,
                                plan_code = COALESCE($4, plan_code),
                                stripe_price_id = $5,
                                current_period_start = to_timestamp($6::double precision),
                                current_period_end   = to_timestamp($7::double precision),
                                trial_start = CASE WHEN $8 IS NULL THEN trial_start ELSE to_timestamp($8::double precision) END,
                                trial_end   = CASE WHEN $9 IS NULL THEN trial_end   ELSE to_timestamp($9::double precision) END
                        WHERE id_user = $10
                        `, [
                            customerId,
                            subscriptionId,
                            sub.status,
                            planCode,
                            priceId,
                            sub.current_period_start,
                            sub.current_period_end,
                            sub.trial_start,
                            sub.trial_end,
                            userId
                        ]);
                    }
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.created':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                console.log("🚀2 ~ handleStripeWebhook ~ sub: ", sub)
                // achar user por stripe_customer_id
                const q = await pool.query('SELECT id_user FROM "user" WHERE stripe_customer_id = $1', [sub.customer]);
                if (q.rows[0]) {
                    await pool.query(`
                        UPDATE "user"
                        SET stripe_subscription_id = $1,
                            subscription_status = $2,
                            stripe_price_id = $3,
                            current_period_start = to_timestamp($4::double precision),
                            current_period_end   = to_timestamp($5::double precision),
                            trial_start = CASE WHEN $6 IS NULL THEN trial_start ELSE to_timestamp($6::double precision) END,
                            trial_end   = CASE WHEN $7 IS NULL THEN trial_end   ELSE to_timestamp($7::double precision) END,
                            cancel_at   = CASE WHEN $8 IS NULL THEN cancel_at   ELSE to_timestamp($8::double precision) END,
                            cancel_at_period_end = $9
                        WHERE id_user = $10
                    `, [
                        sub.id,
                        sub.status,
                        sub.items.data[0]?.price?.id || null,
                        sub.current_period_start,
                        sub.current_period_end,
                        sub.trial_start,
                        sub.trial_end,
                        sub.cancel_at,
                        sub.cancel_at_period_end || false,
                        q.rows[0].id_user
                    ]);
                }
                break;
            }

            case 'invoice.paid':
            case 'invoice.payment_failed': {
                const inv = event.data.object;
                const q = await pool.query('SELECT id_user FROM "user" WHERE stripe_customer_id = $1', [inv.customer]);
                if (q.rows[0]) {
                    await pool.query(`
                        INSERT INTO subscription_invoices
                        (id_user, stripe_invoice_id, status, amount_due_cents, hosted_invoice_url, created_at, period_start, period_end)
                        VALUES ($1,$2,$3,$4,$5, to_timestamp($6::double precision), to_timestamp($7::double precision), to_timestamp($8::double precision))
                        ON CONFLICT (stripe_invoice_id) DO UPDATE SET status = EXCLUDED.status
                    `, [
                        q.rows[0].id_user, inv.id, inv.status, inv.amount_due, inv.hosted_invoice_url,
                        inv.created, inv.period_start, inv.period_end
                    ]);
                }
                break;
            }
        }
    } catch (err) {
        console.error('Erro ao processar webhook:', err);
    }

    res.json({ received: true });
}

module.exports = { handleStripeWebhook };
