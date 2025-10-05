// middleware/requireSubscription.js
const { pool } = require('../config/db');

module.exports = async function requireSubscription(req, res, next) {
    try {
        const { rows } = await pool.query(
            'SELECT subscription_status, current_period_end FROM "user" WHERE id_user=$1',
            [req.user.id]
        );
        const sub = rows[0];
        const now = new Date();
        const isOk = sub && ['active', 'trialing'].includes(sub.subscription_status) &&
            (!sub.current_period_end || new Date(sub.current_period_end) >= now);

        if (!isOk) return res.status(402).json({ success: false, message: 'Assinatura inativa' });
        next();
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao validar assinatura' });
    }
};
