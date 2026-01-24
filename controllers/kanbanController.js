// Arquivo: controllers/kanbanController.js
const repo = require('../repositories/kanbanRepository');

const send = (res, status, data) => res.status(status).json(data);
const ok = (res, data) => send(res, 200, data);
const bad = (res, e) => send(res, 400, { success: false, message: e?.message || 'Erro' });

// ===== helpers =====
const toMonthKey = (v) => {
    const m = String(v || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) throw new Error('month inválido (YYYY-MM)');
    return m;
};

const weekToInt = (w) => {
    if (typeof w === 'number') return w;
    const s = String(w || '').toUpperCase().trim(); // "S1..S4"
    const m = s.match(/^S([1-4])$/);
    return m ? Number(m[1]) : 2;
};

const intToWeek = (n) => `S${Math.min(4, Math.max(1, Number(n || 2)))}`;

// =======================
// TEAM
// =======================
async function listTeam(req, res) {
    try {
        const id_user = req.user.id;
        const team = await repo.listTeam(id_user);
        return ok(res, team); // kanbanAdmin.js espera array direto
    } catch (e) {
        return bad(res, e);
    }
}

async function addTeamMember(req, res) {
    try {
        const id_user = req.user.id;
        const name = String(req.body?.name || '').trim();
        if (!name) throw new Error('Nome obrigatório');
        const member = await repo.addTeamMember(id_user, name);
        return ok(res, member);
    } catch (e) {
        return bad(res, e);
    }
}

async function deleteTeamMember(req, res) {
    try {
        const id_user = req.user.id;
        const id = req.params.id;
        await repo.removeTeamMember(id_user, id);
        return res.status(204).send();
    } catch (e) {
        return bad(res, e);
    }
}

// =======================
// CLIENTS (customer + profile extra)
// =======================
async function listClientsWithProfile(req, res) {
    try {
        const id_user = req.user.id;
        const clients = await repo.listClientsWithProfile(id_user);
        return ok(res, clients); // kanbanAdmin.js espera array direto
    } catch (e) {
        return bad(res, e);
    }
}

