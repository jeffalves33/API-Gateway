// Arquivo: middleware/rbacMiddleware.js
// Resolve permissões do membro e bloqueia acesso por permission.
const { pool } = require('../config/db');

function getJwtClearCookieOptions(req) {
  const origin = req.headers.origin;

  const crossSiteOrigins = [
    'https://front-end-r0ap.onrender.com'
  ];

  const isCrossSite = crossSiteOrigins.includes(origin);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: isCrossSite ? 'none' : 'lax'
  };
}

async function ensurePermissions(req, res) {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Não autenticado.' });
    return false;
  }

  // Admin = acesso total
  if (req.user.role === 'Admin') {
    req.user.permissions = ['*'];
    return true;
  }

  // Cache por request
  if (Array.isArray(req.user.permissions) && req.user.permissions.length > 0) {
    return true;
  }

  const { id_team_member, id_account, id } = req.user;
  if (!id_team_member || !id_account || !id) {
    res.clearCookie('jwt', getJwtClearCookieOptions(req));
    res.status(401).json({ success: false, message: 'Token inválido. Faça login novamente.' });
    return false;
  }

  try {
    const result = await pool.query(
      `
      SELECT p.code
      FROM team_members tm
      JOIN member_roles mr ON mr.id_team_member = tm.id_team_member
      JOIN roles r ON r.id_role = mr.id_role
      JOIN role_permissions rp ON rp.id_role = r.id_role
      JOIN permissions p ON p.id_permission = rp.id_permission
      WHERE tm.id_team_member = $1
        AND tm.id_account = $2
        AND tm.id_user = $3
        AND tm.status = 'active'
      `,
      [id_team_member, id_account, id]
    );

    req.user.permissions = result.rows.map(r => r.code);
    return true;
  } catch (err) {
    console.error('RBAC ensurePermissions error:', err);
    res.status(500).json({ success: false, message: 'Erro ao carregar permissões.' });
    return false;
  }
}

/**
 * Middleware para exigir uma permission específica (retorna JSON em caso de bloqueio).
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const ok = await ensurePermissions(req, res);
    if (!ok) return;

    if (req.user.role === 'Admin') return next();

    const perms = req.user.permissions || [];
    if (perms.includes(permissionCode) || perms.includes('*')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissão insuficiente.',
      required: permissionCode
    });
  };
}

/**
 * Middleware para páginas HTML (redireciona ao invés de JSON).
 */
function requirePagePermission(permissionCode, redirectTo = '/dashboardPage.html') {
  return async (req, res, next) => {
    const ok = await ensurePermissions(req, res);
    if (!ok) return;

    if (req.user.role === 'Admin') return next();

    const perms = req.user.permissions || [];
    if (perms.includes(permissionCode) || perms.includes('*')) {
      return next();
    }

    return res.redirect(redirectTo);
  };
}

module.exports = {
  ensurePermissions,
  requirePermission,
  requirePagePermission
};
