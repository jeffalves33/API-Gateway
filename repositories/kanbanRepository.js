// Arquivo: repositories/kanbanRepository.js
const { pool } = require('../config/db');

const monthToDate = (monthKey) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('month inválido (use YYYY-MM)');
    return `${monthKey}-01`;
};
const monthKeyFromDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
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
        profile_id: r.client_profile_id || null,
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
    const q = `
    SELECT
      k.*,
      c.name AS client_name
    FROM kanban.card k
    JOIN kanban.client_profile cp ON cp.id = k.client_profile_id
    JOIN public.customer c ON c.id_customer = cp.id_customer AND c.id_user = cp.id_user
    WHERE k.id_user = $1
    ORDER BY k.created_at DESC
  `;
    const { rows } = await pool.query(q, [id_user]);
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
            k.owner_review_name,
            k.owner_schedule_name,
            k.owner_schedule_name,
            k.approved_at,
            k.scheduled_at,
            k.published_at,
            k.created_at,
            k.updated_at,
            c.name AS client_name, 
            (
                SELECT COALESCE(MAX(a.name), '')
                FROM kanban.client_approver a
                WHERE a.client_profile_id = k.client_profile_id
            ) AS approval_name
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
            review: k.owner_review_name || "",
            schedule: k.owner_schedule_name || "",
        },

        approval_name: k.approval_name || "",

        approved_at: k.approved_at,
        scheduled_at: k.scheduled_at,
        published_at: k.published_at,

        roles: rolesByCard.get(k.id) || {},
        role_runs: runsByCard.get(k.id) || [],

        created_at: k.created_at,
        updated_at: k.updated_at,
    }));
}

