// /assets/js/afterLoginCheck.js
(async () => {
    try {
        const token = localStorage.getItem('token'); // seu login já deve setar isso
        if (!token) { window.location = '/login.html'; return; }

        const r = await fetch('/api/billing/me', { headers: { Authorization: 'Bearer ' + token } });
        const j = await r.json();
        const s = j.subscription;

        const now = new Date();
        const ativo = s && ['trialing', 'active'].includes(s.subscription_status) &&
            (!s.current_period_end || new Date(s.current_period_end) >= now);

        if (!ativo) {
            // sem assinatura ou trial expirado -> página de planos
            window.location = '/settingsAccountPage2.html';
        }
    } catch {
        window.location = '/login.html';
    }
})();
