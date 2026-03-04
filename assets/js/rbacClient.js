// /assets/js/rbacClient.js
(function () {
    let cachedMe = null;

    async function fetchMe() {
        if (cachedMe) return cachedMe;

        const res = await fetch('/api/rbac/me', { credentials: 'include' });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) return null;

        cachedMe = data;
        return data;
    }

    function isAdmin(me) {
        return String(me?.user?.role || '').toLowerCase() === 'admin';
    }

    function hasPermission(me, code) {
        if (!me?.user) return false;
        if (isAdmin(me)) return true;
        const perms = me.user.permissions || [];
        return perms.includes(code);
    }

    async function guardPage(requiredPermission, opts = {}) {
        const redirectLogin = opts.redirectLogin || '/login.html';
        const redirectDenied = opts.redirectDenied || '/dashboardPage.html';

        const me = await fetchMe();
        if (!me) {
            window.location.href = redirectLogin;
            return;
        }

        if (!hasPermission(me, requiredPermission)) {
            window.location.href = redirectDenied;
            return;
        }
    }

    async function applyMenuPermissions(menuMap) {
        const me = await fetchMe();
        if (!me) return;

        Object.entries(menuMap).forEach(([perm, selector]) => {
            const el = document.querySelector(selector);
            if (!el) return;
            el.style.display = hasPermission(me, perm) ? '' : 'none';
        });
    }

    async function fillUserUI(selectors = {}) {
        const me = await fetchMe();
        if (!me) return;

        const nameEl = selectors.name ? document.querySelector(selectors.name) : null;
        const roleEl = selectors.role ? document.querySelector(selectors.role) : null;

        if (nameEl) nameEl.textContent = me.user.name || me.user.email || '';
        if (roleEl) roleEl.textContent = me.user.role || '';
    }

    window.RBAC = { fetchMe, hasPermission, guardPage, applyMenuPermissions, fillUserUI };
})();