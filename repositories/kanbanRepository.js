// Arquivo: repositories/kanbanRepository.js
const { pool } = require('../config/db');

const monthToDate = (monthKey) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('month inválido (use YYYY-MM)');
    return `${monthKey}-01`;
};

// =======================
// TEAM
// =======================
async function listTeam(id_user) {
    const { rows } = await pool.query(
        `SELECT id, name, created_at
     FROM kanban.team_member
     WHERE id_user = $1
     ORDER BY lower(name) ASC`,
        [id_user]
    );
    return rows;
}

async function addTeamMember(id_user, name) {
    const exists = await pool.query(
        `SELECT 1 FROM kanban.team_member WHERE id_user=$1 AND lower(name)=lower($2) LIMIT 1`,
        [id_user, name]
    );
    if (exists.rows.length) throw new Error('Nome repetido');

    const { rows } = await pool.query(
        `INSERT INTO kanban.team_member (id_user, name)
     VALUES ($1,$2)
     RETURNING id, name, created_at`,
        [id_user, name]
    );
    return rows[0];
}

async function removeTeamMember(id_user, id) {
    const { rows } = await pool.query(
        `DELETE FROM kanban.team_member
     WHERE id_user=$1 AND id=$2
     RETURNING id`,
        [id_user, id]
    );
    if (!rows.length) throw new Error('Membro não encontrado');
    return true;
}

// =======================
// CLIENTS + PROFILE
// =======================
async function listClientsWithProfile(id_user) {
    const { rows } = await pool.query(
        `
    SELECT
      c.id_customer,
      c.name,

      cp.id AS client_profile_id,

      cp.role_briefing_name,
      cp.role_design_name,
      cp.role_text_name,
      cp.role_review_name,
      cp.role_schedule_name,

      -- pega um "nome" (primeiro) e concatena emails (CSV) para o front
      (
        SELECT COALESCE(MAX(a.name), '')
        FROM kanban.client_approver a
        WHERE a.client_profile_id = cp.id
      ) AS approval_name,

      (
        SELECT COALESCE(string_agg(a.email, ', ' ORDER BY lower(a.email)), '')
        FROM kanban.client_approver a
        WHERE a.client_profile_id = cp.id
      ) AS approval_emails

    FROM customer c
    LEFT JOIN kanban.client_profile cp
      ON cp.id_customer = c.id_customer
     AND cp.id_user = c.id_user
    WHERE c.id_user = $1
    ORDER BY lower(c.name) ASC
    `,
        [id_user]
    );

    return rows.map(r => ({
        id: r.id_customer,
        name: r.name,

        approval_name: r.approval_name || "",
        approval_emails: r.approval_emails || "",

        // o front espera roles[role] = value do <select> (string)
        // aqui vamos persistir o "value" dentro dos campos role_*_name (text)
        roles: {
            briefing: r.role_briefing_name || "",
            design: r.role_design_name || "",
            text: r.role_text_name || "",
            review: r.role_review_name || "",
            schedule: r.role_schedule_name || "",
        },

        external_token: null, // sua migration não tem isso
    }));
}