// front manda client_name, week=S1..S4, desc, briefing (opcional), copy_text (opcional)
async function createCardNormalized(id_user, payload) {
    const client_name = String(payload?.client_name || "").trim();
    const title = String(payload?.title || "").trim();
    if (!client_name) throw new Error("client_name obrigatório");
    if (!title) throw new Error("title obrigatório");

    const week = String(payload?.week || "S2");
    const due_date = payload?.due_date || null;

    const briefing = String(payload?.briefing || "").trim() || null;
    const description = String(payload?.desc || "").trim() || null;
    const tags = Array.isArray(payload?.tags) ? payload.tags : [];

    const estimates = payload?.estimates || {};
    const estDesign = Number(estimates.design || 0);
    const estText = Number(estimates.text || 0);
    const estSchedule = Number(estimates.schedule || 0);

    // >>> só pode criar card para cliente com config extra (client_profile existe)
    const profileQ = `
    SELECT cp.id,
           cp.role_briefing_name,
           cp.role_design_name,
           cp.role_text_name,
           cp.role_review_name,
           cp.role_schedule_name
    FROM kanban.client_profile cp
    JOIN public.customer c
      ON c.id_customer = cp.id_customer
     AND c.id_user = cp.id_user
    WHERE cp.id_user = $1
      AND lower(c.name) = lower($2)
    LIMIT 1
  `;
    const prof = await pool.query(profileQ, [id_user, client_name]);
    if (!prof.rows.length) throw new Error("Cliente sem configuração extra (aba Clientes).");

    const client_profile_id = prof.rows[0].id;
    const owner_briefing_name = prof.rows[0].role_briefing_name || null;
    const owner_design_name = prof.rows[0].role_design_name || null;
    const owner_text_name = prof.rows[0].role_text_name || null;
    const owner_review_name = prof.rows[0].role_review_name || null;
    const owner_schedule_name = prof.rows[0].role_schedule_name || null;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const insQ = `
            INSERT INTO kanban.card (
                id_user, client_profile_id,
                title, week, status,
                due_date, tags,
                briefing, description, copy_text,
                feedback_count, change_targets,
                owner_briefing_name, owner_design_name, owner_text_name,
                owner_review_name, owner_schedule_name
            )
            VALUES ($1,$2,$3,$4,'produce',$5::date,$6,$7,$8,NULL,0,'{}',$9,$10,$11,$12,$13)
            RETURNING id
        `;
        const ins = await client.query(insQ, [
            id_user,
            client_profile_id,
            title,
            week,
            due_date,
            tags,
            briefing,
            description,
            owner_briefing_name,
            owner_design_name,
            owner_text_name,
            owner_review_name,
            owner_schedule_name
        ]);

        const card_id = ins.rows[0].id;

        // cria roles do card (design/text/review/schedule)
        const roleIns = `
            INSERT INTO kanban.card_role (card_id, role, member_name, estimate_hours, active)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (card_id, role) DO NOTHING
        `;

        await client.query(roleIns, [card_id, "briefing", owner_briefing_name, 0, true]);
        await client.query(roleIns, [card_id, "text", owner_text_name, estText, false]);
        await client.query(roleIns, [card_id, "design", owner_design_name, estDesign, false]);
        await client.query(roleIns, [card_id, "review", owner_review_name, 0, false]);
        await client.query(roleIns, [card_id, "schedule", owner_schedule_name, estSchedule, false]);

        await client.query("COMMIT");

        // não dá pra garantir que monthKeyFromDate exista no arquivo, então buscamos direto por id:
        const one = await getCardByIdExpanded(id_user, card_id);
        return one;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

async function updateCardNormalized(id_user, id, payload) {
    // resolve client_profile_id via client_name (se vier)
    const client_name = String(payload.client_name || "").trim();
    let client_profile_id = null;

    if (client_name) {
        const prof = await pool.query(
            `
      SELECT cp.id
      FROM kanban.client_profile cp
      JOIN public.customer c
        ON c.id_customer = cp.id_customer AND c.id_user = cp.id_user
      WHERE cp.id_user = $1
        AND lower(c.name) = lower($2)
      LIMIT 1
      `,
            [id_user, client_name]
        );
        if (!prof.rows.length) throw new Error("Cliente inválido / sem configuração extra.");
        client_profile_id = prof.rows[0].id;
    }

    // normaliza week (precisa ser S1..S4)
    const weekRaw = String(payload.week || "").toUpperCase().trim();
    const week = /^S[1-4]$/.test(weekRaw) ? weekRaw : null;

    const { rows } = await pool.query(
        `
    UPDATE kanban.card
    SET
      client_profile_id = COALESCE($3, client_profile_id),
      title            = COALESCE($4, title),
      description      = $5,
      week             = COALESCE($6, week),
      due_date         = $7::date,
      tags             = COALESCE($8, tags),
      updated_at       = now()
    WHERE id_user=$1 AND id=$2
    RETURNING *
    `,
        [
            id_user,
            id,
            client_profile_id,
            payload.title || null,
            payload.desc ?? payload.description ?? null,
            week,
            payload.due_date || null,
            payload.tags || [],
        ]
    );

    if (!rows.length) throw new Error("Card não encontrado");
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
async function transitionCard(id_user, card_id, body) {
    const action = String(body?.action || "").trim();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // trava card e pega status atual
        const cardRes = await client.query(
            `SELECT id, status FROM kanban.card WHERE id_user=$1 AND id=$2 FOR UPDATE`,
            [id_user, card_id]
        );
        if (!cardRes.rows.length) throw new Error("Card não encontrado");
        const curStatus = cardRes.rows[0].status;

        const setStatus = async (status, extraSetSql = "", extraParams = []) => {
            await client.query(
                `
                    UPDATE kanban.card
                    SET status = $3,
                        updated_at = now()
                        ${extraSetSql}
                    WHERE id_user = $1 AND id = $2
                `,
                [id_user, card_id, status, ...extraParams]
            );
        };

        const setRoleActive = async (role, active) => {
            await client.query(
                `UPDATE kanban.card_role SET active=$3 WHERE card_id=$1 AND role=$2`,
                [card_id, role, active]
            );
        };

        const closeOpenRuns = async () => {
            await client.query(
                `UPDATE kanban.card_role_run
                SET ended_at = now()
                WHERE card_id=$1 AND ended_at IS NULL`,
                [card_id]
            );
        };

        const startRun = async (role, status) => {
            const r = await client.query(
                `SELECT member_name FROM kanban.card_role WHERE card_id=$1 AND role=$2 LIMIT 1`,
                [card_id, role]
            );
            const member_name = r.rows[0]?.member_name || null;

            await client.query(
                `INSERT INTO kanban.card_role_run (card_id, role, status, member_name, started_at, ended_at)
         VALUES ($1,$2,$3,$4,now(),NULL)`,
                [card_id, role, status, member_name]
            );
        };

        // ======= AÇÕES =======

        if (action === "start") {
            // produce -> doing (ativa texto primeiro)
            await closeOpenRuns();
            await setStatus("doing");
            await setRoleActive("briefing", false);
            await setRoleActive("text", true);
            await setRoleActive("design", false);
            await startRun("text", "doing");
            await client.query("COMMIT");
            return { success: true };
        }

        if (action === "complete_role") {
            const role = String(body?.role || "").trim(); // briefing|text|design|review|schedule
            if (!role) throw new Error("role obrigatório");

            // fecha run atual
            await closeOpenRuns();

            // marca role done
            await client.query(
                `UPDATE kanban.card_role SET done_at=now(), active=false WHERE card_id=$1 AND role=$2`,
                [card_id, role]
            );

            if (role === "text") {
                // continua em doing, ativa design
                await setRoleActive("design", true);
                await startRun("design", "doing");
                await client.query("COMMIT");
                return { success: true };
            }

            if (role === "design") {
                // vai pra review (interna)
                await setStatus("review");
                await setRoleActive("review", true);
                await startRun("review", "review");
                await client.query("COMMIT");
                return { success: true };
            }

            if (role === "review") {
                // vai pra approval (cliente) -> sem run (responsável é do cliente)
                await setStatus("approval");
                await client.query("COMMIT");
                return { success: true };
            }

            if (role === "schedule") {
                // scheduled
                await setStatus("scheduled", ", scheduled_at = now()");
                await client.query("COMMIT");
                return { success: true };
            }

            await client.query("COMMIT");
            return { success: true };
        }

        if (action === "request_change") {
            const targets = Array.isArray(body?.targets) ? body.targets : [];

            await closeOpenRuns();

            // muda status + incrementa retrabalho + guarda targets (na MESMA transação)
            await client.query(
                `
                    UPDATE kanban.card
                    SET
                    status = 'changes',
                    feedback_count = COALESCE(feedback_count,0) + 1,
                    approved_at = NULL,
                    scheduled_at = NULL,
                    published_at = NULL,
                    change_targets = (
                        SELECT ARRAY(
                        SELECT DISTINCT x
                        FROM unnest(COALESCE(change_targets,'{}'::kanban.role_key[]) || $3::kanban.role_key[]) t(x)
                        )
                    ),
                    updated_at = now()
                    WHERE id_user = $1 AND id = $2
                `,
                [id_user, card_id, targets]
            );

            // reativa responsáveis conforme targets (se vier vazio, volta para texto por padrão)
            await setRoleActive("review", false);
            await setRoleActive("design", false);
            await setRoleActive("text", false);

            const wantsDesign = targets.includes("design");
            const wantsText = targets.includes("text");

            if (wantsDesign && !wantsText) {
                await setRoleActive("design", true);
                await startRun("design", "changes");
            } else {
                await setRoleActive("text", true);
                await startRun("text", "changes");
            }

            await client.query("COMMIT");
            return { success: true };
        }

        if (action === "approve") {
            // cliente aprovou -> approved (ativa schedule)
            await closeOpenRuns();
            await setStatus("approved", ", approved_at = now()");
            await setRoleActive("schedule", true);
            await startRun("schedule", "approved");
            await client.query("COMMIT");
            return { success: true };
        }

        if (action === "publish") {
            await closeOpenRuns();
            await setStatus("published", ", published_at = now()");
            await client.query("COMMIT");
            return { success: true };
        }

        throw new Error("action inválida");
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
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

async function getCardByIdExpanded(id_user, card_id) {
    const q = `
    SELECT
        k.id, k.title, k.week, k.status, k.due_date, k.tags,
        k.briefing, k.description, k.copy_text, k.feedback_count,
        k.owner_briefing_name, k.owner_design_name, k.owner_text_name,
        k.owner_review_name, k.owner_schedule_name,
        k.approved_at, k.scheduled_at, k.published_at,
        k.created_at, k.updated_at,
        (
            SELECT COALESCE(MAX(a.name), '')
            FROM kanban.client_approver a
            WHERE a.client_profile_id = k.client_profile_id
        ) AS approval_name,
        c.name AS client_name
    FROM kanban.card k
    JOIN kanban.client_profile cp ON cp.id = k.client_profile_id
    JOIN public.customer c ON c.id_customer = cp.id_customer AND c.id_user = cp.id_user
    WHERE k.id_user = $1 AND k.id = $2
    LIMIT 1
  `;
    const base = await pool.query(q, [id_user, card_id]);
    if (!base.rows.length) throw new Error("Card não encontrado");

    const rolesRes = await pool.query(
        `SELECT role, member_name, estimate_hours, active, done_at
        FROM kanban.card_role
        WHERE card_id = $1`,
        [card_id]
    );

    const runsRes = await pool.query(
        `SELECT role, status, member_name, started_at, ended_at
     FROM kanban.card_role_run WHERE card_id = $1 ORDER BY started_at ASC`,
        [card_id]
    );

    const roles = {};
    for (const r of rolesRes.rows) {
        roles[r.role] = {
            role: r.role,
            member_name: r.member_name,
            estimate_hours: Number(r.estimate_hours || 0),
            active: !!r.active,
            done_at: r.done_at,
        };
    }

    const k = base.rows[0];
    return {
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
            review: k.owner_review_name || "",
            schedule: k.owner_schedule_name || "",
        },
        approval_name: k.approval_name || "",
        approved_at: k.approved_at,
        scheduled_at: k.scheduled_at,
        published_at: k.published_at,
        roles,
        role_runs: runsRes.rows.map(rr => ({
            role: rr.role,
            status: rr.status,
            member_name: rr.member_name,
            started_at: rr.started_at,
            ended_at: rr.ended_at,
        })),
        created_at: k.created_at,
        updated_at: k.updated_at,
    };
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