async function upsertClientProfileByCustomerId(req, res) {
    try {
        const id_user = req.user.id;
        const id_customer = Number(req.params.id_customer);
        if (!id_customer) throw new Error('id_customer inválido');

        const approval_name = String(req.body?.approval_name || '').trim() || null;

        // kanbanAdmin manda string, eu aceito string CSV ou array
        const approval_emails_raw = req.body?.approval_emails ?? [];
        const approval_emails = Array.isArray(approval_emails_raw)
            ? approval_emails_raw
            : String(approval_emails_raw || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

        const roles = req.body?.roles || {};

        const profile = await repo.upsertClientProfile(id_user, id_customer, {
            approval_name,
            approval_emails,
            roles,
        });

        return ok(res, profile);
    } catch (e) {
        return bad(res, e);
    }
}

async function deleteClientProfileByCustomerId(req, res) {
    try {
        const id_user = req.user.id;
        const id_customer = Number(req.params.id_customer);
        if (!id_customer) throw new Error('id_customer inválido');
        await repo.deleteClientProfile(id_user, id_customer);
        return res.status(204).send();
    } catch (e) {
        return bad(res, e);
    }
}

// =======================
// CARDS
// =======================
async function listCards(req, res) {
    try {
        const id_user = req.user.id;
        const month = req.query?.month ? toMonthKey(req.query.month) : null;

        const cards = month
            ? await repo.listCardsByMonth(id_user, month)
            : await repo.listCardsAll(id_user);

        // front (kanbanBoard.js) espera array direto
        // map mínimo pro formato do front (sem quebrar)
        const out = (cards || []).map(c => ({
            id: c.id,
            title: c.title,
            client_name: c.client_name || c.customer_name || c.name || null,
            status: c.status,
            week: typeof c.week === 'number' ? intToWeek(c.week) : (c.week || 'S2'),
            due_date: c.due_date,
            desc: c.description ?? c.desc ?? null,
            briefing: c.briefing ?? null,
            copy_text: c.copy_text ?? null,
            tags: c.tags || [],
            roles: c.roles || {},
            owners: c.owners || {
                briefing: c.owner_briefing_name || "",
                design: c.owner_design_name || "",
                text: c.owner_text_name || "",
                review: c.owner_review_name || "",
                schedule: c.owner_schedule_name || "",
            },
            approval_name: c.approval_name || "",
            feedback_count: Number(c.feedback_count || 0),
            published_at: c.published_at || null,
            assets: c.assets || [],
            role_runs: c.role_runs || [],
            client_comments: c.client_comments || []
        }));

        return ok(res, out);
    } catch (e) {
        return bad(res, e);
    }
}

async function createCard(req, res) {
    try {
        const id_user = req.user.id;

        const payload = req.body || {};
        const card = await repo.createCardNormalized(id_user, payload);
        return ok(res, card);
    } catch (e) {
        return bad(res, e);
    }
}

async function updateCard(req, res) {
    try {
        const id_user = req.user.id;
        const id = req.params.id;
        const payload = req.body || {};

        const card = await repo.updateCardNormalized(id_user, id, payload);
        return ok(res, card);
    } catch (e) {
        return bad(res, e);
    }
}

async function deleteCard(req, res) {
    try {
        const id_user = req.user.id;
        const id = req.params.id;
        await repo.deleteCard(id_user, id);
        return res.status(204).send();
    } catch (e) {
        return bad(res, e);
    }
}

// action-based (kanbanBoard.js)
async function transitionCard(req, res) {
    try {
        const id_user = req.user.id;
        const id = req.params.id;
        const { action } = req.body || {};

        const result = await repo.transitionCard(id_user, id, req.body || {});
        return ok(res, result || { success: true });
    } catch (e) {
        return bad(res, e);
    }
}

// assets (stub agora: só retorna ok; você implementa S3 na próxima task)
async function uploadCardAssets(req, res) {
    try {
        const id_user = req.user.id;
        const id = req.params.id;

        // req.files existe (multer)
        const files = req.files || [];
        await repo.saveCardAssetsPlaceholder(id_user, id, files);

        return ok(res, { success: true });
    } catch (e) {
        return bad(res, e);
    }
}

// =======================
// GOALS (mês)
// =======================
async function getGoalsByMonth(req, res) {
    try {
        const id_user = req.user.id;
        const month = toMonthKey(req.query.month);

        const data = await repo.getGoalsByMonthNormalized(id_user, month);
        return ok(res, data); // kanbanBoard.js espera objeto com .clients
    } catch (e) {
        return bad(res, e);
    }
}

async function upsertGoalsByMonth(req, res) {
    try {
        const id_user = req.user.id;
        const month = toMonthKey(req.query.month);

        // kanbanBoard.js envia { clients: [...] }
        const clients = Array.isArray(req.body?.clients) ? req.body.clients : [];
        await repo.upsertGoalsByMonthNormalized(id_user, month, clients);

        return ok(res, { success: true });
    } catch (e) {
        return bad(res, e);
    }
}

// =======================
// EXTERNAL (cliente aprovador)
// =======================
async function externalListCards(req, res) {
    try {
        const token = String(req.query?.token || '').trim();
        const data = await repo.listExternalCards(token);
        return ok(res, data);
    } catch (e) {
        return bad(res, e);
    }
}

async function externalGetCard(req, res) {
    try {
        const token = String(req.query?.token || '').trim();
        const id = req.params.id;
        const data = await repo.externalGetCard(token, id);
        return ok(res, data);
    } catch (e) {
        return bad(res, e);
    }
}

async function externalApproveCard(req, res) {
    try {
        const token = String(req.body?.token || '').trim();
        const id = req.params.id;
        const data = await repo.externalApprove(token, id);
        return ok(res, data);
    } catch (e) {
        return bad(res, e);
    }
}

async function externalRequestChange(req, res) {
    try {
        const token = String(req.body?.token || '').trim();
        const id = req.params.id;
        const targets = Array.isArray(req.body?.targets) ? req.body.targets : [];
        const comment = String(req.body?.comment || '').trim() || null;
        const author = String(req.body?.author || '').trim() || null;

        const data = await repo.externalRequestChanges(token, id, { targets, comment, author });
        return ok(res, data);
    } catch (e) {
        return bad(res, e);
    }
}

async function externalAddComment(req, res) {
    try {
        const token = String(req.body?.token || '').trim();
        const id = req.params.id;
        const text = String(req.body?.text || '').trim();
        const target = String(req.body?.target || '').trim() || null;
        const author = String(req.body?.author || '').trim() || null;

        const data = await repo.externalAddComment(token, id, { text, target, author });
        return ok(res, data);
    } catch (e) {
        return bad(res, e);
    }
}

module.exports = {
    // TEAM
    listTeam,
    addTeamMember,
    deleteTeamMember,

    // CLIENTS
    listClientsWithProfile,
    upsertClientProfileByCustomerId,
    deleteClientProfileByCustomerId,

    // CARDS
    listCards,
    createCard,
    updateCard,
    deleteCard,
    transitionCard,
    uploadCardAssets,

    // GOALS
    getGoalsByMonth,
    upsertGoalsByMonth,

    // EXTERNAL
    externalListCards,
    externalGetCard,
    externalApproveCard,
    externalRequestChange,
    externalAddComment,
};
