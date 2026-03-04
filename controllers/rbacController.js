// controllers/rbacController.js

const { pool } = require('../config/db');

// Helper: garante que a role pertence à account do usuário
async function getRoleInAccount(id_role, id_account) {
  const r = await pool.query(
    `SELECT id_role, id_account, name, is_system
     FROM roles
     WHERE id_role = $1 AND id_account = $2
     LIMIT 1`,
    [id_role, id_account]
  );
  return r.rows[0] || null;
}

exports.getMeRbac = async (req, res) => {
  // req.user.permissions já é preenchido pelo ensurePermissions (middleware)
  return res.json({
    success: true,
    data: {
      id_user: req.user.id,
      email: req.user.email,
      id_account: req.user.id_account,
      id_team_member: req.user.id_team_member,
      role: req.user.role,
      permissions: req.user.permissions || []
    }
  });
};

exports.listPermissions = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_permission, code, description, group_name
       FROM permissions
       ORDER BY group_name, code`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('listPermissions error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar permissões.' });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_role, name, is_system, created_at
       FROM roles
       WHERE id_account = $1
       ORDER BY is_system DESC, name ASC`,
      [req.user.id_account]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('listRoles error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar roles.' });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const id_role = Number(req.params.id_role);
    if (!Number.isFinite(id_role)) {
      return res.status(400).json({ success: false, message: 'id_role inválido.' });
    }

    const role = await getRoleInAccount(id_role, req.user.id_account);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role não encontrada.' });
    }

    const perms = await pool.query(
      `SELECT p.id_permission, p.code, p.description, p.group_name
       FROM role_permissions rp
       JOIN permissions p ON p.id_permission = rp.id_permission
       WHERE rp.id_role = $1
       ORDER BY p.group_name, p.code`,
      [id_role]
    );

    return res.json({
      success: true,
      data: {
        role: { id_role: role.id_role, name: role.name, is_system: role.is_system },
        permissions: perms.rows
      }
    });
  } catch (err) {
    console.error('getRolePermissions error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar permissões da role.' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'name é obrigatório.' });
    }

    const created = await pool.query(
      `INSERT INTO roles (id_account, name, is_system)
       VALUES ($1, $2, false)
       RETURNING id_role, name, is_system, created_at`,
      [req.user.id_account, name]
    );

    return res.status(201).json({ success: true, data: created.rows[0] });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Já existe uma role com esse nome nesta conta.' });
    }
    console.error('createRole error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao criar role.' });
  }
};

exports.renameRole = async (req, res) => {
  try {
    const id_role = Number(req.params.id_role);
    const name = String(req.body?.name || '').trim();
    if (!Number.isFinite(id_role)) {
      return res.status(400).json({ success: false, message: 'id_role inválido.' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'name é obrigatório.' });
    }

    const role = await getRoleInAccount(id_role, req.user.id_account);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role não encontrada.' });
    }
    if (role.is_system) {
      return res.status(400).json({ success: false, message: 'Não é permitido renomear roles do sistema.' });
    }

    const updated = await pool.query(
      `UPDATE roles
       SET name = $1
       WHERE id_role = $2 AND id_account = $3
       RETURNING id_role, name, is_system, created_at`,
      [name, id_role, req.user.id_account]
    );

    return res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Já existe uma role com esse nome nesta conta.' });
    }
    console.error('renameRole error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao renomear role.' });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const id_role = Number(req.params.id_role);
    if (!Number.isFinite(id_role)) {
      return res.status(400).json({ success: false, message: 'id_role inválido.' });
    }

    const role = await getRoleInAccount(id_role, req.user.id_account);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role não encontrada.' });
    }
    if (role.is_system) {
      return res.status(400).json({ success: false, message: 'Não é permitido deletar roles do sistema.' });
    }

    const inUse = await pool.query(
      `SELECT 1
       FROM member_roles
       WHERE id_role = $1
       LIMIT 1`,
      [id_role]
    );

    if (inUse.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Role em uso por membros. Remova a role dos membros antes de deletar.'
      });
    }

    await pool.query(
      `DELETE FROM roles
       WHERE id_role = $1 AND id_account = $2`,
      [id_role, req.user.id_account]
    );

    return res.json({ success: true, message: 'Role deletada com sucesso.' });
  } catch (err) {
    console.error('deleteRole error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao deletar role.' });
  }
};

exports.replaceRolePermissions = async (req, res) => {
  const client = await pool.connect();
  try {
    const id_role = Number(req.params.id_role);
    if (!Number.isFinite(id_role)) {
      return res.status(400).json({ success: false, message: 'id_role inválido.' });
    }

    const codes = Array.isArray(req.body?.permission_codes) ? req.body.permission_codes : null;
    if (!codes) {
      return res.status(400).json({ success: false, message: 'permission_codes deve ser um array.' });
    }

    const role = await getRoleInAccount(id_role, req.user.id_account);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role não encontrada.' });
    }
    if (role.is_system) {
      return res.status(400).json({ success: false, message: 'Não é permitido alterar permissões de roles do sistema.' });
    }

    const normalized = [...new Set(codes.map(c => String(c).trim()).filter(Boolean))];

    const permRows = await pool.query(
      `SELECT id_permission, code
       FROM permissions
       WHERE lower(code) = ANY($1::text[])`,
      [normalized.map(c => c.toLowerCase())]
    );

    if (permRows.rows.length !== normalized.length) {
      const found = new Set(permRows.rows.map(r => r.code.toLowerCase()));
      const missing = normalized.filter(c => !found.has(c.toLowerCase()));
      return res.status(400).json({
        success: false,
        message: 'permission_codes contém códigos inválidos.',
        missing
      });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE id_role = $1', [id_role]);

    for (const p of permRows.rows) {
      await client.query(
        'INSERT INTO role_permissions (id_role, id_permission) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id_role, p.id_permission]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Permissões atualizadas.',
      data: { id_role, permission_codes: normalized }
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('replaceRolePermissions error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar permissões da role.' });
  } finally {
    client.release();
  }
};
