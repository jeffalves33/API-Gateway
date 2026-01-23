// /assets/js/kanbanBoard.js
(() => {
    // ========= Helpers =========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
    function escapeAttr(str) {
        return escapeHtml(str).replaceAll("`", "&#096;");
    }

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function fmtDate(isoOrDate) {
        if (!isoOrDate) return "—";
        const d = new Date(isoOrDate);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("pt-BR");
    }

    function fmtDateTime(isoOrDate) {
        if (!isoOrDate) return "—";
        const d = new Date(isoOrDate);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("pt-BR");
    }

    function diffHours(startIso, endIso) {
        if (!startIso || !endIso) return 0;
        const a = new Date(startIso).getTime();
        const b = new Date(endIso).getTime();
        if (!a || !b) return 0;
        return Math.max(0, (b - a) / 36e5);
    }

    function showFeedback(message, type = "info") {
        const el = $("#kanban-feedback");
        if (!el) return;
        el.className = `alert alert-${type}`;
        el.style.display = "block";
        el.textContent = message;
        clearTimeout(showFeedback._t);
        showFeedback._t = setTimeout(() => {
            el.style.display = "none";
        }, 2600);
    }

    async function api(path, opts = {}) {
        const res = await fetch(path, opts);
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(`${res.status} ${res.statusText}${msg ? ` - ${msg}` : ""}`);
        }
        if (res.status === 204) return null;
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) return res.json();
        return res.text();
    }

    // ========= Const =========
    const STATUS = [
        { key: "produce", label: "A Produzir" },
        { key: "doing", label: "Em andamento" },
        { key: "review", label: "Em Review" },
        { key: "approval", label: "Em aprovação" },
        { key: "changes", label: "Alteração necessária" },
        { key: "approved", label: "Aprovados" },
        { key: "scheduled", label: "Agendados" },
        { key: "published", label: "Publicados" },
    ];

    const WEEK_BADGE = {
        S1: "bg-label-danger",
        S2: "bg-label-warning",
        S3: "bg-label-primary",
        S4: "bg-label-secondary",
    };

    const STATUS_BADGE = {
        produce: "bg-label-secondary",
        doing: "bg-label-primary",
        review: "bg-label-warning",
        approval: "bg-label-warning",
        changes: "bg-label-danger",
        approved: "bg-label-success",
        scheduled: "bg-label-info",
        published: "bg-label-dark",
    };

    function statusLabel(key) {
        return STATUS.find((s) => s.key === key)?.label || key;
    }

    // ========= State (API driven) =========
    const state = {
        cards: [],
        goals: {},
        goalsMonthKey: null,
        selectedCardId: null,
    };

    function currentMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    function monthLabel(key) {
        const [y, m] = key.split("-").map(Number);
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return `${months[(m - 1) || 0]}/${y}`;
    }

    function listLastMonthKeys(n = 12) {
        const out = [];
        const d = new Date();
        d.setDate(1);
        for (let i = 0; i < n; i++) {
            out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            d.setMonth(d.getMonth() - 1);
        }
        return out;
    }

    function monthBounds(key) {
        const [y, m] = key.split("-").map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        return { start, end };
    }

    function isDateInMonth(iso, key) {
        if (!iso) return false;
        const d = new Date(iso);
        const { start, end } = monthBounds(key);
        return d >= start && d < end;
    }

    function cardDateForGoals(card) {
        return card.published_at || card.due_date || null;
    }

    function filterCardsByMonth(cards, key) {
        return (cards || []).filter((c) => isDateInMonth(cardDateForGoals(c), key));
    }

    // ========= Derived metrics =========
    function calcQuality(card) {
        // mantém regra simples (pode virar backend depois)
        const penalties = 15 * Number(card.feedback_count || 0);
        return clamp(100 - penalties, 0, 100);
    }

    function isOnTime(card) {
        if (!card.due_date || !card.published_at) return null;
        const due = new Date(card.due_date);
        due.setHours(23, 59, 59, 999);
        return new Date(card.published_at) <= due;
    }

    function getTotalEstimate(card) {
        const r = card.roles || {};
        const sum = (r.design?.estimate_hours || 0) + (r.text?.estimate_hours || 0) + (r.schedule?.estimate_hours || 0);
        return Math.round(sum * 10) / 10;
    }

    function getTotalReal(card) {
        const runs = Array.isArray(card.role_runs) ? card.role_runs : [];
        const sum = runs.reduce((a, run) => a + diffHours(run.started_at, run.ended_at), 0);
        return Math.round(sum * 10) / 10;
    }

    function calcProgress(card) {
        const s = card.status;
        if (s === "published") return 100;
        if (s === "scheduled") return 95;
        if (s === "approved") return 85;
        if (s === "approval") return 75;
        if (s === "review") return 70;
        if (s === "changes") return 65;
        if (s === "doing") {
            const designDone = !!card.roles?.design?.done_at;
            const textDone = !!card.roles?.text?.done_at;
            return 30 + (designDone ? 20 : 0) + (textDone ? 20 : 0);
        }
        return 5;
    }

    // ========= API loaders =========
    async function loadCards() {
        state.cards = await api("/api/kanban/cards");
        if (!Array.isArray(state.cards)) state.cards = [];
    }

    async function loadGoals(monthKey) {
        // rota (task 3): /api/kanban/goals?month=YYYY-MM
        const data = await api(`/api/kanban/goals?month=${encodeURIComponent(monthKey)}`);
        state.goals = data || {};
    }

    async function initGoalsMonthSelect() {
        const sel = $("#kb-goals-month");
        if (!sel) return;

        const keys = listLastMonthKeys(12);
        sel.innerHTML = keys.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("");

        const cur = state.goalsMonthKey || currentMonthKey();
        sel.value = keys.includes(cur) ? cur : keys[0];
        state.goalsMonthKey = sel.value;
    }

    // ========= Filters =========
    function getFilters() {
        return {
            q: ($("#kb-search")?.value || "").trim().toLowerCase(),
            client: $("#kb-filter-client")?.value || "all",
            member: $("#kb-filter-member")?.value || "all",
            week: $("#kb-filter-priority")?.value || "all",
        };
    }

    function memberNameById(id) {
        const team = window.KanbanAdmin?.getTeam?.() || [];
        return team.find((m) => m.id === id)?.name || "—";
    }

    function cardActiveMembers(card) {
        if (card.status === "produce") return [card.owners?.briefing].filter(Boolean);

        if (card.status === "doing" || card.status === "changes") {
            const act = [];
            if (card.roles?.design?.active) act.push(card.roles.design.member_id);
            if (card.roles?.text?.active) act.push(card.roles.text.member_id);
            return act.filter(Boolean);
        }

        if (card.status === "review") {
            const act = [];
            if (card.roles?.review?.active) act.push(card.roles.review.member_id);
            return act.filter(Boolean);
        }

        if (card.status === "approved" && card.roles?.schedule?.active) return [card.roles.schedule.member_id];

        return [];
    }

    function applyFilters(list) {
        const f = getFilters();
        return list.filter((c) => {
            if (f.client !== "all" && c.client_name !== f.client) return false;
            if (f.week !== "all" && c.week !== f.week) return false;

            if (f.member !== "all") {
                const act = cardActiveMembers(c);
                if (!act.includes(f.member)) return false;
            }

            if (f.q) {
                const hay = [
                    c.title,
                    c.client_name,
                    (c.tags || []).join(" "),
                    c.briefing,
                    c.copy_text,
                ].join(" ").toLowerCase();
                if (!hay.includes(f.q)) return false;
            }

            return true;
        });
    }

    // ========= Render =========
    function fillOptions(select, options) {
        if (!select) return;
        const cur = select.value;
        select.innerHTML = options
            .map((o) => `<option value="${escapeAttr(o.value)}">${escapeHtml(o.label)}</option>`)
            .join("");
        if (options.some((o) => o.value === cur)) select.value = cur;
    }

    function fillSelects() {
        const clients = window.KanbanAdmin?.getClients?.() || [];
        const team = window.KanbanAdmin?.getTeam?.() || [];

        fillOptions($("#kb-filter-client"), [{ value: "all", label: "Todos" }].concat(
            clients.map((c) => ({ value: c.name, label: c.name }))
        ));

        fillOptions($("#kb-filter-member"), [{ value: "all", label: "Todos" }].concat(
            team.map((m) => ({ value: m.id, label: m.name }))
        ));

        fillOptions($("#kb-client"), clients.map((c) => ({ value: c.name, label: c.name })));
    }

    function renderCard(card) {
        const activeMembers = cardActiveMembers(card).map(memberNameById);
        const st = statusLabel(card.status);

        const tags = (card.tags || []).slice(0, 3)
            .map((t) => `<span class="badge bg-label-secondary">${escapeHtml(t)}</span>`)
            .join(" ");

        const due = card.due_date
            ? `<span class="badge bg-label-info"><i class="bx bx-calendar me-1"></i>${fmtDate(card.due_date)}</span>`
            : "";

        const rework = Number(card.feedback_count || 0)
            ? `<span class="badge bg-label-danger"><i class="bx bx-revision me-1"></i>${Number(card.feedback_count || 0)}</span>`
            : `<span class="badge bg-label-success"><i class="bx bx-check me-1"></i>0</span>`;

        const q = `<span class="badge bg-label-warning"><i class="bx bx-shield-quarter me-1"></i>${calcQuality(card)}</span>`;

        const owners = activeMembers.length
            ? activeMembers.map((n) => `<span class="badge bg-label-primary"><i class="bx bx-user me-1"></i>${escapeHtml(n)}</span>`).join(" ")
            : `<span class="badge bg-label-secondary"><i class="bx bx-user-x me-1"></i>Sem responsável</span>`;

        const miniActions = renderMiniActions(card);

        return `
      <div class="kb-card" draggable="true" data-id="${escapeAttr(card.id)}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="flex-grow-1">
            <div class="fw-semibold">${escapeHtml(card.title)}</div>
            <div class="small text-muted mt-1">${escapeHtml(card.client_name || "—")}</div>
          </div>
          <span class="badge ${WEEK_BADGE[card.week] || "bg-label-secondary"}">${escapeHtml(card.week || "S?")}</span>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-2">
          <span class="badge ${STATUS_BADGE[card.status] || "bg-label-secondary"}">${escapeHtml(st)}</span>
          ${due}
          ${q}
          ${rework}
        </div>

        <div class="d-flex flex-wrap gap-2 mt-2">${owners}</div>
        ${tags ? `<div class="d-flex flex-wrap gap-2 mt-2">${tags}</div>` : ""}

        <div class="d-flex align-items-center justify-content-between mt-3">
          <button class="btn btn-sm btn-outline-primary kb-open-details" data-id="${escapeAttr(card.id)}">
            <i class="bx bx-detail me-1"></i> Ver detalhes
          </button>
          ${miniActions}
        </div>
      </div>
    `;
    }

    function renderMiniActions(card) {
        if (card.status === "doing" || card.status === "changes") {
            const parts = [];
            if (card.roles?.design?.active) parts.push(`<button class="btn btn-sm btn-success kb-role-done" data-role="design" data-id="${escapeAttr(card.id)}"><i class="bx bx-check me-1"></i>Arte</button>`);
            if (card.roles?.text?.active) parts.push(`<button class="btn btn-sm btn-success kb-role-done" data-role="text" data-id="${escapeAttr(card.id)}"><i class="bx bx-check me-1"></i>Texto</button>`);
            return parts.length ? `<div class="d-flex gap-2">${parts.join("")}</div>` : "";
        }
        if (card.status === "approved" && card.roles?.schedule?.active) {
            return `<button class="btn btn-sm btn-success kb-role-done" data-role="schedule" data-id="${escapeAttr(card.id)}"><i class="bx bx-calendar-check me-1"></i>Agendar</button>`;
        }
        if (card.status === "scheduled") {
            return `<button class="btn btn-sm btn-success kb-publish" data-id="${escapeAttr(card.id)}"><i class="bx bx-world me-1"></i>Publicar</button>`;
        }
        return "";
    }

    function render() {
        const all = state.cards || [];
        const filtered = applyFilters(all);

        const count = (k) => filtered.filter((c) => c.status === k).length;
        $("#count-produce").textContent = `(${count("produce")})`;
        $("#count-doing").textContent = `(${count("doing")})`;
        $("#count-review").textContent = `(${count("review")})`;
        $("#count-approval").textContent = `(${count("approval")})`;
        $("#count-changes").textContent = `(${count("changes")})`;
        $("#count-approved").textContent = `(${count("approved")})`;
        $("#count-scheduled").textContent = `(${count("scheduled")})`;
        $("#count-published").textContent = `(${count("published")})`;

        const wip = filtered.filter((c) => c.status === "doing" || c.status === "review" || c.status === "changes").length;
        $("#sum-wip").textContent = String(wip);

        const published = filtered.filter((c) => c.status === "published" && c.published_at && c.due_date);
        const ontime = published.filter((c) => isOnTime(c) === true).length;
        const ontimePct = published.length ? Math.round((ontime / published.length) * 100) : 0;
        $("#sum-ontime").textContent = `${ontimePct}%`;

        const qAvg = filtered.length ? Math.round(filtered.reduce((a, c) => a + calcQuality(c), 0) / filtered.length) : 0;
        $("#sum-quality").textContent = String(qAvg);

        const rework = filtered.reduce((a, c) => a + Number(c.feedback_count || 0), 0);
        $("#sum-rework").textContent = String(rework);

        $$(".kb-dropzone").forEach((z) => (z.innerHTML = ""));
        filtered.forEach((card) => {
            const z = document.querySelector(`.kb-dropzone[data-status="${card.status}"]`);
            if (!z) return;
            z.insertAdjacentHTML("beforeend", renderCard(card));
        });

        fillSelects();
        renderGoals();
        initDragAndDrop();
    }

    // ========= Actions (API) =========
    async function transition(cardId, payload) {
        // rota (task 3): POST /api/kanban/cards/:id/transition
        await api(`/api/kanban/cards/${encodeURIComponent(cardId)}/transition`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        await loadCards();
        render();
    }

    async function uploadAssets(cardId, files) {
        const fd = new FormData();
        Array.from(files || []).forEach((f) => fd.append("files", f));

        // rota (task 3): POST /api/kanban/cards/:id/assets (multipart)
        await api(`/api/kanban/cards/${encodeURIComponent(cardId)}/assets`, {
            method: "POST",
            body: fd,
        });

        await loadCards();
        render();
        openDetails(cardId);
    }

    // ========= Modals =========
    const modalCreate = $("#kbModalCreate") ? new bootstrap.Modal($("#kbModalCreate")) : null;
    const modalDetails = $("#kbModalDetails") ? new bootstrap.Modal($("#kbModalDetails")) : null;
    const modalGoals = $("#kbModalGoals") ? new bootstrap.Modal($("#kbModalGoals")) : null;

    function renderAutoClientRolesPreview(clientName) {
        const clients = window.KanbanAdmin?.getClients?.() || [];
        const c = clients.find((x) => x.name === clientName);

        const roles = c?.roles || {};
        $("#kb-auto-review").textContent = memberNameById(roles.review);
        $("#kb-auto-briefing").textContent = memberNameById(roles.briefing);
        $("#kb-auto-design").textContent = memberNameById(roles.design);
        $("#kb-auto-text").textContent = memberNameById(roles.text);
        $("#kb-auto-schedule").textContent = memberNameById(roles.schedule);
        $("#kb-auto-approver").textContent = c?.approval_name || "—";
    }

    function openCreate(editCard = null) {
        $("#kbModalCreateLabel").innerHTML = editCard
            ? `<i class="bx bx-edit-alt me-2"></i>Editar card`
            : `<i class="bx bx-plus-circle me-2"></i>Novo card`;

        $("#kb-id").value = editCard?.id || "";
        $("#kb-title").value = editCard?.title || "";
        $("#kb-desc").value = editCard?.desc || "";
        $("#kb-briefing").value = editCard?.briefing || "";

        const clients = window.KanbanAdmin?.getClients?.() || [];
        const fallbackClient = clients[0]?.name || "";
        $("#kb-client").value = editCard?.client_name || fallbackClient;

        $("#kb-priority").value = editCard?.week || "S2";

        $("#kb-est-design").value = Number(editCard?.roles?.design?.estimate_hours ?? 2);
        $("#kb-est-text").value = Number(editCard?.roles?.text?.estimate_hours ?? 1);
        $("#kb-est-schedule").value = Number(editCard?.roles?.schedule?.estimate_hours ?? 0.5);

        $("#kb-due").value = editCard?.due_date || "";
        $("#kb-rework").value = Number(editCard?.feedback_count ?? 0);
        $("#kb-tags").value = (editCard?.tags || []).join(", ");

        renderAutoClientRolesPreview($("#kb-client").value);
        modalCreate?.show();
    }

    function renderAssets(card) {
        const assets = Array.isArray(card.assets) ? card.assets.filter(Boolean) : [];
        if (!assets.length) return `<div class="text-muted small">Sem artes anexadas.</div>`;

        return assets
            .map((a, idx) => `
        <div class="kb-asset">
          <img src="${escapeAttr(a.url)}" alt="Arte ${idx + 1}">
          <div class="kb-asset-caption">Arte ${idx + 1}</div>
        </div>
      `)
            .join("");
    }

    function renderTimeLog(card) {
        const runs = Array.isArray(card.role_runs) ? card.role_runs : [];
        if (!runs.length) return `<tr><td colspan="5" class="text-muted small">Sem histórico de tempo ainda.</td></tr>`;

        return runs
            .map((r) => {
                const roleLabel = r.role === "design" ? "Arte" : r.role === "text" ? "Texto" : r.role === "review" ? "Review" : "Agendamento";
                const stageLabel = statusLabel(r.status);
                const dur = r.ended_at ? `${Math.round(diffHours(r.started_at, r.ended_at) * 10) / 10}h` : "—";

                return `
          <tr>
            <td>${escapeHtml(stageLabel)}</td>
            <td>${escapeHtml(roleLabel)}</td>
            <td>${escapeHtml(memberNameById(r.member_id))}</td>
            <td>${fmtDateTime(r.started_at)}</td>
            <td>${r.ended_at ? fmtDateTime(r.ended_at) : "—"} <span class="text-muted">(${dur})</span></td>
          </tr>
        `;
            })
            .join("");
    }

    function renderClientComments(card) {
        const list = Array.isArray(card.client_comments) ? card.client_comments : [];
        if (!list.length) return `<div class="text-muted small">Sem comentários do cliente.</div>`;

        return list
            .map((c) => `
        <div class="border rounded p-2">
          <div class="d-flex justify-content-between">
            <div class="fw-medium">${escapeHtml(c.author || "Cliente")}</div>
            <div class="text-muted small">${fmtDateTime(c.created_at)}</div>
          </div>
          <div class="small mt-1">${escapeHtml(c.text)}</div>
        </div>
      `)
            .join("");
    }

    function renderDetailsActions(card) {
        const id = escapeAttr(card.id);
        const actions = [];

        if (card.status === "produce") {
            actions.push(`<button class="btn btn-primary kb-start" data-id="${id}"><i class="bx bx-play me-1"></i>Iniciar produção</button>`);
        }

        if (card.status === "doing" || card.status === "changes") {
            if (card.roles?.design?.active) actions.push(`<button class="btn btn-success kb-role-done" data-role="design" data-id="${id}"><i class="bx bx-check me-1"></i>Concluir arte</button>`);
            if (card.roles?.text?.active) actions.push(`<button class="btn btn-success kb-role-done" data-role="text" data-id="${id}"><i class="bx bx-check me-1"></i>Concluir legenda/copy</button>`);
        }

        if (card.status === "review") {
            if (card.roles?.review?.active) actions.push(`<button class="btn btn-success kb-role-done" data-role="review" data-id="${id}"><i class="bx bx-check me-1"></i>Concluir review</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="design" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Arte</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="text" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Legenda/Copy</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="both" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Geral</button>`);
        }

        if (card.status === "approval") {
            actions.push(`<button class="btn btn-success kb-approve" data-id="${id}"><i class="bx bx-check-double me-1"></i>Aprovar</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="design" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Arte</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="text" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Legenda/Copy</button>`);
            actions.push(`<button class="btn btn-outline-danger kb-change" data-target="both" data-id="${id}"><i class="bx bx-revision me-1"></i>Alteração: Geral</button>`);
        }

        if (card.status === "approved" && card.roles?.schedule?.active) {
            actions.push(`<button class="btn btn-success kb-role-done" data-role="schedule" data-id="${id}"><i class="bx bx-calendar-check me-1"></i>Marcar como agendado</button>`);
        }

        if (card.status === "scheduled") {
            actions.push(`<button class="btn btn-success kb-publish" data-id="${id}"><i class="bx bx-world me-1"></i>Marcar como publicado</button>`);
        }

        return actions.join("");
    }

    function openDetails(cardId) {
        const card = state.cards.find((c) => c.id === cardId);
        if (!card) return;

        state.selectedCardId = cardId;

        const stLabel = statusLabel(card.status);
        const actMembers = cardActiveMembers(card).map(memberNameById).join(", ") || "—";

        $("#kb-details-subtitle").textContent = `${card.client_name || "—"} • ${actMembers} • ${stLabel}`;
        $("#kb-details-title").textContent = card.title || "—";

        const badges = [];
        badges.push(`<span class="badge ${WEEK_BADGE[card.week] || "bg-label-secondary"}">${escapeHtml(card.week || "S?")}</span>`);
        badges.push(`<span class="badge ${STATUS_BADGE[card.status] || "bg-label-secondary"}">${escapeHtml(stLabel)}</span>`);
        if (card.due_date) badges.push(`<span class="badge bg-label-info"><i class="bx bx-calendar me-1"></i>${fmtDate(card.due_date)}</span>`);
        badges.push(`<span class="badge bg-label-warning"><i class="bx bx-shield-quarter me-1"></i>${calcQuality(card)}</span>`);
        badges.push(`<span class="badge bg-label-danger"><i class="bx bx-revision me-1"></i>${Number(card.feedback_count || 0)}</span>`);
        $("#kb-details-badges").innerHTML = badges.join("");

        $("#kb-copy-input").value = card.copy_text || "";
        $("#kb-details-briefing").textContent = card.briefing || "—";
        $("#kb-details-desc").textContent = card.desc || "—";

        $("#kb-assets-area").innerHTML = renderAssets(card);

        $("#kb-details-estimate").textContent = String(getTotalEstimate(card));
        $("#kb-details-actual").textContent = String(getTotalReal(card));
        $("#kb-details-quality").textContent = String(calcQuality(card));
        $("#kb-details-rework").textContent = String(Number(card.feedback_count || 0));

        const prog = calcProgress(card);
        $("#kb-details-progress-label").textContent = `${prog}%`;
        $("#kb-details-progress").style.width = `${prog}%`;

        $("#kb-details-due").textContent = fmtDate(card.due_date);
        $("#kb-details-doneAt").textContent = fmtDate(card.published_at);

        $("#kb-details-timelog").innerHTML = renderTimeLog(card);
        $("#kb-client-comments").innerHTML = renderClientComments(card);

        $("#kb-actions").innerHTML = renderDetailsActions(card);

        modalDetails?.show();
    }

    // ========= Drag & Drop =========
    function initDragAndDrop() {
        $$(".kb-card").forEach((cardEl) => {
            cardEl.addEventListener("dragstart", (e) => {
                cardEl.classList.add("opacity-50");
                e.dataTransfer.setData("text/plain", cardEl.dataset.id);
            });
            cardEl.addEventListener("dragend", () => cardEl.classList.remove("opacity-50"));
        });

        $$(".kb-dropzone").forEach((zone) => {
            zone.addEventListener("dragover", (e) => {
                e.preventDefault();
                zone.classList.add("kb-over");
            });
            zone.addEventListener("dragleave", () => zone.classList.remove("kb-over"));
            zone.addEventListener("drop", async (e) => {
                e.preventDefault();
                zone.classList.remove("kb-over");

                const cardId = e.dataTransfer.getData("text/plain");
                const toStatus = zone.dataset.status;
                const card = state.cards.find((c) => c.id === cardId);
                if (!card) return;

                if (!(card.status === "produce" && toStatus === "doing")) {
                    showFeedback("Movimento bloqueado. Use os botões do fluxo.", "info");
                    return;
                }

                try {
                    await transition(cardId, { action: "start" });
                    showFeedback("Card iniciado: A Produzir → Em andamento", "success");
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao iniciar produção.", "danger");
                }
            });
        });
    }

    // ========= Goals =========
    async function renderGoals() {
        await initGoalsMonthSelect();

        const month = state.goalsMonthKey || currentMonthKey();
        $("#kb-goals-month-label").textContent = monthLabel(month);

        // Carrega goals do mês via API
        try {
            await loadGoals(month);
        } catch {
            state.goals = { clients: [] };
        }

        const cardsMonth = filterCardsByMonth(state.cards || [], month);
        const published = cardsMonth.filter((c) => c.status === "published" && c.published_at && c.due_date && isDateInMonth(c.published_at, month));

        const ontime = published.filter((c) => isOnTime(c) === true).length;
        const ontimePct = published.length ? Math.round((ontime / published.length) * 100) : 0;

        const qAvg = cardsMonth.length ? Math.round(cardsMonth.reduce((a, c) => a + calcQuality(c), 0) / cardsMonth.length) : 0;
        const reworkTotal = cardsMonth.reduce((a, c) => a + Number(c.feedback_count || 0), 0);

        const TEAM_GOAL_ONTIME = 90;
        const TEAM_GOAL_QUALITY = 85;
        const TEAM_MAX_REWORK = 10;

        $("#goal-team-ontime").textContent = `${ontimePct}% / ${TEAM_GOAL_ONTIME}%`;
        $("#bar-team-ontime").style.width = `${clamp(Math.round((ontimePct / TEAM_GOAL_ONTIME) * 100), 0, 100)}%`;

        $("#goal-team-quality").textContent = `${qAvg} / ${TEAM_GOAL_QUALITY}`;
        $("#bar-team-quality").style.width = `${clamp(Math.round((qAvg / TEAM_GOAL_QUALITY) * 100), 0, 100)}%`;

        $("#goal-team-rework").textContent = `${reworkTotal} / ${TEAM_MAX_REWORK}`;
        $("#bar-team-rework").style.width = `${clamp(Math.round((reworkTotal / TEAM_MAX_REWORK) * 100), 0, 100)}%`;
        $("#bar-team-rework").classList.toggle("bg-danger", reworkTotal > TEAM_MAX_REWORK);

        // clientes no painel (agora vem da API state.goals.clients)
        renderClientGoals(cardsMonth, month);
        renderPeopleGoals(cardsMonth, month);
    }

    function renderPeopleGoals(cardsMonth, month) {
        const tbody = $("#goals-table-body");
        if (!tbody) return;

        // nomes do time (vem do Admin)
        const team = (window.KanbanAdmin?.getTeam?.() || [])
            .map(m => (m?.name || "").trim())
            .filter(Boolean);

        // nomes que aparecem nos cards (fallback)
        const namesFromCards = new Set();
        for (const c of (cardsMonth || [])) {
            for (const rk of ["design", "text", "review", "schedule"]) {
                const n = (c.roles?.[rk]?.member_name || "").trim();
                if (n) namesFromCards.add(n);
            }
            for (const run of (c.role_runs || [])) {
                const n = (run.member_name || "").trim();
                if (n) namesFromCards.add(n);
            }
        }

        const members = Array.from(new Set([...team, ...namesFromCards])).sort((a, b) => a.localeCompare(b));

        const rows = members.map((name) => {
            const myCards = (cardsMonth || []).filter((c) => {
                const r = c.roles || {};
                return ["design", "text", "review", "schedule"].some((rk) => (r[rk]?.member_name || "").trim() === name);
            });

            const published = myCards.filter((c) => c.status === "published" && c.published_at && c.due_date && isDateInMonth(c.published_at, month));
            const ontimeCount = published.filter((c) => isOnTime(c) === true).length;
            const ontimePct = published.length ? Math.round((ontimeCount / published.length) * 100) : 0;

            const qualityAvg = myCards.length ? Math.round(myCards.reduce((a, c) => a + calcQuality(c), 0) / myCards.length) : 0;
            const rework = myCards.reduce((a, c) => a + Number(c.feedback_count || 0), 0);

            // horas estimadas só das roles do membro
            const est = myCards.reduce((sum, c) => {
                const r = c.roles || {};
                let s = 0;
                for (const rk of ["design", "text", "review", "schedule"]) {
                    if ((r[rk]?.member_name || "").trim() === name) s += Number(r[rk]?.estimate_hours || 0);
                }
                return sum + s;
            }, 0);

            // horas reais pelos runs do membro
            const real = (cardsMonth || []).reduce((sum, c) => {
                const runs = Array.isArray(c.role_runs) ? c.role_runs : [];
                const mine = runs.filter((run) => (run.member_name || "").trim() === name);
                const hrs = mine.reduce((a, run) => a + diffHours(run.started_at, run.ended_at), 0);
                return sum + hrs;
            }, 0);

            const estR = Math.round(est * 10) / 10;
            const realR = Math.round(real * 10) / 10;

            const initial = (name || "—").trim().slice(0, 1).toUpperCase();

            return `
                <tr>
                    <td>
                    <div class="d-flex align-items-center gap-2">
                        <span class="avatar avatar-xs rounded bg-label-primary"><span class="avatar-initial">${escapeHtml(initial)}</span></span>
                        <div class="fw-medium">${escapeHtml(name)}</div>
                    </div>
                    </td>
                    <td>${ontimePct}%</td>
                    <td>${qualityAvg}</td>
                    <td>${rework}</td>
                    <td class="text-muted">
                    <div>Σ est: <b>${estR}h</b> &nbsp;•&nbsp; Σ real: <b>${realR}h</b></div>
                    <div class="small">Desvio: ${estR ? `${Math.round(((realR - estR) / estR) * 100)}%` : "—"}</div>
                    </td>
                </tr>
                `;
        });

        tbody.innerHTML = rows.join("");
    }

    function renderClientGoals(cardsMonth, month) {
        const wrap = $("#kb-goals-clients");
        if (!wrap) return;

        const q = ($("#kb-goals-client-search")?.value || "").trim().toLowerCase();

        const goalsClients = Array.isArray(state.goals?.clients) ? state.goals.clients : [];
        const filtered = q ? goalsClients.filter((c) => (c.client_name || "").toLowerCase().includes(q)) : goalsClients;

        wrap.innerHTML = filtered.map((g) => {
            const client = g.client_name;
            const cardsClient = (cardsMonth || []).filter((c) => (c.client_name || "") === client);

            const published = cardsClient.filter((c) => c.status === "published" && c.published_at && isDateInMonth(c.published_at, month));
            const postsDone = published.length;

            const postsGoal = Number(g.posts_per_month ?? 0);

            const ontime = published.filter((c) => isOnTime(c) === true).length;
            const ontimePct = published.length ? Math.round((ontime / published.length) * 100) : 0;

            const qAvg = cardsClient.length ? Math.round(cardsClient.reduce((a, c) => a + calcQuality(c), 0) / cardsClient.length) : 0;
            const reworkTotal = cardsClient.reduce((a, c) => a + Number(c.feedback_count || 0), 0);

            const barPosts = postsGoal ? clamp(Math.round((postsDone / postsGoal) * 100), 0, 100) : 0;
            const barOntime = Number(g.ontime_pct ?? 0) ? clamp(Math.round((ontimePct / Number(g.ontime_pct)) * 100), 0, 100) : 0;
            const barQuality = Number(g.quality_goal ?? 0) ? clamp(Math.round((qAvg / Number(g.quality_goal)) * 100), 0, 100) : 0;
            const barRework = Number(g.max_rework ?? 0) ? clamp(Math.round((reworkTotal / Number(g.max_rework)) * 100), 0, 100) : 0;

            return `
        <div class="border rounded p-2">
          <div class="d-flex justify-content-between align-items-center">
            <div class="fw-medium">${escapeHtml(client)}</div>
            <span class="badge bg-label-secondary">${postsDone}/${postsGoal || "—"} posts (${month})</span>
          </div>

          <div class="mt-2">
            <div class="d-flex justify-content-between small text-muted"><span>Posts/mês</span><span>${postsDone} / ${postsGoal || "—"}</span></div>
            <div class="progress mt-1" style="height: 8px;"><div class="progress-bar" role="progressbar" style="width: ${barPosts}%"></div></div>
          </div>

          <div class="mt-2">
            <div class="d-flex justify-content-between small text-muted"><span>No prazo</span><span>${ontimePct}% / ${Number(g.ontime_pct ?? 0)}%</span></div>
            <div class="progress mt-1" style="height: 8px;"><div class="progress-bar" role="progressbar" style="width: ${barOntime}%"></div></div>
          </div>

          <div class="mt-2">
            <div class="d-flex justify-content-between small text-muted"><span>Qualidade</span><span>${qAvg} / ${Number(g.quality_goal ?? 0)}</span></div>
            <div class="progress mt-1" style="height: 8px;"><div class="progress-bar" role="progressbar" style="width: ${barQuality}%"></div></div>
          </div>

          <div class="mt-2">
            <div class="d-flex justify-content-between small text-muted"><span>Retrabalho</span><span>${reworkTotal} / ${Number(g.max_rework ?? 0)}</span></div>
            <div class="progress mt-1" style="height: 8px;"><div class="progress-bar" role="progressbar" style="width: ${barRework}%"></div></div>
          </div>
        </div>
      `;
        }).join("");
    }

    // ========= Events =========
    function bindEvents() {
        $("#kb-open-create")?.addEventListener("click", () => openCreate());

        $("#kb-save")?.addEventListener("click", async () => {
            try {
                const title = ($("#kb-title").value || "").trim();
                if (!title) return showFeedback("Título é obrigatório.", "danger");

                const id = ($("#kb-id").value || "").trim();
                const clientName = $("#kb-client").value;
                const week = $("#kb-priority").value;

                const payload = {
                    title,
                    client_name: clientName,
                    week,
                    desc: ($("#kb-desc").value || "").trim(),
                    briefing: ($("#kb-briefing").value || "").trim(),
                    due_date: $("#kb-due").value || null,
                    tags: ($("#kb-tags").value || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
                    estimates: {
                        design: Number($("#kb-est-design").value || 0),
                        text: Number($("#kb-est-text").value || 0),
                        schedule: Number($("#kb-est-schedule").value || 0),
                    },
                };

                if (id) {
                    await api(`/api/kanban/cards/${encodeURIComponent(id)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                } else {
                    await api(`/api/kanban/cards`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                }

                await loadCards();
                render();
                modalCreate?.hide();
                showFeedback(id ? "Card atualizado." : "Card criado.", "success");
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao salvar card.", "danger");
            }
        });

        $("#kb-goals-client-search")?.addEventListener("input", () => renderGoals());

        $("#kb-goals-month")?.addEventListener("change", async (e) => {
            state.goalsMonthKey = e.target.value;
            await renderGoals();
        });

        $("#kb-edit-from-details")?.addEventListener("click", () => {
            if (!state.selectedCardId) return;
            const card = state.cards.find((c) => c.id === state.selectedCardId);
            if (!card) return;
            modalDetails?.hide();
            setTimeout(() => openCreate(card), 200);
        });

        $("#kb-delete")?.addEventListener("click", async () => {
            if (!state.selectedCardId) return;
            const ok = confirm("Excluir este card?");
            if (!ok) return;

            try {
                await api(`/api/kanban/cards/${encodeURIComponent(state.selectedCardId)}`, { method: "DELETE" });
                state.selectedCardId = null;
                await loadCards();
                render();
                modalDetails?.hide();
                showFeedback("Card excluído.", "warning");
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao excluir card.", "danger");
            }
        });

        $("#kb-add-assets-btn")?.addEventListener("click", () => {
            if (!state.selectedCardId) return;
            $("#kb-assets-file")?.click();
        });

        $("#kb-assets-file")?.addEventListener("change", async (e) => {
            if (!state.selectedCardId) return;
            try {
                await uploadAssets(state.selectedCardId, e.target.files);
                showFeedback("Artes enviadas.", "success");
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao enviar artes.", "danger");
            } finally {
                e.target.value = "";
            }
        });

        $("#kb-copy-save")?.addEventListener("click", async () => {
            if (!state.selectedCardId) return;
            try {
                await transition(state.selectedCardId, { action: "save_copy", copy_text: ($("#kb-copy-input").value || "").trim() });
                showFeedback("Texto salvo.", "success");
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao salvar texto.", "danger");
            }
        });

        $("#kb-go-client-config")?.addEventListener("click", () => {
            const name = $("#kb-client")?.value;
            if (!name) return;

            const tabBtn = document.querySelector("#tab-clientes");
            if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();

            window.KanbanAdmin?.openClientByName?.(name);
            modalCreate?.hide();
        });

        // filtros
        ["#kb-search", "#kb-filter-client", "#kb-filter-member", "#kb-filter-priority"].forEach((sel) => {
            $(sel)?.addEventListener("input", () => render());
            $(sel)?.addEventListener("change", () => render());
        });

        // modal metas
        $("#kb-goals-config")?.addEventListener("click", async () => {
            try {
                const month = state.goalsMonthKey || currentMonthKey();
                await loadGoals(month);

                const body = $("#kb-goals-table-body");
                if (!body) return;

                const clients = Array.isArray(state.goals?.clients) ? state.goals.clients : [];
                body.innerHTML = clients.map((c) => `
          <tr data-client="${escapeAttr(c.client_name)}">
            <td class="fw-medium">${escapeHtml(c.client_name)}</td>
            <td style="width: 120px;"><input class="form-control form-control-sm" data-field="posts_per_month" type="number" min="0" value="${Number(c.posts_per_month ?? 0)}"></td>
            <td style="width: 120px;"><input class="form-control form-control-sm" data-field="ontime_pct" type="number" min="0" max="100" value="${Number(c.ontime_pct ?? 0)}"></td>
            <td style="width: 130px;"><input class="form-control form-control-sm" data-field="quality_goal" type="number" min="0" max="100" value="${Number(c.quality_goal ?? 0)}"></td>
            <td style="width: 140px;"><input class="form-control form-control-sm" data-field="max_rework" type="number" min="0" value="${Number(c.max_rework ?? 0)}"></td>
          </tr>
        `).join("");

                modalGoals?.show();
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao carregar metas do mês.", "danger");
            }
        });

        $("#kb-goals-save")?.addEventListener("click", async () => {
            try {
                const month = state.goalsMonthKey || currentMonthKey();
                const body = $("#kb-goals-table-body");
                if (!body) return;

                const rows = Array.from(body.querySelectorAll("tr")).map((tr) => {
                    const client_name = tr.dataset.client;
                    const posts_per_month = Number(tr.querySelector('[data-field="posts_per_month"]')?.value || 0);
                    const ontime_pct = Number(tr.querySelector('[data-field="ontime_pct"]')?.value || 0);
                    const quality_goal = Number(tr.querySelector('[data-field="quality_goal"]')?.value || 0);
                    const max_rework = Number(tr.querySelector('[data-field="max_rework"]')?.value || 0);
                    return { client_name, posts_per_month, ontime_pct, quality_goal, max_rework };
                });

                // rota (task 3): PUT /api/kanban/goals?month=YYYY-MM
                await api(`/api/kanban/goals?month=${encodeURIComponent(month)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clients: rows }),
                });

                await loadGoals(month);
                await renderGoals();
                modalGoals?.hide();
                showFeedback("Metas atualizadas.", "success");
            } catch (err) {
                console.error(err);
                showFeedback("Erro ao salvar metas.", "danger");
            }
        });

        // delegação (cards + modal detalhes)
        document.addEventListener("click", async (e) => {
            const btn = e.target?.closest?.("button");
            if (!btn) return;

            if (btn.classList.contains("kb-open-details")) {
                e.preventDefault();
                return openDetails(btn.dataset.id);
            }

            if (btn.classList.contains("kb-role-done")) {
                e.preventDefault();
                try {
                    await transition(btn.dataset.id, { action: "complete_role", role: btn.dataset.role });
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao concluir etapa.", "danger");
                }
                return;
            }

            if (btn.classList.contains("kb-start")) {
                e.preventDefault();
                try {
                    await transition(btn.dataset.id, { action: "start" });
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao iniciar produção.", "danger");
                }
                return;
            }

            if (btn.classList.contains("kb-approve")) {
                e.preventDefault();
                try {
                    await transition(btn.dataset.id, { action: "approve" });
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao aprovar.", "danger");
                }
                return;
            }

            if (btn.classList.contains("kb-change")) {
                e.preventDefault();
                const t = btn.dataset.target;
                const targets = t === "both" ? ["design", "text"] : [t];
                try {
                    await transition(btn.dataset.id, { action: "request_change", targets });
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao solicitar alteração.", "danger");
                }
                return;
            }

            if (btn.classList.contains("kb-publish")) {
                e.preventDefault();
                try {
                    await transition(btn.dataset.id, { action: "publish" });
                } catch (err) {
                    console.error(err);
                    showFeedback("Erro ao publicar.", "danger");
                }
                return;
            }
        });
    }

    // ========= Init =========
    document.addEventListener("DOMContentLoaded", async () => {
        try {
            state.goalsMonthKey = currentMonthKey();
            bindEvents();

            // se API ainda não estiver pronta, a página sobe vazia
            await loadCards();
            render();
        } catch (err) {
            console.error(err);
            state.cards = [];
            render();
        }
    });
})();
