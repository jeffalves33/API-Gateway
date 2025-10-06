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
                    const sub = await stripe.subscriptions.retrieve(subscriptionId);
                    const priceId = sub.items.data[0]?.price?.id || null;
                    const planCode = sub.metadata?.plan_code || session.metadata?.plan_code || null;
                    const periodStart = sub.current_period_start ?? sub.trial_start ?? sub.start_date ?? null;
                    const periodEnd = sub.current_period_end ?? sub.trial_end ?? sub.billing_cycle_anchor ?? null;
                    let userId = sub.metadata?.app_user_id || session.metadata?.app_user_id || null;
                    console.log("🚀1 ~ handleStripeWebhook ~ sub: ", sub)

                    if (!userId) {
                        const q = await pool.query('SELECT id_user FROM "user" WHERE stripe_customer_id = $1', [customerId]);
                        if (q.rows[0]) userId = q.rows[0].id_user;
                    }

                    if (userId) {
                        await pool.query(`
                        UPDATE "user"
                        SET stripe_customer_id     = $1,
                            stripe_subscription_id = $2,
                            subscription_status    = $3,
                            plan_code              = COALESCE($4, plan_code),
                            stripe_price_id        = $5,
                            current_period_start   = COALESCE(to_timestamp($6::double precision), current_period_start),
                            current_period_end     = COALESCE(to_timestamp($7::double precision), current_period_end),
                            trial_start            = COALESCE(to_timestamp($8::double precision), trial_start),
                            trial_end              = COALESCE(to_timestamp($9::double precision), trial_end)
                        WHERE id_user = $10
                        `, [
                            customerId,
                            subscriptionId,
                            sub.status || null,
                            planCode,
                            priceId,
                            periodStart,
                            periodEnd,
                            sub.trial_start ?? null,
                            sub.trial_end ?? null,
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
                const periodStart = sub.current_period_start ?? sub.trial_start ?? sub.start_date ?? null;
                const periodEnd = sub.current_period_end ?? sub.trial_end ?? sub.billing_cycle_anchor ?? null;
                console.log("🚀2 ~ handleStripeWebhook ~ sub: ", sub)
                const q = await pool.query('SELECT id_user FROM "user" WHERE stripe_customer_id = $1', [sub.customer]);

                if (q.rows[0]) {
                    await pool.query(`
                        UPDATE "user"
                            SET stripe_subscription_id = $1,
                                subscription_status    = $2,
                                stripe_price_id        = $3,
                                current_period_start   = COALESCE(to_timestamp($4::double precision), current_period_start),
                                current_period_end     = COALESCE(to_timestamp($5::double precision), current_period_end),
                                trial_start            = COALESCE(to_timestamp($6::double precision), trial_start),
                                trial_end              = COALESCE(to_timestamp($7::double precision), trial_end),
                                cancel_at              = COALESCE(to_timestamp($8::double precision), cancel_at),
                                cancel_at_period_end   = $9
                        WHERE id_user = $10
                    `, [
                        sub.id,
                        sub.status || null,
                        sub.items.data[0]?.price?.id || null,
                        periodStart,
                        periodEnd,
                        sub.trial_start ?? null,
                        sub.trial_end ?? null,
                        sub.cancel_at ?? null,
                        sub.cancel_at_period_end ?? false,
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
