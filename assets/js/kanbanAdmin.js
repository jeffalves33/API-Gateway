// /assets/js/kanbanAdmin.js
(() => {
    const Roles = ["briefing", "design", "text", "review", "schedule"];

    const $ = (sel) => document.querySelector(sel);

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function api(path, opts = {}) {
        const res = await fetch(path, {
            headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
            ...opts,
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(`${res.status} ${res.statusText}${msg ? ` - ${msg}` : ""}`);
        }
        if (res.status === 204) return null;
        return res.json();
    }

    const state = {
        team: [],
        clients: [],
        selectedClientId: null,
    };

    async function loadAll() {
        // rotas (você cria na task 3)
        const [team, clients] = await Promise.all([
            api("/api/kanban/team"),
            api("/api/kanban/clients"),
        ]);
        state.team = Array.isArray(team) ? team : [];
        state.clients = Array.isArray(clients) ? clients : [];
    }

    function renderTeam() {
        const tbody = $("#team-table-body");
        const empty = $("#team-empty");

        tbody.innerHTML = "";

        if (!state.team.length) {
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        state.team.forEach((m) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${escapeHtml(m.name)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-id="${escapeHtml(m.id)}" type="button">
            <i class="bx bx-trash"></i>
          </button>
        </td>
      `;
            tbody.appendChild(tr);
        });
    }

    function renderTeamSelects() {
        Roles.forEach((role) => {
            const select = document.getElementById(`client-role-${role}`);
            if (!select) return;

            const current = select.value;
            select.innerHTML = '<option value="">— selecione —</option>';

            state.team.forEach((m) => {
                const opt = document.createElement("option");
                opt.value = m.name;
                opt.textContent = m.name;
                select.appendChild(opt);
            });

            if (state.team.some((m) => m.name === current)) select.value = current;
        });
    }

    function renderClientsList() {
        const list = $("#clients-list");
        const empty = $("#clients-empty");

        list.innerHTML = "";

        if (!state.clients.length) {
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        state.clients.forEach((c) => {
            const cid = String(c.id); // <<< garante string
            const a = document.createElement("a");
            a.href = "javascript:void(0)";
            a.className =
                "list-group-item list-group-item-action" +
                (state.selectedClientId === cid ? " active" : "");
            a.dataset.id = cid;

            a.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-medium">${escapeHtml(c.name)}</div>
        <small class="${state.selectedClientId === cid ? "text-white-50" : "text-muted"}">
          ${escapeHtml(c.approval_name || "")}
        </small>
      </div>
    `;
            list.appendChild(a);
        });
    }

    function clearClientForm() {
        state.selectedClientId = null;
        $("#client-id").value = "";
        $("#client-approval-name").value = "";
        $("#client-approval-emails").value = "";

        Roles.forEach((r) => {
            const el = document.getElementById(`client-role-${r}`);
            if (el) el.value = "";
        });

        $("#client-btn-delete").disabled = true;
        renderClientsList();
    }

    function loadClient(id) {
        const cid = String(id);
        const c = state.clients.find((x) => String(x.id) === cid);
        if (!c) return;

        state.selectedClientId = cid;

        $("#client-id").value = cid;
        $("#client-approval-name").value = c.approval_name || "";
        $("#client-approval-emails").value = c.approval_emails || "";

        const roles = c.roles || {};
        Roles.forEach((role) => {
            const el = document.getElementById(`client-role-${role}`);
            if (el) el.value = roles[role] || "";
        });

        $("#client-btn-delete").disabled = false;
        renderClientsList();
    }

    async function saveClientFromForm() {
        const id = $("#client-id").value || state.selectedClientId;
        if (!id) return alert("Selecione um cliente.");

        const approval_name = $("#client-approval-name").value.trim();
        const approval_emails = $("#client-approval-emails").value.trim();

        const roles = {};
        Roles.forEach((role) => {
            roles[role] = document.getElementById(`client-role-${role}`).value || "";
        });

        await api(`/api/kanban/clients/${id}/profile`, {
            method: "PUT",
            body: JSON.stringify({ approval_name, approval_emails, roles }),
        });

        await loadAll();
        renderTeamSelects();
        renderClientsList();
        loadClient(id);
        alert("Cliente salvo.");
    }

    async function deleteClientProfile() {
        const id = state.selectedClientId;
        if (!id) return;

        const ok = confirm("Excluir as informações extras deste cliente?");
        if (!ok) return;

        // rota (você cria na task 3)
        await api(`/api/kanban/clients/${id}/profile`, { method: "DELETE" });

        await loadAll();
        renderTeamSelects();
        clearClientForm();
        alert("Configuração removida.");
    }

    async function addTeamMember(name) {
        const n = (name || "").trim();
        if (!n) return;

        // rota (você cria na task 3)
        await api("/api/kanban/team", {
            method: "POST",
            body: JSON.stringify({ name: n }),
        });

        await loadAll();
        renderTeam();
        renderTeamSelects();
    }

    async function removeTeamMember(memberId) {
        const ok = confirm("Remover este membro da equipe?");
        if (!ok) return;

        // rota (você cria na task 3)
        await api(`/api/kanban/team/${memberId}`, { method: "DELETE" });

        await loadAll();
        renderTeam();
        renderTeamSelects();
        if (state.selectedClientId) loadClient(state.selectedClientId);
    }

    // API mínima usada pelo modal de criação do card
    window.KanbanAdmin = {
        openClientByName(name) {
            const c = state.clients.find((x) => x.name === name);
            if (!c) return;
            loadClient(c.id);
        },
        getClients() {
            return state.clients;
        },
        getTeam() {
            return state.team;
        },
    };

    document.addEventListener("DOMContentLoaded", async () => {
        try {
            await loadAll();
        } catch (e) {
            console.error(e);
            // página sobe vazia se API ainda não existir
        }

        renderTeam();
        renderTeamSelects();
        renderClientsList();
        clearClientForm();

        $("#team-form-add").addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = $("#team-name");
            try {
                await addTeamMember(input.value);
                input.value = "";
            } catch (err) {
                alert("Erro ao adicionar membro.");
                console.error(err);
            }
        });

        $("#team-table-body").addEventListener("click", async (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            try {
                await removeTeamMember(btn.dataset.id);
            } catch (err) {
                alert("Erro ao remover membro.");
                console.error(err);
            }
        });

        $("#client-btn-save").addEventListener("click", async () => {
            try {
                await saveClientFromForm();
            } catch (err) {
                alert("Erro ao salvar cliente.");
                console.error(err);
            }
        });

        $("#client-btn-delete").addEventListener("click", async () => {
            try {
                await deleteClientProfile();
            } catch (err) {
                alert("Erro ao excluir configuração do cliente.");
                console.error(err);
            }
        });

        $("#clients-list").addEventListener("click", (e) => {
            const item = e.target.closest(".list-group-item");
            if (!item) return;
            loadClient(String(item.dataset.id));
        });
    });
})();