async function upsertClientProfile(id_user, customer_id, payload) {
    const roles = payload?.roles || {};
    const approval_name = payload?.approval_name ?? null;

    // kanbanAdmin manda string CSV em approval_emails
    const raw = payload?.approval_emails ?? "";
    const emails = Array.isArray(raw)
        ? raw
        : String(raw || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1) garante client_profile (1:1 com customer)
        const up = await client.query(
            `
      INSERT INTO kanban.client_profile (
        id_user, id_customer,
        role_briefing_name, role_design_name, role_text_name, role_review_name, role_schedule_name
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id_customer)
      DO UPDATE SET
        id_user = EXCLUDED.id_user,
        role_briefing_name = EXCLUDED.role_briefing_name,
        role_design_name   = EXCLUDED.role_design_name,
        role_text_name     = EXCLUDED.role_text_name,
        role_review_name   = EXCLUDED.role_review_name,
        role_schedule_name = EXCLUDED.role_schedule_name,
        updated_at = now()
      RETURNING id, id_user, id_customer
      `,
            [
                id_user,
                customer_id,
                roles.briefing || "",
                roles.design || "",
                roles.text || "",
                roles.review || "",
                roles.schedule || "",
            ]
        );

        const client_profile_id = up.rows[0].id;

        // 2) sincroniza aprovadores (simples: apaga tudo e insere de novo)
        await client.query(
            `DELETE FROM kanban.client_approver WHERE client_profile_id = $1`,
            [client_profile_id]
        );

        for (const email of emails) {
            await client.query(
                `
        INSERT INTO kanban.client_approver (client_profile_id, name, email)
        VALUES ($1,$2,$3)
        ON CONFLICT (client_profile_id, lower(email)) DO NOTHING
        `,
                [client_profile_id, approval_name, email]
            );
        }

        await client.query("COMMIT");

        // retorno mínimo (o front não depende do retorno; ele dá loadAll())
        return { client_profile_id, customer_id };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

async function deleteClientProfile(id_user, customer_id) {
    const { rows } = await pool.query(
        `
    DELETE FROM kanban.client_profile
    WHERE id_user = $1 AND id_customer = $2
    RETURNING id
    `,
        [id_user, customer_id]
    );
    if (!rows.length) throw new Error("Profile não encontrado");
    return true;
}

async function getClientProfileByToken() {
    throw new Error("external_token não existe na migration atual (client_profile)");
}

// =======================
// GOALS (mês)  — normalizado pro front
// =======================

// pega customer_id pelo nome (case-insensitive) do cliente do usuário
async function getCustomerIdByName(id_user, client_name) {
    const q = `
    SELECT id_customer
    FROM public.customer
    WHERE id_user = $1 AND lower(name) = lower($2)
    LIMIT 1
  `;
    const { rows } = await pool.query(q, [id_user, client_name]);
    if (!rows.length) throw new Error(`Cliente não encontrado: ${client_name}`);
    return rows[0].id_customer;
}

// garante client_profile (1:1 com customer) e devolve client_profile_id
async function getOrCreateClientProfileId(client, id_user, id_customer) {
    const q = `
    INSERT INTO kanban.client_profile (id_user, id_customer)
    VALUES ($1, $2)
    ON CONFLICT (id_customer)
    DO UPDATE SET updated_at = now()
    RETURNING id
  `;
    const { rows } = await client.query(q, [id_user, id_customer]);
    return rows[0].id;
}

// Controller chama isso:
async function getGoalsByMonthNormalized(id_user, monthKey) {
    const monthStart = monthToDate(monthKey);

    // lista TODOS customers do usuário e faz left join nas metas do mês
    const q = `
    SELECT
      c.id_customer,
      c.name AS client_name,
      COALESCE(g.posts_per_month, 0)      AS posts_per_month,
      COALESCE(g.ontime_pct_goal, 0)      AS ontime_pct,
      COALESCE(g.quality_goal, 0)         AS quality_goal,
      COALESCE(g.max_rework, 0)           AS max_rework
    FROM public.customer c
    LEFT JOIN kanban.client_profile cp
      ON cp.id_customer = c.id_customer AND cp.id_user = $1
    LEFT JOIN kanban.client_goal_month g
      ON g.client_profile_id = cp.id
     AND g.id_user = $1
     AND g.month = $2::date
    WHERE c.id_user = $1
    ORDER BY lower(c.name) ASC
  `;

    const { rows } = await pool.query(q, [id_user, monthStart]);

    return {
        month: monthKey,
        clients: rows.map(r => ({
            client_name: r.client_name,
            posts_per_month: Number(r.posts_per_month || 0),
            ontime_pct: Number(r.ontime_pct || 0),
            quality_goal: Number(r.quality_goal || 0),
            max_rework: Number(r.max_rework || 0),
        }))
    };
}

// Controller chama isso:
async function upsertGoalsByMonthNormalized(id_user, monthKey, clientsArray) {
    const monthStart = monthToDate(monthKey);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const upsertQ = `
      INSERT INTO kanban.client_goal_month (
        id_user, client_profile_id, month,
        posts_per_month, ontime_pct_goal, quality_goal, max_rework
      )
      VALUES ($1, $2, $3::date, $4, $5, $6, $7)
      ON CONFLICT (id_user, client_profile_id, month)
      DO UPDATE SET
        posts_per_month   = EXCLUDED.posts_per_month,
        ontime_pct_goal   = EXCLUDED.ontime_pct_goal,
        quality_goal      = EXCLUDED.quality_goal,
        max_rework        = EXCLUDED.max_rework,
        updated_at        = now()
    `;

        for (const g of clientsArray || []) {
            const client_name = String(g.client_name || '').trim();
            if (!client_name) continue;

            const id_customer = await getCustomerIdByName(id_user, client_name);
            const client_profile_id = await getOrCreateClientProfileId(client, id_user, id_customer);

            await client.query(upsertQ, [
                id_user,
                client_profile_id,
                monthStart,
                Number(g.posts_per_month || 0),
                Number(g.ontime_pct || 0),
                Number(g.quality_goal || 0),
                Number(g.max_rework || 0),
            ]);
        }

        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// =======================
// CARDS
// =======================
async function listCardsAll(id_user) {
    const { rows } = await pool.query(
        `SELECT
        k.*,
        c.name as client_name
     FROM kanban.card k
     JOIN customer c ON c.id_customer = k.customer_id AND c.id_user = k.id_user
     WHERE k.id_user=$1
     ORDER BY k.created_at DESC`,
        [id_user]
    );
    return rows;
}

async function listCardsByMonth(id_user, monthKey) {
    const monthStart = monthToDate(monthKey);

    // pega cards do mês pelo due_date
    const q = `
    SELECT
      k.id,
      k.title,
      k.week,
      k.status,
      k.due_date,
      k.tags,
      k.briefing,
      k.description,
      k.copy_text,
      k.feedback_count,
      k.owner_briefing_name,
      k.owner_design_name,
      k.owner_text_name,
      k.created_at,
      k.updated_at,

      c.name AS client_name
    FROM kanban.card k
    JOIN kanban.client_profile cp ON cp.id = k.client_profile_id
    JOIN public.customer c ON c.id_customer = cp.id_customer AND c.id_user = cp.id_user
    WHERE k.id_user = $1
      AND date_trunc('month', k.due_date)::date = $2::date
    ORDER BY k.created_at DESC
  `;
    const { rows } = await pool.query(q, [id_user, monthStart]);

    if (!rows.length) return [];

    const cardIds = rows.map(r => r.id);

    // roles
    const rolesQ = `
    SELECT card_id, role, member_name, estimate_hours, active, done_at
    FROM kanban.card_role
    WHERE card_id = ANY($1::uuid[])
  `;
    const rolesRes = await pool.query(rolesQ, [cardIds]);

    // runs
    const runsQ = `
    SELECT card_id, role, status, member_name, started_at, ended_at
    FROM kanban.card_role_run
    WHERE card_id = ANY($1::uuid[])
    ORDER BY started_at ASC
  `;
    const runsRes = await pool.query(runsQ, [cardIds]);

    // index roles por card
    const rolesByCard = new Map();
    for (const r of rolesRes.rows) {
        if (!rolesByCard.has(r.card_id)) rolesByCard.set(r.card_id, {});
        rolesByCard.get(r.card_id)[r.role] = {
            role: r.role,
            member_name: r.member_name,
            estimate_hours: Number(r.estimate_hours || 0),
            active: !!r.active,
            done_at: r.done_at,
        };
    }

    // index runs por card
    const runsByCard = new Map();
    for (const rr of runsRes.rows) {
        if (!runsByCard.has(rr.card_id)) runsByCard.set(rr.card_id, []);
        runsByCard.get(rr.card_id).push({
            role: rr.role,
            status: rr.status,
            member_name: rr.member_name,
            started_at: rr.started_at,
            ended_at: rr.ended_at,
        });
    }

    return rows.map((k) => ({
        id: k.id,
        client_name: k.client_name,

        title: k.title,
        week: k.week,
        status: k.status,
        due_date: k.due_date,
        tags: k.tags || [],

        briefing: k.briefing || "",
        desc: k.description || "",
        copy_text: k.copy_text || "",

        feedback_count: Number(k.feedback_count || 0),

        owners: {
            briefing: k.owner_briefing_name || "",
            design: k.owner_design_name || "",
            text: k.owner_text_name || "",
        },

        roles: rolesByCard.get(k.id) || {},
        role_runs: runsByCard.get(k.id) || [],

        created_at: k.created_at,
        updated_at: k.updated_at,
    }));
}

// front manda client_name, week=S1..S4, desc, briefing (opcional), copy_text (opcional)
async function createCardNormalized(id_user, payload) {
    const client_name = String(payload.client_name || '').trim();
    if (!client_name) throw new Error('client_name obrigatório');

    const c = await pool.query(
        `SELECT id_customer FROM customer WHERE id_user=$1 AND name=$2 LIMIT 1`,
        [id_user, client_name]
    );
    if (!c.rows.length) throw new Error('Cliente inválido');
    const customer_id = c.rows[0].id_customer;

    const { rows } = await pool.query(
        `INSERT INTO kanban.card (
        id_user, customer_id,
        title, description,
        status, week, due_date,
        tags, roles, checklist,
        rework_count, quality_score
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12)
     RETURNING *`,
        [
            id_user,
            customer_id,
            payload.title,
            payload.desc || payload.description || null,
            'produce',
            Number(payload.week || 2),
            payload.due_date || null,
            payload.tags || [],
            payload.roles || {},
            payload.checklist || null,
            Number(payload.feedback_count || 0),
            Number(payload.quality_score || 0),
        ]
    );

    return rows[0];
}

async function updateCardNormalized(id_user, id, payload) {
    // resolve customer_id via client_name
    const client_name = String(payload.client_name || '').trim();
    let customer_id = null;

    if (client_name) {
        const c = await pool.query(
            `SELECT id_customer FROM customer WHERE id_user=$1 AND name=$2 LIMIT 1`,
            [id_user, client_name]
        );
        if (!c.rows.length) throw new Error('Cliente inválido');
        customer_id = c.rows[0].id_customer;
    }

    const { rows } = await pool.query(
        `UPDATE kanban.card
     SET
       customer_id = COALESCE($3, customer_id),
       title = COALESCE($4, title),
       description = $5,
       week = COALESCE($6, week),
       due_date = $7::date,
       tags = COALESCE($8, tags),
       updated_at = now()
     WHERE id_user=$1 AND id=$2
     RETURNING *`,
        [
            id_user,
            id,
            customer_id,
            payload.title || null,
            payload.desc ?? payload.description ?? null,
            Number(payload.week || 0) || null,
            payload.due_date || null,
            payload.tags || [],
        ]
    );

    if (!rows.length) throw new Error('Card não encontrado');
    return rows[0];
}

async function deleteCard(id_user, id) {
    const { rows } = await pool.query(
        `DELETE FROM kanban.card WHERE id_user=$1 AND id=$2 RETURNING id`,
        [id_user, id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    return true;
}

// =======================
// TRANSITIONS (mínimo pro front não travar)
// =======================
async function transitionCard(id_user, id, body) {
    const action = String(body?.action || '').trim();

    // busca card
    const { rows } = await pool.query(
        `SELECT * FROM kanban.card WHERE id_user=$1 AND id=$2 LIMIT 1`,
        [id_user, id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    const card = rows[0];

    const roles = card.roles || {};

    const set = async (patch) => {
        const cols = [];
        const vals = [id_user, id];
        let i = 3;
        for (const [k, v] of Object.entries(patch)) {
            cols.push(`${k} = $${i++}`);
            vals.push(v);
        }
        await pool.query(
            `UPDATE kanban.card SET ${cols.join(', ')}, updated_at=now() WHERE id_user=$1 AND id=$2`,
            vals
        );
    };

    if (action === 'start') {
        await set({ status: 'doing' });
        return { success: true };
    }

    if (action === 'save_copy') {
        // schema atual talvez não tenha copy_text -> ignora sem quebrar
        return { success: true };
    }

    if (action === 'complete_role') {
        const role = String(body?.role || '').trim(); // design|text|review|schedule

        // marca done_at dentro do JSON roles
        if (!roles[role]) roles[role] = {};
        roles[role].done_at = new Date().toISOString();
        roles[role].active = false;

        // regra: se concluiu design+text -> vai pra review
        const designDone = !!roles?.design?.done_at;
        const textDone = !!roles?.text?.done_at;
        const reviewDone = !!roles?.review?.done_at;

        if ((role === 'design' || role === 'text') && designDone && textDone) {
            // ativa review
            if (!roles.review) roles.review = {};
            roles.review.active = true;
            await set({ status: 'review', roles });
            return { success: true };
        }

        if (role === 'review' && !reviewDone) {
            await set({ status: 'approval', roles });
            return { success: true };
        }

        if (role === 'schedule') {
            await set({ status: 'scheduled', roles });
            return { success: true };
        }

        await set({ roles });
        return { success: true };
    }

    if (action === 'request_change') {
        await set({ status: 'changes' });
        return { success: true };
    }

    if (action === 'approve') {
        await set({ status: 'approved' });
        return { success: true };
    }

    if (action === 'publish') {
        await set({ status: 'published' });
        return { success: true };
    }

    throw new Error('action inválida');
}

// =======================
// ASSETS (placeholder)
// =======================
async function saveCardAssetsPlaceholder(id_user, id, files) {
    // por enquanto: só valida o card existe e não quebra
    const { rows } = await pool.query(
        `SELECT id FROM kanban.card WHERE id_user=$1 AND id=$2 LIMIT 1`,
        [id_user, id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    return true;
}

// =======================
// EXTERNAL
// =======================
async function listExternalCards(external_token) {
    const profile = await getClientProfileByToken(external_token);

    const { rows } = await pool.query(
        `SELECT k.*, c.name as client_name
     FROM kanban.card k
     JOIN customer c ON c.id_customer = k.customer_id AND c.id_user = k.id_user
     WHERE k.id_user=$1
       AND k.customer_id=$2
       AND k.status IN ('approval','changes')
     ORDER BY k.due_date ASC NULLS LAST, k.created_at DESC`,
        [profile.id_user, profile.customer_id]
    );

    return { profile, cards: rows };
}

async function externalGetCard(external_token, card_id) {
    const profile = await getClientProfileByToken(external_token);

    const { rows } = await pool.query(
        `SELECT k.*, c.name as client_name
     FROM kanban.card k
     JOIN customer c ON c.id_customer = k.customer_id AND c.id_user = k.id_user
     WHERE k.id_user=$1 AND k.customer_id=$2 AND k.id=$3
     LIMIT 1`,
        [profile.id_user, profile.customer_id, card_id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    return { profile, card: rows[0] };
}

async function externalApprove(external_token, card_id) {
    const profile = await getClientProfileByToken(external_token);

    const { rows } = await pool.query(
        `UPDATE kanban.card
     SET status='approved', updated_at=now()
     WHERE id_user=$1 AND customer_id=$2 AND id=$3
     RETURNING *`,
        [profile.id_user, profile.customer_id, card_id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    return { profile, card: rows[0] };
}

async function externalRequestChanges(external_token, card_id) {
    const profile = await getClientProfileByToken(external_token);

    const { rows } = await pool.query(
        `UPDATE kanban.card
     SET status='changes', updated_at=now()
     WHERE id_user=$1 AND customer_id=$2 AND id=$3
     RETURNING *`,
        [profile.id_user, profile.customer_id, card_id]
    );
    if (!rows.length) throw new Error('Card não encontrado');
    return { profile, card: rows[0] };
}

async function externalAddComment(external_token, card_id) {
    const profile = await getClientProfileByToken(external_token);
    return { profile, ok: true, card_id };
}

module.exports = {
    // team
    listTeam, addTeamMember, removeTeamMember,

    // clients/profile
    listClientsWithProfile, upsertClientProfile, deleteClientProfile, getClientProfileByToken,

    // goals
    getGoalsByMonthNormalized, upsertGoalsByMonthNormalized,

    // cards
    listCardsAll, listCardsByMonth, createCardNormalized, updateCardNormalized, deleteCard, transitionCard, saveCardAssetsPlaceholder,

    // external
    listExternalCards, externalGetCard, externalApprove, externalRequestChanges, externalAddComment,
};
