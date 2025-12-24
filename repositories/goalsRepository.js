// Arquivo: repositories/goalsRepository.js
const { pool } = require('../config/db');

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
    const params = [id_user];
    let where = `WHERE id_user = $1`;

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
    SELECT *
    FROM goals
    ${where}
    ORDER BY created_at DESC
    `,
        params
    );

    return result.rows;
}

async function getGoalById({ id_user, id_goal }) {
    const result = await pool.query(
        `SELECT * FROM goals WHERE id_user = $1 AND id_goal = $2`,
        [id_user, Number(id_goal)]
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

    const sets = [];
    const values = [id_user, Number(id_goal)];
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
    WHERE id_user = $1 AND id_goal = $2
    RETURNING *
    `,
        values
    );

    return result.rows[0] || null;
}

async function deleteGoal({ id_user, id_goal }) {
    const result = await pool.query(
        `DELETE FROM goals WHERE id_user = $1 AND id_goal = $2 RETURNING id_goal`,
        [id_user, Number(id_goal)]
    );
    return result.rows[0] || null;
}

async function expireEndedGoals(id_user) {
    // Expira metas ativas cujo data_fim já passou (CURRENT_DATE)
    // (não mexe em concluido/cancelado/expirado)
    const result = await pool.query(
        `
    UPDATE goals
    SET status = 'expirado', updated_at = NOW()
    WHERE id_user = $1
      AND status = 'ativo'
      AND data_fim < CURRENT_DATE
    RETURNING id_goal
    `,
        [id_user]
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
