// Arquivo: repositories/goalsRepository.js
const { pool } = require('../config/db');

// Card 5: resolve account pelo id_user para escopar por tenant
async function getAccountIdByUserId(id_user) {
    const r = await pool.query('SELECT id_account FROM "user" WHERE id_user = $1 LIMIT 1', [Number(id_user)]);
    return r.rows[0]?.id_account || null;
}

function toJsonb(value) {
    // garante que vai pro Postgres como JSONB
    if (value === null || value === undefined) return JSON.stringify([]);
    if (typeof value === 'string') return value; // já veio string
    return JSON.stringify(value); // array/object
}

async function createGoal(payload) {
    const {
        id_user,
        id_customer,
        platform_name,
        tipo_meta,
        title,
        descricao,
        data_inicio,
        data_fim,
        kpis = [],
        status = 'ativo'
    } = payload;

    const result = await pool.query(
        `
    INSERT INTO goals
      (id_user, id_customer, platform_name, tipo_meta, title, descricao, data_inicio, data_fim, kpis, status)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
    RETURNING *
    `,
        [
            id_user,
            id_customer,
            platform_name,
            tipo_meta,
            title,
            descricao,
            data_inicio,
            data_fim,
            toJsonb(kpis),
            status
        ]
    );

    return result.rows[0];
}

async function listGoals({ id_user, id_customer = null, platform_name = null, status = null }) {
    const id_account = await getAccountIdByUserId(id_user);
    if (!id_account) return [];

    const params = [Number(id_account)];
    let where = `WHERE u.id_account = $1`;

    if (id_customer) {
        params.push(Number(id_customer));
        where += ` AND id_customer = $${params.length}`;
    }
    if (platform_name) {
        params.push(platform_name);
        where += ` AND platform_name = $${params.length}`;
    }
    if (status) {
        params.push(status);
        where += ` AND status = $${params.length}`;
    }

    const result = await pool.query(
        `
    SELECT g.*
    FROM goals g
    JOIN "user" u ON u.id_user = g.id_user
    ${where}
    ORDER BY g.created_at DESC
    `,
        params
    );

    return result.rows;
}

async function getGoalById({ id_user, id_goal }) {
    const id_account = await getAccountIdByUserId(id_user);
    if (!id_account) return null;

    const result = await pool.query(
        `
        SELECT g.*
        FROM goals g
        JOIN "user" u ON u.id_user = g.id_user
        WHERE u.id_account = $1 AND g.id_goal = $2
        `,
        [Number(id_account), Number(id_goal)]
    );
    return result.rows[0] || null;
}

async function updateGoal({ id_user, id_goal, patch }) {
    // patch: { title, descricao, data_inicio, data_fim, tipo_meta, kpis, status, platform_name, analysis_text, achieved, achieved_score, analysis_generated_at }
    const allowed = [
        'platform_name',
        'tipo_meta',
        'title',
        'descricao',
        'data_inicio',
        'data_fim',
        'kpis',
        'status',
        'analysis_text',
        'analysis_generated_at',
        'achieved',
        'achieved_score'
    ];

    const keys = Object.keys(patch).filter(k => allowed.includes(k));
    if (!keys.length) return await getGoalById({ id_user, id_goal });

    const id_account = await getAccountIdByUserId(id_user);
    if (!id_account) return null;

    const sets = [];
    const values = [Number(id_account), Number(id_goal)];
    let idx = values.length;

    for (const k of keys) {
        idx += 1;

        if (k === 'kpis') {
            sets.push(`${k} = $${idx}::jsonb`);
            values.push(toJsonb(patch[k]));
        } else {
            sets.push(`${k} = $${idx}`);
            values.push(patch[k]);
        }
    }

    sets.push(`updated_at = NOW()`);

    const result = await pool.query(
        `
    UPDATE goals
    SET ${sets.join(', ')}
    WHERE id_goal = $2
      AND id_user IN (SELECT id_user FROM "user" WHERE id_account = $1)
    RETURNING *
    `,
        values
    );

    return result.rows[0] || null;
}

async function deleteGoal({ id_user, id_goal }) {
    const id_account = await getAccountIdByUserId(id_user);
    if (!id_account) return null;

    const result = await pool.query(
        `
        DELETE FROM goals
        WHERE id_goal = $2
          AND id_user IN (SELECT id_user FROM "user" WHERE id_account = $1)
        RETURNING id_goal
        `,
        [Number(id_account), Number(id_goal)]
    );
    return result.rows[0] || null;
}

async function expireEndedGoals(id_user) {
    const id_account = await getAccountIdByUserId(id_user);
    if (!id_account) return [];

    // Expira metas ativas cujo data_fim já passou (CURRENT_DATE)
    // (não mexe em concluido/cancelado/expirado)
    const result = await pool.query(
        `
    UPDATE goals
    SET status = 'expirado', updated_at = NOW()
    WHERE id_user IN (SELECT id_user FROM "user" WHERE id_account = $1)
      AND status = 'ativo'
      AND data_fim < CURRENT_DATE
    RETURNING id_goal
    `,
        [Number(id_account)]
    );

    return result.rows; // lista de ids expirados (se precisar logar)
}

module.exports = {
    createGoal,
    listGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    expireEndedGoals
};
