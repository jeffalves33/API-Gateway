// middleware/subscriptionMiddleware.js
const { pool } = require('../config/db');

module.exports = async function requireSubscription(req, res, next) {
    try {
        const { rows } = await pool.query(
            'SELECT subscription_status, current_period_end FROM "user" WHERE id_user=$1',
            [req.user.id]
        );
        const sub = rows[0];
        const now = new Date();
        const ok = sub && ['active', 'trialing'].includes(sub.subscription_status) &&
            (!sub.current_period_end || new Date(sub.current_period_end) >= now);

        if (ok) return next();

        // Se for requisição de página HTML (GET .html ou aceita HTML) => redireciona
        const isHtmlPage = req.method === 'GET' &&
            (req.path.endsWith('.html') || (req.headers.accept || '').includes('text/html'));

        if (isHtmlPage) {
            return res.redirect('/settingsAccountPage.html');
        }

        // APIs continuam respondendo 402 JSON
        return res.status(402).json({ success: false, message: 'Assinatura inativa' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Erro ao validar assinatura' });
    }
};
