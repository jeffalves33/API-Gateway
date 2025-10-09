// middleware/subscriptionMiddleware.js
const { pool } = require('../config/db');

const BILLING_ALLOWLIST = [
    '/api/billing/me',
    '/api/billing/plans',
    '/api/billing/checkout',
    '/api/billing/portal',
];

module.exports = async function requireSubscription(req, res, next) {
    try {
        // Deixa sempre passar as rotas necessárias pro modal funcionar
        if (BILLING_ALLOWLIST.some(p => req.path.startsWith(p))) return next();

        // Verifica a assinatura para demais APIs protegidas
        const { rows } = await pool.query(
            'SELECT subscription_status, current_period_end, trial_end FROM "user" WHERE id_user=$1',
            [req.user.id]
        );
        const sub = rows[0];
        const now = new Date();
        const endsAt = sub?.current_period_end || sub?.trial_end;
        const ok = sub && ['active', 'trialing'].includes(sub.subscription_status) && (!endsAt || new Date(endsAt) >= now);

        if (ok) return next();

        // Importante: não redirecionar mais aqui.
        // APIs protegidas retornam 402 para o front abrir o modal ou bloquear a ação.
        return res.status(402).json({ success: false, message: 'Assinatura inativa' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Erro ao validar assinatura' });
    }
};
