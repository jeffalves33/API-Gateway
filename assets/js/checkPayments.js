(function () {
    const modalEl = document.getElementById('billingModal');
    const billingModal = () => new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

    const elStatus = document.getElementById('billing-status');
    const elGrid = document.getElementById('plansGrid');
    const elAlert = document.getElementById('billing-alert');
    const couponInpt = document.getElementById('couponInput');
    const portalBtn = document.getElementById('openPortalBtn');
    const closeBtn = document.getElementById('closeBillingBtn');

    const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    async function loadStatusAndMaybeOpen() {
        try {
            const r = await fetch('/api/billing/me', { credentials: 'same-origin' });
            const { subscription: s } = await r.json();

            const now = new Date();
            const ativo = s && ['trialing', 'active'].includes(s.subscription_status) &&
                (!s.current_period_end || new Date(s.current_period_end) >= now);

            // habilita portal apenas para quem tem trial/active
            portalBtn.disabled = !ativo;

            if (ativo) {
                elStatus.innerHTML = `<span class="badge bg-label-success me-1">Ativo</span>
          <small class="text-muted">Plano atual: <strong>${s.plan_name || '-'}</strong>
          ${s.current_period_end ? ` · renova até ${new Date(s.current_period_end).toLocaleDateString('pt-BR')}` : ''}</small>`;
                // Se quiser NÃO abrir para usuários ativos, apenas retorne aqui.
                return;
            }

            // Não tem plano/trial válido -> abre modal
            elStatus.innerHTML = `<span class="badge bg-label-danger me-1">Inativo</span>
        <small class="text-muted">Você precisa iniciar um trial ou assinar um plano para continuar.</small>`;
            billingModal().show();
            await loadPlans();
        } catch (e) {
            // Em caso de erro, também abre modal como fallback
            elStatus.innerHTML = `<span class="badge bg-label-secondary me-1">Indefinido</span>
        <small class="text-muted">Não foi possível verificar sua assinatura agora.</small>`;
            billingModal().show();
            await loadPlans();
        }
    }

    async function loadPlans() {
        elGrid.innerHTML = '';
        try {
            const r = await fetch('/api/billing/plans', { credentials: 'same-origin' });
            const { plans } = await r.json();

            if (!plans || !plans.length) {
                elGrid.innerHTML = `<div class="col-12">
          <div class="alert alert-warning">Nenhum plano disponível. Tente novamente mais tarde.</div></div>`;
                return;
            }

            plans.forEach(p => {
                const col = document.createElement('div');
                col.className = 'col-sm-6 col-lg-4';
                col.innerHTML = `
                <div class="card h-100 shadow-none border">
                    <div class="card-body">
                    <h6 class="mb-1">${p.name}</h6>
                    <div class="mb-2">
                        <span class="fs-4 fw-semibold">${brl(p.amount_cents)}</span>
                        <small class="text-muted">/ ${p.interval}</small>
                    </div>
                    <button class="btn btn-primary w-100" data-code="${p.code}">
                        Assinar ${p.name}
                    </button>
                    </div>
                </div>`;
                elGrid.appendChild(col);
            });

            elGrid.querySelectorAll('button[data-code]').forEach(btn => {
                btn.onclick = async () => {
                    btn.disabled = true;
                    try {
                        const plan_code = btn.getAttribute('data-code');
                        const promo_code = couponInpt.value || null;

                        const resp = await fetch('/api/billing/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'same-origin',
                            body: JSON.stringify({ plan_code, promo_code })
                        });

                        const j = await resp.json();
                        if (j.url) {
                            window.location = j.url; // redireciona para o Stripe Checkout
                        } else {
                            showMsg('Não foi possível iniciar o checkout.', 'danger');
                        }
                    } catch (e) {
                        showMsg('Erro ao iniciar o checkout.', 'danger');
                    } finally {
                        btn.disabled = false;
                    }
                };
            });
        } catch (e) {
            elGrid.innerHTML = `<div class="col-12"><div class="alert alert-danger">
        Erro ao carregar planos.</div></div>`;
        }
    }

    portalBtn?.addEventListener('click', async () => {
        try {
            const r = await fetch('/api/billing/portal', { method: 'POST', credentials: 'same-origin' });
            const j = await r.json();
            if (j.url) window.location = j.url; else showMsg('Erro ao abrir o Portal.', 'danger');
        } catch (e) {
            showMsg('Erro ao abrir o Portal.', 'danger');
        }
    });

    closeBtn?.addEventListener('click', () => {
        // se estiver inativo, você pode impedir fechar; aqui permitimos fechar:
        bootstrap.Modal.getInstance(modalEl)?.hide();
    });

    function showMsg(text, type = 'info') {
        elAlert.className = `alert alert-${type}`;
        elAlert.textContent = text;
        elAlert.style.display = 'block';
        setTimeout(() => { elAlert.style.display = 'none'; }, 5000);
    }

    // se veio do Stripe (?checkout=success|cancel), você pode decidir abrir/fechar modal
    const qp = new URLSearchParams(location.search);
    if (qp.has('checkout')) {
        // força recarregar status
        setTimeout(loadStatusAndMaybeOpen, 200);
    } else {
        document.addEventListener('DOMContentLoaded', loadStatusAndMaybeOpen);
    }
})();